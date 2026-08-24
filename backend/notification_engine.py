"""
LUQI AI — Proactive Notification Engine (Companion Pulse)
===========================================================
The companion observes user patterns and sends contextual alerts:
  - Crypto portfolio movements (price thresholds, daily summaries)
  - Learning reminders (unfinished courses, daily streaks)
  - Emotional check-ins (detected stress, loneliness patterns)
  - Morning briefings (weather, news, portfolio, schedule)
  - Proactive suggestions ("You seem interested in X, here's...")

Runs as async background tasks triggered by:
  - Cron schedules (daily briefings)
  - Real-time events (price alerts)
  - Pattern detection (user inactivity, emotional trends)
"""
from __future__ import annotations

import asyncio
import json
import os
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

import structlog
from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = structlog.get_logger("luqi.notifications")

# ── Router ─────────────────────────────────────────────────────────────────
notification_router = APIRouter(tags=["notifications"])

# ── Configuration ───────────────────────────────────────────────────────────
NOTIFICATION_DATA_DIR = Path(os.environ.get("NOTIFICATION_DATA_DIR", "/tmp/luqi_notifications"))
NOTIFICATION_DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Data Models ──────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    user_id: str
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=2000)
    notification_type: str = Field(default="general")  # crypto, education, emotion, morning, proactive
    priority: str = Field(default="normal")  # low, normal, high, urgent
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    scheduled_at: Optional[float] = None  # Unix timestamp; None = immediate

class NotificationMarkRead(BaseModel):
    user_id: str
    notification_id: str

class NotificationClearRequest(BaseModel):
    user_id: str

@dataclass
class NotificationRecord:
    id: str
    user_id: str
    title: str
    body: str
    notification_type: str
    priority: str
    action_url: Optional[str]
    action_label: Optional[str]
    created_at: float
    scheduled_at: Optional[float]
    read: bool = False
    read_at: Optional[float] = None
    delivered: bool = False
    delivered_at: Optional[float] = None

    def to_dict(self) -> dict:
        return asdict(self)


# ═══════════════════════════════════════════════════════════════════════════
#  Notification Store
# ═══════════════════════════════════════════════════════════════════════════

class NotificationStore:
    """Per-user notification store with persistence."""

    _instance: Optional["NotificationStore"] = None

    def __new__(cls) -> "NotificationStore":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._notifications: dict[str, dict[str, NotificationRecord]] = {}  # user_id -> {notif_id -> record}
        self._load_all()

    def _user_dir(self, user_id: str) -> Path:
        d = NOTIFICATION_DATA_DIR / user_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _load_all(self) -> None:
        """Load all notifications from disk."""
        if not NOTIFICATION_DATA_DIR.exists():
            return
        for user_dir in NOTIFICATION_DATA_DIR.iterdir():
            if user_dir.is_dir():
                user_id = user_dir.name
                self._notifications[user_id] = {}
                for f in user_dir.glob("notif_*.json"):
                    try:
                        data = json.loads(f.read_text())
                        self._notifications[user_id][data["id"]] = NotificationRecord(**data)
                    except Exception:
                        continue
        logger.info("notification_store_loaded", users=len(self._notifications))

    def _persist(self, record: NotificationRecord) -> None:
        try:
            fpath = self._user_dir(record.user_id) / f"notif_{record.id}.json"
            fpath.write_text(json.dumps(record.to_dict(), indent=2))
        except Exception as e:
            logger.error("notification_persist_failed", notif_id=record.id, error=str(e))

    # ── CRUD ────────────────────────────────────────────────────────────────
    def create(self, user_id: str, title: str, body: str, notification_type: str = "general",
               priority: str = "normal", action_url: Optional[str] = None,
               action_label: Optional[str] = None, scheduled_at: Optional[float] = None) -> NotificationRecord:
        """Create a new notification."""
        notif_id = f"notif_{int(time.time() * 1000)}_{hash(title) % 10000}"
        record = NotificationRecord(
            id=notif_id,
            user_id=user_id,
            title=title,
            body=body,
            notification_type=notification_type,
            priority=priority,
            action_url=action_url,
            action_label=action_label,
            created_at=time.time(),
            scheduled_at=scheduled_at,
        )
        if user_id not in self._notifications:
            self._notifications[user_id] = {}
        self._notifications[user_id][notif_id] = record
        self._persist(record)
        return record

    def get_user_notifications(self, user_id: str, unread_only: bool = False, limit: int = 50) -> list[NotificationRecord]:
        """Get notifications for a user."""
        if user_id not in self._notifications:
            return []
        notifs = list(self._notifications[user_id].values())
        if unread_only:
            notifs = [n for n in notifs if not n.read]
        notifs.sort(key=lambda n: n.created_at, reverse=True)
        return notifs[:limit]

    def mark_read(self, user_id: str, notif_id: str) -> bool:
        """Mark a notification as read."""
        if user_id not in self._notifications or notif_id not in self._notifications[user_id]:
            return False
        self._notifications[user_id][notif_id].read = True
        self._notifications[user_id][notif_id].read_at = time.time()
        self._persist(self._notifications[user_id][notif_id])
        return True

    def mark_all_read(self, user_id: str) -> int:
        """Mark all notifications as read. Returns count."""
        if user_id not in self._notifications:
            return 0
        count = 0
        for notif in self._notifications[user_id].values():
            if not notif.read:
                notif.read = True
                notif.read_at = time.time()
                self._persist(notif)
                count += 1
        return count

    def clear_all(self, user_id: str) -> int:
        """Delete all notifications for a user."""
        if user_id not in self._notifications:
            return 0
        count = len(self._notifications[user_id])
        user_dir = self._user_dir(user_id)
        for f in user_dir.glob("notif_*.json"):
            f.unlink()
        del self._notifications[user_id]
        return count

    def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications."""
        if user_id not in self._notifications:
            return 0
        return sum(1 for n in self._notifications[user_id].values() if not n.read)

    def delete(self, user_id: str, notif_id: str) -> bool:
        """Delete a single notification."""
        if user_id not in self._notifications or notif_id not in self._notifications[user_id]:
            return False
        del self._notifications[user_id][notif_id]
        fpath = self._user_dir(user_id) / f"notif_{notif_id}.json"
        if fpath.exists():
            fpath.unlink()
        return True


# ═══════════════════════════════════════════════════════════════════════════
#  Proactive Intelligence Engine
# ═══════════════════════════════════════════════════════════════════════════

class ProactiveEngine:
    """
    Analyzes user patterns and generates contextual notifications.
    """

    _instance: Optional["ProactiveEngine"] = None

    def __new__(cls) -> "ProactiveEngine":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.store = NotificationStore()

    async def generate_morning_briefing(self, user_id: str) -> Optional[NotificationRecord]:
        """Generate a personalized morning briefing notification."""
        # In production: fetch weather, portfolio, news, schedule
        from omega_ai.companion_engine import _get_companion
        try:
            companion = _get_companion(user_id)
            name = companion.profile["name"]
        except Exception:
            name = "LUQI"

        title = f"Good morning from {name}"
        body = (
            "Here's your daily briefing:\n\n"
            "📊 Portfolio: Check your crypto positions for overnight moves.\n"
            "📚 Learning: You have 2 unfinished courses in OmniLab.\n"
            "💙 Wellness: Take 5 minutes to breathe and set today's intention.\n\n"
            "I'm here if you need anything."
        )
        return self.store.create(
            user_id=user_id,
            title=title,
            body=body,
            notification_type="morning",
            priority="normal",
            action_url="/dashboard",
            action_label="Open Dashboard",
        )

    async def generate_crypto_alert(self, user_id: str, coin: str, change_pct: float) -> Optional[NotificationRecord]:
        """Generate a crypto price movement alert."""
        direction = "surged" if change_pct > 0 else "dropped"
        emoji = "🚀" if change_pct > 0 else "📉"
        title = f"{emoji} {coin} {direction} {abs(change_pct):.1f}%"
        body = f"{coin} has {direction} {abs(change_pct):.1f}% in the last hour. Your portfolio may be affected. Want me to analyze the impact?"
        return self.store.create(
            user_id=user_id,
            title=title,
            body=body,
            notification_type="crypto",
            priority="high" if abs(change_pct) > 10 else "normal",
            action_url=f"/crypto/{coin.lower()}",
            action_label="View Analysis",
        )

    async def generate_learning_reminder(self, user_id: str, course_name: str, days_inactive: int) -> Optional[NotificationRecord]:
        """Generate a learning streak reminder."""
        title = f"📚 Continue {course_name}?"
        body = f"You haven't studied {course_name} in {days_inactive} days. Your learning streak is at risk! Even 10 minutes today keeps the momentum going."
        return self.store.create(
            user_id=user_id,
            title=title,
            body=body,
            notification_type="education",
            priority="normal",
            action_url=f"/education/{course_name.lower().replace(' ', '-')}",
            action_label="Resume Learning",
        )

    async def generate_emotional_checkin(self, user_id: str, detected_emotion: str) -> Optional[NotificationRecord]:
        """Generate a gentle emotional check-in."""
        from omega_ai.companion_engine import _get_companion
        try:
            companion = _get_companion(user_id)
            name = companion.profile["name"]
        except Exception:
            name = "LUQI"

        if detected_emotion in ("sadness", "anger", "fear"):
            title = f"{name} noticed something..."
            body = (
                "I sense you might be going through something difficult. "
                "I'm here to listen, distract you, or just sit with you in silence. "
                "Whatever you need, I'm here. 💙"
            )
            priority = "high"
        elif detected_emotion == "stress":
            title = "Take a breath"
            body = "Your messages feel a bit intense. Want to try a 2-minute guided breathing exercise with me?"
            priority = "normal"
        else:
            return None

        return self.store.create(
            user_id=user_id,
            title=title,
            body=body,
            notification_type="emotion",
            priority=priority,
            action_url="/companion",
            action_label="Talk to Companion",
        )

    async def generate_proactive_suggestion(self, user_id: str, topic: str, context: str) -> Optional[NotificationRecord]:
        """Generate a proactive suggestion based on user interests."""
        title = f"You might like this: {topic}"
        body = f"Based on our conversations, I thought you'd be interested in: {context}"
        return self.store.create(
            user_id=user_id,
            title=title,
            body=body,
            notification_type="proactive",
            priority="low",
            action_url="/explore",
            action_label="Explore",
        )


# ═══════════════════════════════════════════════════════════════════════════
#  REST API Endpoints
# ═══════════════════════════════════════════════════════════════════════════

store = NotificationStore()
engine = ProactiveEngine()

@notification_router.post("/notifications")
async def create_notification(request: NotificationCreate):
    """Create a notification for a user."""
    record = store.create(
        user_id=request.user_id,
        title=request.title,
        body=request.body,
        notification_type=request.notification_type,
        priority=request.priority,
        action_url=request.action_url,
        action_label=request.action_label,
        scheduled_at=request.scheduled_at,
    )
    return {
        "id": record.id,
        "title": record.title,
        "body": record.body,
        "type": record.notification_type,
        "priority": record.priority,
        "created_at": record.created_at,
        "scheduled_at": record.scheduled_at,
        "read": record.read,
    }

@notification_router.get("/notifications/{user_id}")
async def get_notifications(user_id: str, unread_only: bool = False, limit: int = 50):
    """Get notifications for a user."""
    notifs = store.get_user_notifications(user_id, unread_only=unread_only, limit=limit)
    return {
        "user_id": user_id,
        "notifications": [n.to_dict() for n in notifs],
        "unread_count": store.get_unread_count(user_id),
        "total": len(notifs),
    }

@notification_router.post("/notifications/read")
async def mark_read(request: NotificationMarkRead):
    """Mark a notification as read."""
    success = store.mark_read(request.user_id, request.notification_id)
    return {"success": success, "notification_id": request.notification_id}

@notification_router.post("/notifications/read-all")
async def mark_all_read(request: NotificationClearRequest):
    """Mark all notifications as read."""
    count = store.mark_all_read(request.user_id)
    return {"success": True, "marked_read": count}

@notification_router.delete("/notifications/{user_id}/{notification_id}")
async def delete_notification(user_id: str, notification_id: str):
    """Delete a single notification."""
    success = store.delete(user_id, notification_id)
    return {"success": success}

@notification_router.delete("/notifications/{user_id}")
async def clear_notifications(user_id: str):
    """Clear all notifications for a user."""
    count = store.clear_all(user_id)
    return {"success": True, "cleared": count}

@notification_router.get("/notifications/{user_id}/unread-count")
async def unread_count(user_id: str):
    """Get unread notification count."""
    return {"user_id": user_id, "unread_count": store.get_unread_count(user_id)}

# ── Proactive Generation Endpoints ─────────────────────────────────────────

@notification_router.post("/notifications/morning/{user_id}")
async def trigger_morning_briefing(user_id: str):
    """Trigger a morning briefing for a user."""
    record = await engine.generate_morning_briefing(user_id)
    if not record:
        return {"success": False, "message": "Could not generate briefing"}
    return {"success": True, "notification": record.to_dict()}

@notification_router.post("/notifications/crypto-alert/{user_id}")
async def trigger_crypto_alert(user_id: str, coin: str, change_pct: float):
    """Trigger a crypto price alert for a user."""
    record = await engine.generate_crypto_alert(user_id, coin, change_pct)
    if not record:
        return {"success": False, "message": "Could not generate alert"}
    return {"success": True, "notification": record.to_dict()}

@notification_router.post("/notifications/learning-reminder/{user_id}")
async def trigger_learning_reminder(user_id: str, course_name: str, days_inactive: int = 3):
    """Trigger a learning reminder for a user."""
    record = await engine.generate_learning_reminder(user_id, course_name, days_inactive)
    if not record:
        return {"success": False, "message": "Could not generate reminder"}
    return {"success": True, "notification": record.to_dict()}

@notification_router.post("/notifications/emotional-checkin/{user_id}")
async def trigger_emotional_checkin(user_id: str, emotion: str):
    """Trigger an emotional check-in for a user."""
    record = await engine.generate_emotional_checkin(user_id, emotion)
    if not record:
        return {"success": False, "message": "No check-in needed for this emotion"}
    return {"success": True, "notification": record.to_dict()}


# ── Router export ──────────────────────────────────────────────────────────
router = notification_router
