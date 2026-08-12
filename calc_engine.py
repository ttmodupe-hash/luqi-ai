"""Calc Engine — Advanced calculation and formula engine."""

import json
import math
from typing import Any, Dict, List, Optional


class CalcEngine:
    """Mathematical and financial calculation engine."""

    def __init__(self):
        self.functions = {
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "log": math.log,
            "exp": math.exp,
            "sqrt": math.sqrt,
            "pow": math.pow,
            "abs": abs,
            "round": round,
            "floor": math.floor,
            "ceil": math.ceil,
        }

    def evaluate(self, expression: str, variables: Optional[Dict] = None) -> float:
        """Safely evaluate a mathematical expression."""
        variables = variables or {}
        # Simple safe eval using only allowed functions
        allowed = {**self.functions, **variables}
        try:
            return eval(expression, {"__builtins__": {}}, allowed)
        except Exception as e:
            return float("nan")

    def loan_payment(self, principal: float, rate: float, months: int) -> float:
        """Calculate monthly loan payment."""
        if rate == 0:
            return principal / months
        r = rate / 12
        return principal * (r * (1 + r) ** months) / ((1 + r) ** months - 1)

    compound_interest = lambda self, p, r, t, n=12: p * (1 + r / n) ** (n * t)

    def npv(self, rate: float, cashflows: List[float]) -> float:
        """Calculate Net Present Value."""
        return sum(cf / (1 + rate) ** i for i, cf in enumerate(cashflows))

    def irr(self, cashflows: List[float], guess: float = 0.1) -> float:
        """Approximate Internal Rate of Return using Newton's method."""
        r = guess
        for _ in range(100):
            npv = sum(cf / (1 + r) ** i for i, cf in enumerate(cashflows))
            d_npv = sum(-i * cf / (1 + r) ** (i + 1) for i, cf in enumerate(cashflows))
            if abs(d_npv) < 1e-10:
                break
            r_new = r - npv / d_npv
            if abs(r_new - r) < 1e-6:
                return r_new
            r = r_new
        return r

    def mortgage_calculator(self, price: float, deposit: float, rate: float, years: int) -> Dict:
        principal = price - deposit
        months = years * 12
        monthly = self.loan_payment(principal, rate, months)
        total = monthly * months
        return {
            "principal": principal,
            "monthly_payment": monthly,
            "total_repayment": total,
            "total_interest": total - principal,
            "deposit": deposit,
        }


if __name__ == "__main__":
    engine = CalcEngine()
    print(engine.evaluate("2 + 2 * 5"))
    print(json.dumps(engine.mortgage_calculator(1000000, 200000, 0.115, 20), indent=2))
