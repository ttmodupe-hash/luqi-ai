#!/usr/bin/env python3
"""Luqi AI Government Services Module — Provincial and municipal services
for Gauteng and South African citizens. Service guides, document checklists,
contact directories, and step-by-step application processes.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
#  SERVICE DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

# Provincial services (Gauteng)
GAUTENG_SERVICES = {
    "health": {
        "name": "Gauteng Health Services",
        "services": [
            {"name": "Hospital Services", "description": "Access to provincial hospitals and clinics", "requirements": ["South African ID", "Proof of residence"], "locations": ["Charlotte Maxeke", "Chris Hani Baragwanath", "Steve Biko Academic"]},
            {"name": "Emergency Medical Services", "description": "Ambulance and emergency response", "contact": "10177 or 112", "response_time": "Urban: 15-20 min, Rural: 30-45 min"},
            {"name": "Mental Health Services", "description": "Counseling and psychiatric care", "locations": ["Tara Hospital", "Weskoppies Hospital"]},
        ],
    },
    "education": {
        "name": "Gauteng Education",
        "services": [
            {"name": "School Admissions", "description": "Online admissions for grades 1 and 8", "website": "www.gdeadmissions.gov.za", "period": "Annual application window (May-June)"},
            {"name": "Bursaries and Funding", "description": "Financial aid for qualifying students", "requirements": ["Academic results", "Financial proof", "SA citizenship"]},
            {"name": "Special Needs Education", "description": "Support for learners with disabilities", "contact": "GDE Specialised Education"},
        ],
    },
    "housing": {
        "name": "Gauteng Human Settlements",
        "services": [
            {"name": "RDP Housing", "description": "Subsidized housing for low-income families", "requirements": ["SA citizen 18+", "Married/cohabiting/single with dependents", "Income below R3,500/month", "First-time homeowner"], "waiting_time": "5-10 years"},
            {"name": "GAP Housing", "description": "Housing for income earners R3,501-R22,000/month", "requirements": ["Proof of income", "ID document"]},
            {"name": "Title Deeds", "description": "Application for title deed registration", "process": "Visit local municipality with ID and proof of residence"},
        ],
    },
    "transport": {
        "name": "Gauteng Transport",
        "services": [
            {"name": "Driver's License", "description": "Renewal and application", "requirements": ["ID", "Eye test", "Proof of residence"], "fees": {"learners": "R108", "license": "R228"}},
            {"name": "Vehicle Registration", "description": "Register and license your vehicle", "requirements": ["ID", "Roadworthy certificate", "Proof of address"]},
            {"name": "e-Toll", "description": "Gauteng freeway improvement project tolls", "status": "Currently suspended", "alternative": "Fuel levy funding"},
        ],
    },
    "social_development": {
        "name": "Social Development",
        "services": [
            {"name": "Child Support Grant", "description": "R510/month per child under 18", "requirements": ["SA citizen/permanent resident", "Income threshold", "Child birth certificate"]},
            {"name": "Old Age Grant", "description": "R2,090/month for citizens 60+", "requirements": ["SA citizen/permanent resident", "Age 60+", "Income threshold"]},
            {"name": "Disability Grant", "description": "R2,090/month for disabled citizens", "requirements": ["Medical assessment", "Age 18-59", "Income threshold"]},
        ],
    },
    "economic_development": {
        "name": "Economic Development",
        "services": [
            {"name": "SMME Support", "description": "Funding and mentorship for small businesses", "contact": "The Innovation Hub, Riversands"},
            {"name": "Job Creation Programs", "description": "Tshepo 500K and other youth programs", "target": "Unemployed youth 18-35"},
        ],
    },
}

# Municipal services
MUNICIPAL_SERVICES = {
    "city_of_johannesburg": {
        "name": "City of Johannesburg",
        "services": [
            {"name": "Utility Accounts", "description": "Rates, water, and electricity accounts", "contact": "0860 562 874", "website": "www.joburg.org.za"},
            {"name": "Waste Collection", "description": "Residential refuse removal", "schedule": "Weekly per suburb", "contact": "011 375 5555"},
            {"name": "Building Plans", "description": "Submit and track building plan approvals", "process": "Online via e-Joburg or in-person", "timeline": "30-90 days"},
            {"name": "Property Rates", "description": "Rates rebates and queries", "requirements": ["ID", "Proof of residence", "Income proof for rebates"]},
        ],
    },
    "city_of_tshwane": {
        "name": "City of Tshwane (Pretoria)",
        "services": [
            {"name": "Utility Accounts", "description": "Rates, water, and electricity", "contact": "012 358 9999", "website": "www.tshwane.gov.za"},
            {"name": "Pothole Reporting", "description": "Report road defects", "contact": "012 358 9999", "app": "Tshwane 311"},
            {"name": "Municipal Courts", "description": "Traffic fines and municipal by-law violations", "locations": ["Centurion", "Pretoria CBD"]},
        ],
    },
    "ekurhuleni": {
        "name": "Ekurhuleni (East Rand)",
        "services": [
            {"name": "Utility Accounts", "description": "Rates, water, and electricity", "contact": "0860 543 000", "website": "www.ekurhuleni.gov.za"},
            {"name": "Business Licensing", "description": "Trade and liquor licenses", "requirements": ["ID", "Company docs", "Zoning certificate"]},
        ],
    },
    "sedibeng": {
        "name": "Sedibeng (Vereeniging/Vanderbijlpark)",
        "services": [
            {"name": "Utility Accounts", "description": "Rates, water, and electricity", "contact": "016 450 1111"},
        ],
    },
    "mogale_city": {
        "name": "Mogale City (Krugersdorp)",
        "services": [
            {"name": "Utility Accounts", "description": "Rates, water, and electricity", "contact": "011 951 2000"},
        ],
    },
}

# National services
NATIONAL_SERVICES = {
    "home_affairs": {
        "name": "Department of Home Affairs",
        "services": [
            {"name": "Smart ID Card", "description": "Apply for or renew smart ID", "requirements": ["Biometrics capture", "R140 fee", "Booking required"], "branches": ["Banking partners (FNB, Nedbank)", "Home Affairs offices"]},
            {"name": "Passport", "description": "Apply for or renew passport", "requirements": ["ID document", "Photos", "R600 (adult) / R400 (child)"], "processing": "7-21 working days"},
            {"name": "Birth Certificate", "description": "Register a birth or request certificate", "timeframe": "Register within 30 days of birth", "fee": "Free if within 30 days, R75 after"},
            {"name": "Marriage Certificate", "description": "Register marriage or request certificate", "process": "Book marriage officer, register within 3 months"},
        ],
    },
    "sars": {
        "name": "SARS (South African Revenue Service)",
        "services": [
            {"name": "Income Tax", "description": "Register and file tax returns", "deadline": "Annual (usually July-November)", "website": "www.sars.gov.za"},
            {"name": "VAT Registration", "description": "Register for VAT if turnover exceeds R1 million", "process": "Online via eFiling"},
            {"name": "Tax Clearance", "description": "Request tax clearance certificate", "process": "Via eFiling or SARS branch"},
        ],
    },
    "companies": {
        "name": "CIPC (Companies and Intellectual Property Commission)",
        "services": [
            {"name": "Company Registration", "description": "Register a new company", "requirements": ["ID copies", "Name reservation (R50)", "Registration fee (R125)"], "timeline": "3-21 days", "website": "www.cipc.co.za"},
            {"name": "Annual Returns", "description": "File annual returns", "penalty": "R50 late filing fee"},
        ],
    },
    "labour": {
        "name": "Department of Labour",
        "services": [
            {"name": "UIF (Unemployment Insurance)", "description": "Register and claim UIF benefits", "requirements": ["Employment history", "UI-19 form", "Bank details"]},
            {"name": "CCMA", "description": "Labour dispute resolution", "contact": "011 377 6650", "timeframe": "Refer within 30 days of dispute"},
            {"name": "Workman's Compensation", "description": "Claim for workplace injuries", "process": "Report to employer, file with Compensation Fund"},
        ],
    },
    "health_national": {
        "name": "National Department of Health",
        "services": [
            {"name": "Vaccination", "description": "National immunisation programme", "schedule": "Available at public clinics, free"},
            {"name": "Chronic Medication", "description": "Access to chronic meds at public facilities", "requirements": ["ID", "Diagnosis from public hospital"]},
        ],
    },
    "education_national": {
        "name": "Department of Basic Education",
        "services": [
            {"name": "Matric Rewrite", "description": "Second chance programme", "when": "May/June and October/November exams"},
            {"name": "School Curriculum", "description": "CAPS curriculum information", "website": "www.education.gov.za"},
        ],
    },
    "justice": {
        "name": "Department of Justice",
        "services": [
            {"name": "Small Claims Court", "description": "Claims up to R20,000", "requirements": ["Letter of demand first", "R100 filing fee"]},
            {"name": "Maintenance Court", "description": "Child and spousal maintenance", "process": "Apply at magistrate's court, financial enquiry"},
            {"name": "Protection Order", "description": "Domestic violence protection", "process": "Apply at magistrate's court, same day order possible"},
        ],
    },
}

# Step-by-step guides
STEP_GUIDES = {
    "register_business": {
        "title": "How to Register a Business in South Africa",
        "steps": [
            "Reserve a company name with CIPC (R50, online)",
            "Register the company (R125, online via bizportal.gov.za)",
            "Register for tax with SARS (free, online)",
            "Open a business bank account",
            "Register for UIF and Workman's Compensation (if employing)",
            "Apply for relevant licenses/permits",
        ],
        "timeline": "1-3 weeks",
        "total_cost": "~R175+",
    },
    "apply_grant": {
        "title": "How to Apply for a Government Grant",
        "steps": [
            "Determine which grant you qualify for",
            "Gather required documents (ID, proof of income, birth certificates)",
            "Visit nearest SASSA office or apply online",
            "Complete application form",
            "Submit supporting documents",
            "Wait for verification (up to 3 months)",
            "Receive payment notification",
        ],
        "timeline": "1-3 months",
    },
    "get_drivers_license": {
        "title": "How to Get a Driver's License",
        "steps": [
            "Book learner's license test at DLTC (R108)",
            "Study K53 rules of the road",
            "Pass learner's test (vision + rules)",
            "Book driver's license test (R228)",
            "Practice driving with licensed driver",
            "Pass yard test and road test",
            "Collect license card (within 2-6 weeks)",
        ],
        "timeline": "2-6 months",
        "tips": ["Book early - slots fill up", "Practice parallel parking extensively"],
    },
    "register_property": {
        "title": "Property Registration Process",
        "steps": [
            "Sign offer to purchase",
            "Apply for home loan (if needed)",
            "Conveyancer handles transfer",
            "Pay transfer duty (or VAT for new developments)",
            "Rates clearance from municipality",
            "Registration at Deeds Office",
            "Transfer of ownership",
        ],
        "timeline": "2-3 months",
        "costs": ["Transfer duty (0-13% of value)", "Conveyancing fees", "Deeds Office fees", "Rates clearance"],
    },
}

# Contact directory
CONTACTS = {
    "police": {"emergency": "10111", "non_emergency": "08600 10111"},
    "ambulance": {"emergency": "10177", "cell": "112"},
    "fire": {"emergency": "10177", " Joburg": "011 375 5911"},
    "electricity": {"Joburg": "011 375 5555", "Tshwane": "012 358 9999", "Ekurhuleni": "0860 543 000"},
    "water": {"Joburg": "011 375 5555", "Tshwane": "012 358 9999"},
    "home_affairs": {"call_center": "0800 601 190", "website": "www.dha.gov.za"},
    "sars": {"call_center": "0800 00 7277", "website": "www.sars.gov.za"},
    "sassa": {"call_center": "0800 60 10 11", "website": "www.sassa.gov.za"},
    "cipc": {"call_center": "0861 000 624", "website": "www.cipc.co.za"},
    "ccma": {"call_center": "011 377 6650", "website": "www.ccma.org.za"},
    "public_protector": {"call_center": "012 366 7000", "website": "www.pprotect.org"},
    "nwasa": {"call_center": "0860 140 140", "name": "National Water and Sanitation"},
    "eskom": {"faults": "0860 037 566", "loadshedding": "www.eskom.co.za"},
}


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def list_gauteng_services() -> Dict[str, Any]:
    """List all Gauteng provincial services."""
    return {
        "status": "success",
        "province": "Gauteng",
        "total_categories": len(GAUTENG_SERVICES),
        "categories": [{"id": k, "name": v["name"], "service_count": len(v["services"])} for k, v in GAUTENG_SERVICES.items()],
    }


def get_gauteng_service(category: str) -> Dict[str, Any]:
    """Get a specific Gauteng service category."""
    if category not in GAUTENG_SERVICES:
        return {"status": "not_found", "available": list(GAUTENG_SERVICES.keys())}
    return {"status": "success", **GAUTENG_SERVICES[category]}


def list_municipalities() -> Dict[str, Any]:
    """List all municipalities."""
    return {
        "status": "success",
        "total": len(MUNICIPAL_SERVICES),
        "municipalities": [{"id": k, "name": v["name"]} for k, v in MUNICIPAL_SERVICES.items()],
    }


def get_municipal_services(municipality: str) -> Dict[str, Any]:
    """Get services for a specific municipality."""
    if municipality not in MUNICIPAL_SERVICES:
        return {"status": "not_found", "available": list(MUNICIPAL_SERVICES.keys())}
    return {"status": "success", **MUNICIPAL_SERVICES[municipality]}


def list_national_services() -> Dict[str, Any]:
    """List all national government services."""
    return {
        "status": "success",
        "total_departments": len(NATIONAL_SERVICES),
        "departments": [{"id": k, "name": v["name"], "service_count": len(v["services"])} for k, v in NATIONAL_SERVICES.items()],
    }


def get_national_service(department: str) -> Dict[str, Any]:
    """Get a specific national department's services."""
    if department not in NATIONAL_SERVICES:
        return {"status": "not_found", "available": list(NATIONAL_SERVICES.keys())}
    return {"status": "success", **NATIONAL_SERVICES[department]}


def get_step_guide(guide_id: str) -> Dict[str, Any]:
    """Get a step-by-step guide."""
    if guide_id not in STEP_GUIDES:
        return {"status": "not_found", "available": list(STEP_GUIDES.keys())}
    return {"status": "success", **STEP_GUIDES[guide_id]}


def search_services(query: str) -> Dict[str, Any]:
    """Search across all services."""
    results = []
    q = query.lower()

    # Search Gauteng services
    for cat_id, cat in GAUTENG_SERVICES.items():
        for svc in cat["services"]:
            if q in svc["name"].lower() or q in svc["description"].lower():
                results.append({"level": "provincial", "category": cat["name"], "service": svc["name"]})

    # Search municipal services
    for mun_id, mun in MUNICIPAL_SERVICES.items():
        for svc in mun["services"]:
            if q in svc["name"].lower() or q in svc["description"].lower():
                results.append({"level": "municipal", "municipality": mun["name"], "service": svc["name"]})

    # Search national services
    for dept_id, dept in NATIONAL_SERVICES.items():
        for svc in dept["services"]:
            if q in svc["name"].lower() or q in svc["description"].lower():
                results.append({"level": "national", "department": dept["name"], "service": svc["name"]})

    return {
        "status": "success",
        "query": query,
        "results_count": len(results),
        "results": results,
    }


def get_contact(directory: str = "") -> Dict[str, Any]:
    """Get government contact information."""
    if directory:
        if directory in CONTACTS:
            return {"status": "success", "service": directory, **CONTACTS[directory]}
        return {"status": "not_found", "available": list(CONTACTS.keys())}

    return {
        "status": "success",
        "emergency": {"police": "10111", "ambulance": "10177", "fire": "10177", "cell": "112"},
        "contacts": {k: v for k, v in CONTACTS.items()},
    }


def get_document_checklist(service: str) -> Dict[str, Any]:
    """Get document checklist for a service."""
    checklists = {
        "id_application": ["Birth certificate", "Proof of residence", "Passport photos", "Application fee"],
        "passport": ["ID document", "Passport photos", "Application fee (R600)", "Marriage certificate (if name change)"],
        "drivers_license": ["ID document", "Proof of residence", "Eye test", "Application fee"],
        "grant_application": ["ID document", "Proof of income", "Bank statements", "Birth certificates (for children)"],
        "business_registration": ["ID copy", "Company name reservation", "Registration fee", "Director details"],
        "property_transfer": ["ID copy", "Sale agreement", "Rates clearance", "Transfer duty receipt"],
    }

    if service not in checklists:
        return {"status": "not_found", "available": list(checklists.keys())}
    return {"status": "success", "service": service, "required_documents": checklists[service]}


def get_service_fees(service: str) -> Dict[str, Any]:
    """Get fee information for common services."""
    fees = {
        "id_smart_card": {"fee": "R140", "timeline": "4-8 weeks", "urgent": "Not available"},
        "passport_adult": {"fee": "R600", "timeline": "7-21 working days", "children": "R400"},
        "drivers_learners": {"fee": "R108", "valid_for": "2 years"},
        "drivers_license": {"fee": "R228", "valid_for": "5 years"},
        "company_registration": {"fee": "R125", "name_reservation": "R50", "timeline": "3-21 days"},
        "birth_certificate": {"fee": "Free (within 30 days), R75 (after)", "timeline": "Immediate to 6 weeks"},
    }

    if service not in fees:
        return {"status": "not_found", "available": list(fees.keys())}
    return {"status": "success", "service": service, **fees[service]}
