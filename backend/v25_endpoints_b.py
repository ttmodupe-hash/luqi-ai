"""
LUQI AI v29 — Omega Endpoints Part B
Continues from v25_endpoints.py.  DO NOT import directly —
v25_endpoints_b registers its routes on the *same* router instance.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse

# Re-use the same router object from Part A
from backend.v25_endpoints import router, _omega_endpoint, require_auth

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  PERSONAL ASSISTANT (v4.0.0)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/assistant/tasks", dependencies=[Depends(require_auth)])
async def api_v25_assistant_tasks(status: str = None, priority: str = None):

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        assistant = mod.PersonalAssistant()
        result = assistant.list_tasks(status=status, priority=priority)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant tasks error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assistant/tasks", dependencies=[Depends(require_auth)])
async def api_v25_assistant_task_create(request: Request):

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        data = json.loads(await request.body())
        assistant = mod.PersonalAssistant()
        result = assistant.create_task(data.get("title"), data.get("description", ""),
                                        data.get("priority", "medium"), data.get("due_date"),
                                        data.get("tags"), data.get("recurring"))
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant task create error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assistant/tasks/{task_id}/complete", dependencies=[Depends(require_auth)])
async def api_v25_assistant_task_complete(task_id: str):

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        assistant = mod.PersonalAssistant()
        result = assistant.complete_task(task_id)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant task complete error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assistant/reminders", dependencies=[Depends(require_auth)])
async def api_v25_assistant_reminders():

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        assistant = mod.PersonalAssistant()
        result = assistant.get_reminders(upcoming_only=True)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant reminders error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assistant/reminders", dependencies=[Depends(require_auth)])
async def api_v25_assistant_reminder_create(request: Request):

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        data = json.loads(await request.body())
        assistant = mod.PersonalAssistant()
        result = assistant.set_reminder(data.get("title"), data.get("remind_at"),
                                         data.get("description", ""), data.get("repeat"))
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant reminder create error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assistant/notes", dependencies=[Depends(require_auth)])
async def api_v25_assistant_notes(category: str = None, search: str = None):

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        assistant = mod.PersonalAssistant()
        result = assistant.list_notes(category=category, search=search)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant notes error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assistant/notes", dependencies=[Depends(require_auth)])
async def api_v25_assistant_note_create(request: Request):

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        data = json.loads(await request.body())
        assistant = mod.PersonalAssistant()
        result = assistant.create_note(data.get("title"), data.get("content", ""),
                                        data.get("category", "general"), data.get("tags"))
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant note create error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assistant/events", dependencies=[Depends(require_auth)])
async def api_v25_assistant_events(date: str = None):

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        assistant = mod.PersonalAssistant()
        result = assistant.get_events(date=date)
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant events error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assistant/events", dependencies=[Depends(require_auth)])
async def api_v25_assistant_event_create(request: Request):

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        data = json.loads(await request.body())
        assistant = mod.PersonalAssistant()
        result = assistant.add_event(data.get("title"), data.get("start_time"),
                                      data.get("end_time"), data.get("description", ""),
                                      data.get("location", ""), data.get("attendees"))
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant event create error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assistant/briefing", dependencies=[Depends(require_auth)])
async def api_v25_assistant_briefing():

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        assistant = mod.PersonalAssistant()
        result = assistant.get_daily_briefing()
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant briefing error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assistant/weekly-summary", dependencies=[Depends(require_auth)])
async def api_v25_assistant_weekly():

    try:
        mod = _omega("personal_assistant")
        if not mod:
            raise HTTPException(status_code=503, detail="Personal assistant not available")
        assistant = mod.PersonalAssistant()
        result = assistant.get_weekly_summary()
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Assistant weekly error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cyber/assessment/categories", dependencies=[Depends(require_auth)])
async def api_v25_cyber_assessment_categories():
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.get_assessment_categories()})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber assessment categories error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/cyber/assessment/run", dependencies=[Depends(require_auth)])
async def api_v25_cyber_assessment_run(request: Request):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        data = json.loads(await request.body())
        engine = mod.CybersecurityEngine()
        result = engine.run_security_assessment(data.get("domain"), data.get("assessment_type", "general"))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber assessment error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/cyber/training/modules", dependencies=[Depends(require_auth), Depends(rate_limit_check)])
async def api_v25_cyber_training_modules(category: str = None, level: str = None):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.get_training_modules(category, level)})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber training modules error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/cyber/training/lesson", dependencies=[Depends(require_auth)])
async def api_v25_cyber_training_lesson(module_id: str, lesson_id: str):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.get_lesson(module_id, lesson_id)})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber lesson error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/cyber/training/assess", dependencies=[Depends(require_auth), Depends(rate_limit_check)])
async def api_v25_cyber_training_assess(request: Request):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        data = json.loads(await request.body())
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.assess_knowledge(data.get("answers", []))})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber assess error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/cyber/training/path", dependencies=[Depends(require_auth)])
async def api_v25_cyber_training_path(request: Request):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        data = json.loads(await request.body())
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.generate_learning_path(data.get("current_level", "beginner"), data.get("interests"))})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber path error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/cyber/labs", dependencies=[Depends(require_auth)])
async def api_v25_cyber_labs(category: str = None):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.get_practice_labs(category)})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber labs error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/cyber/incident/playbooks", dependencies=[Depends(require_auth)])
async def api_v25_cyber_incident_playbooks(incident_type: str = None):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.get_incident_playbooks(incident_type)})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber playbooks error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/cyber/threat/analyze", dependencies=[Depends(require_auth)])
async def api_v25_cyber_threat_analyze(request: Request):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        data = json.loads(await request.body())
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.analyze_threat(data.get("indicators", {}))})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber threat error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/cyber/compliance/frameworks", dependencies=[Depends(require_auth)])
async def api_v25_cyber_compliance_frameworks():
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.get_compliance_frameworks()})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber frameworks error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/cyber/compliance/controls", dependencies=[Depends(require_auth)])
async def api_v25_cyber_compliance_controls(framework_id: str):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.get_compliance_controls(framework_id)})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber controls error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/cyber/compliance/assess", dependencies=[Depends(require_auth)])
async def api_v25_cyber_compliance_assess(request: Request):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        data = json.loads(await request.body())
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.assess_compliance(data.get("framework_id"), data.get("responses", {}))})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber compliance error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/cyber/popia", dependencies=[Depends(require_auth)])
async def api_v25_cyber_popia():
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.get_popia_guidelines()})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber POPIA error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/cyber/password/check", dependencies=[Depends(require_auth)])
async def api_v25_cyber_password_check(request: Request):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        data = json.loads(await request.body())
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.check_password_strength(data.get("password", ""))})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber password error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/cyber/cve", dependencies=[Depends(require_auth)])
async def api_v25_cyber_cve(keyword: str = None, severity: str = None):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.get_cve_database(keyword, severity)})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber CVE error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/cyber/policy/generate", dependencies=[Depends(require_auth)])
async def api_v25_cyber_policy_generate(policy_type: str = "general", organization_name: str = "Organization"):
    try:
        mod = _omega("cybersecurity_engine")
        if not mod: raise HTTPException(status_code=503, detail="Cybersecurity engine not available")
        engine = mod.CybersecurityEngine()
        return JSONResponse({"success": True, **engine.generate_security_policy(policy_type, organization_name)})
    except HTTPException: raise
    except Exception as e: logger.error("Cyber policy error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/load-shedding/status", dependencies=[Depends(require_auth)])
@_omega_endpoint("load_shedding", "LoadSheddingManager", "Load shedding tracker not available")
async def api_v25_loadshedding_status(engine):

    return JSONResponse({"success": True, **engine.get_current_stage()})

@router.get("/load-shedding/data", dependencies=[Depends(require_auth)])
@_omega_endpoint("load_shedding", "LoadSheddingManager", "Load shedding tracker not available")
async def api_v25_loadshedding_data(engine):

    return JSONResponse({"success": True, **engine.get_tariff_info()})

@router.post("/load-shedding/calculate", dependencies=[Depends(require_auth)])
@_omega_endpoint("load_shedding", "LoadSheddingManager", "Load shedding tracker not available")
async def api_v25_loadshedding_calculate(engine, request: Request):

    data = json.loads(await request.body())
    result = engine.calculate_backup_cost(data.get("load_kw", 5.0), data.get("backup_hours", 4))
    return JSONResponse({"success": True, **result})

@router.get("/load-shedding/areas", dependencies=[Depends(require_auth)])
@_omega_endpoint("load_shedding", "LoadSheddingManager", "Load shedding tracker not available")
async def api_v25_loadshedding_areas(engine):

    return JSONResponse({"success": True, **engine.get_area_list()})

@router.get("/solar/status", dependencies=[Depends(require_auth)])
async def api_v25_solar_status():
    try:
        mod = _omega("solar_calculator")
        if not mod: raise HTTPException(status_code=503, detail="Solar calculator not available")
        engine = mod.SolarCalculator()
        return JSONResponse({"success": True, **engine.get_irradiance_data()})
    except HTTPException: raise
    except Exception as e: logger.error("Solar status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/solar/info", dependencies=[Depends(require_auth)])
async def api_v25_solar_info():
    try:
        mod = _omega("solar_calculator")
        if not mod: raise HTTPException(status_code=503, detail="Solar calculator not available")
        engine = mod.SolarCalculator()
        return JSONResponse({"success": True, **engine.get_solar_tips()})
    except HTTPException: raise
    except Exception as e: logger.error("Solar info error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/solar/calculate", dependencies=[Depends(require_auth)])
async def api_v25_solar_calculate(request: Request):
    try:
        mod = _omega("solar_calculator")
        if not mod: raise HTTPException(status_code=503, detail="Solar calculator not available")
        data = json.loads(await request.body())
        engine = mod.SolarCalculator()
        result = engine.calculate_system_size(data.get("monthly_kwh", 900), data.get("roof_area_m2"))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Solar calculate error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/solar/batteries", dependencies=[Depends(require_auth)])
async def api_v25_solar_batteries():
    try:
        mod = _omega("solar_calculator")
        if not mod: raise HTTPException(status_code=503, detail="Solar calculator not available")
        engine = mod.SolarCalculator()
        return JSONResponse({"success": True, **engine.get_battery_comparison()})
    except HTTPException: raise
    except Exception as e: logger.error("Solar batteries error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/loan/status", dependencies=[Depends(require_auth)])
async def api_v25_loan_status():
    try:
        mod = _omega("loan_calculator")
        if not mod: raise HTTPException(status_code=503, detail="Loan calculator not available")
        engine = mod.LoanCalculator()
        return JSONResponse({"success": True, **engine.get_prime_rate()})
    except HTTPException: raise
    except Exception as e: logger.error("Loan status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/loan/info", dependencies=[Depends(require_auth)])
async def api_v25_loan_info():
    try:
        mod = _omega("loan_calculator")
        if not mod: raise HTTPException(status_code=503, detail="Loan calculator not available")
        engine = mod.LoanCalculator()
        return JSONResponse({"success": True, **engine.get_loan_guidelines()})
    except HTTPException: raise
    except Exception as e: logger.error("Loan info error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/loan/calculate", dependencies=[Depends(require_auth)])
async def api_v25_loan_calculate(request: Request):
    try:
        mod = _omega("loan_calculator")
        if not mod: raise HTTPException(status_code=503, detail="Loan calculator not available")
        data = json.loads(await request.body())
        engine = mod.LoanCalculator()
        result = engine.calculate_personal_loan(data.get("principal", 50000), data.get("annual_rate", 18.0), data.get("months", 36))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Loan calculate error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/loan/compare", dependencies=[Depends(require_auth)])
async def api_v25_loan_compare(request: Request):
    try:
        mod = _omega("loan_calculator")
        if not mod: raise HTTPException(status_code=503, detail="Loan calculator not available")
        data = json.loads(await request.body())
        engine = mod.LoanCalculator()
        result = engine.compare_loans(data.get("loan_options", []))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Loan compare error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/insurance/status", dependencies=[Depends(require_auth)])
async def api_v25_insurance_status():
    try:
        mod = _omega("insurance_advisor")
        if not mod: raise HTTPException(status_code=503, detail="Insurance advisor not available")
        engine = mod.InsuranceAdvisor()
        return JSONResponse({"success": True, "tips": engine.get_insurance_tips()})
    except HTTPException: raise
    except Exception as e: logger.error("Insurance status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/insurance/info", dependencies=[Depends(require_auth)])
async def api_v25_insurance_info(insurance_type: str = "vehicle"):
    try:
        mod = _omega("insurance_advisor")
        if not mod: raise HTTPException(status_code=503, detail="Insurance advisor not available")
        engine = mod.InsuranceAdvisor()
        return JSONResponse({"success": True, **engine.get_claims_guide(insurance_type)})
    except HTTPException: raise
    except Exception as e: logger.error("Insurance info error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/insurance/calculate", dependencies=[Depends(require_auth)])
async def api_v25_insurance_calculate(request: Request):
    try:
        mod = _omega("insurance_advisor")
        if not mod: raise HTTPException(status_code=503, detail="Insurance advisor not available")
        data = json.loads(await request.body())
        engine = mod.InsuranceAdvisor()
        result = engine.get_vehicle_quote(data.get("vehicle_value", 300000), data.get("driver_age", 35),
                                          data.get("usage", "personal"), data.get("license_years", 5),
                                          data.get("claims_history", "none"), data.get("security_features"))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Insurance calculate error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/insurance/compare", dependencies=[Depends(require_auth)])
async def api_v25_insurance_compare(request: Request):
    try:
        mod = _omega("insurance_advisor")
        if not mod: raise HTTPException(status_code=503, detail="Insurance advisor not available")
        data = json.loads(await request.body())
        engine = mod.InsuranceAdvisor()
        result = engine.compare_medical_aids(data.get("budget", 5000), data.get("family_size", 1))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Insurance compare error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/payroll/status", dependencies=[Depends(require_auth)])
async def api_v25_payroll_status():
    try:
        mod = _omega("hr_payroll")
        if not mod: raise HTTPException(status_code=503, detail="HR payroll not available")
        engine = mod.HRPayroll()
        return JSONResponse({"success": True, **engine.get_tax_summary()})
    except HTTPException: raise
    except Exception as e: logger.error("Payroll status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/payroll/employees", dependencies=[Depends(require_auth)])
async def api_v25_payroll_employees():
    try:
        mod = _omega("hr_payroll")
        if not mod: raise HTTPException(status_code=503, detail="HR payroll not available")
        engine = mod.HRPayroll()
        return JSONResponse({"success": True, "employees": engine.get_all_employees()})
    except HTTPException: raise
    except Exception as e: logger.error("Payroll employees error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/payroll/calculate", dependencies=[Depends(require_auth)])
async def api_v25_payroll_calculate(request: Request):
    try:
        mod = _omega("hr_payroll")
        if not mod: raise HTTPException(status_code=503, detail="HR payroll not available")
        data = json.loads(await request.body())
        engine = mod.HRPayroll()
        result = engine.calculate_payroll(data.get("employees", []))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Payroll calculate error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/payroll/labour-law", dependencies=[Depends(require_auth)])
async def api_v25_payroll_labour_law(topic: str = None):
    try:
        mod = _omega("hr_payroll")
        if not mod: raise HTTPException(status_code=503, detail="HR payroll not available")
        engine = mod.HRPayroll()
        return JSONResponse({"success": True, **engine.get_labour_law_reference(topic)})
    except HTTPException: raise
    except Exception as e: logger.error("Payroll labour law error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoice/status", dependencies=[Depends(require_auth)])
async def api_v25_invoice_status():
    try:
        mod = _omega("invoice_system")
        if not mod: raise HTTPException(status_code=503, detail="Invoice system not available")
        engine = mod.InvoiceSystem()
        return JSONResponse({"success": True, **engine.get_financial_summary()})
    except HTTPException: raise
    except Exception as e: logger.error("Invoice status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoice/list", dependencies=[Depends(require_auth)])
async def api_v25_invoice_list(status: str = None):
    try:
        mod = _omega("invoice_system")
        if not mod: raise HTTPException(status_code=503, detail="Invoice system not available")
        engine = mod.InvoiceSystem()
        return JSONResponse({"success": True, **engine.list_invoices(status=status)})
    except HTTPException: raise
    except Exception as e: logger.error("Invoice list error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoice/create", dependencies=[Depends(require_auth)])
async def api_v25_invoice_create(request: Request):
    try:
        mod = _omega("invoice_system")
        if not mod: raise HTTPException(status_code=503, detail="Invoice system not available")
        data = json.loads(await request.body())
        engine = mod.InvoiceSystem()
        result = engine.create_invoice(data.get("client_name", ""), data.get("items", []), data.get("tax_rate", 0.15), data.get("notes", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Invoice create error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoice/report", dependencies=[Depends(require_auth)])
async def api_v25_invoice_report(period: str = "this_month"):
    try:
        mod = _omega("invoice_system")
        if not mod: raise HTTPException(status_code=503, detail="Invoice system not available")
        engine = mod.InvoiceSystem()
        return JSONResponse({"success": True, **engine.get_financial_summary(period=period)})
    except HTTPException: raise
    except Exception as e: logger.error("Invoice report error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/status", dependencies=[Depends(require_auth)])
async def api_v25_inventory_status():
    try:
        mod = _omega("inventory_manager")
        if not mod: raise HTTPException(status_code=503, detail="Inventory manager not available")
        engine = mod.InventoryManager()
        return JSONResponse({"success": True, **engine.get_inventory_value()})
    except HTTPException: raise
    except Exception as e: logger.error("Inventory status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/list", dependencies=[Depends(require_auth)])
async def api_v25_inventory_list(category: str = None):
    try:
        mod = _omega("inventory_manager")
        if not mod: raise HTTPException(status_code=503, detail="Inventory manager not available")
        engine = mod.InventoryManager()
        return JSONResponse({"success": True, **engine.get_stock_levels(category=category)})
    except HTTPException: raise
    except Exception as e: logger.error("Inventory list error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/inventory/create", dependencies=[Depends(require_auth)])
async def api_v25_inventory_create(request: Request):
    try:
        mod = _omega("inventory_manager")
        if not mod: raise HTTPException(status_code=503, detail="Inventory manager not available")
        data = json.loads(await request.body())
        engine = mod.InventoryManager()
        result = engine.add_item(data.get("name", ""), data.get("sku", ""), data.get("category", ""),
                                 data.get("quantity", 0), data.get("unit_cost", 0.0), data.get("reorder_level", 10))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Inventory create error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/alerts", dependencies=[Depends(require_auth)])
async def api_v25_inventory_alerts():
    try:
        mod = _omega("inventory_manager")
        if not mod: raise HTTPException(status_code=503, detail="Inventory manager not available")
        engine = mod.InventoryManager()
        return JSONResponse({"success": True, **engine.get_low_stock()})
    except HTTPException: raise
    except Exception as e: logger.error("Inventory alerts error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/crm/status", dependencies=[Depends(require_auth)])
async def api_v25_crm_status():
    try:
        mod = _omega("crm_system")
        if not mod: raise HTTPException(status_code=503, detail="CRM system not available")
        engine = mod.CRMSystem()
        return JSONResponse({"success": True, **engine.get_sales_analytics()})
    except HTTPException: raise
    except Exception as e: logger.error("CRM status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/crm/list", dependencies=[Depends(require_auth)])
async def api_v25_crm_list(tag: str = None):
    try:
        mod = _omega("crm_system")
        if not mod: raise HTTPException(status_code=503, detail="CRM system not available")
        engine = mod.CRMSystem()
        return JSONResponse({"success": True, **engine.get_contacts(tag=tag)})
    except HTTPException: raise
    except Exception as e: logger.error("CRM list error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/crm/create", dependencies=[Depends(require_auth)])
async def api_v25_crm_create(request: Request):
    try:
        mod = _omega("crm_system")
        if not mod: raise HTTPException(status_code=503, detail="CRM system not available")
        data = json.loads(await request.body())
        engine = mod.CRMSystem()
        result = engine.add_contact(data.get("name", ""), data.get("email", ""), data.get("phone", ""), data.get("company", ""), data.get("tags", []))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("CRM create error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/crm/pipeline", dependencies=[Depends(require_auth)])
async def api_v25_crm_pipeline():
    try:
        mod = _omega("crm_system")
        if not mod: raise HTTPException(status_code=503, detail="CRM system not available")
        engine = mod.CRMSystem()
        return JSONResponse({"success": True, **engine.get_pipeline()})
    except HTTPException: raise
    except Exception as e: logger.error("CRM pipeline error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/project/status", dependencies=[Depends(require_auth)])
async def api_v25_project_status():
    try:
        mod = _omega("project_manager")
        if not mod: raise HTTPException(status_code=503, detail="Project manager not available")
        engine = mod.ProjectManager()
        return JSONResponse({"success": True, **engine.get_team_workload()})
    except HTTPException: raise
    except Exception as e: logger.error("Project status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/project/list", dependencies=[Depends(require_auth)])
async def api_v25_project_list():
    try:
        mod = _omega("project_manager")
        if not mod: raise HTTPException(status_code=503, detail="Project manager not available")
        engine = mod.ProjectManager()
        return JSONResponse({"success": True, **engine.list_projects()})
    except HTTPException: raise
    except Exception as e: logger.error("Project list error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/project/create", dependencies=[Depends(require_auth)])
async def api_v25_project_create(request: Request):
    try:
        mod = _omega("project_manager")
        if not mod: raise HTTPException(status_code=503, detail="Project manager not available")
        data = json.loads(await request.body())
        engine = mod.ProjectManager()
        result = engine.create_project(data.get("name", ""), data.get("description", ""), data.get("start_date"), data.get("end_date"))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Project create error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/project/board", dependencies=[Depends(require_auth)])
async def api_v25_project_board(project_id: str):
    try:
        mod = _omega("project_manager")
        if not mod: raise HTTPException(status_code=503, detail="Project manager not available")
        engine = mod.ProjectManager()
        return JSONResponse({"success": True, **engine.get_kanban_board(project_id)})
    except HTTPException: raise
    except Exception as e: logger.error("Project board error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/communication/status", dependencies=[Depends(require_auth)])
async def api_v25_communication_status():
    try:
        mod = _omega("communication_hub")
        if not mod: raise HTTPException(status_code=503, detail="Communication hub not available")
        engine = mod.CommunicationHub()
        return JSONResponse({"success": True, **engine.get_sending_history()})
    except HTTPException: raise
    except Exception as e: logger.error("Communication status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/communication/list", dependencies=[Depends(require_auth)])
async def api_v25_communication_list():
    try:
        mod = _omega("communication_hub")
        if not mod: raise HTTPException(status_code=503, detail="Communication hub not available")
        engine = mod.CommunicationHub()
        return JSONResponse({"success": True, **engine.get_contact_lists()})
    except HTTPException: raise
    except Exception as e: logger.error("Communication list error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/communication/send", dependencies=[Depends(require_auth)])
async def api_v25_communication_send(request: Request):
    try:
        mod = _omega("communication_hub")
        if not mod: raise HTTPException(status_code=503, detail="Communication hub not available")
        data = json.loads(await request.body())
        engine = mod.CommunicationHub()
        result = engine.send_bulk_sms(data.get("list_id", ""), data.get("message", ""))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Communication send error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/communication/cost", dependencies=[Depends(require_auth)])
async def api_v25_communication_cost(recipient_count: int = 0, message_type: str = "sms"):
    try:
        mod = _omega("communication_hub")
        if not mod: raise HTTPException(status_code=503, detail="Communication hub not available")
        engine = mod.CommunicationHub()
        return JSONResponse({"success": True, **engine.estimate_cost(recipient_count, message_type)})
    except HTTPException: raise
    except Exception as e: logger.error("Communication cost error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/weather/status", dependencies=[Depends(require_auth)])
async def api_v25_weather_status(city: str = "Johannesburg"):
    try:
        mod = _omega("weather_africa")
        if not mod: raise HTTPException(status_code=503, detail="Weather service not available")
        engine = mod.WeatherAfrica()
        return JSONResponse({"success": True, **engine.get_current(city=city)})
    except HTTPException: raise
    except Exception as e: logger.error("Weather status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/weather/forecast", dependencies=[Depends(require_auth)])
async def api_v25_weather_forecast(city: str = "Johannesburg", days: int = 5):
    try:
        mod = _omega("weather_africa")
        if not mod: raise HTTPException(status_code=503, detail="Weather service not available")
        engine = mod.WeatherAfrica()
        return JSONResponse({"success": True, **engine.get_forecast(city=city, days=days)})
    except HTTPException: raise
    except Exception as e: logger.error("Weather forecast error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/weather/alerts", dependencies=[Depends(require_auth)])
async def api_v25_weather_alerts():
    try:
        mod = _omega("weather_africa")
        if not mod: raise HTTPException(status_code=503, detail="Weather service not available")
        engine = mod.WeatherAfrica()
        return JSONResponse({"success": True, **engine.get_disaster_alerts()})
    except HTTPException: raise
    except Exception as e: logger.error("Weather alerts error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/weather/climate", dependencies=[Depends(require_auth)])
async def api_v25_weather_climate(city: str = "Johannesburg"):
    try:
        mod = _omega("weather_africa")
        if not mod: raise HTTPException(status_code=503, detail="Weather service not available")
        engine = mod.WeatherAfrica()
        return JSONResponse({"success": True, **engine.get_climate_data(city=city)})
    except HTTPException: raise
    except Exception as e: logger.error("Weather climate error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/travel/destinations", dependencies=[Depends(require_auth)])
async def api_v25_travel_destinations(country: str = None, category: str = None):
    try:
        mod = _omega("travel_africa")
        if not mod: raise HTTPException(status_code=503, detail="Travel service not available")
        engine = mod.TravelAfrica()
        return JSONResponse({"success": True, **engine.get_destinations(country=country, category=category)})
    except HTTPException: raise
    except Exception as e: logger.error("Travel destinations error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/travel/visa", dependencies=[Depends(require_auth)])
async def api_v25_travel_visa(from_country: str, to_country: str):
    try:
        mod = _omega("travel_africa")
        if not mod: raise HTTPException(status_code=503, detail="Travel service not available")
        engine = mod.TravelAfrica()
        return JSONResponse({"success": True, **engine.get_visa_info(from_country=from_country, to_country=to_country)})
    except HTTPException: raise
    except Exception as e: logger.error("Travel visa error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/travel/itinerary", dependencies=[Depends(require_auth)])
async def api_v25_travel_itinerary(request: Request):
    try:
        mod = _omega("travel_africa")
        if not mod: raise HTTPException(status_code=503, detail="Travel service not available")
        data = json.loads(await request.body())
        engine = mod.TravelAfrica()
        result = engine.build_itinerary(data.get("destinations", []), data.get("days", 7), data.get("budget_tier", "mid"))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Travel itinerary error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/travel/guide", dependencies=[Depends(require_auth)])
async def api_v25_travel_guide(city: str = "Cape Town"):
    try:
        mod = _omega("travel_africa")
        if not mod: raise HTTPException(status_code=503, detail="Travel service not available")
        engine = mod.TravelAfrica()
        return JSONResponse({"success": True, **engine.get_local_guide(city=city)})
    except HTTPException: raise
    except Exception as e: logger.error("Travel guide error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/mental-health/status", dependencies=[Depends(require_auth)])
async def api_v25_mentalhealth_status():
    try:
        mod = _omega("mental_health")
        if not mod: raise HTTPException(status_code=503, detail="Mental health service not available")
        engine = mod.MentalHealth()
        return JSONResponse({"success": True, "available_techniques": list(engine.MINDFULNESS_TECHNIQUES.keys()) if hasattr(engine, 'MINDFULNESS_TECHNIQUES') else [], "timestamp": __import__('datetime').datetime.now().isoformat()})
    except HTTPException: raise
    except Exception as e: logger.error("Mental health status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/mental-health/assess", dependencies=[Depends(require_auth)])
async def api_v25_mentalhealth_assess(request: Request):
    try:
        mod = _omega("mental_health")
        if not mod: raise HTTPException(status_code=503, detail="Mental health service not available")
        data = json.loads(await request.body())
        engine = mod.MentalHealth()
        return JSONResponse({"success": True, **engine.assess_stress(data.get("answers", []))})
    except HTTPException: raise
    except Exception as e: logger.error("Mental health assess error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/mental-health/mindfulness", dependencies=[Depends(require_auth)])
async def api_v25_mentalhealth_mindfulness(technique: str = "breathing"):
    try:
        mod = _omega("mental_health")
        if not mod: raise HTTPException(status_code=503, detail="Mental health service not available")
        engine = mod.MentalHealth()
        return JSONResponse({"success": True, **engine.get_mindfulness_guide(technique=technique)})
    except HTTPException: raise
    except Exception as e: logger.error("Mental health mindfulness error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/mental-health/crisis", dependencies=[Depends(require_auth)])
async def api_v25_mentalhealth_crisis(country: str = "south_africa"):
    try:
        mod = _omega("mental_health")
        if not mod: raise HTTPException(status_code=503, detail="Mental health service not available")
        engine = mod.MentalHealth()
        return JSONResponse({"success": True, **engine.get_crisis_resources(country=country)})
    except HTTPException: raise
    except Exception as e: logger.error("Mental health crisis error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/parenting/milestone", dependencies=[Depends(require_auth)])
async def api_v25_parenting_milestone(age_months: int = 12):
    try:
        mod = _omega("parenting_guide")
        if not mod: raise HTTPException(status_code=503, detail="Parenting guide not available")
        engine = mod.ParentingGuide()
        return JSONResponse({"success": True, **engine.get_milestone_tracker(age_months=age_months)})
    except HTTPException: raise
    except Exception as e: logger.error("Parenting milestone error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/parenting/vaccines", dependencies=[Depends(require_auth)])
async def api_v25_parenting_vaccines(country: str = "south_africa"):
    try:
        mod = _omega("parenting_guide")
        if not mod: raise HTTPException(status_code=503, detail="Parenting guide not available")
        engine = mod.ParentingGuide()
        return JSONResponse({"success": True, **engine.get_vaccination_schedule(country=country)})
    except HTTPException: raise
    except Exception as e: logger.error("Parenting vaccines error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/parenting/nutrition", dependencies=[Depends(require_auth)])
async def api_v25_parenting_nutrition(child_age_months: int = 12):
    try:
        mod = _omega("parenting_guide")
        if not mod: raise HTTPException(status_code=503, detail="Parenting guide not available")
        engine = mod.ParentingGuide()
        return JSONResponse({"success": True, **engine.get_nutrition_guide(child_age_months=child_age_months)})
    except HTTPException: raise
    except Exception as e: logger.error("Parenting nutrition error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/parenting/safety", dependencies=[Depends(require_auth)])
async def api_v25_parenting_safety(category: str = "home"):
    try:
        mod = _omega("parenting_guide")
        if not mod: raise HTTPException(status_code=503, detail="Parenting guide not available")
        engine = mod.ParentingGuide()
        return JSONResponse({"success": True, **engine.get_safety_guide(category=category)})
    except HTTPException: raise
    except Exception as e: logger.error("Parenting safety error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/sports/status", dependencies=[Depends(require_auth)])
async def api_v25_sports_status():
    try:
        mod = _omega("sports_fitness")
        if not mod: raise HTTPException(status_code=503, detail="Sports fitness not available")
        engine = mod.SportsFitness()
        return JSONResponse({"success": True, "available_sports": list(engine.TRAINING_PROGRAMS.keys()) if hasattr(engine, 'TRAINING_PROGRAMS') else [], "event_count": len(engine.AFRICAN_SPORTS_EVENTS) if hasattr(engine, 'AFRICAN_SPORTS_EVENTS') else 0})
    except HTTPException: raise
    except Exception as e: logger.error("Sports status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/sports/events", dependencies=[Depends(require_auth)])
async def api_v25_sports_events(sport: str = None):
    try:
        mod = _omega("sports_fitness")
        if not mod: raise HTTPException(status_code=503, detail="Sports fitness not available")
        engine = mod.SportsFitness()
        return JSONResponse({"success": True, **engine.get_african_sports_events(sport=sport)})
    except HTTPException: raise
    except Exception as e: logger.error("Sports events error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/sports/program", dependencies=[Depends(require_auth)])
async def api_v25_sports_program(request: Request):
    try:
        mod = _omega("sports_fitness")
        if not mod: raise HTTPException(status_code=503, detail="Sports fitness not available")
        data = json.loads(await request.body())
        engine = mod.SportsFitness()
        result = engine.get_training_program(data.get("sport", "running"), data.get("level", "beginner"), data.get("weeks", 8))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Sports program error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/sports/zones", dependencies=[Depends(require_auth)])
async def api_v25_sports_zones(age: int = 30, max_hr: int = None):
    try:
        mod = _omega("sports_fitness")
        if not mod: raise HTTPException(status_code=503, detail="Sports fitness not available")
        engine = mod.SportsFitness()
        return JSONResponse({"success": True, **engine.calculate_training_zones(max_hr=max_hr, age=age)})
    except HTTPException: raise
    except Exception as e: logger.error("Sports zones error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/construction/status", dependencies=[Depends(require_auth)])
async def api_v25_construction_status():
    try:
        mod = _omega("construction_calc")
        if not mod: raise HTTPException(status_code=503, detail="Construction calculator not available")
        engine = mod.ConstructionCalculator()
        return JSONResponse({"success": True, **engine.get_all_material_costs()})
    except HTTPException: raise
    except Exception as e: logger.error("Construction status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/construction/costs", dependencies=[Depends(require_auth)])
async def api_v25_construction_costs(building_type: str = "residential", finish_level: str = "standard"):
    try:
        mod = _omega("construction_calc")
        if not mod: raise HTTPException(status_code=503, detail="Construction calculator not available")
        engine = mod.ConstructionCalculator()
        return JSONResponse({"success": True, **engine.calculate_cost_per_sqm(building_type, finish_level)})
    except HTTPException: raise
    except Exception as e: logger.error("Construction costs error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/construction/calculate", dependencies=[Depends(require_auth)])
async def api_v25_construction_calculate(request: Request):
    try:
        mod = _omega("construction_calc")
        if not mod: raise HTTPException(status_code=503, detail="Construction calculator not available")
        data = json.loads(await request.body())
        engine = mod.ConstructionCalculator()
        return JSONResponse({"success": True, **engine.calculate_materials(data.get("structure_type", "wall"), data.get("dimensions", {}))})
    except HTTPException: raise
    except Exception as e: logger.error("Construction calculate error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/construction/timeline", dependencies=[Depends(require_auth)])
async def api_v25_construction_timeline(building_type: str = "house", sqm: float = 100):
    try:
        mod = _omega("construction_calc")
        if not mod: raise HTTPException(status_code=503, detail="Construction calculator not available")
        engine = mod.ConstructionCalculator()
        return JSONResponse({"success": True, **engine.get_project_timeline(building_type, sqm)})
    except HTTPException: raise
    except Exception as e: logger.error("Construction timeline error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicle/status", dependencies=[Depends(require_auth)])
async def api_v25_vehicle_status():
    try:
        mod = _omega("vehicle_manager")
        if not mod: raise HTTPException(status_code=503, detail="Vehicle manager not available")
        engine = mod.VehicleManager()
        return JSONResponse({"success": True, **engine.get_all_fuel_prices()})
    except HTTPException: raise
    except Exception as e: logger.error("Vehicle status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicle/tools", dependencies=[Depends(require_auth)])
async def api_v25_vehicle_tools():
    try:
        mod = _omega("vehicle_manager")
        if not mod: raise HTTPException(status_code=503, detail="Vehicle manager not available")
        engine = mod.VehicleManager()
        return JSONResponse({"success": True, **engine.compare_vehicle_types()})
    except HTTPException: raise
    except Exception as e: logger.error("Vehicle tools error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/vehicle/calculate", dependencies=[Depends(require_auth)])
async def api_v25_vehicle_calculate(request: Request):
    try:
        mod = _omega("vehicle_manager")
        if not mod: raise HTTPException(status_code=503, detail="Vehicle manager not available")
        data = json.loads(await request.body())
        engine = mod.VehicleManager()
        calc_type = data.get("calc_type", "fuel_consumption")
        if calc_type == "trip_cost":
            result = engine.calculate_trip_cost(data.get("distance_km", 0), data.get("fuel_consumption_l_100km", 8.0), data.get("fuel_price_per_liter", 23.50))
        elif calc_type == "maintenance":
            result = engine.estimate_maintenance_cost(data.get("vehicle_age_years", 5), data.get("make", "toyota"))
        else:
            result = engine.calculate_fuel_consumption(data.get("distance_km", 0), data.get("fuel_liters", 0), data.get("fuel_price"))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Vehicle calculate error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicle/lookup", dependencies=[Depends(require_auth)])
async def api_v25_vehicle_lookup(make: str = "toyota", model: str = "corolla", year: int = 2020):
    try:
        mod = _omega("vehicle_manager")
        if not mod: raise HTTPException(status_code=503, detail="Vehicle manager not available")
        engine = mod.VehicleManager()
        return JSONResponse({"success": True, **engine.get_service_schedule(make, model, year)})
    except HTTPException: raise
    except Exception as e: logger.error("Vehicle lookup error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/music-africa/status", dependencies=[Depends(require_auth)])
async def api_v25_musicafrica_status():
    try:
        mod = _omega("music_africa")
        if not mod: raise HTTPException(status_code=503, detail="Music Africa not available")
        engine = mod.MusicAfrica()
        return JSONResponse({"success": True, **engine.get_all_scales()})
    except HTTPException: raise
    except Exception as e: logger.error("Music Africa status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/music-africa/instruments", dependencies=[Depends(require_auth)])
async def api_v25_musicafrica_instruments():
    try:
        mod = _omega("music_africa")
        if not mod: raise HTTPException(status_code=503, detail="Music Africa not available")
        engine = mod.MusicAfrica()
        return JSONResponse({"success": True, **engine.get_all_instruments()})
    except HTTPException: raise
    except Exception as e: logger.error("Music Africa instruments error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/music-africa/analyze", dependencies=[Depends(require_auth)])
async def api_v25_musicafrica_analyze(request: Request):
    try:
        mod = _omega("music_africa")
        if not mod: raise HTTPException(status_code=503, detail="Music Africa not available")
        data = json.loads(await request.body())
        engine = mod.MusicAfrica()
        ct = data.get("content_type", "scale"); name = data.get("name", "")
        if ct == "rhythm": result = engine.get_rhythm_pattern(name or "djembe_basics")
        elif ct == "instrument": result = engine.get_instrument_guide(name or "djembe")
        elif ct == "dance": result = engine.get_dance_style(name or "pantsula")
        elif ct == "theory": result = engine.get_music_theory_lesson(name or "rhythm")
        else: result = engine.get_scale(name or "pentatonic")
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Music Africa analyze error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/music-africa/search", dependencies=[Depends(require_auth)])
async def api_v25_musicafrica_search(content_type: str = "scale", name: str = "pentatonic"):
    try:
        mod = _omega("music_africa")
        if not mod: raise HTTPException(status_code=503, detail="Music Africa not available")
        engine = mod.MusicAfrica()
        if content_type == "rhythm": result = engine.get_rhythm_pattern(name or "djembe_basics")
        elif content_type == "instrument": result = engine.get_instrument_guide(name or "djembe")
        elif content_type == "dance": result = engine.get_dance_style(name or "pantsula")
        elif content_type == "theory": result = engine.get_music_theory_lesson(name or "rhythm")
        else: result = engine.get_scale(name or "pentatonic")
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Music Africa search error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/government/status", dependencies=[Depends(require_auth)])
async def api_v25_government_status():
    try:
        mod = _omega("government_services")
        if not mod: raise HTTPException(status_code=503, detail="Government services not available")
        engine = mod.GovernmentServices()
        return JSONResponse({"success": True, **engine.get_all_service_guides()})
    except HTTPException: raise
    except Exception as e: logger.error("Government status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/government/guides", dependencies=[Depends(require_auth)])
async def api_v25_government_guides():
    try:
        mod = _omega("government_services")
        if not mod: raise HTTPException(status_code=503, detail="Government services not available")
        engine = mod.GovernmentServices()
        return JSONResponse({"success": True, **engine.get_all_grant_types()})
    except HTTPException: raise
    except Exception as e: logger.error("Government guides error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/government/analyze", dependencies=[Depends(require_auth)])
async def api_v25_government_analyze(request: Request):
    try:
        mod = _omega("government_services")
        if not mod: raise HTTPException(status_code=503, detail="Government services not available")
        data = json.loads(await request.body())
        engine = mod.GovernmentServices()
        lt = data.get("lookup_type", "service"); name = data.get("name", "")
        if lt == "grant": result = engine.get_grant_info(name or "srd")
        elif lt == "municipal": result = engine.get_municipal_services(name or "city_of_johannesburg")
        elif lt == "tax": result = engine.get_tax_registration_steps(name or "individual")
        else: result = engine.get_service_guide(name or "id_card")
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Government analyze error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/government/search", dependencies=[Depends(require_auth)])
async def api_v25_government_search(lookup_type: str = "service", name: str = "id_card"):
    try:
        mod = _omega("government_services")
        if not mod: raise HTTPException(status_code=503, detail="Government services not available")
        engine = mod.GovernmentServices()
        if lookup_type == "dates": result = engine.get_important_dates()
        elif lookup_type == "grant": result = engine.get_grant_info(name or "srd")
        elif lookup_type == "municipal": result = engine.get_municipal_services(name or "city_of_johannesburg")
        elif lookup_type == "tax": result = engine.get_tax_registration_steps(name or "individual")
        else: result = engine.get_service_guide(name or "id_card")
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("Government search error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/ecommerce/status", dependencies=[Depends(require_auth)])
async def api_v25_ecommerce_status():
    try:
        mod = _omega("ecommerce_toolkit")
        if not mod: raise HTTPException(status_code=503, detail="E-commerce toolkit not available")
        engine = mod.EcommerceToolkit()
        return JSONResponse({"success": True, **engine.get_sample_products()})
    except HTTPException: raise
    except Exception as e: logger.error("E-commerce status error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/ecommerce/tools", dependencies=[Depends(require_auth)])
async def api_v25_ecommerce_tools():
    try:
        mod = _omega("ecommerce_toolkit")
        if not mod: raise HTTPException(status_code=503, detail="E-commerce toolkit not available")
        engine = mod.EcommerceToolkit()
        return JSONResponse({"success": True, **engine.get_payment_gateways()})
    except HTTPException: raise
    except Exception as e: logger.error("E-commerce tools error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.post("/ecommerce/calculate", dependencies=[Depends(require_auth)])
async def api_v25_ecommerce_calculate(request: Request):
    try:
        mod = _omega("ecommerce_toolkit")
        if not mod: raise HTTPException(status_code=503, detail="E-commerce toolkit not available")
        data = json.loads(await request.body())
        engine = mod.EcommerceToolkit()
        ct = data.get("calc_type", "shipping")
        if ct == "pricing": result = engine.get_pricing_strategy(data.get("cost_price", 0), data.get("target_margin", 0.3), data.get("competitor_price"))
        elif ct == "catalog": result = engine.create_product_catalog(data.get("products", []))
        else: result = engine.calculate_shipping(data.get("weight_kg", 1.0), data.get("destination", "local"), data.get("courier", "aramex"))
        return JSONResponse({"success": True, **result})
    except HTTPException: raise
    except Exception as e: logger.error("E-commerce calculate error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/ecommerce/search", dependencies=[Depends(require_auth)])
async def api_v25_ecommerce_search(weight_kg: float = 1.0, destination: str = "national"):
    try:
        mod = _omega("ecommerce_toolkit")
        if not mod: raise HTTPException(status_code=503, detail="E-commerce toolkit not available")
        engine = mod.EcommerceToolkit()
        return JSONResponse({"success": True, **engine.compare_all_couriers(weight_kg, destination)})
    except HTTPException: raise
    except Exception as e: logger.error("E-commerce search error: %s", e); raise HTTPException(status_code=500, detail=str(e))

@router.get("/agriculture/crop-guide", dependencies=[Depends(require_auth)])
@_omega_endpoint("agriculture_advisor", "AgricultureAdvisor", "Agriculture advisor not available")
async def api_v25_agriculture_crop_guide(engine):

    return JSONResponse({"success": True, **engine.get_crop_guide()})

@router.get("/agriculture/livestock-guide", dependencies=[Depends(require_auth)])
@_omega_endpoint("agriculture_advisor", "AgricultureAdvisor", "Agriculture advisor not available")
async def api_v25_agriculture_livestock_guide(engine):

    return JSONResponse({"success": True, **engine.get_livestock_guide()})

@router.get("/agriculture/calculate-yield", dependencies=[Depends(require_auth)])
@_omega_endpoint("agriculture_advisor", "AgricultureAdvisor", "Agriculture advisor not available")
async def api_v25_agriculture_calculate_yield(engine, crop_type: str = "maize", hectares: float = 1.0):

    return JSONResponse({"success": True, **engine.calculate_yield(crop_type, hectares)})

@router.get("/agriculture/market-prices", dependencies=[Depends(require_auth)])
@_omega_endpoint("agriculture_advisor", "AgricultureAdvisor", "Agriculture advisor not available")
async def api_v25_agriculture_market_prices(engine, commodity: str = None):

    return JSONResponse({"success": True, **engine.get_market_prices(commodity)})

@router.get("/health/calculate-bmi", dependencies=[Depends(require_auth)])
@_omega_endpoint("health_advisor", "HealthAdvisor", "Health advisor not available")
async def api_v25_health_calculate_bmi(engine, weight_kg: float = 70.0, height_m: float = 1.75):

    return JSONResponse({"success": True, **engine.calculate_bmi(weight_kg, height_m)})

@router.get("/health/calculate-bmr", dependencies=[Depends(require_auth)])
@_omega_endpoint("health_advisor", "HealthAdvisor", "Health advisor not available")
async def api_v25_health_calculate_bmr(engine, weight_kg: float = 70.0, height_cm: float = 175.0, age: int = 30, gender: str = "male"):

    return JSONResponse({"success": True, **engine.calculate_bmr(weight_kg, height_cm, age, gender)})

@router.get("/health/medication/{name}", dependencies=[Depends(require_auth)])
@_omega_endpoint("health_advisor", "HealthAdvisor", "Health advisor not available")
async def api_v25_health_medication(engine, name: str):

    return JSONResponse({"success": True, **engine.get_medication_info(name)})

@router.get("/health/first-aid/{type}", dependencies=[Depends(require_auth)])
@_omega_endpoint("health_advisor", "HealthAdvisor", "Health advisor not available")
async def api_v25_health_first_aid(engine, type: str):

    return JSONResponse({"success": True, **engine.get_first_aid_guide(type)})

@router.get("/legal/laws/{category}", dependencies=[Depends(require_auth)])
@_omega_endpoint("legal_assistant", "LegalAssistant", "Legal assistant not available")
async def api_v25_legal_laws(engine, category: str):
    """Get laws by category."""
    return JSONResponse({"success": True, **engine.get_laws_by_category(category)})
