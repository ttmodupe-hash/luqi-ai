"""Key Rotation — Automated encryption key rotation system."""

import json
from datetime import datetime, timedelta
from typing import Dict, List


class KeyRotation:
    """Automated key rotation management."""

    def __init__(self):
        self.keys = []
        self.rotation_interval_days = 90

    def generate_key(self, name: str, key_type: str = "AES-256") -> Dict:
        import secrets
        key = secrets.token_hex(32)
        entry = {
            "name": name,
            "key": key,
            "type": key_type,
            "created": datetime.now().isoformat(),
            "expires": (datetime.now() + timedelta(days=self.rotation_interval_days)).isoformat(),
            "status": "active",
        }
        self.keys.append(entry)
        return entry

    def rotate_key(self, name: str) -> Dict:
        old = next((k for k in self.keys if k["name"] == name and k["status"] == "active"), None)
        if old:
            old["status"] = "retired"
            old["retired_at"] = datetime.now().isoformat()
        return self.generate_key(name, old["type"] if old else "AES-256")

    def get_active_keys(self) -> List[Dict]:
        return [k for k in self.keys if k["status"] == "active"]

    def check_expiry(self) -> List[Dict]:
        now = datetime.now()
        expiring = []
        for k in self.keys:
            if k["status"] == "active":
                expiry = datetime.fromisoformat(k["expires"])
                if expiry - now < timedelta(days=7):
                    expiring.append(k)
        return expiring

    def audit_log(self) -> List[Dict]:
        return sorted(self.keys, key=lambda x: x["created"], reverse=True)


if __name__ == "__main__":
    kr = KeyRotation()
    kr.generate_key("api_key")
    print(json.dumps(kr.get_active_keys(), indent=2))
    print(json.dumps(kr.check_expiry(), indent=2))
