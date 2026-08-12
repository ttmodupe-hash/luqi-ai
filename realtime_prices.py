"""Realtime Prices — Real-time commodity and currency prices."""

import json
from typing import Dict, List


class RealtimePrices:
    """Real-time price tracking with simulated data."""

    def __init__(self):
        self.prices = {
            "gold": {"price": 2650.0, "currency": "USD", "unit": "oz", "change": 15.0},
            "platinum": {"price": 950.0, "currency": "USD", "unit": "oz", "change": -5.0},
            "usd_zar": {"price": 18.5, "currency": "ZAR", "unit": "1 USD", "change": -0.2},
            "eur_zar": {"price": 20.2, "currency": "ZAR", "unit": "1 EUR", "change": 0.1},
            "btc_usd": {"price": 95000.0, "currency": "USD", "unit": "1 BTC", "change": 1200.0},
        }

    def get(self, symbol: str) -> Dict:
        return self.prices.get(symbol.lower(), {"error": "Symbol not tracked"})

    def get_all(self) -> Dict:
        return self.prices

    def update(self, symbol: str, price: float, change: float = 0.0):
        if symbol.lower() in self.prices:
            self.prices[symbol.lower()]["price"] = price
            self.prices[symbol.lower()]["change"] = change

    def movers(self, direction: str = "up") -> List[Dict]:
        results = []
        for symbol, data in self.prices.items():
            if direction == "up" and data["change"] > 0:
                results.append({"symbol": symbol, **data})
            elif direction == "down" and data["change"] < 0:
                results.append({"symbol": symbol, **data})
        return sorted(results, key=lambda x: abs(x["change"]), reverse=True)

    def convert(self, amount: float, from_symbol: str, to_symbol: str) -> float:
        from_price = self.prices.get(from_symbol.lower(), {}).get("price", 1)
        to_price = self.prices.get(to_symbol.lower(), {}).get("price", 1)
        return amount * (from_price / to_price)


if __name__ == "__main__":
    prices = RealtimePrices()
    print(json.dumps(prices.get("gold"), indent=2))
    print(json.dumps(prices.movers("up"), indent=2))
    print(f"100 USD = {prices.convert(100, 'usd_zar', 'eur_zar'):.2f} EUR (via ZAR)")
