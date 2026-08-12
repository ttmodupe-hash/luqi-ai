"""Climate & Environment — Climate data, carbon footprint, and environmental advisory."""

import json
from typing import Dict, List


class ClimateEnvironment:
    """Climate and environmental advisory engine."""

    def __init__(self):
        self.carbon_factors = {
            "electricity_sa": 0.93,  # kg CO2 per kWh
            "petrol": 2.31,  # kg CO2 per liter
            "diesel": 2.68,
            "flight_short": 0.255,  # kg CO2 per km
            "flight_long": 0.195,
        }

    def carbon_footprint(self, category: str, amount: float) -> Dict:
        factor = self.carbon_factors.get(category, 0)
        return {
            "category": category,
            "amount": amount,
            "co2_kg": amount * factor,
            "trees_needed": (amount * factor) / 21,  # 21 kg CO2 per tree per year
        }

    def climate_risk(self, region: str) -> Dict:
        risks = {
            "western cape": {"drought": "high", "flood": "low", "fire": "high"},
            "kwazulu-natal": {"drought": "medium", "flood": "high", "fire": "medium"},
            "limpopo": {"drought": "high", "flood": "low", "fire": "high"},
            "mpumalanga": {"drought": "medium", "flood": "medium", "fire": "high"},
        }
        return risks.get(region.lower(), {"note": "Data not available"})

    def renewable_energy(self, region: str) -> Dict:
        return {
            "solar_potential": "High" if region.lower() in ["limpopo", "mpumalanga", "northern cape"] else "Medium",
            "wind_potential": "High" if region.lower() in ["western cape", "eastern cape"] else "Medium",
            "recommended": "Solar PV + battery storage",
        }

    def water_usage(self, activity: str, duration: float) -> Dict:
        usage = {
            "shower": 10,  # liters per minute
            "bath": 80,
            "dishwasher": 15,
            "washing_machine": 50,
            "garden_sprinkler": 15,
        }
        rate = usage.get(activity.lower(), 0)
        return {"activity": activity, "duration_min": duration, "liters": rate * duration}


if __name__ == "__main__":
    climate = ClimateEnvironment()
    print(json.dumps(climate.carbon_footprint("electricity_sa", 350), indent=2))
    print(json.dumps(climate.climate_risk("western cape"), indent=2))
