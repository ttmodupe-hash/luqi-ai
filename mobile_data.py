"""Mobile Data — Mobile network and data plan advisor."""

import json
from typing import Dict, List


class MobileData:
    """South African mobile data plan comparison."""

    def __init__(self):
        self.plans = [
            {"provider": "Vodacom", "plan": "Red Connect", "data": "10GB", "price": 349, "contract": "24 months"},
            {"provider": "MTN", "plan": "Made for Me", "data": "20GB", "price": 299, "contract": "Month-to-month"},
            {"provider": "Cell C", "plan": "SmartData", "data": "15GB", "price": 249, "contract": "Month-to-month"},
            {"provider": "Telkom", "plan": "FreeMe", "data": "25GB", "price": 229, "contract": "Month-to-month"},
            {"provider": "Rain", "plan": "Unlimited", "data": "Unlimited", "price": 479, "contract": "Month-to-month"},
        ]
        self.networks = {
            "vodacom": {"coverage": "96%", "speed": "Fastest", "5g": True},
            "mtn": {"coverage": "94%", "speed": "Very fast", "5g": True},
            "cell_c": {"coverage": "85%", "speed": "Good", "5g": False},
            "telkom": {"coverage": "88%", "speed": "Good", "5g": True},
            "rain": {"coverage": "80%", "speed": "Variable", "5g": True},
        }

    def compare_plans(self, min_data: str = None, max_price: float = None) -> List[Dict]:
        results = self.plans
        if max_price:
            results = [p for p in results if p["price"] <= max_price]
        return results

    def network_coverage(self, provider: str) -> Dict:
        return self.networks.get(provider.lower(), {"error": "Provider not found"})

    def data_usage_estimate(self, activities: List[str]) -> Dict:
        usage = {
            "social_media": 2,  # GB per month
            "video_streaming": 10,
            "music_streaming": 3,
            "video_calls": 5,
            "web_browsing": 1,
            "gaming": 4,
        }
        total = sum(usage.get(a.lower().replace(" ", "_"), 0) for a in activities)
        return {"activities": activities, "estimated_gb": total, "recommended_plan": f"{max(total * 1.2, 5):.0f}GB+"}

    def roaming_rates(self, country: str) -> Dict:
        rates = {
            "africa": {"data": "R2/MB", "calls": "R5/min", "sms": "R2"},
            "europe": {"data": "R5/MB", "calls": "R10/min", "sms": "R3"},
            "usa": {"data": "R10/MB", "calls": "R15/min", "sms": "R5"},
        }
        return rates.get(country.lower(), {"data": "R15/MB", "calls": "R20/min", "sms": "R5"})


if __name__ == "__main__":
    mobile = MobileData()
    print(json.dumps(mobile.compare_plans(max_price=300), indent=2))
    print(json.dumps(mobile.data_usage_estimate(["social_media", "video_streaming"]), indent=2))
    print(json.dumps(mobile.roaming_rates("europe"), indent=2))
