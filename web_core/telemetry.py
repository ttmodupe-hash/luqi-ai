"""
Error Monitoring & Telemetry System for Luqi AI v25.2.0.

Production-ready, thread-safe telemetry module with in-memory metrics,
SQLite persistence, configurable health checks, request logging with
auto-rotation, and alert management. Designed for FastAPI/ASGI apps.

Example::

    from web_core.telemetry import (
        TelemetryCollector, HealthMonitor, RequestLogger,
        AlertManager, TelemetryMiddleware, get_telemetry_router,
    )

    telemetry = TelemetryCollector()
    health = HealthMonitor()
    alerts = AlertManager()

    app.add_middleware(TelemetryMiddleware)
    app.include_router(get_telemetry_router())
"""

from __future__ import annotations

import os
import sqlite3
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Optional

try:
    from fastapi import APIRouter, Depends, HTTPException, Request, status
    from fastapi.middleware.base import BaseHTTPMiddleware
    from fastapi.responses import JSONResponse
    _FASTAPI_AVAILABLE = True
except ImportError:  # pragma: no cover
    _FASTAPI_AVAILABLE = False
    APIRouter = object  # type: ignore[misc,assignment]
    BaseHTTPMiddleware = object  # type: ignore[misc,assignment]

__version__ = "25.2.0"
__all__ = [
    "TelemetryCollector", "HealthMonitor", "RequestLogger",
    "AlertManager", "TelemetryMiddleware", "get_telemetry_router",
    "Alert", "HealthReport",
]


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class Alert:
    """Single alert instance."""
    name: str
    severity: str  # "warning" | "critical"
    message: str
    triggered_at: str
    resolved: bool = False


@dataclass
class HealthReport:
    """Composite health report."""
    overall: str  # "healthy" | "degraded" | "critical"
    checks: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


# ---------------------------------------------------------------------------
# 1. TelemetryCollector
# ---------------------------------------------------------------------------

class TelemetryCollector:
    """Thread-safe metrics collector with optional SQLite persistence."""

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._lock = threading.Lock()
        self._db_path = db_path
        self._request_count = 0
        self._error_count = 0
        self._total_duration_ms = 0.0
        self._endpoint_stats: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "requests": 0, "errors": 0, "total_duration_ms": 0.0,
                "min_duration_ms": float("inf"), "max_duration_ms": 0.0,
            }
        )
        self._status_codes: dict[int, int] = defaultdict(int)
        if self._db_path:
            self._init_db()

    def _init_db(self) -> None:
        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)  # type: ignore[arg-type]
        with sqlite3.connect(self._db_path) as conn:  # type: ignore[arg-type]
            conn.execute(
                """CREATE TABLE IF NOT EXISTS telemetry_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    endpoint TEXT NOT NULL, requests INTEGER DEFAULT 0,
                    errors INTEGER DEFAULT 0, total_ms REAL DEFAULT 0.0,
                    min_ms REAL DEFAULT 0.0, max_ms REAL DEFAULT 0.0,
                    saved_at TEXT NOT NULL)"""
            )

    def _persist_endpoint(self, endpoint: str) -> None:
        if not self._db_path:
            return
        s = self._endpoint_stats[endpoint]
        with sqlite3.connect(self._db_path) as conn:  # type: ignore[arg-type]
            conn.execute(
                "INSERT INTO telemetry_snapshots (endpoint,requests,errors,total_ms,min_ms,max_ms,saved_at) VALUES (?,?,?,?,?,?,?)",
                (endpoint, s["requests"], s["errors"], s["total_duration_ms"],
                 s["min_duration_ms"], s["max_duration_ms"], datetime.now().isoformat()),
            )

    def record_request(self, endpoint: str, duration_ms: float, status_code: int) -> None:
        """Record a request with its duration and status code."""
        with self._lock:
            self._request_count += 1
            self._total_duration_ms += duration_ms
            self._status_codes[status_code] += 1
            ep = self._endpoint_stats[endpoint]
            ep["requests"] += 1
            ep["total_duration_ms"] += duration_ms
            ep["min_duration_ms"] = min(ep["min_duration_ms"], duration_ms)
            ep["max_duration_ms"] = max(ep["max_duration_ms"], duration_ms)
            if 400 <= status_code < 600:
                ep["errors"] += 1
                self._error_count += 1
            self._persist_endpoint(endpoint)

    def record_error(self, endpoint: str, error_type: str, message: str) -> None:
        """Record an application-level error."""
        with self._lock:
            self._error_count += 1
            self._endpoint_stats[endpoint]["errors"] += 1
            self._endpoint_stats[endpoint]["last_error"] = {
                "type": error_type, "message": message,
                "timestamp": datetime.now().isoformat(),
            }

    def get_stats(self) -> dict[str, Any]:
        """Return global aggregate statistics."""
        with self._lock:
            avg = self._total_duration_ms / self._request_count if self._request_count else 0.0
            err_rate = (self._error_count / self._request_count * 100) if self._request_count else 0.0
            return {
                "request_count": self._request_count,
                "error_count": self._error_count,
                "avg_response_ms": round(avg, 2),
                "error_rate_percent": round(err_rate, 2),
                "status_code_distribution": dict(self._status_codes),
                "timestamp": datetime.now().isoformat(),
            }

    def get_endpoint_stats(self) -> dict[str, dict[str, Any]]:
        """Return per-endpoint statistics with computed averages."""
        with self._lock:
            result: dict[str, dict[str, Any]] = {}
            for ep, d in self._endpoint_stats.items():
                result[ep] = {
                    "requests": d["requests"], "errors": d["errors"],
                    "avg_response_ms": round(d["total_duration_ms"] / d["requests"], 2) if d["requests"] else 0.0,
                    "min_duration_ms": d["min_duration_ms"] if d["min_duration_ms"] != float("inf") else 0.0,
                    "max_duration_ms": d["max_duration_ms"],
                    "last_error": d.get("last_error"),
                }
            return result

    def reset(self) -> None:
        """Reset all in-memory counters."""
        with self._lock:
            self._request_count = self._error_count = 0
            self._total_duration_ms = 0.0
            self._endpoint_stats.clear()
            self._status_codes.clear()


# ---------------------------------------------------------------------------
# 2. HealthMonitor
# ---------------------------------------------------------------------------

class HealthMonitor:
    """Configurable system health checker (disk, memory, DB, API latency)."""

    def __init__(
        self,
        disk_threshold_percent: float = 90.0,
        memory_threshold_percent: float = 85.0,
        db_check_fn: Optional[Callable[[], bool]] = None,
        api_check_fn: Optional[Callable[[], float]] = None,
        api_timeout_ms: float = 2000.0,
    ) -> None:
        self.disk_threshold = disk_threshold_percent
        self.memory_threshold = memory_threshold_percent
        self._db_check = db_check_fn
        self._api_check = api_check_fn
        self._api_timeout_ms = api_timeout_ms

    def check_db(self) -> dict[str, Any]:
        """Check database connectivity."""
        if self._db_check is None:
            return {"status": "unknown", "message": "No DB check configured"}
        try:
            ok = self._db_check()
            return {"status": "healthy" if ok else "critical", "message": "DB reachable" if ok else "DB unreachable"}
        except Exception as exc:  # noqa: BLE001
            return {"status": "critical", "message": f"DB check error: {exc}"}

    def check_disk(self) -> dict[str, Any]:
        """Check disk utilisation."""
        try:
            usage = os.statvfs("/")
            total = usage.f_blocks * usage.f_frsize
            free = usage.f_bavail * usage.f_frsize
            used_pct = ((total - free) / total) * 100 if total else 0.0
            return {
                "status": "critical" if used_pct >= self.disk_threshold else "healthy",
                "used_percent": round(used_pct, 1),
                "free_gb": round(free / (1024**3), 2),
                "total_gb": round(total / (1024**3), 2),
            }
        except Exception as exc:  # noqa: BLE001
            return {"status": "critical", "message": f"Disk check error: {exc}"}

    def check_memory(self) -> dict[str, Any]:
        """Check system memory utilisation (Linux /proc/meminfo)."""
        try:
            mem: dict[str, int] = {}
            with open("/proc/meminfo") as fh:
                for line in fh:
                    if ":" in line:
                        k, v = line.split(":", 1)
                        mem[k.strip()] = int(v.strip().split()[0])
            total = mem.get("MemTotal", 0)
            avail = mem.get("MemAvailable", mem.get("MemFree", 0))
            used_pct = ((total - avail) / total) * 100 if total else 0.0
            return {
                "status": "critical" if used_pct >= self.memory_threshold else "healthy",
                "used_percent": round(used_pct, 1),
                "total_mb": total // 1024, "available_mb": avail // 1024,
            }
        except Exception as exc:  # noqa: BLE001
            return {"status": "critical", "message": f"Memory check error: {exc}"}

    def check_api_latency(self) -> dict[str, Any]:
        """Check external API latency."""
        if self._api_check is None:
            return {"status": "unknown", "message": "No API check configured"}
        try:
            latency = self._api_check()
            return {
                "status": "critical" if latency > self._api_timeout_ms else "healthy",
                "latency_ms": round(latency, 2),
                "timeout_ms": self._api_timeout_ms,
            }
        except Exception as exc:  # noqa: BLE001
            return {"status": "critical", "message": f"API check error: {exc}"}

    def check_all(self) -> HealthReport:
        """Run all checks and return composite report."""
        checks = {
            "disk": self.check_disk(),
            "memory": self.check_memory(),
            "db": self.check_db(),
            "api_latency": self.check_api_latency(),
        }
        worst = "healthy"
        for c in checks.values():
            st = c.get("status", "unknown")
            if st == "critical":
                worst = "critical"
                break
            elif st == "degraded" or (st == "warning"):
                worst = "degraded"
        return HealthReport(overall=worst, checks=checks)


# ---------------------------------------------------------------------------
# 3. RequestLogger
# ---------------------------------------------------------------------------

class RequestLogger:
    """SQLite-backed request logger with automatic rotation."""

    _MAX_ROWS: int = 10000

    def __init__(self, db_path: str = "data/request_log.db") -> None:
        self._db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self._db_path) as conn:
            conn.execute(
                """CREATE TABLE IF NOT EXISTS request_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    method TEXT, endpoint TEXT, status_code INTEGER,
                    duration_ms REAL, client_ip TEXT, user_agent TEXT,
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP)"""
            )

    def log(self, method: str, endpoint: str, status_code: int,
            duration_ms: float, client_ip: str = "", user_agent: str = "") -> None:
        """Log a single request."""
        with sqlite3.connect(self._db_path) as conn:
            conn.execute(
                "INSERT INTO request_log (method,endpoint,status_code,duration_ms,client_ip,user_agent) VALUES (?,?,?,?,?,?)",
                (method, endpoint, status_code, duration_ms, client_ip, user_agent),
            )
            self._maybe_rotate(conn)

    def _maybe_rotate(self, conn: sqlite3.Connection) -> None:
        """Purge oldest rows if exceeding max."""
        cur = conn.execute("SELECT COUNT(*) FROM request_log")
        count = cur.fetchone()[0]
        if count > self._MAX_ROWS:
            purge = count - self._MAX_ROWS + 1000
            conn.execute(
                "DELETE FROM request_log WHERE id <= (SELECT id FROM request_log ORDER BY id ASC LIMIT ?)",
                (purge,),
            )

    def recent(self, limit: int = 100) -> list[dict[str, Any]]:
        """Return recent request log entries."""
        with sqlite3.connect(self._db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                "SELECT * FROM request_log ORDER BY id DESC LIMIT ?", (limit,)
            )
            return [dict(r) for r in cur.fetchall()]

    def summary(self, minutes: int = 60) -> dict[str, Any]:
        """Aggregated summary for the last N minutes."""
        since = (datetime.now() - timedelta(minutes=minutes)).isoformat()
        with sqlite3.connect(self._db_path) as conn:
            conn.row_factory = sqlite3.Row
            total = conn.execute(
                "SELECT COUNT(*) FROM request_log WHERE timestamp >= ?", (since,)
            ).fetchone()[0]
            errors = conn.execute(
                "SELECT COUNT(*) FROM request_log WHERE timestamp >= ? AND status_code >= 400",
                (since,),
            ).fetchone()[0]
            avg = conn.execute(
                "SELECT AVG(duration_ms) FROM request_log WHERE timestamp >= ?", (since,)
            ).fetchone()[0] or 0.0
            return {"total_requests": total, "errors": errors,
                    "avg_duration_ms": round(avg, 2), "window_minutes": minutes}

    def reset(self) -> None:
        """Clear all logs."""
        with sqlite3.connect(self._db_path) as conn:
            conn.execute("DELETE FROM request_log")


# ---------------------------------------------------------------------------
# 4. AlertManager
# ---------------------------------------------------------------------------

class AlertManager:
    """Configurable alert rules with in-memory state."""

    def __init__(self) -> None:
        self._alerts: list[Alert] = []
        self._rules: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def add_rule(self, name: str, condition: Callable[[], bool],
                 severity: str = "warning", message: str = "") -> None:
        """Register an alert rule."""
        self._rules[name] = {"condition": condition, "severity": severity, "message": message}

    def evaluate_all(self) -> list[Alert]:
        """Evaluate all rules and return newly triggered alerts."""
        triggered: list[Alert] = []
        with self._lock:
            for name, rule in self._rules.items():
                try:
                    if rule["condition"]():
                        if not any(a.name == name and not a.resolved for a in self._alerts):
                            alert = Alert(
                                name=name, severity=rule["severity"],
                                message=rule["message"],
                                triggered_at=datetime.now().isoformat(),
                            )
                            self._alerts.append(alert)
                            triggered.append(alert)
                except Exception as exc:  # noqa: BLE001
                    alert = Alert(
                        name=f"{name}_eval_error", severity="critical",
                        message=f"Rule evaluation failed: {exc}",
                        triggered_at=datetime.now().isoformat(),
                    )
                    self._alerts.append(alert)
                    triggered.append(alert)
        return triggered

    def active_alerts(self) -> list[Alert]:
        """Return all unresolved alerts."""
        with self._lock:
            return [a for a in self._alerts if not a.resolved]

    def resolve(self, name: str) -> bool:
        """Mark all alerts with *name* as resolved."""
        with self._lock:
            found = False
            for a in self._alerts:
                if a.name == name:
                    a.resolved = True
                    found = True
            return found

    def add_error_rate_rule(self, telemetry: TelemetryCollector,
                           threshold_percent: float = 5.0) -> None:
        """Add rule that fires when error rate exceeds threshold."""
        self.add_rule(
            "high_error_rate", severity="critical",
            condition=lambda: (
                telemetry.get_stats()["error_rate_percent"] > threshold_percent
                and telemetry.get_stats()["request_count"] > 10
            ),
            message=f"Error rate exceeds {threshold_percent}%",
        )

    def add_slow_request_rule(self, telemetry: TelemetryCollector,
                             threshold_ms: float = 5000.0) -> None:
        """Add rule that fires when average response time exceeds threshold."""
        self.add_rule(
            "slow_requests", severity="warning",
            condition=lambda: telemetry.get_stats()["avg_response_ms"] > threshold_ms,
            message=f"Average response time exceeds {threshold_ms}ms",
        )

    def add_disk_rule(self, health: HealthMonitor) -> None:
        """Add rule that fires when disk usage is critical."""
        self.add_rule(
            "disk_full", severity="critical",
            condition=lambda: health.check_disk().get("status") == "critical",
            message="Disk usage critical",
        )


# ---------------------------------------------------------------------------
# 5. TelemetryMiddleware (ASGI)
# ---------------------------------------------------------------------------

class TelemetryMiddleware(BaseHTTPMiddleware if _FASTAPI_AVAILABLE else object):  # type: ignore[misc]
    """FastAPI middleware that auto-collects per-request telemetry."""

    def __init__(self, app, collector: Optional[TelemetryCollector] = None,
                 logger: Optional[RequestLogger] = None) -> None:
        if _FASTAPI_AVAILABLE:
            super().__init__(app)  # type: ignore[call-arg]
        self.collector = collector or TelemetryCollector()
        self.logger = logger

    async def dispatch(self, request: Any, call_next: Any) -> Any:
        if not _FASTAPI_AVAILABLE:
            raise RuntimeError("FastAPI is required for TelemetryMiddleware")
        start = time.perf_counter()
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            status_code = 500
            raise
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            endpoint = request.url.path
            self.collector.record_request(endpoint, duration_ms, status_code)
            if self.logger is not None:
                self.logger.log(
                    method=request.method, endpoint=endpoint,
                    status_code=status_code, duration_ms=duration_ms,
                    client_ip=getattr(request.client, "host", ""),
                    user_agent=request.headers.get("user-agent", ""),
                )
        return response


# ---------------------------------------------------------------------------
# 6. FastAPI Router
# ---------------------------------------------------------------------------

def get_telemetry_router(
    collector: Optional[TelemetryCollector] = None,
    health: Optional[HealthMonitor] = None,
    alerts: Optional[AlertManager] = None,
) -> Any:
    """Return a FastAPI router with telemetry endpoints."""
    if not _FASTAPI_AVAILABLE:
        raise RuntimeError("FastAPI is required for get_telemetry_router()")

    router = APIRouter(prefix="/telemetry", tags=["telemetry"])
    coll = collector or TelemetryCollector()
    hlth = health or HealthMonitor()
    alrt = alerts or AlertManager()

    @router.get("/stats", summary="Global telemetry stats")
    async def stats() -> dict[str, Any]:
        return coll.get_stats()

    @router.get("/endpoints", summary="Per-endpoint statistics")
    async def endpoints() -> dict[str, Any]:
        return coll.get_endpoint_stats()

    @router.get("/health", summary="System health report")
    async def health_check() -> dict[str, Any]:
        report = hlth.check_all()
        return {"overall": report.overall, "checks": report.checks, "timestamp": report.timestamp}

    @router.get("/alerts", summary="Active alerts")
    async def list_alerts() -> list[dict[str, Any]]:
        return [{"name": a.name, "severity": a.severity, "message": a.message,
                 "triggered_at": a.triggered_at, "resolved": a.resolved}
                for a in alrt.active_alerts()]

    @router.post("/alerts/evaluate", summary="Evaluate alert rules")
    async def evaluate() -> list[dict[str, Any]]:
        triggered = alrt.evaluate_all()
        return [{"name": a.name, "severity": a.severity, "message": a.message,
                 "triggered_at": a.triggered_at} for a in triggered]

    @router.post("/reset", summary="Reset telemetry counters")
    async def reset() -> dict[str, str]:
        coll.reset()
        return {"status": "reset"}

    return router
