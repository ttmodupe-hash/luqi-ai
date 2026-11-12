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
from starlette.routing import Match


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


class LegacyPrebodyRefusalMiddleware:
    """Refuse registered retired HTTP endpoints before JSON or multipart parsing.

    Starlette/FastAPI ordinarily parse request bodies before Depends() runs.
    Use the same first-full-match route precedence as the router and protect
    only endpoints already marked with the unconditional retirement dependency.
    Health, other Luqi endpoints, WebSockets and OPTIONS remain delegated.
    """

    def __init__(self, app, route_owner):
        self.app = app
        # Main mounts its routers before the middleware stack is first built.
        # Retain route order: a later duplicate must not shadow an earlier one.
        self.routes = tuple(
            (route, isinstance(route, APIRoute) and any(
                dependency.dependency is require_legacy_route_disabled
                for dependency in route.dependencies
            ))
            for route in route_owner.router.routes
        )

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            for route, retired in self.routes:
                match, _ = route.matches(scope)
                if match is Match.FULL:
                    if retired:
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
                        # Never call receive(): no file upload, JSON parsing,
                        # authentication spoof, or billable handler can proceed.
                        await response(scope, receive, send)
                        return
                    break
        await self.app(scope, receive, send)
