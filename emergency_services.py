"""Emergency Services — Emergency contact locator and guide."""

import json
from typing import Dict, List


class EmergencyServices:
    """Emergency services directory for South Africa."""

    def __init__(self):
        self.services = {
            "police": {"number": "10111", "alt": "112"},
            "ambulance": {"number": "10177", "alt": "112"},
            "fire": {"number": "10177", "alt": "112"},
            "rescue": {"number": "10177", "alt": "112"},
            "sea_rescue": {"number": "021-449-3500", "alt": "112"},
            "mountain_rescue": {"number": "021-948-9900", "alt": "112"},
        }
        self.hospitals = [
            {"name": "Chris Hani Baragwanath", "city": "Johannesburg", "type": "public", "er": True},
            {"name": "Groote Schuur", "city": "Cape Town", "type": "public", "er": True},
            {"name": "Steve Biko Academic", "city": "Pretoria", "type": "public", "er": True},
        ]

    def get_emergency_number(self, service: str) -> Dict:
        return self.services.get(service.lower(), {"number": "112", "note": "General emergency"})

    def find_hospital(self, city: str = None, has_er: bool = None) -> List[Dict]:
        results = self.hospitals
        if city:
            results = [h for h in results if city.lower() in h["city"].lower()]
        if has_er is not None:
            results = [h for h in results if h["er"] == has_er]
        return results

    def first_aid_guide(self, situation: str) -> str:
        guides = {
            "burns": "Cool the burn under running water for 20 minutes. Do not apply ice.",
            "choking": "Encourage coughing. If unable to breathe, perform abdominal thrusts.",
            "cpr": "30 compressions : 2 breaths. Push hard and fast in center of chest.",
            "bleeding": "Apply direct pressure with clean cloth. Elevate wound above heart.",
        }
        return guides.get(situation.lower(), "Call 112 immediately.")


if __name__ == "__main__":
    emergency = EmergencyServices()
    print(json.dumps(emergency.get_emergency_number("ambulance"), indent=2))
    print(json.dumps(emergency.find_hospital("Cape Town"), indent=2))
    print(emergency.first_aid_guide("burns"))
