"""Real MySQL 8.4 tests; hardcoded loopback disposable CI database only.

Never reads DATABASE_URL or Railway credentials. All DELETE and clock-forcing
helpers below apply exclusively to the explicitly opted-in CI fixture.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
import multiprocessing
import os
from pathlib import Path
from threading import Barrier, Event

import pymysql
import pytest

from omega_ai.mysql_workflow import LeaseLost, MySQLWorkflowEngine, StorageUnavailable
from omega_ai.workflow_engine import State, TaskNotRunnable

pytestmark = pytest.mark.skipif(
    os.getenv("LUQI_OMEGA_MYSQL_CI_FIXTURE") != "true" or os.getenv("GITHUB_ACTIONS") != "true",
    reason="Requires explicitly isolated GitHub Actions MySQL fixture",
)


def connect():
    assert os.getenv("LUQI_OMEGA_MYSQL_CI_FIXTURE") == "true"
    assert os.getenv("GITHUB_ACTIONS") == "true"
    return pymysql.connect(host="127.0.0.1", port=3306, user="root",
                           password="ci-ephemeral-only-password", database="luqi_omega_ci",
                           charset="utf8mb4", connect_timeout=5, read_timeout=10, write_timeout=10)


def runner(**kwargs):
    return MySQLWorkflowEngine(connect, authorizer=lambda actor, _: actor in ("alice", "bob", "Alice"),
                               approval_authorizer=lambda *_: True, **kwargs)


def read_engine(**kwargs):
    engine = runner(**kwargs)
    engine.register("read", lambda ctx, payload: {"owner": ctx.owner_id, "payload": payload,
                                                 "attempt": ctx.attempt},
                    side_effects=False, version="v1")
    return engine


def sql(statement, values=()):
    with connect() as connection:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute(statement, values)
            rows = cursor.fetchall()
        connection.commit()
        return rows


def expire(task_id):
    sql("UPDATE omega_tasks_v1 SET lease_expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE id=%s",
        (task_id,))


def due(task_id):
    sql("UPDATE omega_tasks_v1 SET next_run_at=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE id=%s",
        (task_id,))


@pytest.fixture(autouse=True)
def schema():
    migration = Path("db/migrations/20261023_omega_tasks.sql").read_text()
    sql(migration)
    sql("DELETE FROM omega_tasks_v1")


def test_migration_is_repeatable_and_state_survives_new_connections():
    engine = read_engine()
    task = engine.submit("read", {"note": "Yorùbá"}, actor="alice", idempotency_key="once")
    sql(Path("db/migrations/20261023_omega_tasks.sql").read_text())
    restarted = read_engine()
    assert restarted.get(task.id, actor="alice") == task
    done = restarted.run(task.id, actor="alice")
    assert done.result == {"owner": "alice", "payload": {"note": "Yorùbá"}, "attempt": 1}
    assert read_engine().get(task.id, actor="alice") == done
    assert read_engine().submit("read", {"note": "Yorùbá"}, actor="alice", idempotency_key="once") == done
    assert sql("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA='luqi_omega_ci' "
               "AND TABLE_NAME='omega_tasks_v1'")[0]["ENGINE"] == "InnoDB"


def test_concurrent_idempotency_is_owner_scoped_and_case_sensitive():
    barrier = Barrier(8)
    def submit(_):
        engine = read_engine()
        barrier.wait(timeout=10)
        return engine.submit("read", {"value": 1}, actor="alice", idempotency_key="shared")
    with ThreadPoolExecutor(max_workers=8) as pool:
        tasks = list(pool.map(submit, range(8)))
    assert len({task.id for task in tasks}) == 1
    engine = read_engine()
    with pytest.raises(ValueError, match="different task"):
        engine.submit("read", {"value": True}, actor="alice", idempotency_key="shared")
    with pytest.raises(ValueError, match="different task"):
        engine.submit("read", {"value": 1}, actor="alice", idempotency_key="shared", max_attempts=5)
    assert engine.submit("read", {"value": 1}, actor="Alice", idempotency_key="shared").id != tasks[0].id
    assert engine.submit("read", {"value": 1}, actor="bob", idempotency_key="shared").id != tasks[0].id
    assert engine.submit("read", {"value": 1}, actor="alice", idempotency_key="Shared").id != tasks[0].id


@pytest.mark.parametrize("operation", ["get", "run", "approve", "cancel"])
def test_missing_and_other_owner_are_indistinguishable(operation):
    engine = read_engine()
    task = engine.submit("read", {"private": "alice"}, actor="alice")
    for task_id in (task.id, "missing"):
        args = {"actor": "bob", **({"approved": True} if operation == "approve" else {})}
        with pytest.raises(KeyError, match="Task not found"):
            getattr(engine, operation)(task_id, **args)
    assert engine.run_due(actor="bob") == []
    assert engine.get(task.id, actor="alice").attempts == 0


def process_run(task_id, entered, release, output):
    engine = runner()
    def handler(ctx, payload):
        entered.set()
        if not release.wait(15):
            raise RuntimeError("Test release timed out")
        return {"from_process": True, "owner": ctx.owner_id}
    engine.register("read", handler, side_effects=False, version="v1")
    try:
        output.put(engine.run(task_id, actor="alice").result)
    except BaseException as error:
        output.put(type(error).__name__)


def test_independent_process_claims_prevent_duplicate_execution():
    engine = read_engine()
    task = engine.submit("read", {}, actor="alice")
    mp = multiprocessing.get_context("spawn")
    entered, release, output = mp.Event(), mp.Event(), mp.Queue()
    process = mp.Process(target=process_run, args=(task.id, entered, release, output))
    process.start()
    try:
        assert entered.wait(15)
        with pytest.raises(TaskNotRunnable):
            engine.run(task.id, actor="alice")
        assert engine.get(task.id, actor="alice").attempts == 1
        other = engine.submit("read", {}, actor="bob")
        assert engine.run(other.id, actor="bob").state == State.COMPLETED
        release.set()
        assert output.get(timeout=15) == {"from_process": True, "owner": "alice"}
        process.join(15)
        assert process.exitcode == 0
    finally:
        if process.is_alive():
            process.terminate()
            process.join(5)


def process_crash(task_id, effects):
    engine = runner()
    engine.register("crash", lambda *_: os._exit(17), side_effects=effects, version="v1")
    engine.run(task_id, actor="alice")


@pytest.mark.parametrize("effects", [False, True])
def test_process_death_recovery_and_persisted_effect_classification(effects):
    engine = runner()
    engine.register("crash", lambda *_: None, side_effects=effects, version="v1")
    task = engine.submit("crash", {}, actor="alice", idempotency_key="crash")
    if effects:
        engine.approve(task.id, "alice", approved=True)
    process = multiprocessing.get_context("spawn").Process(target=process_crash, args=(task.id, effects))
    process.start()
    process.join(15)
    try:
        assert process.exitcode == 17
    finally:
        if process.is_alive():
            process.terminate()
            process.join(5)
    assert engine.get(task.id, actor="alice").state == State.RUNNING
    assert engine.recover_expired(actor="alice") == []
    expire(task.id)
    # Recovery uses the persisted classification even without a registered handler.
    restarted = runner()
    assert restarted.recover_expired(actor="bob") == []
    recovered = restarted.recover_expired(actor="alice")[0]
    assert recovered.error == "WORKER_LEASE_EXPIRED" and recovered.result is None
    assert recovered.state == (State.RECONCILIATION_REQUIRED if effects else State.RETRY_WAIT)
    assert restarted.recover_expired(actor="alice") == []
    if effects:
        with pytest.raises(TaskNotRunnable):
            engine.run(task.id, actor="alice")
    else:
        with pytest.raises(TaskNotRunnable):
            engine.run(task.id, actor="alice")
        due(task.id)
        assert engine.run(task.id, actor="alice").state == State.COMPLETED


def test_stale_worker_cannot_finish_or_renew_after_recovery_and_reclaim():
    engine = read_engine()
    task = engine.submit("read", {}, actor="alice")
    _, stale_token, _ = engine._claim(task.id, "alice")
    expire(task.id)
    for operation in [lambda: engine._heartbeat(task.id, "alice", stale_token),
                      lambda: engine._finish(task.id, "alice", stale_token, result="false success")]:
        with pytest.raises(LeaseLost):
            operation()
    engine.recover_expired(actor="alice")
    due(task.id)
    _, fresh_token, _ = engine._claim(task.id, "alice")
    assert fresh_token != stale_token
    with pytest.raises(LeaseLost):
        engine._finish(task.id, "alice", stale_token, result="old")
    with pytest.raises(LeaseLost):
        engine._heartbeat(task.id, "alice", stale_token)
    finished = engine._finish(task.id, "alice", fresh_token, result="fresh")
    assert finished.result == "fresh" and finished.attempts == 2


def test_heartbeat_extends_current_claim_using_database_time():
    engine = runner(lease_seconds=90)
    def handler(ctx, _):
        sql("UPDATE omega_tasks_v1 SET lease_expires_at=UTC_TIMESTAMP(6)+INTERVAL 5 SECOND WHERE id=%s",
            (ctx.task_id,))
        before = sql("SELECT lease_expires_at FROM omega_tasks_v1 WHERE id=%s", (ctx.task_id,))[0]
        ctx.heartbeat()
        after = sql("SELECT lease_expires_at FROM omega_tasks_v1 WHERE id=%s", (ctx.task_id,))[0]
        assert after["lease_expires_at"] > before["lease_expires_at"] + timedelta(seconds=60)
        return "done"
    engine.register("long-read", handler, side_effects=False, version="v1")
    task = engine.submit("long-read", {}, actor="alice")
    assert engine.run(task.id, actor="alice").state == State.COMPLETED


def test_expired_read_only_claims_cannot_exceed_attempt_limit():
    engine = read_engine()
    task = engine.submit("read", {}, actor="alice", max_attempts=2)
    for attempt in (1, 2):
        claimed, _, _ = engine._claim(task.id, "alice")
        assert claimed.attempts == attempt
        expire(task.id)
        recovered = engine.recover_expired(actor="alice")[0]
        if attempt == 1:
            assert recovered.state == State.RETRY_WAIT
            due(task.id)
        else:
            assert recovered.state == State.FAILED and recovered.next_run_at is None
    assert engine.run_due(actor="alice") == []


@pytest.mark.parametrize("effects,version", [(True, "v1"), (False, "v2")])
def test_new_worker_cannot_change_persisted_handler_contract(effects, version):
    task = read_engine().submit("read", {}, actor="alice", idempotency_key="once")
    changed = runner()
    changed.register("read", lambda *_: pytest.fail("Changed contract executed"),
                     side_effects=effects, version=version)
    with pytest.raises(ValueError, match="persisted contract"):
        changed.run(task.id, actor="alice")
    with pytest.raises(ValueError, match="persisted contract"):
        changed.submit("read", {}, actor="alice", idempotency_key="once")
    assert read_engine().get(task.id, actor="alice").attempts == 0


def test_approval_callback_does_not_lock_out_cancellation_or_revive_cancelled_task():
    entered, release = Event(), Event()
    def approval(*_):
        entered.set()
        assert release.wait(10)
        return True
    engine = MySQLWorkflowEngine(connect, authorizer=lambda *_: True, approval_authorizer=approval)
    engine.register("effect", lambda *_: None, side_effects=True, version="v1")
    task = engine.submit("effect", {}, actor="alice", idempotency_key="effect")
    with pytest.raises(PermissionError):
        engine.run(task.id, actor="alice")
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(engine.approve, task.id, "alice", approved=True)
        try:
            assert entered.wait(10)
            assert runner().cancel(task.id, actor="alice").state == State.CANCELLED
        finally:
            release.set()
        with pytest.raises(ValueError, match="not awaiting"):
            future.result(timeout=10)
    assert engine.get(task.id, actor="alice").approved_by is None


@pytest.mark.parametrize("effects", [False, True])
@pytest.mark.parametrize("failure", ["exception", "invalid_json", "interrupt"])
def test_handler_failures_are_durable_sanitized_and_effects_are_not_retried(effects, failure):
    engine = runner()
    def handler(*_):
        if failure == "invalid_json":
            return object()
        if failure == "interrupt":
            raise KeyboardInterrupt("secret")
        raise RuntimeError("secret")
    engine.register("fail", handler, side_effects=effects, version="v1")
    task = engine.submit("fail", {}, actor="alice", idempotency_key="once")
    if effects:
        engine.approve(task.id, "alice", approved=True)
    if failure == "interrupt":
        with pytest.raises(KeyboardInterrupt):
            engine.run(task.id, actor="alice")
    else:
        engine.run(task.id, actor="alice")
    saved = runner().get(task.id, actor="alice")
    expected = State.RECONCILIATION_REQUIRED if effects else (
        State.FAILED if failure == "interrupt" else State.RETRY_WAIT)
    assert saved.state == expected and saved.result is None
    assert saved.error == ("HANDLER_INTERRUPTED" if failure == "interrupt" else "HANDLER_FAILED")
    assert "secret" not in str(saved.audit)


def test_concurrent_batches_only_execute_once_and_respect_owner_and_limit():
    first, second = read_engine(), read_engine()
    tasks = [first.submit("read", {}, actor="alice") for _ in range(6)]
    other = first.submit("read", {}, actor="bob")
    assert len(first.run_due(actor="alice", limit=1)) == 1
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(engine.run_due, actor="alice") for engine in (first, second)]
        results = [item for future in futures for item in future.result(timeout=15)]
    assert len(results) == 5
    assert all(first.get(task.id, actor="alice").attempts == 1 for task in tasks)
    assert first.get(other.id, actor="bob").state == State.PENDING


def test_claim_commit_failure_prevents_handler_and_rolls_back():
    engine = read_engine()
    task = engine.submit("read", {}, actor="alice")
    class FailCommit:
        def __init__(self):
            self.connection = connect()
        def __getattr__(self, name):
            return getattr(self.connection, name)
        def commit(self):
            raise pymysql.OperationalError(2013, "private-dsn")
    broken = MySQLWorkflowEngine(FailCommit, authorizer=lambda *_: True)
    broken.register("read", lambda *_: pytest.fail("Uncommitted claim executed"),
                    side_effects=False, version="v1")
    with pytest.raises(StorageUnavailable, match="outcome may be unconfirmed"):
        broken.run(task.id, actor="alice")
    assert engine.get(task.id, actor="alice").state == State.PENDING
    assert engine.get(task.id, actor="alice").attempts == 0


def test_result_storage_failure_leaves_running_claim_for_reconciliation():
    engine = runner()
    def handler(*_):
        engine._connect = lambda: (_ for _ in ()).throw(pymysql.OperationalError(2013, "secret"))
        return "external effect may have happened"
    engine.register("effect", handler, side_effects=True, version="v1")
    task = engine.submit("effect", {}, actor="alice", idempotency_key="once")
    engine.approve(task.id, "alice", approved=True)
    with pytest.raises(StorageUnavailable):
        engine.run(task.id, actor="alice")
    recovered_engine = runner()
    assert recovered_engine.get(task.id, actor="alice").state == State.RUNNING
    expire(task.id)
    result = recovered_engine.recover_expired(actor="alice")[0]
    assert result.state == State.RECONCILIATION_REQUIRED and result.result is None


def test_effect_handler_cannot_be_downgraded_after_approval():
    original = runner()
    original.register("effect", lambda *_: None, side_effects=True, version="v1")
    task = original.submit("effect", {}, actor="alice", idempotency_key="once")
    original.approve(task.id, "alice", approved=True)
    downgraded = runner()
    downgraded.register("effect", lambda *_: pytest.fail("Downgraded handler executed"),
                        side_effects=False, version="v1")
    with pytest.raises(ValueError, match="persisted contract"):
        downgraded.run(task.id, actor="alice")
    assert original.get(task.id, actor="alice").attempts == 0


def test_recovery_is_bounded_and_competing_workers_recover_each_claim_once():
    engine = read_engine()
    tasks = [engine.submit("read", {}, actor="alice") for _ in range(5)]
    for task in tasks:
        engine._claim(task.id, "alice")
        expire(task.id)
    assert len(engine.recover_expired(actor="alice", limit=1)) == 1
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(runner().recover_expired, actor="alice") for _ in range(2)]
        recovered = [task for future in futures for task in future.result(timeout=15)]
    assert len(recovered) == len({task.id for task in recovered}) == 4
    assert all(len(engine.get(task.id, actor="alice").audit) == 3 for task in tasks)


def test_revocation_prevents_new_claims_and_durable_state_remains_inspectable_by_owner():
    task = read_engine().submit("read", {}, actor="alice")
    revoked = MySQLWorkflowEngine(connect, authorizer=lambda *_: False)
    revoked.register("read", lambda *_: pytest.fail("Revoked handler executed"),
                     side_effects=False, version="v1")
    with pytest.raises(PermissionError):
        revoked.run(task.id, actor="alice")
    assert read_engine().get(task.id, actor="alice").state == State.PENDING
