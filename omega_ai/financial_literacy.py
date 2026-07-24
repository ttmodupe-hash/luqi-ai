#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Financial Literacy Module for Omega AI
Provides financial education, budgeting tools, investment guidance,
credit score education, debt management, savings planning, and
personal finance coaching.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class FinancialTopic(Enum):
    """Financial literacy topics"""
    BUDGETING = "budgeting"
    SAVING = "saving"
    INVESTING = "investing"
    CREDIT = "credit"
    DEBT_MANAGEMENT = "debt_management"
    RETIREMENT = "retirement"
    INSURANCE = "insurance"
    TAXES = "taxes"
    EMERGENCY_FUND = "emergency_fund"
    FINANCIAL_PLANNING = "financial_planning"
    BANKING = "banking"
    LOANS = "loans"
    MORTGAGES = "mortgages"
    FINANCIAL_SCAMS = "financial_scams"
    ENTREPRENEURSHIP = "entrepreneurship"
    WEALTH_BUILDING = "wealth_building"


class RiskTolerance(Enum):
    """Investment risk tolerance levels"""
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"
    VERY_AGGRESSIVE = "very_aggressive"


class FinancialGoalType(Enum):
    """Types of financial goals"""
    EMERGENCY_FUND = "emergency_fund"
    RETIREMENT = "retirement"
    HOME_PURCHASE = "home_purchase"
    EDUCATION = "education"
    DEBT_PAYOFF = "debt_payoff"
    VACATION = "vacation"
    CAR_PURCHASE = "car_purchase"
    WEDDING = "wedding"
    BUSINESS = "business"
    WEALTH_BUILDING = "wealth_building"


@dataclass
class FinancialGoal:
    """A financial goal"""
    id: str
    name: str
    goal_type: FinancialGoalType
    target_amount: float
    current_amount: float
    deadline: str
    monthly_contribution: float
    priority: int = 3  # 1-5, 1 being highest
    notes: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "goal_type": self.goal_type.value,
            "target_amount": self.target_amount,
            "current_amount": self.current_amount,
            "deadline": self.deadline,
            "monthly_contribution": self.monthly_contribution,
            "priority": self.priority,
            "notes": self.notes,
            "progress_percentage": round((self.current_amount / self.target_amount) * 100, 1) if self.target_amount > 0 else 0
        }


@dataclass
class BudgetCategory:
    """A budget category"""
    name: str
    allocated_amount: float
    spent_amount: float = 0.0
    category_type: str = "expense"  # income, expense, savings
    
    @property
    def remaining(self) -> float:
        return self.allocated_amount - self.spent_amount
    
    @property
    def percentage_used(self) -> float:
        if self.allocated_amount == 0:
            return 0.0
        return (self.spent_amount / self.allocated_amount) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "allocated_amount": self.allocated_amount,
            "spent_amount": self.spent_amount,
            "remaining": self.remaining,
            "percentage_used": round(self.percentage_used, 1),
            "category_type": self.category_type
        }


@dataclass
class DebtAccount:
    """A debt account"""
    id: str
    name: str
    balance: float
    interest_rate: float  # annual percentage rate
    minimum_payment: float
    account_type: str  # credit_card, student_loan, mortgage, car_loan, personal_loan
    due_date: str = ""
    notes: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "balance": self.balance,
            "interest_rate": self.interest_rate,
            "minimum_payment": self.minimum_payment,
            "account_type": self.account_type,
            "due_date": self.due_date,
            "notes": self.notes,
            "annual_interest_cost": round(self.balance * (self.interest_rate / 100), 2)
        }


@dataclass
class FinancialProfile:
    """User's financial profile"""
    user_id: str
    monthly_income: float = 0.0
    monthly_expenses: float = 0.0
    total_savings: float = 0.0
    total_debt: float = 0.0
    risk_tolerance: RiskTolerance = RiskTolerance.MODERATE
    employment_status: str = ""
    dependents: int = 0
    age: int = 0
    financial_goals: List[FinancialGoal] = field(default_factory=list)
    budget_categories: List[BudgetCategory] = field(default_factory=list)
    debt_accounts: List[DebtAccount] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    @property
    def disposable_income(self) -> float:
        return self.monthly_income - self.monthly_expenses
    
    @property
    def debt_to_income_ratio(self) -> float:
        if self.monthly_income == 0:
            return 0.0
        return (self.total_debt / 12) / self.monthly_income * 100
    
    @property
    def savings_rate(self) -> float:
        if self.monthly_income == 0:
            return 0.0
        return (self.total_savings / self.monthly_income) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "monthly_income": self.monthly_income,
            "monthly_expenses": self.monthly_expenses,
            "disposable_income": self.disposable_income,
            "total_savings": self.total_savings,
            "total_debt": self.total_debt,
            "debt_to_income_ratio": round(self.debt_to_income_ratio, 1),
            "savings_rate": round(self.savings_rate, 1),
            "risk_tolerance": self.risk_tolerance.value,
            "employment_status": self.employment_status,
            "dependents": self.dependents,
            "age": self.age,
            "financial_goals": [g.to_dict() for g in self.financial_goals],
            "budget_categories": [b.to_dict() for b in self.budget_categories],
            "debt_accounts": [d.to_dict() for d in self.debt_accounts],
            "created_at": self.created_at
        }


class FinancialLiteracy:
    """
    Financial Literacy module for Omega AI.
    Provides financial education, budgeting tools, investment guidance,
    and personal finance coaching across multiple topics.
    """
    
    def __init__(self):
        self.profiles: Dict[str, FinancialProfile] = {}
        self.lessons_db = self._initialize_lessons()
        self.quizzes_db = self._initialize_quizzes()
        self.rules_of_thumb = self._initialize_rules_of_thumb()
        logger.info("FinancialLiteracy module initialized")
    
    def _initialize_lessons(self) -> Dict[str, List[Dict]]:
        """Initialize financial literacy lessons"""
        return {
            FinancialTopic.BUDGETING.value: [
                {
                    "title": "Introduction to Budgeting",
                    "content": """Budgeting is the foundation of personal finance. A budget is a plan for how you will spend your money each month.

Key concepts:
- Track all income sources
- Categorize expenses (fixed vs. variable)
- Use the 50/30/20 rule as a starting point
- Review and adjust regularly

Steps to create a budget:
1. Calculate your total monthly income
2. List all fixed expenses (rent, utilities, loan payments)
3. List variable expenses (groceries, entertainment, dining out)
4. Set savings goals
5. Track actual spending vs. budgeted amounts
6. Adjust as needed""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 15
                },
                {
                    "title": "The 50/30/20 Rule",
                    "content": """The 50/30/20 rule is a simple budgeting framework:

- 50% for Needs: Essential expenses like housing, utilities, groceries, transportation, minimum debt payments, and insurance.

- 30% for Wants: Non-essential expenses like dining out, entertainment, hobbies, subscriptions, and travel.

- 20% for Savings and Debt: Emergency fund, retirement savings, extra debt payments, and other financial goals.

This rule provides a starting point. Adjust percentages based on your situation and goals.""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 10
                },
                {
                    "title": "Tracking Expenses",
                    "content": """Tracking expenses is crucial for budget success:

Methods:
- Manual tracking (spreadsheet or notebook)
- Budgeting apps (Mint, YNAB, EveryDollar)
- Bank and credit card statements
- Envelope system (cash-based)

Tips:
- Track every expense, no matter how small
- Review weekly, not just monthly
- Categorize consistently
- Look for patterns and areas to cut
- Be honest about 'want' vs. 'need'""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 12
                }
            ],
            FinancialTopic.SAVING.value: [
                {
                    "title": "Emergency Fund Basics",
                    "content": """An emergency fund is money set aside for unexpected expenses:

Why you need one:
- Job loss or income reduction
- Medical emergencies
- Car repairs
- Home repairs
- Unexpected travel

How much to save:
- Start with $500-$1,000
- Build to 3 months of expenses
- Ideal goal: 6 months of expenses
- If self-employed: 9-12 months

Where to keep it:
- High-yield savings account
- Money market account
- Easily accessible but separate from checking""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 10
                },
                {
                    "title": "Savings Strategies",
                    "content": """Effective savings strategies:

1. Pay yourself first - Automate savings before spending
2. Use separate savings accounts for different goals
3. Take advantage of employer 401(k) matches
4. Save windfalls (tax refunds, bonuses, gifts)
5. Use the 24-hour rule for large purchases
6. Cut subscriptions you don't use
7. Negotiate bills annually
8. Use cashback and rewards programs wisely

The power of compound interest:
- Start early, even with small amounts
- Consistency matters more than amount
- Let time work in your favor""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 15
                }
            ],
            FinancialTopic.INVESTING.value: [
                {
                    "title": "Investing Basics",
                    "content": """Investing is putting money to work to earn more money:

Why invest:
- Beat inflation
- Build wealth over time
- Achieve financial goals
- Prepare for retirement

Key concepts:
- Compound interest: Earnings on earnings
- Risk vs. Return: Higher potential returns come with higher risk
- Diversification: Spread investments across different assets
- Time horizon: When you need the money
- Dollar-cost averaging: Invest regularly regardless of market conditions

Types of investments:
- Stocks: Ownership in companies
- Bonds: Loans to governments or corporations
- Mutual Funds: Professionally managed portfolios
- ETFs: Exchange-traded funds
- Real Estate: Property investments""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 20
                },
                {
                    "title": "Understanding Risk Tolerance",
                    "content": """Risk tolerance is your ability to handle investment losses:

Factors affecting risk tolerance:
- Age: Younger investors can take more risk
- Time horizon: Longer time = more risk capacity
- Income stability: Stable income = more risk capacity
- Financial cushion: More savings = more risk capacity
- Emotional comfort: Can you sleep at night?

Risk tolerance categories:
- Conservative: Capital preservation, minimal risk
- Moderate: Balance of growth and stability
- Aggressive: Maximum growth, high risk tolerance
- Very Aggressive: Speculative investments

Asset allocation by age rule:
Stock percentage = 110 - your age (conservative)
Stock percentage = 120 - your age (moderate)""",
                    "difficulty": "intermediate",
                    "estimated_time_minutes": 15
                }
            ],
            FinancialTopic.CREDIT.value: [
                {
                    "title": "Understanding Credit Scores",
                    "content": """Your credit score is a number that represents your creditworthiness:

Credit score ranges (FICO):
- 300-579: Poor
- 580-669: Fair
- 670-739: Good
- 740-799: Very Good
- 800-850: Excellent

Factors affecting your score:
1. Payment history (35%) - Most important
2. Credit utilization (30%) - Keep under 30%
3. Length of credit history (15%)
4. Credit mix (10%)
5. New credit inquiries (10%)

Tips to improve:
- Pay all bills on time
- Keep credit utilization low
- Don't close old accounts
- Limit new credit applications
- Check credit reports regularly""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 15
                },
                {
                    "title": "Building Credit from Scratch",
                    "content": """How to build credit when you have none:

Options:
1. Secured credit card - Requires a deposit
2. Credit-builder loan - Bank holds loan amount
3. Become an authorized user - On someone else's card
4. Student credit card - Designed for students
5. Store credit card - Often easier to qualify

Best practices:
- Use credit cards responsibly
- Pay full balance each month
- Keep utilization under 30%
- Set up automatic payments
- Monitor your credit score monthly
- Be patient - building credit takes time""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 12
                }
            ],
            FinancialTopic.DEBT_MANAGEMENT.value: [
                {
                    "title": "Debt Payoff Strategies",
                    "content": """Two popular debt payoff methods:

Avalanche Method (Mathematically optimal):
1. List debts by interest rate (highest first)
2. Pay minimum on all debts
3. Put extra money toward highest-rate debt
4. Repeat until all debts are paid
- Saves the most money on interest

Snowball Method (Psychologically motivating):
1. List debts by balance (smallest first)
2. Pay minimum on all debts
3. Put extra money toward smallest balance
4. Repeat until all debts are paid
- Builds momentum with quick wins

Choose the method that works best for your personality and situation.""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 15
                },
                {
                    "title": "Avoiding Debt Traps",
                    "content": """Common debt traps to avoid:

1. Credit card minimum payments - You'll pay mostly interest
2. Payday loans - Extremely high interest rates (300%+ APR)
3. Buy Now, Pay Later - Easy to overspend
4. Car title loans - Risk losing your vehicle
5. Cash advances - High fees and immediate interest
6. Store credit cards - Often have high rates

Warning signs:
- Using credit for daily expenses
- Maxing out credit cards
- Taking cash advances
- Borrowing to pay off debt
- Missing payments
- Hiding debt from family

If you're in debt trouble:
- Contact creditors to negotiate
- Consider credit counseling
- Look into debt consolidation
- Avoid new debt completely
- Seek professional help if needed""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 15
                }
            ],
            FinancialTopic.RETIREMENT.value: [
                {
                    "title": "Retirement Planning Basics",
                    "content": """Retirement planning essentials:

Retirement accounts:
- 401(k): Employer-sponsored, often with match
- Traditional IRA: Tax-deductible contributions
- Roth IRA: Tax-free withdrawals in retirement
- SEP IRA: For self-employed individuals

How much to save:
- Aim for 15% of income (including employer match)
- Target: 25x your annual expenses
- Use the 4% rule as a guideline
- Adjust based on desired lifestyle

The power of starting early:
- $500/month from age 25 to 65 = ~$1.2M (at 7% return)
- $500/month from age 35 to 65 = ~$567K (at 7% return)
- $500/month from age 45 to 65 = ~$260K (at 7% return)

Catch-up contributions (age 50+):
- 401(k): Additional $7,500/year
- IRA: Additional $1,000/year""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 20
                }
            ],
            FinancialTopic.INSURANCE.value: [
                {
                    "title": "Insurance Essentials",
                    "content": """Types of insurance everyone should consider:

1. Health Insurance
   - Essential for medical expenses
   - Understand deductibles, copays, and out-of-pocket maximums

2. Auto Insurance
   - Required by law in most states
   - Liability, collision, and comprehensive coverage

3. Renters/Homeowners Insurance
   - Protects your belongings
   - Covers liability if someone is injured

4. Life Insurance
   - Term life: Affordable, fixed period
   - Whole life: Permanent, builds cash value
   - Rule of thumb: 10x your annual income

5. Disability Insurance
   - Replaces income if you can't work
   - Often overlooked but very important

6. Umbrella Insurance
   - Extra liability coverage
   - Protects against lawsuits""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 18
                }
            ],
            FinancialTopic.EMERGENCY_FUND.value: [
                {
                    "title": "Building Your Emergency Fund",
                    "content": """Steps to build an emergency fund:

Phase 1: Starter Emergency Fund ($500-$1,000)
- Sell unused items
- Reduce expenses temporarily
- Use tax refund or bonus
- Pick up extra work

Phase 2: 3-Month Fund
- Continue saving consistently
- Automate transfers
- Direct windfalls to savings
- Cut non-essential spending

Phase 3: 6-Month Fund (Recommended)
- Maintain savings discipline
- Keep fund in high-yield account
- Replenish after using
- Adjust for life changes

Where to keep it:
- High-yield savings account (recommended)
- Money market account
- Must be liquid and accessible
- NOT in investments (too risky)""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 12
                }
            ],
            FinancialTopic.FINANCIAL_SCAMS.value: [
                {
                    "title": "Common Financial Scams",
                    "content": """Protect yourself from these common scams:

1. Phishing
   - Fake emails/texts asking for personal info
   - Always verify sender
   - Don't click suspicious links

2. Identity Theft
   - Monitor credit reports
   - Shred sensitive documents
   - Use strong, unique passwords

3. Investment Scams
   - If it sounds too good to be true, it is
   - Guaranteed high returns = red flag
   - Pressure to act immediately = red flag

4. Romance Scams
   - Never send money to someone you haven't met
   - Be wary of online relationships

5. Lottery/Sweepstakes Scams
   - You can't win something you didn't enter
   - Never pay to collect winnings

6. Tech Support Scams
   - Legitimate companies don't call unsolicited
   - Never give remote access to unknown callers""",
                    "difficulty": "beginner",
                    "estimated_time_minutes": 15
                }
            ]
        }
    
    def _initialize_quizzes(self) -> Dict[str, List[Dict]]:
        """Initialize financial literacy quizzes"""
        return {
            FinancialTopic.BUDGETING.value: [
                {
                    "question": "What percentage of income should go to needs according to the 50/30/20 rule?",
                    "options": ["30%", "50%", "20%", "40%"],
                    "correct": 1,
                    "explanation": "The 50/30/20 rule suggests 50% for needs, 30% for wants, and 20% for savings."
                },
                {
                    "question": "Which is a fixed expense?",
                    "options": ["Groceries", "Rent", "Entertainment", "Dining out"],
                    "correct": 1,
                    "explanation": "Rent is a fixed expense that stays the same each month."
                }
            ],
            FinancialTopic.SAVING.value: [
                {
                    "question": "How much should you have in an emergency fund ideally?",
                    "options": ["1 month of expenses", "3-6 months of expenses", "1 year of expenses", "$100"],
                    "correct": 1,
                    "explanation": "Financial experts recommend 3-6 months of expenses in an emergency fund."
                },
                {
                    "question": "What is 'paying yourself first'?",
                    "options": ["Buying yourself gifts", "Saving before spending", "Paying bills early", "Investing in yourself"],
                    "correct": 1,
                    "explanation": "Paying yourself first means automatically saving money before spending on other things."
                }
            ],
            FinancialTopic.CREDIT.value: [
                {
                    "question": "What is the most important factor in your credit score?",
                    "options": ["Credit utilization", "Payment history", "Length of credit", "Credit mix"],
                    "correct": 1,
                    "explanation": "Payment history accounts for 35% of your FICO score, making it the most important factor."
                },
                {
                    "question": "What credit utilization ratio is recommended?",
                    "options": ["Under 10%", "Under 30%", "Under 50%", "Under 70%"],
                    "correct": 1,
                    "explanation": "Experts recommend keeping credit utilization under 30% of your available credit."
                }
            ],
            FinancialTopic.INVESTING.value: [
                {
                    "question": "What is compound interest?",
                    "options": ["Interest on principal only", "Interest on principal and accumulated interest", "A type of bank account", "Government interest rate"],
                    "correct": 1,
                    "explanation": "Compound interest is calculated on both the principal and accumulated interest."
                },
                {
                    "question": "What is diversification?",
                    "options": ["Investing all in one stock", "Spreading investments across assets", "A type of retirement account", "Day trading strategy"],
                    "correct": 1,
                    "explanation": "Diversification means spreading investments across different assets to reduce risk."
                }
            ]
        }
    
    def _initialize_rules_of_thumb(self) -> Dict[str, str]:
        """Initialize financial rules of thumb"""
        return {
            "emergency_fund": "Save 3-6 months of expenses",
            "retirement_savings": "Save 15% of income for retirement",
            "housing_costs": "Spend no more than 28% of gross income on housing",
            "total_debt": "Total debt payments should not exceed 36% of gross income",
            "car_payment": "Car payment should not exceed 15% of take-home pay",
            "life_insurance": "Coverage should be 10x your annual income",
            "student_loans": "Don't borrow more than your expected first-year salary",
            "credit_utilization": "Keep credit card balances under 30% of limits",
            "savings_rate": "Save at least 20% of income (50/30/20 rule)",
            "investment_returns": "Expect 7% average annual return from stock market (long-term)",
            "rule_of_72": "Divide 72 by interest rate to find years to double your money",
            "net_worth": "Assets minus liabilities; should increase over time",
            "401k_match": "Always contribute enough to get full employer match",
            "age_bond_allocation": "Your age = percentage in bonds (conservative rule)",
            "retirement_withdrawal": "The 4% rule: withdraw 4% annually in retirement",
        }
    
    def create_profile(self, user_id: str, **kwargs) -> FinancialProfile:
        """Create a financial profile for a user"""
        profile = FinancialProfile(user_id=user_id)
        
        for attr in ["monthly_income", "monthly_expenses", "total_savings", "total_debt"]:
            if attr in kwargs:
                setattr(profile, attr, float(kwargs[attr]))
        
        if "risk_tolerance" in kwargs:
            try:
                profile.risk_tolerance = RiskTolerance(kwargs["risk_tolerance"])
            except ValueError:
                pass
        
        for attr in ["employment_status", "dependents", "age"]:
            if attr in kwargs:
                setattr(profile, attr, kwargs[attr])
        
        self.profiles[user_id] = profile
        logger.info(f"Created financial profile for user {user_id}")
        return profile
    
    def get_profile(self, user_id: str) -> Optional[FinancialProfile]:
        """Get a user's financial profile"""
        return self.profiles.get(user_id)
    
    def update_profile(self, user_id: str, **kwargs) -> Optional[FinancialProfile]:
        """Update a user's financial profile"""
        profile = self.profiles.get(user_id)
        if not profile:
            return None
        
        for key, value in kwargs.items():
            if hasattr(profile, key) and key not in ["financial_goals", "budget_categories", "debt_accounts"]:
                setattr(profile, key, value)
        
        return profile
    
    def add_financial_goal(self, user_id: str, goal: FinancialGoal) -> Optional[FinancialProfile]:
        """Add a financial goal to a user's profile"""
        profile = self.profiles.get(user_id)
        if not profile:
            return None
        
        profile.financial_goals.append(goal)
        return profile
    
    def add_budget_category(self, user_id: str, category: BudgetCategory) -> Optional[FinancialProfile]:
        """Add a budget category to a user's profile"""
        profile = self.profiles.get(user_id)
        if not profile:
            return None
        
        profile.budget_categories.append(category)
        return profile
    
    def add_debt_account(self, user_id: str, debt: DebtAccount) -> Optional[FinancialProfile]:
        """Add a debt account to a user's profile"""
        profile = self.profiles.get(user_id)
        if not profile:
            return None
        
        profile.debt_accounts.append(debt)
        profile.total_debt = sum(d.balance for d in profile.debt_accounts)
        return profile
    
    def get_lesson(self, topic: str, lesson_index: int = 0) -> Dict[str, Any]:
        """Get a financial literacy lesson"""
        lessons = self.lessons_db.get(topic, [])
        if not lessons:
            return {
                "error": f"Topic '{topic}' not found",
                "available_topics": [t.value for t in FinancialTopic]
            }
        
        if lesson_index >= len(lessons):
            return {
                "error": f"Lesson index {lesson_index} out of range",
                "total_lessons": len(lessons)
            }
        
        return {
            "topic": topic,
            "lesson": lessons[lesson_index],
            "total_lessons": len(lessons),
            "current_index": lesson_index
        }
    
    def get_all_lessons_for_topic(self, topic: str) -> Dict[str, Any]:
        """Get all lessons for a topic"""
        lessons = self.lessons_db.get(topic, [])
        if not lessons:
            return {
                "error": f"Topic '{topic}' not found",
                "available_topics": [t.value for t in FinancialTopic]
            }
        
        return {
            "topic": topic,
            "total_lessons": len(lessons),
            "lessons": lessons
        }
    
    def get_quiz(self, topic: str) -> Dict[str, Any]:
        """Get a quiz for a topic"""
        quizzes = self.quizzes_db.get(topic, [])
        if not quizzes:
            return {
                "error": f"No quizzes available for '{topic}'",
                "available_topics": list(self.quizzes_db.keys())
            }
        
        return {
            "topic": topic,
            "total_questions": len(quizzes),
            "questions": quizzes
        }
    
    def calculate_budget_recommendation(self, monthly_income: float) -> Dict[str, Any]:
        """Calculate budget recommendations using 50/30/20 rule"""
        needs = monthly_income * 0.50
        wants = monthly_income * 0.30
        savings = monthly_income * 0.20
        
        return {
            "monthly_income": monthly_income,
            "rule": "50/30/20",
            "needs": {
                "amount": round(needs, 2),
                "percentage": 50,
                "categories": ["Housing", "Utilities", "Groceries", "Transportation", "Insurance", "Minimum debt payments"]
            },
            "wants": {
                "amount": round(wants, 2),
                "percentage": 30,
                "categories": ["Dining out", "Entertainment", "Hobbies", "Subscriptions", "Shopping"]
            },
            "savings": {
                "amount": round(savings, 2),
                "percentage": 20,
                "categories": ["Emergency fund", "Retirement", "Extra debt payments", "Other goals"]
            },
            "note": "Adjust percentages based on your situation. High-cost areas may need 60% for needs."
        }
    
    def calculate_emergency_fund_target(self, monthly_expenses: float, 
                                       months: int = 6) -> Dict[str, Any]:
        """Calculate emergency fund target"""
        target = monthly_expenses * months
        
        return {
            "monthly_expenses": monthly_expenses,
            "recommended_months": months,
            "target_amount": round(target, 2),
            "milestones": {
                "starter": round(monthly_expenses, 2),
                "1_month": round(monthly_expenses, 2),
                "3_months": round(monthly_expenses * 3, 2),
                "6_months": round(target, 2)
            },
            "timeline_examples": {
                "save_100_month": f"{(target / 100):.0f} months to reach target saving $100/month",
                "save_250_month": f"{(target / 250):.0f} months to reach target saving $250/month",
                "save_500_month": f"{(target / 500):.0f} months to reach target saving $500/month"
            }
        }
    
    def calculate_debt_payoff_plan(self, debts: List[DebtAccount], 
                                   extra_payment: float = 0,
                                   method: str = "avalanche") -> Dict[str, Any]:
        """Calculate a debt payoff plan"""
        if not debts:
            return {"error": "No debts provided"}
        
        # Sort debts based on method
        if method == "avalanche":
            sorted_debts = sorted(debts, key=lambda d: d.interest_rate, reverse=True)
        else:  # snowball
            sorted_debts = sorted(debts, key=lambda d: d.balance)
        
        total_balance = sum(d.balance for d in debts)
        total_min_payment = sum(d.minimum_payment for d in debts)
        
        # Simplified payoff calculation
        months_estimate = 0
        remaining = total_balance
        monthly_payment = total_min_payment + extra_payment
        
        while remaining > 0 and months_estimate < 360:  # Cap at 30 years
            monthly_interest = remaining * 0.15 / 12  # Assume average 15% APR
            principal_paid = monthly_payment - monthly_interest
            if principal_paid <= 0:
                break
            remaining -= principal_paid
            months_estimate += 1
        
        return {
            "method": method,
            "total_balance": round(total_balance, 2),
            "total_minimum_payments": round(total_min_payment, 2),
            "extra_payment": round(extra_payment, 2),
            "total_monthly_payment": round(monthly_payment, 2),
            "estimated_months_to_payoff": months_estimate,
            "estimated_payoff_date": (datetime.now() + timedelta(days=30*months_estimate)).strftime("%Y-%m-%d"),
            "debts_order": [{"name": d.name, "balance": d.balance, "rate": d.interest_rate} for d in sorted_debts],
            "interest_saved_vs_minimum": "Calculated by paying more than minimum",
            "tips": [
                "Consider balance transfer cards for high-interest debt",
                "Call creditors to negotiate lower rates",
                "Put windfalls (tax refunds, bonuses) toward debt",
                "Avoid taking on new debt while paying off existing"
            ]
        }
    
    def calculate_retirement_projection(self, current_age: int, retirement_age: int,
                                       monthly_contribution: float, 
                                       current_savings: float = 0,
                                       expected_return: float = 7.0) -> Dict[str, Any]:
        """Calculate retirement savings projection"""
        years_to_retirement = retirement_age - current_age
        if years_to_retirement <= 0:
            return {"error": "Retirement age must be greater than current age"}
        
        # Future value calculation
        monthly_rate = expected_return / 100 / 12
        months = years_to_retirement * 12
        
        # Future value of current savings
        fv_current = current_savings * (1 + expected_return/100) ** years_to_retirement
        
        # Future value of contributions
        fv_contributions = monthly_contribution * (((1 + monthly_rate) ** months - 1) / monthly_rate)
        
        total = fv_current + fv_contributions
        
        # 4% rule - annual withdrawal
        annual_withdrawal = total * 0.04
        monthly_withdrawal = annual_withdrawal / 12
        
        return {
            "current_age": current_age,
            "retirement_age": retirement_age,
            "years_to_retirement": years_to_retirement,
            "monthly_contribution": monthly_contribution,
            "current_savings": current_savings,
            "expected_annual_return": expected_return,
            "projected_total": round(total, 2),
            "annual_withdrawal_4_percent_rule": round(annual_withdrawal, 2),
            "monthly_withdrawal": round(monthly_withdrawal, 2),
            "total_contributed": round(monthly_contribution * months, 2),
            "investment_growth": round(total - current_savings - monthly_contribution * months, 2),
            "scenarios": {
                "conservative_5_percent": round(self._fv_calc(current_savings, monthly_contribution, years_to_retirement, 5.0), 2),
                "moderate_7_percent": round(self._fv_calc(current_savings, monthly_contribution, years_to_retirement, 7.0), 2),
                "optimistic_10_percent": round(self._fv_calc(current_savings, monthly_contribution, years_to_retirement, 10.0), 2)
            }
        }
    
    def _fv_calc(self, current: float, monthly: float, years: int, rate: float) -> float:
        """Calculate future value"""
        monthly_rate = rate / 100 / 12
        months = years * 12
        fv_current = current * (1 + rate/100) ** years
        fv_contrib = monthly * (((1 + monthly_rate) ** months - 1) / monthly_rate) if monthly_rate > 0 else monthly * months
        return fv_current + fv_contrib
    
    def get_rules_of_thumb(self) -> Dict[str, str]:
        """Get all financial rules of thumb"""
        return self.rules_of_thumb
    
    def get_rule_of_thumb(self, name: str) -> Dict[str, str]:
        """Get a specific rule of thumb"""
        rule = self.rules_of_thumb.get(name)
        if rule:
            return {"name": name, "rule": rule}
        return {"error": f"Rule '{name}' not found", "available": list(self.rules_of_thumb.keys())}
    
    def get_topics(self) -> List[str]:
        """Get list of all available topics"""
        return [t.value for t in FinancialTopic]
    
    def get_personalized_advice(self, user_id: str) -> Dict[str, Any]:
        """Get personalized financial advice"""
        profile = self.profiles.get(user_id)
        if not profile:
            return {"error": "Financial profile not found. Create a profile first."}
        
        advice = []
        
        # Check emergency fund
        if profile.total_savings < profile.monthly_expenses * 3:
            advice.append("Priority: Build your emergency fund to at least 3 months of expenses")
        
        # Check debt-to-income
        if profile.debt_to_income_ratio > 36:
            advice.append("Warning: Your debt-to-income ratio is above 36%. Focus on debt reduction.")
        
        # Check savings rate
        if profile.savings_rate < 10:
            advice.append("Try to increase your savings rate to at least 10% of income")
        elif profile.savings_rate >= 20:
            advice.append("Great job! Your savings rate is excellent.")
        
        # Age-based advice
        if profile.age < 30:
            advice.append("At your age, focus on: building emergency fund, starting retirement savings, and paying off high-interest debt")
        elif profile.age < 50:
            advice.append("At your age, focus on: maximizing retirement contributions, reducing debt, and increasing investments")
        else:
            advice.append("At your age, focus on: catch-up retirement contributions, reducing risk, and planning retirement income")
        
        # Risk tolerance advice
        if profile.risk_tolerance == RiskTolerance.CONSERVATIVE:
            advice.append("Your conservative approach is good for capital preservation. Consider if you're being too cautious for your age.")
        elif profile.risk_tolerance == RiskTolerance.AGGRESSIVE:
            advice.append("Your aggressive approach can lead to higher returns. Make sure you have adequate emergency savings and diversification.")
        
        return {
            "user_id": user_id,
            "profile_summary": {
                "monthly_income": profile.monthly_income,
                "disposable_income": profile.disposable_income,
                "debt_to_income_ratio": round(profile.debt_to_income_ratio, 1),
                "savings_rate": round(profile.savings_rate, 1)
            },
            "personalized_advice": advice,
            "recommended_next_steps": [
                "1. Review your budget monthly",
                "2. Set up automatic savings transfers",
                "3. Check your credit report annually",
                "4. Review insurance coverage yearly",
                "5. Rebalance investment portfolio periodically"
            ]
        }
    
    def compound_interest_calculator(self, principal: float, monthly_contribution: float,
                                     annual_rate: float, years: int) -> Dict[str, Any]:
        """Calculate compound interest growth"""
        monthly_rate = annual_rate / 100 / 12
        months = years * 12
        
        balance = principal
        total_contributed = principal
        yearly_breakdown = []
        
        for year in range(1, years + 1):
            start_balance = balance
            for _ in range(12):
                balance += monthly_contribution
                total_contributed += monthly_contribution
                balance *= (1 + monthly_rate)
            
            yearly_breakdown.append({
                "year": year,
                "start_balance": round(start_balance, 2),
                "end_balance": round(balance, 2),
                "contributions_this_year": round(monthly_contribution * 12, 2),
                "growth_this_year": round(balance - start_balance - monthly_contribution * 12, 2)
            })
        
        return {
            "principal": principal,
            "monthly_contribution": monthly_contribution,
            "annual_rate": annual_rate,
            "years": years,
            "final_balance": round(balance, 2),
            "total_contributed": round(total_contributed, 2),
            "total_interest_earned": round(balance - total_contributed, 2),
            "yearly_breakdown": yearly_breakdown
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the FinancialLiteracy module state"""
        return {
            "total_profiles": len(self.profiles),
            "total_lesson_topics": len(self.lessons_db),
            "total_quiz_topics": len(self.quizzes_db),
            "total_rules_of_thumb": len(self.rules_of_thumb),
            "topics_available": self.get_topics()
        }
