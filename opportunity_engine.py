"""Opportunity Engine — Business and career opportunity finder."""

import json
from typing import Dict, List


class OpportunityEngine:
    """Opportunity discovery and matching engine."""

    def __init__(self):
        self.opportunities = []

    def add_opportunity(self, title: str, type: str, sector: str, requirements: List[str], location: str) -> Dict:
        opp = {
            "id": len(self.opportunities) + 1,
            "title": title,
            "type": type,
            "sector": sector,
            "requirements": requirements,
            "location": location,
            "status": "open",
        }
        self.opportunities.append(opp)
        return opp

    def search(self, sector: str = None, type: str = None, location: str = None) -> List[Dict]:
        results = self.opportunities
        if sector:
            results = [o for o in results if o["sector"].lower() == sector.lower()]
        if type:
            results = [o for o in results if o["type"].lower() == type.lower()]
        if location:
            results = [o for o in results if location.lower() in o["location"].lower()]
        return results

    def match_profile(self, profile: Dict) -> List[Dict]:
        matches = []
        for opp in self.opportunities:
            score = 0
            for req in opp["requirements"]:
                if any(req.lower() in skill.lower() for skill in profile.get("skills", [])):
                    score += 1
            if score > 0:
                matches.append({"opportunity": opp, "match_score": score / len(opp["requirements"])})
        return sorted(matches, key=lambda x: x["match_score"], reverse=True)

    def trending_opportunities(self) -> List[Dict]:
        sectors = {}
        for opp in self.opportunities:
            sectors[opp["sector"]] = sectors.get(opp["sector"], 0) + 1
        return [{"sector": k, "count": v} for k, v in sorted(sectors.items(), key=lambda x: x[1], reverse=True)]


if __name__ == "__main__":
    engine = OpportunityEngine()
    engine.add_opportunity("AI Developer", "job", "technology", ["Python", "ML", "TensorFlow"], "Johannesburg")
    engine.add_opportunity("Grant Writer", "contract", "non-profit", ["Writing", "Research"], "Cape Town")
    print(json.dumps(engine.search(sector="technology"), indent=2))
    print(json.dumps(engine.match_profile({"skills": ["Python", "ML"]}), indent=2))
