"""Multi Tenant — Multi-tenant architecture support."""

import json
from typing import Dict, List


class MultiTenant:
    """Multi-tenant isolation and management."""

    def __init__(self):
        self.tenants = {}

    def create_tenant(self, tenant_id: str, name: str, plan: str = "basic") -> Dict:
        tenant = {
            "id": tenant_id,
            "name": name,
            "plan": plan,
            "created": json.dumps("now"),
            "users": [],
            "settings": {},
            "limits": self._get_plan_limits(plan),
        }
        self.tenants[tenant_id] = tenant
        return tenant

    def _get_plan_limits(self, plan: str) -> Dict:
        limits = {
            "basic": {"users": 5, "api_calls": 1000, "storage_mb": 1000},
            "pro": {"users": 25, "api_calls": 10000, "storage_mb": 10000},
            "enterprise": {"users": float("inf"), "api_calls": float("inf"), "storage_mb": 100000},
        }
        return limits.get(plan, limits["basic"])

    def add_user(self, tenant_id: str, user_id: str, role: str = "member") -> Dict:
        if tenant_id not in self.tenants:
            return {"error": "Tenant not found"}
        tenant = self.tenants[tenant_id]
        if len(tenant["users"]) >= tenant["limits"]["users"]:
            return {"error": "User limit reached"}
        user = {"id": user_id, "role": role, "added": json.dumps("now")}
        tenant["users"].append(user)
        return user

    def get_tenant(self, tenant_id: str) -> Dict:
        return self.tenants.get(tenant_id, {"error": "Tenant not found"})

    def isolate_data(self, tenant_id: str) -> str:
        return f"tenant_{tenant_id}_data"

    def usage_report(self, tenant_id: str) -> Dict:
        tenant = self.tenants.get(tenant_id, {})
        return {
            "tenant": tenant_id,
            "users": len(tenant.get("users", [])),
            "plan": tenant.get("plan"),
            "limits": tenant.get("limits"),
        }


if __name__ == "__main__":
    mt = MultiTenant()
    mt.create_tenant("t1", "Acme Corp", "pro")
    mt.add_user("t1", "u1", "admin")
    print(json.dumps(mt.get_tenant("t1"), indent=2))
    print(json.dumps(mt.usage_report("t1"), indent=2))
