"""Job Market — Job market analysis and opportunity finder."""

import json
from typing import Dict, List


class JobMarket:
    """South African job market analyzer."""

    def __init__(self):
        self.sectors = {
            "technology": {"growth": 15.2, "salary_range": "R350k-R1.2m", "demand": "high"},
            "healthcare": {"growth": 8.5, "salary_range": "R250k-R1.5m", "demand": "high"},
            "finance": {"growth": 6.3, "salary_range": "R300k-R1.8m", "demand": "medium"},
            "engineering": {"growth": 7.8, "salary_range": "R320k-R1.1m", "demand": "high"},
            "education": {"growth": 3.2, "salary_range": "R180k-R500k", "demand": "medium"},
            "agriculture": {"growth": 4.5, "salary_range": "R150k-R600k", "demand": "medium"},
        }
        self.skills_in_demand = [
            "Python", "Data Science", "Cloud Computing", "Cybersecurity",
            "AI/ML", "Project Management", "DevOps", "UI/UX Design",
        ]

    def sector_analysis(self, sector: str) -> Dict:
        return self.sectors.get(sector.lower(), {"error": "Sector not found"})

    def salary_benchmark(self, role: str, experience_years: int) -> Dict:
        benchmarks = {
            "software_developer": {"entry": 350000, "mid": 650000, "senior": 1100000},
            "data_scientist": {"entry": 400000, "mid": 750000, "senior": 1300000},
            "project_manager": {"entry": 380000, "mid": 700000, "senior": 1200000},
        }
        role_data = benchmarks.get(role.lower().replace(" ", "_"), {})
        level = "entry" if experience_years < 3 else "mid" if experience_years < 7 else "senior"
        return {"role": role, "experience": experience_years, "estimated_salary": role_data.get(level)}

    def trending_skills(self) -> List[str]:
        return self.skills_in_demand

    def job_search_tips(self) -> List[str]:
        return [
            "Tailor your CV for each application",
            "Use LinkedIn for networking",
            "Prepare for technical assessments",
            "Research the company before interviews",
            "Follow up within 1 week",
        ]


if __name__ == "__main__":
    market = JobMarket()
    print(json.dumps(market.sector_analysis("technology"), indent=2))
    print(json.dumps(market.salary_benchmark("software_developer", 5), indent=2))
    print(json.dumps(market.trending_skills(), indent=2))
