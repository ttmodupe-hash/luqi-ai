"""Email Notifier — Email notification service with templates."""

import json
from typing import Dict, List


class EmailNotifier:
    """Email notification dispatcher."""

    def __init__(self):
        self.templates = {}
        self.queue = []

    def register_template(self, name: str, subject: str, body: str):
        self.templates[name] = {"subject": subject, "body": body}

    def send(self, to: str, template: str, variables: Dict = None) -> Dict:
        t = self.templates.get(template, {"subject": "Notification", "body": ""})
        body = t["body"]
        if variables:
            for k, v in variables.items():
                body = body.replace(f"{{{k}}}", str(v))
        entry = {
            "to": to,
            "subject": t["subject"],
            "body": body,
            "status": "queued",
        }
        self.queue.append(entry)
        return entry

    def get_queue(self) -> List[Dict]:
        return self.queue

    def clear_queue(self):
        self.queue = []


if __name__ == "__main__":
    notifier = EmailNotifier()
    notifier.register_template("welcome", "Welcome!", "Hi {name}, welcome to Omega AI!")
    print(notifier.send("user@example.com", "welcome", {"name": "John"}))
