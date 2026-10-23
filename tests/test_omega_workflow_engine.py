"""Offline workflow security and concurrency contracts; no provider calls."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Barrier, Event

import pytest

from omega_ai.workflow_engine import State, TaskNotRunnable, WorkflowEngine

OWNER = "account-a"
OTHER = "account-b"


def clock():
    return datetime(2026, 10, 22, tzinfo=timezone.utc)


def engine(**kwargs):
    return WorkflowEngine(authorizer=lambda actor, _: actor in (OWNER, OTHER), **kwargs)


def test_read_only_task_executes_with_owner_scoped_idempotency():
    runner = engine()
    calls = []
    runner.register("sum", lambda ctx, x: calls.append(ctx) or x["a"] + x["b"], side_effects=False)
    task = runner.submit("sum", {"a": 2, "b": 3}, actor=OWNER, idempotency_key="once")
    assert task.state == State.PENDING and task.owner_id == OWNER
    assert runner.run(task.id, actor=OWNER).result == 5
    assert runner.submit("sum", {"a": 2, "b": 3}, actor=OWNER, idempotency_key="once").id == task.id
    other = runner.submit("sum", {"a": 10, "b": 3}, actor=OTHER, idempotency_key="once")
    assert other.id != task.id and runner.run(other.id, actor=OTHER).result == 13
    assert [ctx.owner_id for ctx in calls] == [OWNER, OTHER]


@pytest.mark.parametrize("mutation,attempts", [({"a": 9, "b": 3}, 3), ({"a": 2, "b": 3}, 5)])
def test_idempotency_cannot_change_payload_or_retry_policy(mutation, attempts):
    runner = engine()
    runner.register("read", lambda _, x: x, side_effects=False)
    runner.submit("read", {"a": 2, "b": 3}, actor=OWNER, idempotency_key="once")
    with pytest.raises(ValueError, match="different task"):
        runner.submit("read", mutation, actor=OWNER, idempotency_key="once", max_attempts=attempts)


def test_side_effects_require_authenticated_owner_and_human_approval():
    approvals, effects = [], []
    runner = engine(approval_authorizer=lambda actor, task: approvals.append((actor, task)) or True)
    runner.register("send", lambda ctx, x: effects.append((ctx, x)), side_effects=True)
    with pytest.raises(ValueError, match="idempotency"):
        runner.submit("send", {}, actor=OWNER)
    task = runner.submit("send", {"owner_id": OTHER}, actor=OWNER, idempotency_key="send")
    with pytest.raises(PermissionError):
        runner.run(task.id, actor=OWNER)
    with pytest.raises(KeyError, match="Task not found"):
        runner.approve(task.id, OTHER, approved=True)
    assert approvals == []
    runner.approve(task.id, OWNER, approved=True)
    completed = runner.run(task.id, actor=OWNER)
    assert completed.state == State.COMPLETED and completed.approved_by == OWNER
    context, payload = effects[0]
    assert context.owner_id == OWNER and payload["owner_id"] == OTHER
    assert context.task_id == task.id and context.idempotency_key == "send" and context.attempt == 1
    assert completed.audit[0]["actor"] == OWNER


@pytest.mark.parametrize("operation", ["get", "run", "cancel", "approve"])
def test_other_owner_and_missing_task_are_indistinguishable(operation):
    runner = engine(approval_authorizer=lambda *_: True)
    runner.register("send", lambda *_: pytest.fail("Unauthorized effect"), side_effects=True)
    task = runner.submit("send", {"private": "owner data"}, actor=OWNER, idempotency_key="send")
    results = []
    for task_id in (task.id, "missing"):
        with pytest.raises(KeyError) as error:
            kwargs = {"actor": OTHER}
            if operation == "approve":
                kwargs["approved"] = True
            getattr(runner, operation)(task_id, **kwargs)
        results.append(error.value.args)
    assert results == [("Task not found",)] * 2
    assert runner.get(task.id, actor=OWNER) == task


@pytest.mark.parametrize("authorization", [None, False, "true", "false", 1, [], {}, [True]])
def test_default_and_non_boolean_authorization_fail_closed(authorization):
    runner = WorkflowEngine(authorizer=None if authorization is None else lambda *_: authorization)
    runner.register("read", lambda *_: pytest.fail("Unauthorized execution"), side_effects=False)
    for operation in [lambda: runner.submit("read", {}, actor=OWNER),
                      lambda: runner.get("missing", actor=OWNER),
                      lambda: runner.run("missing", actor=OWNER),
                      lambda: runner.cancel("missing", actor=OWNER),
                      lambda: runner.approve("missing", OWNER, approved=True),
                      lambda: runner.run_due(actor=OWNER)]:
        with pytest.raises(PermissionError):
            operation()


def test_authorization_is_checked_again_at_execution_and_get():
    allowed = {"submit", "get"}
    runner = WorkflowEngine(authorizer=lambda actor, action: actor == OWNER and action in allowed)
    runner.register("read", lambda *_: pytest.fail("Revoked execution"), side_effects=False)
    task = runner.submit("read", {}, actor=OWNER)
    with pytest.raises(PermissionError):
        runner.run(task.id, actor=OWNER)
    assert runner.get(task.id, actor=OWNER).attempts == 0
    allowed.clear()
    with pytest.raises(PermissionError):
        runner.get(task.id, actor=OWNER)


@pytest.mark.parametrize("actor", [None, 1, [], {}, "", "   ", " account-a ", "a\nb", "a" * 129])
def test_invalid_identity_is_denied_before_host_callback(actor):
    policy_calls = []
    runner = WorkflowEngine(authorizer=lambda *_: policy_calls.append(1) or True)
    with pytest.raises(PermissionError):
        runner.submit("read", {}, actor=actor)
    assert policy_calls == []


def test_authorizer_errors_are_sanitized():
    def unavailable(*_):
        raise RuntimeError("private-token-in-error")
    runner = WorkflowEngine(authorizer=unavailable)
    with pytest.raises(PermissionError) as error:
        runner.run_due(actor=OWNER)
    assert "private-token" not in str(error.value)


@pytest.mark.parametrize("decision", ["false", "true", "", 0, 1, None, [], {}, [True]])
def test_malformed_decisions_cannot_authorize_side_effects(decision):
    authorizations = []
    runner = engine(approval_authorizer=lambda *_: authorizations.append(1) or True)
    runner.register("send", lambda *_: pytest.fail("Invalid approval"), side_effects=True)
    task = runner.submit("send", {}, actor=OWNER, idempotency_key="send")
    with pytest.raises(ValueError, match="boolean"):
        runner.approve(task.id, OWNER, approved=decision)
    assert runner.get(task.id, actor=OWNER) == task and authorizations == []


@pytest.mark.parametrize("authorization", ["false", "true", 1, 0, None, [], {}, [True], False])
def test_human_authorization_requires_literal_true(authorization):
    runner = engine(approval_authorizer=lambda *_: authorization)
    runner.register("send", lambda *_: pytest.fail("Unauthorized effect"), side_effects=True)
    task = runner.submit("send", {}, actor=OWNER, idempotency_key="send")
    with pytest.raises(PermissionError):
        runner.approve(task.id, OWNER, approved=True)
    assert runner.get(task.id, actor=OWNER) == task


@pytest.mark.parametrize("actor", ["system", "agent", "automation", "Agent"])
def test_automation_identity_cannot_self_approve(actor):
    runner = WorkflowEngine(authorizer=lambda *_: True, approval_authorizer=lambda *_: True)
    runner.register("send", lambda *_: None, side_effects=True)
    task = runner.submit("send", {}, actor=actor, idempotency_key="send")
    with pytest.raises(ValueError, match="human"):
        runner.approve(task.id, actor, approved=True)


def test_missing_or_failing_human_authorizer_preserves_pending_approval():
    def unavailable(*_):
        raise RuntimeError("private authorization detail")
    for callback in (None, unavailable):
        runner = engine(approval_authorizer=callback)
        runner.register("send", lambda *_: None, side_effects=True)
        task = runner.submit("send", {}, actor=OWNER, idempotency_key="send")
        with pytest.raises(PermissionError) as error:
            runner.approve(task.id, OWNER, approved=True)
        assert "private authorization detail" not in str(error.value)
        assert runner.get(task.id, actor=OWNER) == task
        assert runner.run_due(actor=OWNER) == []


def test_rejection_and_cancellation_never_execute():
    runner = engine(approval_authorizer=lambda *_: True)
    runner.register("send", lambda *_: pytest.fail("Rejected effect"), side_effects=True)
    runner.register("read", lambda *_: pytest.fail("Cancelled task"), side_effects=False)
    rejected = runner.submit("send", {}, actor=OWNER, idempotency_key="send")
    runner.approve(rejected.id, OWNER, approved=False)
    cancelled = runner.submit("read", {}, actor=OWNER)
    runner.cancel(cancelled.id, actor=OWNER)
    assert runner.get(rejected.id, actor=OWNER).state == State.CANCELLED
    assert runner.get(cancelled.id, actor=OWNER).state == State.CANCELLED
    assert runner.run_due(actor=OWNER) == []


def test_failure_retries_are_bounded_and_cancel_clears_retry_time():
    runner = engine()
    runner.register("flaky", lambda *_: 1 / 0, side_effects=False)
    task = runner.submit("flaky", {}, actor=OWNER, max_attempts=2)
    first = runner.run(task.id, actor=OWNER, now=clock())
    assert first.state == State.RETRY_WAIT and first.error == "HANDLER_FAILED"
    with pytest.raises(TaskNotRunnable):
        runner.run(task.id, actor=OWNER, now=clock())
    last = runner.run(task.id, actor=OWNER, now=clock() + timedelta(seconds=1))
    assert last.state == State.FAILED and last.attempts == 2
    other = runner.submit("flaky", {}, actor=OWNER)
    runner.run(other.id, actor=OWNER, now=clock())
    cancelled = runner.cancel(other.id, actor=OWNER)
    assert cancelled.next_run_at is None and runner.run_due(actor=OWNER) == []


@pytest.mark.parametrize("failure", [TimeoutError("private-token"), SystemExit("private-token")])
def test_uncertain_side_effects_need_reconciliation_and_are_never_retried(failure):
    runner = engine(approval_authorizer=lambda *_: True)
    effects = []
    def maybe_sent(_context, payload):
        effects.append(payload)
        raise failure
    runner.register("send", maybe_sent, side_effects=True)
    task = runner.submit("send", {"fixture": 1}, actor=OWNER, idempotency_key="send", max_attempts=5)
    runner.approve(task.id, OWNER, approved=True)
    if isinstance(failure, SystemExit):
        with pytest.raises(SystemExit):
            runner.run(task.id, actor=OWNER)
    else:
        runner.run(task.id, actor=OWNER)
    result = runner.get(task.id, actor=OWNER)
    assert result.state == State.RECONCILIATION_REQUIRED and result.attempts == 1
    assert result.result is None and result.next_run_at is None
    assert result.audit[-1]["action"] == "manual_reconciliation_required"
    assert "private-token" not in repr(result)
    assert runner.run_due(actor=OWNER) == []
    assert runner.submit("send", {"fixture": 1}, actor=OWNER, idempotency_key="send", max_attempts=5).id == task.id
    with pytest.raises(TaskNotRunnable):
        runner.run(task.id, actor=OWNER)
    assert len(effects) == 1


def test_read_only_interruption_is_recorded_and_reraised_without_retry():
    runner = engine()
    def stop(*_):
        raise KeyboardInterrupt()
    runner.register("read", stop, side_effects=False)
    task = runner.submit("read", {}, actor=OWNER)
    with pytest.raises(KeyboardInterrupt):
        runner.run(task.id, actor=OWNER)
    result = runner.get(task.id, actor=OWNER)
    assert result.state == State.FAILED and result.error == "HANDLER_INTERRUPTED"
    assert runner.run_due(actor=OWNER) == []


def test_returned_snapshots_and_handler_payload_cannot_mutate_task_state():
    runner = engine()
    def handler(_context, payload):
        payload["nested"]["value"] = "handler changed"
        return payload
    runner.register("read", handler, side_effects=False)
    payload = {"nested": {"value": "original"}}
    task = runner.submit("read", payload, actor=OWNER)
    payload["nested"]["value"] = "caller changed"
    task.owner_id = OTHER
    task.payload.clear()
    done = runner.run(task.id, actor=OWNER)
    done.result.clear()
    stored = runner.get(task.id, actor=OWNER)
    assert stored.owner_id == OWNER and stored.payload == {"nested": {"value": "original"}}
    assert stored.result == {"nested": {"value": "handler changed"}}


def test_batches_only_claim_the_authenticated_owners_tasks():
    runner = engine()
    runner.register("read", lambda ctx, _: ctx.owner_id, side_effects=False)
    runner.register("send", lambda *_: pytest.fail("Unapproved effect"), side_effects=True)
    mine = runner.submit("read", {}, actor=OWNER)
    other = runner.submit("read", {}, actor=OTHER)
    runner.submit("send", {}, actor=OWNER, idempotency_key="send")
    assert [task.id for task in runner.run_due(actor=OWNER)] == [mine.id]
    assert runner.get(other.id, actor=OTHER).state == State.PENDING


@pytest.mark.parametrize("count", [True, False, 2.5, "3", None, 0, 101])
def test_attempt_and_batch_limits_require_bounded_integers(count):
    runner = engine()
    runner.register("read", lambda *_: "ok", side_effects=False)
    with pytest.raises(ValueError):
        runner.submit("read", {}, actor=OWNER, max_attempts=count)
    task = runner.submit("read", {}, actor=OWNER)
    with pytest.raises(ValueError):
        runner.run_due(actor=OWNER, limit=count)
    assert runner.get(task.id, actor=OWNER).attempts == 0


@pytest.mark.parametrize("key", [123, [], {}, True, "   "])
def test_invalid_idempotency_key_is_rejected_before_task_creation(key):
    runner = engine()
    runner.register("read", lambda *_: None, side_effects=False)
    with pytest.raises(ValueError):
        runner.submit("read", {}, actor=OWNER, idempotency_key=key)
    assert runner.run_due(actor=OWNER) == []


def test_invalid_clock_never_leaves_a_task_running():
    runner = engine()
    runner.register("read", lambda *_: None, side_effects=False)
    task = runner.submit("read", {}, actor=OWNER)
    for now in (datetime(2026, 1, 1), "2026-01-01", False):
        with pytest.raises(ValueError):
            runner.run(task.id, actor=OWNER, now=now)
    assert runner.get(task.id, actor=OWNER) == task


def test_concurrent_submissions_share_one_task_per_owner_and_key():
    runner = engine()
    runner.register("read", lambda *_: None, side_effects=False)
    gate = Barrier(8)
    def submit(_):
        gate.wait(timeout=5)
        return runner.submit("read", {"value": 1}, actor=OWNER, idempotency_key="once").id
    with ThreadPoolExecutor(max_workers=8) as workers:
        ids = list(workers.map(submit, range(8)))
    assert len(set(ids)) == 1
    assert len(runner.run_due(actor=OWNER)) == 1


def test_concurrent_runners_claim_once_without_blocking_other_tasks():
    entered, release = Event(), Event()
    runner = engine(approval_authorizer=lambda *_: True)
    calls = []
    def slow(context, _payload):
        calls.append(context.task_id)
        entered.set()
        assert release.wait(timeout=5)
        return "confirmed"
    runner.register("send", slow, side_effects=True)
    runner.register("read", lambda *_: "independent", side_effects=False)
    task = runner.submit("send", {}, actor=OWNER, idempotency_key="send")
    runner.approve(task.id, OWNER, approved=True)
    with ThreadPoolExecutor(max_workers=2) as workers:
        running = workers.submit(runner.run, task.id, actor=OWNER)
        try:
            assert entered.wait(timeout=5)
            assert runner.get(task.id, actor=OWNER).state == State.RUNNING
            duplicate = workers.submit(runner.run, task.id, actor=OWNER)
            with pytest.raises(TaskNotRunnable):
                duplicate.result(timeout=2)
            with pytest.raises(ValueError, match="executing"):
                runner.cancel(task.id, actor=OWNER)
            other = runner.submit("read", {}, actor=OTHER)
            assert workers.submit(runner.run, other.id, actor=OTHER).result(timeout=2).result == "independent"
        finally:
            release.set()
        assert running.result(timeout=2).state == State.COMPLETED
    assert calls == [task.id] and runner.get(task.id, actor=OWNER).attempts == 1


def test_cancellation_during_approval_cannot_be_undone_by_stale_authorization():
    entered, release = Event(), Event()
    def authorize(*_):
        entered.set()
        assert release.wait(timeout=5)
        return True
    runner = engine(approval_authorizer=authorize)
    runner.register("send", lambda *_: pytest.fail("Cancelled effect"), side_effects=True)
    task = runner.submit("send", {}, actor=OWNER, idempotency_key="send")
    with ThreadPoolExecutor(max_workers=1) as workers:
        approving = workers.submit(runner.approve, task.id, OWNER, approved=True)
        try:
            assert entered.wait(timeout=5)
            runner.cancel(task.id, actor=OWNER)
        finally:
            release.set()
        with pytest.raises(ValueError, match="not awaiting"):
            approving.result(timeout=2)
    assert runner.get(task.id, actor=OWNER).state == State.CANCELLED
    assert runner.run_due(actor=OWNER) == []


def test_simultaneous_batches_skip_lost_claims_without_duplicate_execution():
    runner = engine()
    calls = []
    runner.register("read", lambda ctx, _: calls.append(ctx.task_id), side_effects=False)
    first = runner.submit("read", {}, actor=OWNER)
    second = runner.submit("read", {}, actor=OWNER)
    barrier = Barrier(2)
    actual_run = runner.run
    def concurrent_run(task_id, **kwargs):
        if task_id == first.id:
            barrier.wait(timeout=5)
        return actual_run(task_id, **kwargs)
    runner.run = concurrent_run
    with ThreadPoolExecutor(max_workers=2) as workers:
        batches = [workers.submit(runner.run_due, actor=OWNER) for _ in range(2)]
        results = [batch.result(timeout=5) for batch in batches]
    assert sorted(calls) == sorted([first.id, second.id])
    assert sum(len(batch) for batch in results) == 2
