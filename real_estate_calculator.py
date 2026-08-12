"""Real Estate Calculator — Property investment calculator."""

import json
from typing import Dict


class RealEstateCalculator:
    """Property investment and real estate calculator."""

    def mortgage(self, price: float, deposit: float, rate: float, years: int) -> Dict:
        principal = price - deposit
        monthly_rate = rate / 12 / 100
        payments = years * 12
        if monthly_rate == 0:
            payment = principal / payments
        else:
            payment = principal * (monthly_rate * (1 + monthly_rate) ** payments) / ((1 + monthly_rate) ** payments - 1)
        total = payment * payments
        return {
            "property_price": price,
            "deposit": deposit,
            "loan_amount": principal,
            "monthly_payment": round(payment, 2),
            "total_repayment": round(total, 2),
            "total_interest": round(total - principal, 2),
        }

    def affordability(self, gross_income: float, interest_rate: float = 10.5) -> Dict:
        max_monthly = gross_income * 0.3
        # Reverse calculate for 20 years
        monthly_rate = interest_rate / 12 / 100
        payments = 20 * 12
        max_loan = max_monthly * ((1 + monthly_rate) ** payments - 1) / (monthly_rate * (1 + monthly_rate) ** payments)
        return {
            "gross_income": gross_income,
            "max_monthly_payment": round(max_monthly, 2),
            "max_loan_amount": round(max_loan, 2),
            "max_property_price": round(max_loan / 0.9, 2),  # 10% deposit
        }

    def rental_yield(self, price: float, monthly_rent: float) -> Dict:
        annual = monthly_rent * 12
        return {
            "property_price": price,
            "monthly_rent": monthly_rent,
            "annual_rent": annual,
            "gross_yield": round(annual / price * 100, 2),
        }

    def capital_growth(self, price: float, years: int, growth_rate: float = 5.0) -> Dict:
        future = price * ((1 + growth_rate / 100) ** years)
        return {
            "current_price": price,
            "years": years,
            "growth_rate": growth_rate,
            "future_value": round(future, 2),
            "profit": round(future - price, 2),
        }


if __name__ == "__main__":
    calc = RealEstateCalculator()
    print(json.dumps(calc.mortgage(1500000, 150000, 10.5, 20), indent=2))
    print(json.dumps(calc.affordability(35000), indent=2))
    print(json.dumps(calc.rental_yield(2000000, 12000), indent=2))
