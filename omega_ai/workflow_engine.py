"""Explicit, owner-scoped Omega task orchestration.

No background worker or network client is started. The host authenticates every
operation, registers trusted handlers and explicitly calls run()/run_due().
State and execution claims are process-local, not a durable distributed queue.
"""
from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from threading import RLock
from typing import Any, Callable
from uuid import uuid4


class State(str, Enum):
    PENDING = "pending"
    APPROVAL_REQUIRED = "approval_required"
    RETRY_WAIT = "retry_wait"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RECONCILIATION_REQUIRED = "reconciliation_required"
    CANCELLED = "cancelled"


class TaskNotRunnable(ValueError):
    """An atomic claim lost to another runner, cancellation or state change."""


@dataclass
class Task:
    id: str
    owner_id: str
    handler: str
    payload: dict[str, Any]
    state: State
    max_attempts: int = 3
    attempts: int = 0
    idempotency_key: str | None = None
    approved_by: str | None = None
    next_run_at: datetime | None = None
    result: Any = None
    error: str | None = None
    audit: list[dict[str, str]] = field(default_factory=list)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _instant(now: datetime | None) -> datetime:
    instant = _now() if now is None else now
    if not isinstance(instant, datetime) or instant.tzinfo is None or instant.utcoffset() is None:
        raise ValueError("Time must include a timezone")
    return instant.astimezone(timezone.utc)


@dataclass(frozen=True)
class TaskContext:
    """Trusted execution identity; host handlers must also authorize domain resources."""
    task_id: str
    owner_id: str
    idempotency_key: str | None
    attempt: int


class WorkflowEngine:
    """Explicit task runner with owner isolation and atomic in-process claims.

    authorizer(actor, action) must verify the actor against the hosting app's
    authenticated request context and return literal True. A caller-supplied
    actor string alone never grants access. Default policy denies every action.
    Approval is owner-only and additionally requires approval_authorizer.
    Handlers and policy callbacks run outside the task lock.
    """

    def __init__(self, *, authorizer: Callable[[str, str], bool] | None = None,
                 approval_authorizer: Callable[[str, str], bool] | None = None) -> None:
        if any(callback is not None and not callable(callback)
               for callback in (authorizer, approval_authorizer)):
            raise ValueError("Authorization policies must be callable")
        self._authorizer = authorizer
        self._approval_authorizer = approval_authorizer
        self._handlers: dict[str, tuple[Callable[[TaskContext, dict[str, Any]], Any], bool]] = {}
        self._tasks: dict[str, Task] = {}
        self._keys: dict[tuple[str, str], str] = {}
        self._lock = RLock()

    def _authorize(self, actor: str, action: str) -> None:
        if (not isinstance(actor, str) or not actor or actor != actor.strip()
                or len(actor) > 128 or any(ord(c) < 32 or ord(c) == 127 for c in actor)):
            raise PermissionError("Host-authenticated identity required")
        try:
            allowed = self._authorizer is not None and self._authorizer(actor, action) is True
        except Exception:
            raise PermissionError("Host authorization unavailable") from None
        if not allowed:
            raise PermissionError("Host authorization required")

    def _owned(self, task_id: str, actor: str) -> Task:
        # Called only under _lock; missing and other-owner IDs are indistinguishable.
        task = self._tasks.get(task_id)
        if task is None or task.owner_id != actor:
            raise KeyError("Task not found")
        return task

    def register(self, name: str, handler: Callable[[TaskContext, dict[str, Any]], Any],
                 *, side_effects: bool) -> None:
        """Trusted host configuration only; never expose handler registration as an API."""
        if not isinstance(name, str) or not name.strip() or not callable(handler):
            raise ValueError("A unique named callable handler is required")
        if not isinstance(side_effects, bool):
            raise ValueError("Classify handler side effects explicitly")
        with self._lock:
            if name in self._handlers:
                raise ValueError("A unique named callable handler is required")
            self._handlers[name] = (handler, side_effects)

    @staticmethod
    def _event(task: Task, action: str, when: datetime, actor: str = "system") -> None:
        # Transition metadata only: no payload, tokens or exception details.
        task.audit.append({"action": action, "actor": actor, "at": when.isoformat()})

    def submit(self, handler: str, payload: dict[str, Any], *, actor: str,
               idempotency_key: str | None = None,
               max_attempts: int = 3, now: datetime | None = None) -> Task:
        self._authorize(actor, "submit")
        if not isinstance(payload, dict):
            raise TypeError("Task payload must be a dictionary")
        if type(max_attempts) is not int or not 1 <= max_attempts <= 5:
            raise ValueError("max_attempts must be 1 through 5")
        if idempotency_key is not None and (not isinstance(idempotency_key, str)
                                            or not idempotency_key.strip()):
            raise ValueError("Idempotency key must be a nonempty string")
        instant = _instant(now)
        snapshot = deepcopy(payload)
        with self._lock:
            if handler not in self._handlers:
                raise ValueError("Unregistered task handler")
            _, side_effects = self._handlers[handler]
            if side_effects and idempotency_key is None:
                raise ValueError("Side-effecting tasks require an idempotency key")
            key = (actor, idempotency_key) if idempotency_key is not None else None
            if key is not None and key in self._keys:
                previous = self._tasks[self._keys[key]]
                if (previous.handler != handler or previous.payload != snapshot
                        or previous.max_attempts != max_attempts):
                    raise ValueError("Idempotency key reused with different task")
                return deepcopy(previous)
            state = State.APPROVAL_REQUIRED if side_effects else State.PENDING
            task = Task(id=str(uuid4()), owner_id=actor, handler=handler,
                        payload=snapshot, state=state, max_attempts=max_attempts,
                        idempotency_key=idempotency_key)
            self._event(task, "submitted", instant, actor)
            self._tasks[task.id] = task
            if key is not None:
                self._keys[key] = task.id
            return deepcopy(task)

    def get(self, task_id: str, *, actor: str) -> Task:
        self._authorize(actor, "get")
        with self._lock:
            return deepcopy(self._owned(task_id, actor))

    def approve(self, task_id: str, actor: str, *, approved: bool,
                now: datetime | None = None) -> Task:
        self._authorize(actor, "approve")
        if type(approved) is not bool:
            raise ValueError("Approval decision must be a boolean")
        if actor.lower() in ("system", "agent", "automation"):
            raise ValueError("A human approver identifier is required")
        instant = _instant(now)
        with self._lock:
            if self._owned(task_id, actor).state != State.APPROVAL_REQUIRED:
                raise ValueError("Task is not awaiting human approval")
        try:
            allowed = (self._approval_authorizer is not None
                       and self._approval_authorizer(actor, task_id) is True)
        except Exception:
            raise PermissionError("Approval authorization unavailable") from None
        if not allowed:
            raise PermissionError("Approval requires host-authenticated human authorization")
        with self._lock:
            task = self._owned(task_id, actor)
            # Authorization may block while a concurrent caller cancels/rejects.
            if task.state != State.APPROVAL_REQUIRED:
                raise ValueError("Task is not awaiting human approval")
            task.state = State.PENDING if approved else State.CANCELLED
            task.approved_by = actor if approved else None
            self._event(task, "approved" if approved else "rejected", instant, actor)
            return deepcopy(task)

    def cancel(self, task_id: str, *, actor: str) -> Task:
        self._authorize(actor, "cancel")
        with self._lock:
            task = self._owned(task_id, actor)
            if task.state not in (State.APPROVAL_REQUIRED, State.PENDING, State.RETRY_WAIT):
                raise ValueError("Cannot cancel an executing or terminal task")
            task.state = State.CANCELLED
            task.next_run_at = None
            self._event(task, "cancelled", _now(), actor)
            return deepcopy(task)

    def run(self, task_id: str, *, actor: str, now: datetime | None = None) -> Task:
        self._authorize(actor, "run")
        instant = _instant(now)
        with self._lock:
            task = self._owned(task_id, actor)
            handler, side_effects = self._handlers[task.handler]
            if side_effects and not task.approved_by:
                raise PermissionError("Human approval required for side effects")
            if task.state == State.RETRY_WAIT:
                if task.next_run_at is None or instant < task.next_run_at:
                    raise TaskNotRunnable("Task retry is not due")
            elif task.state != State.PENDING:
                raise TaskNotRunnable("Task is not runnable")
            payload = deepcopy(task.payload)
            task.state = State.RUNNING
            task.next_run_at = None
            task.attempts += 1
            self._event(task, "started", instant, actor)
            context = TaskContext(task.id, task.owner_id, task.idempotency_key, task.attempts)
        # Never hold a shared state lock across host/provider code. Other tasks
        # can progress and this task can be inspected, but cannot be claimed twice.
        try:
            result = deepcopy(handler(context, payload))
        except BaseException as exc:
            finished = _instant(now)
            with self._lock:
                task.error = "HANDLER_INTERRUPTED" if not isinstance(exc, Exception) else "HANDLER_FAILED"
                task.result = None
                if side_effects:
                    # Remote work may have succeeded. Do not label it failed or retry it.
                    task.state = State.RECONCILIATION_REQUIRED
                    self._event(task, "manual_reconciliation_required", finished)
                elif isinstance(exc, Exception) and task.attempts < task.max_attempts:
                    task.state = State.RETRY_WAIT
                    task.next_run_at = finished + timedelta(seconds=2 ** (task.attempts - 1))
                    self._event(task, "retry_scheduled", finished)
                else:
                    task.state = State.FAILED
                    self._event(task, "failed", finished)
                snapshot = deepcopy(task)
            if not isinstance(exc, Exception):
                raise
            return snapshot
        with self._lock:
            task.result = result
            task.error = None
            task.state = State.COMPLETED
            self._event(task, "completed", _instant(now))
            return deepcopy(task)

    def run_due(self, *, actor: str, now: datetime | None = None, limit: int = 10) -> list[Task]:
        """Run a bounded owner-only batch; concurrent claims/cancellations are skipped."""
        self._authorize(actor, "run_due")
        if type(limit) is not int or not 1 <= limit <= 100:
            raise ValueError("Invalid batch limit")
        instant = _instant(now)
        with self._lock:
            ready = [t.id for t in self._tasks.values()
                     if t.owner_id == actor and (t.state == State.PENDING or
                        (t.state == State.RETRY_WAIT and t.next_run_at is not None
                         and t.next_run_at <= instant))][:limit]
        results = []
        for task_id in ready:
            try:
                results.append(self.run(task_id, actor=actor, now=now))
            except TaskNotRunnable:
                continue
        return results
