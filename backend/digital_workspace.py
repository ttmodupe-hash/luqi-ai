#!/usr/bin/env python3
"""Luqi AI Digital Workspace Module — 51 tool guides, phishing simulator,
10 productivity methods, remote work guides, security awareness,
communication guides, email templates, workspace setup recommendations,
and assessment quizzes.
"""

import logging
import random
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
#  TOOLS DATABASE — 51 workspace tools
# ═══════════════════════════════════════════════════════════════════════════════

TOOLS_DB = {
    # Communication
    "slack": {"name": "Slack", "category": "communication", "description": "Team messaging and collaboration platform with channels, threads, and integrations.", "best_for": ["Real-time team chat", "Project channels", "Integrations with dev tools"], "pricing": "Freemium", "alternatives": ["Microsoft Teams", "Discord"]},
    "teams": {"name": "Microsoft Teams", "category": "communication", "description": "Unified communication and collaboration platform integrated with Microsoft 365.", "best_for": ["Microsoft ecosystem users", "Video meetings", "Document collaboration"], "pricing": "Freemium", "alternatives": ["Slack", "Zoom"]},
    "zoom": {"name": "Zoom", "category": "communication", "description": "Video conferencing platform with webinars, breakout rooms, and recording.", "best_for": ["Video meetings", "Webinars", "Large conferences"], "pricing": "Freemium", "alternatives": ["Google Meet", "Microsoft Teams"]},
    "meet": {"name": "Google Meet", "category": "communication", "description": "Video conferencing integrated with Google Workspace.", "best_for": ["Google users", "Quick meetings", "Screen sharing"], "pricing": "Freemium", "alternatives": ["Zoom", "Teams"]},
    "discord": {"name": "Discord", "category": "communication", "description": "Community-focused messaging with voice channels and bots.", "best_for": ["Communities", "Gaming teams", "Informal groups"], "pricing": "Free", "alternatives": ["Slack", "Teams"]},
    # Project Management
    "jira": {"name": "Jira", "category": "project_management", "description": "Issue tracking and project management tool for Agile software teams.", "best_for": ["Software teams", "Agile/Scrum", "Bug tracking"], "pricing": "Paid", "alternatives": ["Asana", "Linear"]},
    "trello": {"name": "Trello", "category": "project_management", "description": "Visual Kanban-style project management with boards, lists, and cards.", "best_for": ["Small teams", "Visual workflows", "Simple projects"], "pricing": "Freemium", "alternatives": ["Asana", "Monday.com"]},
    "asana": {"name": "Asana", "category": "project_management", "description": "Work management platform for teams to organize and track projects.", "best_for": ["Marketing teams", "Cross-functional work", "Task tracking"], "pricing": "Freemium", "alternatives": ["Monday.com", "ClickUp"]},
    "monday": {"name": "Monday.com", "category": "project_management", "description": "Work operating system with customizable workflows and automations.", "best_for": ["Operations", "Marketing", "CRM"], "pricing": "Paid", "alternatives": ["Asana", "Smartsheet"]},
    "notion": {"name": "Notion", "category": "project_management", "description": "All-in-one workspace for notes, docs, databases, and project management.", "best_for": ["Knowledge management", "Small teams", "Documentation"], "pricing": "Freemium", "alternatives": ["Coda", "Confluence"]},
    "linear": {"name": "Linear", "category": "project_management", "description": "Streamlined issue tracking for modern software teams.", "best_for": ["Software teams", "Speed-focused", "Keyboard shortcuts"], "pricing": "Freemium", "alternatives": ["Jira", "GitHub Issues"]},
    "clickup": {"name": "ClickUp", "category": "project_management", "description": "All-in-one productivity platform with tasks, docs, goals, and chat.", "best_for": ["Small-medium teams", "Feature-rich needs", "Budget-conscious"], "pricing": "Freemium", "alternatives": ["Asana", "Monday.com"]},
    # Document & File
    "drive": {"name": "Google Drive", "category": "document", "description": "Cloud storage and file synchronization with Google Workspace integration.", "best_for": ["Google users", "Collaborative docs", "Storage"], "pricing": "Freemium", "alternatives": ["Dropbox", "OneDrive"]},
    "dropbox": {"name": "Dropbox", "category": "document", "description": "Cloud storage with file sync, sharing, and Paper collaboration.", "best_for": ["File sync", "Large files", "Creative teams"], "pricing": "Freemium", "alternatives": ["Google Drive", "Box"]},
    "onedrive": {"name": "Microsoft OneDrive", "category": "document", "description": "Cloud storage integrated with Microsoft 365.", "best_for": ["Microsoft users", "Office docs", "Enterprise"], "pricing": "Freemium", "alternatives": ["Google Drive", "Dropbox"]},
    "confluence": {"name": "Confluence", "category": "document", "description": "Team workspace for knowledge sharing and documentation.", "best_for": ["Technical docs", "Wikis", "Jira integration"], "pricing": "Paid", "alternatives": ["Notion", "SharePoint"]},
    "sharepoint": {"name": "Microsoft SharePoint", "category": "document", "description": "Enterprise content management and intranet platform.", "best_for": ["Large organizations", "Intranet", "Microsoft ecosystem"], "pricing": "Paid", "alternatives": ["Confluence", "Notion"]},
    "docs": {"name": "Google Docs", "category": "document", "description": "Collaborative word processing with real-time editing.", "best_for": ["Collaborative writing", "Simple documents", "Comments/suggestions"], "pricing": "Free", "alternatives": ["Microsoft Word", "Notion"]},
    # Design
    "figma": {"name": "Figma", "category": "design", "description": "Collaborative interface design tool for UI/UX with prototyping.", "best_for": ["UI/UX design", "Prototyping", "Design systems"], "pricing": "Freemium", "alternatives": ["Sketch", "Adobe XD"]},
    "sketch": {"name": "Sketch", "category": "design", "description": "Vector design tool for macOS focused on UI/UX.", "best_for": ["Mac users", "UI design", "Icon design"], "pricing": "Paid", "alternatives": ["Figma", "Adobe XD"]},
    "canva": {"name": "Canva", "category": "design", "description": "Easy-to-use graphic design tool with templates for non-designers.", "best_for": ["Social media graphics", "Presentations", "Marketing materials"], "pricing": "Freemium", "alternatives": ["Adobe Express", "Crello"]},
    "photoshop": {"name": "Adobe Photoshop", "category": "design", "description": "Professional image editing and graphic design software.", "best_for": ["Photo editing", "Complex graphics", "Professional design"], "pricing": "Paid", "alternatives": ["GIMP", "Affinity Photo"]},
    # Development
    "github": {"name": "GitHub", "category": "development", "description": "Code hosting platform with version control, CI/CD, and collaboration.", "best_for": ["Code repositories", "Open source", "DevOps"], "pricing": "Freemium", "alternatives": ["GitLab", "Bitbucket"]},
    "gitlab": {"name": "GitLab", "category": "development", "description": "DevOps platform with built-in CI/CD, registry, and monitoring.", "best_for": ["Full DevOps lifecycle", "Private hosting", "CI/CD"], "pricing": "Freemium", "alternatives": ["GitHub", "Bitbucket"]},
    "vscode": {"name": "VS Code", "category": "development", "description": "Lightweight but powerful source code editor with rich extensions.", "best_for": ["Code editing", "Debugging", "Extensions"], "pricing": "Free", "alternatives": ["JetBrains", "Sublime Text"]},
    "postman": {"name": "Postman", "category": "development", "description": "API development and testing platform.", "best_for": ["API testing", "API documentation", "Mock servers"], "pricing": "Freemium", "alternatives": ["Insomnia", "Hoppscotch"]},
    # Security
    "1password": {"name": "1Password", "category": "security", "description": "Password manager with secure sharing and watchtower.", "best_for": ["Password management", "Team sharing", "Security alerts"], "pricing": "Paid", "alternatives": ["LastPass", "Bitwarden"]},
    "bitwarden": {"name": "Bitwarden", "category": "security", "description": "Open-source password manager with free and paid tiers.", "best_for": ["Budget security", "Open source", "Cross-platform"], "pricing": "Freemium", "alternatives": ["1Password", "LastPass"]},
    "authy": {"name": "Authy", "category": "security", "description": "Two-factor authentication app with encrypted backups.", "best_for": ["2FA", "Multi-device", "Backup"], "pricing": "Free", "alternatives": ["Google Authenticator", "Microsoft Authenticator"]},
    # Time & Productivity
    "toggl": {"name": "Toggl Track", "category": "productivity", "description": "Time tracking tool with reporting and project billing.", "best_for": ["Freelancers", "Time tracking", "Reporting"], "pricing": "Freemium", "alternatives": ["Clockify", "Harvest"]},
    "clockify": {"name": "Clockify", "category": "productivity", "description": "Free time tracking software for teams.", "best_for": ["Free time tracking", "Team timesheets", "Reporting"], "pricing": "Freemium", "alternatives": ["Toggl", "Harvest"]},
    "obsidian": {"name": "Obsidian", "category": "productivity", "description": "Knowledge base and note-taking with linked references.", "best_for": ["Note-taking", "Knowledge graphs", "PKM"], "pricing": "Freemium", "alternatives": ["Roam Research", "Notion"]},
    "evernote": {"name": "Evernote", "category": "productivity", "description": "Note-taking app with web clipping and search.", "best_for": ["Note organization", "Web clipping", "Search"], "pricing": "Freemium", "alternatives": ["Notion", "OneNote"]},
    "onenote": {"name": "Microsoft OneNote", "category": "productivity", "description": "Digital notebook with freeform note-taking.", "best_for": ["Microsoft users", "Handwritten notes", "Organization"], "pricing": "Free", "alternatives": ["Evernote", "Notion"]},
    "todoist": {"name": "Todoist", "category": "productivity", "description": "Task manager with natural language input and productivity tracking.", "best_for": ["Personal tasks", "Quick capture", "Habit tracking"], "pricing": "Freemium", "alternatives": ["Things", "Microsoft To Do"]},
    # Video & Screen
    "loom": {"name": "Loom", "category": "video", "description": "Async video messaging for quick screen recordings.", "best_for": ["Quick tutorials", "Bug reports", "Async updates"], "pricing": "Freemium", "alternatives": ["Vidyard", "ScreenRec"]},
    "obs": {"name": "OBS Studio", "category": "video", "description": "Free and open-source video recording and live streaming.", "best_for": ["Live streaming", "Screen recording", "Free tool"], "pricing": "Free", "alternatives": ["Streamlabs", "XSplit"]},
    # Finance
    "quickbooks": {"name": "QuickBooks", "category": "finance", "description": "Accounting software for small businesses.", "best_for": ["Small business accounting", "Invoicing", "Payroll"], "pricing": "Paid", "alternatives": ["Xero", "FreshBooks"]},
    "stripe": {"name": "Stripe", "category": "finance", "description": "Payment processing platform for online businesses.", "best_for": ["Online payments", "Subscriptions", "Developer-friendly"], "pricing": "Pay per transaction", "alternatives": ["PayPal", "Square"]},
    # CRM
    "hubspot": {"name": "HubSpot CRM", "category": "crm", "description": "Free CRM with marketing, sales, and service hubs.", "best_for": ["Small businesses", "Marketing automation", "Sales pipeline"], "pricing": "Freemium", "alternatives": ["Salesforce", "Pipedrive"]},
    "salesforce": {"name": "Salesforce", "category": "crm", "description": "Enterprise CRM platform with extensive customization.", "best_for": ["Enterprise", "Sales teams", "Custom workflows"], "pricing": "Paid", "alternatives": ["HubSpot", "Zoho CRM"]},
    # Analytics
    "analytics": {"name": "Google Analytics", "category": "analytics", "description": "Web analytics service for tracking website traffic and user behavior.", "best_for": ["Website analytics", "Traffic analysis", "Free"], "pricing": "Free", "alternatives": ["Plausible", "Mixpanel"]},
    "mixpanel": {"name": "Mixpanel", "category": "analytics", "description": "Product analytics for tracking user engagement and retention.", "best_for": ["Product teams", "User behavior", "Funnel analysis"], "pricing": "Freemium", "alternatives": ["Amplitude", "Heap"]},
    # Automation
    "zapier": {"name": "Zapier", "category": "automation", "description": "Workflow automation connecting 5000+ apps.", "best_for": ["No-code automation", "App integrations", "Workflows"], "pricing": "Freemium", "alternatives": ["Make", "n8n"]},
    "make": {"name": "Make (Integromat)", "category": "automation", "description": "Visual automation platform with advanced logic.", "best_for": ["Complex automations", "Visual builders", "Advanced logic"], "pricing": "Freemium", "alternatives": ["Zapier", "n8n"]},
}

# Document management guides
DOC_GUIDES = {
    "naming": {
        "topic": "File Naming Conventions",
        "content": "Use consistent, descriptive file names. Format: YYYY-MM-DD_ProjectName_DocumentType_Version. Example: 2024-01-15_LuqiAI_Proposal_v2.pdf",
        "rules": ["No spaces — use underscores or hyphens", "Include dates for versioning", "Be descriptive but concise", "Use lowercase consistently"],
    },
    "versioning": {
        "topic": "Document Version Control",
        "content": "Track document versions systematically using either manual (v1, v1.1, v2) or automated systems (Google Docs history, SharePoint versions, Git).",
        "rules": ["Use semantic versioning for formal docs", "Keep a changelog", "Archive old versions", "Use 'Final' only when truly final"],
    },
    "organization": {
        "topic": "Folder Structure Best Practices",
        "content": "Organize files in a logical hierarchy: by project, then by document type, then by date or version.",
        "rules": ["Max 3-4 levels deep", "Use consistent naming", "Separate active from archive", "Have a shared template folder"],
    },
    "sharing": {
        "topic": "Secure Document Sharing",
        "content": "Share documents securely using proper permissions, expiration dates, and access logs.",
        "rules": ["Use 'view only' by default", "Set expiration dates", "Audit shared links regularly", "Use organization accounts, not personal"],
    },
}

# Security awareness modules
SECURITY_MODULES = {
    "phishing": {"name": "Phishing Awareness", "topics": ["Email phishing", "Spear phishing", "Whaling", "Smishing", "Vishing"], "duration_min": 15},
    "passwords": {"name": "Password Security", "topics": ["Strong passwords", "Password managers", "MFA", "Password hygiene"], "duration_min": 10},
    "social_engineering": {"name": "Social Engineering", "topics": ["Pretexting", "Baiting", "Tailgating", "Impersonation"], "duration_min": 15},
    "malware": {"name": "Malware Awareness", "topics": ["Viruses", "Ransomware", "Spyware", "Trojans", "Prevention"], "duration_min": 15},
    "device_security": {"name": "Device Security", "topics": ["Encryption", "Remote wipe", "Updates", "Physical security"], "duration_min": 10},
    "incident_response": {"name": "Incident Response", "topics": ["Reporting incidents", "Containment", "Evidence preservation"], "duration_min": 10},
}

# Phishing simulation scenarios
PHISHING_SCENARIOS = [
    {
        "scenario_id": "phish_001",
        "email_subject": "Urgent: Your account will be suspended",
        "sender": "security@amaz0n-support.com",
        "content": "Dear user, your account has been flagged for unusual activity. Click here immediately to verify: http://amaz0n-verify.example.com",
        "red_flags": ["Urgency tactics", "Misspelled domain (amaz0n)", "Suspicious link", "Generic greeting"],
        "is_phishing": True,
    },
    {
        "scenario_id": "phish_002",
        "email_subject": "Q4 Team Meeting — Calendar Invite",
        "sender": "hr@yourcompany.com",
        "content": "Hi team, the Q4 all-hands meeting is scheduled for Friday. Please review the attached agenda and add to your calendar.",
        "red_flags": [],
        "is_phishing": False,
    },
    {
        "scenario_id": "phish_003",
        "email_subject": "Invoice #2847 — Payment Overdue",
        "sender": "invoices@unknown-vendor.net",
        "content": "Your invoice is 30 days overdue. Open the attached file to view details and make payment immediately.",
        "red_flags": ["Unknown sender", "Attachment from unknown source", "Urgency", "Unsolicited invoice"],
        "is_phishing": True,
    },
]

# Productivity methods
PRODUCTIVITY_METHODS = {
    "pomodoro": {
        "name": "Pomodoro Technique",
        "description": "Work in 25-minute focused intervals followed by 5-minute breaks. After 4 pomodoros, take a 15-30 minute break.",
        "steps": ["Set a timer for 25 minutes", "Work on a single task", "When timer rings, take a 5-minute break", "Repeat 4 times, then take a longer break"],
        "best_for": ["People who get distracted easily", "Large tasks that need breaking down", "Studying"],
    },
    "gtd": {
        "name": "Getting Things Done (GTD)",
        "description": "Capture all tasks, clarify next actions, organize by context and priority, review weekly, and engage with intention.",
        "steps": ["Capture everything in an inbox", "Process: Is it actionable?", "Organize into lists (next actions, waiting, someday)", "Review weekly", "Do"],
        "best_for": ["People with many commitments", "Knowledge workers", "Those who feel overwhelmed"],
    },
    "eisenhower": {
        "name": "Eisenhower Matrix",
        "description": "Prioritize tasks by urgency and importance into 4 quadrants: Do, Schedule, Delegate, Delete.",
        "steps": ["Draw a 2x2 matrix", "Place tasks in quadrants", "Do urgent+important first", "Schedule important not urgent", "Delegate urgent not important", "Delete the rest"],
        "best_for": ["Priority management", "Decision making", "Busy professionals"],
    },
    "time_blocking": {
        "name": "Time Blocking",
        "description": "Schedule every part of your day into blocks dedicated to specific tasks or activities.",
        "steps": ["List all tasks for the day", "Estimate time for each", "Block time on calendar", "Include buffer time", "Stick to the schedule"],
        "best_for": ["People with predictable schedules", "Deep work needs", "Those who struggle with time management"],
    },
    "pareto": {
        "name": "Pareto Principle (80/20 Rule)",
        "description": "Focus on the 20% of efforts that produce 80% of results.",
        "steps": ["Identify your key tasks", "Determine which produce the most value", "Prioritize the vital 20%", "Minimize or eliminate the rest"],
        "best_for": ["Resource optimization", "Strategic planning", "Goal setting"],
    },
    "deep_work": {
        "name": "Deep Work",
        "description": "Dedicated uninterrupted blocks of time for cognitively demanding tasks.",
        "steps": ["Schedule 2-4 hour blocks", "Eliminate all distractions", "Define a clear goal for the session", "Work intensely", "Rest after"],
        "best_for": ["Complex problem solving", "Creative work", "Learning"],
    },
    "eat_the_frog": {
        "name": "Eat the Frog",
        "description": "Do your most difficult or important task first thing in the morning.",
        "steps": ["Identify your 'frog' — the hardest task", "Do it first before anything else", "The rest of the day feels easier"],
        "best_for": ["Procrastinators", "People with one big daunting task", "Morning persons"],
    },
    "two_minute": {
        "name": "Two-Minute Rule",
        "description": "If a task takes less than two minutes, do it immediately rather than adding it to a to-do list.",
        "steps": ["When a small task appears", "Estimate if it takes < 2 minutes", "If yes, do it now", "If no, add to your system"],
        "best_for": ["Reducing task backlog", "Inbox zero", "Quick wins"],
    },
    "batching": {
        "name": "Task Batching",
        "description": "Group similar tasks and do them in a dedicated block of time.",
        "steps": ["Categorize your tasks by type", "Group similar tasks together", "Schedule batch blocks", "Focus on one type at a time"],
        "best_for": ["Reducing context switching", "Email/slack management", "Administrative tasks"],
    },
    "zen_to_done": {
        "name": "Zen to Done (ZTD)",
        "description": "Simplified version of GTD focusing on 10 habits: collect, process, plan, do, simple trusted system, organize, review, simplify, set routines, and find passion.",
        "steps": ["Collect all tasks in one place", "Process daily", "Plan your MITs (Most Important Tasks)", "Review weekly"],
        "best_for": ["Minimalists", "GTD seems too complex", "Habit building"],
    },
}

# Remote work guides
REMOTE_GUIDES = {
    "setup": {
        "topic": "Home Office Setup",
        "content": "Create a dedicated workspace with good lighting, ergonomic furniture, and minimal distractions. Invest in a quality chair, external monitor, and noise-canceling headphones.",
        "checklist": ["Dedicated desk and chair", "External monitor at eye level", "Good lighting (natural preferred)", "Reliable internet (25+ Mbps)", "Noise-canceling headphones", "Webcam and microphone"],
    },
    "communication": {
        "topic": "Remote Communication",
        "content": "Over-communicate in remote settings. Use the right channel for the message: async for non-urgent, video for complex topics, calls for urgent matters.",
        "rules": ["Default to async communication", "Use video for 1:1s and team meetings", "Document decisions in writing", "Respond within 24 hours"],
    },
    "productivity": {
        "topic": "Remote Productivity",
        "content": "Maintain productivity by establishing routines, setting boundaries, and using time management techniques.",
        "tips": ["Set working hours and communicate them", "Take regular breaks", "Use the Pomodoro technique", "Have a morning routine"],
    },
    "wellness": {
        "topic": "Remote Work Wellness",
        "content": "Prevent burnout by maintaining work-life boundaries, staying physically active, and socializing virtually.",
        "tips": ["Create a shutdown ritual", "Exercise daily", "Socialize with colleagues virtually", "Take vacation days"],
    },
    "collaboration": {
        "topic": "Remote Team Collaboration",
        "content": "Foster collaboration through regular check-ins, shared documents, and collaborative tools.",
        "tips": ["Daily standups (15 min max)", "Shared documentation", "Collaborative whiteboarding (Miro, FigJam)", "Virtual coffee chats"],
    },
    "management": {
        "topic": "Managing Remote Teams",
        "content": "Lead remote teams by focusing on outcomes, not hours. Build trust through transparency and regular 1:1s.",
        "tips": ["Set clear expectations and goals", "Weekly 1:1s with each team member", "Use project management tools", "Celebrate wins publicly"],
    },
    "security": {
        "topic": "Remote Work Security",
        "content": "Secure your remote work environment with VPN, strong passwords, updated software, and physical security.",
        "checklist": ["Use company VPN", "Enable full-disk encryption", "Lock devices when away", "Secure your WiFi", "Be aware of shoulder surfing"],
    },
    "onboarding": {
        "topic": "Remote Employee Onboarding",
        "content": "Create a structured onboarding experience with buddy systems, clear documentation, and gradual responsibility increase.",
        "checklist": ["Ship equipment before start date", "First day: intro calls with team", "Week 1: access, tools, docs", "Month 1: first project", "30-60-90 day check-ins"],
    },
}

# Communication channel guides
COMM_GUIDES = {
    "email": {
        "channel": "Email",
        "best_for": ["Formal communication", "External stakeholders", "Documentation", "Non-urgent matters"],
        "rules": ["Clear subject line", "Keep under 5 sentences when possible", "Use bullet points", "Proofread before sending", "24-hour response expectation"],
    },
    "slack": {
        "channel": "Slack/Teams",
        "best_for": ["Quick questions", "Team updates", "Informal chat", "Real-time collaboration"],
        "rules": ["Use threads to keep channels organized", "@mention sparingly", "Use status to show availability", "Don't expect immediate responses", "Use appropriate channels"],
    },
    "meeting": {
        "channel": "Meetings",
        "best_for": ["Decision making", "Brainstorming", "1:1s", "Complex discussions"],
        "rules": ["Always have an agenda", "Start and end on time", "Assign a note-taker", "No multitasking", "Action items before closing"],
    },
    "video": {
        "channel": "Video Calls",
        "best_for": ["Remote collaboration", "Screen sharing", "Presentations", "Team building"],
        "rules": ["Test your tech beforehand", "Use gallery view for group calls", "Mute when not speaking", "Use virtual backgrounds appropriately", "Record for those who can't attend"],
    },
    "document": {
        "channel": "Documentation",
        "best_for": ["Process documentation", "Decisions", "Project specs", "Knowledge sharing"],
        "rules": ["Write for the reader, not yourself", "Use clear headings", "Keep updated", "Link related docs", "Use examples"],
    },
}

# Email templates
EMAIL_TEMPLATES = {
    "meeting_request": {
        "subject": "Meeting Request: [Topic] — [Date/Time]",
        "body": "Hi [Name],\n\nI hope this email finds you well. I would like to schedule a meeting to discuss [topic].\n\nProposed time: [Date] at [Time] [Timezone]\nDuration: [X] minutes\nAgenda:\n- Item 1\n- Item 2\n\nPlease let me know if this works for you, or suggest an alternative time.\n\nBest regards,\n[Your Name]",
    },
    "follow_up": {
        "subject": "Following Up: [Topic]",
        "body": "Hi [Name],\n\nI wanted to follow up on [topic] we discussed on [date].\n\n[Specific question or update]\n\nI would appreciate your input when you have a moment.\n\nBest,\n[Your Name]",
    },
    "project_update": {
        "subject": "Project Update: [Project Name] — Week of [Date]",
        "body": "Hi Team,\n\nHere is the weekly update for [Project Name]:\n\n✅ Completed:\n- Item 1\n- Item 2\n\n🔄 In Progress:\n- Item 3\n\n⚠️ Blockers/Risks:\n- [Any issues]\n\n📅 Next Week:\n- Planned item 1\n\nBest,\n[Your Name]",
    },
    "thank_you": {
        "subject": "Thank You — [Event/Topic]",
        "body": "Hi [Name],\n\nThank you for [specific action]. I really appreciate your [time/help/input].\n\n[Optional: Next steps or offer to help]\n\nBest regards,\n[Your Name]",
    },
    "introduction": {
        "subject": "Introduction: [Person A] ↔ [Person B]",
        "body": "Hi [Person A] and [Person B],\n\nI wanted to introduce you two as I think there could be a great opportunity for collaboration.\n\n[Person A]: [1-2 sentence bio]\n[Person B]: [1-2 sentence bio]\n\nI'll let you both take it from here. Feel free to connect directly!\n\nBest,\n[Your Name]",
    },
}

# Workspace setup recommendations
SETUP_RECOMMENDATIONS = {
    "budget": {
        "desk": ["IKEA LINNMON ($30)", "FlexiSpot Standing Desk ($200)", "Fully Jarvis ($500)"],
        "chair": ["IKEA MARKUS ($200)", "Herman Miller Aeron ($1,400)", "Steelcase Leap ($1,000)"],
        "monitor": ['24" basic ($150)', '27" 4K ($400)', 'Dual ultrawide ($800)'],
        "accessories": ["Basic mouse/keyboard ($50)", "Logitech MX series ($200)", "Ergonomic full setup ($500)"],
    },
    "standard": {
        "desk": ["FlexiSpot Standing Desk ($250)", "Uplift V2 ($600)"],
        "chair": ["HON Ignition ($400)", "Steelcase Series 1 ($500)"],
        "monitor": ['27" Dell ($300)', 'Dual 27" ($600)'],
        "accessories": ["Logitech MX Keys + Master 3 ($250)", "Full ergonomic ($600)"],
    },
    "premium": {
        "desk": ["Fully Jarvis Bamboo ($600)", "Uplift V2 Commercial ($800)"],
        "chair": ["Herman Miller Aeron ($1,400)", "Herman Miller Embody ($1,800)"],
        "monitor": ['LG 38" Ultrawide ($1,000)', 'Apple Pro Display XDR ($5,000)'],
        "accessories": ["Apple Magic Keyboard + Trackpad ($300)", "Full premium ($1,000)"],
    },
}

# Quiz questions
WORKSPACE_QUIZZES = {
    "general": [
        {"q": "What is the recommended response time for work emails?", "options": ["Within 1 hour", "Within 24 hours", "Within 1 week", "No expectation"], "correct": 1},
        {"q": "Which tool is best for visual Kanban-style project management?", "options": ["Excel", "Trello", "PowerPoint", "Notepad"], "correct": 1},
        {"q": "What does 2FA stand for?", "options": ["Two-Factor Authentication", "Two-File Access", "Too Fast Access", "Two-Form Application"], "correct": 0},
        {"q": "Which is a red flag in a phishing email?", "options": ["Professional greeting", "Urgent action required", "Company logo", "Proper spelling"], "correct": 1},
        {"q": "What is the Pomodoro Technique?", "options": ["25 min work, 5 min break", "1 hour work, 15 min break", "4 hours deep work", "No breaks"], "correct": 0},
    ],
    "security": [
        {"q": "What should you do with a suspicious email attachment?", "options": ["Open it to check", "Delete it immediately", "Forward to IT", "Save and scan later"], "correct": 2},
        {"q": "Which is the strongest password?", "options": ["password123", "P@ssw0rd", "Tr0ub4dor&3", "CorrectHorseBatteryStaple!47"], "correct": 3},
        {"q": "What is tailgating in security?", "options": ["Following someone through a secure door", "A driving maneuver", "Network monitoring", "Data backup strategy"], "correct": 0},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def list_tools() -> Dict[str, Any]:
    """List all digital workspace tools."""
    categories = {}
    for tool_id, tool in TOOLS_DB.items():
        cat = tool["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({"id": tool_id, "name": tool["name"]})

    return {
        "status": "success",
        "total_tools": len(TOOLS_DB),
        "categories": categories,
    }


def get_tool_guide(tool_id: str) -> Dict[str, Any]:
    """Get guide for a specific tool."""
    if tool_id not in TOOLS_DB:
        return {"status": "not_found", "available_tools": list(TOOLS_DB.keys())}
    return {"status": "success", **TOOLS_DB[tool_id]}


def compare_tools(category: str) -> Dict[str, Any]:
    """Compare tools in a category."""
    tools_in_cat = [{"id": k, **v} for k, v in TOOLS_DB.items() if v["category"] == category]
    if not tools_in_cat:
        return {"status": "not_found", "available_categories": list(set(v["category"] for v in TOOLS_DB.values()))}
    return {"status": "success", "category": category, "tools": tools_in_cat}


def get_document_guide(topic: str) -> Dict[str, Any]:
    """Get document management guide."""
    if topic not in DOC_GUIDES:
        return {"status": "not_found", "available_topics": list(DOC_GUIDES.keys())}
    return {"status": "success", **DOC_GUIDES[topic]}


def generate_folder_structure(project_type: str = "") -> Dict[str, Any]:
    """Generate folder structure."""
    structures = {
        "software": ["01-Requirements", "02-Design", "03-Development", "04-Testing", "05-Deployment", "06-Documentation", "07-Archive"],
        "marketing": ["01-Strategy", "02-Campaigns", "03-Assets", "04-Reports", "05-Archive"],
        "general": ["01-Active", "02-Reference", "03-Templates", "04-Archive"],
    }
    structure = structures.get(project_type, structures["general"])
    return {
        "status": "success",
        "project_type": project_type or "general",
        "folder_structure": structure,
        "tips": ["Use consistent naming", "Archive completed projects", "Keep templates separate"],
    }


def list_security_modules() -> Dict[str, Any]:
    """List security awareness modules."""
    return {
        "status": "success",
        "total_modules": len(SECURITY_MODULES),
        "modules": [{"id": k, **v} for k, v in SECURITY_MODULES.items()],
    }


def get_security_module(module_id: str) -> Dict[str, Any]:
    """Get a security awareness module."""
    if module_id not in SECURITY_MODULES:
        return {"status": "not_found", "available_modules": list(SECURITY_MODULES.keys())}
    return {"status": "success", **SECURITY_MODULES[module_id]}


def simulate_phishing_test(difficulty: str = "medium") -> Dict[str, Any]:
    """Simulate a phishing test."""
    scenario = random.choice(PHISHING_SCENARIOS)
    return {
        "status": "success",
        "difficulty": difficulty,
        "scenario": {
            "email_subject": scenario["email_subject"],
            "sender": scenario["sender"],
            "content": scenario["content"],
        },
        "question": "Is this email a phishing attempt?",
        "red_flags_to_look_for": ["Urgency language", "Suspicious sender domain", "Unexpected attachments", "Generic greetings", "Suspicious links"],
        "is_actually_phishing": scenario["is_phishing"],
        "actual_red_flags": scenario.get("red_flags", []),
    }


def list_productivity_methods() -> Dict[str, Any]:
    """List productivity methods."""
    return {
        "status": "success",
        "total_methods": len(PRODUCTIVITY_METHODS),
        "methods": [{"id": k, "name": v["name"], "description": v["description"][:100] + "..."} for k, v in PRODUCTIVITY_METHODS.items()],
    }


def get_productivity_method(method_id: str) -> Dict[str, Any]:
    """Get a productivity method guide."""
    if method_id not in PRODUCTIVITY_METHODS:
        return {"status": "not_found", "available_methods": list(PRODUCTIVITY_METHODS.keys())}
    return {"status": "success", **PRODUCTIVITY_METHODS[method_id]}


def create_daily_schedule(preferences: Dict[str, Any] = None) -> Dict[str, Any]:
    """Create daily schedule."""
    if preferences is None:
        preferences = {}

    work_start = preferences.get("work_start", "09:00")
    work_end = preferences.get("work_end", "17:00")
    breaks = preferences.get("breaks", ["12:00"])

    schedule = [
        {"time": work_start, "activity": "Deep work block — most important task", "type": "focus"},
        {"time": "10:30", "activity": "Check emails and messages", "type": "admin"},
        {"time": "11:00", "activity": "Meetings and collaboration", "type": "collaboration"},
        {"time": breaks[0] if breaks else "12:00", "activity": "Lunch break", "type": "break"},
        {"time": "13:00", "activity": "Secondary tasks and follow-ups", "type": "work"},
        {"time": "14:30", "activity": "Learning and development", "type": "growth"},
        {"time": "15:00", "activity": "Administrative tasks", "type": "admin"},
        {"time": "16:00", "activity": "Review and plan for tomorrow", "type": "planning"},
        {"time": work_end, "activity": "Wrap up — shutdown ritual", "type": "end"},
    ]

    return {
        "status": "success",
        "schedule": schedule,
        "tips": [
            "Protect your morning for deep work",
            "Batch similar tasks together",
            "Take breaks every 90 minutes",
            "End each day with tomorrow's plan",
        ],
    }


def list_remote_work_topics() -> Dict[str, Any]:
    """List remote work topics."""
    return {
        "status": "success",
        "topics": [{"id": k, "topic": v["topic"]} for k, v in REMOTE_GUIDES.items()],
    }


def get_remote_work_guide(topic: str) -> Dict[str, Any]:
    """Get remote work guide."""
    if topic not in REMOTE_GUIDES:
        return {"status": "not_found", "available_topics": list(REMOTE_GUIDES.keys())}
    return {"status": "success", **REMOTE_GUIDES[topic]}


def assess_remote_readiness(team: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Assess remote work readiness."""
    if team is None:
        team = []

    criteria = [
        "Reliable internet connection (25+ Mbps)",
        "Dedicated workspace",
        "Comfortable with video conferencing",
        "Self-motivated and disciplined",
        "Good written communication skills",
    ]

    if not team:
        return {
            "status": "ready",
            "assessment_criteria": criteria,
            "recommendations": [
                "Provide equipment stipends",
                "Set clear communication protocols",
                "Invest in collaboration tools",
                "Create virtual social opportunities",
            ],
        }

    scores = []
    for member in team:
        score = random.randint(60, 100)
        scores.append({"name": member.get("name", "Unknown"), "readiness_score": score, "ready": score >= 75})

    avg_score = sum(s["readiness_score"] for s in scores) / len(scores) if scores else 0

    return {
        "status": "success",
        "team_size": len(team),
        "average_readiness": round(avg_score, 1),
        "individual_scores": scores,
        "all_ready": all(s["ready"] for s in scores),
    }


def get_communication_guide(channel: str) -> Dict[str, Any]:
    """Get communication guide for a channel."""
    if channel not in COMM_GUIDES:
        return {"status": "not_found", "available_channels": list(COMM_GUIDES.keys())}
    return {"status": "success", **COMM_GUIDES[channel]}


def generate_email_template(purpose: str = "meeting_request", tone: str = "professional") -> Dict[str, Any]:
    """Generate email template."""
    if purpose not in EMAIL_TEMPLATES:
        return {"status": "not_found", "available_templates": list(EMAIL_TEMPLATES.keys())}

    template = EMAIL_TEMPLATES[purpose]
    return {
        "status": "success",
        "purpose": purpose,
        "tone": tone,
        "subject": template["subject"],
        "body": template["body"],
        "tips": ["Personalize before sending", "Keep it concise", "Proofread carefully"],
    }


def recommend_workspace_setup(budget: str = "standard", work_type: str = "office", space: str = "dedicated") -> Dict[str, Any]:
    """Recommend workspace setup."""
    budget = budget.lower()
    if budget not in SETUP_RECOMMENDATIONS:
        budget = "standard"

    recs = SETUP_RECOMMENDATIONS[budget]

    return {
        "status": "success",
        "budget_tier": budget,
        "work_type": work_type,
        "space_type": space,
        "recommendations": recs,
        "essential_checklist": [
            "Ergonomic chair (you sit 8+ hours)",
            "External monitor at eye level",
            "Good keyboard and mouse",
            "Reliable internet",
            "Proper lighting",
        ],
    }


def get_workspace_quiz(topic: str = "general") -> Dict[str, Any]:
    """Get workspace quiz."""
    if topic not in WORKSPACE_QUIZZES:
        topic = "general"

    questions = WORKSPACE_QUIZZES[topic]
    return {
        "status": "success",
        "topic": topic,
        "total_questions": len(questions),
        "questions": [{"index": i, "q": q["q"], "options": q["options"]} for i, q in enumerate(questions)],
    }


def grade_workspace_quiz(answers: List[int] = None) -> Dict[str, Any]:
    """Grade workspace quiz."""
    if answers is None:
        answers = []

    questions = WORKSPACE_QUIZZES["general"]
    correct = sum(1 for i, ans in enumerate(answers) if i < len(questions) and ans == questions[i]["correct"])
    total = len(answers)
    pct = (correct / total * 100) if total > 0 else 0

    return {
        "status": "success",
        "score": f"{correct}/{total}",
        "percentage": round(pct, 1),
        "passed": pct >= 70,
    }
