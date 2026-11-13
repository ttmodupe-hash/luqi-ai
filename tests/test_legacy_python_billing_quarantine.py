"""P0 security tests: legacy Python billing can neither authorize nor mint money."""
import ast
import asyncio
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi import APIRouter, Depends, FastAPI, WebSocket, UploadFile, File
from starlette.routing import Host
from starlette.websockets import WebSocketDisconnect
from fastapi.testclient import TestClient
from fastapi.middleware.cors import CORSMiddleware
from backend.legacy_route_security import require_legacy_route_disabled, reject_legacy_websocket, LegacyPrebodyRefusalMiddleware

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


class LegacyPrebodyRefusalTests(unittest.TestCase):
    """Synthetic FastAPI/Starlette regression: retired routes never parse bodies."""

    class ReceiveProbe:
        def __init__(self, app):
            self.app = app
            self.read_count = 0

        async def __call__(self, scope, receive, send):
            async def observed_receive():
                self.read_count += 1
                return await receive()
            await self.app(scope, observed_receive, send)

    def setUp(self):
        self.executed = []
        app = FastAPI()

        @app.get("/health")
        async def health():
            return {"status": "ok"}

        @app.post("/workspace/upload-asset",
                  dependencies=[Depends(require_legacy_route_disabled)])
        async def upload(file: UploadFile = File(...)):
            self.executed.append("upload")
            return {"unsafe": True}

        @app.post("/api/v1/simulation/verify-terminal",
                  dependencies=[Depends(require_legacy_route_disabled)])
        async def verify(payload: dict):
            self.executed.append("verify")
            return {"unsafe": True}

        router = APIRouter(dependencies=[Depends(require_legacy_route_disabled)])

        @router.post("/billing/topup")
        async def topup():
            self.executed.append("topup")
            return {"unsafe": True}

        app.include_router(router, prefix="/api/v1")
        app.include_router(router, prefix="/v1")
        app.add_middleware(LegacyPrebodyRefusalMiddleware, route_owner=app)
        app.add_middleware(CORSMiddleware, allow_origins=["https://example.invalid"],
                           allow_methods=["*"])
        self.probe = self.ReceiveProbe(app)
        self.client = TestClient(self.probe)

    def tearDown(self):
        self.client.close()

    def test_multipart_refused_without_reading_one_megabyte_body(self):
        result = self.client.post(
            "/workspace/upload-asset",
            files={"file": ("synthetic.bin", b"x" * (1024 * 1024),
                            "application/octet-stream")},
            headers={"Origin": "https://example.invalid"},
        )
        self.assertEqual(result.status_code, 503)
        self.assertEqual(result.json()["detail"]["code"], "LEGACY_API_RETIRED")
        self.assertEqual(result.headers["cache-control"], "no-store")
        self.assertEqual(result.headers["access-control-allow-origin"],
                         "https://example.invalid")
        self.assertEqual(self.probe.read_count, 0)
        self.assertEqual(self.executed, [])

    def test_malformed_json_and_forged_auth_refused_before_parsing(self):
        result = self.client.post(
            "/api/v1/simulation/verify-terminal", content=b"{bad",
            headers={"Content-Type": "application/json",
                     "Authorization": "Bearer synthetic-forgery"},
        )
        self.assertEqual(result.status_code, 503)
        self.assertEqual(self.probe.read_count, 0)
        self.assertEqual(self.executed, [])

    def test_router_level_dependency_is_inherited_under_both_prefixes(self):
        for path in ("/api/v1/billing/topup", "/v1/billing/topup"):
            with self.subTest(path=path):
                result = self.client.post(
                    path, content=b"{bad", headers={"Content-Type": "application/json"}
                )
                self.assertEqual(result.status_code, 503)
                self.assertEqual(self.probe.read_count, 0)
        self.assertEqual(self.executed, [])

    def test_health_cors_preflight_and_wrong_method_remain_unchanged(self):
        health = self.client.get("/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json(), {"status": "ok"})
        preflight = self.client.options(
            "/workspace/upload-asset",
            headers={"Origin": "https://example.invalid",
                     "Access-Control-Request-Method": "POST"},
        )
        self.assertEqual(preflight.status_code, 200)
        self.assertEqual(self.client.get("/workspace/upload-asset").status_code, 405)
        self.assertEqual(self.executed, [])

    def test_encoded_route_has_same_refusal(self):
        self.assertEqual(
            self.client.post("/workspace/%75pload-asset").status_code, 503
        )
        self.assertEqual(self.executed, [])

    def test_first_full_match_precedence_is_not_rewritten(self):
        def duplicate_app(guard_first):
            app = FastAPI()
            async def public():
                return {"public": True}
            async def retired():
                self.fail("Retired handler executed")
            if guard_first:
                app.add_api_route("/collision", retired, methods=["POST"],
                                  dependencies=[Depends(require_legacy_route_disabled)])
                app.add_api_route("/collision", public, methods=["POST"])
            else:
                app.add_api_route("/collision", public, methods=["POST"])
                app.add_api_route("/collision", retired, methods=["POST"],
                                  dependencies=[Depends(require_legacy_route_disabled)])
            app.add_middleware(LegacyPrebodyRefusalMiddleware, route_owner=app)
            return TestClient(app)
        self.assertEqual(duplicate_app(True).post("/collision").status_code, 503)
        self.assertEqual(duplicate_app(False).post("/collision").json(),
                         {"public": True})

    def test_parameterized_path_and_websocket_are_supported(self):
        app = FastAPI()

        @app.post("/retired/{task_id}",
                  dependencies=[Depends(require_legacy_route_disabled)])
        async def retired(task_id: str, payload: dict):
            self.fail("Retired handler executed")

        @app.websocket("/ws/test")
        async def socket(ws: WebSocket):
            await ws.accept()
            await ws.close(code=1000)

        app.add_middleware(LegacyPrebodyRefusalMiddleware, route_owner=app)
        with TestClient(app) as client:
            result = client.post(
                "/retired/abc", content=b"{bad",
                headers={"Content-Type": "application/json"},
            )
            self.assertEqual(result.status_code, 503)
            with client.websocket_connect("/ws/test") as ws:
                self.assertEqual(ws.receive()["type"], "websocket.close")

    def test_actual_main_installs_early_gate_inside_cors(self):
        content = (ROOT / "main.py").read_text(encoding="utf-8")
        self.assertIn(
            "app.add_middleware(LegacyPrebodyRefusalMiddleware, route_owner=app)",
            content,
        )
        self.assertLess(
            content.index("app.add_middleware(LegacyPrebodyRefusalMiddleware"),
            content.index("app.add_middleware(\n    CORSMiddleware"),
        )


class TestDynamicLegacyPrebodyRouteChanges(unittest.TestCase):
    """Fail closed when plugins register/replace routes after stack construction."""

    def test_late_registered_route_refuses_before_json_parsing(self):
        app = FastAPI()

        @app.get("/health-dynamic")
        async def health():
            return {"ok": True}

        app.add_middleware(LegacyPrebodyRefusalMiddleware, route_owner=app)
        self.assertEqual(TestClient(app).get("/health-dynamic").status_code, 200)

        @app.post("/retired-dynamic", dependencies=[Depends(require_legacy_route_disabled)])
        async def retired(payload: dict):
            self.fail("Retired handler executed")

        reads = []
        class ReceiveSpy:
            async def __call__(self, scope, receive, send):
                async def observed_receive():
                    reads.append(True)
                    return await receive()
                await app(scope, observed_receive, send)

        response = TestClient(ReceiveSpy()).post(
            "/retired-dynamic", content=b"{bad",
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"]["code"], "LEGACY_API_RETIRED")
        self.assertEqual(reads, [], "Body was parsed before fail-closed refusal")

    def test_route_replacement_same_count_does_not_stale_guard(self):
        from fastapi.routing import APIRoute
        app = FastAPI()

        @app.post("/replace-dynamic")
        async def original(payload: dict):
            return {"public": True}

        app.add_middleware(LegacyPrebodyRefusalMiddleware, route_owner=app)
        self.assertEqual(
            TestClient(app).post("/replace-dynamic", json={"x": 1}).status_code,
            200,
        )
        index = next(i for i, route in enumerate(app.router.routes)
                     if getattr(route, "path", None) == "/replace-dynamic")

        async def retired(payload: dict):
            self.fail("Retired handler executed")

        app.router.routes[index] = APIRoute(
            "/replace-dynamic", retired, methods=["POST"],
            dependencies=[Depends(require_legacy_route_disabled)],
        )
        reads = []
        class ReceiveSpy:
            async def __call__(self, scope, receive, send):
                async def observed_receive():
                    reads.append(True)
                    return await receive()
                await app(scope, observed_receive, send)

        response = TestClient(ReceiveSpy()).post(
            "/replace-dynamic", content=b"{bad",
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(reads, [], "Replaced route skipped early refusal")


class TestNestedRetirementDependencies(unittest.TestCase):
    """A retired Depends must reject before parsing, however it was declared."""

    def _assert_prebody_denial(self, nested: bool):
        app = FastAPI()
        if nested:
            async def inner_guard(_blocked=Depends(require_legacy_route_disabled)):
                return None
            guard = inner_guard
        else:
            guard = require_legacy_route_disabled

        @app.post("/retired/dependency-upload")
        async def retired(file: UploadFile = File(...), _guard=Depends(guard)):
            self.fail("Retired handler executed")

        app.add_middleware(LegacyPrebodyRefusalMiddleware, route_owner=app)
        reads = []

        class ReceiveSpy:
            async def __call__(self, scope, receive, send):
                async def observed_receive():
                    reads.append(True)
                    return await receive()
                await app(scope, observed_receive, send)

        response = TestClient(ReceiveSpy()).post(
            "/retired/dependency-upload",
            files={"file": ("synthetic.bin", b"x" * 1048576)},
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"]["code"], "LEGACY_API_RETIRED")
        self.assertEqual(reads, [], "Retired nested dependency parsed multipart first")

    def test_endpoint_parameter_dependency_is_early_refused(self):
        self._assert_prebody_denial(nested=False)

    def test_nested_endpoint_dependency_is_early_refused(self):
        self._assert_prebody_denial(nested=True)


class MountedRetirementPrebodySafety(unittest.TestCase):
    """Mounted FastAPI apps must not bypass retired-route prebody refusal."""

    @staticmethod
    def _protected_child():
        child = FastAPI()

        @child.post("/upload")
        async def retired(
            file: UploadFile = File(...),
            _guard=Depends(require_legacy_route_disabled),
        ):
            raise AssertionError("Retired handler must not run")
        return child

    @staticmethod
    def _client(root):
        root.add_middleware(LegacyPrebodyRefusalMiddleware, route_owner=root)
        class Spy:
            reads = 0
            async def __call__(self, scope, receive, send):
                async def observed_receive():
                    self.reads += 1
                    return await receive()
                await root(scope, observed_receive, send)
        spy = Spy()
        return TestClient(spy), spy

    def test_mounted_guard_refuses_before_multipart_receive(self):
        root = FastAPI()
        root.mount("/legacy", self._protected_child())
        client, spy = self._client(root)
        response = client.post(
            "/legacy/upload", files={"file": ("x.bin", b"x" * 1048576)}
        )
        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(response.json()["detail"]["code"], "LEGACY_API_RETIRED")
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(spy.reads, 0)

    def test_nested_mount_refuses_before_multipart_receive(self):
        root, middle = FastAPI(), FastAPI()
        middle.mount("/two", self._protected_child())
        root.mount("/one", middle)
        client, spy = self._client(root)
        response = client.post(
            "/one/two/upload", files={"file": ("x.bin", b"x" * 1048576)}
        )
        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(spy.reads, 0)

    def test_unprotected_mount_still_accepts_multipart(self):
        root, child = FastAPI(), FastAPI()

        @child.post("/upload")
        async def public(file: UploadFile = File(...)):
            return {"filename": file.filename}
        root.mount("/public", child)
        client, spy = self._client(root)
        response = client.post(
            "/public/upload", files={"file": ("fixture.txt", b"ok")}
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["filename"], "fixture.txt")
        self.assertGreater(spy.reads, 0)

    def test_first_full_match_keeps_public_duplicate_precedence(self):
        root, public = FastAPI(), FastAPI()

        @public.post("/upload")
        async def public_upload():
            return {"ok": True}
        root.mount("/legacy", public)
        root.mount("/legacy", self._protected_child())
        client, spy = self._client(root)
        response = client.post("/legacy/upload")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"ok": True})
        self.assertEqual(spy.reads, 0)


    def test_host_routed_retired_upload_refused_before_body(self):
        root = FastAPI()
        root.router.routes.insert(0, Host("api.example.test", app=self._protected_child()))
        client, spy = self._client(root)
        response = client.post(
            "/upload", files={"file": ("x.bin", b"x" * 1048576)},
            headers={"host": "api.example.test"},
        )
        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(response.json()["detail"]["code"], "LEGACY_API_RETIRED")
        self.assertEqual(spy.reads, 0, "Host-routed retired upload parsed request body")

    def test_mounted_host_routed_retired_upload_refused_before_body(self):
        intermediate, root = FastAPI(), FastAPI()
        intermediate.router.routes.insert(
            0, Host("api.example.test", app=self._protected_child())
        )
        root.mount("/legacy", intermediate)
        client, spy = self._client(root)
        response = client.post(
            "/legacy/upload", files={"file": ("x.bin", b"x" * 65536)},
            headers={"host": "api.example.test"},
        )
        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(spy.reads, 0)

    def test_public_host_routed_upload_still_works(self):
        root, child = FastAPI(), FastAPI()

        @child.post("/upload")
        async def public(file: UploadFile = File(...)):
            return {"filename": file.filename}

        root.router.routes.insert(0, Host("public.example.test", app=child))
        client, spy = self._client(root)
        response = client.post(
            "/upload", files={"file": ("fixture.txt", b"ok")},
            headers={"host": "public.example.test"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["filename"], "fixture.txt")
        self.assertGreater(spy.reads, 0)

    def test_first_matching_public_host_preserves_precedence(self):
        root, public = FastAPI(), FastAPI()

        @public.post("/upload")
        async def public_upload():
            return {"ok": True}

        root.router.routes.insert(0, Host("api.example.test", app=self._protected_child()))
        root.router.routes.insert(0, Host("api.example.test", app=public))
        client, spy = self._client(root)
        response = client.post("/upload", headers={"host": "api.example.test"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"ok": True})
        self.assertEqual(spy.reads, 0)


    def test_cors_wrapped_mount_retired_upload_refused_prebody(self):
        root = FastAPI()
        root.mount("/legacy", CORSMiddleware(
            self._protected_child(), allow_origins=["https://allowed.example.test"]
        ))
        client, spy = self._client(root)
        response = client.post(
            "/legacy/upload", files={"file": ("x.bin", b"x" * 1048576)}
        )
        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(response.json()["detail"]["code"], "LEGACY_API_RETIRED")
        self.assertEqual(spy.reads, 0, "CORS-wrapped retired endpoint consumed request body")

    def test_nested_middleware_wrappers_refuse_before_body(self):
        from starlette.middleware.gzip import GZipMiddleware
        root = FastAPI()
        wrapped = GZipMiddleware(CORSMiddleware(
            self._protected_child(), allow_origins=["https://allowed.example.test"]
        ))
        root.mount("/legacy", wrapped)
        client, spy = self._client(root)
        response = client.post(
            "/legacy/upload", files={"file": ("x.bin", b"x" * 65536)}
        )
        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(spy.reads, 0, "Nested ASGI wrappers bypassed prebody refusal")

    def test_wrapped_public_upload_preserves_functionality(self):
        from starlette.middleware.gzip import GZipMiddleware
        root, child = FastAPI(), FastAPI()

        @child.post("/upload")
        async def public(file: UploadFile = File(...)):
            return {"filename": file.filename}

        root.mount("/public", GZipMiddleware(CORSMiddleware(
            child, allow_origins=["https://allowed.example.test"]
        )))
        client, spy = self._client(root)
        response = client.post(
            "/public/upload", files={"file": ("fixture.txt", b"ok")}
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["filename"], "fixture.txt")
        self.assertGreater(spy.reads, 0)



class LegacyPythonHealthTruthfulnessTests(unittest.TestCase):
    """Execute extracted health functions only: no startup, network or database."""

    @staticmethod
    def _isolated_health():
        from types import SimpleNamespace
        from fastapi import status as http_status
        from fastapi.responses import JSONResponse

        tree = ast.parse((ROOT / "main.py").read_text())
        names = {"_legacy_python_ready", "health", "ready"}
        selected = []
        for node in tree.body:
            if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)) and node.name in names:
                node.decorator_list = []
                selected.append(node)
        if {node.name for node in selected} != names:
            raise AssertionError("Expected all three health handlers in main.py")
        context = {
            "JSONResponse": JSONResponse, "status": http_status,
            "settings": SimpleNamespace(version="synthetic-test"),
        }
        exec(compile(ast.fix_missing_locations(
            ast.Module(body=selected, type_ignores=[])
        ), "<isolated-legacy-health>", "exec"), context)
        return context

    def test_no_fake_200_before_db_check_or_after_failed_migration(self):
        import json
        context = self._isolated_health()
        scenarios = (
            ("initializing", {}, False),
            ("healthy", {}, False),
            ("healthy", {"database": "error: synthetic-sensitive-database-path"}, False),
            ("degraded", {"database": "ok"}, False),
            ("shutting_down", {"database": "ok"}, False),
            ("healthy", {"database": "ok"}, True),
        )
        for lifecycle, checks, expected_ready in scenarios:
            with self.subTest(lifecycle=lifecycle, checks=checks):
                context["_health_status"] = {"status": lifecycle, "checks": checks}
                health_response = asyncio.run(context["health"]())
                ready_response = asyncio.run(context["ready"]())
                expected_status = 200 if expected_ready else 503
                self.assertEqual(health_response.status_code, expected_status)
                self.assertEqual(ready_response.status_code, expected_status)
                health_body = json.loads(health_response.body)
                ready_body = json.loads(ready_response.body)
                self.assertEqual(health_body["status"], "healthy" if expected_ready else "degraded")
                self.assertEqual(health_body["check_scope"], "startup_database_only")
                self.assertEqual(ready_body["ready"], expected_ready)
                self.assertEqual(ready_body["status"], health_body["status"])
                self.assertEqual(health_response.headers["cache-control"], "no-store")
                self.assertEqual(ready_response.headers["cache-control"], "no-store")
                for forbidden in ("khoro_active", "billing_sync_day", "checks", "environment"):
                    self.assertNotIn(forbidden, health_body)
                self.assertNotIn("synthetic-sensitive-database-path", health_response.body.decode())
                self.assertNotIn("synthetic-sensitive-database-path", ready_response.body.decode())

    def test_startup_does_not_mark_failed_database_migration_healthy(self):
        source = (ROOT / "main.py").read_text()
        self.assertIn(
            '"healthy" if _health_status["checks"].get("database") == "ok" else "degraded"',
            source,
        )



if __name__ == "__main__":
    unittest.main()


class DirectStarletteRouterMountPrebodyTests(unittest.TestCase):
    """Guard direct Starlette Router mounts before untrusted input is parsed."""

    def test_mounted_router_refuses_malformed_json_and_upload_prebody(self):
        from fastapi.routing import APIRoute
        from starlette.routing import Router

        executed = []

        async def retired(payload: dict):
            executed.append(True)
            return {"unsafe": True}

        async def public():
            return {"public": True}

        nested = Router(routes=[
            APIRoute("/retired", retired, methods=["POST"],
                     dependencies=[Depends(require_legacy_route_disabled)]),
            APIRoute("/public", public, methods=["GET"]),
        ])
        app = FastAPI()
        app.mount("/v1", nested)
        app.add_middleware(LegacyPrebodyRefusalMiddleware, route_owner=app)

        class ReceiveProbe:
            def __init__(self, downstream):
                self.app = downstream
                self.http_body_reads = 0

            async def __call__(self, scope, receive, send):
                async def observed_receive():
                    # TestClient lifespan receives are not HTTP body reads.
                    if scope.get("type") == "http":
                        self.http_body_reads += 1
                    return await receive()
                await self.app(scope, observed_receive, send)

        probe = ReceiveProbe(app)
        with TestClient(probe) as client:
            malformed = client.post(
                "/v1/retired", content=b"{bad",
                headers={"Content-Type": "application/json"},
            )
            self.assertEqual(malformed.status_code, 503)
            self.assertEqual(malformed.json()["detail"]["code"], "LEGACY_API_RETIRED")
            self.assertEqual(malformed.headers["cache-control"], "no-store")
            self.assertEqual(probe.http_body_reads, 0)

            upload = client.post(
                "/v1/retired",
                files={"file": ("synthetic.bin", b"x" * (1024 * 1024),
                                "application/octet-stream")},
            )
            self.assertEqual(upload.status_code, 503)
            self.assertEqual(probe.http_body_reads, 0)
            self.assertEqual(executed, [])

            allowed = client.get("/v1/public")
            self.assertEqual(allowed.status_code, 200)
            self.assertEqual(allowed.json(), {"public": True})
