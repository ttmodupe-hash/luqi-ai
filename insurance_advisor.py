"""Insurance Advisor — Insurance product comparison and advice."""

import json
from typing import Dict, List


class InsuranceAdvisor:
    """Insurance comparison and advisory engine."""

    def __init__(self):
        self.products = {
            "life": [
                {"provider": "Old Mutual", "premium": 500, "cover": 1000000, "features": ["terminal illness", "disability"]},
                {"provider": "Discovery", "premium": 650, "cover": 1500000, "features": ["vitality discounts", "chronic illness"]},
            ],
            "car": [
                {"provider": "MiWay", "premium": 800, "cover": "comprehensive", "excess": 5000},
                {"provider": "OUTsurance", "premium": 950, "cover": "comprehensive", "excess": 3500},
            ],
            "home": [
                {"provider": "Santam", "premium": 400, "cover": 500000, "features": ["burglary", "fire", "flood"]},
                {"provider": "Hollard", "premium": 350, "cover": 400000, "features": ["burglary", "fire"]},
            ],
            "health": [
                {"provider": "Discovery Health", "premium": 3500, "cover": "comprehensive", "network": "extensive"},
                {"provider": "Bonitas", "premium": 2800, "cover": "comprehensive", "network": "national"},
            ],
        }

    def compare(self, insurance_type: str) -> List[Dict]:
        return self.products.get(insurance_type.lower(), [])

    def recommend(self, age: int, income: float, dependents: int = 0) -> Dict:
        if income < 15000:
            return {"recommendation": "Hospital plan + basic life cover", "budget": "R500-1000/month"}
        elif income < 50000:
            return {"recommendation": "Comprehensive medical aid + life + disability", "budget": "R2000-5000/month"}
        else:
            return {"recommendation": "Premium cover with savings component", "budget": "R5000+/month"}

    def calculate_premium(self, age: int, cover_amount: float, risk_factors: List[str] = None) -> float:
        base = cover_amount * 0.0005
        age_factor = 1 + (age - 30) * 0.02 if age > 30 else 1
        risk = 1 + len(risk_factors or []) * 0.1
        return base * age_factor * risk


if __name__ == "__main__":
    insurance = InsuranceAdvisor()
    print(json.dumps(insurance.compare("life"), indent=2))
    print(json.dumps(insurance.recommend(35, 30000, 2), indent=2))
