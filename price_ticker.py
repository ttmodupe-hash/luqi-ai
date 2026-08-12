"""Price Ticker — Real-time price tracking."""

import json
from typing import Dict, List


class PriceTicker:
    """Price ticker for commodities and currencies."""

    def __init__(self):
        self.prices = {}

    def update(self, symbol: str, price: float, change: float = 0.0):
        self.prices[symbol] = {
            "price": price,
            "change": change,
            "change_percent": round(change / (price - change) * 100, 2) if price != change else 0,
            "last_update": json.dumps("now"),
        }

    def get(self, symbol: str) -> Dict:
        return self.prices.get(symbol, {"error": "Symbol not found"})

    def get_all(self) -> Dict:
        return self.prices

    def alerts(self, symbol: str, threshold: float, direction: str = "above") -> bool:
        price = self.prices.get(symbol, {}).get("price", 0)
        if direction == "above":
            return price > threshold
        return price < threshold

    def portfolio_value(self, holdings: List[Dict]) -> Dict:
        total = 0
        for h in holdings:
            price = self.prices.get(h["symbol"], {}).get("price", 0)
            value = h["quantity"] * price
            total += value
        return {"holdings": holdings, "total_value": total}


if __name__ == "__main__":
    ticker = PriceTicker()
    ticker.update("GOLD", 2650.0, 15.0)
    ticker.update("USDZAR", 18.5, -0.2)
    print(json.dumps(ticker.get("GOLD"), indent=2))
    print(json.dumps(ticker.portfolio_value([{"symbol": "GOLD", "quantity": 10}]), indent=2))
