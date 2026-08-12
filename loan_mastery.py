"""Loan Mastery — Advanced loan management and comparison."""

import json
from typing import Dict, List


class LoanMastery:
    """Advanced loan management system."""

    def __init__(self):
        self.loan_types = {
            "personal": {"rate_range": "10-28%", "max_amount": "R300k", "term": "1-7 years"},
            "home": {"rate_range": "prime - prime+2%", "max_amount": "R10m", "term": "20-30 years"},
            "vehicle": {"rate_range": "prime+1% - prime+5%", "max_amount": "R1.5m", "term": "5-7 years"},
            "student": {"rate_range": "prime+0% - prime+3%", "max_amount": "R500k", "term": "Up to 10 years"},
            "business": {"rate_range": "prime+2% - prime+7%", "max_amount": "R50m", "term": "1-10 years"},
        }

    def compare_products(self, loan_type: str) -> List[Dict]:
        products = {
            "personal": [
                {"bank": "Capitec", "rate": 13.0, "fees": "R69/month"},
                {"bank": "FNB", "rate": 12.75, "fees": "R150 once-off"},
                {"bank": "Standard Bank", "rate": 13.5, "fees": "R100/month"},
            ],
            "home": [
                {"bank": "ABSA", "rate": 10.5, "fees": "R0"},
                {"bank": "Nedbank", "rate": 10.75, "fees": "R0"},
                {"bank": "FNB", "rate": 10.25, "fees": "R0"},
            ],
        }
        return products.get(loan_type.lower(), [])

    def credit_score_impact(self, score: int) -> Dict:
        if score >= 750:
            return {"rating": "Excellent", "rate_discount": "-1% to -2%", "approval_chance": "95%"}
        elif score >= 650:
            return {"rating": "Good", "rate_discount": "0%", "approval_chance": "80%"}
        elif score >= 550:
            return {"rating": "Fair", "rate_discount": "+2% to +3%", "approval_chance": "60%"}
        else:
            return {"rating": "Poor", "rate_discount": "+5% to +8%", "approval_chance": "30%"}

    def debt_consolidation(self, debts: List[Dict]) -> Dict:
        total = sum(d["balance"] for d in debts)
        avg_rate = sum(d["balance"] * d["rate"] for d in debts) / total
        return {
            "total_debt": total,
            "average_rate": round(avg_rate, 2),
            "consolidation_savings_estimate": round(total * (avg_rate - 10) / 100, 2),
            "recommended": avg_rate > 12,
        }


if __name__ == "__main__":
    mastery = LoanMastery()
    print(json.dumps(mastery.compare_products("personal"), indent=2))
    print(json.dumps(mastery.credit_score_impact(720), indent=2))
