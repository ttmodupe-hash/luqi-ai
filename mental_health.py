"""Mental Health — Mental health resources and support guide."""

import json
from typing import Dict, List


class MentalHealth:
    """Mental health support and resources."""

    def __init__(self):
        self.helplines = [
            {"name": "SADAG", "number": "0800-567-567", "hours": "8am-8pm", "services": ["counselling", "crisis"]},
            {"name": "Lifeline", "number": "0861-322-322", "hours": "24h", "services": ["crisis", "suicide prevention"]},
            {"name": "Childline", "number": "0800-055-555", "hours": "24h", "services": ["child counselling"]},
        ]
        self.resources = {
            "anxiety": ["Deep breathing exercises", "Progressive muscle relaxation", "Grounding techniques (5-4-3-2-1)"],
            "depression": ["Behavioural activation", "Sleep hygiene", "Social connection"],
            "stress": ["Time management", "Physical exercise", "Mindfulness meditation"],
            "trauma": ["Seek professional help", "EMDR therapy", "Support groups"],
        }

    def get_helplines(self, service: str = None) -> List[Dict]:
        if service:
            return [h for h in self.helplines if service.lower() in [s.lower() for s in h["services"]]]
        return self.helplines

    def get_resources(self, condition: str) -> List[str]:
        return self.resources.get(condition.lower(), ["Consult a mental health professional"])

    self_assessment = lambda self, responses: {
        "score": sum(responses),
        "recommendation": "Seek professional help" if sum(responses) > 15 else "Self-care strategies" if sum(responses) > 8 else "Continue monitoring"
    }

    def wellness_plan(self, focus_area: str) -> Dict:
        plans = {
            "stress": {"daily": ["10 min meditation", "Walk 30 min"], "weekly": ["Social activity", "Hobby time"]},
            "sleep": {"daily": ["No screens 1h before bed", "Consistent bedtime"], "weekly": ["Bedroom declutter", "Relaxation routine"]},
            "mood": {"daily": ["Gratitude journal", "Sunlight exposure"], "weekly": ["Therapy session", "Nature outing"]},
        }
        return plans.get(focus_area.lower(), {"daily": [], "weekly": []})


if __name__ == "__main__":
    mh = MentalHealth()
    print(json.dumps(mh.get_helplines("crisis"), indent=2))
    print(json.dumps(mh.get_resources("anxiety"), indent=2))
    print(json.dumps(mh.wellness_plan("stress"), indent=2))
