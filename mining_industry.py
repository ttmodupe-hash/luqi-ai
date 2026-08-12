"""Mining Industry — South African mining industry data."""

import json
from typing import Dict, List


class MiningIndustry:
    """South African mining industry information."""

    def __init__(self):
        self.commodities = {
            "gold": {"production_tons": 100, "world_rank": 10, "major_mines": ["Mponeng", "Driefontein", "Kloof"]},
            "platinum": {"production_tons": 140, "world_rank": 1, "major_mines": ["Bushveld Complex", "Marikana", "Rustenburg"]},
            "coal": {"production_tons": 250000, "world_rank": 7, "major_mines": ["Mafube", "Kleinkopje", "New Vaal"]},
            "iron_ore": {"production_tons": 70000, "world_rank": 7, "major_mines": ["Sishen", "Thabazimbi"]},
            "diamonds": {"production_carat": 7000000, "world_rank": 6, "major_mines": ["Venetia", "Finsch", "Cullinan"]},
        }
        self.regulations = [
            "Mine Health and Safety Act (1996)",
            "Mineral and Petroleum Resources Development Act (2002)",
            "Broad-Based Socio-Economic Empowerment Charter",
        ]

    def get_commodity(self, name: str) -> Dict:
        return self.commodities.get(name.lower(), {"error": "Commodity not found"})

    def safety_stats(self) -> Dict:
        return {
            "fatalities_2023": 49,
            "fatality_rate": "0.03 per 1000 workers",
            "major_risks": ["rockfalls", "machinery", "heat stress", "toxic gases"],
            "improvement": "Down 40% from 2000",
        }

    economic_impact = lambda self: {
        "gdp_contribution": "7.5%",
        "employment": "450,000 direct",
        "exports": "R400 billion annually",
        "tax_revenue": "R50 billion",
    }

    def transformation(self) -> Dict:
        return {
            "mining_charter": "26% black ownership required",
            "procurement": "70% local content",
            "housing": "Improved living conditions",
            "skills": "R&D investment targets",
        }


if __name__ == "__main__":
    mining = MiningIndustry()
    print(json.dumps(mining.get_commodity("platinum"), indent=2))
    print(json.dumps(mining.safety_stats(), indent=2))
    print(json.dumps(mining.economic_impact(), indent=2))
