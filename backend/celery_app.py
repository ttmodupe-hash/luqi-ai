"""Celery configuration for LUQI AI background tasks"""
import os
from celery import Celery
from celery.signals import task_failure

# Configuration
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery(
    "luqi_tasks",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        "backend.tasks.email",
        "backend.tasks.notifications",
        "backend.tasks.reports",
        "backend.tasks.ml_training",
    ],
)

# Task serialization
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    worker_prefetch_multiplier=1,
    result_expires=3600 * 24,  # Results expire after 24 hours
)

# Beat schedule (periodic tasks)
celery_app.conf.beat_schedule = {
    "cleanup-old-sessions": {
        "task": "backend.tasks.cleanup.cleanup_sessions",
        "schedule": 3600.0,  # every hour
    },
    "send-daily-digest": {
        "task": "backend.tasks.email.send_daily_digest",
        "schedule": 86400.0,  # every 24 hours
    },
    "sync-external-data": {
        "task": "backend.tasks.sync.sync_external_sources",
        "schedule": 300.0,  # every 5 minutes
    },
}


@task_failure.connect
def handle_task_failure(sender=None, task_id=None, exception=None, args=None, kwargs=None, traceback=None, einfo=None, **kw):
    """Log task failures for monitoring."""
    import logging
    logger = logging.getLogger("celery")
    logger.error(f"Task {sender.name} [{task_id}] failed: {exception}")


def get_task_status(task_id: str) -> dict:
    """Get the status of a Celery task."""
    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    }
