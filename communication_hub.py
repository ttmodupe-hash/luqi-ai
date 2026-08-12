"""Communication Hub — Unified messaging across channels."""

import json
from typing import Dict, List


class CommunicationHub:
    """Central communication dispatcher."""

    def __init__(self):
        self.channels = {
            "email": True,
            "sms": True,
            "telegram": True,
            "whatsapp": True,
            "push": True,
        }
        self.history: List[Dict] = []

    def send(self, channel: str, recipient: str, message: str, metadata: Dict = None) -> Dict:
        if not self.channels.get(channel, False):
            return {"status": "error", "reason": f"Channel {channel} disabled"}

        entry = {
            "channel": channel,
            "recipient": recipient,
            "message": message,
            "metadata": metadata or {},
            "status": "sent",
        }
        self.history.append(entry)
        return {"status": "ok", "message_id": f"{channel}_{len(self.history)}"}

    def broadcast(self, channels: List[str], recipients: List[str], message: str) -> List[Dict]:
        results = []
        for ch in channels:
            for rec in recipients:
                results.append(self.send(ch, rec, message))
        return results

    def get_history(self, channel: str = None) -> List[Dict]:
        if channel:
            return [h for h in self.history if h["channel"] == channel]
        return self.history

    def enable_channel(self, channel: str):
        self.channels[channel] = True

    def disable_channel(self, channel: str):
        self.channels[channel] = False


if __name__ == "__main__":
    hub = CommunicationHub()
    print(hub.send("email", "user@example.com", "Hello!"))
    print(json.dumps(hub.broadcast(["email", "sms"], ["user1", "user2"], "Alert!"), indent=2))
