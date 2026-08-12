"""Agriculture Advisor — Crop prediction, pest management, and farming optimization."""

import json
from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class CropRecommendation:
    crop: str
    season: str
    soil_type: str
    water_needs: str
    pest_risk: str
    yield_estimate: float  # tons per hectare
    market_price: float  # ZAR per ton


CROP_DATABASE = {
    "maize": CropRecommendation(
        crop="Maize",
        season="Spring-Summer (Oct-Mar)",
        soil_type="Loam, well-drained",
        water_needs="High (500-800mm/season)",
        pest_risk="Medium (Fall armyworm, stalk borer)",
        yield_estimate=6.5,
        market_price=4200.0,
    ),
    "wheat": CropRecommendation(
        crop="Wheat",
        season="Winter (May-Sep)",
        soil_type="Clay loam",
        water_needs="Medium (400-600mm/season)",
        pest_risk="Low-Medium (Russian wheat aphid)",
        yield_estimate=4.0,
        market_price=6800.0,
    ),
    "soybeans": CropRecommendation(
        crop="Soybeans",
        season="Summer (Nov-Mar)",
        soil_type="Loam, pH 6.0-6.5",
        water_needs="Medium (450-700mm/season)",
        pest_risk="Medium (Aphids, whitefly)",
        yield_estimate=2.8,
        market_price=8500.0,
    ),
    "sorghum": CropRecommendation(
        crop="Sorghum",
        season="Summer (Nov-Apr)",
        soil_type="Sandy loam to clay",
        water_needs="Low-Medium (300-500mm/season)",
        pest_risk="Low (Midge, head caterpillar)",
        yield_estimate=3.5,
        market_price=3800.0,
    ),
    "sunflower": CropRecommendation(
        crop="Sunflower",
        season="Summer (Nov-Mar)",
        soil_type="Well-drained, pH 6.0-7.5",
        water_needs="Medium (400-600mm/season)",
        pest_risk="Medium (Cutworm, bollworm)",
        yield_estimate=1.8,
        market_price=9200.0,
    ),
}


class AgricultureAdvisor:
    """Farming and crop advisory engine."""

    def __init__(self):
        self.crops = CROP_DATABASE

    def recommend_crop(self, soil_type: str, rainfall: float, season: str) -> List[Dict]:
        """Recommend crops based on conditions."""
        recommendations = []
        for name, crop in self.crops.items():
            score = 0
            if soil_type.lower() in crop.soil_type.lower():
                score += 3
            if season.lower() in crop.season.lower():
                score += 2
            if rainfall >= 300:  # minimum threshold
                score += 1
            if score >= 3:
                recommendations.append({
                    "crop": crop.crop,
                    "confidence": score,
                    "yield_estimate": crop.yield_estimate,
                    "market_price": crop.market_price,
                    "water_needs": crop.water_needs,
                    "pest_risk": crop.pest_risk,
                })
        return sorted(recommendations, key=lambda x: x["confidence"], reverse=True)

    def pest_advisory(self, crop: str, pest_name: str) -> Dict:
        """Get pest management advice."""
        pest_db = {
            "fall armyworm": {
                "crops": ["maize", "sorghum"],
                "symptoms": "Window-pane damage on leaves, frass in whorl",
                "control": "Bt maize, biological control (Trichogramma), early planting",
                "chemical": "Spinetoram, chlorantraniliprole",
            },
            "stalk borer": {
                "crops": ["maize", "sorghum"],
                "symptoms": "Dead heart in young plants, holes in stems",
                "control": "Crop rotation, resistant varieties, destruction of stubble",
                "chemical": "Carbofuran, cypermethrin",
            },
        }
        return pest_db.get(pest_name.lower(), {"note": "Consult local extension officer"})

    def fertilizer_guide(self, crop: str, soil_test: Dict) -> Dict:
        """Fertilizer recommendation based on soil test."""
        return {
            "N": f"{soil_test.get('N', 0) * 1.2:.1f} kg/ha",
            "P": f"{soil_test.get('P', 0) * 0.8:.1f} kg/ha",
            "K": f"{soil_test.get('K', 0) * 1.0:.1f} kg/ha",
            "note": "Apply 2/3 at planting, 1/3 at top-dressing",
        }

    def climate_advisory(self, region: str) -> Dict:
        """Climate-specific farming advice."""
        climate_db = {
            "limpopo": {"rainfall": "400-600mm", "season": "Nov-Apr", "risks": "Drought, heat"},
            "free state": {"rainfall": "500-700mm", "season": "Oct-Apr", "risks": "Hail, frost"},
            "kwazulu-natal": {"rainfall": "800-1200mm", "season": "Oct-May", "risks": "Flooding"},
        }
        return climate_db.get(region.lower(), {"note": "Data not available for this region"})


if __name__ == "__main__":
    advisor = AgricultureAdvisor()
    print(json.dumps(advisor.recommend_crop("loam", 600, "summer"), indent=2))
    print(json.dumps(advisor.pest_advisory("maize", "fall armyworm"), indent=2))
