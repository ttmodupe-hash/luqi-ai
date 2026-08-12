"""OmniLab Academies — STEM education and academy network."""

import json
from typing import Dict, List


class OmniLabAcademies:
    """OmniLab STEM academy network."""

    def __init__(self):
        self.academies = [
            {"name": "OmniLab Cape Town", "location": "Cape Town", "focus": "AI & Robotics", "capacity": 200},
            {"name": "OmniLab Johannesburg", "location": "Johannesburg", "focus": "Data Science", "capacity": 300},
            {"name": "OmniLab Durban", "location": "Durban", "focus": "Marine Biology", "capacity": 150},
            {"name": "OmniLab Pretoria", "location": "Pretoria", "focus": "Agricultural Tech", "capacity": 180},
        ]
        self.programs = {
            "ai_fundamentals": {"duration": "12 weeks", "level": "beginner", "prerequisites": ["Python basics"]},
            "robotics": {"duration": "16 weeks", "level": "intermediate", "prerequisites": ["Basic electronics"]},
            "data_science": {"duration": "20 weeks", "level": "intermediate", "prerequisites": ["Statistics", "Python"]},
            "biotech": {"duration": "24 weeks", "level": "advanced", "prerequisites": ["Biology", "Chemistry"]},
        }

    def find_academy(self, location: str = None, focus: str = None) -> List[Dict]:
        results = self.academies
        if location:
            results = [a for a in results if location.lower() in a["location"].lower()]
        if focus:
            results = [a for a in results if focus.lower() in a["focus"].lower()]
        return results

    def get_program(self, name: str) -> Dict:
        return self.programs.get(name.lower().replace(" ", "_"), {"error": "Program not found"})

    def list_programs(self) -> List[str]:
        return list(self.programs.keys())

    def enrollment_stats(self) -> Dict:
        return {
            "total_academies": len(self.academies),
            "total_capacity": sum(a["capacity"] for a in self.academies),
            "programs": len(self.programs),
        }

    def scholarship_info(self) -> Dict:
        return {
            "merit": {"coverage": "100%", "criteria": "Academic excellence"},
            "needs": {"coverage": "75%", "criteria": "Financial need + academic potential"},
            "women_in_stem": {"coverage": "90%", "criteria": "Female students in STEM"},
        }


if __name__ == "__main__":
    omni = OmniLabAcademies()
    print(json.dumps(omni.find_academy("Cape Town"), indent=2))
    print(json.dumps(omni.get_program("ai_fundamentals"), indent=2))
    print(json.dumps(omni.scholarship_info(), indent=2))
