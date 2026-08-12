"""Tender Assistant — Government tender discovery and assistance."""

import json
from typing import Dict, List


class TenderAssistant:
    """Government tender discovery and application assistant."""

    def __init__(self):
        self.tenders = [
            {"id": "T001", "department": "Public Works", "title": "Office Furniture", "value": 500000, "closing": "2025-01-15", "category": "goods"},
            {"id": "T002", "department": "Health", "title": "Medical Supplies", "value": 2000000, "closing": "2025-02-01", "category": "goods"},
            {"id": "T003", "department": "Education", "title": "School Renovation", "value": 5000000, "closing": "2025-03-01", "category": "construction"},
        ]

    def search(self, category: str = None, department: str = None, max_value: float = None) -> List[Dict]:
        results = self.tenders
        if category:
            results = [t for t in results if t["category"].lower() == category.lower()]
        if department:
            results = [t for t in results if department.lower() in t["department"].lower()]
        if max_value:
            results = [t for t in results if t["value"] <= max_value]
        return results

    def get_tender(self, tender_id: str) -> Dict:
        return next((t for t in self.tenders if t["id"] == tender_id), {"error": "Tender not found"})

    def application_checklist(self) -> List[str]:
        return [
            "Company registration documents",
            "B-BBEE certificate",
            "Tax clearance certificate",
            "CIDB registration (for construction)",
            "Banking details",
            "Reference letters",
            "Completed bid document",
        ]

    def eligibility_check(self, business_profile: Dict, tender: Dict) -> Dict:
        required_turnover = tender["value"] * 2  # Typically 2x tender value
        meets_turnover = business_profile.get("annual_turnover", 0) >= required_turnover
        return {
            "tender": tender["id"],
            "meets_turnover": meets_turnover,
            "required_turnover": required_turnover,
            "eligible": meets_turnover,
        }

    def compliance_reminders(self) -> List[str]:
        return [
            "Ensure CIPC annual returns are up to date",
            "Verify B-BBEE certificate validity",
            "Update tax clearance certificate",
            "Check CIDB grade matches tender requirements",
        ]


if __name__ == "__main__":
    tender = TenderAssistant()
    print(json.dumps(tender.search(category="goods"), indent=2))
    print(json.dumps(tender.get_tender("T001"), indent=2))
    print(tender.application_checklist())
