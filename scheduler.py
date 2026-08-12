"""Scheduler — Task scheduling and cron-like execution."""

import json
from datetime import datetime
from typing import Callable, Dict, List


class Scheduler:
    """Task scheduler for Omega AI."""

    def __init__(self):
        self.jobs = []
        self.running = False

    def add_job(self, name: str, func: Callable, schedule: str, args: List = None, kwargs: Dict = None) -> Dict:
        job = {
            "id": len(self.jobs) + 1,
            "name": name,
            "func": func,
            "schedule": schedule,
            "args": args or [],
            "kwargs": kwargs or {},
            "last_run": None,
            "next_run": None,
            "enabled": True,
        }
        self.jobs.append(job)
        return job

    def remove_job(self, job_id: int) -> bool:
        self.jobs = [j for j in self.jobs if j["id"] != job_id]
        return True

    def run_job(self, job_id: int) -> Dict:
        job = next((j for j in self.jobs if j["id"] == job_id), None)
        if not job:
            return {"error": "Job not found"}
        try:
            result = job["func"](*job["args"], **job["kwargs"])
            job["last_run"] = datetime.now().isoformat()
            return {"status": "success", "result": result, "job": job["name"]}
        except Exception as e:
            return {"status": "error", "error": str(e), "job": job["name"]}

    def list_jobs(self) -> List[Dict]:
        return [{"id": j["id"], "name": j["name"], "schedule": j["schedule"], "enabled": j["enabled"], "last_run": j["last_run"]} for j in self.jobs]

    def enable(self, job_id: int) -> bool:
        job = next((j for j in self.jobs if j["id"] == job_id), None)
        if job:
            job["enabled"] = True
            return True
        return False

    def disable(self, job_id: int) -> bool:
        job = next((j for j in self.jobs if j["id"] == job_id), None)
        if job:
            job["enabled"] = False
            return True
        return False


if __name__ == "__main__":
    scheduler = Scheduler()
    scheduler.add_job("cleanup", lambda: "Cleaned", "daily")
    scheduler.add_job("backup", lambda: "Backed up", "weekly")
    print(json.dumps(scheduler.list_jobs(), indent=2))
    print(json.dumps(scheduler.run_job(1), indent=2))
