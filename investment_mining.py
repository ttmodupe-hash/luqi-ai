"""Investment & Mining — Mining investment and commodity tracking."""

import json
from typing import Dict, List


class InvestmentMining:
    """Mining investment and commodity advisor."""

    def __init__(self):
        self.commodities = {
            "gold": {"price_usd": 2650.0, "unit": "oz", "trend": "up"},
            "platinum": {"price_usd": 950.0, "unit": "oz", "trend": "stable"},
            "coal": {"price_usd": 140.0, "unit": "ton", "trend": "down"},
            "iron_ore": {"price_usd": 110.0, "unit": "ton", "trend": "stable"},
            "diamonds": {"price_usd": 5000.0, "unit": "carat", "trend": "up"},
        }
        self.mining_companies = [
            {"name": "Anglo American", "commodities": ["platinum", "diamonds", "copper"], "jse": "AGL"},
            {"name": "Sibanye-Stillwater", "commodities": ["gold", "platinum"], "jse": "SSW"},
            {"name": "Gold Fields", "commodities": ["gold"], "jse": "GFI"},
            {"name": "Exxaro", "commodities": ["coal", "iron_ore"], "jse": "EXX"},
        ]

    def get_commodity(self, name: str) -> Dict:
        return self.commodities.get(name.lower(), {"error": "Commodity not tracked"})

    def track_portfolio(self, holdings: List[Dict]) -> Dict:
        total = 0
        for h in holdings:
            commodity = self.commodities.get(h["commodity"].lower(), {})
            value = h["quantity"] * commodity.get("price_usd", 0)
            total += value
        return {"holdings": holdings, "total_value_usd": total}

    def mining_companies(self, commodity: str = None) -> List[Dict]:
        if commodity:
            return [c for c in self.mining_companies if commodity.lower() in [x.lower() for x in c["commodities"]]]
        return self.mining_companies

    def esg_score(self, company: str) -> Dict:
        scores = {
            "Anglo American": {"environmental": 75, "social": 68, "governance": 80},
            "Sibanye-Stillwater": {"environmental": 65, "social": 70, "governance": 72},
        }
        return scores.get(company, {"note": "ESG data not available"})


if __name__ == "__main__":
    mining = InvestmentMining()
    print(json.dumps(mining.get_commodity("gold"), indent=2))
    print(json.dumps(mining.mining_companies("gold"), indent=2))
    print(json.dumps(mining.esg_score("Anglo American"), indent=2))
