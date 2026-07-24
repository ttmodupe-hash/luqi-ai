#!/usr/bin/env python3
"""
Professional Assist Module v25.1.0 "LUQI"
===========================================
AI-powered professional tools for career development, workplace productivity,
and business communication. Includes resume analysis, meeting prep, and more.

Usage:
    from work_support.professional_assist import analyze_resume, prep_meeting
    analysis = analyze_resume("Software Engineer with 5 years Python experience...")
"""

import json
import re
from typing import Dict, List, Optional
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
#  RESUME ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════

SKILL_KEYWORDS = {
    "programming": ["python", "javascript", "java", "c++", "c#", "go", "rust", "ruby", "php", "swift", "kotlin"],
    "web": ["html", "css", "react", "angular", "vue", "django", "flask", "fastapi", "node.js", "express"],
    "data": ["sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "pandas", "numpy", "spark", "hadoop"],
    "cloud": ["aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "github actions", "ci/cd"],
    "ai": ["machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "nlp", "computer vision", "llm"],
    "soft_skills": ["leadership", "communication", "teamwork", "problem-solving", "project management", "agile", "scrum"],
}

ACTION_VERBS = ["led", "managed", "developed", "created", "built", "designed", "implemented", "optimized",
                "improved", "increased", "decreased", "reduced", "achieved", "delivered", "launched",
                "spearheaded", "orchestrated", "engineered", "architected", "mentored", "collaborated"]

WEAK_WORDS = ["helped", "assisted", "worked on", "responsible for", "involved in", "participated", "tried"]


def analyze_resume(resume_text: str) -> Dict:
    """Analyze a resume and provide feedback."""
    text_lower = resume_text.lower()
    
    # Skill detection
    found_skills = {}
    for category, keywords in SKILL_KEYWORDS.items():
        found = [kw for kw in keywords if kw in text_lower]
        if found:
            found_skills[category] = found
    
    # Action verbs
    found_actions = [verb for verb in ACTION_VERBS if verb in text_lower]
    
    # Weak words
    found_weak = [word for word in WEAK_WORDS if word in text_lower]
    
    # Metrics detection (numbers with %, $, or units)
    metrics = re.findall(r'\d+[\d,]*\s*(%|\$|percent|million|thousand|x|times|years?)', text_lower)
    
    # Word count
    word_count = len(resume_text.split())
    
    # Sections check
    sections = ["experience", "education", "skills", "projects", "summary", "contact"]
    found_sections = [s for s in sections if s in text_lower]
    
    suggestions = []
    if word_count > 1000:
        suggestions.append(f"Resume is {word_count} words. Consider keeping it under 700 words for better readability.")
    if len(found_actions) < 5:
        suggestions.append(f"Only {len(found_actions)} action verbs found. Use more strong action verbs to describe achievements.")
    if found_weak:
        suggestions.append(f"Weak phrases detected: {', '.join(found_weak[:3])}. Replace with specific achievements.")
    if len(metrics) < 3:
        suggestions.append("Add more quantifiable metrics (%, $, numbers) to demonstrate impact.")
    if "summary" not in found_sections and "objective" not in text_lower:
        suggestions.append("Consider adding a professional summary at the top.")
    
    return {
        "status": "success",
        "word_count": word_count,
        "skills_found": found_skills,
        "skills_count": sum(len(v) for v in found_skills.values()),
        "action_verbs": found_actions,
        "weak_words": found_weak,
        "quantifiable_metrics": len(metrics),
        "sections_found": found_sections,
        "missing_sections": [s for s in sections if s not in found_sections],
        "score": _calculate_resume_score(found_skills, found_actions, found_weak, metrics, word_count),
        "suggestions": suggestions if suggestions else ["Great resume!"],
    }


def _calculate_resume_score(skills, actions, weak_words, metrics, word_count) -> int:
    """Calculate a resume quality score (0-100)."""
    score = 50  # Base score
    score += min(sum(len(v) for v in skills.values()) * 3, 30)  # Skills bonus
    score += min(len(actions) * 2, 10)  # Action verbs bonus
    score -= len(weak_words) * 3  # Weak words penalty
    score += min(len(metrics) * 2, 10)  # Metrics bonus
    if 300 <= word_count <= 700:
        score += 5
    return max(0, min(100, score))


def suggest_skills(target_role: str) -> Dict:
    """Suggest skills for a target role."""
    role_lower = target_role.lower()
    
    role_skills = {
        "software engineer": ["python", "java", "git", "sql", "aws", "docker", "system design", "agile"],
        "data scientist": ["python", "pandas", "numpy", "scikit-learn", "tensorflow", "sql", "statistics", "visualization"],
        "devops engineer": ["docker", "kubernetes", "aws", "terraform", "jenkins", "linux", "python", "monitoring"],
        "frontend developer": ["javascript", "react", "typescript", "css", "html", "webpack", "testing"],
        "backend developer": ["python", "node.js", "postgresql", "redis", "api design", "microservices"],
        "product manager": ["agile", "scrum", "data analysis", "user research", "roadmapping", "stakeholder management"],
        "ux designer": ["figma", "user research", "prototyping", "usability testing", "design systems"],
        "ml engineer": ["python", "tensorflow", "pytorch", "docker", "kubernetes", "mlops", "feature engineering"],
    }
    
    matched_role = None
    for role in role_skills:
        if role in role_lower:
            matched_role = role
            break
    
    if matched_role:
        return {"status": "success", "role": target_role, "recommended_skills": role_skills[matched_role], "priority": "high"}
    
    return {"status": "role_not_found", "role": target_role, "available_roles": list(role_skills.keys())}


# ═══════════════════════════════════════════════════════════════════════════════
#  MEETING PREPARATION
# ═══════════════════════════════════════════════════════════════════════════════

def prep_meeting(topic: str, attendees: List[str] = None, duration_minutes: int = 30) -> Dict:
    """Generate a meeting preparation guide."""
    agenda_items = []
    
    if duration_minutes <= 15:
        agenda_items = ["Quick status update (5 min)", "Key decision needed (8 min)", "Next steps (2 min)"]
    elif duration_minutes <= 30:
        agenda_items = ["Introduction & context (3 min)", "Main discussion (20 min)", "Action items & next steps (5 min)", "Q&A (2 min)"]
    else:
        agenda_items = ["Welcome & agenda review (5 min)", "Context setting (5 min)", "Main discussion (30 min)", "Break (5 min)", "Decision making (10 min)", "Action items (5 min)", "Wrap up (5 min)"]
    
    return {
        "status": "success",
        "topic": topic,
        "attendees": attendees or [],
        "duration": duration_minutes,
        "suggested_agenda": agenda_items,
        "preparation_checklist": [
            "Prepare opening statement",
            "Gather relevant data/reports",
            "Anticipate questions",
            "Prepare decision options",
            "Set up meeting tools",
        ],
        "tips": [
            "Start on time and state the objective clearly",
            "Keep discussions focused on the topic",
            "Assign action items with owners and deadlines",
            "Send meeting notes within 24 hours",
        ],
    }


def generate_meeting_notes(meeting_title: str, decisions: List[str] = None, action_items: List[Dict] = None) -> Dict:
    """Generate structured meeting notes."""
    return {
        "status": "success",
        "title": meeting_title,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "decisions": decisions or [],
        "action_items": action_items or [],
        "template": f"""# {meeting_title}
**Date:** {datetime.now().strftime('%Y-%m-%d')}

## Attendees
- [List attendees]

## Agenda
- [List agenda items]

## Discussion Points
- [Key points discussed]

## Decisions
{chr(10).join(f'- {d}' for d in (decisions or []))}

## Action Items
{chr(10).join(f'- [ ] {a.get("task", "")} - @{a.get("owner", "")} - {a.get("due_date", "")}' for a in (action_items or []))}

## Next Steps
- [Schedule follow-up if needed]
"""
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  CAREER DEVELOPMENT
# ═══════════════════════════════════════════════════════════════════════════════

def career_path_plan(current_role: str, target_role: str, years_experience: int = 0) -> Dict:
    """Generate a career path plan."""
    plans = {
        ("software engineer", "senior engineer"): [
            "Master system design and architecture patterns",
            "Lead a major project from design to deployment",
            "Mentor 2+ junior developers",
            "Contribute to technical documentation and standards",
        ],
        ("software engineer", "engineering manager"): [
            "Take ownership of team processes and rituals",
            "Mentor and coach team members",
            "Learn project management fundamentals",
            "Develop stakeholder communication skills",
            "Lead cross-team initiatives",
        ],
        ("data analyst", "data scientist"): [
            "Strengthen statistics and ML fundamentals",
            "Build end-to-end ML projects",
            "Learn Python/R for data science",
            "Publish analysis findings to demonstrate impact",
        ],
        ("junior developer", "full-stack developer"): [
            "Learn both frontend and backend technologies",
            "Build complete applications independently",
            "Understand databases and API design",
            "Learn deployment and DevOps basics",
        ],
    }
    
    key = (current_role.lower(), target_role.lower())
    steps = plans.get(key, ["Gain deeper expertise in your current role", "Build a portfolio of impactful projects", "Network with professionals in your target role", "Seek mentorship from someone in the target position"])
    
    return {
        "status": "success",
        "current_role": current_role,
        "target_role": target_role,
        "years_experience": years_experience,
        "recommended_steps": steps,
        "estimated_timeline": "1-3 years" if years_experience < 3 else "6-18 months",
        "resources": ["Online courses", "Side projects", "Conference talks", "Mentorship programs"],
    }


def salary_negotiation_tips(current_salary: float = None, offer_salary: float = None, market_rate: float = None) -> Dict:
    """Provide salary negotiation guidance."""
    tips = {
        "before_negotiation": [
            "Research market rates for your role and location",
            "Document your achievements and impact with metrics",
            "Practice your pitch with a friend or mentor",
            "Know your minimum acceptable number",
        ],
        "during_negotiation": [
            "Let them make the first offer if possible",
            "Always negotiate even if the offer seems good",
            "Consider total compensation, not just base salary",
            "Ask for time to consider the offer (24-48 hours)",
        ],
        "what_to_negotiate": [
            "Base salary",
            "Sign-on bonus",
            "Stock options/equity",
            "Vacation days",
            "Remote work flexibility",
            "Professional development budget",
        ],
    }
    
    result = {"status": "success", "tips": tips}
    
    if current_salary and offer_salary:
        increase = ((offer_salary - current_salary) / current_salary) * 100
        result["salary_comparison"] = {
            "current": current_salary,
            "offer": offer_salary,
            "increase_percent": round(increase, 1),
            "assessment": "Significant increase" if increase > 20 else "Moderate increase" if increase > 10 else "Small increase",
        }
    
    if market_rate and offer_salary:
        vs_market = ((offer_salary - market_rate) / market_rate) * 100
        result["vs_market"] = {
            "market_rate": market_rate,
            "offer": offer_salary,
            "difference_percent": round(vs_market, 1),
            "assessment": "Above market" if vs_market > 10 else "At market" if vs_market > -10 else "Below market",
        }
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  NETWORKING
# ═══════════════════════════════════════════════════════════════════════════════

def generate_elevator_pitch(name: str, role: str, specialty: str, goal: str) -> Dict:
    """Generate an elevator pitch."""
    pitch = f"""Hi, I'm {name}, a {role} specializing in {specialty}. 

I help organizations {goal}. 

I'm currently looking to connect with professionals in the industry and explore opportunities where my skills can make the biggest impact."""
    
    return {
        "status": "success",
        "pitch": pitch,
        "short_version": f"Hi, I'm {name}, a {role} specializing in {specialty}.",
        "tips": [
            "Keep it under 60 seconds",
            "Make it conversational, not robotic",
            "End with a question or call to action",
            "Practice until it feels natural",
        ],
    }


def linkedin_summary_template(name: str, role: str, experience_years: int, key_skills: List[str]) -> Dict:
    """Generate a LinkedIn summary."""
    summary = f"""{experience_years}+ years of experience in {role}. Specialized in {', '.join(key_skills[:3])}.

Passionate about delivering high-impact solutions and driving innovation. Proven track record of leading cross-functional teams and delivering projects on time and within budget.

Key strengths:
{chr(10).join(f'• {skill}' for skill in key_skills)}

Open to connecting with professionals in {', '.join(key_skills[:2])}."""
    
    return {"status": "success", "summary": summary, "character_count": len(summary)}


# ═══════════════════════════════════════════════════════════════════════════════
#  FASTAPI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def api_analyze_resume(resume_text: str) -> Dict:
    return analyze_resume(resume_text)

def api_suggest_skills(role: str) -> Dict:
    return suggest_skills(role)

def api_prep_meeting(topic: str, attendees: List[str] = None, duration: int = 30) -> Dict:
    return prep_meeting(topic, attendees, duration)

def api_career_path(current_role: str, target_role: str, years: int = 0) -> Dict:
    return career_path_plan(current_role, target_role, years)

def api_salary_tips(current: float = None, offer: float = None, market: float = None) -> Dict:
    return salary_negotiation_tips(current, offer, market)


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 50)
    print("Professional Assist Demo")
    print("=" * 50)
    
    print("\n--- Resume Analysis ---")
    sample_resume = """
    Experienced software engineer with 5 years of Python development.
    Led a team of 4 developers to build a microservices platform.
    Improved API response time by 40% through caching optimization.
    Worked on database migration reducing costs by 25%.
    Skills: Python, Django, PostgreSQL, AWS, Docker, Redis.
    Responsible for deploying applications to production.
    """
    analysis = analyze_resume(sample_resume)
    print(f"Score: {analysis['score']}/100")
    print(f"Skills found: {analysis['skills_count']}")
    print(f"Suggestions: {analysis['suggestions']}")
    
    print("\n--- Career Path ---")
    path = career_path_plan("Software Engineer", "Senior Engineer", 3)
    print(f"Steps to {path['target_role']}:")
    for step in path['recommended_steps']:
        print(f"  - {step}")
    
    print("\n--- Elevator Pitch ---")
    pitch = generate_elevator_pitch("Alice", "Software Engineer", "AI systems", "build scalable AI solutions")
    print(f"Pitch: {pitch['pitch']}")
