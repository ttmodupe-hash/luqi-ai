"""Construction Calculator — Building cost estimation and material quantification."""

import json
from typing import Dict, List


class ConstructionCalculator:
    """Construction cost estimation engine."""

    def __init__(self):
        self.material_prices = {
            "cement_50kg": 110.0,
            "bricks': 2.5,
            "sand_m3": 450.0,
            "stone_m3": 550.0,
            "steel_rebar_kg": 28.0,
            "timber_2x4": 85.0,
            "roof_sheet": 280.0,
            "paint_20l": 850.0,
        }

    def calculate_materials(self, area_m2: float, building_type: str = "residential") -> Dict:
        """Estimate materials for a given floor area."""
        cement_bags = area_m2 * 0.8
        bricks = area_m2 * 60
        sand = area_m2 * 0.05
        stone = area_m2 * 0.03
        steel = area_m2 * 5
        timber = area_m2 * 2
        roof_sheets = area_m2 / 2.5
        paint = area_m2 * 0.15

        total = (
            cement_bags * self.material_prices["cement_50kg"] +
            bricks * self.material_prices["bricks"] +
            sand * self.material_prices["sand_m3"] +
            stone * self.material_prices["stone_m3"] +
            steel * self.material_prices["steel_rebar_kg"] +
            timber * self.material_prices["timber_2x4"] +
            roof_sheets * self.material_prices["roof_sheet"] +
            paint * self.material_prices["paint_20l"]
        )

        return {
            "area_m2": area_m2,
            "building_type": building_type,
            "materials": {
                "cement_bags": round(cement_bags, 1),
                "bricks": round(bricks),
                "sand_m3": round(sand, 2),
                "stone_m3": round(stone, 2),
                "steel_kg": round(steel, 1),
                "timber_pieces": round(timber),
                "roof_sheets": round(roof_sheets, 1),
                "paint_liters": round(paint, 1),
            },
            "estimated_cost_zar": round(total, 2),
        }

    def labour_cost(self, area_m2: float, rate_per_m2: float = 350.0) -> Dict:
        return {
            "area_m2": area_m2,
            "rate_per_m2": rate_per_m2,
            "total_labour": area_m2 * rate_per_m2,
        }

    def project_estimate(self, area_m2: float) -> Dict:
        materials = self.calculate_materials(area_m2)
        labour = self.labour_cost(area_m2)
        total = materials["estimated_cost_zar"] + labour["total_labour"]
        return {
            "materials": materials,
            "labour": labour,
            "total_estimate_zar": round(total, 2),
            "contingency_10%": round(total * 0.1, 2),
            "grand_total": round(total * 1.1, 2),
        }


if __name__ == "__main__":
    calc = ConstructionCalculator()
    print(json.dumps(calc.project_estimate(150), indent=2))
