"""
web_core.db.health - System health checks and monitoring.

Provides database, disk space, memory, and table validation checks
with a unified health monitor for FastAPI integration.
"""

from __future__ import annotations

import logging
import os
import platform
import sqlite3
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger("luqi.db.health")


# -- Status -------------------------------------------------------------------

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


# -- Base check ---------------------------------------------------------------

@dataclass
class HealthCheck:
    """Abstract base for a named health check."""

    name: str
    description: str
    critical: bool = True
    latency_ms: float = 0.0
    last_checked: str = ""
    message: str = ""

    check_fn: Optional[Callable[[], HealthStatus]] = field(default=None, repr=False)

    def check(self) -> HealthStatus:
        """Run the check and record timing.  Subclasses may override."""
        start = time.monotonic()
        try:
            if self.check_fn is not None:
                result = self.check_fn()
            else:
                result = self._do_check()
        except Exception as exc:
            self.message = f"Exception: {exc}"
            result = HealthStatus.UNHEALTHY
        self.latency_ms = round((time.monotonic() - start) * 1000, 2)
        self.last_checked = datetime.utcnow().isoformat()
        return result

    def _do_check(self) -> HealthStatus:
        """Override in subclasses."""
        return HealthStatus.HEALTHY


# -- Concrete checks ----------------------------------------------------------

class DatabaseHealthCheck(HealthCheck):
    """Verify SQLite responds to a simple query."""

    def __init__(self, pool: Any):
        super().__init__(
            name="database",
            description="SQLite connectivity",
            critical=True,
        )
        self.pool = pool

    def _do_check(self) -> HealthStatus:
        try:
            row = self.pool.fetchone("SELECT 1 AS ok")
            if row and row["ok"] == 1:
                self.message = "Database responsive"
                return HealthStatus.HEALTHY
            self.message = "Unexpected result from SELECT 1"
            return HealthStatus.UNHEALTHY
        except Exception as exc:
            self.message = f"Database error: {exc}"
            return HealthStatus.UNHEALTHY


class DiskSpaceHealthCheck(HealthCheck):
    """Verify the data directory has sufficient free space."""

    def __init__(self, path: Path, min_free_mb: float = 100.0):
        super().__init__(
            name="disk_space",
            description=f"Free disk space > {min_free_mb} MB",
            critical=True,
        )
        self.path = path
        self.min_free_mb = min_free_mb

    def _do_check(self) -> HealthStatus:
        try:
            stat = os.statvfs(self.path)
            free_mb = (stat.f_bavail * stat.f_frsize) / (1024 * 1024)
            if free_mb >= self.min_free_mb:
                self.message = f"{free_mb:.1f} MB free"
                return HealthStatus.HEALTHY
            self.message = f"Only {free_mb:.1f} MB free (threshold: {self.min_free_mb} MB)"
            return HealthStatus.UNHEALTHY
        except Exception as exc:
            self.message = f"Disk check error: {exc}"
            return HealthStatus.UNHEALTHY


class MemoryHealthCheck(HealthCheck):
    """Check available system memory (Linux only; skips on other platforms)."""

    def __init__(self, min_available_mb: float = 50.0):
        super().__init__(
            name="memory",
            description=f"Available memory > {min_available_mb} MB",
            critical=False,  # non-critical: system may use swap
        )
        self.min_available_mb = min_available_mb

    def _do_check(self) -> HealthStatus:
        if platform.system() != "Linux":
            self.message = "Memory check skipped (non-Linux)"
            return HealthStatus.HEALTHY

        try:
            with open("/proc/meminfo") as fh:
                for line in fh:
                    if line.startswith("MemAvailable:"):
                        kb = int(line.split()[1])
                        available_mb = kb / 1024.0
                        if available_mb >= self.min_available_mb:
                            self.message = f"{available_mb:.1f} MB available"
                            return HealthStatus.HEALTHY
                        self.message = (
                            f"Only {available_mb:.1f} MB available"
                        )
                        return HealthStatus.DEGRADED
            self.message = "Could not parse /proc/meminfo"
            return HealthStatus.DEGRADED
        except Exception as exc:
            self.message = f"Memory check error: {exc}"
            return HealthStatus.DEGRADED


class TableHealthCheck(HealthCheck):
    """Verify all expected database tables exist."""

    EXPECTED_TABLES = [
        "conversations",
        "uploads",
        "sandbox_runs",
        "capabilities",
        "api_keys",
        "rate_limits",
        "request_logs",
        "webhooks",
        "youtube_campaigns",
        "wealth_funnels",
    ]

    def __init__(self, pool: Any):
        super().__init__(
            name="tables",
            description="All expected tables exist",
            critical=True,
        )
        self.pool = pool

    def _do_check(self) -> HealthStatus:
        try:
            rows = self.pool.fetchall(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
            existing = {r["name"] for r in rows}
            missing = [t for t in self.EXPECTED_TABLES if t not in existing]
            if not missing:
                self.message = f"All {len(self.EXPECTED_TABLES)} tables present"
                return HealthStatus.HEALTHY
            self.message = f"Missing tables: {', '.join(missing)}"
            return HealthStatus.UNHEALTHY
        except Exception as exc:
            self.message = f"Table check error: {exc}"
            return HealthStatus.UNHEALTHY


# -- Monitor ------------------------------------------------------------------

@dataclass
class HealthMonitor:
    """Aggregates multiple health checks into an overall status."""

    checks: List[HealthCheck] = field(default_factory=list)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def register(self, check: HealthCheck) -> None:
        """Add a health check to the monitor."""
        with self._lock:
            self.checks.append(check)

    def run_all(self) -> Dict[str, Any]:
        """Execute all checks and return aggregated results.

        Overall rules:
        * UNHEALTHY — any critical check failed
        * DEGRADED  — any non-critical check failed, no critical failures
        * HEALTHY   — all checks passed
        """
        with self._lock:
            results: Dict[str, Any] = {}
            overall = HealthStatus.HEALTHY

            for check in self.checks:
                status = check.check()
                results[check.name] = {
                    "status": status.value,
                    "critical": check.critical,
                    "latency_ms": check.latency_ms,
                    "message": check.message,
                }
                if status is HealthStatus.UNHEALTHY and check.critical:
                    overall = HealthStatus.UNHEALTHY
                elif status in (HealthStatus.DEGRADED, HealthStatus.UNHEALTHY) and overall is HealthStatus.HEALTHY:
                    overall = HealthStatus.DEGRADED

            return {
                "overall_status": overall.value,
                "checks": results,
                "timestamp": datetime.utcnow().isoformat(),
            }

    def get_report(self) -> Dict[str, Any]:
        """Run all checks and return a detailed report with recommendations."""
        result = self.run_all()
        recommendations: List[str] = []
        for name, info in result["checks"].items():
            if info["status"] != "healthy":
                if info["critical"]:
                    recommendations.append(f"CRITICAL: Fix {name} — {info['message']}")
                else:
                    recommendations.append(f"WARNING: Check {name} — {info['message']}")
        if not recommendations:
            recommendations.append("All systems healthy")
        result["recommendations"] = recommendations
        return result


# -- FastAPI adapter ----------------------------------------------------------

async def health_endpoint(monitor: HealthMonitor) -> Dict[str, Any]:
    """Async health endpoint compatible with FastAPI.

    Returns a dict that the route handler should wrap in JSONResponse
    with the appropriate status code.

    Status code mapping:
    * HEALTHY   → 200
    * DEGRADED  → 200 (with X-Health-Warning header)
    * UNHEALTHY → 503
    """
    import asyncio
    # run_all is sync; offload to thread pool
    loop = asyncio.get_event_loop()
    report = await loop.run_in_executor(None, monitor.get_report)
    return report
