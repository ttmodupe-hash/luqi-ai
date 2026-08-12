"""Financial Literacy — Financial education and literacy platform."""

import json
from typing import Dict, List


class FinancialLiteracy:
    """Financial literacy education platform."""

    def __init__(self):
        self.modules = {
            "budgeting": {
                "title": "Budgeting Basics",
                "lessons": ["Income tracking", "Expense categorization", "50/30/20 rule", "Emergency funds"],
                "duration": "2 hours",
            },
            "investing": {
                "title": "Introduction to Investing",
                "lessons": ["Risk vs return", "Compound interest", "Diversification", "ETFs vs stocks"],
                "duration": "3 hours",
            },
            "debt": {
                "title": "Managing Debt",
                "lessons": ["Good debt vs bad debt", "Interest rates", "Debt consolidation", "Credit scores"],
                "duration": "1.5 hours",
            },
            "retirement": {
                "title": "Retirement Planning",
                "lessons": ["Pension funds", "RA vs pension", "Annuities", "Tax benefits"],
                "duration": "2 hours",
            },
        }

    def get_module(self, name: str) -> Dict:
        return self.modules.get(name.lower(), {"error": "Module not found"})

    def list_modules(self) -> List[str]:
        return list(self.modules.keys())

    def quiz(self, module: str) -> List[Dict]:
        quizzes = {
            "budgeting": [
                {"question": "What is the 50/30/20 rule?", "options": ["50 needs, 30 wants, 20 savings", "50 savings, 30 needs, 20 wants"], "correct": 0},
            ],
            "investing": [
                {"question": "What is diversification?", "options": ["Spreading investments", "Concentrating investments"], "correct": 0},
            ],
        }
        return quizzes.get(module.lower(), [])

    def calculate_budget(self, income: float) -> Dict:
        return {
            "income": income,
            "needs_50%": income * 0.5,
            "wants_30%": income * 0.3,
            "savings_20%": income * 0.2,
        }


if __name__ == "__main__":
    literacy = FinancialLiteracy()
    print(json.dumps(literacy.get_module("budgeting"), indent=2))
    print(json.dumps(literacy.calculate_budget(25000), indent=2))
