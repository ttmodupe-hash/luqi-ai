"""Education Data — Educational statistics and data platform."""

import json
from typing import Dict, List


class EducationData:
    """Educational data and statistics platform."""

    def __init__(self):
        self.datasets = {
            "matric_results": {
                "2024": {"pass_rate": 82.9, "distinctions": 250000, "total_candidates": 720000},
                "2023": {"pass_rate": 81.3, "distinctions": 230000, "total_candidates": 710000},
            },
            "schools": {
                "total": 25000,
                "public": 23000,
                "private": 2000,
            },
        }

    def get_matric_results(self, year: str = "2024") -> Dict:
        return self.datasets["matric_results"].get(year, {"error": "Year not available"})

    def school_finding(self, province: str, type: str = "public") -> List[Dict]:
        schools = [
            {"name": "Grey High School", "province": "Eastern Cape", "type": "public", "rating": 9.2},
            {"name": "Herschel Girls School", "province": "Western Cape", "type": "private", "rating": 9.5},
            {"name": "St. John's College", "province": "Gauteng", "type": "private", "rating": 9.3},
        ]
        return [s for s in schools if s["province"].lower() == province.lower() and s["type"] == type]

    def bursary_finder(self, field: str = "engineering") -> List[Dict]:
        bursaries = [
            {"name": "NSFAS", "field": "all", "amount": "Full funding", "deadline": "2025-01-31"},
            {"name": "Funza Lushaka", "field": "education", "amount": "Full funding", "deadline": "2025-02-15"},
            {"name": "Sefako Makgatho Bursary", "field": "health", "amount": "R50000", "deadline": "2025-03-01"},
        ]
        return [b for b in bursaries if field.lower() in b["field"].lower() or b["field"] == "all"]


if __name__ == "__main__":
    edu = EducationData()
    print(json.dumps(edu.get_matric_results(), indent=2))
    print(json.dumps(edu.school_finding("Western Cape", "private"), indent=2))
    print(json.dumps(edu.bursary_finder("engineering"), indent=2))
