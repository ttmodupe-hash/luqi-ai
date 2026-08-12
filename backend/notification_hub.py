"""Notification Hub - Centralized notification system for LUQI AI v29.1.0"""
import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class NotificationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"
    WEBHOOK = "webhook"


class NotificationPriority(Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class Notification:
    id: str
    user_id: int
    title: str
    message: str
    channel: NotificationChannel
    priority: NotificationPriority
    data: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # 'pending', 'sent', 'delivered', 'failed', 'read'
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    sent_at: Optional[str] = None
    delivered_at: Optional[str] = None
    read_at: Optional[str] = None
    error: Optional[str] = None


class NotificationHub:
    """Centralized notification management system."""

    def __init__(self):
        self.notifications: Dict[str, Notification] = {}
        self._notif_counter = 0
        self._lock = asyncio.Lock()
        self._handlers: Dict[NotificationChannel, Any] = {}

    def register_handler(self, channel: NotificationChannel, handler: Any):
        """Register a notification handler for a channel."""
        self._handlers[channel] = handler

    async def send(
        self,
        user_id: int,
        title: str,
        message: str,
        channel: NotificationChannel = NotificationChannel.IN_APP,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        data: Dict[str, Any] = None,
    ) -> Notification:
        """Send a notification."""
        async with self._lock:
            self._notif_counter += 1
            notif_id = f"notif_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{self._notif_counter:04d}"
            notif = Notification(
                id=notif_id,
                user_id=user_id,
                title=title,
                message=message,
                channel=channel,
                priority=priority,
                data=data or {},
            )
            self.notifications[notif_id] = notif
        
        # Send via appropriate handler
        await self._dispatch(notif)
        return notif

    async def _dispatch(self, notif: Notification):
        """Dispatch notification to the appropriate handler."""
        handler = self._handlers.get(notif.channel)
        if handler:
            try:
                await handler(notif)
                notif.status = "sent"
                notif.sent_at = datetime.utcnow().isoformat()
            except Exception as e:
                notif.status = "failed"
                notif.error = str(e)
        else:
            # Default: mark as sent (in-app notifications don't need external dispatch)
            notif.status = "sent"
            notif.sent_at = datetime.utcnow().isoformat()

    async def mark_delivered(self, notif_id: str):
        """Mark a notification as delivered."""
        notif = self.notifications.get(notif_id)
        if notif:
            notif.status = "delivered"
            notif.delivered_at = datetime.utcnow().isoformat()

    async def mark_read(self, notif_id: str):
        """Mark a notification as read."""
        notif = self.notifications.get(notif_id)
        if notif:
            notif.status = "read"
            notif.read_at = datetime.utcnow().isoformat()

    def get_user_notifications(
        self,
        user_id: int,
        status: str = None,
        channel: NotificationChannel = None,
        limit: int = 100,
    ) -> List[Notification]:
        """Get notifications for a user."""
        notifs = [n for n in self.notifications.values() if n.user_id == user_id]
        if status:
            notifs = [n for n in notifs if n.status == status]
        if channel:
            notifs = [n for n in notifs if n.channel == channel]
        notifs.sort(key=lambda x: x.created_at, reverse=True)
        return notifs[:limit]

    def get_unread_count(self, user_id: int) -> int:
        """Get unread notification count for a user."""
        return sum(
            1 for n in self.notifications.values()
            if n.user_id == user_id and n.status in ("pending", "sent", "delivered")
        )

    async def broadcast(
        self,
        user_ids: List[int],
        title: str,
        message: str,
        channel: NotificationChannel = NotificationChannel.IN_APP,
        priority: NotificationPriority = NotificationPriority.NORMAL,
    ) -> List[Notification]:
        """Broadcast a notification to multiple users."""
        tasks = [
            self.send(uid, title, message, channel, priority)
            for uid in user_ids
        ]
        return await asyncio.gather(*tasks)

    def get_stats(self) -> Dict[str, Any]:
        """Get notification statistics."""
        notifs = list(self.notifications.values())
        return {
            "total": len(notifs),
            "pending": sum(1 for n in notifs if n.status == "pending"),
            "sent": sum(1 for n in notifs if n.status == "sent"),
            "delivered": sum(1 for n in notifs if n.status == "delivered"),
            "read": sum(1 for n in notifs if n.status == "read"),
            "failed": sum(1 for n in notifs if n.status == "failed"),
            "by_channel": {
                ch.value: sum(1 for n in notifs if n.channel == ch)
                for ch in NotificationChannel
            },
        }


# Global hub instance
notification_hub = NotificationHub()
