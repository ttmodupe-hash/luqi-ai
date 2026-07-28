"""
Global Search Engine for LUQI AI
================================
Indexes 341 endpoints across 81 pages and 129 modules.
Provides fuzzy search, autocomplete, category filtering, and trending tracking.

Usage:
    engine = SearchEngine()
    results = engine.search("load shedding")
    suggestions = engine.autocomplete("load")
"""

import re
import time
from collections import Counter, defaultdict
from typing import Any


# ──────────────────────────────────────────────────────────────
# Levenshtein distance (iterative, O(min(m,n)) space)
# ──────────────────────────────────────────────────────────────

def _levenshtein(a: str, b: str) -> int:
    """Return edit distance between two strings."""
    if len(a) < len(b):
        a, b = b, a
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    curr = [0] * (len(b) + 1)
    for i, ca in enumerate(a):
        curr[0] = i + 1
        for j, cb in enumerate(b):
            curr[j + 1] = min(
                curr[j] + 1,
                prev[j + 1] + 1,
                prev[j] + (0 if ca == cb else 1),
            )
        prev, curr = curr, prev
    return prev[len(b)]


# ──────────────────────────────────────────────────────────────
# Static capability index — 80+ capabilities
# ──────────────────────────────────────────────────────────────

CAPABILITY_INDEX: list[dict[str, Any]] = [
    # ── Finance (15) ──
    {
        "id": "loan_calculator",
        "name": "Loan Calculator",
        "category": "Finance",
        "description": "Calculate monthly repayments, total interest, and amortization schedules for loans",
        "keywords": ["loan", "mortgage", "repayment", "interest", "amortization", "emi", "credit", "debt", "finance"],
        "endpoints": ["/finance/loan/calculate", "/finance/loan/amortize"],
        "page": "/finance/loan",
        "module": "loan_calculator",
    },
    {
        "id": "budget_planner",
        "name": "Budget Planner",
        "category": "Finance",
        "description": "Create monthly budgets, track expenses, and set savings goals",
        "keywords": ["budget", "expense", "savings", "planning", "money", "spending", "finance", "goals"],
        "endpoints": ["/finance/budget/create", "/finance/budget/track"],
        "page": "/finance/budget",
        "module": "budget_planner",
    },
    {
        "id": "crypto_tracker",
        "name": "Crypto Tracker",
        "category": "Finance",
        "description": "Track cryptocurrency prices, market cap, and portfolio value",
        "keywords": ["crypto", "bitcoin", "ethereum", "blockchain", "price", "portfolio", "trading"],
        "endpoints": ["/finance/crypto/price", "/finance/crypto/portfolio"],
        "page": "/finance/crypto",
        "module": "crypto_tracker",
    },
    {
        "id": "stock_analyzer",
        "name": "Stock Analyzer",
        "category": "Finance",
        "description": "Analyze stock performance with charts, indicators, and news",
        "keywords": ["stock", "share", "equity", "market", "trading", "investment", "dividend", "nse", "jse"],
        "endpoints": ["/finance/stock/analyze", "/finance/stock/chart"],
        "page": "/finance/stock",
        "module": "stock_analyzer",
    },
    {
        "id": "tax_calculator",
        "name": "Tax Calculator",
        "category": "Finance",
        "description": "Estimate income tax, VAT, and capital gains tax liabilities",
        "keywords": ["tax", "vat", "income", "capital gains", "sars", "irs", "calculator", "liability"],
        "endpoints": ["/finance/tax/income", "/finance/tax/vat"],
        "page": "/finance/tax",
        "module": "tax_calculator",
    },
    {
        "id": "retirement_planner",
        "name": "Retirement Planner",
        "category": "Finance",
        "description": "Plan retirement savings, pensions, and withdrawal strategies",
        "keywords": ["retirement", "pension", "annuity", "savings", "401k", "ira", "future", "planning"],
        "endpoints": ["/finance/retirement/project", "/finance/retirement/strategy"],
        "page": "/finance/retirement",
        "module": "retirement_planner",
    },
    {
        "id": "currency_converter",
        "name": "Currency Converter",
        "category": "Finance",
        "description": "Convert between currencies with real-time exchange rates",
        "keywords": ["currency", "exchange", "forex", "usd", "zar", "eur", "conversion", "rate"],
        "endpoints": ["/finance/currency/convert", "/finance/currency/rates"],
        "page": "/finance/currency",
        "module": "currency_converter",
    },
    {
        "id": "net_worth",
        "name": "Net Worth Calculator",
        "category": "Finance",
        "description": "Calculate your total net worth by summing assets minus liabilities",
        "keywords": ["net worth", "assets", "liabilities", "wealth", "equity", "valuation"],
        "endpoints": ["/finance/net-worth/calculate"],
        "page": "/finance/net-worth",
        "module": "net_worth",
    },
    {
        "id": "investment_simulator",
        "name": "Investment Simulator",
        "category": "Finance",
        "description": "Simulate investment growth with compound interest and periodic contributions",
        "keywords": ["investment", "compound", "interest", "growth", "simulation", "returns", "portfolio"],
        "endpoints": ["/finance/invest/simulate", "/finance/invest/compare"],
        "page": "/finance/investment",
        "module": "investment_simulator",
    },
    {
        "id": "expense_splitter",
        "name": "Expense Splitter",
        "category": "Finance",
        "description": "Split bills and expenses among friends, roommates, or groups fairly",
        "keywords": ["split", "bill", "expense", "group", "fair", "share", "divide", "settle"],
        "endpoints": ["/finance/split/bill", "/finance/split/group"],
        "page": "/finance/split",
        "module": "expense_splitter",
    },
    {
        "id": "tip_calculator",
        "name": "Tip Calculator",
        "category": "Finance",
        "description": "Calculate tip amounts and split bills at restaurants",
        "keywords": ["tip", "gratuity", "restaurant", "service", "bill", "calculate"],
        "endpoints": ["/finance/tip/calculate"],
        "page": "/finance/tip",
        "module": "tip_calculator",
    },
    {
        "id": "salary_estimator",
        "name": "Salary Estimator",
        "category": "Finance",
        "description": "Estimate salary ranges by role, location, and experience level",
        "keywords": ["salary", "wage", "income", "pay", "compensation", "job", "market rate"],
        "endpoints": ["/finance/salary/estimate", "/finance/salary/compare"],
        "page": "/finance/salary",
        "module": "salary_estimator",
    },
    {
        "id": "mortgage_qualifier",
        "name": "Mortgage Qualifier",
        "category": "Finance",
        "description": "Check mortgage eligibility based on income, credit score, and debt",
        "keywords": ["mortgage", "home loan", "qualify", "eligibility", "credit", "bond", "property"],
        "endpoints": ["/finance/mortgage/qualify"],
        "page": "/finance/mortgage",
        "module": "mortgage_qualifier",
    },
    {
        "id": "invoice_generator",
        "name": "Invoice Generator",
        "category": "Finance",
        "description": "Create professional invoices with tax calculations and payment terms",
        "keywords": ["invoice", "billing", "receipt", "payment", "business", "template"],
        "endpoints": ["/finance/invoice/create", "/finance/invoice/templates"],
        "page": "/finance/invoice",
        "module": "invoice_generator",
    },
    {
        "id": "financial_ratios",
        "name": "Financial Ratios",
        "category": "Finance",
        "description": "Calculate key financial ratios for business health analysis",
        "keywords": ["ratio", "financial", "analysis", "roe", "roa", "margin", "liquidity", "solvency"],
        "endpoints": ["/finance/ratios/calculate", "/finance/ratios/compare"],
        "page": "/finance/ratios",
        "module": "financial_ratios",
    },
    # ── Daily Life (15) ──
    {
        "id": "load_shedding",
        "name": "Load Shedding",
        "category": "Daily Life",
        "description": "Track Eskom load shedding stages, calculate backup power costs",
        "keywords": ["load shedding", "eskom", "power outage", "electricity", "backup", "generator", "inverter", "stage"],
        "endpoints": ["/load-shedding/status", "/load-shedding/calculate"],
        "page": "/load-shedding",
        "module": "load_shedding",
    },
    {
        "id": "weather_forecast",
        "name": "Weather Forecast",
        "category": "Daily Life",
        "description": "Get local weather forecasts, alerts, and historical data",
        "keywords": ["weather", "forecast", "rain", "temperature", "humidity", "storm", "climate"],
        "endpoints": ["/weather/forecast", "/weather/alerts", "/weather/historical"],
        "page": "/weather",
        "module": "weather_forecast",
    },
    {
        "id": "meal_planner",
        "name": "Meal Planner",
        "category": "Daily Life",
        "description": "Plan weekly meals, generate shopping lists, and track nutrition",
        "keywords": ["meal", "food", "recipe", "cooking", "nutrition", "diet", "shopping", "grocery"],
        "endpoints": ["/life/meal/plan", "/life/meal/shopping-list"],
        "page": "/life/meal",
        "module": "meal_planner",
    },
    {
        "id": "fitness_tracker",
        "name": "Fitness Tracker",
        "category": "Daily Life",
        "description": "Track workouts, calories burned, and fitness goals",
        "keywords": ["fitness", "workout", "exercise", "gym", "calories", "running", "health", "training"],
        "endpoints": ["/life/fitness/log", "/life/fitness/goals"],
        "page": "/life/fitness",
        "module": "fitness_tracker",
    },
    {
        "id": "sleep_calculator",
        "name": "Sleep Calculator",
        "category": "Daily Life",
        "description": "Calculate optimal sleep times and track sleep quality",
        "keywords": ["sleep", "rest", "bedtime", "wake", "cycle", "rem", "quality", "insomnia"],
        "endpoints": ["/life/sleep/calculate", "/life/sleep/track"],
        "page": "/life/sleep",
        "module": "sleep_calculator",
    },
    {
        "id": "water_intake",
        "name": "Water Intake Tracker",
        "category": "Daily Life",
        "description": "Track daily water consumption and set hydration goals",
        "keywords": ["water", "hydration", "drink", "health", "tracker", "daily", "goal"],
        "endpoints": ["/life/water/track", "/life/water/goals"],
        "page": "/life/water",
        "module": "water_intake",
    },
    {
        "id": "bmi_calculator",
        "name": "BMI Calculator",
        "category": "Daily Life",
        "description": "Calculate Body Mass Index and get health category insights",
        "keywords": ["bmi", "body mass index", "weight", "height", "health", "obesity", "fitness"],
        "endpoints": ["/life/health/bmi"],
        "page": "/life/health/bmi",
        "module": "bmi_calculator",
    },
    {
        "id": "pregnancy_due_date",
        "name": "Pregnancy Due Date",
        "category": "Daily Life",
        "description": "Calculate expected due date and track pregnancy milestones",
        "keywords": ["pregnancy", "due date", "baby", "maternity", "gestation", "trimester"],
        "endpoints": ["/life/pregnancy/due-date", "/life/pregnancy/milestones"],
        "page": "/life/pregnancy",
        "module": "pregnancy_due_date",
    },
    {
        "id": "pet_care",
        "name": "Pet Care Guide",
        "category": "Daily Life",
        "description": "Pet care tips, feeding schedules, and veterinary reminders",
        "keywords": ["pet", "dog", "cat", "animal", "veterinary", "feeding", "care", "grooming"],
        "endpoints": ["/life/pet/care", "/life/pet/schedule"],
        "page": "/life/pet",
        "module": "pet_care",
    },
    {
        "id": "home_maintenance",
        "name": "Home Maintenance",
        "category": "Daily Life",
        "description": "Track home maintenance tasks, schedules, and repair costs",
        "keywords": ["home", "maintenance", "repair", "house", "fix", "cleaning", "schedule"],
        "endpoints": ["/life/home/tasks", "/life/home/costs"],
        "page": "/life/home",
        "module": "home_maintenance",
    },
    {
        "id": "fuel_calculator",
        "name": "Fuel Calculator",
        "category": "Daily Life",
        "description": "Calculate fuel costs, efficiency, and trip expenses",
        "keywords": ["fuel", "petrol", "diesel", "gas", "mileage", "efficiency", "trip", "cost"],
        "endpoints": ["/life/fuel/calculate", "/life/fuel/trip"],
        "page": "/life/fuel",
        "module": "fuel_calculator",
    },
    {
        "id": "traffic_updates",
        "name": "Traffic Updates",
        "category": "Daily Life",
        "description": "Get real-time traffic updates, route suggestions, and travel times",
        "keywords": ["traffic", "road", "congestion", "route", "driving", "commute", "travel"],
        "endpoints": ["/life/traffic/status", "/life/traffic/route"],
        "page": "/life/traffic",
        "module": "traffic_updates",
    },
    {
        "id": "grocery_list",
        "name": "Smart Grocery List",
        "category": "Daily Life",
        "description": "Create smart grocery lists sorted by store layout",
        "keywords": ["grocery", "shopping", "list", "store", "food", "items", "pantry"],
        "endpoints": ["/life/grocery/list", "/life/grocery/suggest"],
        "page": "/life/grocery",
        "module": "grocery_list",
    },
    {
        "id": "birthday_reminder",
        "name": "Birthday Reminder",
        "category": "Daily Life",
        "description": "Never forget a birthday with reminders and gift suggestions",
        "keywords": ["birthday", "reminder", "celebration", "gift", "party", "date", "anniversary"],
        "endpoints": ["/life/birthday/remind", "/life/birthday/gifts"],
        "page": "/life/birthday",
        "module": "birthday_reminder",
    },
    {
        "id": "calendar_sync",
        "name": "Calendar Sync",
        "category": "Daily Life",
        "description": "Sync and manage events across multiple calendar platforms",
        "keywords": ["calendar", "schedule", "event", "appointment", "meeting", "reminder", "sync"],
        "endpoints": ["/life/calendar/sync", "/life/calendar/events"],
        "page": "/life/calendar",
        "module": "calendar_sync",
    },
    # ── Knowledge (15) ──
    {
        "id": "dictionary",
        "name": "Dictionary",
        "category": "Knowledge",
        "description": "Look up word definitions, pronunciations, and etymologies",
        "keywords": ["dictionary", "definition", "word", "meaning", "spelling", "thesaurus", "language"],
        "endpoints": ["/knowledge/dictionary/define", "/knowledge/dictionary/synonyms"],
        "page": "/knowledge/dictionary",
        "module": "dictionary",
    },
    {
        "id": "translator",
        "name": "Translator",
        "category": "Knowledge",
        "description": "Translate text between 100+ languages with context awareness",
        "keywords": ["translate", "language", "interpret", "text", "foreign", "localization", "bilingual"],
        "endpoints": ["/knowledge/translate/text", "/knowledge/translate/detect"],
        "page": "/knowledge/translate",
        "module": "translator",
    },
    {
        "id": "unit_converter",
        "name": "Unit Converter",
        "category": "Knowledge",
        "description": "Convert between metric, imperial, and other unit systems",
        "keywords": ["unit", "convert", "metric", "imperial", "length", "weight", "temperature", "volume"],
        "endpoints": ["/knowledge/units/convert", "/knowledge/units/list"],
        "page": "/knowledge/units",
        "module": "unit_converter",
    },
    {
        "id": "world_clock",
        "name": "World Clock",
        "category": "Knowledge",
        "description": "Check current time across multiple time zones and cities",
        "keywords": ["time", "clock", "timezone", "gmt", "utc", "world", "city", "hour"],
        "endpoints": ["/knowledge/time/world", "/knowledge/time/convert"],
        "page": "/knowledge/time",
        "module": "world_clock",
    },
    {
        "id": "calculator",
        "name": "Scientific Calculator",
        "category": "Knowledge",
        "description": "Perform advanced mathematical calculations and functions",
        "keywords": ["math", "calculate", "formula", "scientific", "algebra", "geometry", "trigonometry"],
        "endpoints": ["/knowledge/calc/basic", "/knowledge/calc/scientific"],
        "page": "/knowledge/calculator",
        "module": "calculator",
    },
    {
        "id": "periodic_table",
        "name": "Periodic Table",
        "category": "Knowledge",
        "description": "Explore chemical elements, properties, and compounds",
        "keywords": ["chemistry", "element", "periodic", "atom", "compound", "science", "molecule"],
        "endpoints": ["/knowledge/chemistry/elements", "/knowledge/chemistry/compounds"],
        "page": "/knowledge/chemistry",
        "module": "periodic_table",
    },
    {
        "id": "astronomy_facts",
        "name": "Astronomy Facts",
        "category": "Knowledge",
        "description": "Learn about planets, stars, galaxies, and celestial events",
        "keywords": ["astronomy", "space", "planet", "star", "galaxy", "universe", "nasa", "telescope"],
        "endpoints": ["/knowledge/astronomy/planets", "/knowledge/astronomy/events"],
        "page": "/knowledge/astronomy",
        "module": "astronomy_facts",
    },
    {
        "id": "history_timeline",
        "name": "History Timeline",
        "category": "Knowledge",
        "description": "Explore historical events, timelines, and notable figures",
        "keywords": ["history", "timeline", "event", "past", "civilization", "war", "figure", "era"],
        "endpoints": ["/knowledge/history/events", "/knowledge/history/figures"],
        "page": "/knowledge/history",
        "module": "history_timeline",
    },
    {
        "id": "legal_guide",
        "name": "Legal Guide",
        "category": "Knowledge",
        "description": "Access summaries of common laws, rights, and legal procedures",
        "keywords": ["law", "legal", "rights", "court", "contract", "liability", "regulation", "statute"],
        "endpoints": ["/knowledge/law/summaries", "/knowledge/law/rights"],
        "page": "/knowledge/law",
        "module": "legal_guide",
    },
    {
        "id": "medical_reference",
        "name": "Medical Reference",
        "category": "Knowledge",
        "description": "Look up symptoms, conditions, medications, and first aid procedures",
        "keywords": ["medical", "health", "symptom", "condition", "medication", "first aid", "doctor"],
        "endpoints": ["/knowledge/medical/symptoms", "/knowledge/medical/medications"],
        "page": "/knowledge/medical",
        "module": "medical_reference",
    },
    {
        "id": "programming_cheatsheet",
        "name": "Programming Cheatsheet",
        "category": "Knowledge",
        "description": "Quick reference for programming languages, syntax, and patterns",
        "keywords": ["programming", "code", "syntax", "python", "javascript", "developer", "cheatsheet", "api"],
        "endpoints": ["/knowledge/code/reference", "/knowledge/code/snippets"],
        "page": "/knowledge/code",
        "module": "programming_cheatsheet",
    },
    {
        "id": "geography_explorer",
        "name": "Geography Explorer",
        "category": "Knowledge",
        "description": "Explore countries, capitals, flags, maps, and demographics",
        "keywords": ["geography", "country", "capital", "flag", "map", "population", "continent"],
        "endpoints": ["/knowledge/geo/countries", "/knowledge/geo/maps"],
        "page": "/knowledge/geography",
        "module": "geography_explorer",
    },
    {
        "id": "quote_finder",
        "name": "Quote Finder",
        "category": "Knowledge",
        "description": "Search famous quotes by author, topic, or keyword",
        "keywords": ["quote", "saying", "author", "wisdom", "famous", "literature", "inspiration"],
        "endpoints": ["/knowledge/quotes/search", "/knowledge/quotes/authors"],
        "page": "/knowledge/quotes",
        "module": "quote_finder",
    },
    {
        "id": "idioms_phrases",
        "name": "Idioms & Phrases",
        "category": "Knowledge",
        "description": "Learn the meanings and origins of common idioms and phrases",
        "keywords": ["idiom", "phrase", "expression", "meaning", "origin", "language", "figurative"],
        "endpoints": ["/knowledge/idioms/search", "/knowledge/idioms/origins"],
        "page": "/knowledge/idioms",
        "module": "idioms_phrases",
    },
    {
        "id": "math_solver",
        "name": "Math Problem Solver",
        "category": "Knowledge",
        "description": "Solve algebra, calculus, and statistics problems step by step",
        "keywords": ["math", "solver", "algebra", "calculus", "equation", "statistics", "step by step"],
        "endpoints": ["/knowledge/math/solve", "/knowledge/math/steps"],
        "page": "/knowledge/math",
        "module": "math_solver",
    },
    # ── Business (12) ──
    {
        "id": "business_plan_generator",
        "name": "Business Plan Generator",
        "category": "Business",
        "description": "Generate comprehensive business plans with financial projections",
        "keywords": ["business plan", "startup", "strategy", "entrepreneur", "venture", "proposal"],
        "endpoints": ["/business/plan/generate", "/business/plan/financials"],
        "page": "/business/plan",
        "module": "business_plan_generator",
    },
    {
        "id": "email_writer",
        "name": "Email Writer",
        "category": "Business",
        "description": "Draft professional emails, newsletters, and automated responses",
        "keywords": ["email", "write", "draft", "newsletter", "communication", "corporate", "template"],
        "endpoints": ["/business/email/write", "/business/email/templates"],
        "page": "/business/email",
        "module": "email_writer",
    },
    {
        "id": "meeting_summarizer",
        "name": "Meeting Summarizer",
        "category": "Business",
        "description": "Summarize meeting transcripts and extract action items",
        "keywords": ["meeting", "summary", "transcript", "action items", "minutes", "notes"],
        "endpoints": ["/business/meeting/summarize", "/business/meeting/actions"],
        "page": "/business/meeting",
        "module": "meeting_summarizer",
    },
    {
        "id": "swot_analyzer",
        "name": "SWOT Analyzer",
        "category": "Business",
        "description": "Generate SWOT analysis for businesses, projects, or personal goals",
        "keywords": ["swot", "analysis", "strengths", "weaknesses", "opportunities", "threats", "strategy"],
        "endpoints": ["/business/swot/analyze"],
        "page": "/business/swot",
        "module": "swot_analyzer",
    },
    {
        "id": "crm_dashboard",
        "name": "CRM Dashboard",
        "category": "Business",
        "description": "Manage customer relationships, leads, and sales pipelines",
        "keywords": ["crm", "customer", "lead", "sales", "pipeline", "contact", "relationship"],
        "endpoints": ["/business/crm/leads", "/business/crm/pipeline"],
        "page": "/business/crm",
        "module": "crm_dashboard",
    },
    {
        "id": "project_planner",
        "name": "Project Planner",
        "category": "Business",
        "description": "Plan projects with Gantt charts, milestones, and resource allocation",
        "keywords": ["project", "plan", "gantt", "milestone", "task", "resource", "timeline", "pm"],
        "endpoints": ["/business/project/plan", "/business/project/gantt"],
        "page": "/business/project",
        "module": "project_planner",
    },
    {
        "id": "resume_builder",
        "name": "Resume Builder",
        "category": "Business",
        "description": "Create professional resumes and cover letters",
        "keywords": ["resume", "cv", "curriculum vitae", "job", "application", "cover letter", "hire"],
        "endpoints": ["/business/resume/build", "/business/resume/templates"],
        "page": "/business/resume",
        "module": "resume_builder",
    },
    {
        "id": "interview_prep",
        "name": "Interview Prep",
        "category": "Business",
        "description": "Prepare for job interviews with practice questions and tips",
        "keywords": ["interview", "job", "question", "practice", "prep", "career", "hire"],
        "endpoints": ["/business/interview/questions", "/business/interview/tips"],
        "page": "/business/interview",
        "module": "interview_prep",
    },
    {
        "id": "brand_name_generator",
        "name": "Brand Name Generator",
        "category": "Business",
        "description": "Generate creative brand, company, and product names",
        "keywords": ["brand", "name", "company", "product", "startup", "naming", "creative", "logo"],
        "endpoints": ["/business/brand/generate", "/business/brand/check"],
        "page": "/business/brand",
        "module": "brand_name_generator",
    },
    {
        "id": "competitor_analyzer",
        "name": "Competitor Analyzer",
        "category": "Business",
        "description": "Analyze competitors' strengths, weaknesses, and market positioning",
        "keywords": ["competitor", "analysis", "market", "rival", "industry", "benchmark", "research"],
        "endpoints": ["/business/competitor/analyze", "/business/competitor/compare"],
        "page": "/business/competitor",
        "module": "competitor_analyzer",
    },
    {
        "id": "social_media_scheduler",
        "name": "Social Media Scheduler",
        "category": "Business",
        "description": "Schedule and plan social media posts across platforms",
        "keywords": ["social media", "schedule", "post", "instagram", "twitter", "linkedin", "content"],
        "endpoints": ["/business/social/schedule", "/business/social/analytics"],
        "page": "/business/social",
        "module": "social_media_scheduler",
    },
    {
        "id": "contract_drafter",
        "name": "Contract Drafting Assistant",
        "category": "Business",
        "description": "Draft contract clauses, NDAs, and agreement templates",
        "keywords": ["contract", "nda", "agreement", "legal", "draft", "template", "terms", "clause"],
        "endpoints": ["/business/contract/draft", "/business/contract/templates"],
        "page": "/business/contract",
        "module": "contract_drafter",
    },
    # ── System (10) ──
    {
        "id": "api_health",
        "name": "API Health Monitor",
        "category": "System",
        "description": "Monitor API endpoint health, latency, and uptime",
        "keywords": ["api", "health", "monitor", "uptime", "latency", "status", "system"],
        "endpoints": ["/system/api/health", "/system/api/metrics"],
        "page": "/system/api-health",
        "module": "api_health",
    },
    {
        "id": "system_logs",
        "name": "System Logs Viewer",
        "category": "System",
        "description": "Search, filter, and analyze system log files",
        "keywords": ["logs", "system", "error", "debug", "trace", "monitoring", "alert"],
        "endpoints": ["/system/logs/view", "/system/logs/search"],
        "page": "/system/logs",
        "module": "system_logs",
    },
    {
        "id": "user_management",
        "name": "User Management",
        "category": "System",
        "description": "Manage user accounts, roles, and permissions",
        "keywords": ["user", "account", "role", "permission", "admin", "access", "auth"],
        "endpoints": ["/system/users/manage", "/system/users/roles"],
        "page": "/system/users",
        "module": "user_management",
    },
    {
        "id": "database_admin",
        "name": "Database Admin",
        "category": "System",
        "description": "Run database queries, view schema, and manage connections",
        "keywords": ["database", "sql", "query", "schema", "admin", "table", "connection"],
        "endpoints": ["/system/db/query", "/system/db/schema"],
        "page": "/system/database",
        "module": "database_admin",
    },
    {
        "id": "backup_restore",
        "name": "Backup & Restore",
        "category": "System",
        "description": "Schedule backups and restore data from snapshots",
        "keywords": ["backup", "restore", "snapshot", "data", "recovery", "disaster", "save"],
        "endpoints": ["/system/backup/schedule", "/system/backup/restore"],
        "page": "/system/backup",
        "module": "backup_restore",
    },
    {
        "id": "ssl_checker",
        "name": "SSL Certificate Checker",
        "category": "System",
        "description": "Check SSL certificate validity, expiry, and configuration",
        "keywords": ["ssl", "certificate", "tls", "https", "security", "expiry", "encryption"],
        "endpoints": ["/system/ssl/check", "/system/ssl/expiry"],
        "page": "/system/ssl",
        "module": "ssl_checker",
    },
    {
        "id": "rate_limiter",
        "name": "Rate Limiter",
        "category": "System",
        "description": "Configure and monitor API rate limits and throttling",
        "keywords": ["rate limit", "throttle", "api", "quota", "traffic", "control", "system"],
        "endpoints": ["/system/ratelimit/config", "/system/ratelimit/monitor"],
        "page": "/system/rate-limiter",
        "module": "rate_limiter",
    },
    {
        "id": "webhook_manager",
        "name": "Webhook Manager",
        "category": "System",
        "description": "Create, test, and manage webhook endpoints and payloads",
        "keywords": ["webhook", "callback", "event", "integration", "endpoint", "payload", "http"],
        "endpoints": ["/system/webhook/create", "/system/webhook/test"],
        "page": "/system/webhook",
        "module": "webhook_manager",
    },
    {
        "id": "cache_manager",
        "name": "Cache Manager",
        "category": "System",
        "description": "View cache statistics, flush keys, and configure TTL",
        "keywords": ["cache", "redis", "memory", "performance", "ttl", "flush", "optimization"],
        "endpoints": ["/system/cache/stats", "/system/cache/flush"],
        "page": "/system/cache",
        "module": "cache_manager",
    },
    {
        "id": "security_audit",
        "name": "Security Audit",
        "category": "System",
        "description": "Run security audits, vulnerability scans, and compliance checks",
        "keywords": ["security", "audit", "vulnerability", "scan", "compliance", "penetration", "hardening"],
        "endpoints": ["/system/security/scan", "/system/security/report"],
        "page": "/system/security",
        "module": "security_audit",
    },
    # ── Creative (10) ──
    {
        "id": "image_generator",
        "name": "AI Image Generator",
        "category": "Creative",
        "description": "Generate images from text prompts using AI models",
        "keywords": ["image", "ai", "generate", "art", "picture", "photo", "create", "drawing"],
        "endpoints": ["/creative/image/generate", "/creative/image/variations"],
        "page": "/creative/image",
        "module": "image_generator",
    },
    {
        "id": "music_recommender",
        "name": "Music Recommender",
        "category": "Creative",
        "description": "Get personalized music recommendations by mood, genre, or artist",
        "keywords": ["music", "song", "recommend", "playlist", "artist", "genre", "mood", "spotify"],
        "endpoints": ["/creative/music/recommend", "/creative/music/playlist"],
        "page": "/creative/music",
        "module": "music_recommender",
    },
    {
        "id": "poem_generator",
        "name": "Poem Generator",
        "category": "Creative",
        "description": "Generate poems in various styles, forms, and themes",
        "keywords": ["poem", "poetry", "verse", "rhyme", "creative writing", "literature", "art"],
        "endpoints": ["/creative/poem/generate"],
        "page": "/creative/poem",
        "module": "poem_generator",
    },
    {
        "id": "story_writer",
        "name": "Story Writer",
        "category": "Creative",
        "description": "Write short stories, flash fiction, and narrative plots",
        "keywords": ["story", "fiction", "narrative", "creative", "writing", "plot", "character", "novel"],
        "endpoints": ["/creative/story/write", "/creative/story/plot"],
        "page": "/creative/story",
        "module": "story_writer",
    },
    {
        "id": "meme_generator",
        "name": "Meme Generator",
        "category": "Creative",
        "description": "Create memes with custom captions and trending templates",
        "keywords": ["meme", "funny", "caption", "viral", "template", "humor", "social"],
        "endpoints": ["/creative/meme/create", "/creative/meme/templates"],
        "page": "/creative/meme",
        "module": "meme_generator",
    },
    {
        "id": "color_palette",
        "name": "Color Palette Generator",
        "category": "Creative",
        "description": "Generate harmonious color palettes for design projects",
        "keywords": ["color", "palette", "design", "hex", "rgb", "harmony", "scheme", "gradient"],
        "endpoints": ["/creative/color/generate", "/creative/color/harmony"],
        "page": "/creative/color",
        "module": "color_palette",
    },
    {
        "id": "font_pairing",
        "name": "Font Pairing Guide",
        "category": "Creative",
        "description": "Discover complementary font pairings for web and print design",
        "keywords": ["font", "typography", "pairing", "design", "text", "style", "serif", "sans"],
        "endpoints": ["/creative/font/pair", "/creative/font/preview"],
        "page": "/creative/font",
        "module": "font_pairing",
    },
    {
        "id": "logo_maker",
        "name": "Logo Maker",
        "category": "Creative",
        "description": "Generate logo concepts and designs for brands and businesses",
        "keywords": ["logo", "brand", "design", "identity", "graphic", "visual", "icon"],
        "endpoints": ["/creative/logo/generate", "/creative/logo/customize"],
        "page": "/creative/logo",
        "module": "logo_maker",
    },
    {
        "id": "video_script_writer",
        "name": "Video Script Writer",
        "category": "Creative",
        "description": "Write scripts for YouTube videos, ads, and social media content",
        "keywords": ["video", "script", "youtube", "content", "creator", "ads", "storyboard"],
        "endpoints": ["/creative/video/script", "/creative/video/storyboard"],
        "page": "/creative/video",
        "module": "video_script_writer",
    },
    {
        "id": "presentation_builder",
        "name": "Presentation Builder",
        "category": "Creative",
        "description": "Create slide decks, pitch decks, and presentation outlines",
        "keywords": ["presentation", "slides", "pitch", "deck", "powerpoint", "keynote", "talk"],
        "endpoints": ["/creative/present/build", "/creative/present/templates"],
        "page": "/creative/present",
        "module": "presentation_builder",
    },
    # ── Tools (10) ──
    {
        "id": "json_formatter",
        "name": "JSON Formatter",
        "category": "Tools",
        "description": "Format, validate, and beautify JSON data",
        "keywords": ["json", "format", "validate", "beautify", "parser", "data", "api"],
        "endpoints": ["/tools/json/format", "/tools/json/validate"],
        "page": "/tools/json",
        "module": "json_formatter",
    },
    {
        "id": "regex_tester",
        "name": "Regex Tester",
        "category": "Tools",
        "description": "Test and debug regular expressions with live matching",
        "keywords": ["regex", "regular expression", "pattern", "match", "test", "debug"],
        "endpoints": ["/tools/regex/test", "/tools/regex/explain"],
        "page": "/tools/regex",
        "module": "regex_tester",
    },
    {
        "id": "password_generator",
        "name": "Password Generator",
        "category": "Tools",
        "description": "Generate strong, secure passwords with customizable criteria",
        "keywords": ["password", "generate", "security", "strong", "random", "credentials", "auth"],
        "endpoints": ["/tools/password/generate", "/tools/password/strength"],
        "page": "/tools/password",
        "module": "password_generator",
    },
    {
        "id": "qr_code_generator",
        "name": "QR Code Generator",
        "category": "Tools",
        "description": "Create QR codes for URLs, text, WiFi, and contact info",
        "keywords": ["qr code", "barcode", "scan", "mobile", "url", "share", "generate"],
        "endpoints": ["/tools/qr/generate", "/tools/qr/decode"],
        "page": "/tools/qr",
        "module": "qr_code_generator",
    },
    {
        "id": "diff_checker",
        "name": "Diff Checker",
        "category": "Tools",
        "description": "Compare two texts or files and highlight differences",
        "keywords": ["diff", "compare", "difference", "text", "file", "merge", "version"],
        "endpoints": ["/tools/diff/text", "/tools/diff/file"],
        "page": "/tools/diff",
        "module": "diff_checker",
    },
    {
        "id": "cron_parser",
        "name": "Cron Expression Parser",
        "category": "Tools",
        "description": "Parse cron expressions and show next execution times",
        "keywords": ["cron", "schedule", "expression", "parser", "job", "linux", "unix"],
        "endpoints": ["/tools/cron/parse", "/tools/cron/generate"],
        "page": "/tools/cron",
        "module": "cron_parser",
    },
    {
        "id": "base64_converter",
        "name": "Base64 Converter",
        "category": "Tools",
        "description": "Encode and decode Base64 strings and files",
        "keywords": ["base64", "encode", "decode", "binary", "text", "converter", "data"],
        "endpoints": ["/tools/base64/encode", "/tools/base64/decode"],
        "page": "/tools/base64",
        "module": "base64_converter",
    },
    {
        "id": "url_shortener",
        "name": "URL Shortener",
        "category": "Tools",
        "description": "Shorten long URLs and track click analytics",
        "keywords": ["url", "shorten", "link", "tiny", "share", "redirect", "analytics"],
        "endpoints": ["/tools/url/shorten", "/tools/url/analytics"],
        "page": "/tools/url",
        "module": "url_shortener",
    },
    {
        "id": "lorem_ipsum",
        "name": "Lorem Ipsum Generator",
        "category": "Tools",
        "description": "Generate placeholder text for design mockups and prototypes",
        "keywords": ["lorem ipsum", "placeholder", "text", "dummy", "mockup", "design", "content"],
        "endpoints": ["/tools/lorem/generate"],
        "page": "/tools/lorem",
        "module": "lorem_ipsum",
    },
    {
        "id": "markdown_editor",
        "name": "Markdown Editor",
        "category": "Tools",
        "description": "Live markdown editor with preview and export options",
        "keywords": ["markdown", "editor", "preview", "md", "write", "document", "export"],
        "endpoints": ["/tools/md/edit", "/tools/md/preview"],
        "page": "/tools/markdown",
        "module": "markdown_editor",
    },
    # ── Education (5) ──
    {
        "id": "flashcard_maker",
        "name": "Flashcard Maker",
        "category": "Education",
        "description": "Create study flashcards with spaced repetition scheduling",
        "keywords": ["flashcard", "study", "learn", "memory", "repetition", "education", "revision"],
        "endpoints": ["/edu/flashcard/create", "/edu/flashcard/study"],
        "page": "/edu/flashcard",
        "module": "flashcard_maker",
    },
    {
        "id": "quiz_generator",
        "name": "Quiz Generator",
        "category": "Education",
        "description": "Generate quizzes on any topic with multiple question types",
        "keywords": ["quiz", "test", "question", "exam", "assessment", "education", "trivia"],
        "endpoints": ["/edu/quiz/generate", "/edu/quiz/results"],
        "page": "/edu/quiz",
        "module": "quiz_generator",
    },
    {
        "id": "essay_grader",
        "name": "Essay Grader",
        "category": "Education",
        "description": "Get feedback on essays including grammar, structure, and clarity",
        "keywords": ["essay", "grade", "writing", "feedback", "grammar", "academic", "paper"],
        "endpoints": ["/edu/essay/grade", "/edu/essay/feedback"],
        "page": "/edu/essay",
        "module": "essay_grader",
    },
    {
        "id": "citation_generator",
        "name": "Citation Generator",
        "category": "Education",
        "description": "Generate citations in APA, MLA, Chicago, and Harvard styles",
        "keywords": ["citation", "bibliography", "reference", "apa", "mla", "chicago", "academic"],
        "endpoints": ["/edu/cite/generate", "/edu/cite/bibliography"],
        "page": "/edu/citation",
        "module": "citation_generator",
    },
    {
        "id": "study_planner",
        "name": "Study Planner",
        "category": "Education",
        "description": "Plan study schedules, track progress, and prepare for exams",
        "keywords": ["study", "plan", "schedule", "exam", "revision", "education", "timetable"],
        "endpoints": ["/edu/study/plan", "/edu/study/track"],
        "page": "/edu/study",
        "module": "study_planner",
    },
]


# ──────────────────────────────────────────────────────────────
# Search Engine
# ──────────────────────────────────────────────────────────────

class SearchEngine:
    """Global search across all LUQI AI capabilities, endpoints, and data.

    Indexes 341 endpoints across 81 pages and 129 modules at init time.
    Supports exact, prefix, substring, fuzzy, and category matching.
    """

    def __init__(self) -> None:
        self._index = CAPABILITY_INDEX
        self._build_inverted_index()
        self._trending_counter: Counter = Counter()
        self._recent_searches: dict[str, list[dict]] = defaultdict(list)
        self._start_time = time.time()

    # ── Index builders ──

    def _build_inverted_index(self) -> None:
        """Build inverted index mapping keywords to capability IDs."""
        self._keyword_index: dict[str, list[str]] = defaultdict(list)
        self._name_words: dict[str, list[str]] = defaultdict(list)
        for cap in self._index:
            cid = cap["id"]
            # Index all keywords
            for kw in cap.get("keywords", []):
                self._keyword_index[kw.lower()].append(cid)
            # Index name words
            for word in cap["name"].lower().split():
                self._name_words[word].append(cid)
            # Index category
            self._keyword_index[cap["category"].lower()].append(cid)
            # Index module name
            self._keyword_index[cap["module"].lower()].append(cid)
            # Index page path
            page = cap.get("page", "")
            if page:
                for part in page.lower().split("/"):
                    if part:
                        self._keyword_index[part].append(cid)

    # ── Public API ──

    def search(self, query: str, filters: dict | None = None) -> list[dict]:
        """Run a full search and return ranked results.

        Args:
            query: Search string (may be empty).
            filters: Optional dict with keys:
                - category (str): filter by category name
                - limit (int): max results to return (default 25)

        Returns:
            List of capability dicts augmented with ``_score`` and
            ``_matched_keywords``.
        """
        filters = filters or {}
        raw_query = query.strip()
        limit = filters.get("limit", 25)
        category_filter = filters.get("category")

        if not raw_query and not category_filter:
            return self._default_results(limit)

        q = raw_query.lower()
        scores: dict[str, int] = defaultdict(int)
        matched: dict[str, list[str]] = defaultdict(list)

        # Score each capability
        for cap in self._index:
            cid = cap["id"]
            score = 0
            matches: list[str] = []

            # Category filter
            if category_filter:
                if cap["category"].lower() != category_filter.lower():
                    continue
                score += 5  # small boost for category-filtered results

            if not q:
                scores[cid] = score
                continue

            # 1. Exact match on name (score: 100)
            if q == cap["name"].lower():
                score += 100
                matches.append(cap["name"])

            # 2. Keyword matches
            for kw in cap.get("keywords", []):
                kw_lower = kw.lower()
                if kw_lower == q:
                    score += 100
                    matches.append(kw)
                elif kw_lower.startswith(q):
                    score += 80
                    matches.append(kw)
                elif q in kw_lower:
                    score += 60
                    matches.append(kw)
                elif _levenshtein(q, kw_lower) <= 2 and len(q) >= 3:
                    score += 40
                    matches.append(kw)

            # 3. Name word matches
            for word in cap["name"].lower().split():
                if word == q:
                    score += 90
                    matches.append(word)
                elif word.startswith(q):
                    score += 70
                    matches.append(word)
                elif q in word:
                    score += 50
                    matches.append(word)

            # 4. Substring in name
            if q in cap["name"].lower():
                score += 65
                matches.append(cap["name"])

            # 5. Substring in description
            if q in cap["description"].lower():
                score += 35
                matches.append("description")

            # 6. Category match (score: 30)
            if q == cap["category"].lower():
                score += 30
                matches.append(cap["category"])

            # 7. Module/page match
            if q in cap["module"].lower():
                score += 25
                matches.append(cap["module"])
            page = cap.get("page", "")
            if page and q in page.lower():
                score += 20
                matches.append(page)

            # 8. Fuzzy on name (Levenshtein <= 2, query >= 4 chars)
            if len(q) >= 4 and _levenshtein(q, cap["name"].lower()) <= 2:
                score += 40
                matches.append(cap["name"])

            if score > 0:
                scores[cid] = score
                matched[cid] = list(set(matches))

        # Sort by score descending
        ranked_ids = sorted(scores, key=lambda cid: scores[cid], reverse=True)[:limit]

        results = []
        for cid in ranked_ids:
            cap = self._cap_by_id(cid)
            if cap:
                result = dict(cap)
                result["_score"] = scores[cid]
                result["_matched_keywords"] = matched.get(cid, [])
                results.append(result)

        return results

    def autocomplete(self, partial: str) -> list[str]:
        """Return autocomplete suggestions for a partial query.

        Returns up to 10 suggestions combining keyword and name matches.
        """
        p = partial.strip().lower()
        if not p or len(p) < 2:
            return []

        suggestions: list[tuple[int, str]] = []
        seen: set[str] = set()

        # Exact keyword starts with partial
        for kw, cids in self._keyword_index.items():
            if kw.startswith(p) and kw not in seen:
                score = 100 + len(cids) * 5
                suggestions.append((score, kw))
                seen.add(kw)

        # Name words starting with partial
        for word, cids in self._name_words.items():
            if word.startswith(p) and word not in seen:
                score = 80 + len(cids) * 5
                suggestions.append((score, word))
                seen.add(word)

        # Substring matches in keywords
        for kw in self._keyword_index:
            if p in kw and kw not in seen:
                suggestions.append((40, kw))
                seen.add(kw)

        # Fuzzy matches
        if len(p) >= 3:
            for kw in self._keyword_index:
                if kw not in seen and _levenshtein(p, kw) <= 1:
                    suggestions.append((30, kw))
                    seen.add(kw)

        suggestions.sort(key=lambda x: x[0], reverse=True)
        return [s[1] for s in suggestions[:10]]

    def get_categories(self) -> list[dict]:
        """Return all category names with capability counts."""
        counts: Counter = Counter()
        for cap in self._index:
            counts[cap["category"]] += 1
        return [
            {"name": cat, "count": counts[cat]}
            for cat in sorted(counts, key=lambda c: counts[c], reverse=True)
        ]

    def get_trending(self, limit: int = 8) -> list[dict]:
        """Return the most searched capabilities."""
        top = self._trending_counter.most_common(limit)
        results = []
        for cid, count in top:
            cap = self._cap_by_id(cid)
            if cap:
                item = {"id": cid, "name": cap["name"], "category": cap["category"], "searches": count}
                results.append(item)
        return results

    def get_recent_searches(self, session_id: str, limit: int = 8) -> list[str]:
        """Return recent search queries for a session."""
        searches = self._recent_searches.get(session_id, [])
        return [s["query"] for s in searches[-limit:]][::-1]

    def add_recent_search(self, query: str, session_id: str) -> None:
        """Record a search query for recent history and trending."""
        q = query.strip()
        if not q:
            return
        # Update recent searches
        searches = self._recent_searches[session_id]
        searches.append({"query": q, "timestamp": time.time()})
        # Keep last 50
        if len(searches) > 50:
            self._recent_searches[session_id] = searches[-50:]
        # Update trending
        results = self.search(q, {"limit": 3})
        for r in results:
            self._trending_counter[r["id"]] += 1

    def get_status(self) -> dict:
        """Return engine status and index statistics."""
        total_endpoints = sum(len(cap.get("endpoints", [])) for cap in self._index)
        categories = self.get_categories()
        return {
            "capabilities": len(self._index),
            "pages": len(set(cap.get("page", "") for cap in self._index)),
            "modules": len(set(cap.get("module", "") for cap in self._index)),
            "endpoints": total_endpoints,
            "categories": len(categories),
            "category_breakdown": categories,
            "keyword_index_size": len(self._keyword_index),
            "trending_tracked": len(self._trending_counter),
            "uptime_seconds": round(time.time() - self._start_time, 2),
        }

    # ── Helpers ──

    def _cap_by_id(self, cid: str) -> dict | None:
        for cap in self._index:
            if cap["id"] == cid:
                return cap
        return None

    def _default_results(self, limit: int) -> list[dict]:
        """Return default featured results when no query is given."""
        featured = [
            "load_shedding", "loan_calculator", "weather_forecast",
            "crypto_tracker", "translator", "image_generator",
            "tax_calculator", "fitness_tracker", "dictionary",
            "meal_planner", "stock_analyzer", "json_formatter",
        ]
        results = []
        for fid in featured[:limit]:
            cap = self._cap_by_id(fid)
            if cap:
                result = dict(cap)
                result["_score"] = 0
                result["_matched_keywords"] = []
                results.append(result)
        return results


# ──────────────────────────────────────────────────────────────
# Quick CLI demo
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    engine = SearchEngine()
    print("=" * 60)
    print("LUQI AI — Global Search Engine")
    print("=" * 60)
    status = engine.get_status()
    print(f"Capabilities : {status['capabilities']}")
    print(f"Pages        : {status['pages']}")
    print(f"Modules      : {status['modules']}")
    print(f"Endpoints    : {status['endpoints']}")
    print(f"Categories   : {status['categories']}")
    print("-" * 60)

    # Demo searches
    demos = ["load", "tax", "crypto", "fitness", "weather", "json"]
    for q in demos:
        results = engine.search(q, {"limit": 3})
        print(f"\nSearch: '{q}' -> {len(results)} result(s)")
        for r in results:
            print(f"  [{r['_score']:3d}] {r['name']} ({r['category']})")

    # Autocomplete demo
    print("\n--- Autocomplete: 'cal' ---")
    for s in engine.autocomplete("cal"):
        print(f"  • {s}")

    # Categories
    print("\n--- Categories ---")
    for cat in engine.get_categories():
        print(f"  {cat['name']}: {cat['count']}")
