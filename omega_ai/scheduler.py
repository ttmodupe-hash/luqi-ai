"""Omega AI v3 — Task Scheduler
Cron-like job scheduler with support for recurring tasks and health checks.
"""
from __future__ import annotations

import json
import sched
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable


class TaskScheduler:
    """Cron-like task scheduler with job registry and health monitoring."""

    def __init__(self) -> None:
        self._scheduler = sched.scheduler(time.time, time.sleep)
        self._jobs: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._running = False
        self._thread: threading.Thread | None = None

    def add_job(self, job_id: str, fn: Callable, interval_seconds: float, args: tuple = (), kwargs: dict | None = None) -> dict[str, Any]:
        """Add a recurring job."""
        with self._lock:
            self._jobs[job_id] = {
                "fn": fn,
                "interval": interval_seconds,
                "args": args,
                "kwargs": kwargs or {},
                "last_run": None,
                "run_count": 0,
                "error_count": 0,
                "created": datetime.now(timezone.utc).isoformat(),
            }
        return {"job_id": job_id, "interval_s": interval_seconds, "status": "scheduled"}

    def _run_job(self, job_id: str) -> None:
        """Execute a job and reschedule."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            try:
                job["fn"](*job["args"], **job["kwargs"])
                job["last_run"] = datetime.now(timezone.utc).isoformat()
                job["run_count"] += 1
            except Exception as e:
                job["error_count"] += 1
                print(f"Job {job_id} error: {e}")
            # Reschedule
            if self._running:
                self._scheduler.enter(job["interval"], 1, self._run_job, argument=(job_id,))

    def start(self) -> dict[str, Any]:
        """Start the scheduler."""
        self._running = True
        for job_id in self._jobs:
            job = self._jobs[job_id]
            self._scheduler.enter(job["interval"], 1, self._run_job, argument=(job_id,))
        self._thread = threading.Thread(target=self._scheduler.run, daemon=True)
        self._thread.start()
        return {"status": "running", "jobs": len(self._jobs)}

    def stop(self) -> dict[str, Any]:
        """Stop the scheduler."""
        self._running = False
        for event in list(self._scheduler.queue):
            self._scheduler.cancel(event)
        return {"status": "stopped"}

    def remove_job(self, job_id: str) -> bool:
        """Remove a job."""
        with self._lock:
            return self._jobs.pop(job_id, None) is not None

    def list_jobs(self) -> dict[str, Any]:
        """List all jobs."""
        return {k: {"interval": v["interval"], "run_count": v["run_count"], "error_count": v["error_count"], "last_run": v["last_run"]} for k, v in self._jobs.items()}

    def get_job_health(self, job_id: str) -> dict[str, Any] | None:
        """Get health status of a job."""
        job = self._jobs.get(job_id)
        if not job:
            return None
        total = job["run_count"] + job["error_count"]
        error_rate = job["error_count"] / total if total > 0 else 0
        return {
            "job_id": job_id,
            "status": "healthy" if error_rate < 0.1 else "degraded" if error_rate < 0.5 else "unhealthy",
            "run_count": job["run_count"],
            "error_count": job["error_count"],
            "error_rate": round(error_rate, 3),
            "last_run": job["last_run"],
        }

    def run_once(self, job_id: str) -> dict[str, Any]:
        """Run a job immediately, once."""
        job = self._jobs.get(job_id)
        if not job:
            return {"error": f"Job {job_id} not found"}
        try:
            job["fn"](*job["args"], **job["kwargs"])
            job["run_count"] += 1
            job["last_run"] = datetime.now(timezone.utc).isoformat()
            return {"status": "ok", "job_id": job_id}
        except Exception as e:
            job["error_count"] += 1
            return {"status": "error", "job_id": job_id, "error": str(e)}
