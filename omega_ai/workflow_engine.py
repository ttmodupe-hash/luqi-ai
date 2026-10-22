"""Explicit, human-governed Omega task orchestration.

No worker runs in the background. The host must register handlers and call
run()/run_due() explicitly. Side-effecting handlers always require approval.
"""
from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Callable
from uuid import uuid4


class State(str, Enum):
    PENDING = "pending"
    APPROVAL_REQUIRED = "approval_required"
    RETRY_WAIT = "retry_wait"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class Task:
    id: str
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


class WorkflowEngine:
    """Synchronous explicit task runner with bounded retry and approval.

    State is process-local and not durable: production integrations must
    provide persistent storage + an exclusive worker lease before enabling
    cross-process execution or claiming exactly-once guarantees.
    """

    def __init__(self, *, approval_authorizer: Callable[[str, str], bool] | None = None) -> None:
        # Authenticated user identity must be verified by the hosting app;
        # a caller-supplied string is never enough to approve sensitive tasks.
        self._approval_authorizer = approval_authorizer
        self._handlers: dict[str, tuple[Callable[[dict[str, Any]], Any], bool]] = {}
        self._tasks: dict[str, Task] = {}
        self._keys: dict[str, str] = {}

    def register(self, name: str, handler: Callable[[dict[str, Any]], Any],
                 *, side_effects: bool) -> None:
        if not name or not callable(handler) or name in self._handlers:
            raise ValueError("A unique named callable handler is required")
        if not isinstance(side_effects, bool):
            raise ValueError("Classify handler side effects explicitly")
        self._handlers[name] = (handler, side_effects)

    @staticmethod
    def _event(task: Task, action: str, when: datetime, actor: str = "system") -> None:
        # Audit only transition metadata: no payload, tokens or exception detail.
        task.audit.append({"action": action, "actor": actor, "at": when.isoformat()})

    def submit(self, handler: str, payload: dict[str, Any],
               *, idempotency_key: str | None = None,
               max_attempts: int = 3, now: datetime | None = None) -> Task:
        if handler not in self._handlers:
            raise ValueError("Unregistered task handler")
        if not isinstance(payload, dict):
            raise TypeError("Task payload must be a dictionary")
        if not 1 <= max_attempts <= 5:
            raise ValueError("max_attempts must be 1 through 5")
        if idempotency_key is not None and not idempotency_key.strip():
            raise ValueError("Empty idempotency key")
        if idempotency_key in self._keys:
            previous = self._tasks[self._keys[idempotency_key]]
            if previous.handler != handler or previous.payload != payload:
                raise ValueError("Idempotency key reused with different task")
            return deepcopy(previous)
        instant = now or _now()
        _, side_effects = self._handlers[handler]
        state = State.APPROVAL_REQUIRED if side_effects else State.PENDING
        task = Task(id=str(uuid4()), handler=handler, payload=deepcopy(payload),
                    state=state, max_attempts=max_attempts,
                    idempotency_key=idempotency_key)
        self._event(task, "submitted", instant)
        self._tasks[task.id] = task
        if idempotency_key is not None:
            self._keys[idempotency_key] = task.id
        return deepcopy(task)

    def get(self, task_id: str) -> Task:
        return deepcopy(self._tasks[task_id])

    def approve(self, task_id: str, actor: str, *, approved: bool,
                now: datetime | None = None) -> Task:
        task = self._tasks[task_id]
        if task.state != State.APPROVAL_REQUIRED:
            raise ValueError("Task is not awaiting human approval")
        if not actor or actor.strip().lower() in ("system", "agent", "automation"):
            raise ValueError("A human approver identifier is required")
        if self._approval_authorizer is None or not self._approval_authorizer(actor, task_id):
            raise PermissionError("Approval requires a host-authenticated human authorization")
        instant = now or _now()
        task.state = State.PENDING if approved else State.CANCELLED
        task.approved_by = actor if approved else None
        self._event(task, "approved" if approved else "rejected", instant, actor)
        return deepcopy(task)

    def cancel(self, task_id: str, actor: str = "system") -> Task:
        task = self._tasks[task_id]
        if task.state not in (State.APPROVAL_REQUIRED, State.PENDING, State.RETRY_WAIT):
            raise ValueError("Cannot cancel an executing or completed task")
        task.state = State.CANCELLED
        self._event(task, "cancelled", _now(), actor)
        return deepcopy(task)

    def run(self, task_id: str, *, now: datetime | None = None) -> Task:
        task = self._tasks[task_id]
        instant = now or _now()
        handler, side_effects = self._handlers[task.handler]
        if side_effects and not task.approved_by:
            raise PermissionError("Human approval required for side effects")
        if task.state == State.RETRY_WAIT:
            if task.next_run_at is None or instant < task.next_run_at:
                raise ValueError("Task retry is not due")
        elif task.state != State.PENDING:
            raise ValueError("Task is not runnable")
        task.state = State.RUNNING
        task.next_run_at = None
        task.attempts += 1
        self._event(task, "started", instant)
        try:
            task.result = deepcopy(handler(deepcopy(task.payload)))
            task.error = None
            task.state = State.COMPLETED
            self._event(task, "completed", instant)
        except Exception as exc:
            # Never expose exception messages: may contain credentials or PII.
            task.error = type(exc).__name__
            if task.attempts < task.max_attempts:
                task.state = State.RETRY_WAIT
                task.next_run_at = instant + timedelta(seconds=2 ** (task.attempts - 1))
                self._event(task, "retry_scheduled", instant)
            else:
                task.state = State.FAILED
                self._event(task, "failed", instant)
        return deepcopy(task)

    def run_due(self, *, now: datetime | None = None, limit: int = 10) -> list[Task]:
        """Explicitly execute a bounded batch; never schedules its own timer."""
        if not 1 <= limit <= 100:
            raise ValueError("Invalid batch limit")
        instant = now or _now()
        ready = [t.id for t in self._tasks.values()
                 if t.state == State.PENDING or
                 (t.state == State.RETRY_WAIT and t.next_run_at is not None
                  and t.next_run_at <= instant)]
        return [self.run(task_id, now=instant) for task_id in ready[:limit]]
