#!/usr/bin/env python3
"""
Self-Improvement Module v25.1.0 "LUQI"
========================================
AI-powered self-improvement tools for goal setting, habit tracking,
reflection prompts, and personal development planning.

Usage:
    from work_support.self_improve import set_goal, daily_reflection
    goal = set_goal("Learn Python", target_date="2024-12-31")
"""

import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta

# ═══════════════════════════════════════════════════════════════════════════════
#  GOAL SETTING
# ═══════════════════════════════════════════════════════════════════════════════

def set_goal(title: str, description: str = "", target_date: str = "", category: str = "personal") -> Dict:
    """Set a SMART goal."""
    if not title:
        return {"status": "error", "message": "Goal title is required"}
    
    goal = {
        "status": "success",
        "goal": {
            "title": title,
            "description": description,
            "target_date": target_date,
            "category": category,
            "created": datetime.now().isoformat(),
            "progress": 0,
            "milestones": _generate_milestones(title, target_date),
        },
    }
    return goal


def _generate_milestones(title: str, target_date: str) -> List[Dict]:
    """Generate automatic milestones for a goal."""
    milestones = [
        {"title": f"Research {title}", "completed": False, "order": 1},
        {"title": f"Create plan for {title}", "completed": False, "order": 2},
        {"title": f"First milestone of {title}", "completed": False, "order": 3},
        {"title": f"Mid-point check: {title}", "completed": False, "order": 4},
        {"title": f"Complete {title}", "completed": False, "order": 5},
    ]
    return milestones


def update_progress(goal_title: str, progress_percent: int) -> Dict:
    """Update progress on a goal."""
    if not 0 <= progress_percent <= 100:
        return {"status": "error", "message": "Progress must be between 0 and 100"}
    
    return {
        "status": "success",
        "goal": goal_title,
        "progress": progress_percent,
        "updated": datetime.now().isoformat(),
        "milestone_reached": _check_milestone(progress_percent),
    }


def _check_milestone(progress: int) -> Optional[str]:
    """Check if a milestone has been reached."""
    milestones = {25: "25% milestone reached!", 50: "Halfway there!", 75: "75% milestone reached!", 100: "Goal completed!"}
    return milestones.get(progress)


# ═══════════════════════════════════════════════════════════════════════════════
#  HABIT TRACKING
# ═══════════════════════════════════════════════════════════════════════════════

HABIT_SUGGESTIONS = {
    "health": ["Drink 8 glasses of water", "Exercise for 30 minutes", "Get 7-8 hours of sleep", "Eat 5 servings of fruits/vegetables"],
    "productivity": ["Plan tomorrow today", "Complete the most important task first", "Take a 5-minute break every hour", "Review daily goals"],
    "learning": ["Read for 30 minutes", "Practice a new skill for 20 minutes", "Watch an educational video", "Write down 3 new things learned"],
    "mindfulness": ["Meditate for 10 minutes", "Write in a gratitude journal", "Practice deep breathing", "Take a mindful walk"],
    "career": ["Connect with one professional", "Learn one new work-related skill", "Update your resume/LinkedIn", "Read industry news"],
    "relationships": ["Call a friend or family member", "Write a thank-you note", "Spend quality time with loved ones", "Practice active listening"],
}


def suggest_habits(category: str = "productivity", count: int = 3) -> Dict:
    """Suggest habits based on category."""
    habits = HABIT_SUGGESTIONS.get(category.lower(), [])
    if not habits:
        return {"status": "error", "available_categories": list(HABIT_SUGGESTIONS.keys())}
    
    selected = habits[:count]
    return {"status": "success", "category": category, "habits": selected}


def track_habit(habit_name: str, completed: bool = True, streak: int = 0) -> Dict:
    """Track a habit completion."""
    new_streak = streak + 1 if completed else 0
    return {
        "status": "success",
        "habit": habit_name,
        "completed": completed,
        "streak": new_streak,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "motivation": _get_motivation(new_streak) if completed else "Don't break the chain!",
    }


def _get_motivation(streak: int) -> str:
    """Get a motivation message based on streak."""
    if streak >= 30:
        return f"Incredible! {streak} day streak! You're building a lifestyle!"
    elif streak >= 14:
        return f"Amazing! {streak} day streak! Keep it up!"
    elif streak >= 7:
        return f"Great job! {streak} day streak!"
    elif streak >= 3:
        return f"Nice! {streak} day streak!"
    else:
        return "Every day counts! Keep going!"


# ═══════════════════════════════════════════════════════════════════════════════
#  REFLECTION PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

DAILY_PROMPTS = [
    "What was the highlight of your day?",
    "What did you learn today?",
    "What are you grateful for today?",
    "What challenged you today and how did you handle it?",
    "What would you do differently today?",
    "What are you looking forward to tomorrow?",
    "Who made a positive impact on your day?",
    "What is one thing you did well today?",
]

WEEKLY_PROMPTS = [
    "What were your top 3 achievements this week?",
    "What habits served you well this week?",
    "What do you want to focus on next week?",
    "What did you learn about yourself this week?",
    "How did you move closer to your goals this week?",
]

MONTHLY_PROMPTS = [
    "What were your biggest wins this month?",
    "What areas need more attention next month?",
    "How have you grown compared to last month?",
    "What relationships did you nurture this month?",
    "What is your main focus for next month?",
]


def daily_reflection(prompt_index: int = None) -> Dict:
    """Get a daily reflection prompt."""
    if prompt_index is not None and 0 <= prompt_index < len(DAILY_PROMPTS):
        prompt = DAILY_PROMPTS[prompt_index]
    else:
        import random
        prompt = random.choice(DAILY_PROMPTS)
    
    return {
        "status": "success",
        "type": "daily_reflection",
        "prompt": prompt,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "tips": [
            "Write freely without judgment",
            "Be specific and honest",
            "Focus on growth, not perfection",
        ],
    }


def weekly_review() -> Dict:
    """Get weekly review prompts."""
    return {
        "status": "success",
        "type": "weekly_review",
        "prompts": WEEKLY_PROMPTS,
        "date_range": {
            "start": (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
            "end": datetime.now().strftime("%Y-%m-%d"),
        },
    }


def monthly_review() -> Dict:
    """Get monthly review prompts."""
    return {
        "status": "success",
        "type": "monthly_review",
        "prompts": MONTHLY_PROMPTS,
        "month": datetime.now().strftime("%B %Y"),
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  PERSONAL DEVELOPMENT PLAN
# ═══════════════════════════════════════════════════════════════════════════════

def create_development_plan(area: str, timeframe: str = "3 months") -> Dict:
    """Create a personal development plan."""
    plans = {
        "leadership": {
            "focus": "Develop leadership skills",
            "actions": ["Read one leadership book per month", "Seek feedback from team members", "Practice delegation", "Lead a team meeting"],
            "resources": ["'Leaders Eat Last' by Simon Sinek", "'The 7 Habits of Highly Effective People'", "Leadership podcasts"],
        },
        "communication": {
            "focus": "Improve communication skills",
            "actions": ["Practice active listening daily", "Write clear summaries after meetings", "Give one presentation per month", "Ask for feedback on communication"],
            "resources": ["'Crucial Conversations' book", "Toastmasters club", "Communication skills courses"],
        },
        "technical": {
            "focus": "Advance technical skills",
            "actions": ["Complete one technical course", "Build a side project", "Contribute to open source", "Attend a tech conference"],
            "resources": ["Online courses (Coursera, Udemy)", "Technical blogs", "GitHub projects", "Tech meetups"],
        },
        "wellness": {
            "focus": "Improve physical and mental wellness",
            "actions": ["Establish a morning routine", "Exercise 3x per week", "Practice mindfulness", "Improve sleep hygiene"],
            "resources": ["Meditation apps", "Fitness programs", "Wellness books", "Health podcasts"],
        },
        "creativity": {
            "focus": "Boost creative thinking",
            "actions": ["Dedicate time to creative hobbies", "Try something new weekly", "Keep an idea journal", "Collaborate with creative people"],
            "resources": ["'Creative Confidence' by IDEO", "Design thinking workshops", "Art classes", "Creative writing prompts"],
        },
    }
    
    plan = plans.get(area.lower())
    if not plan:
        return {"status": "error", "available_areas": list(plans.keys())}
    
    return {
        "status": "success",
        "area": area,
        "timeframe": timeframe,
        "development_plan": plan,
        "start_date": datetime.now().strftime("%Y-%m-%d"),
        "checkpoints": [
            (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d") + " - 30-day review",
            (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d") + " - 60-day review",
            (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d") + " - 90-day review",
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  FASTAPI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def api_set_goal(title: str, description: str = "", target_date: str = "", category: str = "personal") -> Dict:
    return set_goal(title, description, target_date, category)

def api_suggest_habits(category: str = "productivity", count: int = 3) -> Dict:
    return suggest_habits(category, count)

def api_daily_reflection(prompt_index: int = None) -> Dict:
    return daily_reflection(prompt_index)

def api_create_plan(area: str, timeframe: str = "3 months") -> Dict:
    return create_development_plan(area, timeframe)


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 50)
    print("Self-Improvement Module Demo")
    print("=" * 50)
    
    print("\n--- Goal Setting ---")
    goal = set_goal("Learn Python", "Master Python programming", "2024-12-31", "technical")
    print(f"Goal: {goal['goal']['title']}")
    print(f"Milestones: {[m['title'] for m in goal['goal']['milestones']]}")
    
    print("\n--- Habit Tracking ---")
    habit = track_habit("Read 30 minutes", completed=True, streak=5)
    print(f"Habit: {habit['habit']}, Streak: {habit['streak']} days")
    print(f"Motivation: {habit['motivation']}")
    
    print("\n--- Daily Reflection ---")
    reflection = daily_reflection()
    print(f"Prompt: {reflection['prompt']}")
    
    print("\n--- Development Plan ---")
    plan = create_development_plan("technical")
    print(f"Focus: {plan['development_plan']['focus']}")
    print(f"Actions: {plan['development_plan']['actions']}")
