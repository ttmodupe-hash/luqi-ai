"""Retired legacy FastAPI endpoints: fail closed until migrated to reviewed auth.

The old Python router accepts caller-supplied wallet/email identities, mutable
billing/webhook payloads, code-execution requests and unbudgeted paid AI tasks.
There is no shared verified user/session or provider signature context. Rather
than invent an alternate auth scheme, deny these routes before their handlers
can execute. Do not add an environment-variable bypass.

The reviewed Node/MySQL owner-scoped endpoints are a separate system; do not
assume they share user IDs or wallet balances with the legacy SQLite ledger.
"""
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from starlette.routing import Host, Match, Mount


def require_legacy_route_disabled() -> None:
    """Dependency applied to every route in the unsafe legacy Python router."""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "code": "LEGACY_API_RETIRED",
            "message": (
                "This legacy API is unavailable pending verified account "
                "ownership, provider-signed webhooks and durable billing."
            ),
        },
    )


async def reject_legacy_websocket(websocket) -> None:
    """Refuse unauthenticated legacy RTC identity before accepting a socket.

    WebSocket handshake cannot use the old HTTP-only FastAPI dependency.
    The URL user_id and headers alone are NOT verified authenticated identity.
    """
    await websocket.close(code=1008, reason="LEGACY_API_RETIRED")


def _has_retirement_dependency(root):
    """Walk FastAPI's compiled dependency tree, including parameter/nested guards.

    Decorator-level route.dependencies is not exhaustive: Depends can also be
    declared in the endpoint signature or nested inside another dependency.
    This read-only walk has no request access and invokes no dependencies.
    """
    stack = [root]
    visited = set()
    while stack:
        node = stack.pop()
        if id(node) in visited:
            continue
        visited.add(id(node))
        if node.call is require_legacy_route_disabled:
            return True
        stack.extend(node.dependencies)
    return False


def _matches_retired_http_route(scope, routes):
    """Mirror first-full-match routing across FastAPI mounts, without body reads.

    A mounted FastAPI app owns its own APIRoutes. Looking only at the outer
    router misses their prebody retirement guards. Do not inspect arbitrary
    ASGI applications that do not expose Starlette routing metadata.
    """
    for route in tuple(routes):
        match, child_scope = route.matches(scope)
        if match is not Match.FULL:
            continue
        if isinstance(route, APIRoute):
            return _has_retirement_dependency(route.dependant)
        if isinstance(route, (Mount, Host)):
            nested_router = getattr(route.app, "router", None)
            nested_routes = getattr(nested_router, "routes", None)
            if nested_routes is not None:
                return _matches_retired_http_route(
                    {**scope, **child_scope}, nested_routes
                )
        return False
    return False


class LegacyPrebodyRefusalMiddleware:
    """Refuse registered retired HTTP endpoints before JSON or multipart parsing.

    Starlette/FastAPI ordinarily parse request bodies before Depends() runs.
    Use the same first-full-match route precedence as the router and protect
    only endpoints already marked with the unconditional retirement dependency.
    Health, other Luqi endpoints, WebSockets and OPTIONS remain delegated.
    """

    def __init__(self, app, route_owner):
        self.app = app
        # Resolve routes at request time: FastAPI can add/replace a route after
        # the middleware stack has been constructed. Caching the route list
        # would let late-registered retired endpoints parse bodies before denial.
        self.route_owner = route_owner

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            # Respect the first full match, including mounted FastAPI routers.
            if _matches_retired_http_route(scope, self.route_owner.router.routes):
                response = JSONResponse(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    headers={"Cache-Control": "no-store"},
                    content={"detail": {
                        "code": "LEGACY_API_RETIRED",
                        "message": (
                            "This legacy API is unavailable pending verified account "
                            "ownership, provider-signed webhooks and durable billing."
                        ),
                    }},
                )
                # Never call receive(): no file upload or request body parsed.
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)
