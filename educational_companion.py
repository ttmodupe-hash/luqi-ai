"""Educational Companion — AI tutor and learning assistant."""

import json
from typing import Dict, List


class EducationalCompanion:
    """AI-powered educational companion."""

    def __init__(self):
        self.subjects = {
            "mathematics": ["algebra", "calculus", "geometry", "statistics"],
            "science": ["physics", "chemistry", "biology", "earth_science"],
            "languages": ["english", "afrikaans", "isiZulu", "isiXhosa"],
            "commerce": ["accounting", "economics", "business_studies"],
        }

    def get_curriculum(self, grade: int, subject: str) -> List[str]:
        """Get curriculum topics for a grade and subject."""
        topics = {
            "mathematics": {
                10: ["equations", "functions", "trigonometry"],
                11: ["calculus_intro", "probability", "analytical_geometry"],
                12: ["differential_calculus", "integration", "linear_programming"],
            },
            "science": {
                10: ["mechanics", "chemical_bonding", "cells"],
                11: ["electromagnetism", "organic_chemistry", "genetics"],
                12: ["modern_physics", "chemical_equilibrium", "evolution"],
            },
        }
        return topics.get(subject, {}).get(grade, [])

    def generate_quiz(self, subject: str, grade: int, num_questions: int = 5) -> List[Dict]:
        topics = self.get_curriculum(grade, subject)
        questions = []
        for i in range(min(num_questions, len(topics))):
            questions.append({
                "id": i + 1,
                "topic": topics[i],
                "question": f"Sample question about {topics[i]}",
                "options": ["A", "B", "C", "D"],
                "correct": "A",
            })
        return questions

    def explain_concept(self, concept: str) -> str:
        explanations = {
            "photosynthesis": "The process by which plants convert light energy into chemical energy.",
            "pythagoras": "In a right triangle, a² + b² = c² where c is the hypotenuse.",
            "supply_demand": "The relationship between goods available and consumer desire.",
        }
        return explanations.get(concept.lower(), f"Explanation for {concept} not available yet.")


if __name__ == "__main__":
    companion = EducationalCompanion()
    print(json.dumps(companion.get_curriculum(12, "mathematics"), indent=2))
    print(json.dumps(companion.generate_quiz("mathematics", 12), indent=2))
    print(companion.explain_concept("photosynthesis"))
