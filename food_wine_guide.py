"""Food & Wine Guide — Culinary and wine recommendations."""

import json
from typing import Dict, List


class FoodWineGuide:
    """South African food and wine guide."""

    def __init__(self):
        self.wines = {
            "pinotage": {"region": "Western Cape", "pairing": "Braai / BBQ", "price_range": "R80-300"},
            "chenin_blanc": {"region": "Stellenbosch", "pairing": "Seafood", "price_range": "R60-250"},
            "sauvignon_blanc": {"region": "Constantia", "pairing": "Salads, light dishes", "price_range": "R70-400"},
            "shiraz": {"region": "Paarl", "pairing": "Red meat", "price_range": "R90-500"},
        }
        self.restaurants = [
            {"name": "Test Kitchen", "city": "Cape Town", "cuisine": "Contemporary", "rating": 4.8},
            {"name": "Wolfgat", "city": "Paternoster", "cuisine": "Foraging", "rating": 4.9},
            {"name": "Lebo's Soweto", "city": "Soweto", "cuisine": "Traditional", "rating": 4.5},
        ]

    def get_wine(self, wine: str) -> Dict:
        return self.wines.get(wine.lower().replace(" ", "_"), {"error": "Wine not found"})

    def find_restaurants(self, city: str = None, cuisine: str = None) -> List[Dict]:
        results = self.restaurants
        if city:
            results = [r for r in results if city.lower() in r["city"].lower()]
        if cuisine:
            results = [r for r in results if cuisine.lower() in r["cuisine"].lower()]
        return results

    def wine_pairing(self, dish: str) -> str:
        pairings = {
            "braai": "Pinotage or Shiraz",
            "seafood": "Chenin Blanc or Sauvignon Blanc",
            "curry": "Gewürztraminer or Rosé",
            "steak": "Cabernet Sauvignon or Shiraz",
        }
        return pairings.get(dish.lower(), "Ask your sommelier")


if __name__ == "__main__":
    guide = FoodWineGuide()
    print(json.dumps(guide.get_wine("pinotage"), indent=2))
    print(json.dumps(guide.find_restaurants("Cape Town"), indent=2))
    print(guide.wine_pairing("braai"))
