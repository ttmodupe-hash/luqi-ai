"""Opt-in durable Omega execution; no connections, DDL or workers on import.

The host provides fresh PyMySQL connections and authenticated policies. Apply
the versioned migration explicitly before use. Database time and row locks
govern leases; external effects still require provider-level reconciliation.
"""
from __future__ import annotations

from contextlib import contextmanager, suppress
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
import math
from typing import Any, Callable
from uuid import uuid4

import pymysql

from .workflow_engine import State, Task, TaskContext, TaskNotRunnable, WorkflowEngine


class StorageUnavailable(RuntimeError):
    """No fallback or implied success is safe after a storage failure."""


class LeaseLost(RuntimeError):
    """An expired or replaced claim cannot publish a result or renew itself."""


def _json(value: Any, *, limit: int = 65536) -> str:
    """Strict bounded JSON, with no pickle, repr, dataclass or Decimal coercion."""
    def validate(item, depth=0):
        if depth > 32:
            raise ValueError("Task JSON is too deeply nested")
        if type(item) is dict:
            for key, child in item.items():
                if type(key) is not str:
                    raise ValueError("Task JSON keys must be strings")
                validate(child, depth + 1)
        elif type(item) is list:
            for child in item:
                validate(child, depth + 1)
        elif type(item) is float:
            if not math.isfinite(item):
                raise ValueError("Task JSON numbers must be finite")
        elif type(item) is int:
            if not -(2 ** 63) <= item < 2 ** 63:
                raise ValueError("Task JSON integers must fit signed 64 bits")
        elif item is not None and type(item) not in (str, bool):
            raise ValueError("Task values must be JSON primitives")
    validate(value)
    try:
        encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"),
                             allow_nan=False)
        if len(encoded.encode("utf-8")) > limit:
            raise ValueError("Task JSON exceeds the size limit")
    except (UnicodeError, RecursionError):
        raise ValueError("Task JSON is invalid") from None
    return encoded


def _label(value: str, *, size: int = 512) -> str:
    if (not isinstance(value, str) or not value or value != value.strip()
            or any(ord(c) < 32 or ord(c) == 127 for c in value)):
        raise ValueError("Invalid task identifier")
    try:
        if len(value.encode("utf-8")) > size:
            raise ValueError("Task identifier is too long")
    except UnicodeError:
        raise ValueError("Invalid task identifier") from None
    return value


@dataclass(frozen=True)
class DurableTaskContext(TaskContext):
    # Trusted handlers can extend their current lease, but cannot revive an
    # expired one. This callback and its token are never stored in task JSON.
    heartbeat: Callable[[], None]


def _text(value):
    return value.decode("utf-8") if isinstance(value, bytes) else value


def _task(row) -> Task:
    document = json.loads(row["document"])
    return Task(id=row["id"], owner_id=_text(row["owner_id"]), handler=_text(row["handler"]),
                state=State(row["state"]), idempotency_key=_text(row["idempotency_key"]),
                next_run_at=(row["next_run_at"].replace(tzinfo=timezone.utc)
                             if row["next_run_at"] else None), **document)


def _document(task: Task) -> str:
    return _json({key: getattr(task, key) for key in (
        "payload", "max_attempts", "attempts", "approved_by", "result", "error", "audit"
    )}, limit=131072)


class MySQLWorkflowEngine(WorkflowEngine):
    """Durable alternative to WorkflowEngine with the same ownership policies.

    Each operation owns a fresh connection; never pass a shared connection.
    Only bounded JSON payloads/results are supported. Handlers must be registered
    with stable versions and explicit effects, identical across all workers.
    There is deliberately no caller-supplied clock, unattended worker, global
    admin bypass, automatic reconciliation or automatic schema migration.
    """

    def __init__(self, connection_factory: Callable[[], Any], *, lease_seconds: int = 60,
                 authorizer=None, approval_authorizer=None):
        super().__init__(authorizer=authorizer, approval_authorizer=approval_authorizer)
        if not callable(connection_factory):
            raise ValueError("A fresh-connection factory is required")
        if type(lease_seconds) is not int or not 1 <= lease_seconds <= 3600:
            raise ValueError("Lease must be 1 through 3600 seconds")
        self._connect = connection_factory
        self._lease_seconds = lease_seconds
        self._versions: dict[str, str] = {}

    def register(self, name, handler, *, side_effects: bool, version: str):
        _label(name)
        _label(version, size=128)
        with self._lock:
            super().register(name, handler, side_effects=side_effects)
            self._versions[name] = version

    @contextmanager
    def _transaction(self):
        connection = None
        try:
            connection = self._connect()
            connection.autocommit(False)
            with connection.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SET time_zone = '+00:00'")
                cursor.execute("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED")
                connection.begin()
                yield cursor
                connection.commit()
        except BaseException as exc:
            if connection is not None:
                with suppress(Exception):
                    connection.rollback()
            if isinstance(exc, pymysql.MySQLError):
                raise StorageUnavailable("Workflow storage unavailable; outcome may be unconfirmed") from None
            raise
        finally:
            if connection is not None:
                with suppress(Exception):
                    connection.close()

    @staticmethod
    def _time(cursor) -> datetime:
        cursor.execute("SELECT UTC_TIMESTAMP(6) AS instant")
        return cursor.fetchone()["instant"].replace(tzinfo=timezone.utc)

    @staticmethod
    def _owned_row(cursor, task_id, actor):
        cursor.execute("SELECT * FROM omega_tasks_v1 WHERE id=%s AND owner_id=%s FOR UPDATE",
                       (task_id, actor.encode("utf-8")))
        row = cursor.fetchone()
        if row is None:
            raise KeyError("Task not found")
        return row

    @staticmethod
    def _save(cursor, task, *, token=None, expires=None):
        cursor.execute("""UPDATE omega_tasks_v1 SET state=%s, next_run_at=%s,
            lease_token=%s, lease_expires_at=%s, document=%s WHERE id=%s AND owner_id=%s""",
                       (task.state.value, task.next_run_at, token, expires, _document(task),
                        task.id, task.owner_id.encode("utf-8")))

    def _definition(self, name, row=None):
        with self._lock:
            if name not in self._handlers:
                raise ValueError("Unregistered task handler")
            handler, effects = self._handlers[name]
            version = self._versions[name]
        if row is not None and (version != _text(row["handler_version"])
                                or effects != bool(row["side_effects"])):
            raise ValueError("Registered handler does not match the persisted contract")
        return handler, effects, version

    def submit(self, handler, payload, *, actor, idempotency_key=None, max_attempts=3):
        self._authorize(actor, "submit")
        _label(actor)
        if type(payload) is not dict:
            raise TypeError("Task payload must be a dictionary")
        snapshot = json.loads(_json(payload, limit=16384))
        if type(max_attempts) is not int or not 1 <= max_attempts <= 5:
            raise ValueError("max_attempts must be 1 through 5")
        if idempotency_key is not None:
            _label(idempotency_key)
        _, effects, version = self._definition(handler)
        if effects and idempotency_key is None:
            raise ValueError("Side-effecting tasks require an idempotency key")
        with self._transaction() as cursor:
            task = Task(str(uuid4()), actor, handler, snapshot,
                        State.APPROVAL_REQUIRED if effects else State.PENDING,
                        max_attempts=max_attempts, idempotency_key=idempotency_key)
            self._event(task, "submitted", self._time(cursor), actor)
            # The unique owner/key index serializes concurrent submissions. A
            # duplicate is a no-op, followed by a locked contract comparison.
            cursor.execute("""INSERT INTO omega_tasks_v1
                (id, owner_id, idempotency_key, handler, handler_version, side_effects, state, document)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE id=id""",
                           (task.id, actor.encode(), idempotency_key.encode() if idempotency_key else None,
                            handler.encode(), version.encode(), effects, task.state.value, _document(task)))
            if idempotency_key is not None:
                cursor.execute("""SELECT * FROM omega_tasks_v1
                    WHERE owner_id=%s AND idempotency_key=%s FOR UPDATE""",
                               (actor.encode(), idempotency_key.encode()))
                row = cursor.fetchone()
                previous = _task(row)
                self._definition(previous.handler, row)
                if (previous.handler != handler or _json(previous.payload) != _json(snapshot)
                        or previous.max_attempts != max_attempts):
                    raise ValueError("Idempotency key reused with different task")
                return previous
            return task

    def get(self, task_id, *, actor):
        self._authorize(actor, "get")
        with self._transaction() as cursor:
            return _task(self._owned_row(cursor, task_id, actor))

    def approve(self, task_id, actor, *, approved: bool):
        self._authorize(actor, "approve")
        if type(approved) is not bool:
            raise ValueError("Approval decision must be a boolean")
        if actor.lower() in ("system", "agent", "automation"):
            raise ValueError("A human approver identifier is required")
        with self._transaction() as cursor:
            if _task(self._owned_row(cursor, task_id, actor)).state != State.APPROVAL_REQUIRED:
                raise ValueError("Task is not awaiting human approval")
        # Human authentication may block. Hold no DB lock during that callback.
        try:
            allowed = (self._approval_authorizer is not None
                       and self._approval_authorizer(actor, task_id) is True)
        except Exception:
            raise PermissionError("Approval authorization unavailable") from None
        if not allowed:
            raise PermissionError("Approval requires host-authenticated human authorization")
        self._authorize(actor, "approve")
        with self._transaction() as cursor:
            task = _task(self._owned_row(cursor, task_id, actor))
            if task.state != State.APPROVAL_REQUIRED:
                raise ValueError("Task is not awaiting human approval")
            task.state = State.PENDING if approved else State.CANCELLED
            task.approved_by = actor if approved else None
            self._event(task, "approved" if approved else "rejected", self._time(cursor), actor)
            self._save(cursor, task)
            return task

    def cancel(self, task_id, *, actor):
        self._authorize(actor, "cancel")
        with self._transaction() as cursor:
            task = _task(self._owned_row(cursor, task_id, actor))
            if task.state not in (State.APPROVAL_REQUIRED, State.PENDING, State.RETRY_WAIT):
                raise ValueError("Cannot cancel an executing or terminal task")
            task.state, task.next_run_at = State.CANCELLED, None
            self._event(task, "cancelled", self._time(cursor), actor)
            self._save(cursor, task)
            return task

    def _claim(self, task_id, actor):
        with self._transaction() as cursor:
            row = self._owned_row(cursor, task_id, actor)
            task = _task(row)
            handler, effects, _ = self._definition(task.handler, row)
            if effects and task.approved_by != actor:
                raise PermissionError("Human approval required for side effects")
            now = self._time(cursor)
            if not (task.state == State.PENDING or
                    (task.state == State.RETRY_WAIT and task.next_run_at is not None
                     and task.next_run_at <= now)):
                raise TaskNotRunnable("Task is not runnable")
            task.state, task.next_run_at = State.RUNNING, None
            task.attempts += 1
            token = str(uuid4())
            self._event(task, "started", now, actor)
            self._save(cursor, task, token=token, expires=now + timedelta(seconds=self._lease_seconds))
            return task, token, handler

    def _leased(self, cursor, task_id, actor, token):
        row = self._owned_row(cursor, task_id, actor)
        now = self._time(cursor)
        if (row["state"] != State.RUNNING.value or row["lease_token"] != token
                or row["lease_expires_at"].replace(tzinfo=timezone.utc) <= now):
            raise LeaseLost("Workflow claim expired or was replaced; result was not committed")
        return row, now

    def _heartbeat(self, task_id, actor, token):
        self._authorize(actor, "run")
        with self._transaction() as cursor:
            row, now = self._leased(cursor, task_id, actor, token)
            self._save(cursor, _task(row), token=token,
                       expires=now + timedelta(seconds=self._lease_seconds))

    def _finish(self, task_id, actor, token, *, result=None, error=None, interrupted=False):
        with self._transaction() as cursor:
            row, now = self._leased(cursor, task_id, actor, token)
            task = _task(row)
            task.result, task.error = result, error
            if error is None:
                task.state = State.COMPLETED
                action = "completed"
            elif row["side_effects"]:
                task.state = State.RECONCILIATION_REQUIRED
                action = "manual_reconciliation_required"
            elif not interrupted and task.attempts < task.max_attempts:
                task.state = State.RETRY_WAIT
                task.next_run_at = now + timedelta(seconds=2 ** (task.attempts - 1))
                action = "retry_scheduled"
            else:
                task.state = State.FAILED
                action = "failed"
            self._event(task, action, now)
            self._save(cursor, task)
            return task

    def run(self, task_id, *, actor):
        self._authorize(actor, "run")
        task, token, handler = self._claim(task_id, actor)
        context = DurableTaskContext(task.id, task.owner_id, task.idempotency_key, task.attempts,
                                     lambda: self._heartbeat(task.id, actor, token))
        try:
            # Claim commit must succeed before host code runs. No transaction is
            # open during a handler; JSON validation is part of its outcome.
            result = json.loads(_json(handler(context, task.payload)))
        except BaseException as exc:
            interrupted = not isinstance(exc, Exception)
            try:
                outcome = self._finish(task_id, actor, token,
                                       error="HANDLER_INTERRUPTED" if interrupted else "HANDLER_FAILED",
                                       interrupted=interrupted)
            except (StorageUnavailable, LeaseLost):
                if interrupted:
                    raise exc from None
                raise
            if interrupted:
                raise
            return outcome
        return self._finish(task_id, actor, token, result=result)

    @staticmethod
    def _limit(limit):
        if type(limit) is not int or not 1 <= limit <= 100:
            raise ValueError("Invalid batch limit")

    def recover_expired(self, *, actor, limit=10):
        """Explicit owner-scoped recovery; uncertain effects are never requeued."""
        self._authorize(actor, "recover_expired")
        self._limit(limit)
        with self._transaction() as cursor:
            cursor.execute("""SELECT * FROM omega_tasks_v1 WHERE owner_id=%s AND state='running'
                AND lease_expires_at <= UTC_TIMESTAMP(6) ORDER BY lease_expires_at, id
                LIMIT %s FOR UPDATE SKIP LOCKED""", (actor.encode(), limit))
            rows = cursor.fetchall()
            now = self._time(cursor)
            recovered = []
            for row in rows:
                task = _task(row)
                task.result, task.error = None, "WORKER_LEASE_EXPIRED"
                if row["side_effects"]:
                    task.state, action = State.RECONCILIATION_REQUIRED, "manual_reconciliation_required"
                elif task.attempts < task.max_attempts:
                    task.state, action = State.RETRY_WAIT, "retry_scheduled"
                    task.next_run_at = now + timedelta(seconds=2 ** (task.attempts - 1))
                else:
                    task.state, action = State.FAILED, "failed"
                self._event(task, action, now)
                self._save(cursor, task)
                recovered.append(task)
            return recovered

    def run_due(self, *, actor, limit=10):
        self._authorize(actor, "run_due")
        self._limit(limit)
        with self._transaction() as cursor:
            cursor.execute("""SELECT id FROM omega_tasks_v1 WHERE owner_id=%s AND
                (state='pending' OR (state='retry_wait' AND next_run_at <= UTC_TIMESTAMP(6)))
                ORDER BY id LIMIT %s""", (actor.encode(), limit))
            ready = cursor.fetchall()
        results = []
        for row in ready:
            try:
                results.append(self.run(row["id"], actor=actor))
            except TaskNotRunnable:
                continue
        return results
