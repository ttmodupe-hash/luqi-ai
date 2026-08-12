"""Reminders — Reminder and alert management."""

import json
from datetime import datetime
from typing import Dict, List


class Reminders:
    """Reminder and alert management system."""

    def __init__(self):
        self.reminders = []

    def add(self, message: str, trigger_time: str, repeat: str = None) -> Dict:
        reminder = {
            "id": len(self.reminders) + 1,
            "message": message,
            "trigger_time": trigger_time,
            "repeat": repeat,
            "status": "active",
        }
        self.reminders.append(reminder)
        return reminder

    def get_due(self) -> List[Dict]:
        now = datetime.now().isoformat()
        return [r for r in self.reminders if r["trigger_time"] <= now and r["status"] == "active"]

    def complete(self, reminder_id: int) -> bool:
        reminder = next((r for r in self.reminders if r["id"] == reminder_id), None)
        if reminder:
            reminder["status"] = "completed"
            return True
        return False

    def delete(self, reminder_id: int) -> bool:
        self.reminders = [r for r in self.reminders if r["id"] != reminder_id]
        return True

    def get_all(self) -> List[Dict]:
        return self.reminders

    def snooze(self, reminder_id: int, minutes: int = 10) -> Dict:
        reminder = next((r for r in self.reminders if r["id"] == reminder_id), None)
        if reminder:
            # Simple time addition - in production use proper datetime math
            reminder["trigger_time"] = f"Snoozed +{minutes}min"
            return reminder
        return {"error": "Reminder not found"}


if __name__ == "__main__":
    rem = Reminders()
    rem.add("Take medicine", "2024-12-25T08:00:00")
    rem.add("Meeting with team", "2024-12-25T10:00:00")
    print(json.dumps(rem.get_all(), indent=2))
