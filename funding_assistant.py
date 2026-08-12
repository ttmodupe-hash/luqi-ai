"""Funding Assistant — Business funding and grant discovery."""

import json
from typing import Dict, List


class FundingAssistant:
    """Business funding and grant assistant."""

    def __init__(self):
        self.funding_sources = [
            {
                "name": "DTIC Funding",
                "type": "government",
                "sectors": ["manufacturing", "technology", "agriculture"],
                "amount": "R500k - R50m",
                "requirements": ["B-BBEE certificate", "Business plan", "Financial statements"],
            },
            {
                "name": "SEFA",
                "type": "government",
                "sectors": ["smme", "cooperative"],
                "amount": "R50k - R5m",
                "requirements": ["Registration documents", "Feasibility study"],
            },
            {
                "name": "IDC",
                "type": "development",
                "sectors": ["mining", "industrial", "energy"],
                "amount": "R1m - R1b",
                "requirements": ["Environmental impact assessment", "Business plan"],
            },
            {
                "name": "NEF",
                "type": "empowerment",
                "sectors": ["all"],
                "amount": "R250k - R50m",
                "requirements": ["B-BBEE level 1-3", "Black ownership > 50%"],
            },
        ]

    def search_funding(self, sector: str = None, amount_needed: float = None) -> List[Dict]:
        results = self.funding_sources
        if sector:
            results = [f for f in results if sector.lower() in [s.lower() for s in f["sectors"]] or "all" in [s.lower() for s in f["sectors"]]]
        return results

    def eligibility_check(self, source_name: str, business_profile: Dict) -> Dict:
        source = next((f for f in self.funding_sources if f["name"].lower() == source_name.lower()), None)
        if not source:
            return {"eligible": False, "reason": "Funding source not found"}
        missing = [r for r in source["requirements"] if r.lower() not in str(business_profile).lower()]
        return {
            "eligible": len(missing) == 0,
            "missing_requirements": missing,
            "source": source["name"],
        }

    def application_guide(self, source_name: str) -> List[str]:
        return [
            "1. Prepare business plan and financial projections",
            "2. Gather required documentation",
            "3. Complete online application",
            "4. Submit supporting documents",
            "5. Await assessment (4-8 weeks)",
        ]


if __name__ == "__main__":
    funding = FundingAssistant()
    print(json.dumps(funding.search_funding("technology"), indent=2))
    print(json.dumps(funding.eligibility_check("SEFA", {"B-BBEE": "level 2"}), indent=2))
