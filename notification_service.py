"""Notification Service — Multi-channel notification dispatcher."""

import json
from typing import Dict, List


class NotificationService:
    """Multi-channel notification service."""

    def __init__(self):
        self.channels = {
            "email": True,
            "sms": True,
            "push": True,
            "webhook": True,
        }
        self.preferences = {}
        self.history = []

    def set_preferences(self, user_id: str, channels: List[str]):
        self.preferences[user_id] = channels

    def send(self, user_id: str, message: str, priority: str = "normal") -> Dict:
        channels = self.preferences.get(user_id, ["email"])
        results = []
        for ch in channels:
            if self.channels.get(ch, False):
                results.append({"channel": ch, "status": "sent", "message": message})
                self.history.append({
                    "user": user_id,
                    "channel": ch,
                    "message": message,
                    "priority": priority,
                    "status": "sent",
                })
            else:
                results.append({"channel": ch, "status": "failed", "reason": "Channel disabled"})
        return {"user": user_id, "results": results}

    def get_history(self, user_id: str = None) -> List[Dict]:
        if user_id:
            return [h for h in self.history if h["user"] == user_id]
        return self.history

    def broadcast(self, message: str, priority: str = "normal") -> List[Dict]:
        results = []
        for user_id in self.preferences:
            results.append(self.send(user_id, message, priority))
        return results


if __name__ == "__main__":
    ns = NotificationService()
    ns.set_preferences("user1", ["email", "push"])
    print(json.dumps(ns.send("user1", "Welcome to Omega AI!"), indent=2))
    print(json.dumps(ns.get_history("user1"), indent=2))
