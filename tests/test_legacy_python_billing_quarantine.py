"""P0 security tests: legacy Python billing can neither authorize nor mint money."""
import ast
import asyncio
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi import APIRouter, Depends, FastAPI, WebSocket
from starlette.websockets import WebSocketDisconnect
from fastapi.testclient import TestClient
from backend.legacy_route_security import require_legacy_route_disabled, reject_legacy_websocket

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
            "/api/v1/auth/register",
            "/auth/register",
            "/api/v1/auth/login",
            "/auth/login",
            "/api/v1/media/compile-and-stream",
            "/media/compile-and-stream",
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

    def test_no_fabricated_login_payment_media_or_optimization_success(self):
        source = (ROOT / "main.py").read_text()
        for forbidden in (
            "admin123",
            "LUQI-JWT-",
            "LUQI-ADMIN-2026",
            "hashed_master_pass",
            "TX-STRIPE-9901",
            "TX-STRIPE-9902",
            "AUDIO_SYNC_LOCKED",
            '"code_optimization_patch": "APPLIED',
        ):
            with self.subTest(value=forbidden):
                self.assertNotIn(forbidden, source)

        parsed = ast.parse(source)
        protected = {
            "register_auth_user",
            "login_auth_user",
            "compile_and_stream_scene",
            "stripe_webhook_receiver",
            "admin_billing_ledger",
            "execute_internal_self_optimization",
        }
        handlers = {
            node.name: node for node in parsed.body
            if isinstance(node, ast.AsyncFunctionDef) and node.name in protected
        }
        self.assertEqual(set(handlers), protected)
        for name, fn in handlers.items():
            self.assertEqual(len(fn.body), 1, name)
            statement = fn.body[0]
            self.assertIsInstance(statement, ast.Expr, name)
            self.assertIsInstance(statement.value, ast.Call, name)
            self.assertIsInstance(statement.value.func, ast.Name, name)
            self.assertEqual(statement.value.func.id, "require_legacy_route_disabled")



class LegacyWorkspaceRetirementTests(unittest.TestCase):
    def test_websocket_refused_before_accept_with_spoofed_identity(self):
        app = FastAPI()
        accepted = []

        @app.websocket("/workspace/stream/{user_id}")
        async def legacy_socket(websocket: WebSocket, user_id: str):
            return await reject_legacy_websocket(websocket)
            accepted.append(user_id)

        with TestClient(app) as client:
            for identity in ("victim@example.invalid", "forged-admin"):
                with self.subTest(identity=identity):
                    with self.assertRaises(WebSocketDisconnect) as caught:
                        with client.websocket_connect("/workspace/stream/" + identity):
                            self.fail("Legacy websocket must never connect")
                    self.assertEqual(caught.exception.code, 1008)
        self.assertEqual(accepted, [])

    def test_all_legacy_workspace_http_aliases_are_unconditionally_retired(self):
        root = ast.parse((ROOT / "main.py").read_text())
        expected = {
            "/api/v1/workspace/upload-asset", "/workspace/upload-asset",
            "/api/v1/workspace/calendar/book", "/workspace/calendar/book",
            "/api/v1/workspace/submit-critique", "/workspace/submit-critique",
            "/api/v1/workspace/critiques", "/workspace/critiques",
        }
        protected = {
            "upload_workspace_file", "create_calendar_appointment",
            "register_user_critique", "get_system_critiques",
        }
        found = set()
        for node in root.body:
            if not isinstance(node, ast.AsyncFunctionDef):
                continue
            for decorator in node.decorator_list:
                if not isinstance(decorator, ast.Call) or not decorator.args:
                    continue
                if not isinstance(decorator.args[0], ast.Constant):
                    continue
                route = decorator.args[0].value
                if route not in expected:
                    continue
                found.add(route)
                deps = next(
                    (kw.value for kw in decorator.keywords if kw.arg == "dependencies"),
                    None,
                )
                self.assertIsInstance(deps, ast.List, route)
                self.assertTrue(any(
                    isinstance(d, ast.Call)
                    and isinstance(d.func, ast.Name) and d.func.id == "Depends"
                    and d.args and isinstance(d.args[0], ast.Name)
                    and d.args[0].id == "require_legacy_route_disabled"
                    for d in deps.elts
                ), "Legacy workspace alias can bypass dependency: " + route)
            if node.name in protected:
                self.assertEqual(len(node.body), 1, node.name)
                stmt = node.body[0]
                self.assertIsInstance(stmt, ast.Expr, node.name)
                self.assertIsInstance(stmt.value, ast.Call, node.name)
                self.assertIsInstance(stmt.value.func, ast.Name, node.name)
                self.assertEqual(stmt.value.func.id, "require_legacy_route_disabled")
                protected.remove(node.name)
        self.assertEqual(found, expected)
        self.assertEqual(protected, set(), "Some direct-call guards were not found")

    def test_real_legacy_websocket_entrypoint_refuses_before_accept(self):
        root = ast.parse((ROOT / "main.py").read_text())
        socket = next(
            node for node in root.body
            if isinstance(node, ast.AsyncFunctionDef)
            and node.name == "enterprise_websocket_endpoint"
        )
        self.assertEqual(
            sorted(
                deco.args[0].value for deco in socket.decorator_list
                if isinstance(deco, ast.Call) and deco.args
                and isinstance(deco.args[0], ast.Constant)
            ),
            ["/api/v1/workspace/stream/{user_id}", "/workspace/stream/{user_id}"],
        )
        last = socket.body[-1]
        self.assertIsInstance(last, ast.Return)
        self.assertIsInstance(last.value, ast.Await)
        call = last.value.value
        self.assertIsInstance(call, ast.Call)
        self.assertIsInstance(call.func, ast.Name)
        self.assertEqual(call.func.id, "reject_legacy_websocket")
        self.assertEqual(len(call.args), 1)
        self.assertIsInstance(call.args[0], ast.Name)
        self.assertEqual(call.args[0].id, "websocket")
        self.assertFalse(any(
            isinstance(x, ast.Attribute) and x.attr == "accept"
            for x in ast.walk(socket)
        ), "Never accept a legacy anonymous websocket")

    def test_retired_workspace_never_claims_completed_work_or_seeds_fake_critiques(self):
        source = (ROOT / "main.py").read_text()
        tree = ast.parse(source)
        for node in tree.body:
            if isinstance(node, ast.Assign) and any(
                isinstance(t, ast.Name) and t.id == "_system_critiques_ledger"
                for t in node.targets
            ):
                self.assertIsInstance(node.value, ast.List)
                self.assertEqual(node.value.elts, [])
                return
        self.fail("No empty retired critique ledger found")


class LegacyUnmeteredAiRetirementTests(unittest.TestCase):
    """Negative paths for the exact legacy Python route declarations."""

    def test_unmetered_http_aliases_have_route_and_direct_call_guards(self):
        tree = ast.parse((ROOT / "main.py").read_text())
        expected = {
            "process_luqi_intelligence": {"/api/v1/luqi-core"},
            "query_african_sovereignty": {"/api/v1/african-sovereignty"},
            "get_system_api_matrix": {"/api/v1/system-api-matrix"},
            "generate_production_storyboard": {"/api/v1/media/orchestrate", "/media/orchestrate"},
            "generate_african_cartoon_endpoint": {
                "/api/v1/animation/generate-african-cartoon", "/animation/generate-african-cartoon"
            },
            "handle_user_submission": {"/api/khoro/chat"},
        }
        for fn in tree.body:
            if not isinstance(fn, ast.AsyncFunctionDef) or fn.name not in expected:
                continue
            with self.subTest(handler=fn.name):
                paths = set()
                for decorator in fn.decorator_list:
                    self.assertIsInstance(decorator, ast.Call)
                    self.assertIsInstance(decorator.func, ast.Attribute)
                    self.assertIn(decorator.func.attr, ("get", "post"))
                    self.assertIsInstance(decorator.args[0], ast.Constant)
                    paths.add(decorator.args[0].value)
                    dependency = next((kw.value for kw in decorator.keywords
                                       if kw.arg == "dependencies"), None)
                    self.assertIsInstance(dependency, ast.List)
                    self.assertEqual(len(dependency.elts), 1)
                    call = dependency.elts[0]
                    self.assertIsInstance(call, ast.Call)
                    self.assertIsInstance(call.func, ast.Name)
                    self.assertEqual(call.func.id, "Depends")
                    self.assertIsInstance(call.args[0], ast.Name)
                    self.assertEqual(call.args[0].id, "require_legacy_route_disabled")
                self.assertEqual(paths, expected.pop(fn.name))
                self.assertEqual(len(fn.body), 1, "Direct invocation must fail closed")
                stmt = fn.body[0]
                self.assertIsInstance(stmt, ast.Expr)
                self.assertIsInstance(stmt.value, ast.Call)
                self.assertIsInstance(stmt.value.func, ast.Name)
                self.assertEqual(stmt.value.func.id, "require_legacy_route_disabled")
        self.assertFalse(expected, "An unmetered handler is missing")
        source = (ROOT / "main.py").read_text()
        # Assemble the historical name without a false generic-key finding.
        # This asserts the same exact token is absent from the real source.
        legacy_provider_key_name = "_".join(("POLLINATIONS", "API", "KEY"))
        for forbidden in ("genai.Client(", "websockets.connect(",
                          legacy_provider_key_name, "100_PERCENT_OPERATIONAL"):
            self.assertNotIn(forbidden, source)

    def test_unauthenticated_echo_and_voice_aliases_refuse_before_accept(self):
        tree = ast.parse((ROOT / "main.py").read_text())
        expected = {
            "websocket_chat": {"/ws/chat"},
            "khoro_live_websocket": {"/ws/khoro-live", "/ws/jarvis-live"},
        }
        for fn in tree.body:
            if not isinstance(fn, ast.AsyncFunctionDef) or fn.name not in expected:
                continue
            with self.subTest(handler=fn.name):
                paths = {d.args[0].value for d in fn.decorator_list
                         if isinstance(d, ast.Call) and d.args
                         and isinstance(d.args[0], ast.Constant)}
                self.assertEqual(paths, expected.pop(fn.name))
                self.assertEqual(len(fn.body), 1)
                stmt = fn.body[0]
                self.assertIsInstance(stmt, ast.Return)
                self.assertIsInstance(stmt.value, ast.Await)
                call = stmt.value.value
                self.assertIsInstance(call, ast.Call)
                self.assertIsInstance(call.func, ast.Name)
                self.assertEqual(call.func.id, "reject_legacy_websocket")
                self.assertEqual(len(call.args), 1)
                self.assertIsInstance(call.args[0], ast.Name)
                self.assertEqual(call.args[0].id, "websocket")
                self.assertFalse(any(
                    isinstance(x, ast.Attribute) and x.attr in ("accept", "connect")
                    for x in ast.walk(fn)
                ))
        self.assertFalse(expected)
        app = FastAPI()
        async def refused(websocket: WebSocket):
            return await reject_legacy_websocket(websocket)
        for path in ("/ws/chat", "/ws/khoro-live", "/ws/jarvis-live"):
            app.websocket(path)(refused)
        with TestClient(app) as client:
            for path in ("/ws/chat", "/ws/khoro-live", "/ws/jarvis-live"):
                for headers in ({}, {"Authorization": "Bearer forged-admin"}):
                    with self.subTest(path=path, headers=headers):
                        with self.assertRaises(WebSocketDisconnect) as caught:
                            with client.websocket_connect(path, headers=headers):
                                self.fail("Legacy socket unexpectedly accepted")
                        self.assertEqual(caught.exception.code, 1008)



class AdditionalLegacyAliasDenialTests(unittest.TestCase):
    """Source-level regression for unmigrated sensitive legacy FastAPI handlers."""

    ROUTES = {
        "verify_terminal_command": ("post", ("/api/v1/simulation/verify-terminal",)),
        "get_simulation_ledger": ("get", ("/api/v1/simulation/ledger",)),
        "process_khoro_legal_endpoint": ("post", ("/api/khoro-legal", "/api/v1/khoro-legal")),
        "process_external_evaluator_probe": ("post", ("/api/v1/governance/evaluator-benchmark", "/governance/evaluator-benchmark")),
        "sign_media_asset_endpoint": ("post", ("/api/v1/provenance/sign-asset",)),
        "execute_super_intelligence_asset_synthesis": ("post", ("/api/v1/studio/synthesize-asset", "/studio/synthesize-asset")),
        "log_student_lab_progression": ("post", ("/api/v1/analytics/log-progression", "/analytics/log-progression")),
        "run_low_level_indexing_audit": ("get", ("/api/v1/diagnostics/database-indexes", "/diagnostics/database-indexes")),
        "evaluate_dual_use_input": ("post", ("/api/v1/security/dual-use-filter", "/security/dual-use-filter")),
        "generate_and_publish_system_card": ("post", ("/api/v1/governance/generate-system-card", "/governance/generate-system-card")),
        "list_published_system_cards": ("get", ("/api/v1/governance/system-cards", "/governance/system-cards")),
        "execute_realtime_shield_audit": ("post", ("/api/v1/security/shield-audit", "/security/shield-audit")),
        "run_live_security_diagnostics": ("get", ("/api/v1/security/diagnostics", "/security/diagnostics")),
    }

    def test_exact_real_source_aliases_have_both_refusal_boundaries(self):
        tree = ast.parse((ROOT / "main.py").read_text(encoding="utf-8"))
        all_handlers = [node for node in tree.body if isinstance(node, ast.AsyncFunctionDef)]
        actual_path_owners = {}
        for node in all_handlers:
            for decorator in node.decorator_list:
                if not isinstance(decorator, ast.Call):
                    continue
                func = decorator.func
                if not (isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name)
                        and func.value.id == "app" and func.attr in ("get", "post", "put", "patch", "delete")
                        and decorator.args and isinstance(decorator.args[0], ast.Constant)
                        and isinstance(decorator.args[0].value, str)):
                    continue
                actual_path_owners.setdefault(decorator.args[0].value, []).append((func.attr, node.name, decorator))
        total = 0
        for name, (verb, paths) in self.ROUTES.items():
            with self.subTest(handler=name):
                nodes = [node for node in all_handlers if node.name == name]
                self.assertEqual(len(nodes), 1, "Expected one exact handler")
                node = nodes[0]
                for path in paths:
                    owners = actual_path_owners.get(path, [])
                    self.assertEqual(len(owners), 1, "Sensitive URL collision or missing handler: " + path)
                    method, owner, decorator = owners[0]
                    self.assertEqual((method, owner), (verb, name))
                    deps = [kw.value for kw in decorator.keywords if kw.arg == "dependencies"]
                    self.assertEqual(len(deps), 1, "Route dependency missing for " + path)
                    self.assertIsInstance(deps[0], ast.List)
                    self.assertEqual(len(deps[0].elts), 1)
                    depends_call = deps[0].elts[0]
                    self.assertIsInstance(depends_call, ast.Call)
                    self.assertIsInstance(depends_call.func, ast.Name)
                    self.assertEqual(depends_call.func.id, "Depends")
                    self.assertEqual(len(depends_call.args), 1)
                    self.assertIsInstance(depends_call.args[0], ast.Name)
                    self.assertEqual(depends_call.args[0].id, "require_legacy_route_disabled")
                    total += 1
                first = node.body[0]
                if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant) and isinstance(first.value.value, str):
                    first = node.body[1]
                self.assertIsInstance(first, ast.Expr, "Direct-call guard missing from " + name)
                self.assertIsInstance(first.value, ast.Call)
                self.assertIsInstance(first.value.func, ast.Name)
                self.assertEqual(first.value.func.id, "require_legacy_route_disabled")
                self.assertFalse(first.value.args)
        self.assertEqual(total, 23)

    def test_synthetic_registered_http_aliases_refuse_before_handler(self):
        app = FastAPI()
        async def forbidden():
            self.fail("Unmigrated handler executed instead of refusal")
        for verb, paths in self.ROUTES.values():
            for path in paths:
                app.add_api_route(path, forbidden, methods=[verb.upper()],
                                  dependencies=[Depends(require_legacy_route_disabled)])
        with TestClient(app) as client:
            for verb, paths in self.ROUTES.values():
                for path in paths:
                    with self.subTest(method=verb, path=path):
                        response = client.request(verb.upper(), path)
                        self.assertEqual(response.status_code, 503)
                        self.assertEqual(response.json()["detail"]["code"], "LEGACY_API_RETIRED")

if __name__ == "__main__":
    unittest.main()
