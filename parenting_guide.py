"""Parenting Guide — Parenting and child development guide."""

import json
from typing import Dict, List


class ParentingGuide:
    """Parenting support and child development guide."""

    def __init__(self):
        self.milestones = {
            "0-3_months": ["Smiles", "Tracks objects", "Lifts head"],
            "4-6_months": ["Rolls over", "Babbles", "Sits with support"],
            "7-12_months": ["Crawls", "Says first words", "Stands"],
            "1-2_years": ["Walks", "2-word phrases", "Follows instructions"],
            "3-5_years": ["Counts to 10", "Draws shapes", "Plays with others"],
        }
        self.vaccines = [
            {"age": "Birth", "vaccine": "BCG, OPV"},
            {"age": "6 weeks", "vaccine": "DTaP-IPV-Hib-HBV, PCV, Rotavirus"},
            {"age": "10 weeks", "vaccine": "DTaP-IPV-Hib-HBV, PCV, Rotavirus"},
            {"age": "14 weeks", "vaccine": "DTaP-IPV-Hib-HBV, PCV"},
            {"age": "9 months", "vaccine": "Measles"},
            {"age": "12 months", "vaccine": "Measles, MenA"},
        ]

    def get_milestones(self, age_group: str) -> List[str]:
        return self.milestones.get(age_group.lower().replace(" ", "_"), [])

    def get_vaccines(self, age: str = None) -> List[Dict]:
        if age:
            return [v for v in self.vaccines if v["age"].lower() == age.lower()]
        return self.vaccines

    def nutrition_guide(self, age_months: int) -> Dict:
        if age_months < 6:
            return {"recommendation": "Exclusive breastfeeding", "foods": ["Breast milk / Formula"]}
        elif age_months < 12:
            return {"recommendation": "Breastfeeding + complementary foods", "foods": ["Pap", "Pureed vegetables", "Fruit"]}
        else:
            return {"recommendation": "Family foods", "foods": ["Balanced diet", "Iron-rich foods", "Dairy"]}

    def discipline_tips(self, age_group: str) -> List[str]:
        tips = {
            "toddler": ["Redirect attention", "Simple explanations", "Consistent routines"],
            "preschool": ["Time-outs", "Positive reinforcement", "Clear boundaries"],
            "school_age": ["Natural consequences", "Problem-solving together", "Open communication"],
        }
        return tips.get(age_group.lower(), ["Consult parenting resources"])


if __name__ == "__main__":
    guide = ParentingGuide()
    print(json.dumps(guide.get_milestones("1-2_years"), indent=2))
    print(json.dumps(guide.get_vaccines("6 weeks"), indent=2))
    print(json.dumps(guide.nutrition_guide(8), indent=2))
