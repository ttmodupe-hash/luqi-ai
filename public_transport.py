"""Public Transport — South African public transport guide."""

import json
from typing import Dict, List


class PublicTransport:
    """South African public transport information."""

    def __init__(self):
        self.modes = {
            "gautrain": {"type": "rail", "coverage": "Gauteng", "fare": "R20-R300", "schedule": "Every 12-20 min"},
            "myciti": {"type": "bus", "coverage": "Cape Town", "fare": "R8-R25", "schedule": "Every 15-30 min"},
            "reavaya": {"type": "bus", "coverage": "Johannesburg", "fare": "R8-R20", "schedule": "Every 20 min"},
            "metrorail": {"type": "rail", "coverage": "Major cities", "fare": "R7-R50", "schedule": "Peak hours"},
            "minibus_taxi": {"type": "taxi", "coverage": "Nationwide", "fare": "R10-R50", "schedule": "On demand"},
        }
        self.routes = [
            {"from": "Sandton", "to": "OR Tambo", "mode": "gautrain", "duration": "15 min", "fare": 202},
            {"from": "Cape Town CBD", "to": "Hout Bay", "mode": "myciti", "duration": "45 min", "fare": 18},
            {"from": "Soweto", "to": "Parktown", "mode": "reavaya", "duration": "60 min", "fare": 15},
        ]

    def get_mode(self, mode: str) -> Dict:
        return self.modes.get(mode.lower().replace(" ", "_"), {"error": "Mode not found"})

    def find_route(self, from_loc: str, to_loc: str) -> List[Dict]:
        return [r for r in self.routes if from_loc.lower() in r["from"].lower() and to_loc.lower() in r["to"].lower()]

    def fare_estimate(self, mode: str, distance_km: float) -> Dict:
        rates = {"gautrain": 15, "myciti": 2, "reavaya": 1.5, "metrorail": 1, "minibus_taxi": 3}
        rate = rates.get(mode.lower().replace(" ", "_"), 2)
        return {"mode": mode, "distance_km": distance_km, "estimated_fare": round(distance_km * rate, 2)}

    def accessibility(self, mode: str) -> Dict:
        return {
            "gautrain": {"wheelchair": True, "visual": True, "hearing": True},
            "myciti": {"wheelchair": True, "visual": False, "hearing": False},
            "minibus_taxi": {"wheelchair": False, "visual": False, "hearing": False},
        }.get(mode.lower().replace(" ", "_"), {"wheelchair": False, "visual": False, "hearing": False})


if __name__ == "__main__":
    transport = PublicTransport()
    print(json.dumps(transport.get_mode("gautrain"), indent=2))
    print(json.dumps(transport.find_route("Sandton", "OR Tambo"), indent=2))
    print(json.dumps(transport.fare_estimate("myciti", 20), indent=2))
