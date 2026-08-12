"""Farming Guide — Comprehensive farming and agricultural guide."""

import json
from typing import Dict, List


class FarmingGuide:
    """Comprehensive farming guide for South Africa."""

    def __init__(self):
        self.crops = {
            "maize": {"season": "Oct-Mar", "water": "High", "regions": ["Free State", "North West", "Mpumalanga"]},
            "wheat": {"season": "May-Sep", "water": "Medium", "regions": ["Western Cape", "Free State"]},
            "capples": {"season": "Mar-Aug", "water": "Medium", "regions": ["Western Cape", "Eastern Cape"]},
            "grapes": {"season": "Sep-Mar", "water": "Medium", "regions": ["Western Cape"]},
            "citrus": {"season": "Year-round", "water": "High", "regions": ["Limpopo", "Eastern Cape", "Western Cape"]},
        }
        self.pests = {
            "fall_armyworm": {"crops": ["maize", "sorghum"], "control": "Biological + chemical"},
            "codling_moth": {"crops": ["apples", "pears"], "control": "Pheromone traps"},
            "false_codling_moth": {"crops": ["citrus"], "control": " Orchard sanitation"},
        }

    def get_crop_info(self, crop: str) -> Dict:
        return self.crops.get(crop.lower(), {"error": "Crop not found"})

    def get_pest_control(self, pest: str) -> Dict:
        return self.pests.get(pest.lower(), {"error": "Pest not found"})

    def seasonal_calendar(self, region: str) -> List[Dict]:
        calendar = []
        for crop, info in self.crops.items():
            if region.lower() in [r.lower() for r in info["regions"]]:
                calendar.append({"crop": crop, **info})
        return calendar

    def soil_preparation(self, crop: str) -> str:
        guides = {
            "maize": "Plough to 30cm depth. Apply lime if pH < 5.5. Add compost.",
            "wheat": "Fine seedbed required. Control weeds before planting.",
            "grapes": "Deep ripping for root development. pH 6.0-6.5 optimal.",
        }
        return guides.get(crop.lower(), "Consult local extension officer.")


if __name__ == "__main__":
    guide = FarmingGuide()
    print(json.dumps(guide.get_crop_info("maize"), indent=2))
    print(json.dumps(guide.seasonal_calendar("Western Cape"), indent=2))
    print(guide.soil_preparation("maize"))
