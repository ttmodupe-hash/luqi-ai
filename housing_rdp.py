"""Housing & RDP — Housing and RDP information guide."""

import json
from typing import Dict, List


class HousingRDP:
    """Housing and RDP (Reconstruction and Development Programme) guide."""

    def __init__(self):
        self.rdp_criteria = {
            "income_threshold": 3500,  # ZAR per month
            "citizenship": "South African citizen",
            "age": "18+",
            "first_time": "Must not own property",
            "married": "Single or married (once per household)",
        }
        self.housing_types = [
            {"type": "RDP House", "size": "40-60m²", "features": ["2 bedrooms", "kitchen", "bathroom"], "cost": "Free (government subsidized)"},
            {"type": "FLISP", "size": "Varies", "features": ["Subsidized bond"], "cost": "R0-R300k subsidy"},
            {"type": "GAP Housing", "size": "Varies", "features": ["Affordable rental"], "cost": "R1500-R6000/month"},
        ]

    def check_eligibility(self, income: float, owns_property: bool, age: int) -> Dict:
        eligible = (
            income <= self.rdp_criteria["income_threshold"] and
            not owns_property and
            age >= 18
        )
        return {
            "eligible": eligible,
            "criteria": self.rdp_criteria,
            "next_steps": ["Apply at municipality", "Submit ID and proof of income"] if eligible else ["Consider FLISP or private options"],
        }

    def application_process(self) -> List[str]:
        return [
            "1. Register on the housing waiting list at your municipality",
            "2. Submit required documents (ID, proof of income, marriage certificate if applicable)",
            "3. Attend verification interview",
            "4. Wait for allocation (varies by municipality)",
            "5. Sign lease agreement or title deed",
        ]

    def find_developments(self, province: str) -> List[Dict]:
        developments = [
            {"name": "Cosmo City", "province": "Gauteng", "units": 15000, "status": "completed"},
            {"name": "Joe Slovo", "province": "Western Cape", "units": 3000, "status": "in_progress"},
            {"name": "N2 Gateway", "province": "Western Cape", "units": 20000, "status": "completed"},
        ]
        return [d for d in developments if d["province"].lower() == province.lower()]


if __name__ == "__main__":
    housing = HousingRDP()
    print(json.dumps(housing.check_eligibility(3000, False, 25), indent=2))
    print(json.dumps(housing.find_developments("Gauteng"), indent=2))
