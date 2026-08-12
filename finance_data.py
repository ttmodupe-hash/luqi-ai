"""Finance Data — Financial data aggregation and analysis."""

import json
from typing import Dict, List


class FinanceData:
    """Financial data engine."""

    def __init__(self):
        self.rates = {
            "usd_zar": 18.5,
            "eur_zar": 20.2,
            "gbp_zar": 23.8,
            "zar_usd": 0.054,
        }
        self.indices = {
            "jse_all_share": 74000,
            "jse_top_40": 67000,
            "jse_resources": 52000,
        }

    def convert_currency(self, amount: float, from_currency: str, to_currency: str) -> float:
        pair = f"{from_currency.lower()}_{to_currency.lower()}"
        rate = self.rates.get(pair, 1.0)
        return amount * rate

    def get_exchange_rates(self) -> Dict:
        return self.rates

    def get_market_indices(self) -> Dict:
        return self.indices

    def calculate_inflation_adjusted(self, amount: float, years: int, inflation_rate: float = 0.05) -> float:
        return amount * ((1 + inflation_rate) ** years)

    def compound_interest(self, principal: float, rate: float, years: int, monthly: bool = True) -> float:
        n = 12 if monthly else 1
        return principal * (1 + rate / n) ** (n * years)


if __name__ == "__main__":
    finance = FinanceData()
    print(f"USD 100 = ZAR {finance.convert_currency(100, 'USD', 'ZAR')}")
    print(json.dumps(finance.get_market_indices(), indent=2))
