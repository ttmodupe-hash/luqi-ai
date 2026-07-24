#!/usr/bin/env python3
"""Luqi AI Jobs & Skills Module — Career development, job search strategies,
resume building, interview preparation, and skill gap analysis.
"""

import logging
import random
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
#  DATA
# ═══════════════════════════════════════════════════════════════════════════════

# In-demand careers
IN_DEMAND_CAREERS = {
    "technology": {
        "name": "Information Technology",
        "roles": [
            {"title": "Software Developer", "avg_salary": "R450,000 - R850,000", "demand": "Very High", "skills": ["Python", "JavaScript", "SQL", "Git"]},
            {"title": "Data Scientist", "avg_salary": "R500,000 - R950,000", "demand": "Very High", "skills": ["Python", "R", "Machine Learning", "Statistics"]},
            {"title": "Cloud Architect", "avg_salary": "R700,000 - R1,200,000", "demand": "High", "skills": ["AWS/Azure/GCP", "Terraform", "Kubernetes", "CI/CD"]},
            {"title": "Cybersecurity Analyst", "avg_salary": "R450,000 - R800,000", "demand": "Very High", "skills": ["Network Security", "SIEM", "Penetration Testing", "Risk Assessment"]},
            {"title": "DevOps Engineer", "avg_salary": "R550,000 - R950,000", "demand": "High", "skills": ["Docker", "Kubernetes", "Jenkins", "AWS/Azure"]},
            {"title": "AI/ML Engineer", "avg_salary": "R600,000 - R1,100,000", "demand": "Very High", "skills": ["TensorFlow/PyTorch", "Python", "Deep Learning", "NLP"]},
        ],
    },
    "healthcare": {
        "name": "Healthcare",
        "roles": [
            {"title": "Registered Nurse", "avg_salary": "R250,000 - R450,000", "demand": "Very High", "skills": ["Patient Care", "Medical Administration", "Emergency Response"]},
            {"title": "Medical Doctor", "avg_salary": "R600,000 - R1,500,000", "demand": "High", "skills": ["Diagnosis", "Treatment Planning", "Medical Ethics"]},
            {"title": "Pharmacist", "avg_salary": "R400,000 - R650,000", "demand": "High", "skills": ["Pharmaceutical Knowledge", "Patient Counseling", "Inventory Management"]},
            {"title": "Biomedical Engineer", "avg_salary": "R350,000 - R600,000", "demand": "Medium", "skills": ["Medical Devices", "Equipment Maintenance", "Regulatory Compliance"]},
        ],
    },
    "finance": {
        "name": "Finance & Banking",
        "roles": [
            {"title": "Chartered Accountant (CA)", "avg_salary": "R600,000 - R1,200,000", "demand": "High", "skills": ["Financial Reporting", "Auditing", "Tax", "IFRS"]},
            {"title": "Financial Analyst", "avg_salary": "R350,000 - R650,000", "demand": "High", "skills": ["Financial Modeling", "Excel", "Valuation", "Research"]},
            {"title": "Actuary", "avg_salary": "R800,000 - R1,500,000", "demand": "High", "skills": ["Statistics", "Risk Assessment", "Mathematics", "Programming"]},
            {"title": "Investment Banker", "avg_salary": "R700,000 - R2,000,000", "demand": "Medium", "skills": ["M&A", "Financial Modeling", "Negotiation", "Market Analysis"]},
        ],
    },
    "engineering": {
        "name": "Engineering",
        "roles": [
            {"title": "Civil Engineer", "avg_salary": "R400,000 - R750,000", "demand": "High", "skills": ["AutoCAD", "Project Management", "Structural Analysis"]},
            {"title": "Electrical Engineer", "avg_salary": "R400,000 - R800,000", "demand": "High", "skills": ["Circuit Design", "Power Systems", "PLC Programming"]},
            {"title": "Mechanical Engineer", "avg_salary": "R400,000 - R750,000", "demand": "Medium", "skills": ["CAD/CAM", "Thermodynamics", "Manufacturing Processes"]},
            {"title": "Mining Engineer", "avg_salary": "R500,000 - R900,000", "demand": "Medium", "skills": ["Mine Planning", "Safety Management", "Resource Estimation"]},
        ],
    },
    "business": {
        "name": "Business & Management",
        "roles": [
            {"title": "Project Manager", "avg_salary": "R450,000 - R850,000", "demand": "High", "skills": ["Agile/Scrum", "Stakeholder Management", "Risk Management", "PMP"]},
            {"title": "Management Consultant", "avg_salary": "R500,000 - R1,000,000", "demand": "Medium", "skills": ["Strategy", "Problem Solving", "Data Analysis", "Communication"]},
            {"title": "HR Manager", "avg_salary": "R350,000 - R650,000", "demand": "Medium", "skills": ["Labour Law", "Talent Management", "Organizational Development"]},
            {"title": "Marketing Manager", "avg_salary": "R400,000 - R750,000", "demand": "Medium", "skills": ["Digital Marketing", "Brand Management", "Analytics", "Content Strategy"]},
        ],
    },
}

# Interview questions database
INTERVIEW_QUESTIONS = {
    "software": {
        "entry": [
            "What programming languages are you most comfortable with?",
            "Describe a project you built from scratch.",
            "How do you approach debugging code?",
            "Explain version control and why it's important.",
        ],
        "mid": [
            "Design a URL shortener. What components would you need?",
            "How do you handle technical debt in a growing codebase?",
            "Explain the CAP theorem and its implications.",
            "Describe your approach to code reviews.",
        ],
        "senior": [
            "Design a distributed message queue. How would you handle failures?",
            "How do you balance shipping features with code quality?",
            "Describe a time you had to make a significant architectural decision.",
            "How would you mentor junior developers?",
        ],
    },
    "data": {
        "entry": [
            "What tools have you used for data analysis?",
            "Explain the difference between SQL and NoSQL databases.",
            "How do you handle missing data in a dataset?",
        ],
        "mid": [
            "Describe a machine learning project you worked on end-to-end.",
            "How do you prevent overfitting in a model?",
            "How do you communicate complex data insights to non-technical stakeholders?",
        ],
        "senior": [
            "Design a real-time recommendation system.",
            "How do you ensure model fairness and reduce bias?",
            "Describe your MLOps pipeline.",
        ],
    },
    "general": {
        "entry": [
            "Tell me about yourself.",
            "Why do you want to work here?",
            "What are your strengths and weaknesses?",
            "Where do you see yourself in 5 years?",
        ],
        "mid": [
            "Describe a challenging situation at work and how you handled it.",
            "How do you prioritize multiple competing deadlines?",
            "Tell me about a time you disagreed with a colleague.",
        ],
        "senior": [
            "How do you build and lead high-performing teams?",
            "Describe a time you had to make an unpopular decision.",
            "How do you align team goals with company strategy?",
            "What is your approach to managing stakeholder expectations?",
        ],
    },
}

# Freelance guides
FREELANCE_GUIDES = {
    "upwork": {
        "name": "Upwork",
        "steps": [
            "Create a complete profile with portfolio",
            "Start with small jobs to build reputation",
            "Write personalized proposals",
            "Deliver high-quality work on time",
            "Request feedback from clients",
        ],
        "tips": ["Specialize in a niche", "Keep your availability updated", "Respond quickly to invitations"],
        "average_rates": {"entry": "$15-30/hr", "mid": "$30-75/hr", "senior": "$75-150+/hr"},
    },
    "fiverr": {
        "name": "Fiverr",
        "steps": [
            "Create gig packages at different price points",
            "Use high-quality images and videos",
            "Optimize gig titles with keywords",
            "Deliver exceptional service for reviews",
            "Upsell premium packages",
        ],
        "tips": ["Start with competitive pricing", "Offer gig extras", "Promote on social media"],
        "average_rates": {"entry": "$5-25/gig", "mid": "$25-100/gig", "senior": "$100-500+/gig"},
    },
    "general": {
        "name": "General Freelancing",
        "steps": [
            "Define your niche and target clients",
            "Build a portfolio website",
            "Network on LinkedIn and industry forums",
            "Set clear contracts and payment terms",
            "Continuously upskill and stay current",
        ],
        "tips": ["Always get a contract in writing", "Track your time and expenses", "Save for taxes"],
        "average_rates": {"entry": "$10-25/hr", "mid": "$25-75/hr", "senior": "$75-200+/hr"},
    },
}

# Job market data
JOB_MARKET_DATA = {
    "nigeria": {
        "country": "Nigeria",
        "unemployment_rate": "33.3%",
        "top_sectors": ["Technology", "Agriculture", "Finance", "Healthcare", "Energy"],
        "growth_sectors": ["Fintech", "E-commerce", "Renewable Energy", "Telecommunications"],
        "average_salary_range": "NGN 100,000 - 500,000/month",
    },
    "south_africa": {
        "country": "South Africa",
        "unemployment_rate": "32.9%",
        "top_sectors": ["Finance", "Technology", "Mining", "Healthcare", "Manufacturing"],
        "growth_sectors": ["Software Development", "Data Science", "Cybersecurity", "Renewable Energy"],
        "average_salary_range": "R 15,000 - 80,000/month",
    },
}

# Salary data
SALARY_DATA = {
    "nigeria": {
        "software_engineer": {"entry": 150000, "mid": 450000, "senior": 1200000},
        "data_scientist": {"entry": 200000, "mid": 600000, "senior": 1500000},
    },
    "south_africa": {
        "software_engineer": {"entry": 25000, "mid": 55000, "senior": 120000},
        "data_scientist": {"entry": 30000, "mid": 65000, "senior": 140000},
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_in_demand_careers() -> Dict[str, Any]:
    """Get in-demand careers in South Africa."""
    return {"status": "success", "market": "South Africa",
            "total_categories": len(IN_DEMAND_CAREERS),
            "categories": [{"id": k, "name": v["name"], "role_count": len(v["roles"])}
                          for k, v in IN_DEMAND_CAREERS.items()]}


def get_career_category(category: str) -> Dict[str, Any]:
    """Get careers in a specific category."""
    if category not in IN_DEMAND_CAREERS:
        return {"status": "not_found", "available": list(IN_DEMAND_CAREERS.keys())}
    return {"status": "success", **IN_DEMAND_CAREERS[category]}


def get_job_platforms() -> Dict[str, Any]:
    """Get job search platforms."""
    return {"status": "success", "total_platforms": len(JOB_PLATFORMS),
            "platforms": [{"id": k, **v} for k, v in JOB_PLATFORMS.items()]}


def get_interview_tips(stage: str = "all") -> Dict[str, Any]:
    """Get interview preparation tips."""
    # Implementation would go here
    return {"status": "success", "stage": stage, "tips": []}


def get_common_questions() -> Dict[str, Any]:
    """Get common interview questions."""
    return {"status": "success", "total_questions": 0, "questions": []}


def get_learning_resources(category: str = "") -> Dict[str, Any]:
    """Get free learning resources."""
    return {"status": "success", "category": category, "resources": []}


def build_resume(name: str, experience: List[Dict] = None, education: List[Dict] = None,
                 skills: List[str] = None) -> Dict[str, Any]:
    """Build a resume structure."""
    if experience is None: experience = []
    if education is None: education = []
    if skills is None: skills = []
    return {"status": "success", "resume": {"name": name, "experience": experience,
            "education": education, "skills": skills}, "tips": []}


def build_cv(config: dict) -> Dict[str, Any]:
    """Build a CV from a config dict."""
    name = config.get("name", "")
    template_name = config.get("template", "modern")
    templates = {"modern": "Modern", "traditional": "Traditional",
                 "creative": "Creative"}
    template_display = templates.get(template_name, "Professional")
    cv_content = {
        "name": name,
        "title": config.get("title", ""),
        "email": config.get("email", ""),
        "skills": config.get("skills", []),
        "experience_years": config.get("experience_years", 0),
    }
    return {"status": "success", "cv_content": cv_content,
            "template": {"name": template_display}}


def get_interview_questions(field: str = "general", level: str = "mid") -> Dict[str, Any]:
    """Get interview questions for a field and level."""
    field_lower = field.lower()
    level_lower = level.lower()
    level_map = {"junior": "entry", "entry": "entry", "mid": "mid",
                 "senior": "senior", "lead": "senior"}
    level_key = level_map.get(level_lower, "mid")

    # Resolve field
    resolved_field = "general"
    for key in INTERVIEW_QUESTIONS:
        if key in field_lower:
            resolved_field = key
            break

    questions = INTERVIEW_QUESTIONS.get(resolved_field, INTERVIEW_QUESTIONS["general"])\
                                 .get(level_key, [])

    return {"status": "success", "field": resolved_field, "level": level,
            "total_questions": len(questions),
            "questions": [{"id": i + 1, "question": q} for i, q in enumerate(questions)]}


def assess_skills(topic: str = "general", answers: list = None) -> Dict[str, Any]:
    """Generate a skills assessment or grade answers."""
    quizzes = {
        "python": {
            "topic": "Python Programming",
            "questions": [
                {"q": "Output of print(type([]))?", "options": ["list", "tuple", "dict"], "correct": 0},
                {"q": "Method to add to a set?", "options": ["append", "add", "insert"], "correct": 1},
                {"q": "What does @staticmethod do?", "options": ["Class method", "Static method", "Private method"], "correct": 1},
                {"q": "What is a list comprehension?", "options": ["Concise list creation", "A loop", "Sorting"], "correct": 0},
                {"q": "Purpose of __name__ == '__main__'?", "options": ["Check run vs import", "Define function", "Create package"], "correct": 0},
            ],
        },
        "general": {
            "topic": "General Professional Skills",
            "questions": [
                {"q": "What does API stand for?", "options": ["Application Programming Interface", "Advanced Program Integration", "Automated Process"], "correct": 0},
                {"q": "HTTP method to retrieve data?", "options": ["POST", "GET", "DELETE"], "correct": 1},
                {"q": "What is Git used for?", "options": ["Version control", "Database", "Hosting"], "correct": 0},
                {"q": "What does SQL stand for?", "options": ["Structured Query Language", "Simple Question Language", "System Query"], "correct": 0},
            ],
        },
    }

    topic_lower = topic.lower()
    if topic_lower not in quizzes:
        return {"status": "available_topics",
                "topics": list(quizzes.keys()),
                "message": f"Topic '{topic}' not available."}

    quiz = quizzes[topic_lower]

    if answers is not None:
        # Grade the answers
        correct_count = 0
        questions_list = quiz["questions"]
        for i, ans in enumerate(answers):
            if i < len(questions_list) and ans == questions_list[i]["correct"]:
                correct_count += 1
        total = len(questions_list)
        score_pct = (correct_count / total * 100) if total > 0 else 0

        if score_pct >= 80:
            level = "expert"
        elif score_pct >= 50:
            level = "intermediate"
        else:
            level = "beginner"

        return {"status": "success", "score": int(score_pct),
                "correct": correct_count, "total": total, "level": level}

    # Return quiz without answers
    questions_only = [{"id": i + 1, "question": q["q"], "options": q["options"]}
                      for i, q in enumerate(quiz["questions"])]
    return {"status": "ready", "topic": quiz["topic"],
            "total_questions": len(quiz["questions"]), "questions": questions_only}


def get_job_market(country: str = "global", role: str = "") -> Dict[str, Any]:
    """Get job market overview for a country."""
    country_lower = country.lower()
    data = JOB_MARKET_DATA.get(country_lower)
    if not data:
        return {"status": "available_countries",
                "countries": list(JOB_MARKET_DATA.keys()),
                "message": f"No data for '{country}'."}
    result = {"status": "success", "country": country, "role": role}
    result.update(data)
    return result


def plan_career(*args, **kwargs) -> Dict[str, Any]:
    """Generate a personalized career development plan."""
    if not kwargs and not args:
        return {"status": "error", "message": "At least one parameter is required"}

    current_role = kwargs.get("current_role", "")
    target_role = kwargs.get("target_role", "")
    years = kwargs.get("years_experience", 0)

    if years <= 2:
        milestones = ["Master fundamentals", "Build portfolio", "Get certified", "Find a mentor"]
        timeline = "1-2 years"
    elif years <= 5:
        milestones = ["Take on leadership", "Specialize deeply", "Build network", "Mentor juniors"]
        timeline = "2-3 years"
    else:
        milestones = ["Architect systems", "Build teams", "Speak at conferences", "Consider management"]
        timeline = "3-5 years"

    return {"status": "success", "current_role": current_role,
            "target_role": target_role, "years_experience": years,
            "milestones": milestones, "estimated_timeline": timeline}


def get_freelance_guide(skill: str = "", platform: str = "general") -> Dict[str, Any]:
    """Get freelance guide for a skill and platform."""
    platform_lower = platform.lower()
    guide = FREELANCE_GUIDES.get(platform_lower)
    if not guide:
        guide = FREELANCE_GUIDES["general"]

    return {"status": "success", "skill": skill, "platform": platform,
            "steps": guide["steps"], "tips": guide["tips"],
            "average_rates": guide["average_rates"]}


def generate_coverletter(role: str, company: str = "", skills: list = None) -> Dict[str, Any]:
    """Generate a cover letter."""
    if skills is None:
        skills = []
    company_line = f" at {company}" if company else ""
    skills_text = ", ".join(skills) if skills else "my technical skills"

    letter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {role} position{company_line}.

With hands-on experience in {skills_text}, I am confident in my ability to contribute effectively to your team from day one. I am passionate about delivering high-quality work and continuously improving my craft.

I would welcome the opportunity to discuss how my background aligns with your team's needs.

Sincerely,
[Your Name]
"""
    return {"status": "success", "role": role, "company": company,
            "cover_letter": letter}


def get_salary_guide(country: str = "nigeria", role: str = "", years: int = 0) -> Dict[str, Any]:
    """Get salary guide for a role in a specific country."""
    country_data = SALARY_DATA.get(country.lower(), {})
    role_data = country_data.get(role.lower(), {})

    if not role_data:
        return {"status": "not_found", "message": f"No salary data for '{role}' in '{country}'."}

    if years <= 2:
        level, monthly = "entry", role_data["entry"]
    elif years <= 5:
        level, monthly = "mid", role_data["mid"]
    else:
        level, monthly = "senior", role_data["senior"]

    # Convert to USD (approximate rates)
    usd_rates = {"nigeria": 0.00065, "south_africa": 0.055}
    rate = usd_rates.get(country.lower(), 0.001)
    monthly_usd = int(monthly * rate)

    return {"status": "success", "country": country, "role": role,
            "years_experience": years, "level": level,
            "monthly_salary_local": monthly,
            "monthly_salary_usd": monthly_usd}


def analyze_skill_gap(current_skills: List[str], target_role: str) -> Dict[str, Any]:
    """Analyze skill gaps for a target role."""
    required_skills = []
    role_found = False
    for cat in IN_DEMAND_CAREERS.values():
        for role in cat["roles"]:
            if target_role.lower() in role["title"].lower():
                required_skills = role["skills"]
                role_found = True
                break
        if role_found:
            break

    if not role_found:
        return {"status": "not_found", "message": f"Role '{target_role}' not found."}

    current_set = set(s.lower() for s in current_skills)
    matching = [s for s in required_skills if s.lower() in current_set]
    missing = [s for s in required_skills if s.lower() not in current_set]

    return {"status": "success", "target_role": target_role,
            "match_percentage": round(len(matching) / len(required_skills) * 100, 1),
            "matching_skills": matching, "missing_skills": missing,
            "recommendations": [f"Learn {s}" for s in missing] if missing else ["All skills match!"]}


def salary_benchmark(role: str, experience_years: int = 0) -> Dict[str, Any]:
    """Get salary benchmark for a role."""
    for cat in IN_DEMAND_CAREERS.values():
        for r in cat["roles"]:
            if role.lower() in r["title"].lower():
                level = "Entry" if experience_years < 2 else "Mid" if experience_years < 5 else "Senior"
                return {"status": "success", "role": r["title"],
                        "experience_level": level, "salary_range": r["avg_salary"]}
    return {"status": "not_found", "message": f"No salary data for '{role}'."}


def career_path(role: str) -> Dict[str, Any]:
    """Get a typical career path for a role."""
    paths = {
        "software developer": {"entry": "Junior Developer", "mid": ["Mid Developer", "Senior Developer"],
                              "senior": ["Principal Engineer", "Engineering Manager", "CTO"]},
        "data scientist": {"entry": "Junior Data Analyst", "mid": ["Data Scientist", "Senior Data Scientist"],
                          "senior": ["Principal Data Scientist", "Head of Data", "CDO"]},
    }
    key = role.lower()
    if key not in paths:
        return {"status": "not_found", "available": list(paths.keys())}
    return {"status": "success", "role": role, **paths[key]}
