"""Load Shedding — Eskom load shedding schedule and alerts."""

import json
from typing import Dict, List


class LoadShedding:
    """South African load shedding information and schedules."""

    def __init__(self):
        self.stages = {
            1: {"shed": "1000 MW", "frequency": "2 hours per day"},
            2: {"shed": "2000 MW", "frequency": "4 hours per day"},
            3: {"shed": "3000 MW", "frequency": "6 hours per day"},
            4: {"shed": "4000 MW", "frequency": "8 hours per day"},
            5: {"shed": "5000 MW", "frequency": "10 hours per day"},
            6: {"shed": "6000 MW", "frequency": "12 hours per day"},
            7: {"shed": "7000 MW", "frequency": "14 hours per day"},
            8: {"shed": "8000 MW", "frequency": "16 hours per day"},
        }
        self.areas = {
            "city_of_johannesburg": ["1", "3", "5", "7", "9", "11", "13"],
            "city_of_cape_town": ["2", "4", "6", "8", "10", "12", "14"],
            "ekurhuleni": ["1", "4", "7", "10", "13"],
            "tshwane": ["2", "5", "8", "11", "14"],
        }

    def get_stage_info(self, stage: int) -> Dict:
        return self.stages.get(stage, {"error": "Invalid stage"})

    def get_schedule(self, municipality: str, stage: int) -> Dict:
        areas = self.areas.get(municipality.lower().replace(" ", "_"), [])
        if not areas:
            return {"error": "Municipality not found"}
        return {
            "municipality": municipality,
            "stage": stage,
            "affected_areas": areas,
            "frequency": self.stages.get(stage, {}).get("frequency", "Unknown"),
        }

    def tips(self) -> List[str]:
        return [
            "Invest in solar panels and inverter",
            "Use gas for cooking",
            "Keep devices charged",
            "Install UPS for essential electronics",
            "Use LED lighting to reduce power draw",
            "Plan work around load shedding schedule",
        ]

    def battery_calculator(self, load_watts: float, hours: float) -> Dict:
        capacity_ah = (load_watts * hours) / 12  # Assuming 12V system
        return {
            "load_watts": load_watts,
            "hours": hours,
            "required_capacity_ah": round(capacity_ah, 1),
            "recommended": f"{round(capacity_ah * 1.2, 1)} Ah (with 20% buffer)",
        }


if __name__ == "__main__":
    ls = LoadShedding()
    print(json.dumps(ls.get_stage_info(4), indent=2))
    print(json.dumps(ls.get_schedule("city_of_johannesburg", 2), indent=2))
    print(json.dumps(ls.battery_calculator(500, 4), indent=2))
