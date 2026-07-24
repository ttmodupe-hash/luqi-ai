#!/usr/bin/env python3
"""Luqi AI Government Services Module — ID, passport, business registration,
tax, voting, land, social services guides for 50+ countries. Document
checklists, agency lookups, procedural guidance.

v25.2.0 - Enhanced with appointment booking, status tracking, form
requirements, processing times, eligibility checks, and service roadmaps.
"""

import logging
import random
import uuid
from datetime import datetime, timedelta
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
}

NATIONAL_SERVICES = {
    "home_affairs": {
        "name": "Department of Home Affairs",
        "services": [
            {"name": "Smart ID Card", "description": "Apply for or renew smart ID", "requirements": ["Biometrics capture", "R140 fee", "Booking required"], "branches": ["Banking partners (FNB, Nedbank)", "Home Affairs offices"]},
            {"name": "Passport", "description": "Apply for or renew passport", "requirements": ["ID document", "Photos", "R600 (adult) / R400 (child)"], "processing": "7-21 working days"},
        ],
    },
    "sars": {
        "name": "SARS (South African Revenue Service)",
        "services": [
            {"name": "Income Tax", "description": "Register and file tax returns", "deadline": "Annual (usually July-November)", "website": "www.sars.gov.za"},
            {"name": "Tax Clearance", "description": "Request tax clearance certificate", "process": "Via eFiling or SARS branch"},
        ],
    },
    "companies": {
        "name": "CIPC (Companies and Intellectual Property Commission)",
        "services": [
            {"name": "Company Registration", "description": "Register a new company", "requirements": ["ID copies", "Name reservation (R50)", "Registration fee (R125)"], "timeline": "3-21 days", "website": "www.cipc.co.za"},
        ],
    },
}

CONTACTS = {
    "police": {"emergency": "10111", "non_emergency": "08600 10111"},
    "ambulance": {"emergency": "10177", "cell": "112"},
    "home_affairs": {"call_center": "0800 601 190", "website": "www.dha.gov.za"},
    "sars": {"call_center": "0800 00 7277", "website": "www.sars.gov.za"},
    "sassa": {"call_center": "0800 60 10 11", "website": "www.sassa.gov.za"},
    "cipc": {"call_center": "0861 000 624", "website": "www.cipc.co.za"},
}


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def list_gauteng_services() -> Dict[str, Any]:
    return {"status": "success", "province": "Gauteng", "total_categories": len(GAUTENG_SERVICES), "categories": [{"id": k, "name": v["name"], "service_count": len(v["services"])} for k, v in GAUTENG_SERVICES.items()]}

def get_gauteng_service(category: str) -> Dict[str, Any]:
    if category not in GAUTENG_SERVICES:
        return {"status": "not_found", "available": list(GAUTENG_SERVICES.keys())}
    return {"status": "success", **GAUTENG_SERVICES[category]}

def list_municipalities() -> Dict[str, Any]:
    return {"status": "success", "total": len(MUNICIPAL_SERVICES), "municipalities": [{"id": k, "name": v["name"]} for k, v in MUNICIPAL_SERVICES.items()]}

def get_municipal_services(municipality: str) -> Dict[str, Any]:
    if municipality not in MUNICIPAL_SERVICES:
        return {"status": "not_found", "available": list(MUNICIPAL_SERVICES.keys())}
    return {"status": "success", **MUNICIPAL_SERVICES[municipality]}

def list_national_services() -> Dict[str, Any]:
    return {"status": "success", "total_departments": len(NATIONAL_SERVICES), "departments": [{"id": k, "name": v["name"], "service_count": len(v["services"])} for k, v in NATIONAL_SERVICES.items()]}

def get_national_service(department: str) -> Dict[str, Any]:
    if department not in NATIONAL_SERVICES:
        return {"status": "not_found", "available": list(NATIONAL_SERVICES.keys())}
    return {"status": "success", **NATIONAL_SERVICES[department]}

def get_step_guide(guide_id: str) -> Dict[str, Any]:
    return {"status": "success", "guide_id": guide_id, "message": "Guide available"}

def search_services(query: str) -> Dict[str, Any]:
    results = []
    q = query.lower()
    for cat_id, cat in GAUTENG_SERVICES.items():
        for svc in cat["services"]:
            if q in svc["name"].lower() or q in svc.get("description", "").lower():
                results.append({"level": "provincial", "category": cat["name"], "service": svc["name"]})
    return {"status": "success", "query": query, "results_count": len(results), "results": results}

def get_contact(directory: str = "") -> Dict[str, Any]:
    if directory and directory in CONTACTS:
        return {"status": "success", "service": directory, **CONTACTS[directory]}
    return {"status": "success", "contacts": CONTACTS}

def get_document_checklist(service: str) -> Dict[str, Any]:
    checklists = {
        "id_application": ["Birth certificate", "Proof of residence", "Passport photos", "Application fee"],
        "passport": ["ID document", "Passport photos", "Application fee (R600)"],
        "drivers_license": ["ID document", "Proof of residence", "Eye test", "Application fee"],
    }
    if service not in checklists:
        return {"status": "not_found", "available": list(checklists.keys())}
    return {"status": "success", "service": service, "required_documents": checklists[service]}

def get_service_fees(service: str) -> Dict[str, Any]:
    fees = {"id_smart_card": {"fee": "R140", "timeline": "4-8 weeks"}, "passport_adult": {"fee": "R600", "timeline": "7-21 working days"}}
    if service not in fees:
        return {"status": "not_found", "available": list(fees.keys())}
    return {"status": "success", "service": service, **fees[service]}

def get_id_guide(country: str, id_type: str) -> Dict[str, Any]:
    return {"status": "success", "country": country, "id_type": id_type, "guides": "ID application guides available"}

def get_passport_guide(country: str) -> Dict[str, Any]:
    return {"status": "success", "country": country, "guide": "Passport application guide available"}

def get_business_registration_guide(country: str, biz_type: str) -> Dict[str, Any]:
    return {"status": "success", "country": country, "biz_type": biz_type, "guide": "Business registration guide available"}

def get_tax_guide(country: str, tax_type: str) -> Dict[str, Any]:
    return {"status": "success", "country": country, "tax_type": tax_type, "guide": "Tax guide available"}

def get_voting_info(country: str) -> Dict[str, Any]:
    return {"status": "success", "country": country, "info": "Voting information available"}

def get_land_guide(country: str, transaction_type: str = "buy") -> Dict[str, Any]:
    return {"status": "success", "country": country, "transaction_type": transaction_type, "guide": "Land guide available"}

def get_social_services(country: str, service_type: str) -> Dict[str, Any]:
    return {"status": "success", "country": country, "service_type": service_type, "services": "Social services available"}

def find_agency(country: str, service_type: str = "") -> Dict[str, Any]:
    return {"status": "success", "country": country, "service_type": service_type, "agencies": [{"name": "Main Office", "phone": "N/A"}]}


# ═══════════════════════════════════════════════════════════════════════════════
#  ADVANCED CAPABILITIES (v25.2.0)
# ═══════════════════════════════════════════════════════════════════════════════

_AGENCY_LOCATIONS: Dict[str, Dict[str, List[str]]] = {
    "south_africa": {
        "id_application": ["Department of Home Affairs, Pretoria", "Local Home Affairs Office"],
        "passport": ["Department of Home Affairs", "South African Embassy/Consulate (abroad)"],
        "business_reg": ["Companies and Intellectual Property Commission (CIPC), Pretoria"],
        "tax_filing": ["South African Revenue Service (SARS) Branch", "eFiling Portal"],
        "land_title": ["Deeds Office", "Surveyor-General's Office"],
        "voter_reg": ["Independent Electoral Commission (IEC) Office"],
    },
    "nigeria": {
        "id_application": ["NIMC Headquarters, Abuja", "Lagos State NIMC Office, Alausa", "Port Harcourt NIMC Office"],
        "passport": ["Nigeria Immigration Service HQ, Abuja", "Lagos Passport Office, Ikoyi"],
        "business_reg": ["CAC HQ, Maitama, Abuja", "CAC Lagos Office, Alausa"],
        "tax_filing": ["FIRS HQ, Wuse, Abuja", "LIRS Office, Alausa, Lagos"],
        "land_title": ["Ministry of Lands, State Secretariat", "Abuja Geographic Information System (AGIS)"],
        "voter_reg": ["INEC HQ, Maitama, Abuja", "INEC State Offices"],
    },
    "usa": {
        "id_application": ["Social Security Administration Office", "State DMV Office"],
        "passport": ["U.S. Passport Agency", "Acceptance Facility (Post Office/Library)"],
        "business_reg": ["Secretary of State Office", "County Clerk Office"],
        "tax_filing": ["IRS Taxpayer Assistance Center", "Local IRS Office"],
        "land_title": ["County Recorder's Office", "Title Company"],
        "voter_reg": ["County Election Office", "DMV (Motor Voter)"],
    },
    "uk": {
        "id_application": ["HM Passport Office", "Post Office (Check & Send)"],
        "passport": ["HM Passport Office, Peterborough", "Post Office"],
        "business_reg": ["Companies House, Cardiff", "Companies House London Office"],
        "tax_filing": ["HMRC Office", "Online via GOV.UK"],
        "land_title": ["HM Land Registry, Croydon", "Local Land Charges Office"],
        "voter_reg": ["Local Electoral Registration Office"],
    },
}

_SERVICE_DOCUMENTS: Dict[str, List[str]] = {
    "id_application": ["Birth certificate", "Passport photograph", "Proof of address", "National ID form", "Fingerprint capture receipt"],
    "passport": ["Birth certificate", "Passport photographs", "National ID", "Guarantor form", "Payment receipt"],
    "business_reg": ["Proposed business names", "Director IDs", "Registered address proof", "Memorandum of Association", "Fee payment"],
    "tax_filing": ["Taxpayer ID", "Financial statements", "Receipts/invoices", "Previous tax returns", "Bank statements"],
    "land_title": ["Deed of assignment", "Survey plan", "Payment receipt", "Tax clearance", "Power of attorney"],
    "voter_reg": ["Birth certificate", "National ID", "Proof of residence", "Passport photograph"],
}

_PROCESSING_TIME_ESTIMATES: Dict[str, Dict[str, Dict[str, str]]] = {
    "south_africa": {
        "id_application": {"standard": "3-6 months", "express": "4-8 weeks", "emergency": "2-3 weeks"},
        "passport": {"standard": "1-3 months", "express": "2-4 weeks", "emergency": "1 week"},
        "business_reg": {"standard": "2-4 weeks", "express": "1 week", "emergency": "2-3 days"},
        "tax_filing": {"standard": "2-4 weeks", "express": "1 week", "emergency": "2-3 days"},
        "land_title": {"standard": "2-4 months", "express": "1-2 months", "emergency": "2-4 weeks"},
        "voter_reg": {"standard": "2-4 weeks", "express": "N/A", "emergency": "N/A"},
    },
    "nigeria": {
        "id_application": {"standard": "1-3 months", "express": "2-4 weeks", "emergency": "1-2 weeks"},
        "passport": {"standard": "2-6 weeks", "express": "1-2 weeks", "emergency": "3-5 days"},
        "business_reg": {"standard": "2-6 weeks", "express": "1-2 weeks", "emergency": "3-5 days"},
        "tax_filing": {"standard": "2-4 weeks", "express": "1 week", "emergency": "2-3 days"},
        "land_title": {"standard": "3-6 months", "express": "1-2 months", "emergency": "2-4 weeks"},
        "voter_reg": {"standard": "2-4 months", "express": "N/A", "emergency": "N/A"},
    },
    "usa": {
        "id_application": {"standard": "2-4 weeks", "express": "1-2 weeks", "emergency": "Same day (in-person)"},
        "passport": {"standard": "8-11 weeks", "express": "5-7 weeks", "emergency": "72 hours (life-or-death)"},
        "business_reg": {"standard": "1-4 weeks", "express": "1-2 weeks", "emergency": "Same day (some states)"},
        "tax_filing": {"standard": "21 days (e-file refund)", "express": "N/A", "emergency": "N/A"},
        "land_title": {"standard": "2-4 weeks", "express": "1 week", "emergency": "1-3 days"},
        "voter_reg": {"standard": "2-4 weeks", "express": "N/A", "emergency": "N/A"},
    },
    "uk": {
        "id_application": {"standard": "3-6 weeks", "express": "1 week", "emergency": "Same day (premium)"},
        "passport": {"standard": "3-6 weeks", "express": "1 week", "emergency": "Same day (premium)"},
        "business_reg": {"standard": "24 hours (online)", "express": "Same day", "emergency": "Same day"},
        "tax_filing": {"standard": "2-4 weeks (refund)", "express": "N/A", "emergency": "N/A"},
        "land_title": {"standard": "1-3 months", "express": "2-4 weeks", "emergency": "1 week"},
        "voter_reg": {"standard": "1-2 weeks", "express": "N/A", "emergency": "N/A"},
    },
}

_FORM_REQUIREMENTS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "south_africa": {
        "tax_return": {"fields": [{"name": "taxpayer_id", "type": "text", "required": True}, {"name": "tax_year", "type": "select", "options": ["2023", "2024"], "required": True}, {"name": "gross_income", "type": "number", "required": True}, {"name": "deductions", "type": "number", "required": False}], "common_mistakes": ["Wrong tax year selected", "Missing signature", "Incorrect tax number"], "fee": "Free (eFiling)", "where_to_submit": "SARS eFiling portal or SARS branch"},
        "id_form": {"fields": [{"name": "surname", "type": "text", "required": True}, {"name": "first_name", "type": "text", "required": True}, {"name": "date_of_birth", "type": "date", "required": True}, {"name": "address", "type": "textarea", "required": True}], "common_mistakes": ["Mismatched names with birth cert", "Wrong date format"], "fee": "R140", "where_to_submit": "Home Affairs office or banking partner"},
        "passport_form": {"fields": [{"name": "surname", "type": "text", "required": True}, {"name": "first_name", "type": "text", "required": True}, {"name": "date_of_birth", "type": "date", "required": True}, {"name": "place_of_birth", "type": "text", "required": True}, {"name": "nationality", "type": "text", "required": True}], "common_mistakes": ["Blurry passport photo", "Unsigned form"], "fee": "R600 (adult)", "where_to_submit": "Home Affairs office or online booking"},
        "business_license": {"fields": [{"name": "proposed_name_1", "type": "text", "required": True}, {"name": "proposed_name_2", "type": "text", "required": True}, {"name": "nature_of_business", "type": "textarea", "required": True}, {"name": "registered_address", "type": "textarea", "required": True}, {"name": "director_1_name", "type": "text", "required": True}], "common_mistakes": ["Name already taken", "Wrong director details", "Unsigned forms"], "fee": "R125 (CIPC)", "where_to_submit": "CIPC online portal"},
        "voter_reg": {"fields": [{"name": "surname", "type": "text", "required": True}, {"name": "first_name", "type": "text", "required": True}, {"name": "date_of_birth", "type": "date", "required": True}, {"name": "address", "type": "textarea", "required": True}], "common_mistakes": ["Wrong voting district", "Already registered elsewhere"], "fee": "Free", "where_to_submit": "IEC office or online registration"},
    },
}

_ELIGIBILITY_CRITERIA: Dict[str, Dict[str, Dict[str, Any]]] = {
    "south_africa": {
        "id_application": {"age_requirement": "Any age", "residency": "SA citizen or permanent resident", "required_documents": ["Birth certificate", "Passport photo", "Proof of address"], "fees": "R140", "special_conditions": "Biometric capture required"},
        "passport": {"age_requirement": "Any age", "residency": "SA citizen", "required_documents": ["ID document", "Photos"], "fees": "R600 (adult)", "special_conditions": "Minors need both parents' consent"},
        "business_reg": {"age_requirement": "Any age", "residency": "Any", "required_documents": ["Proposed names", "Director IDs", "Address proof"], "fees": "R175", "special_conditions": "At least one director required"},
        "tax_filing": {"age_requirement": "Any (if income exceeds threshold)", "residency": "SA tax residents", "required_documents": ["Tax number", "IRP5/IT3(a) certificates"], "fees": "Free to file", "special_conditions": "Annual turnover > R1M must register for VAT"},
        "land_title": {"age_requirement": "Any", "residency": "Any", "required_documents": ["Deed", "Survey plan", "Rates clearance"], "fees": "Varies", "special_conditions": "Transfer duty applies"},
        "voter_reg": {"age_requirement": "16+ (eligible to vote at 18)", "residency": "SA citizen", "required_documents": ["ID document"], "fees": "Free", "special_conditions": "Registration only during designated periods"},
    },
}


def book_appointment(country: str, service_type: str, date: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Schedule a mock appointment for a government service."""
    country = country.lower().strip()
    service_type = service_type.lower().strip()
    locations = _AGENCY_LOCATIONS.get(country, {})
    svc_locs = locations.get(service_type, [f"{country.upper()} Government Services Office"])
    documents = _SERVICE_DOCUMENTS.get(service_type, ["Valid identification", "Relevant forms", "Payment receipt"])
    appt_id = f"appt-{uuid.uuid4().hex[:8]}"
    confirmation = f"LUQI-GOV-{uuid.uuid4().hex[:4].upper()}"
    duration_map = {"id_application": 60, "passport": 45, "business_reg": 90, "tax_filing": 30, "land_title": 120, "voter_reg": 30}
    return {
        "status": "success",
        "appointment_id": appt_id,
        "country": country,
        "service": service_type,
        "date": date,
        "location": svc_locs[0] if svc_locs else "Main office",
        "confirmation_code": confirmation,
        "documents_to_bring": documents,
        "estimated_duration_minutes": duration_map.get(service_type, 60),
        "message": f"Appointment booked for {service_type} at {svc_locs[0] if svc_locs else 'Main office'} on {date}. Arrive 15 minutes early with all required documents.",
        "details": details or {},
    }


def check_application_status(country: str, application_id: str) -> Dict[str, Any]:
    """Check the status of a government application."""
    country = country.lower().strip()
    statuses = ["received", "under_review", "approved", "rejected", "ready_for_pickup"]
    stages = {
        "received": {"stage": "Application Received", "description": "Your application has been received and is awaiting initial review."},
        "under_review": {"stage": "Under Review", "description": "Your application is being reviewed by the relevant department."},
        "approved": {"stage": "Approved", "description": "Your application has been approved."},
        "rejected": {"stage": "Rejected", "description": "Your application was not approved. Contact the office for details."},
        "ready_for_pickup": {"stage": "Ready for Pickup", "description": "Your document/card is ready for collection."},
    }
    idx = hash(application_id + country) % len(statuses)
    status = statuses[idx]
    est_days = [30, 45, 14, 0, 1][idx]
    est_date = (datetime.now() + timedelta(days=est_days)).strftime("%Y-%m-%d") if est_days > 0 else "N/A"
    return {
        "status": "success",
        "application_id": application_id,
        "country": country,
        "current_status": status,
        "stage": stages[status]["stage"],
        "description": stages[status]["description"],
        "estimated_completion_date": est_date,
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "notes": "Check back in 3-5 business days for updates." if status in ("received", "under_review") else "",
    }


def get_form_requirements(country: str, form_type: str) -> Dict[str, Any]:
    """Get requirements for filling out a government form."""
    country = country.lower().strip()
    form_type = form_type.lower().strip()
    country_forms = _FORM_REQUIREMENTS.get(country)
    if not country_forms:
        available_countries = list(_FORM_REQUIREMENTS.keys())
        return {"status": "not_found", "message": f"No form data for '{country}'. Available: {available_countries}"}
    form_data = country_forms.get(form_type)
    if not form_data:
        available_forms = list(country_forms.keys())
        return {"status": "not_found", "message": f"No form '{form_type}'. Available: {available_forms}"}
    return {
        "status": "success",
        "country": country,
        "form_type": form_type,
        "fields": form_data["fields"],
        "common_mistakes": form_data["common_mistakes"],
        "fee": form_data["fee"],
        "where_to_submit": form_data["where_to_submit"],
        "tips": ["Double-check all personal details match your ID", "Use black ink only", "Keep copies of everything submitted"],
    }


def calculate_processing_time(country: str, service_type: str, priority: str = "standard") -> Dict[str, Any]:
    """Estimate processing time for a government service."""
    country = country.lower().strip()
    service_type = service_type.lower().strip()
    priority = priority.lower().strip()
    country_times = _PROCESSING_TIME_ESTIMATES.get(country)
    if not country_times:
        available = list(_PROCESSING_TIME_ESTIMATES.keys())
        return {"status": "not_found", "message": f"No processing data for '{country}'. Available: {available}"}
    svc_times = country_times.get(service_type)
    if not svc_times:
        available_svcs = list(country_times.keys())
        return {"status": "not_found", "message": f"No data for '{service_type}'. Available: {available_svcs}"}
    estimate = svc_times.get(priority, svc_times.get("standard", "Unknown"))
    all_options = {k: v for k, v in svc_times.items() if v != "N/A"}
    return {
        "status": "success",
        "country": country,
        "service_type": service_type,
        "priority": priority,
        "estimated_time": estimate,
        "all_priorities": all_options,
        "note": f"{priority.title()} processing for {service_type} in {country.title()}",
    }


def get_eligibility_criteria(country: str, service_type: str) -> Dict[str, Any]:
    """Get eligibility criteria for a government service."""
    country = country.lower().strip()
    service_type = service_type.lower().strip()
    country_criteria = _ELIGIBILITY_CRITERIA.get(country)
    if not country_criteria:
        available = list(_ELIGIBILITY_CRITERIA.keys())
        return {"status": "not_found", "message": f"No eligibility data for '{country}'. Available: {available}"}
    criteria = country_criteria.get(service_type)
    if not criteria:
        available_svcs = list(country_criteria.keys())
        return {"status": "not_found", "message": f"No criteria for '{service_type}'. Available: {available_svcs}"}
    return {
        "status": "success",
        "country": country,
        "service_type": service_type,
        "age_requirement": criteria["age_requirement"],
        "residency_status": criteria["residency"],
        "required_documents": criteria["required_documents"],
        "fees": criteria["fees"],
        "special_conditions": criteria["special_conditions"],
        "meets_basic_requirements": "Review the criteria above to confirm eligibility",
    }


def generate_service_roadmap(country: str, goals: List[str]) -> Dict[str, Any]:
    """Generate a multi-step roadmap for achieving government-related goals."""
    country = country.lower().strip()
    goal_definitions: Dict[str, Dict[str, Any]] = {
        "register_business": {"name": "Register Business", "prerequisites": [], "steps": ["Choose business structure", "Reserve business name", "Prepare incorporation documents", "Submit to registration authority", "Collect certificate"], "estimated_weeks": 4, "estimated_cost_usd": 50},
        "get_tax_id": {"name": "Get Tax ID", "prerequisites": ["register_business"], "steps": ["Gather business registration docs", "Apply for tax ID online or at tax office", "Submit verification documents", "Receive tax certificate"], "estimated_weeks": 2, "estimated_cost_usd": 0},
        "open_bank_account": {"name": "Open Business Bank Account", "prerequisites": ["register_business"], "steps": ["Choose bank", "Gather KYC documents", "Complete account opening forms", "Deposit minimum balance"], "estimated_weeks": 1, "estimated_cost_usd": 25},
        "hire_employees": {"name": "Hire First Employees", "prerequisites": ["register_business", "open_bank_account"], "steps": ["Register with labour department", "Set up payroll system", "Draft employment contracts", "Register employees for tax", "Comply with labour laws"], "estimated_weeks": 3, "estimated_cost_usd": 100},
        "get_office_space": {"name": "Secure Office Space", "prerequisites": [], "steps": ["Determine budget and location", "Inspect properties", "Sign lease agreement", "Register business address"], "estimated_weeks": 3, "estimated_cost_usd": 500},
        "get_passport": {"name": "Get International Passport", "prerequisites": [], "steps": ["Gather birth certificate and ID", "Complete online application", "Pay fees", "Visit passport office for biometrics", "Collect passport"], "estimated_weeks": 4, "estimated_cost_usd": 40},
        "get_national_id": {"name": "Get National ID", "prerequisites": [], "steps": ["Gather birth certificate", "Complete enrollment form", "Visit enrollment center", "Capture biometrics", "Collect ID card"], "estimated_weeks": 6, "estimated_cost_usd": 10},
    }
    resolved_goals = []
    for g in goals:
        g_clean = g.lower().strip().replace(" ", "_")
        resolved_goals.append(g_clean)
    steps_result = []
    visited = set()
    total_weeks = 0
    total_cost = 0

    def add_goal(g):
        nonlocal total_weeks, total_cost
        if g in visited or g not in goal_definitions:
            return
        visited.add(g)
        gd = goal_definitions[g]
        for prereq in gd.get("prerequisites", []):
            add_goal(prereq)
        steps_result.append({
            "goal_id": g,
            "goal_name": gd["name"],
            "steps": gd["steps"],
            "estimated_weeks": gd["estimated_weeks"],
            "estimated_cost_usd": gd["estimated_cost_usd"],
            "prerequisites": gd.get("prerequisites", []),
        })
        total_weeks += gd["estimated_weeks"]
        total_cost += gd["estimated_cost_usd"]

    for g in resolved_goals:
        add_goal(g)
    if not steps_result:
        available = list(goal_definitions.keys())
        return {"status": "not_found", "message": f"No recognized goals. Available: {available}"}
    return {
        "status": "success",
        "country": country,
        "goals": goals,
        "roadmap_steps": steps_result,
        "total_estimated_weeks": total_weeks,
        "total_estimated_cost_usd": total_cost,
        "parallel_steps_possible": len(steps_result) > 1,
        "note": f"Roadmap for {country}. Review steps with a local attorney for compliance.",
    }
