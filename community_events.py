"""Community Events — Local event discovery and management."""

import json
from datetime import datetime
from typing import Dict, List


class CommunityEvents:
    """Community events engine."""

    def __init__(self):
        self.events: List[Dict] = []

    def add_event(self, title: str, date: str, location: str, category: str = "general") -> Dict:
        event = {
            "id": len(self.events) + 1,
            "title": title,
            "date": date,
            "location": location,
            "category": category,
            "created": datetime.now().isoformat(),
        }
        self.events.append(event)
        return event

    def find_events(self, location: str = None, category: str = None) -> List[Dict]:
        results = self.events
        if location:
            results = [e for e in results if location.lower() in e["location"].lower()]
        if category:
            results = [e for e in results if e["category"] == category]
        return results

    def upcoming(self, days: int = 7) -> List[Dict]:
        now = datetime.now()
        return [
            e for e in self.events
            if (datetime.fromisoformat(e["date"]) - now).days <= days
        ]


if __name__ == "__main__":
    events = CommunityEvents()
    events.add_event("Tech Meetup", "2025-02-15", "Johannesburg", "technology")
    events.add_event("Farmers Market", "2025-02-20", "Pretoria", "agriculture")
    print(json.dumps(events.find_events(location="Johannesburg"), indent=2))
