"""Offline input/policy checks. Real SQL behavior is tested in MySQL CI."""
from decimal import Decimal
import pytest
import pymysql

from omega_ai.mysql_workflow import MySQLWorkflowEngine, StorageUnavailable, _json, _document
from omega_ai.workflow_engine import Task, State


def no_connection():
    pytest.fail("Rejected input must not open a database connection")


@pytest.mark.parametrize("value", [float("nan"), float("inf"), {1: "bad"}, (1, 2),
                                  Decimal("1.2"), object(), 2 ** 63, "\ud800"])
def test_non_json_and_unsafe_numbers_are_rejected(value):
    with pytest.raises(ValueError):
        _json(value)


def test_bounded_json_preserves_types_and_unicode():
    assert _json({"z": [None, True, 12, 1.5], "a": "isiZulu / Yorùbá"}).startswith('{"a":')
    assert _json({"value": True}) != _json({"value": 1})
    with pytest.raises(ValueError, match="size limit"):
        _json("é" * 100, limit=100)
    nested = []
    nested.append(nested)
    with pytest.raises(ValueError, match="deeply nested"):
        _json(nested)


def test_storage_envelope_accepts_the_documented_payload_depth_boundary():
    payload = {}
    child = payload
    for _ in range(32):
        child["x"] = {}
        child = child["x"]
    assert _json(payload)
    assert _document(Task("id", "alice", "read", payload, State.COMPLETED, result=payload))
    child["too_deep"] = True
    with pytest.raises(ValueError, match="deeply nested"):
        _json(payload)


@pytest.mark.parametrize("authorization", [None, False, "true", 1, [True]])
def test_all_durable_operations_default_deny_before_storage(authorization):
    runner = MySQLWorkflowEngine(no_connection,
                                authorizer=None if authorization is None else lambda *_: authorization)
    operations = [lambda: runner.submit("read", {}, actor="alice"),
                  lambda: runner.get("missing", actor="alice"),
                  lambda: runner.approve("missing", "alice", approved=True),
                  lambda: runner.cancel("missing", actor="alice"),
                  lambda: runner.run("missing", actor="alice"),
                  lambda: runner.run_due(actor="alice"),
                  lambda: runner.recover_expired(actor="alice")]
    for operation in operations:
        with pytest.raises(PermissionError):
            operation()


@pytest.mark.parametrize("lease", [0, 3601, True, 1.5, "10"])
def test_invalid_lease_configuration(lease):
    with pytest.raises(ValueError):
        MySQLWorkflowEngine(no_connection, lease_seconds=lease)


@pytest.mark.parametrize("change", [{"payload": {"huge": "a" * 17000}},
                                    {"payload": {"cost": Decimal("1.2")}},
                                    {"payload": []}, {"max_attempts": True},
                                    {"max_attempts": 6}, {"idempotency_key": "x" * 513},
                                    {"idempotency_key": "\nkey"}])
def test_invalid_submissions_are_rejected_before_storage(change):
    runner = MySQLWorkflowEngine(no_connection, authorizer=lambda *_: True)
    runner.register("read", lambda *_: None, side_effects=False, version="v1")
    args = {"handler": "read", "payload": {}, "actor": "alice", **change}
    with pytest.raises((ValueError, TypeError)):
        runner.submit(**args)


def test_database_errors_are_sanitized_without_memory_fallback():
    def disconnected():
        raise pymysql.OperationalError(2003, "secret://database-password")
    runner = MySQLWorkflowEngine(disconnected, authorizer=lambda *_: True)
    with pytest.raises(StorageUnavailable) as error:
        runner.get("missing", actor="alice")
    assert "secret" not in str(error.value)
    assert runner._tasks == {}
