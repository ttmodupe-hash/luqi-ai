"""Tax Engine — General tax calculation engine."""

import json
from typing import Dict, List


class TaxEngine:
    """General tax calculation engine."""

    def __init__(self):
        self.rules = {}

    def add_rule(self, name: str, brackets: List[Dict]):
        self.rules[name] = brackets

    def calculate(self, rule_name: str, income: float) -> Dict:
        brackets = self.rules.get(rule_name, [])
        if not brackets:
            return {"error": "Rule not found"}
        tax = 0
        for bracket in brackets:
            if income > bracket["min"]:
                taxable = min(income, bracket.get("max", float("inf"))) - bracket["min"]
                tax += taxable * bracket["rate"]
        return {
            "rule": rule_name,
            "income": income,
            "tax": round(tax, 2),
            "effective_rate": round(tax / income * 100, 2) if income > 0 else 0,
        }

    def compare_rules(self, income: float, rules: List[str]) -> List[Dict]:
        results = []
        for rule in rules:
            results.append(self.calculate(rule, income))
        return sorted(results, key=lambda x: x["tax"])

    def net_income(self, rule_name: str, income: float, deductions: float = 0) -> Dict:
        taxable = max(0, income - deductions)
        calc = self.calculate(rule_name, taxable)
        return {
            "gross_income": income,
            "deductions": deductions,
            "taxable_income": taxable,
            "tax": calc["tax"],
            "net_income": round(taxable - calc["tax"], 2),
        }


if __name__ == "__main__":
    engine = TaxEngine()
    engine.add_rule("sa_2024", [
        {"min": 0, "max": 237100, "rate": 0.18},
        {"min": 237101, "max": 370500, "rate": 0.26},
    ])
    print(json.dumps(engine.calculate("sa_2024", 300000), indent=2))
    print(json.dumps(engine.net_income("sa_2024", 300000, 20000), indent=2))
