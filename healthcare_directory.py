"""Healthcare Directory — Medical facilities and practitioners directory."""

import json
from typing import Dict, List


class HealthcareDirectory:
    """Healthcare facilities directory."""

    def __init__(self):
        self.facilities = [
            {"name": "Chris Hani Baragwanath", "type": "hospital", "city": "Johannesburg", "specialties": ["general", "trauma"], "public": True},
            {"name": "Groote Schuur", "type": "hospital", "city": "Cape Town", "specialties": ["general", "cardiology", "neurosurgery"], "public": True},
            {"name": "Netcare Christiaan Barnard", "type": "hospital", "city": "Cape Town", "specialties": ["cardiology", "oncology"], "public": False},
            {"name": "Life Eugene Marais", "type": "hospital", "city": "Pretoria", "specialties": ["general", "maternity"], "public": False},
        ]
        self.practitioners = [
            {"name": "Dr. Smith", "specialty": "cardiology", "city": "Johannesburg", "language": "English"},
            {"name": "Dr. Nkosi", "specialty": "pediatrics", "city": "Durban", "language": "isiZulu"},
        ]

    def find_facility(self, city: str = None, specialty: str = None, public: bool = None) -> List[Dict]:
        results = self.facilities
        if city:
            results = [f for f in results if city.lower() in f["city"].lower()]
        if specialty:
            results = [f for f in results if specialty.lower() in [s.lower() for s in f["specialties"]]]
        if public is not None:
            results = [f for f in results if f["public"] == public]
        return results

    def find_practitioner(self, specialty: str = None, city: str = None) -> List[Dict]:
        results = self.practitioners
        if specialty:
            results = [p for p in results if p["specialty"].lower() == specialty.lower()]
        if city:
            results = [p for p in results if city.lower() in p["city"].lower()]
        return results

    def emergency_numbers(self) -> Dict:
        return {
            "ambulance": "10177",
            "police": "10111",
            "fire": "10177",
            "general": "112",
        }


if __name__ == "__main__":
    directory = HealthcareDirectory()
    print(json.dumps(directory.find_facility("Cape Town", "cardiology"), indent=2))
    print(json.dumps(directory.find_practitioner("pediatrics"), indent=2))
