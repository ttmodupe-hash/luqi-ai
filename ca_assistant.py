"""CA Assistant — Chartered Accountant / SARS tax filing helper."""

import json
from typing import Dict, List


class CAAssistant:
    """CA and tax filing assistant."""

    def __init__(self):
        self.tax_year = "2025"
        self.deadlines = {
            "provisional_tax_1": "2024-08-30",
            "provisional_tax_2": "2025-02-28",
            "annual_return": "2025-01-31",
            "vat_return": "2025-01-25",
        }

    def tax_calendar(self) -> Dict:
        return self.deadlines

    def calculate_provisional_tax(self, income: float, expenses: float) -> Dict:
        taxable = max(0, income - expenses)
        rate = 0.28 if taxable > 1000000 else 0.27
        tax = taxable * rate
        return {
            "taxable_income": taxable,
            "estimated_tax": tax,
            "first_payment": tax * 0.5,
            "second_payment": tax * 0.5,
        }

    def vat_calculator(self, amount: float, vat_rate: float = 0.15) -> Dict:
        vat = amount * vat_rate
        return {
            "excl_vat": amount,
            "vat_amount": vat,
            "incl_vat": amount + vat,
        }

    def filing_checklist(self, taxpayer_type: str = "individual") -> List[str]:
        return [
            "IRP5/IT3(a) certificates",
            "Medical aid certificates",
            "Retirement annuity certificates",
            "Travel logbook",
            "Home office expenses",
            "Donations receipts",
            "Foreign income documentation",
        ]


if __name__ == "__main__":
    ca = CAAssistant()
    print(json.dumps(ca.calculate_provisional_tax(500000, 150000), indent=2))
    print(json.dumps(ca.vat_calculator(1000), indent=2))
