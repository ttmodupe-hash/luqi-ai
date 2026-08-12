"""Skills Engine — Skill assessment and development tracker."""

import json
from typing import Dict, List


class SkillsEngine:
    """Skill assessment and development engine."""

    def __init__(self):
        self.skills_db = {
            "python": {"category": "programming", "level_descriptions": {1: "Basic syntax", 3: "OOP", 5: "Advanced patterns"}},
            "data_analysis": {"category": "analytics", "level_descriptions": {1: "Excel basics", 3: "Pandas", 5: "ML pipelines"}},
            "communication": {"category": "soft", "level_descriptions": {1: "Basic", 3: "Presentations", 5: "Leadership"}},
        }
        self.user_skills = {}

    def assess(self, user_id: str, skill: str, level: int) -> Dict:
        if user_id not in self.user_skills:
            self.user_skills[user_id] = {}
        self.user_skills[user_id][skill] = {
            "level": level,
            "assessed": json.dumps("now"),
        }
        return {"user": user_id, "skill": skill, "level": level}

    def get_skill(self, skill: str) -> Dict:
        return self.skills_db.get(skill.lower(), {"error": "Skill not found"})

    def recommend_learning(self, user_id: str, target_skill: str) -> List[str]:
        current = self.user_skills.get(user_id, {}).get(target_skill, {}).get("level", 0)
        skill_info = self.skills_db.get(target_skill.lower(), {})
        levels = skill_info.get("level_descriptions", {})
        recommendations = []
        for lvl, desc in levels.items():
            if lvl > current:
                recommendations.append(f"Level {lvl}: {desc}")
        return recommendations

    def skill_gap_analysis(self, user_id: str, required_skills: Dict[str, int]) -> Dict:
        user = self.user_skills.get(user_id, {})
        gaps = {}
        for skill, required in required_skills.items():
            current = user.get(skill, {}).get("level", 0)
            if current < required:
                gaps[skill] = {"current": current, "required": required, "gap": required - current}
        return {"gaps": gaps, "ready": len(gaps) == 0}

    def team_skills_matrix(self, user_ids: List[str]) -> Dict:
        matrix = {}
        for uid in user_ids:
            matrix[uid] = self.user_skills.get(uid, {})
        return matrix


if __name__ == "__main__":
    engine = SkillsEngine()
    engine.assess("user1", "python", 3)
    print(json.dumps(engine.recommend_learning("user1", "python"), indent=2))
    print(json.dumps(engine.skill_gap_analysis("user1", {"python": 5, "data_analysis": 2}), indent=2))
