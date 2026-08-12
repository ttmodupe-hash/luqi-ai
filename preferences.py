"""Preferences — User preference management."""

import json
import os
from typing import Any, Dict


class Preferences:
    """User preference management system."""

    def __init__(self, path: str = "data/preferences.json"):
        self.path = path
        self.prefs = {}
        self.load()

    def load(self):
        if os.path.exists(self.path):
            with open(self.path, "r") as f:
                self.prefs = json.load(f)

    def save(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "w") as f:
            json.dump(self.prefs, f, indent=2)

    def get(self, key: str, default: Any = None) -> Any:
        return self.prefs.get(key, default)

    def set(self, key: str, value: Any):
        self.prefs[key] = value
        self.save()

    def delete(self, key: str) -> bool:
        if key in self.prefs:
            del self.prefs[key]
            self.save()
            return True
        return False

    def get_all(self) -> Dict:
        return self.prefs

    def reset(self):
        self.prefs = {}
        self.save()


if __name__ == "__main__":
    prefs = Preferences()
    prefs.set("theme", "dark")
    prefs.set("language", "en")
    print(json.dumps(prefs.get_all(), indent=2))
    print(prefs.get("theme"))
    prefs.delete("theme")
    print(json.dumps(prefs.get_all(), indent=2))
