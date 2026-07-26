"""
Multi-Tenant Isolation Module for LUQI AI.

Manages tenant boundaries, quotas, and metadata for a multi-tenant SaaS
deployment. Each tenant is isolated by ID and carries its own usage counters.

Usage:
    mod = __import__("omega_ai.multi_tenant")
    engine = mod.TenantManager()
    info = engine.create_tenant("Acme Corp", tier="premium")
    quota = engine.check_quota(info["data"]["tenant_id"])
"""

from __future__ import annotations

import uuid
from typing import Any


# Pre-seeded example tenants
_DEFAULT_TENANTS: list[dict[str, Any]] = [
    {
        "id": "tnt-alfa-001",
        "name": "Alpha Enterprises",
        "tier": "premium",
        "users": 12,
        "requests_used": 8450,
        "requests_limit": 100000,
        "created_at": "2024-01-15T09:00:00+00:00",
    },
    {
        "id": "tnt-beta-002",
        "name": "Beta Solutions",
        "tier": "basic",
        "users": 3,
        "requests_used": 1240,
        "requests_limit": 10000,
        "created_at": "2024-03-22T14:30:00+00:00",
    },
    {
        "id": "tnt-gamma-003",
        "name": "Gamma Industries",
        "tier": "enterprise",
        "users": 45,
        "requests_used": 320000,
        "requests_limit": 500000,
        "created_at": "2023-11-05T08:15:00+00:00",
    },
]

_TIER_DEFAULTS: dict[str, int] = {
    "basic": 10000,
    "premium": 100000,
    "enterprise": 500000,
}


class TenantManager:
    """Multi-tenant isolation manager for LUQI AI."""

    def __init__(self) -> None:
        """Initialize the tenant manager with pre-seeded example tenants."""
        self.tenants: dict[str, dict[str, Any]] = {}
        for t in _DEFAULT_TENANTS:
            self.tenants[t["id"]] = dict(t)

    # ── helpers ───────────────────────────────────────────────────────────

    def _new_id(self) -> str:
        """Generate a unique tenant ID."""
        return f"tnt-{uuid.uuid4().hex[:8]}"

    # ── public API ────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        """Get tenant statistics.

        Returns:
            Dictionary with tenant_count and a list of tenant summaries.
        """
        summaries = [
            {
                "id": t["id"],
                "name": t["name"],
                "tier": t["tier"],
                "users": t["users"],
                "quota": f"{t['requests_used']:,} / {t['requests_limit']:,}",
            }
            for t in self.tenants.values()
        ]
        return {
            "result": "success",
            "status": "ok",
            "data": {
                "tenant_count": len(self.tenants),
                "tenants": summaries,
            },
        }

    def create_tenant(self, name: str, tier: str = "basic") -> dict:
        """Create a new tenant.

        Args:
            name: Human-readable tenant name.
            tier: Subscription tier (basic, premium, enterprise).

        Returns:
            Dictionary with the new tenant_id and metadata.
        """
        from datetime import datetime, timezone

        tenant_id = self._new_id()
        limit = _TIER_DEFAULTS.get(tier, _TIER_DEFAULTS["basic"])
        record: dict[str, Any] = {
            "id": tenant_id,
            "name": name,
            "tier": tier,
            "users": 0,
            "requests_used": 0,
            "requests_limit": limit,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.tenants[tenant_id] = record
        return {
            "result": "success",
            "status": "ok",
            "data": {
                "tenant_id": tenant_id,
                "name": name,
                "tier": tier,
                "requests_limit": limit,
                "created_at": record["created_at"],
            },
        }

    def get_tenant(self, tenant_id: str) -> dict:
        """Get tenant details.

        Args:
            tenant_id: The unique tenant identifier.

        Returns:
            Dictionary with full tenant record or an error payload.
        """
        tenant = self.tenants.get(tenant_id)
        if tenant is None:
            return {
                "result": "error",
                "status": "not_found",
                "data": {"message": f"Tenant {tenant_id!r} not found."},
            }
        return {
            "result": "success",
            "status": "ok",
            "data": dict(tenant),
        }

    def check_quota(self, tenant_id: str) -> dict:
        """Check if tenant is within quota.

        Args:
            tenant_id: The unique tenant identifier.

        Returns:
            Dictionary with within_quota flag, requests_used, and requests_limit.
        """
        tenant = self.tenants.get(tenant_id)
        if tenant is None:
            return {
                "result": "error",
                "status": "not_found",
                "data": {"message": f"Tenant {tenant_id!r} not found."},
            }
        used = tenant["requests_used"]
        limit = tenant["requests_limit"]
        return {
            "result": "success",
            "status": "ok",
            "data": {
                "within_quota": used < limit,
                "requests_used": used,
                "requests_limit": limit,
                "utilisation_pct": round((used / limit) * 100, 2) if limit else 0.0,
            },
        }

    def increment_usage(self, tenant_id: str, count: int = 1) -> dict:
        """Increment the request counter for a tenant.

        Args:
            tenant_id: The unique tenant identifier.
            count: Number of requests to add (default 1).

        Returns:
            Dictionary with updated usage and quota status.
        """
        tenant = self.tenants.get(tenant_id)
        if tenant is None:
            return {
                "result": "error",
                "status": "not_found",
                "data": {"message": f"Tenant {tenant_id!r} not found."},
            }
        tenant["requests_used"] += count
        return self.check_quota(tenant_id)
