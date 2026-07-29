"""
LUQI AI v29 — Omega Endpoints Part C
Continues from v25_endpoints.py and v25_endpoints_b.py.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse

# Re-use the same router and helpers from Part A
from backend.v25_endpoints import router, _omega_endpoint, require_auth, _omega, rate_limit_check

logger = logging.getLogger(__name__)


# ── OmniLab Evolver: Autonomous Curriculum Engine ──────────────────────────

@router.get("/omnilab/evolver/labs")
async def api_v25_omnilab_evolver_labs(tier: Optional[str] = None, subject: Optional[str] = None, superpower: Optional[str] = None):
    """List evolved labs with filtering."""
    try:
        from omega_ai.omnilab_evolver import get_evolver
        evolver = get_evolver()
        labs = evolver.list_labs(tier=tier, subject=subject, superpower=superpower)
        return JSONResponse({"success": True, "labs": labs, "total": len(labs)})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.get("/omnilab/evolver/lab/{lab_id}")
async def api_v25_omnilab_evolver_lab(lab_id: int):
    """Get a single evolved lab by ID."""
    try:
        from omega_ai.omnilab_evolver import get_evolver
        evolver = get_evolver()
        lab = evolver.get_lab(lab_id)
        if lab:
            return JSONResponse({"success": True, "lab": lab})
        return JSONResponse({"success": False, "error": "Lab not found"}, status_code=404)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.post("/omnilab/evolver/labs")
async def api_v25_omnilab_evolver_add(request: Request):
    """Add a new lab (manual or from evolution). Body: {title, tier, subject, source?, superpowers?, sandbox_type, materials, procedure, sepitori?}"""
    try:
        data = json.loads(await request.body())
        from omega_ai.omnilab_evolver import get_evolver
        evolver = get_evolver()
        result = evolver.add_lab(data)
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.get("/omnilab/evolver/evolve")
async def api_v25_omnilab_evolver_evolve():
    """Trigger autonomous curriculum evolution — adds the next evolution vector."""
    try:
        from omega_ai.omnilab_evolver import get_evolver
        evolver = get_evolver()
        result = evolver.evolve()
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.get("/omnilab/evolver/log")
async def api_v25_omnilab_evolver_log(limit: int = 50):
    """Get the evolution audit trail."""
    try:
        from omega_ai.omnilab_evolver import get_evolver
        evolver = get_evolver()
        log = evolver.get_evolution_log(limit=limit)
        return JSONResponse({"success": True, "log": log, "total": len(log)})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.get("/omnilab/evolver/stats")
async def api_v25_omnilab_evolver_stats():
    """Get database statistics."""
    try:
        from omega_ai.omnilab_evolver import get_evolver
        evolver = get_evolver()
        stats = evolver.get_stats()
        return JSONResponse({"success": True, **stats})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.delete("/omnilab/evolver/lab/{lab_id}")
async def api_v25_omnilab_evolver_delete(lab_id: int):
    """Delete a lab by ID."""
    try:
        from omega_ai.omnilab_evolver import get_evolver
        evolver = get_evolver()
        result = evolver.delete_lab(lab_id)
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


# ── Existing OmniLab endpoints ─────────────────────────────────────────────

@router.get("/omnilab/labs")
async def api_v25_omnilab_labs(tier: Optional[str] = None, subject: Optional[str] = None):
    """Get OmniLab labs filtered by tier and subject."""
    try:
        from omega_ai.omnilab_academies import get_engine
        engine = get_engine()
        labs = engine.get_labs(tier=tier, subject=subject)
        return JSONResponse({"success": True, "labs": labs, "total": len(labs)})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.get("/omnilab/lab/{lab_id}")
async def api_v25_omnilab_lab(lab_id: int):
    """Get a single lab by ID."""
    try:
        from omega_ai.omnilab_academies import get_engine
        engine = get_engine()
        lab = engine.get_lab(lab_id)
        if lab:
            return JSONResponse({"success": True, "lab": lab})
        return JSONResponse({"success": False, "error": "Lab not found"}, status_code=404)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.get("/omnilab/superpowers")
async def api_v25_omnilab_superpowers():
    """Get the superpower matrix definitions."""
    try:
        from omega_ai.omnilab_academies import get_engine
        engine = get_engine()
        return JSONResponse(engine.get_superpowers())
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.get("/omnilab/socratic/{sandbox_type}")
async def api_v25_omnilab_socratic(sandbox_type: str, index: Optional[int] = None):
    """Get Socratic dialogue prompts for a sandbox type."""
    try:
        from omega_ai.omnilab_academies import get_engine
        engine = get_engine()
        return JSONResponse(engine.get_socratic(sandbox_type, index))
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.post("/omnilab/analyze/thermal")
async def api_v25_omnilab_thermal(request: Request):
    """Analyze thermal experiment data."""
    try:
        data = json.loads(await request.body())
        from omega_ai.omnilab_academies import get_engine
        engine = get_engine()
        result = engine.analyze_thermal(
            temp_dark=data.get("temp_dark", 45),
            temp_reflective=data.get("temp_reflective", 32),
            ambient=data.get("ambient", 25),
        )
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.post("/omnilab/analyze/gravity")
async def api_v25_omnilab_gravity(request: Request):
    """Analyze pendulum/gravity experiment data."""
    try:
        data = json.loads(await request.body())
        from omega_ai.omnilab_academies import get_engine
        engine = get_engine()
        result = engine.analyze_gravity(
            times=data.get("times", []),
            length_m=data.get("length_m", 1.0),
        )
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.post("/omnilab/analyze/ohmic")
async def api_v25_omnilab_ohmic(request: Request):
    """Analyze resistivity experiment data."""
    try:
        data = json.loads(await request.body())
        from omega_ai.omnilab_academies import get_engine
        engine = get_engine()
        result = engine.analyze_ohmic(
            readings=data.get("readings", []),
            width_mm=data.get("width_mm", 2.0),
            thickness_mm=data.get("thickness_mm", 0.1),
        )
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@router.get("/omnilab/sync")
async def api_v25_omnilab_sync():
    """Trigger hexagonal harmonization cross-sync."""
    try:
        from omega_ai.omnilab_academies import get_engine
        engine = get_engine()
        return JSONResponse(engine.hexagonal_sync())
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


# ═══════════════════════════════════════════════════════════════════════════════
#  LEGAL ASSISTANT
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/legal/term/{term}", dependencies=[Depends(require_auth)])
@_omega_endpoint("legal_assistant", "LegalAssistant", "Legal assistant not available")
async def api_v25_legal_term(engine, term: str):
    """Get legal term definition."""
    return JSONResponse({"success": True, **engine.get_legal_term(term)})


@router.get("/legal/contracts/{type}", dependencies=[Depends(require_auth)])
@_omega_endpoint("legal_assistant", "LegalAssistant", "Legal assistant not available")
async def api_v25_legal_contracts(engine, type: str):
    """Get contract template information."""
    return JSONResponse({"success": True, **engine.get_contract_info(type)})


@router.get("/legal/rights/{context}", dependencies=[Depends(require_auth)])
@_omega_endpoint("legal_assistant", "LegalAssistant", "Legal assistant not available")
async def api_v25_legal_rights(engine, context: str):
    """Get rights information by context."""
    return JSONResponse({"success": True, **engine.get_rights_guide(context)})


# ═══════════════════════════════════════════════════════════════════════════════
#  REAL ESTATE CALCULATOR (orphan)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/real-estate/bond", dependencies=[Depends(require_auth)])
@_omega_endpoint("real_estate_calculator", "RealEstateCalculator", "Real estate calculator not available")
async def api_v25_realestate_bond(engine, purchase_price: float = 1000000.0, deposit: float = 0.0, term_years: int = 20, interest_rate: float = 11.5):
    """Calculate bond/repayment."""
    return JSONResponse({"success": True, **engine.calculate_bond(purchase_price, deposit, term_years, interest_rate)})


@router.get("/real-estate/transfer-duty", dependencies=[Depends(require_auth)])
@_omega_endpoint("real_estate_calculator", "RealEstateCalculator", "Real estate calculator not available")
async def api_v25_realestate_transfer_duty(engine, property_value: float = 1000000.0):
    """Calculate transfer duty."""
    return JSONResponse({"success": True, **engine.calculate_transfer_duty(property_value)})


@router.get("/real-estate/rental-yield", dependencies=[Depends(require_auth)])
@_omega_endpoint("real_estate_calculator", "RealEstateCalculator", "Real estate calculator not available")
async def api_v25_realestate_rental_yield(engine, annual_rent: float = 120000.0, property_value: float = 1500000.0):
    """Calculate rental yield."""
    return JSONResponse({"success": True, **engine.calculate_rental_yield(annual_rent, property_value)})


@router.get("/real-estate/buy-vs-rent", dependencies=[Depends(require_auth)])
@_omega_endpoint("real_estate_calculator", "RealEstateCalculator", "Real estate calculator not available")
async def api_v25_realestate_buy_vs_rent(engine, property_price: float = 1000000.0, monthly_rent: float = 8000.0, years: int = 10):
    """Compare buying vs renting."""
    return JSONResponse({"success": True, **engine.compare_buy_vs_rent(property_price, monthly_rent, years)})


# ═══════════════════════════════════════════════════════════════════════════════
#  FINANCIAL LITERACY (orphan)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/financial-literacy/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("financial_literacy", "FinancialLiteracy", "Financial literacy not available")
async def api_v25_financial_literacy_status(engine):
    """Get financial literacy module status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/financial-literacy/lessons", dependencies=[Depends(require_auth)])
@_omega_endpoint("financial_literacy", "FinancialLiteracy", "Financial literacy not available")
async def api_v25_financial_literacy_lessons(engine, topic: str = None):
    """Get financial literacy lessons."""
    return JSONResponse({"success": True, **engine.get_lessons(topic)})


@router.post("/financial-literacy/calculate", dependencies=[Depends(require_auth)])
@_omega_endpoint("financial_literacy", "FinancialLiteracy", "Financial literacy not available")
async def api_v25_financial_literacy_calculate(engine, request: Request):
    """Run a financial literacy calculation."""
    data = json.loads(await request.body())
    result = engine.calculate(data.get("calc_type", "compound_interest"), data.get("params", {}))
    return JSONResponse({"success": True, **result})


@router.get("/financial-literacy/glossary", dependencies=[Depends(require_auth)])
@_omega_endpoint("financial_literacy", "FinancialLiteracy", "Financial literacy not available")
async def api_v25_financial_literacy_glossary(engine, term: str = None):
    """Get financial glossary."""
    return JSONResponse({"success": True, **engine.get_glossary(term)})


# ═══════════════════════════════════════════════════════════════════════════════
#  EDUCATIONAL COMPANION (orphan)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/edu-companion/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("educational_companion", "EducationalCompanion", "Educational companion not available")
async def api_v25_educompanion_status(engine):
    """Get educational companion status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/edu-companion/subjects", dependencies=[Depends(require_auth)])
@_omega_endpoint("educational_companion", "EducationalCompanion", "Educational companion not available")
async def api_v25_educompanion_subjects(engine, grade: int = None):
    """Get available subjects."""
    return JSONResponse({"success": True, **engine.get_subjects(grade)})


@router.post("/edu-companion/study-plan", dependencies=[Depends(require_auth)])
@_omega_endpoint("educational_companion", "EducationalCompanion", "Educational companion not available")
async def api_v25_educompanion_study_plan(engine, request: Request):
    """Generate a study plan."""
    data = json.loads(await request.body())
    result = engine.generate_study_plan(data.get("subjects", []), data.get("hours_per_day", 4))
    return JSONResponse({"success": True, **result})


@router.get("/edu-companion/resources", dependencies=[Depends(require_auth)])
@_omega_endpoint("educational_companion", "EducationalCompanion", "Educational companion not available")
async def api_v25_educompanion_resources(engine, subject: str = None, grade: int = None):
    """Get learning resources."""
    return JSONResponse({"success": True, **engine.get_resources(subject, grade)})


# ═══════════════════════════════════════════════════════════════════════════════
#  LOCAL LLM (orphan)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/local-llm/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("local_llm", "LocalLLM", "Local LLM not available")
async def api_v25_local_llm_status(engine):
    """Get local LLM status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/local-llm/models", dependencies=[Depends(require_auth)])
@_omega_endpoint("local_llm", "LocalLLM", "Local LLM not available")
async def api_v25_local_llm_models(engine):
    """List available local models."""
    return JSONResponse({"success": True, **engine.list_models()})


@router.post("/local-llm/chat", dependencies=[Depends(require_auth)])
@_omega_endpoint("local_llm", "LocalLLM", "Local LLM not available")
async def api_v25_local_llm_chat(engine, request: Request):
    """Chat with local LLM."""
    data = json.loads(await request.body())
    result = engine.chat(data.get("message", ""), data.get("model", None), data.get("params", {}))
    return JSONResponse({"success": True, **result})


@router.get("/local-llm/templates", dependencies=[Depends(require_auth)])
@_omega_endpoint("local_llm", "LocalLLM", "Local LLM not available")
async def api_v25_local_llm_templates(engine, task: str = None):
    """Get prompt templates."""
    return JSONResponse({"success": True, **engine.get_templates(task)})


# ═══════════════════════════════════════════════════════════════════════════════
#  HEALTHCARE DIRECTORY (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/healthcare/facilities", dependencies=[Depends(require_auth)])
@_omega_endpoint("healthcare_directory", "HealthcareDirectory", "Healthcare directory not available")
async def api_v25_healthcare_facilities(engine, province: str = None, type: str = None):
    """List healthcare facilities."""
    return JSONResponse({"success": True, **engine.get_facilities(province, type)})


@router.get("/healthcare/emergency-numbers", dependencies=[Depends(require_auth)])
@_omega_endpoint("healthcare_directory", "HealthcareDirectory", "Healthcare directory not available")
async def api_v25_healthcare_emergency_numbers(engine):
    """Get emergency numbers."""
    return JSONResponse({"success": True, **engine.get_emergency_numbers()})


@router.get("/healthcare/hiv-resources", dependencies=[Depends(require_auth)])
@_omega_endpoint("healthcare_directory", "HealthcareDirectory", "Healthcare directory not available")
async def api_v25_healthcare_hiv_resources(engine, province: str = None):
    """Get HIV/AIDS resources."""
    return JSONResponse({"success": True, **engine.get_hiv_resources(province)})


@router.get("/healthcare/pharmacies", dependencies=[Depends(require_auth)])
@_omega_endpoint("healthcare_directory", "HealthcareDirectory", "Healthcare directory not available")
async def api_v25_healthcare_pharmacies(engine, location: str = None, open_24h: bool = False):
    """Find pharmacies."""
    return JSONResponse({"success": True, **engine.find_pharmacies(location, open_24h)})


# ═══════════════════════════════════════════════════════════════════════════════
#  NUTRITION PLANNER (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/nutrition/foods", dependencies=[Depends(require_auth)])
@_omega_endpoint("nutrition_planner", "NutritionPlanner", "Nutrition planner not available")
async def api_v25_nutrition_foods(engine, category: str = None, culture: str = None):
    """List food database."""
    return JSONResponse({"success": True, **engine.get_foods(category, culture)})


@router.get("/nutrition/meal-plan/{type}", dependencies=[Depends(require_auth)])
@_omega_endpoint("nutrition_planner", "NutritionPlanner", "Nutrition planner not available")
async def api_v25_nutrition_meal_plan(engine, type: str, calories: int = 2000):
    """Get a meal plan."""
    return JSONResponse({"success": True, **engine.get_meal_plan(type, calories)})


@router.post("/nutrition/bmi", dependencies=[Depends(require_auth)])
@_omega_endpoint("nutrition_planner", "NutritionPlanner", "Nutrition planner not available")
async def api_v25_nutrition_bmi(engine, request: Request):
    """Calculate BMI with nutritional context."""
    data = json.loads(await request.body())
    result = engine.calculate_nutrition_bmi(data.get("weight_kg", 70.0), data.get("height_m", 1.75))
    return JSONResponse({"success": True, **result})


@router.post("/nutrition/calories", dependencies=[Depends(require_auth)])
@_omega_endpoint("nutrition_planner", "NutritionPlanner", "Nutrition planner not available")
async def api_v25_nutrition_calories(engine, request: Request):
    """Calculate daily calorie needs."""
    data = json.loads(await request.body())
    result = engine.calculate_daily_calories(data.get("weight_kg", 70.0), data.get("height_cm", 175.0),
                                               data.get("age", 30), data.get("gender", "male"),
                                               data.get("activity_level", "moderate"))
    return JSONResponse({"success": True, **result})


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC TRANSPORT (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/transport/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("public_transport", "PublicTransport", "Public transport not available")
async def api_v25_transport_status(engine):
    """Get public transport status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/transport/taxi-ranks", dependencies=[Depends(require_auth)])
@_omega_endpoint("public_transport", "PublicTransport", "Public transport not available")
async def api_v25_transport_taxi_ranks(engine, city: str = None):
    """List taxi ranks."""
    return JSONResponse({"success": True, **engine.get_taxi_ranks(city)})


@router.get("/transport/bus-schedules", dependencies=[Depends(require_auth)])
@_omega_endpoint("public_transport", "PublicTransport", "Public transport not available")
async def api_v25_transport_bus_schedules(engine, city: str = None, route: str = None):
    """Get bus schedules."""
    return JSONResponse({"success": True, **engine.get_bus_schedules(city, route)})


@router.post("/transport/calculate-fare", dependencies=[Depends(require_auth)])
@_omega_endpoint("public_transport", "PublicTransport", "Public transport not available")
async def api_v25_transport_calculate_fare(engine, request: Request):
    """Calculate transport fare."""
    data = json.loads(await request.body())
    result = engine.calculate_fare(data.get("mode", "taxi"), data.get("distance_km", 0),
                                     data.get("from_location", ""), data.get("to_location", ""))
    return JSONResponse({"success": True, **result})


# ═══════════════════════════════════════════════════════════════════════════════
#  UNIVERSITY GUIDE (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/university/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("university_guide", "UniversityGuide", "University guide not available")
async def api_v25_university_status(engine):
    """Get university guide status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/university/universities", dependencies=[Depends(require_auth)])
@_omega_endpoint("university_guide", "UniversityGuide", "University guide not available")
async def api_v25_university_universities(engine, province: str = None, type: str = None):
    """List universities."""
    return JSONResponse({"success": True, **engine.get_universities(province, type)})


@router.get("/university/courses", dependencies=[Depends(require_auth)])
@_omega_endpoint("university_guide", "UniversityGuide", "University guide not available")
async def api_v25_university_courses(engine, field: str = None, university: str = None):
    """List courses/degrees."""
    return JSONResponse({"success": True, **engine.get_courses(field, university)})


@router.get("/university/nsfas-info", dependencies=[Depends(require_auth)])
@_omega_endpoint("university_guide", "UniversityGuide", "University guide not available")
async def api_v25_university_nsfas_info(engine):
    """Get NSFAS funding information."""
    return JSONResponse({"success": True, **engine.get_nsfas_info()})


# ═══════════════════════════════════════════════════════════════════════════════
#  JOB MARKET (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/jobs/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("job_market", "JobMarket", "Job market not available")
async def api_v25_jobs_status(engine):
    """Get job market status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/jobs/salary-benchmarks", dependencies=[Depends(require_auth)])
@_omega_endpoint("job_market", "JobMarket", "Job market not available")
async def api_v25_jobs_salary_benchmarks(engine, role: str = None, experience_years: int = None):
    """Get salary benchmarks."""
    return JSONResponse({"success": True, **engine.get_salary_benchmarks(role, experience_years)})


@router.post("/jobs/score-cv", dependencies=[Depends(require_auth)])
@_omega_endpoint("job_market", "JobMarket", "Job market not available")
async def api_v25_jobs_score_cv(engine, request: Request):
    """Score a CV against job requirements."""
    data = json.loads(await request.body())
    result = engine.score_cv(data.get("cv_text", ""), data.get("job_description", ""))
    return JSONResponse({"success": True, **result})


@router.get("/jobs/interview-questions", dependencies=[Depends(require_auth)])
@_omega_endpoint("job_market", "JobMarket", "Job market not available")
async def api_v25_jobs_interview_questions(engine, role: str = None, level: str = "mid"):
    """Get interview questions."""
    return JSONResponse({"success": True, **engine.get_interview_questions(role, level)})


# ═══════════════════════════════════════════════════════════════════════════════
#  WATER & SANITATION (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/water/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("water_sanitation", "WaterSanitation", "Water sanitation not available")
async def api_v25_water_status(engine):
    """Get water and sanitation status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/water/restrictions", dependencies=[Depends(require_auth)])
@_omega_endpoint("water_sanitation", "WaterSanitation", "Water sanitation not available")
async def api_v25_water_restrictions(engine, municipality: str = None):
    """Get water restrictions."""
    return JSONResponse({"success": True, **engine.get_restrictions(municipality)})


@router.get("/water/borehole-info", dependencies=[Depends(require_auth)])
@_omega_endpoint("water_sanitation", "WaterSanitation", "Water sanitation not available")
async def api_v25_water_borehole_info(engine, province: str = None):
    """Get borehole regulations and info."""
    return JSONResponse({"success": True, **engine.get_borehole_info(province)})


@router.post("/water/calculate-rainwater", dependencies=[Depends(require_auth)])
@_omega_endpoint("water_sanitation", "WaterSanitation", "Water sanitation not available")
async def api_v25_water_calculate_rainwater(engine, request: Request):
    """Calculate rainwater harvesting potential."""
    data = json.loads(await request.body())
    result = engine.calculate_rainwater_harvesting(data.get("roof_area_m2", 100),
                                                      data.get("annual_rainfall_mm", 600))
    return JSONResponse({"success": True, **result})


# ═══════════════════════════════════════════════════════════════════════════════
#  EMERGENCY SERVICES (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/emergency/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("emergency_services", "EmergencyServices", "Emergency services not available")
async def api_v25_emergency_status(engine):
    """Get emergency services status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/emergency/numbers", dependencies=[Depends(require_auth)])
@_omega_endpoint("emergency_services", "EmergencyServices", "Emergency services not available")
async def api_v25_emergency_numbers(engine, province: str = None):
    """Get emergency contact numbers."""
    return JSONResponse({"success": True, **engine.get_emergency_numbers(province)})


@router.get("/emergency/police-stations", dependencies=[Depends(require_auth)])
@_omega_endpoint("emergency_services", "EmergencyServices", "Emergency services not available")
async def api_v25_emergency_police_stations(engine, location: str = None):
    """Find police stations."""
    return JSONResponse({"success": True, **engine.find_police_stations(location)})


@router.get("/emergency/disaster-response", dependencies=[Depends(require_auth)])
@_omega_endpoint("emergency_services", "EmergencyServices", "Emergency services not available")
async def api_v25_emergency_disaster_response(engine, disaster_type: str = None):
    """Get disaster response information."""
    return JSONResponse({"success": True, **engine.get_disaster_response(disaster_type)})


# ═══════════════════════════════════════════════════════════════════════════════
#  FARMING GUIDE (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/farming/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("farming_guide", "FarmingGuide", "Farming guide not available")
async def api_v25_farming_status(engine):
    """Get farming guide status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/farming/crops", dependencies=[Depends(require_auth)])
@_omega_endpoint("farming_guide", "FarmingGuide", "Farming guide not available")
async def api_v25_farming_crops(engine, region: str = None, season: str = None):
    """Get crop recommendations."""
    return JSONResponse({"success": True, **engine.get_crop_recommendations(region, season)})


@router.get("/farming/livestock", dependencies=[Depends(require_auth)])
@_omega_endpoint("farming_guide", "FarmingGuide", "Farming guide not available")
async def api_v25_farming_livestock(engine, type: str = None):
    """Get livestock farming info."""
    return JSONResponse({"success": True, **engine.get_livestock_info(type)})


@router.get("/farming/prices", dependencies=[Depends(require_auth)])
@_omega_endpoint("farming_guide", "FarmingGuide", "Farming guide not available")
async def api_v25_farming_prices(engine, commodity: str = None, market: str = None):
    """Get farming commodity prices."""
    return JSONResponse({"success": True, **engine.get_commodity_prices(commodity, market)})


# ═══════════════════════════════════════════════════════════════════════════════
#  MOBILE DATA OPTIMIZER (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/mobile-data/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("mobile_data", "MobileDataOptimizer", "Mobile data optimizer not available")
async def api_v25_mobile_data_status(engine):
    """Get mobile data optimizer status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/mobile-data/plans", dependencies=[Depends(require_auth)])
@_omega_endpoint("mobile_data", "MobileDataOptimizer", "Mobile data optimizer not available")
async def api_v25_mobile_data_plans(engine, network: str = None, data_needed_gb: float = None):
    """Compare mobile data plans."""
    return JSONResponse({"success": True, **engine.compare_plans(network, data_needed_gb)})


@router.post("/mobile-data/calculate-usage", dependencies=[Depends(require_auth)])
@_omega_endpoint("mobile_data", "MobileDataOptimizer", "Mobile data optimizer not available")
async def api_v25_mobile_data_calculate_usage(engine, request: Request):
    """Calculate estimated data usage."""
    data = json.loads(await request.body())
    result = engine.calculate_usage(data.get("activities", {}))
    return JSONResponse({"success": True, **result})


@router.get("/mobile-data/ussd-codes", dependencies=[Depends(require_auth)])
@_omega_endpoint("mobile_data", "MobileDataOptimizer", "Mobile data optimizer not available")
async def api_v25_mobile_data_ussd_codes(engine, network: str = None):
    """Get USSD codes for data balance."""
    return JSONResponse({"success": True, **engine.get_ussd_codes(network)})


# ═══════════════════════════════════════════════════════════════════════════════
#  PROPERTY RENTAL (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/property/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("property_rental", "PropertyRental", "Property rental not available")
async def api_v25_property_status(engine):
    """Get property rental module status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/property/rental-prices", dependencies=[Depends(require_auth)])
@_omega_endpoint("property_rental", "PropertyRental", "Property rental not available")
async def api_v25_property_rental_prices(engine, city: str = None, bedrooms: int = None):
    """Get rental price estimates."""
    return JSONResponse({"success": True, **engine.get_rental_prices(city, bedrooms)})


@router.get("/property/tenant-rights", dependencies=[Depends(require_auth)])
@_omega_endpoint("property_rental", "PropertyRental", "Property rental not available")
async def api_v25_property_tenant_rights(engine, province: str = None):
    """Get tenant rights information."""
    return JSONResponse({"success": True, **engine.get_tenant_rights(province)})


@router.post("/property/calculate-affordability", dependencies=[Depends(require_auth)])
@_omega_endpoint("property_rental", "PropertyRental", "Property rental not available")
async def api_v25_property_calculate_affordability(engine, request: Request):
    """Calculate rental affordability."""
    data = json.loads(await request.body())
    result = engine.calculate_affordability(data.get("monthly_income", 0),
                                              data.get("expenses", 0))
    return JSONResponse({"success": True, **result})


# ═══════════════════════════════════════════════════════════════════════════════
#  NEWS FACT CHECK (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/news/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("news_factcheck", "NewsFactCheck", "News fact check not available")
async def api_v25_news_status(engine):
    """Get news fact check module status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/news/sources", dependencies=[Depends(require_auth)])
@_omega_endpoint("news_factcheck", "NewsFactCheck", "News fact check not available")
async def api_v25_news_sources(engine, category: str = None, reliability: str = None):
    """List news sources with reliability ratings."""
    return JSONResponse({"success": True, **engine.get_sources(category, reliability)})


@router.get("/news/misinformation-patterns", dependencies=[Depends(require_auth)])
@_omega_endpoint("news_factcheck", "NewsFactCheck", "News fact check not available")
async def api_v25_news_misinformation_patterns(engine, topic: str = None):
    """Get common misinformation patterns."""
    return JSONResponse({"success": True, **engine.get_misinformation_patterns(topic)})


@router.post("/news/check-claim", dependencies=[Depends(require_auth)])
@_omega_endpoint("news_factcheck", "NewsFactCheck", "News fact check not available")
async def api_v25_news_check_claim(engine, request: Request):
    """Check a news claim for accuracy."""
    data = json.loads(await request.body())
    result = engine.check_claim(data.get("claim", ""), data.get("context", ""))
    return JSONResponse({"success": True, **result})


# ═══════════════════════════════════════════════════════════════════════════════
#  LIVESTOCK MANAGER (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/livestock/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("livestock_manager", "LivestockManager", "Livestock manager not available")
async def api_v25_livestock_status(engine):
    """Get livestock manager status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/livestock/vaccines", dependencies=[Depends(require_auth)])
@_omega_endpoint("livestock_manager", "LivestockManager", "Livestock manager not available")
async def api_v25_livestock_vaccines(engine, animal_type: str = None):
    """Get vaccination schedules."""
    return JSONResponse({"success": True, **engine.get_vaccination_schedule(animal_type)})


@router.get("/livestock/breeding", dependencies=[Depends(require_auth)])
@_omega_endpoint("livestock_manager", "LivestockManager", "Livestock manager not available")
async def api_v25_livestock_breeding(engine, animal_type: str = None):
    """Get breeding guide information."""
    return JSONResponse({"success": True, **engine.get_breeding_guide(animal_type)})


@router.get("/livestock/prices", dependencies=[Depends(require_auth)])
@_omega_endpoint("livestock_manager", "LivestockManager", "Livestock manager not available")
async def api_v25_livestock_prices(engine, animal_type: str = None, market: str = None):
    """Get livestock market prices."""
    return JSONResponse({"success": True, **engine.get_livestock_prices(animal_type, market)})


# ═══════════════════════════════════════════════════════════════════════════════
#  GRANT FUNDING (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/grants/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("grant_funding", "GrantFunding", "Grant funding not available")
async def api_v25_grants_status(engine):
    """Get grant funding module status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/grants/government", dependencies=[Depends(require_auth)])
@_omega_endpoint("grant_funding", "GrantFunding", "Grant funding not available")
async def api_v25_grants_government(engine, sector: str = None, stage: str = None):
    """List government grants."""
    return JSONResponse({"success": True, **engine.get_government_grants(sector, stage)})


@router.get("/grants/crowdfunding", dependencies=[Depends(require_auth)])
@_omega_endpoint("grant_funding", "GrantFunding", "Grant funding not available")
async def api_v25_grants_crowdfunding(engine, platform: str = None):
    """Get crowdfunding platform info."""
    return JSONResponse({"success": True, **engine.get_crowdfunding_info(platform)})


@router.post("/grants/check-eligibility", dependencies=[Depends(require_auth)])
@_omega_endpoint("grant_funding", "GrantFunding", "Grant funding not available")
async def api_v25_grants_check_eligibility(engine, request: Request):
    """Check grant eligibility."""
    data = json.loads(await request.body())
    result = engine.check_eligibility(data.get("grant_id", ""), data.get("applicant_info", {}))
    return JSONResponse({"success": True, **result})


# ═══════════════════════════════════════════════════════════════════════════════
#  BUSINESS REGISTRATION (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/business-reg/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("business_registration", "BusinessRegistration", "Business registration not available")
async def api_v25_business_reg_status(engine):
    """Get business registration module status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/business-reg/cipc-steps", dependencies=[Depends(require_auth)])
@_omega_endpoint("business_registration", "BusinessRegistration", "Business registration not available")
async def api_v25_business_reg_cipc_steps(engine, entity_type: str = "private_company"):
    """Get CIPC registration steps."""
    return JSONResponse({"success": True, **engine.get_cipc_steps(entity_type)})


@router.get("/business-reg/business-types", dependencies=[Depends(require_auth)])
@_omega_endpoint("business_registration", "BusinessRegistration", "Business registration not available")
async def api_v25_business_reg_business_types(engine):
    """Get business entity types."""
    return JSONResponse({"success": True, **engine.get_business_types()})


@router.get("/business-reg/bbbee-levels", dependencies=[Depends(require_auth)])
@_omega_endpoint("business_registration", "BusinessRegistration", "Business registration not available")
async def api_v25_business_reg_bbbee_levels(engine, annual_turnover: float = None):
    """Get B-BBEE level requirements."""
    return JSONResponse({"success": True, **engine.get_bbbee_levels(annual_turnover)})


# ═══════════════════════════════════════════════════════════════════════════════
#  CLIMATE & ENVIRONMENT (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/climate/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("climate_environment", "ClimateEnvironment", "Climate environment not available")
async def api_v25_climate_status(engine):
    """Get climate and environment module status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.post("/climate/carbon-footprint", dependencies=[Depends(require_auth)])
@_omega_endpoint("climate_environment", "ClimateEnvironment", "Climate environment not available")
async def api_v25_climate_carbon_footprint(engine, request: Request):
    """Calculate carbon footprint."""
    data = json.loads(await request.body())
    result = engine.calculate_carbon_footprint(data.get("household", {}))
    return JSONResponse({"success": True, **result})


@router.get("/climate/recycling", dependencies=[Depends(require_auth)])
@_omega_endpoint("climate_environment", "ClimateEnvironment", "Climate environment not available")
async def api_v25_climate_recycling(engine, material: str = None, city: str = None):
    """Get recycling information."""
    return JSONResponse({"success": True, **engine.get_recycling_info(material, city)})


@router.get("/climate/renewable-options", dependencies=[Depends(require_auth)])
@_omega_endpoint("climate_environment", "ClimateEnvironment", "Climate environment not available")
async def api_v25_climate_renewable_options(engine, property_type: str = "residential"):
    """Get renewable energy options."""
    return JSONResponse({"success": True, **engine.get_renewable_options(property_type)})


# ═══════════════════════════════════════════════════════════════════════════════
#  HOUSING RDP (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/housing/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("housing_rdp", "HousingRDP", "Housing RDP not available")
async def api_v25_housing_status(engine):
    """Get housing RDP module status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.post("/housing/rdp-calculator", dependencies=[Depends(require_auth)])
@_omega_endpoint("housing_rdp", "HousingRDP", "Housing RDP not available")
async def api_v25_housing_rdp_calculator(engine, request: Request):
    """Check RDP housing eligibility."""
    data = json.loads(await request.body())
    result = engine.check_rdp_eligibility(data.get("income", 0), data.get("household_size", 1),
                                           data.get("citizen", True))
    return JSONResponse({"success": True, **result})


@router.post("/housing/flisp-calculator", dependencies=[Depends(require_auth)])
@_omega_endpoint("housing_rdp", "HousingRDP", "Housing RDP not available")
async def api_v25_housing_flisp_calculator(engine, request: Request):
    """Calculate FLISP subsidy."""
    data = json.loads(await request.body())
    result = engine.calculate_flisp_subsidy(data.get("monthly_income", 0))
    return JSONResponse({"success": True, **result})


@router.get("/housing/provinces", dependencies=[Depends(require_auth)])
@_omega_endpoint("housing_rdp", "HousingRDP", "Housing RDP not available")
async def api_v25_housing_provinces(engine):
    """Get provincial housing contacts."""
    return JSONResponse({"success": True, **engine.get_provincial_contacts()})


# ═══════════════════════════════════════════════════════════════════════════════
#  FOOD & WINE GUIDE (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/food-wine/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("food_wine_guide", "FoodWineGuide", "Food and wine guide not available")
async def api_v25_food_wine_status(engine):
    """Get food and wine guide status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/food-wine/wine-routes", dependencies=[Depends(require_auth)])
@_omega_endpoint("food_wine_guide", "FoodWineGuide", "Food and wine guide not available")
async def api_v25_food_wine_wine_routes(engine, region: str = None):
    """Get wine routes."""
    return JSONResponse({"success": True, **engine.get_wine_routes(region)})


@router.get("/food-wine/restaurants", dependencies=[Depends(require_auth)])
@_omega_endpoint("food_wine_guide", "FoodWineGuide", "Food and wine guide not available")
async def api_v25_food_wine_restaurants(engine, city: str = None, cuisine: str = None):
    """Get restaurant recommendations."""
    return JSONResponse({"success": True, **engine.get_restaurants(city, cuisine)})


@router.get("/food-wine/traditional-dishes", dependencies=[Depends(require_auth)])
@_omega_endpoint("food_wine_guide", "FoodWineGuide", "Food and wine guide not available")
async def api_v25_food_wine_traditional_dishes(engine, culture: str = None):
    """Get traditional dishes."""
    return JSONResponse({"success": True, **engine.get_traditional_dishes(culture)})


# ═══════════════════════════════════════════════════════════════════════════════
#  MINING INDUSTRY (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/mining/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("mining_industry", "MiningIndustry", "Mining industry not available")
async def api_v25_mining_status(engine):
    """Get mining industry module status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/mining/safety", dependencies=[Depends(require_auth)])
@_omega_endpoint("mining_industry", "MiningIndustry", "Mining industry not available")
async def api_v25_mining_safety(engine, commodity: str = None):
    """Get mining safety regulations."""
    return JSONResponse({"success": True, **engine.get_safety_regulations(commodity)})


@router.get("/mining/careers", dependencies=[Depends(require_auth)])
@_omega_endpoint("mining_industry", "MiningIndustry", "Mining industry not available")
async def api_v25_mining_careers(engine, field: str = None):
    """Get mining career information."""
    return JSONResponse({"success": True, **engine.get_career_info(field)})


@router.get("/mining/companies", dependencies=[Depends(require_auth)])
@_omega_endpoint("mining_industry", "MiningIndustry", "Mining industry not available")
async def api_v25_mining_companies(engine, commodity: str = None):
    """Get major mining companies."""
    return JSONResponse({"success": True, **engine.get_major_companies(commodity)})


# ═══════════════════════════════════════════════════════════════════════════════
#  COMMUNITY EVENTS (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/community/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("community_events", "CommunityEvents", "Community events not available")
async def api_v25_community_status(engine):
    """Get community events module status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/community/events", dependencies=[Depends(require_auth)])
@_omega_endpoint("community_events", "CommunityEvents", "Community events not available")
async def api_v25_community_events(engine, city: str = None, category: str = None):
    """List community events."""
    return JSONResponse({"success": True, **engine.get_events(city, category)})


@router.get("/community/volunteer", dependencies=[Depends(require_auth)])
@_omega_endpoint("community_events", "CommunityEvents", "Community events not available")
async def api_v25_community_volunteer(engine, cause: str = None, location: str = None):
    """Get volunteer opportunities."""
    return JSONResponse({"success": True, **engine.get_volunteer_opportunities(cause, location)})


@router.get("/community/safety-tips", dependencies=[Depends(require_auth)])
@_omega_endpoint("community_events", "CommunityEvents", "Community events not available")
async def api_v25_community_safety_tips(engine, context: str = None):
    """Get community safety tips."""
    return JSONResponse({"success": True, **engine.get_safety_tips(context)})


# ═══════════════════════════════════════════════════════════════════════════════
#  ENTERTAINMENT & CULTURE (new)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/entertainment/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("entertainment_culture", "EntertainmentCulture", "Entertainment culture not available")
async def api_v25_entertainment_status(engine):
    """Get entertainment and culture module status."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/entertainment/festivals", dependencies=[Depends(require_auth)])
@_omega_endpoint("entertainment_culture", "EntertainmentCulture", "Entertainment culture not available")
async def api_v25_entertainment_festivals(engine, province: str = None, month: str = None):
    """Get festival listings."""
    return JSONResponse({"success": True, **engine.get_festivals(province, month)})


@router.get("/entertainment/cinemas", dependencies=[Depends(require_auth)])
@_omega_endpoint("entertainment_culture", "EntertainmentCulture", "Entertainment culture not available")
async def api_v25_entertainment_cinemas(engine, city: str = None):
    """Get cinema listings."""
    return JSONResponse({"success": True, **engine.get_cinemas(city)})


@router.get("/entertainment/heritage-sites", dependencies=[Depends(require_auth)])
@_omega_endpoint("entertainment_culture", "EntertainmentCulture", "Entertainment culture not available")
async def api_v25_entertainment_heritage_sites(engine, province: str = None, unesco_only: bool = False):
    """Get heritage sites."""
    return JSONResponse({"success": True, **engine.get_heritage_sites(province, unesco_only)})


# ═══════════════════════════════════════════════════════════════════════════════
#  TENDER ASSISTANT (v27.2)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/tenders/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("tender_assistant", "TenderAssistant", "Tender assistant not available")
async def api_v25_tenders_status(engine):
    """Get tender assistant overview."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/tenders/types", dependencies=[Depends(require_auth)])
@_omega_endpoint("tender_assistant", "TenderAssistant", "Tender assistant not available")
async def api_v25_tenders_types(engine):
    """Get tender types and processes."""
    return JSONResponse({"success": True, "tender_types": engine.get_tender_types()})


@router.post("/tenders/checklist", dependencies=[Depends(require_auth)])
@_omega_endpoint("tender_assistant", "TenderAssistant", "Tender assistant not available")
async def api_v25_tenders_checklist(engine, request: Request):
    """Generate document checklist for tender application."""
    data = json.loads(await request.body())
    result = engine.generate_checklist(
        data.get("tender_type", "RFP"),
        data.get("industry", "general"),
        data.get("value", 500000)
    )
    return JSONResponse({"success": True, **result})


@router.post("/tenders/calculate-points", dependencies=[Depends(require_auth)])
@_omega_endpoint("tender_assistant", "TenderAssistant", "Tender assistant not available")
async def api_v25_tenders_calculate_points(engine, request: Request):
    """Calculate B-BBEE preference points for tender."""
    data = json.loads(await request.body())
    result = engine.calculate_preference_points(
        data.get("price", 1000000),
        data.get("bbee_level", 4),
        data.get("functionality_score", 70),
        data.get("system_type", "80/20")
    )
    return JSONResponse({"success": True, **result})


# ═══════════════════════════════════════════════════════════════════════════════
#  FUNDING ASSISTANT (v27.2)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/funding/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("funding_assistant", "FundingAssistant", "Funding assistant not available")
async def api_v25_funding_status(engine):
    """Get funding assistant overview."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/funding/sources", dependencies=[Depends(require_auth)])
@_omega_endpoint("funding_assistant", "FundingAssistant", "Funding assistant not available")
async def api_v25_funding_sources(engine, category: str = None):
    """Get all funding sources by category."""
    if category == "government":
        return JSONResponse({"success": True, **engine.get_government_funding()})
    elif category == "private":
        return JSONResponse({"success": True, **engine.get_private_funding()})
    elif category == "international":
        return JSONResponse({"success": True, **engine.get_international_funding()})
    elif category == "crowdfunding":
        return JSONResponse({"success": True, **engine.get_crowdfunding_platforms()})
    return JSONResponse({"success": True, "categories": ["government", "private", "international", "crowdfunding"]})


@router.post("/funding/check-eligibility", dependencies=[Depends(require_auth)])
@_omega_endpoint("funding_assistant", "FundingAssistant", "Funding assistant not available")
async def api_v25_funding_check_eligibility(engine, request: Request):
    """Check funding eligibility based on profile."""
    data = json.loads(await request.body())
    result = engine.check_eligibility(data)
    return JSONResponse({"success": True, **result})


@router.post("/funding/calculate", dependencies=[Depends(require_auth)])
@_omega_endpoint("funding_assistant", "FundingAssistant", "Funding assistant not available")
async def api_v25_funding_calculate(engine, request: Request):
    """Calculate funding repayment and cash flow projections."""
    data = json.loads(await request.body())
    result = engine.funding_calculator(
        data.get("amount", 100000),
        data.get("rate", 10.0),
        data.get("months", 60),
        data.get("type", "loan")
    )
    return JSONResponse({"success": True, **result})


# ═══════════════════════════════════════════════════════════════════════════════
#  LOAN MASTERY ADVISOR (v27.2)
#  Teaches how to use loans as wealth-building tools, not debt traps
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/loan-mastery/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("loan_mastery", "LoanMasteryAdvisor", "Loan mastery advisor not available")
async def api_v25_loan_mastery_status(engine):
    """Get loan mastery advisor overview."""
    return JSONResponse({"success": True, **engine.get_status()})


@router.get("/loan-mastery/good-vs-bad-debt", dependencies=[Depends(require_auth)])
@_omega_endpoint("loan_mastery", "LoanMasteryAdvisor", "Loan mastery advisor not available")
async def api_v25_loan_mastery_good_vs_bad(engine):
    """Learn the difference between good debt and bad debt."""
    return JSONResponse({"success": True, **engine.get_good_vs_bad_debt()})


@router.post("/loan-mastery/compare-scenarios", dependencies=[Depends(require_auth)])
@_omega_endpoint("loan_mastery", "LoanMasteryAdvisor", "Loan mastery advisor not available")
async def api_v25_loan_mastery_compare(engine, request: Request):
    """Compare loan scenarios (deposit, term, rate variations)."""
    data = json.loads(await request.body())
    result = engine.compare_loan_scenarios(
        data.get("amount", 1000000),
        data.get("term_years", 20),
        data.get("rate", 11.25),
        data.get("deposit", 0)
    )
    return JSONResponse({"success": True, **result})


@router.post("/loan-mastery/wealth-from-debt", dependencies=[Depends(require_auth)])
@_omega_endpoint("loan_mastery", "LoanMasteryAdvisor", "Loan mastery advisor not available")
async def api_v25_loan_mastery_wealth(engine, request: Request):
    """Calculate wealth building through strategic debt (e.g., property)."""
    data = json.loads(await request.body())
    result = engine.calculate_wealth_from_debt(
        data.get("property_value", 1500000),
        data.get("bond_amount", 1200000),
        data.get("years", 20),
        data.get("appreciation_rate", 6.0)
    )
    return JSONResponse({"success": True, **result})


@router.post("/loan-mastery/debt-consolidation", dependencies=[Depends(require_auth)])
@_omega_endpoint("loan_mastery", "LoanMasteryAdvisor", "Loan mastery advisor not available")
async def api_v25_loan_mastery_consolidation(engine, request: Request):
    """Calculate savings from consolidating multiple high-interest debts."""
    data = json.loads(await request.body())
    result = engine.debt_consolidation_calculator(data.get("debts", []))
    return JSONResponse({"success": True, **result})


@router.post("/loan-mastery/refinance", dependencies=[Depends(require_auth)])
@_omega_endpoint("loan_mastery", "LoanMasteryAdvisor", "Loan mastery advisor not available")
async def api_v25_loan_mastery_refinance(engine, request: Request):
    """Analyze refinancing — break-even point and total savings."""
    data = json.loads(await request.body())
    result = engine.refinance_analyzer(
        data.get("current_rate", 11.25),
        data.get("new_rate", 10.5),
        data.get("remaining_years", 15),
        data.get("outstanding_balance", 800000),
        data.get("switching_costs", 25000)
    )
    return JSONResponse({"success": True, **result})


@router.get("/loan-mastery/credit-score", dependencies=[Depends(require_auth)])
@_omega_endpoint("loan_mastery", "LoanMasteryAdvisor", "Loan mastery advisor not available")
async def api_v25_loan_mastery_credit(engine):
    """Get SA credit score guide with bureau info and improvement tips."""
    return JSONResponse({"success": True, **engine.credit_score_guide()})


@router.post("/loan-mastery/early-settlement", dependencies=[Depends(require_auth)])
@_omega_endpoint("loan_mastery", "LoanMasteryAdvisor", "Loan mastery advisor not available")
async def api_v25_loan_mastery_early_settlement(engine, request: Request):
    """Calculate savings from early/extra loan repayments."""
    data = json.loads(await request.body())
    result = engine.calculate_early_settlement(
        data.get("balance", 500000),
        data.get("rate", 11.25),
        data.get("months_remaining", 120),
        data.get("extra_monthly", 2000)
    )
    return JSONResponse({"success": True, **result})


@router.post("/loan-mastery/settlement-vs-investing", dependencies=[Depends(require_auth)])
@_omega_endpoint("loan_mastery", "LoanMasteryAdvisor", "Loan mastery advisor not available")
async def api_v25_loan_mastery_settle_vs_invest(engine, request: Request):
    """Should you pay off your loan early or invest the extra money?"""
    data = json.loads(await request.body())
    result = engine.settlement_vs_investing(
        data.get("extra_amount", 2000),
        data.get("loan_rate", 11.25),
        data.get("investment_return", 10.0),
        data.get("years", 10)
    )
    return JSONResponse({"success": True, **result})


@router.get("/loan-mastery/red-flags", dependencies=[Depends(require_auth)])
@_omega_endpoint("loan_mastery", "LoanMasteryAdvisor", "Loan mastery advisor not available")
async def api_v25_loan_mastery_red_flags(engine):
    """Get debt warning signs and help resources."""
    return JSONResponse({"success": True, **engine.get_red_flags()})


# ═══════════════════════════════════════════════════════════════════════════════
#  SKILLS ENGINE (v27.2)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/skills/trades", dependencies=[Depends(require_auth)])
@_omega_endpoint("skills_engine", "SkillsEngine", "Skills engine not available")
async def api_v25_skills_trades(engine, category: str = None):
    """Get all vocational trades and skills data."""
    return JSONResponse({"success": True, **engine.get_trades(category)})


@router.get("/skills/trades/{trade_id}", dependencies=[Depends(require_auth)])
@_omega_endpoint("skills_engine", "SkillsEngine", "Skills engine not available")
async def api_v25_skills_trade_detail(engine, trade_id: str):
    """Get detailed info for a specific trade."""
    return JSONResponse({"success": True, **engine.get_trade_detail(trade_id)})


@router.get("/skills/setas", dependencies=[Depends(require_auth)])
@_omega_endpoint("skills_engine", "SkillsEngine", "Skills engine not available")
async def api_v25_skills_setas(engine, seta_code: str = None):
    """Get SETA (Sector Education and Training Authority) information."""
    return JSONResponse({"success": True, **engine.get_seta_info(seta_code)})


@router.post("/skills/apprenticeship-cost", dependencies=[Depends(require_auth)])
@_omega_endpoint("skills_engine", "SkillsEngine", "Skills engine not available")
async def api_v25_skills_apprenticeship_cost(engine, request: Request):
    """Calculate estimated apprenticeship cost for a trade."""
    data = json.loads(await request.body())
    result = engine.calculate_apprenticeship_cost(
        data.get("trade_id", "electrician"),
        data.get("years", 3)
    )
    return JSONResponse({"success": True, **result})


@router.get("/skills/search", dependencies=[Depends(require_auth)])
@_omega_endpoint("skills_engine", "SkillsEngine", "Skills engine not available")
async def api_v25_skills_search(engine, q: str = ""):
    """Search trades and skills."""
    return JSONResponse({"success": True, **engine.search(q)})


logger.info(
    "v27 Omega endpoints registered: 301+ endpoints across 76 Omega AI modules"
)


# ---------------------------------------------------------------------------
# Notification Hub Endpoints (v29.0.0)
# ---------------------------------------------------------------------------

@router.get("/notifications", dependencies=[Depends(require_auth)])
async def api_v25_notifications(
    request: Request,
    user_id: Optional[str] = None,
    unread_only: bool = False,
    notification_type: Optional[str] = None,
    limit: int = 50,
):
    """Get notifications for the authenticated user.

    Query params:
        user_id:            Filter by user (defaults to token subject).
        unread_only:        If true, return only unread items.
        notification_type:  Filter by type (e.g. 'tender_deadline').
        limit:              Max items to return (default 50).
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()

    # Fallback: extract user_id from token if not provided
    if user_id is None:
        user_id = getattr(request.state, "user_id", "anonymous")

    result = hub.get_notifications(
        user_id=user_id,
        unread_only=unread_only,
        notification_type=notification_type,
        limit=limit,
    )
    return JSONResponse({"success": True, **result})



@router.get("/notifications/unread-count", dependencies=[Depends(require_auth)])
async def api_v25_notifications_unread_count(
    request: Request,
    user_id: Optional[str] = None,
):
    """Return the unread notification count for the badge indicator.

    This is a lightweight endpoint polled every 60s by the frontend
    and also pushed over WebSocket for real-time updates.
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    if user_id is None:
        user_id = getattr(request.state, "user_id", "anonymous")

    result = hub.get_unread_count(user_id)
    return JSONResponse({"success": True, **result})



@router.post("/notifications/mark-read", dependencies=[Depends(require_auth)])
async def api_v25_notifications_mark_read(request: Request):
    """Mark a single notification as read.

    Body: { "notification_id": "<uuid>" }
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    try:
        data = json.loads(await request.body())
    except json.JSONDecodeError:
        return JSONResponse(
            {"success": False, "error": "Invalid JSON body"},
            status_code=400,
        )

    result = hub.mark_read(data.get("notification_id"))
    return JSONResponse(result)



@router.post("/notifications/mark-all-read", dependencies=[Depends(require_auth)])
async def api_v25_notifications_mark_all_read(request: Request):
    """Mark all notifications as read for a user.

    Body: { "user_id": "<uuid>" }  (optional, falls back to token)
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    try:
        data = json.loads(await request.body())
    except json.JSONDecodeError:
        data = {}

    user_id = data.get("user_id") or getattr(request.state, "user_id", None)
    result = hub.mark_all_read(user_id)
    return JSONResponse(result)



@router.get("/notifications/settings", dependencies=[Depends(require_auth)])
async def api_v25_notification_settings(
    request: Request,
    user_id: Optional[str] = None,
):
    """Get notification preferences for the authenticated user."""
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    if user_id is None:
        user_id = getattr(request.state, "user_id", "anonymous")

    result = hub.get_notification_settings(user_id)
    return JSONResponse({"success": True, **result})



@router.post("/notifications/settings", dependencies=[Depends(require_auth)])
async def api_v25_notification_settings_update(request: Request):
    """Update notification preferences (partial merge).

    Body: { "user_id": "...", "settings": { ... } }
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    try:
        data = json.loads(await request.body())
    except json.JSONDecodeError:
        return JSONResponse(
            {"success": False, "error": "Invalid JSON body"},
            status_code=400,
        )

    user_id = data.get("user_id") or getattr(request.state, "user_id", "anonymous")
    settings = data.get("settings", {})

    result = hub.update_settings(user_id, settings)
    return JSONResponse(result)



@router.post("/notifications/seed", dependencies=[Depends(require_auth)])
async def api_v25_notifications_seed(request: Request):
    """Generate sample notifications for demo / onboarding.

    Body: { "user_id": "..." }  (optional)
    """
    from backend.notification_hub import NotificationHub

    hub = NotificationHub()
    try:
        data = json.loads(await request.body())
    except json.JSONDecodeError:
        data = {}

    user_id = data.get("user_id") or getattr(request.state, "user_id", "anonymous")
    created = hub.generate_sample_notifications(user_id)

    return JSONResponse({
        "success": True,
        "seeded": len(created),
        "notification_ids": [n.id for n in created],
    })


# ---------------------------------------------------------------------------
# AI Brain Endpoints (v29.0.0) — LLM-powered chat with streaming
# ---------------------------------------------------------------------------

@router.post("/ai-brain/chat", dependencies=[Depends(require_auth)])
async def api_v25_ai_brain_chat(request: Request):
    """Main AI brain chat endpoint — processes natural language queries.

    Uses OpenAI GPT-4o-mini with function calling when LLM is available,
    falls back to keyword-based routing when OPENAI_API_KEY is not set.
    """
    try:
        mod = __import__("omega_ai.ai_brain", fromlist=["AIBrain"])
        if not mod:
            raise HTTPException(status_code=503, detail="AI Brain not available")
        data = json.loads(await request.body())
        brain = mod.AIBrain()
        result = brain.process_message(
            data.get("message", ""),
            session_id=data.get("session_id", "default"),
            language=data.get("language", "auto"),
            user_id=data.get("user_id"),
        )
        return JSONResponse({"success": True, "response": result})
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("AI Brain chat error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/ai-brain/chat/stream", dependencies=[Depends(require_auth)])
async def api_v25_ai_brain_chat_stream(request: Request):
    """Stream AI Brain response in real-time via Server-Sent Events (SSE).

    Yields JSON chunks: {"type": "stream", "token": "...", "text": "..."}
    Final chunk: {"type": "done", "text": "..."}
    Requires OPENAI_API_KEY for LLM streaming; falls back to non-streaming
    response if LLM is unavailable.
    """
    import asyncio
    try:
        mod = __import__("omega_ai.ai_brain", fromlist=["AIBrain"])
        if not mod:
            raise HTTPException(status_code=503, detail="AI Brain not available")
        data = json.loads(await request.body())
        brain = mod.AIBrain()

        async def event_generator():
            try:
                loop = asyncio.get_event_loop()
                # Run the sync generator in a thread pool
                def _stream():
                    return list(brain.process_message_stream(
                        data.get("message", ""),
                        session_id=data.get("session_id", "default"),
                        language=data.get("language", "auto"),
                        user_id=data.get("user_id"),
                    ))
                chunks = await loop.run_in_executor(None, _stream)
                for chunk in chunks:
                    yield f"data: {chunk}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as exc:
                yield f"data: {{\"type\": \"error\", \"message\": \"{str(exc)}\"}}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("AI Brain stream error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/ai-brain/capabilities", dependencies=[Depends(require_auth)])
async def api_v25_ai_brain_capabilities():
    """List all capabilities the AI Brain can access."""
    try:
        mod = __import__("omega_ai.ai_brain", fromlist=["AIBrain"])
        if not mod:
            raise HTTPException(status_code=503, detail="AI Brain not available")
        brain = mod.AIBrain()
        return JSONResponse({"success": True, "capabilities": brain.list_capabilities()})
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("AI Brain capabilities error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/ai-brain/status", dependencies=[Depends(require_auth)])
async def api_v25_ai_brain_status():
    """Get AI Brain health status including LLM activation state."""
    try:
        mod = __import__("omega_ai.ai_brain", fromlist=["AIBrain"])
        if not mod:
            raise HTTPException(status_code=503, detail="AI Brain not available")
        brain = mod.AIBrain()
        return JSONResponse({"success": True, **brain.get_status()})
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("AI Brain status error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
