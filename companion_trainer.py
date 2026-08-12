"""Companion Trainer — Personal companion and training assistant."""

import json
from typing import Dict, List


class CompanionTrainer:
    """AI companion for personal training and coaching."""

    def __init__(self):
        self.workouts = {
            "beginner": [
                {"exercise": "Walking", "duration": "30 min", "intensity": "low"},
                {"exercise": "Bodyweight squats", "reps": "2x10", "intensity": "low"},
                {"exercise": "Push-ups (knee)", "reps": "2x5", "intensity": "low"},
            ],
            "intermediate": [
                {"exercise": "Running", "duration": "30 min", "intensity": "medium"},
                {"exercise": "Squats", "reps": "3x15", "intensity": "medium"},
                {"exercise": "Push-ups", "reps": "3x10", "intensity": "medium"},
            ],
            "advanced": [
                {"exercise": "HIIT", "duration": "45 min", "intensity": "high"},
                {"exercise": "Deadlifts", "reps": "4x8", "intensity": "high"},
                {"exercise": "Pull-ups", "reps": "4x10", "intensity": "high"},
            ],
        }

    def get_workout(self, level: str = "beginner") -> List[Dict]:
        return self.workouts.get(level, self.workouts["beginner"])

    def create_plan(self, goal: str, days_per_week: int = 3) -> Dict:
        return {
            "goal": goal,
            "days_per_week": days_per_week,
            "sessions": [
                {"day": "Mon", "focus": "Cardio"},
                {"day": "Wed", "focus": "Strength"},
                {"day": "Fri", "focus": "Flexibility"},
            ],
        }

    def track_progress(self, exercise: str, reps: int, weight: float) -> Dict:
        return {
            "exercise": exercise,
            "volume": reps * weight,
            "progress": "up" if weight > 0 else "stable",
        }


if __name__ == "__main__":
    trainer = CompanionTrainer()
    print(json.dumps(trainer.get_workout("intermediate"), indent=2))
    print(json.dumps(trainer.create_plan("Build muscle"), indent=2))
