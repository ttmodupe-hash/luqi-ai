"""Offline policy/input tests. Cross-language MySQL tests run separately in CI."""
import json
from pathlib import Path
import pytest

from omega_ai.web_tasks import validate_payload, budget_handler, schedule_handler
from omega_ai.web_worker import WebTaskDenied, connection_factory_from_env, main, run_web_task

CASES = json.loads(Path("tests/fixtures/omega-web-contracts.json").read_text())


@pytest.mark.parametrize("case", CASES, ids=lambda item: item["name"])
def test_shared_web_input_contract(case):
    if case["valid"]:
        validate_payload(case["handler"], case["payload"])
        handler = budget_handler if case["handler"] == "travel.budget" else schedule_handler
        assert handler(None, case["payload"]) == case["result"]
    else:
        with pytest.raises(ValueError):
            validate_payload(case["handler"], case["payload"])


@pytest.mark.parametrize("enabled", [False, None, 1, "true"])
def test_worker_is_disabled_before_opening_database(enabled):
    with pytest.raises(WebTaskDenied, match="DISABLED"):
        run_web_task(lambda: pytest.fail("Database accessed"), "missing", enabled=enabled)


def test_worker_cli_does_not_echo_secrets_or_accept_owner_arguments(monkeypatch, capsys):
    monkeypatch.delenv("LUQI_OMEGA_WORKER_ENABLED", raising=False)
    assert main(["--password", "private-secret"]) == 1
    monkeypatch.setenv("LUQI_OMEGA_WORKER_ENABLED", "true")
    assert main(["--owner-id", "private-secret"]) == 1
    monkeypatch.setenv("LUQI_OMEGA_DATABASE_URL", "mysql://private-secret@public.invalid/db")
    assert main(["--task-id", "bad"]) == 1
    output = capsys.readouterr().out
    assert "private-secret" not in output and "public.invalid" not in output
    assert "OMEGA_WORKER_DISABLED" in output
    assert "OMEGA_WORKER_ARGUMENTS_INVALID" in output
    assert "OMEGA_WORKER_CONFIG_UNAVAILABLE" in output


@pytest.mark.parametrize("url", ["", "postgres://user:password@localhost/db",
                                 "mysql://user:password@public.invalid/db",
                                 "mysql://user@localhost/db", "mysql://user:password@localhost/",
                                 "mysql://user:password@localhost/db?ssl=false"])
def test_invalid_or_unprotected_worker_configuration_is_refused(url):
    with pytest.raises(WebTaskDenied, match="CONFIG_UNAVAILABLE"):
        connection_factory_from_env({"LUQI_OMEGA_DATABASE_URL": url})


def test_worker_uses_dedicated_credentials_and_verified_tls(monkeypatch):
    settings = []
    monkeypatch.setattr("omega_ai.web_worker.pymysql.connect", lambda **kwargs: settings.append(kwargs))
    connect = connection_factory_from_env({"LUQI_OMEGA_DATABASE_URL": "mysql://worker:fixture@public.invalid/omega",
                                          "LUQI_OMEGA_MYSQL_CA": "/trusted/ca.pem"})
    connect()
    assert settings[0]["ssl_verify_cert"] is True and settings[0]["ssl_verify_identity"] is True
    assert settings[0]["local_infile"] is False
    with pytest.raises(WebTaskDenied):
        connection_factory_from_env({"DATABASE_URL": "mysql://general:fixture@localhost/db"})
