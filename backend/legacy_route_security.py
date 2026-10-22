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
