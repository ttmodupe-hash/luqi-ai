"""Nutrition Planner — Meal planning and nutrition advisor."""

import json
from typing import Dict, List


class NutritionPlanner:
    """Nutrition and meal planning assistant."""

    def __init__(self):
        self.foods = {
            "pap": {"calories": 200, "protein": 4, "carbs": 45, "fat": 1, "category": "staple"},
            "mielies": {"calories": 86, "protein": 3, "carbs": 19, "fat": 1, "category": "vegetable"},
            "biltong": {"calories": 300, "protein": 50, "carbs": 2, "fat": 10, "category": "protein"},
            "boerewors": {"calories": 250, "protein": 15, "carbs": 2, "fat": 20, "category": "protein"},
            "spinach": {"calories": 23, "protein": 3, "carbs": 4, "fat": 0, "category": "vegetable"},
            "chicken": {"calories": 165, "protein": 31, "carbs": 0, "fat": 3, "category": "protein"},
        }
        self.diets = {
            "balanced": {"protein": 25, "carbs": 50, "fat": 25},
            "keto": {"protein": 30, "carbs": 5, "fat": 65},
            "low_carb": {"protein": 40, "carbs": 20, "fat": 40},
            "high_protein": {"protein": 45, "carbs": 30, "fat": 25},
        }

    def get_food_info(self, food: str) -> Dict:
        return self.foods.get(food.lower(), {"error": "Food not found"})

    def meal_plan(self, calories: float, diet_type: str = "balanced") -> Dict:
        macros = self.diets.get(diet_type.lower(), self.diets["balanced"])
        return {
            "calories": calories,
            "diet": diet_type,
            "protein_g": round(calories * macros["protein"] / 100 / 4, 1),
            "carbs_g": round(calories * macros["carbs"] / 100 / 4, 1),
            "fat_g": round(calories * macros["fat"] / 100 / 9, 1),
        }

    def suggest_meals(self, calories: float, preferences: List[str] = None) -> List[Dict]:
        preferences = preferences or []
        meals = [
            {"name": "Pap and spinach", "foods": ["pap", "spinach"], "total_cal": 223},
            {"name": "Chicken and mielies", "foods": ["chicken", "mielies"], "total_cal": 251},
            {"name": "Biltong snack", "foods": ["biltong"], "total_cal": 300},
        ]
        return [m for m in meals if m["total_cal"] <= calories]

    def bmi_recommendation(self, bmi: float) -> str:
        if bmi < 18.5:
            return "Increase caloric intake with nutrient-dense foods"
        elif bmi < 25:
            return "Maintain current diet with balanced nutrition"
        elif bmi < 30:
            return "Reduce portion sizes and increase vegetables"
        else:
            return "Consult a nutritionist for a structured plan"


if __name__ == "__main__":
    nutrition = NutritionPlanner()
    print(json.dumps(nutrition.get_food_info("pap"), indent=2))
    print(json.dumps(nutrition.meal_plan(2000, "balanced"), indent=2))
    print(json.dumps(nutrition.suggest_meals(500), indent=2))
