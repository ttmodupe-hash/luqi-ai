"""Personal Assistant — Personal productivity and task management."""

import json
from typing import Dict, List


class PersonalAssistant:
    """Personal productivity assistant."""

    def __init__(self):
        self.tasks = []
        self.reminders = []
        self.notes = []

    def add_task(self, title: str, due: str = None, priority: str = "medium") -> Dict:
        task = {
            "id": len(self.tasks) + 1,
            "title": title,
            "due": due,
            "priority": priority,
            "status": "pending",
        }
        self.tasks.append(task)
        return task

    def complete_task(self, task_id: int) -> bool:
        task = next((t for t in self.tasks if t["id"] == task_id), None)
        if task:
            task["status"] = "completed"
            return True
        return False

    def get_tasks(self, status: str = None) -> List[Dict]:
        if status:
            return [t for t in self.tasks if t["status"] == status]
        return self.tasks

    def add_reminder(self, message: str, time: str) -> Dict:
        reminder = {"id": len(self.reminders) + 1, "message": message, "time": time}
        self.reminders.append(reminder)
        return reminder

    def add_note(self, content: str, tags: List[str] = None) -> Dict:
        note = {"id": len(self.notes) + 1, "content": content, "tags": tags or []}
        self.notes.append(note)
        return note

    def search_notes(self, query: str) -> List[Dict]:
        return [n for n in self.notes if query.lower() in n["content"].lower()]

    def daily_summary(self) -> Dict:
        pending = len([t for t in self.tasks if t["status"] == "pending"])
        return {
            "pending_tasks": pending,
            "total_tasks": len(self.tasks),
            "reminders_today": len(self.reminders),
            "notes": len(self.notes),
        }


if __name__ == "__main__":
    pa = PersonalAssistant()
    pa.add_task("Buy groceries", priority="high")
    pa.add_task("Call mom", due="2024-12-25")
    pa.add_note("Ideas for project: AI assistant")
    print(json.dumps(pa.get_tasks(), indent=2))
    print(json.dumps(pa.daily_summary(), indent=2))
