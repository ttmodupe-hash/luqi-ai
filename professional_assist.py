"""Professional Assist — Professional services directory."""

import json
from typing import Dict, List


class ProfessionalAssist:
    """Professional services directory for South Africa."""

    def __init__(self):
        self.professionals = [
            {"name": "Dr. Sarah Nkosi", "profession": "doctor", "specialty": "cardiology", "city": "Johannesburg", "language": "English, isiZulu"},
            {"name": "Adv. Thabo Mokoena", "profession": "lawyer", "specialty": "corporate", "city": "Pretoria", "language": "English, Sepedi"},
            {"name": "Mr. James Peters", "profession": "accountant", "specialty": "tax", "city": "Cape Town", "language": "English, Afrikaans"},
            {"name": "Ms. Lindiwe Dlamini", "profession": "architect", "specialty": "residential", "city": "Durban", "language": "English, isiZulu"},
        ]

    def find(self, profession: str = None, city: str = None, specialty: str = None) -> List[Dict]:
        results = self.professionals
        if profession:
            results = [p for p in results if p["profession"].lower() == profession.lower()]
        if city:
            results = [p for p in results if city.lower() in p["city"].lower()]
        if specialty:
            results = [p for p in results if specialty.lower() in p["specialty"].lower()]
        return results

    def verify_credentials(self, name: str) -> Dict:
        # Placeholder for actual credential verification
        return {"name": name, "verified": True, "registrations": ["HPCSA", "SARS"], "note": "Always verify independently"}

    def fee_guide(self, profession: str) -> Dict:
        fees = {
            "doctor": {"consultation": "R400-800", "procedure": "Varies"},
            "lawyer": {"consultation": "R1500-5000/hr", "case": "Varies"},
            "accountant": {"consultation": "R800-2000/hr", "tax_return": "R500-3000"},
            "architect": {"consultation": "R1000-3000/hr", "design": "5-15% of project"},
        }
        return fees.get(profession.lower(), {"note": "Contact professional for quote"})


if __name__ == "__main__":
    prof = ProfessionalAssist()
    print(json.dumps(prof.find(profession="doctor", city="Johannesburg"), indent=2))
    print(json.dumps(prof.fee_guide("lawyer"), indent=2))
