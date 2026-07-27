"""
LUQI AI Brain - Intelligent Orchestrator

Routes user queries to the appropriate module(s) across LUQI AI's 341 endpoints
and 129 modules. Provides multi-language support, conversation context,
personalization, and natural language response formatting.

Architecture:
    AIBrain -> IntentRouter -> ModuleAdapter -> Module
             -> ConversationManager
             -> LanguageManager
             -> ResponseFormatter
             -> UserProfileManager
             -> LLMClient (NEW: OpenAI GPT-4o integration with function calling)

Usage:
    brain = AIBrain()
    response = brain.process_message(
        message="How do I apply for NSFAS?",
        session_id="user_123",
        language="auto"
    )
"""

from __future__ import annotations

import json
import hashlib
import random
import re
import time
import os
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Callable, Generator

# ---------------------------------------------------------------------------
# OpenAI LLM Integration
# ---------------------------------------------------------------------------

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

logger = logging.getLogger(__name__)


class LLMClient:
    """Wrapper for OpenAI API calls with fallback."""

    def __init__(self):
        self.api_key = os.environ.get("OPENAI_API_KEY", "")
        self.client = None
        if OPENAI_AVAILABLE and self.api_key:
            try:
                self.client = openai.OpenAI(api_key=self.api_key)
                logger.info("LLMClient initialized with OpenAI API key")
            except Exception as e:
                logger.warning("Failed to initialize OpenAI client: %s", e)
        else:
            if not OPENAI_AVAILABLE:
                logger.info("OpenAI package not available. Install with: pip install openai")
            if not self.api_key:
                logger.info("OPENAI_API_KEY not set. LLM features disabled — keyword routing will be used.")

    def is_available(self):
        return self.client is not None

    def chat(self, messages, tools=None, stream=False):
        """Call OpenAI with optional function calling."""
        if not self.is_available():
            return None
        try:
            kwargs = {
                "model": "gpt-4o-mini",  # cost-effective: ~R0.01 per query
                "messages": messages,
                "temperature": 0.3,
                "max_tokens": 1000,
            }
            if tools:
                kwargs["tools"] = tools
                kwargs["tool_choice"] = "auto"
            if stream:
                kwargs["stream"] = True
            return self.client.chat.completions.create(**kwargs)
        except Exception as e:
            logger.error("LLM call failed: %s", e)
            return None


# ---------------------------------------------------------------------------
# Tool Definitions for OpenAI Function Calling
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "load_shedding_status",
            "description": "Get current Eskom load shedding stage and schedule for a South African area",
            "parameters": {
                "type": "object",
                "properties": {
                    "area": {"type": "string", "description": "Area or municipality name, e.g. 'Johannesburg', 'Cape Town'"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "solar_calculator",
            "description": "Calculate solar PV system size, cost and savings for a home or business in South Africa",
            "parameters": {
                "type": "object",
                "properties": {
                    "monthly_kwh": {"type": "number", "description": "Average monthly electricity consumption in kWh"},
                    "roof_area_m2": {"type": "number", "description": "Available roof area in square meters"},
                    "location": {"type": "string", "description": "City or region in South Africa"}
                },
                "required": ["monthly_kwh"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "loan_calculator",
            "description": "Calculate loan repayment, interest, and affordability for South African loans (personal, home, vehicle)",
            "parameters": {
                "type": "object",
                "properties": {
                    "principal": {"type": "number", "description": "Loan amount in Rands"},
                    "annual_rate": {"type": "number", "description": "Annual interest rate percentage, e.g. 11.25 for prime"},
                    "months": {"type": "integer", "description": "Loan term in months"},
                    "loan_type": {"type": "string", "enum": ["personal", "home", "vehicle", "student"], "description": "Type of loan"}
                },
                "required": ["principal", "annual_rate", "months"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "insurance_calculator",
            "description": "Get insurance quotes and compare policies: vehicle, life, home, medical aid in South Africa",
            "parameters": {
                "type": "object",
                "properties": {
                    "insurance_type": {"type": "string", "enum": ["vehicle", "life", "home", "medical_aid", "business"], "description": "Type of insurance"},
                    "vehicle_value": {"type": "number", "description": "Vehicle value in Rands (for vehicle insurance)"},
                    "driver_age": {"type": "integer", "description": "Driver age (for vehicle insurance)"},
                    "budget": {"type": "number", "description": "Monthly budget in Rands (for medical aid)"},
                    "family_size": {"type": "integer", "description": "Number of dependents (for medical aid)"}
                },
                "required": ["insurance_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "payroll_calculator",
            "description": "Calculate South African PAYE, UIF, SDL, and net salary from gross monthly income",
            "parameters": {
                "type": "object",
                "properties": {
                    "gross_salary": {"type": "number", "description": "Gross monthly salary in Rands"},
                    "age": {"type": "integer", "description": "Employee age for tax rebate calculation"},
                    "medical_aid_members": {"type": "integer", "description": "Number of medical aid members for tax credit"}
                },
                "required": ["gross_salary"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tender_assistant",
            "description": "Get tender document checklists, B-BBEE requirements, CIDB grading, and procurement guidance for South African government and private tenders",
            "parameters": {
                "type": "object",
                "properties": {
                    "tender_type": {"type": "string", "enum": ["RFP", "RFQ", "RFB", "ITT"], "description": "Tender type"},
                    "value": {"type": "number", "description": "Estimated tender value in Rands"},
                    "sector": {"type": "string", "description": "Industry sector, e.g. 'construction', 'IT', 'services'"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "funding_assistant",
            "description": "Check eligibility and get guidance for South African funding: SEFA, NEF, IDC, DTIC, NYDA, SEDA grants and loans",
            "parameters": {
                "type": "object",
                "properties": {
                    "business_type": {"type": "string", "description": "Type of business, e.g. 'startup', 'SMME', 'cooperative'"},
                    "annual_revenue": {"type": "number", "description": "Annual revenue in Rands"},
                    "employees": {"type": "integer", "description": "Number of employees"},
                    "sector": {"type": "string", "description": "Business sector"},
                    "ownership": {"type": "string", "description": "Ownership structure, e.g. '100% black-owned', 'youth-owned', 'women-owned'"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "agriculture_advisor",
            "description": "Get agricultural advice for South African farming: crops, livestock, subsidies, land reform, DALRRD programs",
            "parameters": {
                "type": "object",
                "properties": {
                    "crop_type": {"type": "string", "description": "Type of crop, e.g. 'maize', 'wheat', 'soya', 'grapes'"},
                    "livestock": {"type": "string", "description": "Type of livestock, e.g. 'cattle', 'sheep', 'poultry'"},
                    "province": {"type": "string", "description": "South African province"},
                    "farm_size_hectares": {"type": "number", "description": "Farm size in hectares"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "health_advisor",
            "description": "Get health information: medical aid comparison, clinic finder, NHI info, vaccination schedules in South Africa",
            "parameters": {
                "type": "object",
                "properties": {
                    "query_type": {"type": "string", "enum": ["medical_aid_comparison", "clinic_finder", "nhi_info", "vaccination"], "description": "Type of health query"},
                    "budget": {"type": "number", "description": "Monthly budget for medical aid"},
                    "location": {"type": "string", "description": "City or area for clinic finder"},
                    "age_group": {"type": "string", "description": "Age group for vaccination schedule"}
                },
                "required": ["query_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "legal_assistant",
            "description": "Get South African legal guidance: contracts, labour law, POPIA, BCEA, LRA, company law, property law",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "Legal topic, e.g. 'employment contract', 'POPIA compliance', 'lease agreement'"},
                    "context": {"type": "string", "description": "Additional context about the legal question"}
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "university_guide",
            "description": "Get South African university information: NSFAS, course requirements, application deadlines, bursaries",
            "parameters": {
                "type": "object",
                "properties": {
                    "university": {"type": "string", "description": "University name, e.g. 'UCT', 'Wits', 'UP', 'UKZN', 'Stellenbosch'"},
                    "course": {"type": "string", "description": "Course or degree name"},
                    "query_type": {"type": "string", "enum": ["nsfas", "admission", "bursary", "course_info"], "description": "Type of query"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "job_market",
            "description": "Get South African job market information: salary benchmarks, in-demand skills, CV tips, interview preparation",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_title": {"type": "string", "description": "Job title or profession"},
                    "experience_years": {"type": "integer", "description": "Years of experience"},
                    "location": {"type": "string", "description": "City or region"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "weather_service",
            "description": "Get weather forecast for South African cities and regions",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "South African city name"},
                    "days": {"type": "integer", "description": "Number of forecast days (1-7)"}
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "vehicle_services",
            "description": "Get South African vehicle services: license renewal, NaTIS, registration, traffic fines",
            "parameters": {
                "type": "object",
                "properties": {
                    "service_type": {"type": "string", "enum": ["license_renewal", "vehicle_registration", "traffic_fines", "natis"], "description": "Type of vehicle service"},
                    "province": {"type": "string", "description": "South African province"}
                },
                "required": ["service_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "music_assistant",
            "description": "Get South African music industry info: SAMRO, SAMPRA, RiSA, royalties, licensing",
            "parameters": {
                "type": "object",
                "properties": {
                    "query_type": {"type": "string", "enum": ["royalties", "licensing", "registration", "distribution"], "description": "Type of music query"}
                },
                "required": ["query_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "government_services",
            "description": "Get South African government services: ID application, passport, birth certificate, traffic department, eHomeAffairs",
            "parameters": {
                "type": "object",
                "properties": {
                    "service_type": {"type": "string", "enum": ["id_card", "passport", "birth_certificate", "drivers_license", "traffic_fines"], "description": "Type of government service"},
                    "online": {"type": "boolean", "description": "Whether to use online services"}
                },
                "required": ["service_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "ecommerce_assistant",
            "description": "Get e-commerce guidance for South Africa: payment gateways, courier services, Takealot, Shopify integration",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "enum": ["payment_gateways", "couriers", "marketplace", "shopify", "woocommerce"], "description": "E-commerce topic"}
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mental_health",
            "description": "Get mental health resources and helplines in South Africa: SADAG, Lifeline, counselling services",
            "parameters": {
                "type": "object",
                "properties": {
                    "support_type": {"type": "string", "enum": ["helpline", "counselling", "support_group", "crisis"], "description": "Type of mental health support"},
                    "province": {"type": "string", "description": "South African province"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "construction_compliance",
            "description": "Get South African construction compliance: NBR, SANS, building plans, occupational health and safety",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "enum": ["building_regulations", "sans_codes", "plan_approval", "safety_compliance"], "description": "Construction topic"},
                    "building_type": {"type": "string", "description": "Type of building project"}
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cybersecurity_assistant",
            "description": "Get cybersecurity guidance: POPIA compliance, security frameworks, penetration testing, incident response",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "enum": ["popia", "framework", "pentest", "incident_response", "awareness"], "description": "Cybersecurity topic"}
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "real_estate_assistant",
            "description": "Get South African real estate info: property valuation, transfer duty, bond calculator, FICA, estate agents",
            "parameters": {
                "type": "object",
                "properties": {
                    "property_value": {"type": "number", "description": "Property value in Rands"},
                    "location": {"type": "string", "description": "Suburb or area"},
                    "query_type": {"type": "string", "enum": ["valuation", "transfer_duty", "bond", "rental", "fica"], "description": "Type of real estate query"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "invoice_generator",
            "description": "Generate professional invoices for South African businesses with VAT calculations",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_name": {"type": "string", "description": "Client or customer name"},
                    "items": {"type": "array", "description": "List of items with description, quantity, and price"},
                    "vat_rate": {"type": "number", "description": "VAT rate percentage (default 15%)"},
                    "include_vat": {"type": "boolean", "description": "Whether to include VAT"}
                },
                "required": ["client_name", "items"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "crm_assistant",
            "description": "Get CRM guidance: customer management, sales pipeline, HubSpot, Salesforce for South African businesses",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "enum": ["pipeline", "customer_management", "automation", "reporting"], "description": "CRM topic"}
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "project_management",
            "description": "Get project management guidance: Agile, Scrum, Waterfall, tools, best practices for SA teams",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "enum": ["agile", "scrum", "waterfall", "tools", "best_practices"], "description": "Project management topic"}
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "communication_assistant",
            "description": "Get business communication guidance: professional writing, email templates, meeting management, presentations",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "enum": ["email_templates", "meeting_management", "presentations", "professional_writing"], "description": "Communication topic"}
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "inventory_management",
            "description": "Get inventory management guidance: stock control, EOQ, FIFO, LIFO, warehousing for SA businesses",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "enum": ["stock_control", "eoq", "fifo_lifo", "warehousing", "barcode_systems"], "description": "Inventory topic"}
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "nutrition_advisor",
            "description": "Get nutrition and dietary guidance for South African diets, including traditional foods",
            "parameters": {
                "type": "object",
                "properties": {
                    "diet_type": {"type": "string", "description": "Type of diet, e.g. 'balanced', 'keto', 'diabetic', 'vegetarian'"},
                    "goal": {"type": "string", "enum": ["weight_loss", "muscle_gain", "maintenance", "health"], "description": "Nutrition goal"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "transport_planner",
            "description": "Get South African transport info: public transport, Gautrain, MyCiTi, taxi routes, e-hailing",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "South African city"},
                    "mode": {"type": "string", "enum": ["gautrain", "myciti", "taxi", "uber", "bus", "train"], "description": "Transport mode"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "water_services",
            "description": "Get South African water services info: municipal water, boreholes, water restrictions, water quality",
            "parameters": {
                "type": "object",
                "properties": {
                    "municipality": {"type": "string", "description": "Municipality name"},
                    "query_type": {"type": "string", "enum": ["restrictions", "quality", "borehole", "tariffs"], "description": "Type of water query"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "emergency_services",
            "description": "Get South African emergency contacts: police, ambulance, fire, rescue, poison helpline",
            "parameters": {
                "type": "object",
                "properties": {
                    "emergency_type": {"type": "string", "enum": ["police", "ambulance", "fire", "rescue", "poison"], "description": "Type of emergency service"},
                    "province": {"type": "string", "description": "South African province"}
                },
                "required": []
            }
        }
    },
]

# ---------------------------------------------------------------------------
# Constants & Configuration
# ---------------------------------------------------------------------------

MAX_HISTORY_PER_SESSION: int = 50
SESSION_TTL_MINUTES: int = 30
CONFIDENCE_THRESHOLD: float = 0.35
FALLBACK_MODULE: str = "general_assistant"


class IntentType(Enum):
    """High-level intent classification."""
    INFORMATION = "information"
    CALCULATION = "calculation"
    APPLICATION = "application"
    COMPARISON = "comparison"
    NAVIGATION = "navigation"
    GREETING = "greeting"
    FAREWELL = "farewell"
    HELP = "help"
    STATUS = "status"
    UNKNOWN = "unknown"


class QueryCategory(Enum):
    """LUQI AI capability domains."""
    FINANCE = "finance"
    TENDERS = "tenders"
    FUNDING = "funding"
    LOANS = "loans"
    AGRICULTURE = "agriculture"
    HEALTH = "health"
    LEGAL = "legal"
    EDUCATION = "education"
    TRANSPORT = "transport"
    CONSTRUCTION = "construction"
    CYBERSECURITY = "cybersecurity"
    HUMAN_RESOURCES = "human_resources"
    REAL_ESTATE = "real_estate"
    BUSINESS = "business"
    TAXATION = "taxation"
    INSURANCE = "insurance"
    MINING = "mining"
    ENERGY = "energy"
    TOURISM = "tourism"
    ENVIRONMENT = "environment"
    GOVERNMENT = "government"
    TECHNOLOGY = "technology"
    MANUFACTURING = "manufacturing"
    RETAIL = "retail"
    TELECOMS = "telecoms"
    WATER = "water"
    AVIATION = "aviation"
    MARITIME = "maritime"
    SPORTS = "sports"
    MEDIA = "media"
    GENERAL = "general"


# ---------------------------------------------------------------------------
# Module Registry — 30+ capability categories, 129 modules, 341 endpoints
# ---------------------------------------------------------------------------

MODULE_REGISTRY: Dict[str, Dict[str, Any]] = {
    QueryCategory.FINANCE.value: {
        "modules": ["finance_data", "loan_calculator", "ca_assistant", "investment_analyzer"],
        "keywords": [
            "loan", "interest", "mortgage", "bond", "credit", "debt", "finance",
            "investment", "portfolio", "equity", "dividend", "capital", "asset",
            "financial", "money", "bank", "savings", "fixed deposit", "unit trust",
            "annuity", "pension", "retirement", "wealth", "net worth"
        ],
        "description": "Financial analysis, loan calculations, investment advice, and accounting support.",
        "examples": ["Calculate bond repayment on R1.2M", "Compare fixed deposit rates"],
    },
    QueryCategory.TENDERS.value: {
        "modules": ["tender_assistant", "cidb_lookup", "cbbee_calculator", "rfp_generator"],
        "keywords": [
            "tender", "rfq", "rfp", "bid", "procurement", "cidb", "cbbee", "bee",
            "black economic empowerment", "supplier", "vendor", "quotation",
            "request for proposal", "request for quote", "bid document",
            "tender bulletin", "government tender", "private tender",
            "construction tender", "supply chain"
        ],
        "description": "Tender discovery, B-BBEE scoring, CIDB grading, and procurement assistance.",
        "examples": ["Find construction tenders in Gauteng", "What is my CIDB grade?"],
    },
    QueryCategory.FUNDING.value: {
        "modules": ["funding_assistant", "grant_funding", "investor_match", "sefa_connector", "nef_connector"],
        "keywords": [
            "funding", "grant", "investor", "seed capital", "nef", "sefa", "idc",
            "dtic funding", "seda", "nyda", "venture capital", "angel investor",
            "equity funding", "debt funding", "crowdfunding", "startup funding",
            "smme funding", "business funding", "enterprise development"
        ],
        "description": "Funding eligibility, grant applications, investor matching, and SEFA/NEF support.",
        "examples": ["Am I eligible for SEFA funding?", "Find grants for agri-business"],
    },
    QueryCategory.LOANS.value: {
        "modules": ["loan_calculator", "credit_assessor", "debt_counsellor", "micro_lender"],
        "keywords": [
            "loan", "personal loan", "business loan", "home loan", "vehicle loan",
            "student loan", "payday loan", "micro loan", "credit card", "overdraft",
            "repayment", "emi", "instalment", "interest rate", "prime rate",
            "credit score", "credit report", "affordability", "debt review"
        ],
        "description": "Loan calculations, credit assessment, affordability checks, and debt counselling.",
        "examples": ["Can I afford a R500k home loan?", "Calculate personal loan EMI"],
    },
    QueryCategory.AGRICULTURE.value: {
        "modules": ["agri_advisor", "livestock_manager", "crop_planner", "land_reform_guide"],
        "keywords": [
            "farm", "farming", "agriculture", "crop", "livestock", "cattle", "sheep",
            "poultry", "maize", "wheat", "soya", "sugar cane", "viticulture",
            "land reform", "plaas", "boer", "agri", "permits", " subsidies",
            "department of agriculture", "daa", "fertilizer", "pest", "irrigation"
        ],
        "description": "Agricultural advisory, crop planning, livestock management, and land reform guidance.",
        "examples": ["Best crops for Limpopo soil", "Livestock vaccination schedule"],
    },
    QueryCategory.HEALTH.value: {
        "modules": ["health_advisor", "medical_aid_comparator", "pharma_lookup", "clinic_finder"],
        "keywords": [
            "health", "medical", "doctor", "hospital", "clinic", "medicine",
            "pharmacy", "medical aid", "discovery", "bonitas", "momentum",
            "nhi", "national health insurance", "treatment", "symptom", "disease",
            "vaccine", "mental health", "dental", "optometry", "chronic"
        ],
        "description": "Health advice, medical aid comparison, medicine lookup, and clinic finder.",
        "examples": ["Compare medical aid plans", "Find clinics near me"],
    },
    QueryCategory.LEGAL.value: {
        "modules": ["legal_assistant", "contract_analyzer", "litigation_tracker", "compliance_checker"],
        "keywords": [
            "law", "legal", "contract", "agreement", "lawyer", "attorney",
            "advocate", "court", "litigation", " lawsuit", "compliance",
            "regulation", "statute", "act", "bill", "poPI", "gdpr",
            "consumer protection", "labour law", "employment contract",
            "lease agreement", "nda", "terms and conditions"
        ],
        "description": "Legal document analysis, contract review, compliance checking, and litigation tracking.",
        "examples": ["Review this lease agreement", "What does POPIA require?"],
    },
    QueryCategory.EDUCATION.value: {
        "modules": ["university_guide", "bursary_finder", "course_recommender", "nsfas_assistant"],
        "keywords": [
            "university", "college", "education", "study", "degree", "diploma",
            "certificate", "course", "learn", "student", "nsfas", "bursary",
            "scholarship", "accommodation", "registration", "matric",
            "grade 12", "exam", "tut", "wits", "uct", "up", "ukzn",
            "varsity", "tertiary", "online course"
        ],
        "description": "University guidance, NSFAS/bursary support, course recommendations, and study planning.",
        "examples": ["How do I apply for NSFAS?", "Best courses for data science"],
    },
    QueryCategory.TRANSPORT.value: {
        "modules": ["transport_planner", "license_services", "fleet_manager", "logistics_optimizer"],
        "keywords": [
            "transport", "license", "driving", "car", "vehicle", "bus", "train",
            "prasa", "metrorail", "gautrain", "taxi", "uber", "bolt",
            "road", "traffic", "naTIS", "registration", "drivers license",
            "learners license", "pdP", "public transport", "logistics",
            "freight", "cargo", "shipping"
        ],
        "description": "Transport planning, license services, fleet management, and logistics optimization.",
        "examples": ["Book learners license test", "Gautrain schedule from Pretoria"],
    },
    QueryCategory.CONSTRUCTION.value: {
        "modules": ["construction_planner", "cidb_lookup", "ncc_compliance", "project_estimator"],
        "keywords": [
            "construction", "building", "builder", "contractor", "subcontractor",
            "architect", "engineer", "plans", "blueprint", "ncc",
            "national building regulations", "sANS", "safety file",
            "site inspection", "building permit", "occupancy certificate",
            "renovation", "extension", "materials", "quantity surveyor"
        ],
        "description": "Construction planning, NCC compliance, CIDB lookups, and project cost estimation.",
        "examples": ["Estimate cost for 3-bedroom house", "What is NCC Part A?"],
    },
    QueryCategory.CYBERSECURITY.value: {
        "modules": ["security_auditor", "penetration_tester", "compliance_scanner", "incident_responder"],
        "keywords": [
            "cyber", "security", "hacking", "breach", "ransomware", "phishing",
            "malware", "virus", "firewall", "encryption", "password",
            "penetration test", "vulnerability", "threat", "incident",
            "iso 27001", "pci dss", "security policy", "soc", "siem",
            "backup", "disaster recovery", "business continuity"
        ],
        "description": "Cybersecurity audits, penetration testing, compliance scanning, and incident response.",
        "examples": ["Run security audit checklist", "What is ISO 27001?"],
    },
    QueryCategory.HUMAN_RESOURCES.value: {
        "modules": ["hr_payroll", "recruitment_assistant", "labour_compliance", "performance_manager"],
        "keywords": [
            "hr", "human resources", "payroll", "paye", "uif", "sdl",
            "recruitment", "hiring", "interview", "cv", "resume",
            "employment contract", "dismissal", "disciplinary",
            "leave", "annual leave", "sick leave", "maternity leave",
            "salary", "wage", "remuneration", "bonus", "overtime",
            "bargaining council", "ccma", "labour court"
        ],
        "description": "HR management, payroll calculations, recruitment support, and labour compliance.",
        "examples": ["Calculate PAYE on R45,000", "CCMA referral process"],
    },
    QueryCategory.REAL_ESTATE.value: {
        "modules": ["property_valuer", "rental_manager", "bond_originator", "sectional_title"],
        "keywords": [
            "property", "real estate", "house", "apartment", "flat", "rent",
            "buy", "sell", "bond", "mortgage", "transfer", "conveyancer",
            "deeds office", "sectional title", "hoa", "levies",
            "rental agreement", "tenant", "landlord", "estate agent",
            "fica", "valuation", "market value", "capital gains"
        ],
        "description": "Property valuation, rental management, bond origination, and sectional title guidance.",
        "examples": ["Estimate property value in Sandton", "Sectional title rules"],
    },
    QueryCategory.BUSINESS.value: {
        "modules": ["business_registrar", "business_plan_generator", "market_research", "franchise_guide"],
        "keywords": [
            "business", "company", "cc", "pty ltd", "register", "cipc",
            "startup", "entrepreneur", "sme", "smme", "business plan",
            "market research", "franchise", "turnover", "profit",
            "shareholder", "director", "moi", "annual return",
            "vat registration", "tax number", "ck document"
        ],
        "description": "Business registration, business plan generation, market research, and franchise guidance.",
        "examples": ["Register a new company", "Write a business plan"],
    },
    QueryCategory.TAXATION.value: {
        "modules": ["tax_calculator", "sars_efiler", "vat_assistant", "customs_duty"],
        "keywords": [
            "tax", "sars", "income tax", "vat", "customs", "duty", "import",
            "export", "tax return", "eFiling", "provisional tax", "paye",
            "site", "tax number", "tax clearance", "good standing",
            "capital gains tax", "donations tax", "estate duty",
            "transfer duty", "fuel levy", "sin tax"
        ],
        "description": "Tax calculations, SARS eFiling, VAT management, and customs duty estimation.",
        "examples": ["How do I file my tax return?", "Calculate VAT on R2,400"],
    },
    QueryCategory.INSURANCE.value: {
        "modules": ["insurance_comparator", "claims_assistant", "risk_assessor", "underwriting_engine"],
        "keywords": [
            "insurance", "policy", "claim", "premium", "cover", "risk",
            "life insurance", "car insurance", "home insurance",
            "business insurance", "funeral cover", "gap cover",
            "short-term insurance", "long-term insurance", "broker",
            "underwriting", "excess", "deductible", "payout",
            "retrenchment cover", "disability cover", "critical illness"
        ],
        "description": "Insurance comparison, claims support, risk assessment, and underwriting guidance.",
        "examples": ["Compare car insurance quotes", "How do I claim?"],
    },
    QueryCategory.MINING.value: {
        "modules": ["mining_permits", "mprdta_guide", "safety_compliance", "mineral_rights"],
        "keywords": [
            "mining", "mine", "mineral", "mprda", "mprdta", "permit",
            "licence", "prospecting", "extraction", "dMR", "dmre",
            "social and labour plan", "slp", "environmental",
            "mining charter", "bEE mining", "health and safety",
            "msha", "rock engineer", "blasting certificate"
        ],
        "description": "Mining permits, MPRDTA guidance, safety compliance, and mineral rights advisory.",
        "examples": ["Apply for a mining permit", "What is an SLP?"],
    },
    QueryCategory.ENERGY.value: {
        "modules": ["energy_advisor", "solar_calculator", "eskom_services", "ipp_connector"],
        "keywords": [
            "energy", "electricity", "eskom", "load shedding", "solar",
            "pv", "renewable", "power", "grid", "inverter", "battery",
            "generator", "diesel", "petrol", "lpg", "gas",
            "ipp", "ippP", "nuclear", "wind", "hydro",
            "geyser", "led", "energy efficiency", "cdb", "nersa"
        ],
        "description": "Energy advisory, solar system calculations, Eskom services, and IPP connections.",
        "examples": ["Calculate solar system size for my home", "Load shedding schedule"],
    },
    QueryCategory.TOURISM.value: {
        "modules": ["tourism_guide", "travel_planner", "accommodation_finder", "visa_assistant"],
        "keywords": [
            "tourism", "travel", "hotel", "accommodation", "lodge",
            "guest house", "b&b", "airbnb", "flight", "airport",
            "visa", "passport", "tour", "safari", "attraction",
            "restaurant", "booking", "holiday", "vacation",
            "sat", "south african tourism", " graded"
        ],
        "description": "Tourism guidance, travel planning, accommodation search, and visa assistance.",
        "examples": ["Best safari lodges near Kruger", "Do I need a visa for UK?"],
    },
    QueryCategory.ENVIRONMENT.value: {
        "modules": ["environmental_assessor", "eia_guide", "waste_manager", "water_licensing"],
        "keywords": [
            "environment", "eia", "environmental impact", "waste",
            "recycling", "pollution", "air quality", "water quality",
            "biodiversity", "conservation", "climate change",
            "carbon footprint", "emissions", "green", "sustainable",
            "dEfF", "department environment", "nema", "waste licence"
        ],
        "description": "Environmental assessments, EIA guidance, waste management, and water licensing.",
        "examples": ["Do I need an EIA?", "Apply for a waste licence"],
    },
    QueryCategory.GOVERNMENT.value: {
        "modules": ["gov_services", "id_services", "passport_services", "municipal_services"],
        "keywords": [
            "government", "home affairs", "dHA", "id book", "id card",
            "smart id", "passport", "birth certificate", "marriage",
            "death certificate", "municipality", "rates", "utilities",
            "water account", "electricity account", "property rates",
            "service delivery", "public service", "govZa"
        ],
        "description": "Government services, ID/passport applications, and municipal account management.",
        "examples": ["Apply for Smart ID", "Query municipal account"],
    },
    QueryCategory.TECHNOLOGY.value: {
        "modules": ["tech_advisor", "saas_recommender", "devops_assistant", "ai_ml_services"],
        "keywords": [
            "technology", "software", "saas", "cloud", "aws", "azure",
            "devops", "ci/cd", "docker", "kubernetes", "api",
            "artificial intelligence", "machine learning", "data science",
            "database", "programming", "web development", "app",
            "domain", "hosting", "server", "network", "it support"
        ],
        "description": "Technology advisory, SaaS recommendations, DevOps support, and AI/ML services.",
        "examples": ["Best accounting software for SME", "Set up CI/CD pipeline"],
    },
    QueryCategory.MANUFACTURING.value: {
        "modules": ["manufacturing_planner", "quality_assurance", "supply_chain", "iso_consultant"],
        "keywords": [
            "manufacturing", "factory", "production", "assembly",
            "quality control", "qc", "qa", "iso 9001", "lean",
            "six sigma", "supply chain", "inventory", "raw material",
            "oem", "odm", "machinery", "automation", "robotics",
            "the dti", "industrial", "sector"
        ],
        "description": "Manufacturing planning, quality assurance, supply chain, and ISO consulting.",
        "examples": ["Implement ISO 9001", "Optimize supply chain"],
    },
    QueryCategory.RETAIL.value: {
        "modules": ["retail_manager", "pos_systems", "inventory_tracker", "loyalty_engine"],
        "keywords": [
            "retail", "shop", "store", "pos", "point of sale",
            "inventory", "stock", "merchandise", "sales", "till",
            "checkout", "barcode", "scanner", "ecommerce", "online store",
            "loyalty", "customer", "consumer", "cpg", "fmcg"
        ],
        "description": "Retail management, POS systems, inventory tracking, and loyalty program design.",
        "examples": ["Best POS for small retail", "Set up loyalty program"],
    },
    QueryCategory.TELECOMS.value: {
        "modules": ["telecoms_advisor", "spectrum_guide", "licensing_tractor", "infrastructure_planner"],
        "keywords": [
            "telecom", "telecommunications", "cellular", "mobile",
            "data bundle", "airtime", "voice", "sms", "mno",
            "vodacom", "mtn", "telkom", "cell c", "rain", "fibre",
            "lte", "5g", "spectrum", "icasa", "licence", "tower",
            "base station", "coverage", "roaming"
        ],
        "description": "Telecoms advisory, spectrum guidance, licensing, and infrastructure planning.",
        "examples": ["Compare data bundles", "ICASA licence application"],
    },
    QueryCategory.WATER.value: {
        "modules": ["water_services", "wastewater_manager", "dam_safety", "irrigation_designer"],
        "keywords": [
            "water", "wastewater", "sewage", "dws", "department water",
            "water use licence", "wul", "dam", "reservoir", "pipeline",
            "municipal water", "borehole", " groundwater", "rainwater",
            "desalination", "water treatment", "effluent", "wrc"
        ],
        "description": "Water services, wastewater management, dam safety, and irrigation design.",
        "examples": ["Apply for water use licence", "Borehole regulations"],
    },
    QueryCategory.AVIATION.value: {
        "modules": ["aviation_services", "drone_licensing", "sacaa_compliance", "airport_ops"],
        "keywords": [
            "aviation", "aircraft", "airplane", "helicopter", "drone",
            "uav", "rpas", "pilot", "licence", "sacaa",
            "airport", "airfield", "hangar", "faa", "icao",
            "caa", "flight school", "atpl", "cpl", "ppl",
            "maintenance", "amo", "amO", "airworthiness"
        ],
        "description": "Aviation services, drone licensing, SACAA compliance, and airport operations.",
        "examples": ["Apply for drone licence", "SACAA compliance checklist"],
    },
    QueryCategory.MARITIME.value: {
        "modules": ["maritime_services", "samsa_compliance", "fishing_permits", "port_ops"],
        "keywords": [
            "maritime", "ship", "vessel", "boat", "port", "harbour",
            "samsa", "flag state", "port state", "solas", "marpol",
            "fishing", "fishing permit", "commercial fishing",
            "crew", "seafarer", "stcw", "master", "deck officer",
            "marine", "coastal", "ship registration"
        ],
        "description": "Maritime services, SAMSA compliance, fishing permits, and port operations.",
        "examples": ["Register a vessel", "Apply for fishing permit"],
    },
    QueryCategory.SPORTS.value: {
        "modules": ["sports_manager", "event_planner", "facility_booker", "funding_sports"],
        "keywords": [
            "sport", "sports", "rugby", "cricket", "soccer", "football",
            "netball", "athletics", "swimming", "tennis", "golf",
            "event", "tournament", "league", "match", "facility",
            "stadium", "ground", "club", "team", "coach",
            "sascoc", "srSA", "lotto sport"
        ],
        "description": "Sports management, event planning, facility booking, and sports funding.",
        "examples": ["Book a sports facility", "Sports event planning checklist"],
    },
    QueryCategory.MEDIA.value: {
        "modules": ["media_planner", "advertising_assistant", "content_creator", "pr_manager"],
        "keywords": [
            "media", "advertising", "marketing", "social media", "content",
            "campaign", "brand", "public relations", "pr", "press release",
            "newspaper", "radio", "tv", "television", "digital",
            "seo", "sem", "google ads", "facebook", "instagram",
            "influencer", "sponsorship", "ad spend", "reach"
        ],
        "description": "Media planning, advertising support, content creation, and PR management.",
        "examples": ["Plan a media campaign", "Write a press release"],
    },
    QueryCategory.GENERAL.value: {
        "modules": ["general_assistant", "calculator", "weather_service", "news_digest"],
        "keywords": [
            "hello", "hi", "help", "what can you do", "who are you",
            "weather", "news", "time", "date", "calculate",
            "convert", "translate", "definition", "meaning",
            "general", "information", "question", "answer",
            "thank", "thanks", "please", "ok", "yes", "no"
        ],
        "description": "General assistance, calculations, weather, news, and conversation.",
        "examples": ["What can you do?", "What is the weather in Cape Town?"],
    },
}

# ---------------------------------------------------------------------------
# Language Support
# ---------------------------------------------------------------------------

LANGUAGE_MAP = {
    "en": "english",
    "zu": "zulu",
    "xh": "xhosa",
    "af": "afrikaans",
    "st": "sesotho",
    "nso": "sepedi",
    "ts": "tsonga",
    "ss": "siSwati",
    "tn": "tswana",
    "ve": "venda",
    "nr": "ndebele",
}

GREETING_PATTERNS = {
    "english": {
        "greetings": ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"],
        "responses": [
            "Hello! Welcome to LUQI AI. How can I help you today?",
            "Hi there! I'm LUQI, your intelligent assistant. What do you need help with?",
            "Hey! Ready to assist you. What would you like to know?",
        ],
        "farewells": ["goodbye", "bye", "see you", "cheers"],
        "farewell_responses": [
            "Goodbye! Feel free to come back anytime.",
            "Bye! Have a great day!",
        ],
    },
    "zulu": {
        "greetings": ["sawubona", "sanibonani", "yebo", "makwande"],
        "responses": [
            "Sawubona! Ngiyithuluzi le-LUQI AI. Ngingakusiza ngani?",
            "Sanibonani! Ngilapha ukukusiza. Uyafuna ukuthini?",
        ],
        "farewells": ["hamba kahle", "salani kahle"],
        "farewell_responses": [
            "Hamba kahle! Uzobuya nini uthando.",
        ],
    },
    "xhosa": {
        "greetings": ["molo", "molweni", "ewe"],
        "responses": [
            "Molo! Ndiluqhu le-LUQI AI. Ndingakunceda njani?",
            "Molweni! Ndilapha ukukunceda. Ufuna ntoni na?",
        ],
        "farewells": ["hamba kakuhle", "salani kakuhle"],
        "farewell_responses": [
            "Hamba kakuhle! Uzobuya rhoqo.",
        ],
    },
    "afrikaans": {
        "greetings": ["hallo", "haai", "goeie more", "goeie middag", "goeie naand"],
        "responses": [
            "Hallo! Ek is LUQI AI. Hoe kan ek jou help?",
            "Haai! Welkom by LUQI AI. Wat het jy nodig?",
        ],
        "farewells": ["totsiens", "baai", "groetnis"],
        "farewell_responses": [
            "Totsiens! Kom gou weer terug.",
        ],
    },
    "sesotho": {
        "greetings": ["lumela", "dumela", "ee"],
        "responses": [
            "Lumela! Ke sehlabelo sa LUQI AI. Ke ka thusa joang?",
            "Dumela! Ke teng ho u thusa. O batlang?",
        ],
        "farewells": ["sala hantle", "tsamaya hantle"],
        "farewell_responses": [
            "Tsamaya hantle! Kgutla ka potlako.",
        ],
    },
}

# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

@dataclass
class ConversationTurn:
    """A single turn in a conversation."""
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: float = field(default_factory=time.time)
    module_called: Optional[str] = None
    language: str = "english"


@dataclass
class UserProfile:
    """User personalization profile."""
    user_id: str
    location: Optional[str] = None
    industry: Optional[str] = None
    interests: List[str] = field(default_factory=list)
    preferred_language: str = "english"
    frequent_modules: Dict[str, int] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)


@dataclass
class RouteResult:
    """Result of intent routing."""
    category: str
    modules: List[str]
    confidence: float
    intent: IntentType
    entities: Dict[str, Any] = field(default_factory=dict)
    suggested_followups: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Mock Module Adapter
# ---------------------------------------------------------------------------

class ModuleAdapter:
    """Base adapter for LUQI AI modules."""

    def __init__(self, module_name: str):
        self.module_name = module_name
        self.loaded = True
        self.call_count = 0
        self.last_called: Optional[float] = None

    def call(self, method: str, **kwargs: Any) -> Dict[str, Any]:
        """Call a method on the adapted module."""
        self.call_count += 1
        self.last_called = time.time()
        # In production, this dispatches to the actual module
        return {
            "module": self.module_name,
            "method": method,
            "result": self._mock_result(method, **kwargs),
            "timestamp": datetime.now().isoformat(),
        }

    def _mock_result(self, method: str, **kwargs: Any) -> Any:
        """Generate a plausible mock result for demonstration."""
        mocks: Dict[str, Callable] = {
            "get_nsfas_info": lambda **kw: {
                "eligibility": "South African citizen, SASSA recipient, or household income < R350k/year",
                "application_deadline": "31 January 2025",
                "documents": ["ID copy", "matric certificate", "proof of income", "university acceptance letter"],
                "next_steps": "Apply online at www.nsfas.org.za or via the myNSFAS app.",
            },
            "generate_checklist": lambda **kw: {
                "checklist": [
                    f"Company registration documents (CIPC)",
                    f"Tax clearance certificate (SARS)",
                    f"B-BBEE certificate",
                    f"CIDB registration (Grade {kw.get('value', 1)}+",
                    f"Financial statements (audited, last 3 years)",
                    f"Bank details & cancelled cheque",
                    f"Reference letters (minimum 3)",
                ],
                "tender_value": kw.get("value", 0),
                "sector": kw.get("sector", "general"),
            },
            "calculate_payee": lambda **kw: {
                "gross_monthly": kw.get("salary", 0),
                "paye_monthly": round(kw.get("salary", 0) * 0.18, 2),
                "uif_monthly": round(min(kw.get("salary", 0) * 0.01, 177.12), 2),
                "net_monthly": round(kw.get("salary", 0) * 0.81, 2),
                "tax_year": "2024/2025",
                "rebates_applied": ["primary_rebate"],
            },
            "compare_medical_aids": lambda **kw: {
                "plans": [
                    {"name": "Discovery Essential", "monthly": 2450, "hospital": "Network only", "savings": "R4,200/year"},
                    {"name": "Bonitas Primary", "monthly": 1980, "hospital": "Unlimited", "savings": "R3,600/year"},
                    {"name": "Momentum Custom", "monthly": 2200, "hospital": "Network + gap cover", "savings": "R4,800/year"},
                ],
                "note": "Premiums vary by age, family size, and health status.",
            },
            "register_company": lambda **kw: {
                "steps": [
                    "Reserve company name via CIPC (R50)",
                    "Complete COR14.1, COR14.1A, COR14.3 forms",
                    "Submit MOI (Memorandum of Incorporation)",
                    "Pay registration fee (R125)",
                    "Receive CIPC registration certificate (5-10 days)",
                ],
                "estimated_cost": 175,
                "estimated_time_days": "7-10",
            },
            "calculate_bond": lambda **kw: {
                "property_value": kw.get("property_value", 0),
                "deposit": kw.get("deposit", 0),
                "loan_amount": kw.get("property_value", 0) - kw.get("deposit", 0),
                "interest_rate": kw.get("interest_rate", 11.5),
                "term_years": kw.get("term_years", 20),
                "monthly_repayment": round(
                    (kw.get("property_value", 0) - kw.get("deposit", 0))
                    * (kw.get("interest_rate", 11.5) / 100 / 12)
                    / (1 - (1 + kw.get("interest_rate", 11.5) / 100 / 12) ** (-kw.get("term_years", 20) * 12)),
                    2,
                ),
                "total_interest": round(
                    round(
                        (kw.get("property_value", 0) - kw.get("deposit", 0))
                        * (kw.get("interest_rate", 11.5) / 100 / 12)
                        / (1 - (1 + kw.get("interest_rate", 11.5) / 100 / 12) ** (-kw.get("term_years", 20) * 12)),
                        2,
                    )
                    * kw.get("term_years", 20) * 12
                    - (kw.get("property_value", 0) - kw.get("deposit", 0)),
                    2,
                ),
            },
        }
        if method in mocks:
            return mocks[method](**kwargs)
        return {"message": f"Mock result for {self.module_name}.{method}()", "params": kwargs}

    def get_help(self) -> str:
        """Return module help text."""
        return f"Module '{self.module_name}' — provides business services via LUQI AI."


# ---------------------------------------------------------------------------
# Core AIBrain Class
# ---------------------------------------------------------------------------

class AIBrain:
    """
    Intelligent orchestrator that routes queries to LUQI AI modules.

    Maintains conversation state, detects language, extracts intent,
    and formats natural language responses.

    NEW: LLM-powered routing via OpenAI GPT-4o with function calling.
    Falls back to keyword-based routing when LLM is unavailable.
    """

    def __init__(self) -> None:
        self._conversations: Dict[str, List[ConversationTurn]] = {}
        self._user_profiles: Dict[str, UserProfile] = {}
        self._session_meta: Dict[str, Dict[str, Any]] = {}
        self._module_adapters: Dict[str, ModuleAdapter] = {}
        self._start_time = time.time()
        self._total_queries = 0
        self._category_hits: Dict[str, int] = {}

        # Initialize LLM client
        self.llm = LLMClient()

        # Seed mock adapters for known modules
        all_modules: set = set()
        for cat in MODULE_REGISTRY.values():
            all_modules.update(cat.get("modules", []))
        for mod in sorted(all_modules):
            self._module_adapters[mod] = ModuleAdapter(mod)

    # -- Public API ------------------------------------------------------------

    def process_message(
        self,
        message: str,
        session_id: str = "default",
        language: str = "auto",
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point: process a user message and return a response.

        Uses LLM with function calling if available, falls back to
        keyword-based routing when LLM is not configured.

        Args:
            message: The user's natural language query.
            session_id: Unique conversation session identifier.
            language: Target language code ('auto' to detect).
            user_id: Optional user ID for personalization.

        Returns:
            Dict with 'response', 'category', 'confidence', 'language', 'suggestions'.
            Also includes 'llm_active' status and 'mode' field.
        """
        self._total_queries += 1
        self._ensure_session(session_id)

        # Detect / set language
        detected_lang = language if language != "auto" else self.detect_language(message)

        # Load user profile if available
        profile = self.load_user_profile(user_id) if user_id else None
        if profile:
            profile.last_active = time.time()
            if detected_lang != "auto":
                profile.preferred_language = detected_lang

        # Log user turn
        self._add_turn(session_id, "user", message, language=detected_lang)

        # Check for greeting / farewell / help shortcuts (fast path)
        shortcut = self._check_shortcuts(message.lower(), detected_lang)
        if shortcut:
            self._add_turn(session_id, "assistant", shortcut, language=detected_lang)
            return {
                "response": shortcut,
                "category": QueryCategory.GENERAL.value,
                "confidence": 1.0,
                "language": detected_lang,
                "suggestions": self._get_suggestions(QueryCategory.GENERAL.value),
                "session_id": session_id,
                "llm_active": self.llm.is_available(),
                "mode": "shortcut",
            }

        # Try LLM-powered processing first, fallback to keyword routing
        if self.llm.is_available():
            try:
                result = self._process_with_llm(message, session_id, detected_lang, user_id)
                result["llm_active"] = True
                result["mode"] = "llm"
                return result
            except Exception as e:
                logger.warning("LLM processing failed, falling back to keyword routing: %s", e)

        # Fallback: keyword-based routing
        result = self._process_with_keywords(message, session_id, detected_lang, user_id, profile)
        result["llm_active"] = self.llm.is_available()
        result["mode"] = "keyword"
        return result

    # -- LLM-Powered Processing (NEW) -----------------------------------------

    def _process_with_llm(self, message: str, session_id: str, language: str, user_id: Optional[str]) -> Dict[str, Any]:
        """Use OpenAI LLM with function calling to route and process queries."""
        # Build conversation context from history
        history_turns = self._conversations.get(session_id, [])[-10:]  # Last 10 turns
        history = []
        for turn in history_turns:
            history.append({"role": turn.role, "content": turn.content})

        messages = [
            {"role": "system", "content": self._build_system_prompt(language)},
            *history,
            {"role": "user", "content": message}
        ]

        # Call LLM with tools
        response = self.llm.chat(messages, tools=TOOLS)
        if not response:
            raise RuntimeError("LLM returned no response")

        msg = response.choices[0].message

        # Handle function calls
        if msg.tool_calls:
            return self._execute_tool_calls(msg.tool_calls, message, session_id, language)

        # Direct text response from LLM
        response_text = msg.content or "I'm not sure how to help with that. Could you rephrase?"
        self._add_turn(session_id, "assistant", response_text, language=language)

        return {
            "response": response_text,
            "category": QueryCategory.GENERAL.value,
            "confidence": 0.9,
            "language": language,
            "intent": IntentType.INFORMATION.value,
            "modules_called": [],
            "suggestions": self._get_suggestions(QueryCategory.GENERAL.value),
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
        }

    def _build_system_prompt(self, language: str) -> str:
        """Build system prompt for LLM with SA context and tool awareness."""
        return f"""You are LUQI AI, a helpful assistant specialized in South African and African information.
You have access to tools for: load shedding, solar calculations, loans, insurance, payroll, tenders, funding, agriculture, health, legal, university guidance, jobs, weather, vehicle services, music, government services, e-commerce, mental health, construction, cybersecurity, real estate, invoicing, CRM, project management, communication, inventory, nutrition, transport, water, and emergency services.

Rules:
- Use the available tools when the user's query matches a specific domain.
- Call multiple tools if the query spans multiple areas.
- Always provide specific, actionable advice with numbers where possible.
- Reference South African context (Rands, local regulations, local services).
- Respond in {language}.
- Be concise but thorough.
- If no tool matches, answer directly with your knowledge."""

    def _execute_tool_calls(self, tool_calls: list, original_message: str, session_id: str, language: str) -> Dict[str, Any]:
        """Execute the tools the LLM decided to call and format results."""
        results = []
        modules_called = []

        for tc in tool_calls:
            tool_name = tc.function.name
            try:
                args = json.loads(tc.function.arguments) if tc.function.arguments else {}
            except json.JSONDecodeError:
                args = {}

            result = self._call_module(tool_name, args)
            result["_tool_name"] = tool_name
            results.append(result)
            modules_called.append(tool_name)

        # Format results into natural language
        response_text = self._format_tool_results(results, language)

        self._add_turn(session_id, "assistant", response_text, module_called=",".join(modules_called), language=language)

        # Add the original message as user turn if not already there
        # (it was added before LLM call)

        return {
            "response": response_text,
            "category": self._infer_category_from_tools(modules_called),
            "confidence": 0.9,
            "language": language,
            "intent": IntentType.INFORMATION.value,
            "modules_called": modules_called,
            "tool_results": results,
            "suggestions": self._get_suggestions(self._infer_category_from_tools(modules_called)),
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
        }

    def _call_module(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Route a tool call to the appropriate module adapter."""
        # Map tool names to module names and methods
        tool_to_module = {
            "load_shedding_status": ("eskom_services", "get_current_stage"),
            "solar_calculator": ("solar_calculator", "calculate_system_size"),
            "loan_calculator": ("loan_calculator", "calculate_personal_loan"),
            "insurance_calculator": ("insurance_comparator", "compare_quotes"),
            "payroll_calculator": ("hr_payroll", "calculate_payee"),
            "tender_assistant": ("tender_assistant", "generate_checklist"),
            "funding_assistant": ("funding_assistant", "check_eligibility"),
            "agriculture_advisor": ("agri_advisor", "get_crop_advice"),
            "health_advisor": ("health_advisor", "compare_medical_aids"),
            "legal_assistant": ("legal_assistant", "get_legal_advice"),
            "university_guide": ("university_guide", "get_nsfas_info"),
            "job_market": ("recruitment_assistant", "get_salary_benchmark"),
            "weather_service": ("weather_service", "get_forecast"),
            "vehicle_services": ("license_services", "get_renewal_info"),
            "music_assistant": ("content_creator", "get_music_industry_info"),
            "government_services": ("gov_services", "get_service_guide"),
            "ecommerce_assistant": ("retail_manager", "get_ecommerce_guidance"),
            "mental_health": ("health_advisor", "get_mental_health_resources"),
            "construction_compliance": ("construction_planner", "get_ncc_compliance"),
            "cybersecurity_assistant": ("security_auditor", "run_audit"),
            "real_estate_assistant": ("property_valuer", "estimate_value"),
            "invoice_generator": ("general_assistant", "generate_invoice"),
            "crm_assistant": ("general_assistant", "get_crm_guidance"),
            "project_management": ("general_assistant", "get_pm_guidance"),
            "communication_assistant": ("general_assistant", "get_communication_guidance"),
            "inventory_management": ("inventory_tracker", "get_stock_guidance"),
            "nutrition_advisor": ("health_advisor", "get_nutrition_info"),
            "transport_planner": ("transport_planner", "get_route_info"),
            "water_services": ("water_services", "get_tariff_info"),
            "emergency_services": ("general_assistant", "get_emergency_contacts"),
        }

        module_name, method = tool_to_module.get(tool_name, ("general_assistant", "answer"))
        adapter = self._module_adapters.get(module_name)

        if adapter:
            try:
                return adapter.call(method, **args)
            except Exception as exc:
                return {"_tool_name": tool_name, "error": str(exc), "module": module_name}
        else:
            return {"_tool_name": tool_name, "message": f"Tool '{tool_name}' result with args: {args}", "module": module_name}

    def _format_tool_results(self, results: List[Dict[str, Any]], language: str) -> str:
        """Format tool execution results into natural language response."""
        if not results:
            return "I'm not sure I understood that. Could you rephrase?"

        parts = []
        for result in results:
            result_data = result.get("result", {})
            if isinstance(result_data, dict):
                if "message" in result_data and len(result_data) == 2:
                    parts.append(result_data["message"])
                elif "steps" in result_data:
                    lines = ["Here's what you need to do:"]
                    for i, step in enumerate(result_data["steps"], 1):
                        lines.append(f"{i}. {step}")
                    if "estimated_cost" in result_data:
                        lines.append(f"\n**Estimated cost:** R{result_data['estimated_cost']}")
                    if "estimated_time_days" in result_data:
                        lines.append(f"**Estimated time:** {result_data['estimated_time_days']} days")
                    parts.append("\n".join(lines))
                elif "plans" in result_data:
                    lines = ["Here's a comparison of available options:", ""]
                    for plan in result_data["plans"]:
                        lines.append(f"**{plan.get('name', 'Plan')}** — R{plan.get('monthly', 'N/A')}/month")
                        for k, v in plan.items():
                            if k != "name":
                                lines.append(f"  - {k.capitalize()}: {v}")
                        lines.append("")
                    if "note" in result_data:
                        lines.append(f"*{result_data['note']}*")
                    parts.append("\n".join(lines))
                elif "paye_monthly" in result_data:
                    lines = [
                        f"Based on a gross monthly salary of **R{result_data.get('gross_monthly', 0):,.2f}**:\n\n"
                        f"| Component | Amount |\n"
                        f"|-----------|--------|\n"
                        f"| Gross Monthly | R{result_data.get('gross_monthly', 0):,.2f} |\n"
                        f"| PAYE | R{result_data.get('paye_monthly', 0):,.2f} |\n"
                        f"| UIF | R{result_data.get('uif_monthly', 0):,.2f} |\n"
                        f"| **Net Monthly** | **R{result_data.get('net_monthly', 0):,.2f}** |\n\n"
                        f"Tax year: {result_data.get('tax_year', '2024/2025')}. Primary rebate applied."
                    ]
                    parts.append("\n".join(lines))
                elif "monthly_repayment" in result_data:
                    lines = [
                        f"**Bond/Loan Calculation**:\n\n"
                        f"| Detail | Value |\n"
                        f"|--------|-------|\n"
                        f"| Loan Amount | R{result_data.get('loan_amount', result_data.get('property_value', 0) - result_data.get('deposit', 0)):,.2f} |\n"
                        f"| Interest Rate | {result_data.get('interest_rate', 0)}% |\n"
                        f"| Term | {result_data.get('term_years', result_data.get('months', 0) // 12)} years |\n"
                        f"| **Monthly Repayment** | **R{result_data['monthly_repayment']:,.2f}** |"
                    ]
                    parts.append("\n".join(lines))
                else:
                    lines = []
                    for k, v in result_data.items():
                        if k.startswith("_"):
                            continue
                        if isinstance(v, list):
                            lines.append(f"**{k.replace('_', ' ').title()}:**")
                            for item in v:
                                lines.append(f"  - {item}")
                        else:
                            lines.append(f"**{k.replace('_', ' ').title()}:** {v}")
                    parts.append("\n".join(lines))
            else:
                parts.append(str(result_data))

        return "\n\n".join(parts)

    def _infer_category_from_tools(self, tool_names: List[str]) -> str:
        """Map tool names back to query categories."""
        tool_category_map = {
            "load_shedding_status": "energy",
            "solar_calculator": "energy",
            "loan_calculator": "loans",
            "insurance_calculator": "insurance",
            "payroll_calculator": "human_resources",
            "tender_assistant": "tenders",
            "funding_assistant": "funding",
            "agriculture_advisor": "agriculture",
            "health_advisor": "health",
            "legal_assistant": "legal",
            "university_guide": "education",
            "job_market": "human_resources",
            "weather_service": "general",
            "vehicle_services": "transport",
            "music_assistant": "media",
            "government_services": "government",
            "ecommerce_assistant": "retail",
            "mental_health": "health",
            "construction_compliance": "construction",
            "cybersecurity_assistant": "cybersecurity",
            "real_estate_assistant": "real_estate",
            "invoice_generator": "finance",
            "crm_assistant": "business",
            "project_management": "business",
            "communication_assistant": "business",
            "inventory_management": "retail",
            "nutrition_advisor": "health",
            "transport_planner": "transport",
            "water_services": "water",
            "emergency_services": "general",
        }
        if tool_names:
            return tool_category_map.get(tool_names[0], "general")
        return "general"

    # -- Keyword-Based Processing (existing, now called _process_with_keywords) -

    def _process_with_keywords(
        self,
        message: str,
        session_id: str,
        language: str,
        user_id: Optional[str],
        profile: Optional[UserProfile] = None,
    ) -> Dict[str, Any]:
        """Process using keyword-based routing (fallback when LLM unavailable)."""
        # Route query
        context = {"profile": profile, "history": self._get_recent_history(session_id)}
        route = self.route_query(message, context)

        # Update category hit stats
        self._category_hits[route.category] = self._category_hits.get(route.category, 0) + 1

        # Call module(s)
        module_results: List[Dict[str, Any]] = []
        for mod_name in route.modules:
            adapter = self._module_adapters.get(mod_name)
            if adapter:
                method = self._pick_method(mod_name, route)
                try:
                    result = adapter.call(method, **route.entities)
                    result["_module"] = mod_name
                    module_results.append(result)
                except Exception as exc:
                    module_results.append({"_module": mod_name, "error": str(exc)})
                if profile:
                    profile.frequent_modules[mod_name] = (
                        profile.frequent_modules.get(mod_name, 0) + 1
                    )

        # Format response
        response_text = self.format_response(module_results, route, language)

        # Store assistant turn
        self._add_turn(session_id, "assistant", response_text, module_called=",".join(route.modules), language=language)

        # Build result
        return {
            "response": response_text,
            "category": route.category,
            "confidence": round(route.confidence, 3),
            "language": language,
            "intent": route.intent.value,
            "modules_called": route.modules,
            "suggestions": route.suggested_followups or self._get_suggestions(route.category),
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
        }

    # -- Streaming Support (NEW) ----------------------------------------------

    def process_message_stream(
        self,
        message: str,
        session_id: str = "default",
        language: str = "auto",
        user_id: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """
        Stream LLM response in real-time using Server-Sent Events format.

        If LLM is not available, yields a single fallback response.
        """
        if not self.llm.is_available():
            # Fallback: process normally and yield as single chunk
            result = self.process_message(message, session_id, language, user_id)
            yield json.dumps({"type": "fallback", "response": result})
            return

        # Detect language
        detected_lang = language if language != "auto" else self.detect_language(message)

        # Build messages
        history_turns = self._conversations.get(session_id, [])[-5:]
        history = [{"role": t.role, "content": t.content} for t in history_turns]

        messages = [
            {"role": "system", "content": self._build_system_prompt(detected_lang)},
            *history,
            {"role": "user", "content": message}
        ]

        # Stream from LLM
        try:
            response = self.llm.chat(messages, stream=True)
            if response:
                full_text = ""
                for chunk in response:
                    delta = chunk.choices[0].delta.content if chunk.choices[0].delta else None
                    if delta:
                        full_text += delta
                        yield json.dumps({"type": "stream", "token": delta, "text": full_text})

                # Store the complete response
                self._ensure_session(session_id)
                self._add_turn(session_id, "user", message, language=detected_lang)
                self._add_turn(session_id, "assistant", full_text, language=detected_lang)

                yield json.dumps({"type": "done", "text": full_text, "language": detected_lang})
            else:
                yield json.dumps({"type": "error", "message": "LLM stream failed"})
        except Exception as e:
            logger.error("Streaming error: %s", e)
            yield json.dumps({"type": "error", "message": str(e)})

    # -- Existing keyword routing (unchanged logic) ----------------------------

    def route_query(self, query: str, context: Dict[str, Any] = None) -> RouteResult:
        """
        Determine which module(s) should handle the query.

        Uses keyword matching, context awareness, and confidence scoring.
        """
        if context is None:
            context = {}
        query_lower = query.lower()
        words = set(re.findall(r"\b\w+\b", query_lower))

        scores: Dict[str, float] = {}
        matched_keywords: Dict[str, List[str]] = {}

        # Direct keyword boosts for high-signal terms
        direct_boosts = {
            "nsfas": ("education", 5.0),
            "paye": ("human_resources", 5.0),
            "uif": ("human_resources", 5.0),
            "cidb": ("tenders", 6.0),
            "cbbee": ("tenders", 4.0),
            "rfp": ("tenders", 4.0),
            "rfq": ("tenders", 4.0),
            "cipc": ("business", 4.0),
            "solar": ("energy", 4.0),
            "eskom": ("energy", 4.0),
            "load shedding": ("energy", 5.0),
            "medical aid": ("health", 4.0),
            "sars": ("taxation", 4.0),
            "vat": ("taxation", 4.0),
            "poPI": ("legal", 4.0),
            "contract": ("legal", 3.0),
            "mine": ("mining", 4.0),
            "mprda": ("mining", 5.0),
            "farming": ("agriculture", 4.0),
            "crop": ("agriculture", 3.0),
            "driving license": ("transport", 4.0),
            "construction": ("construction", 4.0),
            "ncc": ("construction", 4.0),
            "hacking": ("cybersecurity", 4.0),
            "iso 27001": ("cybersecurity", 5.0),
            "insurance": ("insurance", 4.0),
            "property": ("real_estate", 3.0),
            "bond": ("real_estate", 3.0),
            "loan": ("loans", 3.0),
            "grant": ("funding", 3.0),
            "sefa": ("funding", 4.0),
            "nef": ("funding", 4.0),
            "tender": ("tenders", 4.0),
            "university": ("education", 3.0),
            "company": ("business", 3.0),
            "tax": ("taxation", 3.0),
        }

        # Apply direct boosts
        for term, (cat, boost) in direct_boosts.items():
            if term.lower() in query_lower:
                scores[cat] = scores.get(cat, 0) + boost

        for category, meta in MODULE_REGISTRY.items():
            kw_list = meta.get("keywords", [])
            hits = [kw for kw in kw_list if kw.lower() in query_lower]
            if not hits:
                # Also check word-level overlap for shorter keywords
                kw_words = set()
                for kw in kw_list:
                    if len(kw) <= 6:
                        kw_words.add(kw.lower())
                hits = list(words & kw_words)

            if hits:
                # Score by hit count and keyword specificity
                base_score = len(hits) * 0.5
                specificity_bonus = sum(2.0 if len(h) > 7 else 1.0 for h in hits)
                scores[category] = scores.get(category, 0) + base_score + specificity_bonus
                matched_keywords[category] = hits

        if not scores:
            # Fallback: try context from previous turns
            history = context.get("history", [])
            if history:
                last_module = history[-1].get("module_called")
                if last_module:
                    for cat, meta in MODULE_REGISTRY.items():
                        if last_module in meta.get("modules", []):
                            return RouteResult(
                                category=cat,
                                modules=meta["modules"][:2],
                                confidence=0.25,
                                intent=IntentType.INFORMATION,
                                entities=self._extract_entities(query),
                                suggested_followups=[],
                            )
            # True fallback
            return RouteResult(
                category=QueryCategory.GENERAL.value,
                modules=MODULE_REGISTRY[QueryCategory.GENERAL.value]["modules"][:2],
                confidence=0.15,
                intent=IntentType.UNKNOWN,
                entities={"query": query},
                suggested_followups=["Can you tell me more about what LUQI AI can do?"],
            )

        # Pick best category
        best_category = max(scores, key=scores.get)
        best_meta = MODULE_REGISTRY[best_category]
        confidence = min(scores[best_category], 1.0)

        # Determine intent
        intent = self._classify_intent(query_lower)

        # Extract entities
        entities = self._extract_entities(query)

        # Build follow-up suggestions
        followups = self._generate_followups(best_category, intent, entities)

        # Select modules (use top 2 unless high confidence, then top 1)
        selected_modules = best_meta["modules"][:1] if confidence > 0.8 else best_meta["modules"][:2]

        return RouteResult(
            category=best_category,
            modules=selected_modules,
            confidence=confidence,
            intent=intent,
            entities=entities,
            suggested_followups=followups,
        )

    def detect_language(self, text: str) -> str:
        """Auto-detect language from text."""
        text_lower = text.lower().strip()
        lang_scores: Dict[str, int] = {}

        for lang_code, lang_name in LANGUAGE_MAP.items():
            patterns = GREETING_PATTERNS.get(lang_name, {})
            greetings = patterns.get("greetings", [])
            farewells = patterns.get("farewells", [])
            score = sum(3 for g in greetings if g in text_lower)
            score += sum(2 for f in farewells if f in text_lower)
            lang_scores[lang_name] = score

        # English detection: common words
        english_words = ["the", "and", "you", "what", "how", "when", "where", "why", "is", "are", "can", "do", "does", "will", "would", "should", "could", "have", "has", "had", "my", "your", "this", "that", "me", "for", "with", "about", "from", "to"]
        eng_score = sum(1 for w in english_words if re.search(rf"\b{w}\b", text_lower))
        lang_scores["english"] = lang_scores.get("english", 0) + eng_score

        best = max(lang_scores, key=lang_scores.get)
        return best if lang_scores[best] > 0 else "english"

    def get_greeting(self, language: str = "english") -> str:
        """Return a culturally appropriate greeting."""
        lang = language.lower()
        patterns = GREETING_PATTERNS.get(lang, GREETING_PATTERNS["english"])
        return random.choice(patterns["responses"])

    def get_module_help(self, module_name: str) -> Dict[str, Any]:
        """Get information about what a module can do."""
        adapter = self._module_adapters.get(module_name)
        if adapter:
            return {
                "module": module_name,
                "help": adapter.get_help(),
                "status": "loaded" if adapter.loaded else "unavailable",
                "call_count": adapter.call_count,
            }
        # Try to find in registry
        for cat, meta in MODULE_REGISTRY.items():
            if module_name in meta.get("modules", []):
                return {
                    "module": module_name,
                    "category": cat,
                    "description": meta.get("description", ""),
                    "examples": meta.get("examples", []),
                    "status": "registered",
                }
        return {"module": module_name, "status": "not_found", "message": "Module not found in registry."}

    def get_status(self) -> Dict[str, Any]:
        """Return brain health and loaded modules, including LLM status."""
        uptime = time.time() - self._start_time
        total_modules = len(self._module_adapters)
        loaded_modules = sum(1 for a in self._module_adapters.values() if a.loaded)
        active_sessions = len(self._conversations)

        return {
            "status": "healthy",
            "version": "2.2.0",
            "uptime_seconds": round(uptime, 1),
            "total_modules": total_modules,
            "loaded_modules": loaded_modules,
            "module_load_rate": round(loaded_modules / total_modules, 3) if total_modules else 0,
            "active_sessions": active_sessions,
            "total_queries_processed": self._total_queries,
            "category_distribution": dict(self._category_hits),
            "supported_languages": list(LANGUAGE_MAP.values()),
            "supported_categories": list(MODULE_REGISTRY.keys()),
            "llm_active": self.llm.is_available(),
            "llm_model": "gpt-4o-mini" if self.llm.is_available() else None,
            "timestamp": datetime.now().isoformat(),
        }

    def list_capabilities(self) -> List[Dict[str, Any]]:
        """Return all available capabilities with descriptions."""
        capabilities = []
        for category, meta in MODULE_REGISTRY.items():
            capabilities.append({
                "category": category,
                "description": meta.get("description", ""),
                "modules": meta.get("modules", []),
                "keyword_count": len(meta.get("keywords", [])),
                "examples": meta.get("examples", []),
            })
        return capabilities

    def format_response(
        self,
        module_results: List[Dict[str, Any]],
        route: RouteResult,
        language: str = "english",
    ) -> str:
        """
        Convert module data into natural, conversational responses.
        """
        if not module_results:
            return self._translate_if_needed(
                "I'm not sure I understood that. Could you rephrase or tell me more about what you need?",
                language,
            )

        parts: List[str] = []
        primary = module_results[0]
        result_data = primary.get("result", {})

        # Format based on intent
        if route.intent == IntentType.CALCULATION:
            parts.append(self._format_calculation(result_data, route))
        elif route.intent == IntentType.APPLICATION:
            parts.append(self._format_application(result_data, route))
        elif route.intent == IntentType.COMPARISON:
            parts.append(self._format_comparison(result_data, route))
        else:
            parts.append(self._format_information(result_data, route))

        # Add follow-up suggestion
        if route.suggested_followups:
            parts.append(f"\n**You might also want to ask:**\n- " + "\n- ".join(route.suggested_followups[:3]))

        response = "\n\n".join(parts)
        return self._translate_if_needed(response, language)

    def load_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Load or create a user profile."""
        if user_id in self._user_profiles:
            return self._user_profiles[user_id]
        return None

    def create_user_profile(
        self,
        user_id: str,
        location: Optional[str] = None,
        industry: Optional[str] = None,
        interests: Optional[List[str]] = None,
        language: str = "english",
    ) -> UserProfile:
        """Create a new user profile."""
        profile = UserProfile(
            user_id=user_id,
            location=location,
            industry=industry,
            interests=interests or [],
            preferred_language=language,
        )
        self._user_profiles[user_id] = profile
        return profile

    def get_conversation_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieve conversation history for a session."""
        turns = self._conversations.get(session_id, [])
        return [
            {
                "role": t.role,
                "content": t.content,
                "timestamp": t.timestamp,
                "module_called": t.module_called,
                "language": t.language,
            }
            for t in turns
        ]

    def clear_conversation(self, session_id: str) -> bool:
        """Clear a conversation session."""
        if session_id in self._conversations:
            self._conversations[session_id] = []
            self._session_meta[session_id] = {"cleared_at": time.time()}
            return True
        return False

    # -- Internal Helpers ------------------------------------------------------

    def _ensure_session(self, session_id: str) -> None:
        if session_id not in self._conversations:
            self._conversations[session_id] = []
            self._session_meta[session_id] = {"created_at": time.time()}

    def _add_turn(
        self,
        session_id: str,
        role: str,
        content: str,
        module_called: Optional[str] = None,
        language: str = "english",
    ) -> None:
        turn = ConversationTurn(
            role=role,
            content=content,
            module_called=module_called,
            language=language,
        )
        self._conversations[session_id].append(turn)
        # Trim history
        if len(self._conversations[session_id]) > MAX_HISTORY_PER_SESSION:
            self._conversations[session_id] = self._conversations[session_id][-MAX_HISTORY_PER_SESSION:]

    def _get_recent_history(self, session_id: str, n: int = 5) -> List[Dict[str, Any]]:
        turns = self._conversations.get(session_id, [])[-n:]
        return [{"role": t.role, "content": t.content, "module_called": t.module_called} for t in turns]

    def _check_shortcuts(self, query_lower: str, language: str) -> Optional[str]:
        """Check for greeting, farewell, or help shortcuts."""
        patterns = GREETING_PATTERNS.get(language, GREETING_PATTERNS["english"])

        if any(g in query_lower for g in patterns["greetings"]):
            return random.choice(patterns["responses"])

        if any(f in query_lower for f in patterns.get("farewells", [])):
            return random.choice(patterns.get("farewell_responses", ["Goodbye!"]))

        help_queries = [
            "what can you do", "help", "capabilities", "features",
            "what do you know", "how do you work", "menu", "options",
        ]
        if any(h in query_lower for h in help_queries):
            caps = self.list_capabilities()
            lines = ["Here's what I can help you with:"]
            for cap in caps[:10]:
                lines.append(f"  **{cap['category'].capitalize()}** — {cap['description'][:80]}")
            lines.append(f"\n...and {len(caps) - 10} more categories. Just ask me anything!")
            return "\n".join(lines)

        status_queries = ["status", "health", "are you working", "system status"]
        if any(s in query_lower for s in status_queries):
            st = self.get_status()
            llm_status = "ACTIVE" if st.get('llm_active') else "OFFLINE"
            return (
                f"LUQI AI Brain Status: **{st['status'].upper()}**\n"
                f"- Mode: **{llm_status}** (GPT-4o-mini via OpenAI)\n"
                f"- Modules loaded: {st['loaded_modules']}/{st['total_modules']}\n"
                f"- Active sessions: {st['active_sessions']}\n"
                f"- Queries processed: {st['total_queries_processed']}\n"
                f"- Uptime: {round(st['uptime_seconds'] / 60, 1)} minutes\n"
                f"- Version: {st['version']}"
            )

        return None

    def _classify_intent(self, query_lower: str) -> IntentType:
        if any(w in query_lower for w in ["calculate", "compute", "how much", "what is", "value", "amount", "cost", "price", "rate", "emi", "repayment", "paye", "tax"]):
            if any(w in query_lower for w in ["how much", "cost", "price", "value", "amount", "emi", "repayment", "paye", "calculate"]):
                return IntentType.CALCULATION
        if any(w in query_lower for w in ["apply", "register", "submit", "form", "document", "how do i", "how to", "process", "step", "procedure"]):
            return IntentType.APPLICATION
        if any(w in query_lower for w in ["compare", "versus", "vs", "difference", "better", "best", "cheaper"]):
            return IntentType.COMPARISON
        if any(w in query_lower for w in ["find", "where", "location", "near me", "nearest", "directions"]):
            return IntentType.NAVIGATION
        return IntentType.INFORMATION

    def _extract_entities(self, query: str) -> Dict[str, Any]:
        entities: Dict[str, Any] = {"query": query}

        # Extract monetary amounts (R or $)
        money_pattern = r"[R$]\s*([\d\s,]+(?:\.\d{2})?)"
        matches = re.findall(money_pattern, query)
        if matches:
            clean = matches[0].replace(" ", "").replace(",", "")
            entities["amount"] = float(clean) if "." in clean else int(clean)

        # Extract salary (for PAYE)
        salary_match = re.search(r"earn\s+[R$]?\s*([\d,]+)\s*/?\s*(month|year|annum|p\.?a\.?)", query, re.IGNORECASE)
        if salary_match:
            val = float(salary_match.group(1).replace(",", ""))
            period = salary_match.group(2).lower()
            if "year" in period or "annum" in period or "p.a" in period:
                val = val / 12
            entities["salary"] = round(val, 2)

        # Extract percentages
        pct_match = re.search(r"(\d+(?:\.\d+)?)\s*%", query)
        if pct_match:
            entities["percentage"] = float(pct_match.group(1))

        # Extract tender type
        tender_types = ["rfp", "rfq", "bid", "tender", "proposal"]
        for tt in tender_types:
            if tt in query.lower():
                entities["tender_type"] = tt.upper()
                break

        # Extract sector/industry
        sectors = ["construction", "it", "technology", "agriculture", "mining", "healthcare", "retail", "manufacturing", "tourism", "transport", "education", "energy"]
        for sec in sectors:
            if sec in query.lower():
                entities["sector"] = sec
                break

        # Extract numeric values (generic)
        num_matches = re.findall(r"\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|thousand|k|billion|B)?\b", query, re.IGNORECASE)
        if num_matches:
            val_str, multiplier = num_matches[0]
            val = float(val_str.replace(",", ""))
            if multiplier:
                mult_lower = multiplier.lower()
                if mult_lower in ("million", "m"):
                    val *= 1_000_000
                elif mult_lower in ("thousand", "k"):
                    val *= 1_000
                elif mult_lower in ("billion", "b"):
                    val *= 1_000_000_000
            entities["value"] = round(val, 2)

        # Extract property value for bonds
        prop_match = re.search(r"(?:property|house|home)\s+(?:worth|valued at|cost|price)\s+[R$]?\s*([\d,]+)", query, re.IGNORECASE)
        if prop_match:
            entities["property_value"] = float(prop_match.group(1).replace(",", ""))

        # Extract interest rate
        rate_match = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:interest|rate)", query, re.IGNORECASE)
        if rate_match:
            entities["interest_rate"] = float(rate_match.group(1))

        return entities

    def _pick_method(self, module_name: str, route: RouteResult) -> str:
        """Pick the best method to call on a module."""
        method_map = {
            "hr_payroll": "calculate_payee",
            "finance_data": "compare_rates",
            "loan_calculator": "calculate_bond",
            "tender_assistant": "generate_checklist",
            "funding_assistant": "check_eligibility",
            "university_guide": "get_nsfas_info",
            "nsfas_assistant": "get_nsfas_info",
            "health_advisor": "compare_medical_aids",
            "medical_aid_comparator": "compare_medical_aids",
            "business_registrar": "register_company",
            "business_plan_generator": "generate_plan",
            "tax_calculator": "calculate_tax",
            "sars_efiler": "get_filing_status",
            "cidb_lookup": "get_grade",
            "cbbee_calculator": "calculate_score",
            "agri_advisor": "get_crop_advice",
            "construction_planner": "estimate_project",
            "energy_advisor": "calculate_solar",
            "security_auditor": "run_audit",
            "legal_assistant": "get_legal_advice",
            "insurance_comparator": "compare_quotes",
            "property_valuer": "estimate_value",
            "general_assistant": "answer",
            "calculator": "compute",
        }
        return method_map.get(module_name, "process")

    def _format_calculation(self, data: Dict[str, Any], route: RouteResult) -> str:
        lines = []
        if "paye_monthly" in data:
            lines.append(
                f"Based on a gross monthly salary of **R{data['gross_monthly']:,.2f}**:\n\n"
                f"| Component | Amount |\n"
                f"|-----------|--------|\n"
                f"| Gross Monthly | R{data['gross_monthly']:,.2f} |\n"
                f"| PAYE | R{data['paye_monthly']:,.2f} |\n"
                f"| UIF | R{data['uif_monthly']:,.2f} |\n"
                f"| **Net Monthly** | **R{data['net_monthly']:,.2f}** |\n\n"
                f"Tax year: {data.get('tax_year', '2024/2025')}. "
                f"Primary rebate applied."
            )
        elif "monthly_repayment" in data:
            lines.append(
                f"**Bond Calculation**:\n\n"
                f"| Detail | Value |\n"
                f"|--------|-------|\n"
                f"| Property Value | R{data.get('property_value', 0):,.2f} |\n"
                f"| Deposit | R{data.get('deposit', 0):,.2f} |\n"
                f"| Loan Amount | R{data.get('loan_amount', 0):,.2f} |\n"
                f"| Interest Rate | {data.get('interest_rate', 0)}% |\n"
                f"| Term | {data.get('term_years', 20)} years |\n"
                f"| **Monthly Repayment** | **R{data['monthly_repayment']:,.2f}** |\n"
                f"| Total Interest | R{data.get('total_interest', 0):,.2f} |"
            )
        else:
            lines.append(f"Here's the result of your calculation:")
            for k, v in data.items():
                if not k.startswith("_"):
                    lines.append(f"- **{k.replace('_', ' ').title()}**: {v}")
        return "\n".join(lines)

    def _format_application(self, data: Dict[str, Any], route: RouteResult) -> str:
        lines = ["Here's what you need to do:"]
        if "steps" in data:
            for i, step in enumerate(data["steps"], 1):
                lines.append(f"{i}. {step}")
        elif "checklist" in data:
            for i, item in enumerate(data["checklist"], 1):
                lines.append(f"{i}. {item}")
        else:
            for k, v in data.items():
                if not k.startswith("_") and k != "message":
                    lines.append(f"- **{k.replace('_', ' ').title()}**: {v}")

        if "estimated_cost" in data:
            lines.append(f"\n**Estimated cost:** R{data['estimated_cost']}")
        if "estimated_time_days" in data:
            lines.append(f"**Estimated time:** {data['estimated_time_days']} days")
        if "next_steps" in data:
            lines.append(f"\n**Next steps:** {data['next_steps']}")

        return "\n".join(lines)

    def _format_comparison(self, data: Dict[str, Any], route: RouteResult) -> str:
        if "plans" in data:
            lines = ["Here's a comparison of available options:", ""]
            for plan in data["plans"]:
                lines.append(f"**{plan.get('name', 'Plan')}** — R{plan.get('monthly', 'N/A')}/month")
                for k, v in plan.items():
                    if k != "name":
                        lines.append(f"  - {k.capitalize()}: {v}")
                lines.append("")
            if "note" in data:
                lines.append(f"*{data['note']}*")
            return "\n".join(lines)
        return "Comparison data available."

    def _format_information(self, data: Dict[str, Any], route: RouteResult) -> str:
        if isinstance(data, dict):
            if "message" in data and len(data) == 2:
                return data["message"]
            lines = []
            for k, v in data.items():
                if k.startswith("_"):
                    continue
                if isinstance(v, list):
                    lines.append(f"**{k.replace('_', ' ').title()}:**")
                    for item in v:
                        lines.append(f"  - {item}")
                elif isinstance(v, dict):
                    lines.append(f"**{k.replace('_', ' ').title()}:**")
                    for sk, sv in v.items():
                        lines.append(f"  - {sk}: {sv}")
                else:
                    lines.append(f"**{k.replace('_', ' ').title()}:** {v}")
            return "\n".join(lines)
        return str(data)

    def _generate_followups(self, category: str, intent: IntentType, entities: Dict[str, Any]) -> List[str]:
        followups_map = {
            QueryCategory.EDUCATION.value: [
                "What documents do I need for NSFAS?",
                "When is the NSFAS application deadline?",
                "Which universities offer data science?",
            ],
            QueryCategory.TENDERS.value: [
                "What is my CIDB grade?",
                "How do I improve my B-BBEE score?",
                "Find construction tenders in my area",
            ],
            QueryCategory.FINANCE.value: [
                "Compare fixed deposit rates",
                "Should I invest in a TFSA?",
                "What is the prime interest rate?",
            ],
            QueryCategory.HUMAN_RESOURCES.value: [
                "What is the minimum wage?",
                "How do I calculate UIF?",
                "CCMA referral process",
            ],
            QueryCategory.HEALTH.value: [
                "Compare medical aid plans",
                "What is NHI?",
                "Find clinics near me",
            ],
            QueryCategory.BUSINESS.value: [
                "Register a new company",
                "How do I get a tax clearance?",
                "Write a business plan",
            ],
            QueryCategory.LEGAL.value: [
                "What does POPIA require?",
                "Review a lease agreement",
                "Labour law basics",
            ],
            QueryCategory.TAXATION.value: [
                "How do I file my tax return?",
                "Calculate VAT on R2,400",
                "What is provisional tax?",
            ],
            QueryCategory.REAL_ESTATE.value: [
                "Estimate my property value",
                "Sectional title rules",
                "Transfer duty calculation",
            ],
            QueryCategory.ENERGY.value: [
                "Calculate solar system size",
                "Load shedding schedule today",
                "Compare inverter prices",
            ],
            QueryCategory.CONSTRUCTION.value: [
                "Estimate cost for house extension",
                "NCC compliance checklist",
                "Find a quantity surveyor",
            ],
        }
        return followups_map.get(category, [
            "Tell me more",
            "What are the requirements?",
            "How long does it take?",
        ])[:3]

    def _get_suggestions(self, category: str) -> List[str]:
        meta = MODULE_REGISTRY.get(category, {})
        return meta.get("examples", ["How can you help me?", "What can you do?"])

    def _translate_if_needed(self, text: str, language: str) -> str:
        """Simple phrase-based translation for supported languages."""
        if language == "english":
            return text
        # For demo purposes, return text with a language note
        # In production, this calls a translation service
        phrase_map = {
            "zulu": {
                "Here's what you need to do:": "Nansi okudingeka uyenze:",
                "I'm not sure I understood that.": "Angiqinisekile ukuthi ngikuqondayile lokho.",
            },
            "xhosa": {
                "Here's what you need to do:": "Nantsi into okufuneka uyenze:",
                "I'm not sure I understood that.": "Andiqinisekanga ukuba ndiyakuqonda oko.",
            },
            "afrikaans": {
                "Here's what you need to do:": "Hier is wat jy moet doen:",
                "I'm not sure I understood that.": "Ek is nie seker ek het dit verstaan nie.",
            },
        }
        translated = text
        for eng, trans in phrase_map.get(language, {}).items():
            translated = translated.replace(eng, trans)
        return translated


# ---------------------------------------------------------------------------
# Factory / singleton helper
# ---------------------------------------------------------------------------

_brain_instance: Optional[AIBrain] = None


def get_brain() -> AIBrain:
    """Return the singleton AIBrain instance."""
    global _brain_instance
    if _brain_instance is None:
        _brain_instance = AIBrain()
    return _brain_instance


def reset_brain() -> None:
    """Reset the singleton brain instance."""
    global _brain_instance
    _brain_instance = None


# ---------------------------------------------------------------------------
# CLI / standalone execution
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    brain = get_brain()
    print("=" * 60)
    print("LUQI AI Brain v2.2.0 — Interactive Demo")
    print(f"LLM Status: {'ACTIVE (GPT-4o-mini)' if brain.llm.is_available() else 'OFFLINE (keyword routing)'}")
    print("=" * 60)
    print(f"\nLoaded {len(brain.list_capabilities())} capability categories")
    print(f"Total modules: {len(brain._module_adapters)}")
    print(f"Available tools for LLM: {len(TOOLS)}")
    print("Type 'exit' to quit, 'status' for system status.\n")

    session = f"demo_{int(time.time())}"

    # Demo queries
    demo_queries = [
        "Hello!",
        "How do I apply for NSFAS?",
        "Calculate my PAYE if I earn R45,000 per month",
        "What tender documents do I need for construction RFP worth R500,000?",
        "Compare medical aid plans",
        "How do I register a new company?",
        "What is the status?",
    ]

    for q in demo_queries:
        print(f"You: {q}")
        resp = brain.process_message(q, session_id=session, language="auto")
        print(f"LUQI: {resp['response'][:200]}...")
        print(f"      [category={resp['category']}, confidence={resp['confidence']}, lang={resp['language']}, mode={resp.get('mode', 'unknown')}]\n")

    # Interactive mode
    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input or user_input.lower() in ("exit", "quit"):
                break
            if user_input.lower() == "status":
                import pprint
                pprint.pprint(brain.get_status())
                continue
            resp = brain.process_message(user_input, session_id=session, language="auto")
            print(f"LUQI: {resp['response']}\n")
            print(f"      [mode={resp.get('mode', 'unknown')}, llm_active={resp.get('llm_active', False)}]\n")
        except (EOFError, KeyboardInterrupt):
            break

    print("\nGoodbye! LUQI AI Brain shutting down.")
