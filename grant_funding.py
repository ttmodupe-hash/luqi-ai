"""Grant Funding — Grant and funding opportunity engine."""

import json
from typing import Dict, List


class GrantFunding:
    """Grant funding discovery and management."""

    def __init__(self):
        self.grants = [
            {"name": "NSFAS", "type": "education", "amount": "Full funding", "deadline": "2025-01-31", "target": "students"},
            {"name": "NYDA Grant", "type": "youth", "amount": "R50k - R200k", "deadline": "2025-03-15", "target": "youth_entrepreneurs"},
            {"name": "SIOC-CDT", "type": "community", "amount": "Varies", "deadline": "Rolling", "target": "mining_communities"},
            {"name": "Masisizane Fund", "type": "agriculture", "amount": "R500k - R5m", "deadline": "2025-02-28", "target": "farmers"},
        ]

    def search_grants(self, target: str = None, grant_type: str = None) -> List[Dict]:
        results = self.grants
        if target:
            results = [g for g in results if target.lower() in g["target"].lower()]
        if grant_type:
            results = [g for g in results if g["type"].lower() == grant_type.lower()]
        return results

    def get_grant_details(self, name: str) -> Dict:
        return next((g for g in self.grants if g["name"].lower() == name.lower()), {"error": "Grant not found"})

    def application_checklist(self, grant_name: str) -> List[str]:
        return [
            "Business registration documents",
            "B-BBEE certificate",
            "Financial statements (2 years)",
            "Business plan",
            "Tax clearance certificate",
            "ID documents of directors",
        ]

    def deadline_reminder(self, days_ahead: int = 30) -> List[Dict]:
        from datetime import datetime, timedelta
        cutoff = datetime.now() + timedelta(days=days_ahead)
        # Simplified - in production, parse actual dates
        return [g for g in self.grants if g["deadline"] != "Rolling"]


if __name__ == "__main__":
    grants = GrantFunding()
    print(json.dumps(grants.search_grants(target="students"), indent=2))
    print(json.dumps(grants.get_grant_details("NSFAS"), indent=2))
