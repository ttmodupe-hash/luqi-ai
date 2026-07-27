"""
LUQI AI — Notification Hub
===========================
Central notification hub that monitors all LUQI AI modules for alerts.
Generates realistic South African public-service notifications and
exposes CRUD + settings APIs used by the WebSocket layer and REST endpoints.

Author  : LUQI AI Team
License : MIT
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any


# ---------------------------------------------------------------------------
# Data Model
# ---------------------------------------------------------------------------

@dataclass
class Notification:
    """Single notification record."""

    id: str
    type: str
    title: str
    description: str
    priority: str
    icon: str
    color: str
    user_id: Optional[str]
    read: bool = False
    created_at: float = field(default_factory=time.time)
    action_url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Serialize to dict for JSON responses."""
        d = asdict(self)
        d["created_at_iso"] = datetime.utcfromtimestamp(self.created_at).isoformat() + "Z"
        d["time_ago"] = _time_ago(self.created_at)
        return d


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _time_ago(ts: float) -> str:
    """Human-readable relative time string."""
    delta = datetime.utcnow() - datetime.utcfromtimestamp(ts)
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        return f"{seconds // 60} minute{'s' if seconds // 60 != 1 else ''} ago"
    if seconds < 86400:
        return f"{seconds // 3600} hour{'s' if seconds // 3600 != 1 else ''} ago"
    if seconds < 172800:
        return "Yesterday"
    if seconds < 604800:
        return f"{seconds // 86400} days ago"
    if seconds < 2592000:
        return f"{seconds // 604800} week{'s' if seconds // 604800 != 1 else ''} ago"
    return f"{seconds // 2592000} month{'s' if seconds // 2592000 != 1 else ''} ago"


def _uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Notification Hub
# ---------------------------------------------------------------------------

class NotificationHub:
    """Central notification hub that monitors all LUQI AI modules for alerts."""

    # --- Notification type registry ----------------------------------------

    NOTIFICATION_TYPES: Dict[str, Dict[str, str]] = {
        "tender_deadline": {"icon": "FileText", "color": "orange", "priority": "high"},
        "load_shedding": {"icon": "Zap", "color": "red", "priority": "urgent"},
        "water_restriction": {"icon": "Droplets", "color": "blue", "priority": "medium"},
        "grant_deadline": {"icon": "Banknote", "color": "green", "priority": "high"},
        "weather_alert": {"icon": "CloudRain", "color": "yellow", "priority": "medium"},
        "nsfas_reminder": {"icon": "GraduationCap", "color": "purple", "priority": "high"},
        "tax_deadline": {"icon": "Calculator", "color": "red", "priority": "urgent"},
        "sassa_payment": {"icon": "Wallet", "color": "green", "priority": "low"},
    }

    # Default user settings
    DEFAULT_SETTINGS: Dict[str, Any] = {
        "enabled": True,
        "types": {
            "tender_deadline": True,
            "load_shedding": True,
            "water_restriction": True,
            "grant_deadline": True,
            "weather_alert": True,
            "nsfas_reminder": True,
            "tax_deadline": True,
            "sassa_payment": True,
        },
        "channels": {
            "push": True,
            "email": False,
            "sms": False,
        },
        "quiet_hours": {"enabled": False, "start": "22:00", "end": "07:00"},
    }

    # --- Singleton storage (in-memory, replace with DB in production) ------

    _notifications: Dict[str, Notification] = {}
    _user_settings: Dict[str, Dict[str, Any]] = {}
    _instance: Optional["NotificationHub"] = None

    def __new__(cls) -> "NotificationHub":
        """Singleton so WebSocket + REST share the same store."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # --- Public API --------------------------------------------------------

    def get_notifications(
        self,
        user_id: Optional[str] = None,
        unread_only: bool = False,
        notification_type: Optional[str] = None,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Return notifications filtered by user / read status / type.

        Returns:
            {
                "notifications": [ { ... notification dict ... }, ... ],
                "total": int,
                "unread_count": int,
            }
        """
        results: List[Notification] = []

        for n in sorted(self._notifications.values(), key=lambda x: x.created_at, reverse=True):
            # Filter by user (None = global / all)
            if user_id is not None and n.user_id is not None and n.user_id != user_id:
                continue
            if unread_only and n.read:
                continue
            if notification_type is not None and n.type != notification_type:
                continue
            results.append(n)
            if len(results) >= limit:
                break

        unread_count = self._count_unread(user_id)

        return {
            "notifications": [n.to_dict() for n in results],
            "total": len(results),
            "unread_count": unread_count,
        }

    def get_notification_by_id(self, notification_id: str) -> Optional[Notification]:
        """Fetch a single notification by ID."""
        return self._notifications.get(notification_id)

    def mark_read(self, notification_id: str) -> Dict[str, Any]:
        """Mark a single notification as read."""
        n = self._notifications.get(notification_id)
        if n is None:
            return {"success": False, "error": "Notification not found"}
        n.read = True
        return {"success": True, "notification_id": notification_id, "read": True}

    def mark_all_read(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Mark all notifications as read for a given user (or global if None)."""
        count = 0
        for n in self._notifications.values():
            if user_id is not None and n.user_id is not None and n.user_id != user_id:
                continue
            if not n.read:
                n.read = True
                count += 1
        return {"success": True, "marked_count": count}

    def get_unread_count(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Return the unread notification count for badge display."""
        return {"unread_count": self._count_unread(user_id)}

    def create_notification(
        self,
        notification_type: str,
        title: str,
        description: str,
        user_id: Optional[str] = None,
        action_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Notification:
        """Create a new notification and store it."""
        type_meta = self.NOTIFICATION_TYPES.get(notification_type, {})
        n = Notification(
            id=_uuid(),
            type=notification_type,
            title=title,
            description=description,
            priority=type_meta.get("priority", "medium"),
            icon=type_meta.get("icon", "Bell"),
            color=type_meta.get("color", "gray"),
            user_id=user_id,
            action_url=action_url,
            metadata=metadata or {},
        )
        self._notifications[n.id] = n
        return n

    def delete_notification(self, notification_id: str) -> Dict[str, Any]:
        """Remove a notification permanently."""
        if notification_id in self._notifications:
            del self._notifications[notification_id]
            return {"success": True}
        return {"success": False, "error": "Notification not found"}

    def generate_sample_notifications(self, user_id: Optional[str] = None) -> List[Notification]:
        """Create realistic sample notifications for demo / onboarding."""
        now = time.time()
        samples = [
            {
                "type": "tender_deadline",
                "title": "Tender closing soon — Limpopo Clinic Construction",
                "description": (
                    "Tender for construction of new clinic in Limpopo closes in 3 days. "
                    "Estimated value: R12.5M. Submit all documents via eTenderPortal."
                ),
                "action_url": "/tenders/limpopo-clinic-2025",
                "metadata": {"province": "Limpopo", "value": "R12.5M", "days_left": 3},
                "offset": 7200,
            },
            {
                "type": "load_shedding",
                "title": "Eskom Stage 2 load shedding — Today 16:00-20:00",
                "description": (
                    "Stage 2 load shedding scheduled for your area today from 16:00 to 20:00. "
                    "Blocks 8, 12, and 16 affected. Prepare backup power."
                ),
                "action_url": "/loadshedding/schedule",
                "metadata": {"stage": 2, "start": "16:00", "end": "20:00", "blocks": [8, 12, 16]},
                "offset": 3600,
            },
            {
                "type": "water_restriction",
                "title": "City of Johannesburg: Level 1 water restrictions now in effect",
                "description": (
                    "Level 1 water restrictions are now active. No watering of gardens between "
                    "06:00-18:00. Fines up to R1,500 for non-compliance."
                ),
                "action_url": "/water/restrictions/johannesburg",
                "metadata": {"city": "Johannesburg", "level": 1, "fine": "R1,500"},
                "offset": 86400,
            },
            {
                "type": "grant_deadline",
                "title": "SEFA small business loan deadline: 15 August",
                "description": (
                    "SEFA small business loan application deadline is 15 August 2025. "
                    "Loans from R50,000 to R5M available. Check eligibility criteria."
                ),
                "action_url": "/grants/sefa-small-business",
                "metadata": {"grantor": "SEFA", "deadline": "2025-08-15", "max_amount": "R5M"},
                "offset": 172800,
            },
            {
                "type": "weather_alert",
                "title": "Severe thunderstorms expected in Gauteng today",
                "description": (
                    "SAWS has issued a yellow-level warning for severe thunderstorms in Gauteng. "
                    "Expect heavy rain, hail, and strong winds between 14:00-20:00."
                ),
                "action_url": "/weather/alerts/gauteng",
                "metadata": {"province": "Gauteng", "severity": "yellow", "time": "14:00-20:00"},
                "offset": 1800,
            },
            {
                "type": "nsfas_reminder",
                "title": "NSFAS 2025 applications open 1 September",
                "description": (
                    "NSFAS 2025 applications open on 1 September 2025. Prepare your certified ID, "
                    "proof of income, and academic results now to avoid last-minute delays."
                ),
                "action_url": "/education/nsfas-2025",
                "metadata": {"year": 2025, "opens": "2025-09-01", "required_docs": 3},
                "offset": 432000,
            },
            {
                "type": "tax_deadline",
                "title": "SARS tax filing deadline: 31 October 2025",
                "description": (
                    "The 2025 tax filing season deadline is 31 October 2025 for provisional taxpayers. "
                    "File early via eFiling to avoid penalties and interest charges."
                ),
                "action_url": "/finance/tax-filing-2025",
                "metadata": {"deadline": "2025-10-31", "penalty_rate": "10%"},
                "offset": 604800,
            },
            {
                "type": "sassa_payment",
                "title": "SASSA SRD grant payment scheduled for this week",
                "description": (
                    "Your SASSA SRD R370 grant payment is scheduled for this week. "
                    "Check your payment status and collection point via the SASSA portal."
                ),
                "action_url": "/social/srd-payment-status",
                "metadata": {"grant_type": "SRD", "amount": "R370", "status": "scheduled"},
                "offset": 129600,
            },
        ]

        created: List[Notification] = []
        for s in samples:
            type_meta = self.NOTIFICATION_TYPES.get(s["type"], {})
            n = Notification(
                id=_uuid(),
                type=s["type"],
                title=s["title"],
                description=s["description"],
                priority=type_meta.get("priority", "medium"),
                icon=type_meta.get("icon", "Bell"),
                color=type_meta.get("color", "gray"),
                user_id=user_id,
                created_at=now - s["offset"],
                action_url=s.get("action_url"),
                metadata=s.get("metadata", {}),
            )
            self._notifications[n.id] = n
            created.append(n)
        return created

    # --- Settings API ------------------------------------------------------

    def get_notification_settings(self, user_id: str) -> Dict[str, Any]:
        """Return user notification preferences (deep copy so caller can mutate)."""
        if user_id not in self._user_settings:
            self._user_settings[user_id] = json.loads(json.dumps(self.DEFAULT_SETTINGS))
        return {"settings": self._user_settings[user_id]}

    def update_settings(self, user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Update user notification preferences (partial merge)."""
        current = self.get_notification_settings(user_id)["settings"]
        self._deep_merge(current, settings)
        self._user_settings[user_id] = current
        return {"success": True, "settings": current}

    # --- WebSocket helpers -------------------------------------------------

    def get_ws_payload(self, notification: Notification) -> Dict[str, Any]:
        """Build the exact JSON payload pushed over WebSocket."""
        return {
            "event": "notification",
            "data": notification.to_dict(),
        }

    def get_unread_payload(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Build the unread-count payload for badge updates."""
        return {
            "event": "unread_count",
            "data": self.get_unread_count(user_id),
        }

    # --- Internal helpers --------------------------------------------------

    def _count_unread(self, user_id: Optional[str] = None) -> int:
        count = 0
        for n in self._notifications.values():
            if n.read:
                continue
            if user_id is not None and n.user_id is not None and n.user_id != user_id:
                continue
            count += 1
        return count

    @staticmethod
    def _deep_merge(base: Dict[str, Any], updates: Dict[str, Any]) -> None:
        """Recursively merge *updates* into *base* (mutates base)."""
        for key, val in updates.items():
            if isinstance(val, dict) and key in base and isinstance(base[key], dict):
                NotificationHub._deep_merge(base[key], val)
            else:
                base[key] = val

    # --- Bulk ops / maintenance --------------------------------------------

    def clear_all(self) -> Dict[str, Any]:
        """**Danger** — wipe all notifications (useful in testing)."""
        count = len(self._notifications)
        self._notifications.clear()
        return {"success": True, "cleared": count}

    def cleanup_old(self, max_age_days: int = 30) -> Dict[str, Any]:
        """Remove notifications older than *max_age_days*."""
        cutoff = time.time() - (max_age_days * 86400)
        to_delete = [nid for nid, n in self._notifications.items() if n.created_at < cutoff]
        for nid in to_delete:
            del self._notifications[nid]
        return {"success": True, "removed": len(to_delete)}


# ---------------------------------------------------------------------------
# Quick health-check / self-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    hub = NotificationHub()
    hub.clear_all()

    # Generate sample data
    hub.generate_sample_notifications(user_id="demo-user-001")

    # Print summary
    print("=== LUQI AI Notification Hub ===")
    print(f"Total notifications: {len(hub._notifications)}")
    print(f"Unread count: {hub.get_unread_count('demo-user-001')}")

    # Print all
    for n in hub.get_notifications(user_id="demo-user-001")["notifications"]:
        status = "NEW" if not n["read"] else "read"
        print(f"\n[{status}] {n['title']}")
        print(f"   {n['description'][:80]}...")
        print(f"   {n['time_ago']} | priority={n['priority']} | type={n['type']}")

    # Mark one read
    some_id = list(hub._notifications.keys())[0]
    hub.mark_read(some_id)
    print(f"\n→ Marked {some_id[:8]}... as read")
    print(f"Unread count now: {hub.get_unread_count('demo-user-001')}")
