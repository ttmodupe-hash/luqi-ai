"""Offline workflow contract tests (no agent execution or network needed)."""
from datetime import datetime, timedelta, timezone

import pytest

from omega_ai.workflow_engine import State, WorkflowEngine


def clock():
    return datetime(2026, 10, 22, tzinfo=timezone.utc)


def test_read_only_task_executes_with_idempotency():
    engine = WorkflowEngine()
    called = []
    engine.register("sum", lambda x: called.append(1) or x["a"] + x["b"],
                    side_effects=False)
    task = engine.submit("sum", {"a": 2, "b": 3}, idempotency_key="only-once")
    assert task.state == State.PENDING
    assert engine.run(task.id).result == 5
    assert engine.submit("sum", {"a": 2, "b": 3}, idempotency_key="only-once").id == task.id
    assert called == [1]


def test_side_effects_require_human_approval():
    engine = WorkflowEngine(approval_authorizer=lambda actor, task: actor == "reviewer-1")
    calls = []
    engine.register("send", lambda x: calls.append(x), side_effects=True)
    task = engine.submit("send", {"amount": 42}, idempotency_key="send-42")
    assert task.state == State.APPROVAL_REQUIRED
    with pytest.raises(PermissionError):
        engine.run(task.id)
    with pytest.raises(ValueError):
        engine.approve(task.id, "agent", approved=True)
    engine.approve(task.id, "reviewer-1", approved=True)
    assert engine.run(task.id).state == State.COMPLETED
    assert calls == [{"amount": 42}]


def test_rejected_tasks_never_run():
    engine = WorkflowEngine(approval_authorizer=lambda actor, task: actor == "human-1")
    engine.register("charge", lambda _: 1, side_effects=True)
    task = engine.submit("charge", {}, idempotency_key="charge-1")
    engine.approve(task.id, "human-1", approved=False)
    with pytest.raises(PermissionError):
        engine.run(task.id)
    assert engine.get(task.id).state == State.CANCELLED


def test_failure_and_bounded_retry():
    engine = WorkflowEngine()
    engine.register("flaky", lambda _: 1 / 0, side_effects=False)
    first = engine.submit("flaky", {}, max_attempts=2)
    now = clock()
    result = engine.run(first.id, now=now)
    assert result.state == State.RETRY_WAIT
    assert result.error == "ZeroDivisionError"
    with pytest.raises(ValueError):
        engine.run(first.id, now=now)
    last = engine.run(first.id, now=now + timedelta(seconds=1))
    assert last.state == State.FAILED and last.attempts == 2


def test_idempotency_key_mismatch_fails():
    engine = WorkflowEngine()
    engine.register("read", lambda x: x, side_effects=False)
    engine.submit("read", {"value": 1}, idempotency_key="k")
    with pytest.raises(ValueError):
        engine.submit("read", {"value": 2}, idempotency_key="k")


def test_runnable_batch_does_not_execute_approval_pending():
    engine = WorkflowEngine()
    engine.register("read", lambda _: "ok", side_effects=False)
    engine.register("write", lambda _: "blocked", side_effects=True)
    engine.submit("read", {})
    engine.submit("write", {}, idempotency_key="write-1")
    assert [t.state for t in engine.run_due()] == [State.COMPLETED]


def test_untrusted_approval_is_rejected_even_with_human_sounding_name():
    engine = WorkflowEngine()
    engine.register("pay", lambda _: True, side_effects=True)
    task = engine.submit("pay", {}, idempotency_key="pay-1")
    with pytest.raises(PermissionError):
        engine.approve(task.id, "reviewer-1", approved=True)
    assert engine.get(task.id).state == State.APPROVAL_REQUIRED


def test_ambiguous_external_side_effect_never_retried():
    engine = WorkflowEngine(approval_authorizer=lambda actor, _: actor == "human-1")
    effects = []
    def might_have_charged(payload):
        effects.append(payload["amount"])
        raise TimeoutError("Remote charge may already be accepted")
    engine.register("charge", might_have_charged, side_effects=True)
    task = engine.submit("charge", {"amount": 100}, idempotency_key="p-100", max_attempts=5)
    engine.approve(task.id, "human-1", approved=True)
    result = engine.run(task.id)
    assert result.state == State.FAILED and result.attempts == 1
    assert "manual_reconciliation_required" in [event["action"] for event in result.audit]
    assert len(effects) == 1
    assert engine.run_due() == []


def test_side_effects_need_idempotency_key():
    engine = WorkflowEngine()
    engine.register("mail", lambda _: None, side_effects=True)
    with pytest.raises(ValueError, match="idempotency"):
        engine.submit("mail", {})
