"""Retired async compatibility router; never import workers or payment clients.

These legacy jobs/billing/approval/sensing/chat routes trusted caller identities,
used unmetered providers or fabricated outcomes. Account-owned Omega and private
notes use separately reviewed routes. Preserve stored data and fail closed here.
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Unavailable legacy integrations"])
_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]


def _unavailable(code):
    async def handler(request: Request):
        return JSONResponse(
            status_code=503,
            headers={"Cache-Control": "no-store"},
            content={
                "status": "unavailable", "code": code,
                "message": "This legacy integration requires reviewed authorization and verified integrations.",
            },
        )
    return handler


for _namespace, _code in {
    "billing": "LEGACY_PAYMENTS_DISABLED",
    "jobs": "LEGACY_JOBS_UNAVAILABLE",
    "zta": "LEGACY_APPROVALS_UNAVAILABLE",
    "self-healing": "SELF_HEALING_PIPELINE_NOT_CONFIGURED",
    "sensing": "LEGACY_SENSING_UNAVAILABLE",
    "chat": "AI_LEGACY_ROUTE_DISABLED",
}.items():
    for _path in (f"/{_namespace}", f"/{_namespace}/{{legacy_path:path}}"):
        router.add_api_route(_path, _unavailable(_code), methods=_METHODS, include_in_schema=False)
