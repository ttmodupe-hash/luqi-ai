"""P0 security tests: legacy Python billing can neither authorize nor mint money."""
import ast
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient
from backend.legacy_route_security import require_legacy_route_disabled

ROOT = Path(__file__).resolve().parents[1]


def load_billing_module():
    spec = importlib.util.spec_from_file_location(
        "legacy_token_billing_security_test", ROOT / "token_billing_gateway.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class QuarantinedBillingTests(unittest.TestCase):
    def test_legacy_gateway_import_does_not_create_wallet_or_payment_tables(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(
            os.environ, {"SQLITE_DB_PATH": str(Path(folder) / "legacy.db")}
        ):
            load_billing_module()
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_no_credit_mutation_even_with_forged_payment_and_test_mode(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {
            "SQLITE_DB_PATH": str(Path(folder) / "wallets.sqlite3"),
            "PAYFAST_TEST_MODE": "true",
            "PAYFAST_MERCHANT_KEY": "fake",
            "STRIPE_SECRET_KEY": "fake",
        }):
            m = load_billing_module()
            bad_event = {
                "type": "checkout.session.completed",
                "data": {"object": {
                    "id": "cs_test_forged", "customer_email": "victim@example.test",
                    "metadata": {"tokens": "99999999"},
                    "amount_total": 100,
                }},
            }
            self.assertFalse(m.TokenBillingGateway.verify_payfast_signature({
                "signature": "arbitrary",
                "payment_status": "COMPLETE",
                "custom_int1": "999999999",
            }))
            for action in (
                lambda: m.TokenBillingGateway.process_stripe_webhook(bad_event),
                lambda: m.TokenBillingGateway.process_payfast_webhook({
                    "payment_status": "COMPLETE", "custom_int1": 5000,
                    "email_address": "victim@example.test",
                }),
                lambda: m.TokenBillingGateway.process_payfast_itn({}),
                lambda: m.TokenBillingGateway.credit_tokens("victim@example.test", 10000),
                lambda: m.TokenBillingGateway.check_and_deduct_tokens("victim@example.test", -100),
                lambda: m.TokenBillingGateway.get_balance("victim@example.test"),
                lambda: m.TokenBillingGateway.calculate_task_cost("wan21_video"),
            ):
                with self.subTest(operation=action):
                    with self.assertRaises(m.LegacyBillingDisabledError):
                        action()
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_dependency_refuses_all_requesters_before_executing_handler(self):
        app = FastAPI()
        router = APIRouter(
            dependencies=[Depends(require_legacy_route_disabled)]
        )
        calls = []
        @router.post("/billing/topup")
        async def topup():
            calls.append("unsafe write")
            return {"success": True}
        @router.get("/billing/balance")
        async def balance():
            calls.append("unsafe read")
            return {"balance": 100}
        app.include_router(router, prefix="/api/v1")
        client = TestClient(app)
        for auth in ({}, {"Authorization": "Bearer forged-admin"},
                     {"X-User-Role": "admin"}):
            response = client.post(
                "/api/v1/billing/topup",
                json={"email": "victim@example.test", "tokens": 1000000},
                headers=auth,
            )
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json()["detail"]["code"], "LEGACY_API_RETIRED")
        self.assertEqual(client.get("/api/v1/billing/balance").status_code, 503)
        self.assertEqual(calls, [])

    def test_both_legacy_router_mounts_require_the_same_denial(self):
        module = ast.parse((ROOT / "backend/async_job_routes.py").read_text())
        routers = [
            node.value for node in module.body if isinstance(node, ast.Assign)
            for target in node.targets if isinstance(target, ast.Name) and target.id == "router"
        ]
        self.assertEqual(len(routers), 1)
        router = routers[0]
        self.assertIsInstance(router, ast.Call)
        self.assertIsInstance(router.func, ast.Name)
        self.assertEqual(router.func.id, "APIRouter")
        dependencies = next(
            (kw.value for kw in router.keywords if kw.arg == "dependencies"), None
        )
        self.assertIsInstance(dependencies, ast.List)
        self.assertTrue(any(
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "Depends"
            and node.args
            and isinstance(node.args[0], ast.Name)
            and node.args[0].id == "require_legacy_route_disabled"
            for node in dependencies.elts
        ), "Legacy router must be denied globally, including duplicate prefixes")

        main = ast.parse((ROOT / "main.py").read_text())
        mounts = [
            node for node in ast.walk(main)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "include_router"
            and node.args
            and isinstance(node.args[0], ast.Name)
            and node.args[0].id == "async_jobs_router"
        ]
        self.assertEqual(
            sorted(kw.value.value for node in mounts for kw in node.keywords
                   if kw.arg == "prefix" and isinstance(kw.value, ast.Constant)),
            ["/api/v1", "/v1"],
        )

    def test_direct_main_stripe_and_admin_routes_are_also_quarantined(self):
        root = ast.parse((ROOT / "main.py").read_text())
        required = {
            "/api/v1/billing/stripe-webhook",
            "/api/v1/admin/billing-ledger",
            "/admin/billing-ledger",
            "/api/v1/intelligence/self-optimize",
            "/intelligence/self-optimize",
        }
        found = set()
        for node in root.body:
            if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
                continue
            for decorator in node.decorator_list:
                if not isinstance(decorator, ast.Call) or not decorator.args:
                    continue
                if not isinstance(decorator.args[0], ast.Constant):
                    continue
                route = decorator.args[0].value
                if route not in required:
                    continue
                found.add(route)
                deps = next(
                    (kw.value for kw in decorator.keywords if kw.arg == "dependencies"),
                    None,
                )
                self.assertIsInstance(deps, ast.List, route)
                self.assertTrue(any(
                    isinstance(n, ast.Call)
                    and isinstance(n.func, ast.Name) and n.func.id == "Depends"
                    and n.args and isinstance(n.args[0], ast.Name)
                    and n.args[0].id == "require_legacy_route_disabled"
                    for n in deps.elts
                ), "Main route lost its billing/auth dependency: " + route)
        self.assertEqual(found, required)


if __name__ == "__main__":
    unittest.main()
