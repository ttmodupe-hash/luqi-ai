#!/usr/bin/env python3
"""Luqi AI Project Management Module — Project methodologies, templates,
task tracking, risk management, stakeholder analysis, and PMO functions.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
#  METHODOLOGY DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

METHODOLOGIES = {
    "agile": {
        "name": "Agile",
        "description": "Iterative approach focusing on collaboration, customer feedback, and rapid releases.",
        "principles": [
            "Customer satisfaction through early and continuous delivery",
            "Welcome changing requirements",
            "Deliver working software frequently",
            "Business people and developers work together daily",
            "Build projects around motivated individuals",
            "Face-to-face conversation is most efficient",
            "Working software is primary measure of progress",
            "Sustainable development pace",
            "Continuous attention to technical excellence",
            "Simplicity — maximize work not done",
            "Self-organizing teams",
            "Regular reflection and adaptation",
        ],
        "frameworks": ["Scrum", "Kanban", "Extreme Programming (XP)", "Lean"],
        "best_for": ["Software development", "Complex projects", "Rapidly changing requirements"],
    },
    "scrum": {
        "name": "Scrum",
        "description": "Agile framework using sprints, daily standups, and defined roles.",
        "roles": [
            {"role": "Product Owner", "responsibility": "Defines what to build, prioritizes backlog, represents stakeholders"},
            {"role": "Scrum Master", "responsibility": "Facilitates process, removes impediments, coaches team"},
            {"role": "Development Team", "responsibility": "Self-organizing team that builds the product"},
        ],
        "ceremonies": [
            {"ceremony": "Sprint Planning", "frequency": "Per sprint (start)", "duration": "2-4 hours for 2-week sprint", "purpose": "Plan sprint work"},
            {"ceremony": "Daily Standup", "frequency": "Daily", "duration": "15 minutes", "purpose": "Sync on progress and blockers"},
            {"ceremony": "Sprint Review", "frequency": "Per sprint (end)", "duration": "1-2 hours", "purpose": "Demo working software"},
            {"ceremony": "Sprint Retrospective", "frequency": "Per sprint (end)", "duration": "1-1.5 hours", "purpose": "Reflect and improve"},
            {"ceremony": "Backlog Refinement", "frequency": "Weekly", "duration": "1-2 hours", "purpose": "Prepare upcoming stories"},
        ],
        "artifacts": [
            {"artifact": "Product Backlog", "description": "Prioritized list of all desired work"},
            {"artifact": "Sprint Backlog", "description": "Items selected for current sprint"},
            {"artifact": "Increment", "description": "Working product at end of sprint"},
        ],
        "sprint_duration": "1-4 weeks (typically 2)",
    },
    "kanban": {
        "name": "Kanban",
        "description": "Visual workflow management emphasizing continuous flow and limiting work in progress.",
        "principles": [
            "Visualize workflow",
            "Limit work in progress (WIP)",
            "Manage flow",
            "Make process policies explicit",
            "Implement feedback loops",
            "Improve collaboratively",
        ],
        "board_columns": ["Backlog", "To Do", "In Progress", "Review", "Done"],
        "metrics": ["Cycle time", "Lead time", "Throughput", "WIP limits"],
        "best_for": ["Continuous delivery", "Support/maintenance teams", "Flow optimization"],
    },
    "waterfall": {
        "name": "Waterfall",
        "description": "Sequential design process where each phase must be completed before the next begins.",
        "phases": [
            {"phase": "Requirements", "output": "Requirements document", "activities": ["Stakeholder interviews", "Requirements gathering", "Sign-off"]},
            {"phase": "Design", "output": "Design specifications", "activities": ["Architecture design", "UI/UX design", "Technical specifications"]},
            {"phase": "Implementation", "output": "Working code", "activities": ["Coding", "Unit testing", "Code review"]},
            {"phase": "Testing", "output": "Test reports", "activities": ["Integration testing", "System testing", "UAT"]},
            {"phase": "Deployment", "output": "Live system", "activities": ["Release planning", "Deployment", "Go-live support"]},
            {"phase": "Maintenance", "output": "Updates and fixes", "activities": ["Bug fixes", "Enhancements", "Support"]},
        ],
        "best_for": ["Well-understood requirements", "Regulated industries", "Fixed-scope projects"],
    },
    "hybrid": {
        "name": "Hybrid (Waterfall + Agile)",
        "description": "Combines waterfall planning with agile execution.",
        "approach": [
            "Use waterfall for upfront planning and requirements",
            "Use agile/sprints for execution and development",
            "Waterfall gates at major milestones",
            "Agile ceremonies within development phases",
        ],
        "best_for": ["Large projects with regulatory needs", "Organizations transitioning to agile", "Complex enterprise projects"],
    },
}

# Project templates
PROJECT_TEMPLATES = {
    "software_development": {
        "name": "Software Development Project",
        "phases": [
            {"name": "Discovery", "duration": "1-2 weeks", "deliverables": ["Requirements doc", "User stories", "Tech stack decision"]},
            {"name": "Design", "duration": "2-3 weeks", "deliverables": ["Architecture", "UI/UX mockups", "API specs"]},
            {"name": "Development", "duration": "8-12 weeks", "deliverables": ["Working software", "Unit tests", "Documentation"]},
            {"name": "Testing", "duration": "2-3 weeks", "deliverables": ["Test reports", "Bug fixes", "Performance results"]},
            {"name": "Deployment", "duration": "1-2 weeks", "deliverables": ["Live system", "Runbook", "Monitoring setup"]},
            {"name": "Closure", "duration": "1 week", "deliverables": ["Project retrospective", "Lessons learned", "Handover"]},
        ],
        "typical_duration": "15-23 weeks",
        "team": ["Product Owner", "Scrum Master", "Developers (2-4)", "QA Engineer", "UI/UX Designer"],
    },
    "infrastructure": {
        "name": "Infrastructure Project",
        "phases": [
            {"name": "Assessment", "duration": "1-2 weeks", "deliverables": ["Current state analysis", "Requirements", "Risk assessment"]},
            {"name": "Design", "duration": "2-3 weeks", "deliverables": ["Architecture", "Bill of materials", "Implementation plan"]},
            {"name": "Procurement", "duration": "2-6 weeks", "deliverables": ["Purchase orders", "Vendor agreements", "Delivery schedule"]},
            {"name": "Implementation", "duration": "4-8 weeks", "deliverables": ["Installed infrastructure", "Configurations", "Test results"]},
            {"name": "Migration", "duration": "1-2 weeks", "deliverables": ["Migrated services", "Rollback plan", "Validation"]},
            {"name": "Closure", "duration": "1 week", "deliverables": ["As-built docs", "Support handover", "Warranty"]},
        ],
        "typical_duration": "11-22 weeks",
        "team": ["Project Manager", "Network Engineer", "Systems Engineer", "Security Specialist"],
    },
    "digital_transformation": {
        "name": "Digital Transformation",
        "phases": [
            {"name": "Strategy", "duration": "2-4 weeks", "deliverables": ["Vision statement", "Business case", "Roadmap"]},
            {"name": "Current State", "duration": "2-3 weeks", "deliverables": ["Process maps", "Gap analysis", "Stakeholder interviews"]},
            {"name": "Solution Design", "duration": "3-4 weeks", "deliverables": ["To-be processes", "Technology selection", "Change plan"]},
            {"name": "Pilot", "duration": "4-6 weeks", "deliverables": ["Pilot results", "Feedback", "Refined solution"]},
            {"name": "Rollout", "duration": "8-16 weeks", "deliverables": ["Deployed solution", "Training", "Adoption metrics"]},
            {"name": "Optimize", "duration": "Ongoing", "deliverables": ["Continuous improvements", "ROI measurement"]},
        ],
        "typical_duration": "19-33 weeks (plus ongoing)",
        "team": ["Program Director", "Change Manager", "Business Analyst", "Solution Architect", "Trainers"],
    },
}

# Risk management
RISK_CATEGORIES = {
    "technical": {
        "name": "Technical Risks",
        "examples": [
            {"risk": "Technology unfamiliar to team", "mitigation": "Training, hire experts, proof of concept", "probability": "Medium", "impact": "High"},
            {"risk": "Integration complexity", "mitigation": "Early integration testing, API documentation", "probability": "High", "impact": "High"},
            {"risk": "Performance issues", "mitigation": "Performance testing early, architecture review", "probability": "Medium", "impact": "High"},
            {"risk": "Security vulnerabilities", "mitigation": "Security review, penetration testing, code review", "probability": "Medium", "impact": "High"},
        ],
    },
    "schedule": {
        "name": "Schedule Risks",
        "examples": [
            {"risk": "Scope creep", "mitigation": "Change control process, clear requirements", "probability": "High", "impact": "Medium"},
            {"risk": "Resource unavailability", "mitigation": "Cross-training, buffer time, contractor backup", "probability": "Medium", "impact": "High"},
            {"risk": "Dependency delays", "mitigation": "Early engagement, milestone tracking, alternatives", "probability": "High", "impact": "High"},
        ],
    },
    "resource": {
        "name": "Resource Risks",
        "examples": [
            {"risk": "Key person dependency", "mitigation": "Knowledge sharing, documentation, succession plan", "probability": "Medium", "impact": "High"},
            {"risk": "Budget overrun", "mitigation": "Regular budget reviews, contingency reserve, change control", "probability": "Medium", "impact": "High"},
            {"risk": "Skills gap", "mitigation": "Training, mentoring, contractor support", "probability": "Medium", "impact": "Medium"},
        ],
    },
    "business": {
        "name": "Business Risks",
        "examples": [
            {"risk": "Stakeholder resistance", "mitigation": "Change management, communication plan, early involvement", "probability": "Medium", "impact": "High"},
            {"risk": "Regulatory changes", "mitigation": "Monitor regulations, compliance review", "probability": "Low", "impact": "High"},
            {"risk": "Vendor issues", "mitigation": "SLAs, backup vendors, escrow agreements", "probability": "Medium", "impact": "Medium"},
        ],
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_methodologies() -> Dict[str, Any]:
    """List project management methodologies."""
    return {
        "status": "success",
        "total": len(METHODOLOGIES),
        "methodologies": [{"id": k, "name": v["name"], "description": v["description"][:100]} for k, v in METHODOLOGIES.items()],
    }


def get_methodology(method_id: str) -> Dict[str, Any]:
    """Get a specific methodology."""
    if method_id not in METHODOLOGIES:
        return {"status": "not_found", "available": list(METHODOLOGIES.keys())}
    return {"status": "success", **METHODOLOGIES[method_id]}


def get_project_templates() -> Dict[str, Any]:
    """List project templates."""
    return {
        "status": "success",
        "total": len(PROJECT_TEMPLATES),
        "templates": [{"id": k, "name": v["name"], "duration": v["typical_duration"]} for k, v in PROJECT_TEMPLATES.items()],
    }


def get_project_template(template_id: str) -> Dict[str, Any]:
    """Get a specific project template."""
    if template_id not in PROJECT_TEMPLATES:
        return {"status": "not_found", "available": list(PROJECT_TEMPLATES.keys())}
    return {"status": "success", **PROJECT_TEMPLATES[template_id]}


def get_risk_categories() -> Dict[str, Any]:
    """List risk categories."""
    return {
        "status": "success",
        "total_categories": len(RISK_CATEGORIES),
        "categories": [{"id": k, "name": v["name"], "risk_count": len(v["examples"])} for k, v in RISK_CATEGORIES.items()],
    }


def get_risks(category: str = "") -> Dict[str, Any]:
    """Get risks by category."""
    if category:
        if category not in RISK_CATEGORIES:
            return {"status": "not_found", "available": list(RISK_CATEGORIES.keys())}
        return {"status": "success", **RISK_CATEGORIES[category]}

    all_risks = []
    for cat in RISK_CATEGORIES.values():
        all_risks.extend(cat["examples"])
    return {"status": "success", "total_risks": len(all_risks), "risks": all_risks}


def create_project_plan(name: str, template: str = "", start_date: str = "") -> Dict[str, Any]:
    """Create a project plan from a template."""
    if template and template in PROJECT_TEMPLATES:
        tpl = PROJECT_TEMPLATES[template]
        return {
            "status": "success",
            "project_name": name,
            "template_used": template,
            "start_date": start_date or datetime.now().strftime("%Y-%m-%d"),
            "phases": tpl["phases"],
            "typical_duration": tpl["typical_duration"],
            "recommended_team": tpl["team"],
        }

    return {
        "status": "success",
        "project_name": name,
        "start_date": start_date or datetime.now().strftime("%Y-%m-%d"),
        "suggested_phases": [
            {"name": "Initiation", "key_activities": ["Define scope", "Identify stakeholders", "Create charter"]},
            {"name": "Planning", "key_activities": ["Create WBS", "Estimate resources", "Build schedule"]},
            {"name": "Execution", "key_activities": ["Build deliverables", "Manage team", "Communicate"]},
            {"name": "Monitoring", "key_activities": ["Track progress", "Manage changes", "Report status"]},
            {"name": "Closure", "key_activities": ["Obtain sign-off", "Document lessons", "Release team"]},
        ],
        "available_templates": list(PROJECT_TEMPLATES.keys()),
    }


def get_stakeholder_strategy(stakeholder_type: str = "") -> Dict[str, Any]:
    """Get stakeholder management strategies."""
    strategies = {
        "executive": {"interest": "High", "influence": "High", "strategy": "Manage closely — regular briefings, involve in decisions", "frequency": "Weekly"},
        "sponsor": {"interest": "High", "influence": "High", "strategy": "Manage closely — escalate issues, seek guidance", "frequency": "Weekly"},
        "team": {"interest": "High", "influence": "Medium", "strategy": "Keep informed — daily standups, retrospectives", "frequency": "Daily"},
        "customer": {"interest": "High", "influence": "Medium", "strategy": "Keep satisfied — demos, feedback sessions", "frequency": "Per sprint"},
        "vendor": {"interest": "Medium", "influence": "Low", "strategy": "Monitor — regular check-ins, SLA tracking", "frequency": "Weekly"},
        "regulator": {"interest": "Low", "influence": "High", "strategy": "Keep satisfied — compliance reports, audits", "frequency": "As required"},
    }

    if stakeholder_type:
        if stakeholder_type in strategies:
            return {"status": "success", "stakeholder": stakeholder_type, **strategies[stakeholder_type]}
        return {"status": "not_found", "available": list(strategies.keys())}

    return {"status": "success", "strategies": strategies}
