#!/usr/bin/env python3
"""
Email Assistant Module v25.1.0 "LUQI"
=======================================
AI-powered email composition, analysis, and management.
Supports professional email templates, tone analysis, and follow-up reminders.

Usage:
    from work_support.email_assistant import compose_email, analyze_tone
    email = compose_email("meeting_request", recipient="John", details={"date": "Monday"})
"""

import json
import re
from typing import Dict, List, Optional
from datetime import datetime, timedelta

# ═══════════════════════════════════════════════════════════════════════════════
#  EMAIL TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

EMAIL_TEMPLATES = {
    "meeting_request": {
        "subject": "Meeting Request: {topic}",
        "body": """Hi {recipient_name},

I hope this email finds you well. I am writing to request a meeting to discuss {topic}.

Would you be available on {date} at {time}? The meeting should take approximately {duration}.

Please let me know if this works for you, or suggest an alternative time that fits your schedule.

Best regards,
{sender_name}""",
    },
    "follow_up": {
        "subject": "Follow-up: {topic}",
        "body": """Hi {recipient_name},

I hope you are doing well. I wanted to follow up on {topic} that we discussed on {previous_date}.

Have you had a chance to {action_item}? I would appreciate any updates you can share.

Please let me know if you need any additional information from my side.

Best regards,
{sender_name}""",
    },
    "introduction": {
        "subject": "Introduction: {sender_name} ↔ {recipient_name}",
        "body": """Hi {recipient_name},

I hope this email finds you well. My name is {sender_name}, and I am reaching out regarding {purpose}.

I came across your profile/work on {source}, and I was impressed by {specific_detail}.

I would love to connect and explore potential collaboration opportunities.

Looking forward to hearing from you.

Best regards,
{sender_name}""",
    },
    "thank_you": {
        "subject": "Thank You: {topic}",
        "body": """Hi {recipient_name},

I wanted to take a moment to express my sincere gratitude for {topic}.

Your {specific_action} made a significant impact, and I truly appreciate your time and effort.

I look forward to staying in touch and hope we can collaborate again in the future.

Warm regards,
{sender_name}""",
    },
    "job_application": {
        "subject": "Application for {position} - {sender_name}",
        "body": """Dear Hiring Manager,

I am writing to express my strong interest in the {position} role at {company}. With my background in {background} and experience in {experience}, I am confident in my ability to contribute effectively to your team.

Key qualifications:
{qualifications}

I am particularly drawn to {company} because {reason}, and I am excited about the opportunity to {contribution}.

I have attached my resume for your review. I would welcome the opportunity to discuss how my skills align with your needs.

Thank you for considering my application.

Sincerely,
{sender_name}""",
    },
    "resignation": {
        "subject": "Letter of Resignation - {sender_name}",
        "body": """Dear {manager_name},

Please accept this letter as formal notification of my resignation from my position as {position} at {company}, effective {last_day}.

I am grateful for the opportunities I have had during my time here, particularly {positive_experience}. The skills and experience I have gained will be invaluable in my future endeavors.

I am committed to ensuring a smooth transition and will do everything possible to hand off my responsibilities effectively.

Thank you for your understanding and support.

Sincerely,
{sender_name}""",
    },
    "project_update": {
        "subject": "Project Update: {project_name} - {status}",
        "body": """Hi {recipient_name},

I am writing to provide an update on {project_name}.

Current Status: {status}
Completed: {completed_items}
In Progress: {in_progress_items}
Next Steps: {next_steps}

Timeline: {timeline}

Please let me know if you have any questions or concerns.

Best regards,
{sender_name}""",
    },
    "apology": {
        "subject": "Sincere Apologies Regarding {topic}",
        "body": """Hi {recipient_name},

I am writing to sincerely apologize for {issue}.

I understand that this may have caused {impact}, and I take full responsibility for what happened.

To make this right, I will {remedy}. I am also taking steps to ensure this does not happen again by {prevention}.

Thank you for your understanding and patience.

Sincerely,
{sender_name}""",
    },
    "networking": {
        "subject": "Great connecting at {event_name}!",
        "body": """Hi {recipient_name},

It was a pleasure meeting you at {event_name}. I really enjoyed our conversation about {topic}.

As discussed, I would love to stay connected and explore potential collaboration opportunities.

I've included my LinkedIn profile here: {linkedin_url}

Looking forward to keeping in touch!

Best,
{sender_name}""",
    },
    "cold_outreach": {
        "subject": "Quick question about {topic}",
        "body": """Hi {recipient_name},

I hope you don't mind me reaching out. I came across your work on {source} and was really impressed by {specific_detail}.

I am working on {project} and thought there might be an interesting overlap with what you're doing at {company}.

Would you be open to a brief 15-minute call next week to explore potential synergies?

Best,
{sender_name}""",
    },
}

# Tone analysis keywords
TONE_POSITIVE = ["thank", "appreciate", "grateful", "excited", "pleased", "delighted", "wonderful", "great", "excellent", "fantastic"]
TONE_NEGATIVE = ["unfortunately", "sorry", "disappointed", "concerned", "problem", "issue", "delay", "error", "mistake", "regret"]
TONE_URGENT = ["urgent", "asap", "immediately", "deadline", "today", "critical", "priority", "emergency"]
TONE_FORMAL = ["dear", "sincerely", "regards", "respectfully", "honored", "grateful"]
TONE_INFORMAL = ["hey", "hi there", "cheers", "talk soon", "catch up", "btw", "lol"]


# ═══════════════════════════════════════════════════════════════════════════════
#  CORE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def list_templates() -> Dict:
    """List all available email templates."""
    return {"status": "success", "templates": {k: v["subject"] for k, v in EMAIL_TEMPLATES.items()}, "total": len(EMAIL_TEMPLATES)}


def compose_email(template_name: str, details: Dict) -> Dict:
    """Compose an email from a template."""
    template = EMAIL_TEMPLATES.get(template_name)
    if not template:
        return {"status": "error", "available_templates": list(EMAIL_TEMPLATES.keys())}
    
    try:
        subject = template["subject"].format(**details)
        body = template["body"].format(**details)
        return {"status": "success", "template": template_name, "subject": subject, "body": body, "timestamp": datetime.now().isoformat()}
    except KeyError as e:
        return {"status": "error", "message": f"Missing required field: {e}", "required_fields": _extract_fields(template["subject"] + template["body"])}


def _extract_fields(template_str: str) -> List[str]:
    """Extract field names from a template string."""
    return list(set(re.findall(r'\{(\w+)\}', template_str)))


def get_template_fields(template_name: str) -> Dict:
    """Get the required fields for a template."""
    template = EMAIL_TEMPLATES.get(template_name)
    if not template:
        return {"status": "error", "available": list(EMAIL_TEMPLATES.keys())}
    
    fields = _extract_fields(template["subject"] + template["body"])
    return {"status": "success", "template": template_name, "required_fields": fields, "description": TEMPLATE_DESCRIPTIONS.get(template_name, "")}


TEMPLATE_DESCRIPTIONS = {
    "meeting_request": "Request a meeting with someone, specifying topic, date, and time.",
    "follow_up": "Follow up on a previous conversation or pending item.",
    "introduction": "Introduce yourself to someone new.",
    "thank_you": "Express gratitude for something specific.",
    "job_application": "Apply for a job position.",
    "resignation": "Submit a professional resignation letter.",
    "project_update": "Provide a status update on a project.",
    "apology": "Send a sincere apology for a mistake or issue.",
    "networking": "Follow up after meeting someone at an event.",
    "cold_outreach": "Reach out to someone you haven't met before.",
}


def analyze_tone(email_body: str) -> Dict:
    """Analyze the tone of an email."""
    text_lower = email_body.lower()
    
    scores = {
        "positive": sum(1 for w in TONE_POSITIVE if w in text_lower),
        "negative": sum(1 for w in TONE_NEGATIVE if w in text_lower),
        "urgent": sum(1 for w in TONE_URGENT if w in text_lower),
        "formal": sum(1 for w in TONE_FORMAL if w in text_lower),
        "informal": sum(1 for w in TONE_INFORMAL if w in text_lower),
    }
    
    # Determine dominant tone
    max_score = max(scores.values())
    if max_score == 0:
        dominant = "neutral"
    else:
        dominant = max(scores, key=scores.get)
    
    # Formality level
    formality = "formal" if scores["formal"] > scores["informal"] else "informal" if scores["informal"] > scores["formal"] else "neutral"
    
    # Sentiment
    sentiment = "positive" if scores["positive"] > scores["negative"] else "negative" if scores["negative"] > scores["positive"] else "neutral"
    
    return {
        "status": "success",
        "dominant_tone": dominant,
        "formality": formality,
        "sentiment": sentiment,
        "scores": scores,
        "is_urgent": scores["urgent"] > 0,
        "recommendations": _get_tone_recommendations(dominant, formality, sentiment),
    }


def _get_tone_recommendations(dominant: str, formality: str, sentiment: str) -> List[str]:
    """Get recommendations based on tone analysis."""
    recommendations = []
    if dominant == "negative":
        recommendations.append("Consider adding positive language to balance the tone.")
    if dominant == "urgent":
        recommendations.append("The email conveys urgency - ensure the timeline is realistic.")
    if formality == "informal" and dominant != "informal":
        recommendations.append("Consider using more formal language for professional contexts.")
    if sentiment == "negative":
        recommendations.append("The overall sentiment is negative - consider reframing key points.")
    if not recommendations:
        recommendations.append("Tone looks balanced.")
    return recommendations


def suggest_improvements(email_body: str) -> Dict:
    """Suggest improvements for an email."""
    suggestions = []
    
    # Length check
    word_count = len(email_body.split())
    if word_count > 300:
        suggestions.append(f"Email is quite long ({word_count} words). Consider condensing to 150-200 words for better readability.")
    elif word_count < 30:
        suggestions.append(f"Email is very brief ({word_count} words). Consider adding more context.")
    
    # Check for common issues
    if "I" in email_body[:100]:
        suggestions.append("Email starts with 'I' - consider leading with the recipient's needs or a shared context.")
    
    if email_body.count("!") > 3:
        suggestions.append("Too many exclamation marks can seem unprofessional. Consider using periods instead.")
    
    if len(re.findall(r'[A-Z]{3,}', email_body)) > 2:
        suggestions.append("Excessive capitalization detected. Use bold or italics for emphasis instead.")
    
    # Check for vague language
    vague_words = ["thing", "stuff", "nice", "good", "bad", "very", "really"]
    found_vague = [w for w in vague_words if w in email_body.lower()]
    if found_vague:
        suggestions.append(f"Replace vague words ({', '.join(found_vague)}) with specific, concrete language.")
    
    # Check closing
    if not any(closing in email_body.lower() for closing in ["regards", "sincerely", "best", "thank you", "thanks"]):
        suggestions.append("Add a professional closing (e.g., 'Best regards', 'Sincerely').")
    
    return {"status": "success", "word_count": word_count, "suggestions": suggestions if suggestions else ["Email looks good!"]}


def schedule_follow_up(original_subject: str, recipient: str, days: int = 3) -> Dict:
    """Schedule a follow-up reminder."""
    follow_up_date = datetime.now() + timedelta(days=days)
    return {
        "status": "success",
        "original_subject": original_subject,
        "recipient": recipient,
        "follow_up_date": follow_up_date.strftime("%Y-%m-%d"),
        "follow_up_subject": f"Follow-up: {original_subject}",
        "reminder_set": True,
    }


def summarize_thread(emails: List[Dict]) -> Dict:
    """Summarize an email thread."""
    if not emails:
        return {"status": "error", "message": "No emails provided"}
    
    participants = list(set(e.get("sender", "") for e in emails))
    subjects = list(set(e.get("subject", "") for e in emails))
    
    summary = {
        "status": "success",
        "total_emails": len(emails),
        "participants": participants,
        "subjects": subjects,
        "date_range": {
            "first": emails[0].get("date", ""),
            "last": emails[-1].get("date", ""),
        },
        "key_points": [],
        "action_items": [],
    }
    
    return summary


# ═══════════════════════════════════════════════════════════════════════════════
#  FASTAPI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def api_list_templates() -> Dict:
    return list_templates()

def api_compose_email(template_name: str, details: Dict) -> Dict:
    return compose_email(template_name, details)

def api_analyze_tone(email_body: str) -> Dict:
    return analyze_tone(email_body)

def api_suggest_improvements(email_body: str) -> Dict:
    return suggest_improvements(email_body)


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 50)
    print("Email Assistant Demo")
    print("=" * 50)
    
    templates = list_templates()
    print("\nAvailable templates:")
    for key, subject in templates["templates"].items():
        print(f"  {key}: {subject}")
    
    print("\n--- Meeting Request Example ---")
    email = compose_email("meeting_request", {
        "recipient_name": "John",
        "sender_name": "Alice",
        "topic": "Q4 Project Planning",
        "date": "Monday, Dec 15",
        "time": "2:00 PM",
        "duration": "45 minutes",
    })
    print(f"Subject: {email['subject']}")
    print(f"Body:\n{email['body']}")
    
    print("\n--- Tone Analysis ---")
    sample = "Thank you so much for your help! I really appreciate your quick response."
    tone = analyze_tone(sample)
    print(f"Text: {sample}")
    print(f"Dominant tone: {tone['dominant_tone']}, Formality: {tone['formality']}, Sentiment: {tone['sentiment']}")
