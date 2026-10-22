"""Existing LUQI loan calculator exposed under the omega_ai namespace.

Source: LUQI repository root loan_calculator.py (existing, not AI-generated).
Estimates are illustrative, not lending offers or credit advice.
"""

from math import isfinite
from loan_calculator import LoanCalculator as _LoanCalculator


class LoanCalculator(_LoanCalculator):
    """Reuse the existing calculator and validate numeric preconditions."""

    def calculate(self, principal: float, annual_rate: float, years: int) -> dict:
        if not all(isinstance(value, (int, float)) and isfinite(value)
                   for value in (principal, annual_rate)):
            raise ValueError("principal and annual_rate must be finite numbers")
        if principal <= 0 or annual_rate < 0 or not isinstance(years, int) or years <= 0:
            raise ValueError("principal and years must be positive, rate cannot be negative")
        return super().calculate(principal, annual_rate, years)

    def affordability(self, monthly_income: float, expenses: float,
                      interest_rate: float = 10.5) -> dict:
        values = (monthly_income, expenses, interest_rate)
        if not all(isinstance(value, (int, float)) and isfinite(value) for value in values):
            raise ValueError("inputs must be finite numbers")
        if monthly_income <= 0 or expenses < 0 or interest_rate <= 0:
            raise ValueError("income and rate must be positive, expenses cannot be negative")
        return super().affordability(monthly_income, expenses, interest_rate)
