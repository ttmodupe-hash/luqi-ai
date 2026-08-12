"""SA Tax Engine — Comprehensive South African tax calculator."""

import json
from typing import Dict, List


class SATaxEngine:
    """Comprehensive South African tax engine."""

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
        self.rebates = {"primary": 17235, "secondary": 9444, "tertiary": 3145}
        self.medical_credits = {"main": 364, "first_dependant": 364, "additional": 246}

    def calculate(self, annual_income: float, age: int = 35, medical_members: int = 1,
                  pension_contribution: float = 0, donations: float = 0) -> Dict:
        # Deductions
        taxable_income = annual_income

        # Pension deduction (max 27.5% or R350k)
        pension_deduction = min(pension_contribution, annual_income * 0.275, 350000)
        taxable_income -= pension_deduction

        # Donations (max 10%)
        donation_deduction = min(donations, annual_income * 0.1)
        taxable_income -= donation_deduction

        # Calculate tax
        tax = 0
        for bracket in self.brackets:
            if taxable_income > bracket["min"]:
                taxable = min(taxable_income, bracket["max"]) - bracket["min"]
                tax += taxable * bracket["rate"]

        # Rebates
        rebate = self.rebates["primary"]
        if age >= 75:
            rebate += self.rebates["secondary"] + self.rebates["tertiary"]
        elif age >= 65:
            rebate += self.rebates["secondary"]

        tax_after_rebate = max(0, tax - rebate)

        # Medical tax credits
        medical_credit = self.medical_credits["main"] * 12
        if medical_members > 1:
            medical_credit += self.medical_credits["first_dependant"] * 12
            medical_credit += self.medical_credits["additional"] * 12 * (medical_members - 2)

        final_tax = max(0, tax_after_rebate - medical_credit)

        return {
            "tax_year": self.year,
            "annual_income": annual_income,
            "taxable_income": round(taxable_income, 2),
            "deductions": {
                "pension": round(pension_deduction, 2),
                "donations": round(donation_deduction, 2),
            },
            "tax_before_rebate": round(tax, 2),
            "rebate": rebate,
            "tax_after_rebate": round(tax_after_rebate, 2),
            "medical_tax_credit": round(medical_credit, 2),
            "final_tax": round(final_tax, 2),
            "monthly_tax": round(final_tax / 12, 2),
            "effective_rate": round(final_tax / annual_income * 100, 2) if annual_income > 0 else 0,
        }

    def compare_years(self, income: float) -> Dict:
        return {
            "current_year": self.calculate(income),
            "note": "Compare with previous year data",
        }

    def tax_tips(self) -> List[str]:
        return [
            "Maximize retirement contributions (up to 27.5%)",
            "Keep all medical expense receipts",
            "Claim home office expenses if applicable",
            "Donate to registered charities (up to 10%)",
            "Use tax-free savings accounts",
        ]


if __name__ == "__main__":
    engine = SATaxEngine()
    print(json.dumps(engine.calculate(600000, 35, 3, 50000), indent=2))
    print(json.dumps(engine.tax_tips(), indent=2))
