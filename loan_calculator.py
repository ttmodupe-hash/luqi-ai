"""Loan Calculator — Loan repayment and interest calculator."""

import json
from typing import Dict


class LoanCalculator:
    """Loan repayment calculator."""

    def calculate(self, principal: float, annual_rate: float, years: int) -> Dict:
        monthly_rate = annual_rate / 12 / 100
        num_payments = years * 12
        if monthly_rate == 0:
            payment = principal / num_payments
        else:
            payment = principal * (monthly_rate * (1 + monthly_rate) ** num_payments) / ((1 + monthly_rate) ** num_payments - 1)
        total = payment * num_payments
        interest = total - principal
        return {
            "principal": principal,
            "annual_rate": annual_rate,
            "years": years,
            "monthly_payment": round(payment, 2),
            "total_payments": num_payments,
            "total_amount": round(total, 2),
            "total_interest": round(interest, 2),
        }

    def affordability(self, monthly_income: float, expenses: float, interest_rate: float = 10.5) -> Dict:
        disposable = monthly_income - expenses
        max_payment = disposable * 0.3
        # Reverse calculate max loan for 20 years
        monthly_rate = interest_rate / 12 / 100
        num_payments = 20 * 12
        max_loan = max_payment * ((1 + monthly_rate) ** num_payments - 1) / (monthly_rate * (1 + monthly_rate) ** num_payments)
        return {
            "monthly_income": monthly_income,
            "expenses": expenses,
            "disposable_income": disposable,
            "max_monthly_payment": round(max_payment, 2),
            "max_loan_amount": round(max_loan, 2),
        }

    def compare_loans(self, loans: list) -> list:
        results = []
        for loan in loans:
            calc = self.calculate(loan["principal"], loan["rate"], loan["years"])
            results.append({"name": loan["name"], **calc})
        return sorted(results, key=lambda x: x["total_interest"])


if __name__ == "__main__":
    calc = LoanCalculator()
    print(json.dumps(calc.calculate(500000, 10.5, 20), indent=2))
    print(json.dumps(calc.affordability(25000, 15000), indent=2))
