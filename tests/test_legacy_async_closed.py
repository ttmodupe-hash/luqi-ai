"""No external integrations, credentials or production data are used."""
import importlib
import sys
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_retired_router_does_not_load_workers_or_payment_security_engines():
    with patch.dict(sys.modules, {name: None for name in (
        "worker", "token_billing_gateway", "backend.zta_security",
        "backend.langgraph_zta_workflow", "backend.african_market_sensing",
    )}):
        from backend import async_job_routes
        importlib.reload(async_job_routes)


@pytest.mark.parametrize("prefix", ["/api/v1", "/v1"])
@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def test_legacy_routes_deny_even_forged_operator_and_payment_requests(prefix, method):
    from backend.async_job_routes import router
    app = FastAPI()
    app.include_router(router, prefix=prefix)
    with TestClient(app) as client:
        for path in [
            "/billing/balance", "/billing/topup", "/billing/payfast-itn",
            "/billing/stripe-webhook", "/billing/future-action", "/jobs/submit", "/jobs/private-id",
            "/zta/status", "/zta/approvals", "/zta/approvals/other/resolve",
            "/zta/step-up/challenge", "/zta/step-up/verify", "/zta/langgraph/execute",
            "/zta/sanitize-test", "/self-healing/pipeline/run", "/sensing/run-scan", "/chat",
        ]:
            response = client.request(method, prefix + path, content=b'{malformed', headers={
                "Content-Type": "application/json", "Authorization": "Bearer arbitrary",
                "x-admin-key": "forged", "x-step-up-token": "anything",
            })
            assert response.status_code == 503, path
            assert response.headers["cache-control"] == "no-store"
            assert response.json()["status"] == "unavailable"
            assert "step_up_token" not in response.json()
