"""Sports & Fitness — Sports and fitness guide."""

import json
from typing import Dict, List


class SportsFitness:
    """Sports and fitness guide for South Africa."""

    def __init__(self):
        self.activities = {
            "running": {"calories_per_hour": 600, "difficulty": "beginner", "equipment": ["shoes"]},
            "cycling": {"calories_per_hour": 500, "difficulty": "beginner", "equipment": ["bike", "helmet"]},
            "swimming": {"calories_per_hour": 400, "difficulty": "intermediate", "equipment": ["swimsuit"]},
            "hiking": {"calories_per_hour": 450, "difficulty": "beginner", "equipment": ["boots", "backpack"]},
            "yoga": {"calories_per_hour": 200, "difficulty": "beginner", "equipment": ["mat"]},
            "rugby": {"calories_per_hour": 700, "difficulty": "advanced", "equipment": ["boots", "mouthguard"]},
            "cricket": {"calories_per_hour": 350, "difficulty": "intermediate", "equipment": ["bat", "pads"]},
        }
        self.trails = [
            {"name": "Table Mountain", "location": "Cape Town", "difficulty": "moderate", "distance_km": 3.5},
            {"name": "Drakensberg", "location": "KwaZulu-Natal", "difficulty": "hard", "distance_km": 12},
            {"name": "Cradle of Humankind", "location": "Gauteng", "difficulty": "easy", "distance_km": 5},
        ]

    def get_activity(self, name: str) -> Dict:
        return self.activities.get(name.lower(), {"error": "Activity not found"})

    def calories_burned(self, activity: str, minutes: float, weight_kg: float = 70) -> float:
        info = self.activities.get(activity.lower(), {})
        rate = info.get("calories_per_hour", 300)
        return round(rate * (minutes / 60) * (weight_kg / 70), 1)

    def find_trails(self, location: str = None, difficulty: str = None) -> List[Dict]:
        results = self.trails
        if location:
            results = [t for t in results if location.lower() in t["location"].lower()]
        if difficulty:
            results = [t for t in results if t["difficulty"] == difficulty]
        return results

    def workout_plan(self, goal: str, level: str = "beginner") -> List[Dict]:
        plans = {
            "weight_loss": [
                {"day": "Mon", "activity": "Running", "duration": "30 min"},
                {"day": "Tue", "activity": "Yoga", "duration": "45 min"},
                {"day": "Wed", "activity": "Cycling", "duration": "45 min"},
            ],
            "muscle_gain": [
                {"day": "Mon", "activity": "Strength training", "duration": "60 min"},
                {"day": "Tue", "activity": "Rest", "duration": "-"},
                {"day": "Wed", "activity": "Strength training", "duration": "60 min"},
            ],
        }
        return plans.get(goal.lower().replace(" ", "_"), [])

    def bmi_category(self, bmi: float) -> str:
        if bmi < 18.5:
            return "Underweight"
        elif bmi < 25:
            return "Normal"
        elif bmi < 30:
            return "Overweight"
        else:
            return "Obese"


if __name__ == "__main__":
    fitness = SportsFitness()
    print(json.dumps(fitness.get_activity("running"), indent=2))
    print(f"Calories burned: {fitness.calories_burned('running', 60, 75)}")
    print(json.dumps(fitness.find_trails("Cape Town"), indent=2))
    print(json.dumps(fitness.workout_plan("weight_loss"), indent=2))
