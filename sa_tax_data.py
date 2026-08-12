"""SA Tax Data — South African tax data and brackets."""

import json
from typing import Dict, List


class SATaxData:
    """South African tax data for 2024/2025."""

    def __init__(self):
        self.year = "2024/2025"
        self.brackets = [
            {"min": 0, "max": 237100, "rate": 0.18},
            {"min": 237101, "max": 370500, "rate": 0.26},
            {"min": 370501, "max": 512800, "rate": 0.31},
            {"min": 512801, "max": 673000, "rate": 0.36},
            {"min": 673001, "max": 857900, "rate": 0.39},
            {"min": 857901, "max": 1817000, "rate": 0.41},
            {"min": 1817001, "max": float("inf"), "rate": 0.45},
        ]
        self.rebates = {
            "primary": 17235,
            "secondary": 9444,  # 65+
            "tertiary": 3145,   # 75+
        }
        self.thresholds = {
            "under_65": 95750,
            "65_to_74": 148217,
            "over_75": 165689,
        }

    def calculate_tax(self, taxable_income: float, age: int = 35) -> Dict:
        tax = 0
        for bracket in self.brackets:
            if taxable_income > bracket["min"]:
                taxable = min(taxable_income, bracket["max"]) - bracket["min"]
                tax += taxable * bracket["rate"]

        rebate = self.rebates["primary"]
        if age >= 75:
            rebate += self.rebates["secondary"] + self.rebates["tertiary"]
        elif age >= 65:
            rebate += self.rebates["secondary"]

        tax_after_rebate = max(0, tax - rebate)
        effective_rate = (tax_after_rebate / taxable_income * 100) if taxable_income > 0 else 0

        return {
            "tax_year": self.year,
            "taxable_income": taxable_income,
            "tax_before_rebate": round(tax, 2),
            "rebate": rebate,
            "tax_after_rebate": round(tax_after_rebate, 2),
            "effective_rate": round(effective_rate, 2),
        }

    def medical_tax_credit(self, members: int = 1) -> float:
        credit = 364 * members  # R364 per month per member (2024/25)
        return credit * 12  # Annual

    def retirement_contribution_limit(self, income: float) -> float:
        return min(income * 0.275, 350000)


if __name__ == "__main__":
    tax = SATaxData()
    print(json.dumps(tax.calculate_tax(500000), indent=2))
    print(json.dumps(tax.calculate_tax(500000, 70), indent=2))
    print(f"Medical credit: R{tax.medical_tax_credit(2):.2f}")
