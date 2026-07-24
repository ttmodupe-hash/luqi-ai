#!/usr/bin/env python3
"""Luqi AI Jobs & Skills Module — Career development, job search strategies,
resume building, interview preparation, and skill gap analysis for the South
African job market.
"""

import logging
import random
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
#  CAREER DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

# In-demand careers in South Africa
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

# Job search platforms
JOB_PLATFORMS = {
    "linkedin": {"name": "LinkedIn", "type": "Professional Network", "url": "www.linkedin.com", "best_for": "Professional roles, networking"},
    "indeed": {"name": "Indeed South Africa", "type": "Job Board", "url": "www.indeed.co.za", "best_for": "All industries, volume"},
    "careers24": {"name": "Careers24", "type": "Job Board", "url": "www.careers24.com", "best_for": "SA-focused roles"},
    "jobvine": {"name": "JobVine", "type": "Job Board", "url": "www.jobvine.co.za", "best_for": "Entry to mid-level"},
    "glassdoor": {"name": "Glassdoor", "type": "Reviews + Jobs", "url": "www.glassdoor.co.za", "best_for": "Company research + salary info"},
    "pnet": {"name": "PNet", "type": "Job Board", "url": "www.pnet.co.za", "best_for": "Professional roles"},
    "government_jobs": {"name": "Public Service Vacancies", "type": "Government", "url": "www.gov.za/about-government/jobs", "best_for": "Public sector"},
}

# Interview preparation
INTERVIEW_TIPS = {
    "before": [
        "Research the company thoroughly — mission, values, recent news",
        "Review the job description and match your experience to requirements",
        "Prepare STAR stories (Situation, Task, Action, Result)",
        "Practice common questions aloud",
        "Prepare thoughtful questions to ask the interviewer",
        "Plan your outfit and route in advance",
    ],
    "during": [
        "Arrive 10-15 minutes early",
        "Make eye contact and offer a firm handshake",
        "Listen carefully and answer concisely",
        "Use the STAR method for behavioral questions",
        "Show enthusiasm and ask your prepared questions",
        "Take notes if appropriate",
    ],
    "after": [
        "Send a thank-you email within 24 hours",
        "Reiterate your interest and key qualifications",
        "Follow up if no response by the stated timeline",
        "Reflect on what went well and what to improve",
    ],
}

COMMON_QUESTIONS = [
    {"question": "Tell me about yourself.", "approach": "Professional summary — 2-3 minutes max. Start with current role, highlight relevant experience, end with why you're excited about this opportunity."},
    {"question": "What are your strengths?", "approach": "Choose 3 strengths relevant to the role. Give specific examples."},
    {"question": "What are your weaknesses?", "approach": "Pick a real weakness you've worked on. Show the steps you've taken to improve."},
    {"question": "Why do you want to work here?", "approach": "Show you've researched the company. Connect their values/mission to your goals."},
    {"question": "Where do you see yourself in 5 years?", "approach": "Show ambition aligned with the company's growth. Be realistic but aspirational."},
    {"question": "Tell me about a challenge you overcame.", "approach": "Use STAR. Focus on your actions and the positive result."},
    {"question": "What is your expected salary?", "approach": "Give a range based on market research. Express flexibility."},
    {"question": "Why should we hire you?", "approach": "Summarize your top 3 qualifications that match the job requirements."},
    {"question": "Do you have any questions for us?", "approach": "Always say yes. Ask about team culture, success metrics, growth opportunities."},
]

# Free learning resources
LEARNING_RESOURCES = {
    "online_courses": [
        {"name": "Coursera", "url": "www.coursera.org", "type": "University courses", "cost": "Free audit / Paid certificates"},
        {"name": "edX", "url": "www.edx.org", "type": "University courses", "cost": "Free audit / Paid certificates"},
        {"name": "Udemy", "url": "www.udemy.com", "type": "Skills courses", "cost": "Paid (frequent sales)"},
        {"name": "Khan Academy", "url": "www.khanacademy.org", "type": "General education", "cost": "Free"},
        {"name": "Google Digital Skills", "url": "skillshop.withgoogle.com", "type": "Digital marketing", "cost": "Free"},
    ],
    "coding": [
        {"name": "freeCodeCamp", "url": "www.freecodecamp.org", "type": "Programming", "cost": "Free"},
        {"name": "The Odin Project", "url": "www.theodinproject.com", "type": "Web development", "cost": "Free"},
        {"name": "CS50", "url": "cs50.harvard.edu", "type": "Computer Science", "cost": "Free"},
        {"name": "W3Schools", "url": "www.w3schools.com", "type": "Web technologies", "cost": "Free"},
    ],
    "south_africa": [
        {"name": "ICT SETA", "url": "www.ictseta.org.za", "type": "Tech skills", "cost": "Free/paid"},
        {"name": "MLabs", "url": "mlabs.co.za", "type": "Digital skills", "cost": "Free courses"},
        {"name": "Coursera for Africa", "url": "www.coursera.org/africa", "type": "Various", "cost": "Free for eligible learners"},
        {"name": "National Skills Fund", "url": "www.dhet.gov.za", "type": "TVET colleges", "cost": "Government funded"},
    ],
}

# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_in_demand_careers() -> Dict[str, Any]:
    """Get in-demand careers in South Africa."""
    return {
        "status": "success",
        "market": "South Africa",
        "total_categories": len(IN_DEMAND_CAREERS),
        "categories": [{"id": k, "name": v["name"], "role_count": len(v["roles"])} for k, v in IN_DEMAND_CAREERS.items()],
    }


def get_career_category(category: str) -> Dict[str, Any]:
    """Get careers in a specific category."""
    if category not in IN_DEMAND_CAREERS:
        return {"status": "not_found", "available": list(IN_DEMAND_CAREERS.keys())}
    return {"status": "success", **IN_DEMAND_CAREERS[category]}


def get_job_platforms() -> Dict[str, Any]:
    """Get job search platforms."""
    return {
        "status": "success",
        "total_platforms": len(JOB_PLATFORMS),
        "platforms": [{"id": k, **v} for k, v in JOB_PLATFORMS.items()],
    }


def get_interview_tips(stage: str = "all") -> Dict[str, Any]:
    """Get interview preparation tips."""
    if stage == "all":
        return {"status": "success", **INTERVIEW_TIPS}
    if stage in INTERVIEW_TIPS:
        return {"status": "success", stage: INTERVIEW_TIPS[stage]}
    return {"status": "not_found", "available_stages": list(INTERVIEW_TIPS.keys())}


def get_common_questions() -> Dict[str, Any]:
    """Get common interview questions."""
    return {
        "status": "success",
        "total_questions": len(COMMON_QUESTIONS),
        "questions": [{"id": i, **q} for i, q in enumerate(COMMON_QUESTIONS)],
    }


def get_learning_resources(category: str = "") -> Dict[str, Any]:
    """Get free learning resources."""
    if category and category in LEARNING_RESOURCES:
        return {"status": "success", "category": category, "resources": LEARNING_RESOURCES[category]}
    return {
        "status": "success",
        "total_categories": len(LEARNING_RESOURCES),
        "categories": list(LEARNING_RESOURCES.keys()),
        "all_resources": {k: v for k, v in LEARNING_RESOURCES.items()},
    }


def build_resume(name: str, experience: List[Dict] = None, education: List[Dict] = None,
                 skills: List[str] = None) -> Dict[str, Any]:
    """Build a resume structure."""
    if experience is None:
        experience = []
    if education is None:
        education = []
    if skills is None:
        skills = []

    resume = {
        "name": name,
        "contact": {"phone": "", "email": "", "linkedin": "", "location": ""},
        "summary": "",
        "experience": experience,
        "education": education,
        "skills": skills,
        "certifications": [],
        "references": "Available upon request",
    }

    tips = [
        "Keep to 1-2 pages",
        "Use action verbs (led, developed, increased)",
        "Quantify achievements where possible",
        "Tailor to each job application",
        "Proofread carefully",
    ]

    return {"status": "success", "resume": resume, "tips": tips}


def analyze_skill_gap(current_skills: List[str], target_role: str) -> Dict[str, Any]:
    """Analyze skill gaps for a target role."""
    # Find the role
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
        return {"status": "not_found", "message": f"Role '{target_role}' not found. Use get_in_demand_careers() to see available roles."}

    current_set = set(s.lower() for s in current_skills)
    required_set = set(s.lower() for s in required_skills)

    missing = [s for s in required_skills if s.lower() not in current_set]
    matching = [s for s in required_skills if s.lower() in current_set]
    extra = [s for s in current_skills if s.lower() not in required_set]

    return {
        "status": "success",
        "target_role": target_role,
        "match_percentage": round(len(matching) / len(required_skills) * 100, 1) if required_skills else 0,
        "matching_skills": matching,
        "missing_skills": missing,
        "additional_skills": extra,
        "recommendations": [f"Learn {s}" for s in missing] if missing else ["You have all required skills!"],
    }


def salary_benchmark(role: str, experience_years: int = 0) -> Dict[str, Any]:
    """Get salary benchmark for a role."""
    # Find the role
    for cat in IN_DEMAND_CAREERS.values():
        for r in cat["roles"]:
            if role.lower() in r["title"].lower():
                salary_range = r["avg_salary"]
                demand = r["demand"]

                # Adjust for experience
                if experience_years < 2:
                    level = "Entry Level"
                elif experience_years < 5:
                    level = "Mid Level"
                else:
                    level = "Senior Level"

                return {
                    "status": "success",
                    "role": r["title"],
                    "experience_level": level,
                    "years_experience": experience_years,
                    "salary_range": salary_range,
                    "market_demand": demand,
                }

    return {"status": "not_found", "message": f"No salary data for '{role}'. Use get_in_demand_careers() to see available roles."}


def career_path(role: str) -> Dict[str, Any]:
    """Get a typical career path for a role."""
    paths = {
        "software developer": {
            "entry": "Junior Developer",
            "mid": ["Mid-Level Developer", "Senior Developer", "Tech Lead"],
            "senior": ["Principal Engineer", "Engineering Manager", "CTO"],
            "timeline": "5-15 years to senior levels",
        },
        "data scientist": {
            "entry": "Junior Data Analyst",
            "mid": ["Data Scientist", "Senior Data Scientist", "Lead Data Scientist"],
            "senior": ["Principal Data Scientist", "Head of Data", "Chief Data Officer"],
            "timeline": "5-12 years to senior levels",
        },
        "project manager": {
            "entry": "Project Coordinator",
            "mid": ["Project Manager", "Senior Project Manager", "Program Manager"],
            "senior": ["Director of PMO", "VP of Operations", "COO"],
            "timeline": "5-15 years to senior levels",
        },
    }

    key = role.lower()
    if key not in paths:
        return {"status": "not_found", "available_paths": list(paths.keys())}
    return {"status": "success", "role": role, **paths[key]}
