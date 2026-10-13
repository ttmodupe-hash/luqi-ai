"""FastAPI Router for Asynchronous Job Queue and Token Billing Gateway.

Provides endpoints for:
1. Submitting asynchronous agent tasks to Celery via Redis broker.
2. Checking task status and retrieving agent output artifacts.
3. Managing virtual token balance and processing PayFast / Stripe webhooks.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel, Field

from token_billing_gateway import TokenBillingGateway
from worker import dispatch_heavy_job, query_task_status

logger = logging.getLogger("luqi.async_jobs")
router = APIRouter(tags=["Async Jobs & Token Billing"])


class JobSubmitRequest(BaseModel):
    user_email: str = Field(default="user@luqi.ai", description="Email of the authenticated user")
    prompt: str = Field(..., description="Prompt or task instructions for the multi-agent crew")
    task_type: str = Field(default="data_reconciliation", description="Task classification: data_reconciliation, workbook_audit, heavy_agent_crew, wan21_video")
    tokens_required: Optional[int] = Field(None, description="Optional override of required tokens")


@router.post("/jobs/submit", status_code=status.HTTP_202_ACCEPTED)
async def submit_async_job(req: JobSubmitRequest):
    """
    1. Pre-execution Token Gate: verifies user has sufficient credits.
    2. Deducts tokens immediately.
    3. Pushes the job to Celery (Redis broker).
    4. Returns task_id for non-blocking client polling.
    """
    cost = req.tokens_required or TokenBillingGateway.calculate_task_cost(req.task_type)

    # 1. Billing Pre-check and deduction
    deduction = TokenBillingGateway.check_and_deduct_tokens(
        user_email=req.user_email,
        required_tokens=cost,
        description=f"Async job: {req.task_type}",
    )

    if not deduction["success"]:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "Insufficient token balance",
                "message": deduction["message"],
                "required": deduction["required"],
                "balance": deduction["balance"],
                "topup_url": "/pricing",
            },
        )

    # 2. Push task to the Celery queue (or local fallback)
    task_id = dispatch_heavy_job(
        prompt=req.prompt,
        task_type=req.task_type,
        user_email=req.user_email,
    )

    return {
        "status": "queued",
        "task_id": task_id,
        "task_type": req.task_type,
        "tokens_deducted": cost,
        "remaining_balance": deduction["balance"],
        "poll_url": f"/api/v1/jobs/{task_id}",
    }


@router.get("/jobs/{task_id}")
async def get_job_status(task_id: str):
    """Polls Celery / Redis result backend for asynchronous task execution status."""
    task_info = query_task_status(task_id)
    return task_info


@router.get("/billing/balance")
async def get_token_balance(email: str = "user@luqi.ai"):
    """Returns the current token balance and margin stats for a user."""
    wallet = TokenBillingGateway.get_balance(email)
    return {
        "status": "success",
        "user_email": email,
        "balance": wallet["balance"],
        "total_spent": wallet["total_spent"],
        "plan_type": wallet["plan_type"],
        "margin_protector": {
            "credit_cost_usd": 0.05,
            "video_sec_cost_usd": 0.50,
            "gross_margin_target": "80%",
        },
    }


@router.post("/billing/topup")
async def manual_topup(body: dict):
    """Credits tokens to a user wallet (testing or internal admin)."""
    email = body.get("email", "user@luqi.ai")
    tokens = int(body.get("tokens", 50))
    desc = body.get("description", "Manual top-up pack")
    new_bal = TokenBillingGateway.credit_tokens(email, tokens, desc)
    return {
        "status": "success",
        "user_email": email,
        "credited": tokens,
        "new_balance": new_bal,
    }


@router.post("/billing/payfast-itn")
async def payfast_itn_webhook(request: Request):
    """PayFast Instant Transaction Notification (ITN) webhook."""
    try:
        content_type = request.headers.get("content-type", "")
        if "application/x-www-form-urlencoded" in content_type:
            form = await request.form()
            payload = dict(form)
        else:
            payload = await request.json()
    except Exception:
        payload = {}

    result = TokenBillingGateway.process_payfast_itn(payload)
    if not result.get("valid"):
        return {"status": "ignored", "reason": result.get("reason", "validation failed")}

    return {
        "status": "processed",
        "user_email": result.get("user_email"),
        "tokens_credited": result.get("tokens_credited"),
        "new_balance": result.get("new_balance"),
    }


@router.post("/billing/stripe-webhook")
async def stripe_webhook(request: Request):
    """Stripe webhook for checkout.session.completed."""
    try:
        event = await request.json()
    except Exception:
        event = {}

    result = TokenBillingGateway.process_stripe_webhook(event)
    return result


# =============================================================================
# ZERO TRUST ARCHITECTURE (ZTA) & OWASP AST10 ENDPOINTS
# =============================================================================

from backend.zta_security import zta_controller, SanitizationDLP
from backend.langgraph_zta_workflow import langgraph_zta


@router.get("/zta/status")
async def get_zta_security_status():
    """Returns telemetry on Agent Identity (mTLS), Tool Gateway (HITL), and AST10 Threat Radar."""
    return zta_controller.get_dashboard_telemetry()


@router.get("/zta/approvals")
async def get_pending_hitl_approvals():
    """Lists pending Human-in-the-Loop review requests for high-impact agent actions (AST07)."""
    return {
        "pending_approvals": zta_controller.hitl_registry.list_pending()
    }


class ApprovalResolveRequest(BaseModel):
    decision: str = Field(..., description="APPROVE, REJECT, or ESCALATE")
    reviewer: str = Field(default="security_admin@luqi.ai")
    step_up_token: Optional[str] = None


@router.post("/zta/approvals/{approval_id}/resolve")
async def resolve_hitl_approval(approval_id: str, req: ApprovalResolveRequest):
    """Approves, rejects, or escalates an intercepted agent action at the HITL gate."""
    ok, msg = zta_controller.hitl_registry.resolve_approval(
        approval_id=approval_id,
        decision=req.decision,
        reviewer=req.reviewer,
        step_up_token=req.step_up_token
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    
    zta_controller.record_audit_event(
        "HITL_RESOLVED", "AST07",
        f"Approval {approval_id} resolved as {req.decision} by {req.reviewer}",
        "HIGH" if req.decision == "APPROVE" else "INFO"
    )
    return {"success": True, "message": msg, "decision": req.decision}


class StepUpChallengeRequest(BaseModel):
    user_email: str = Field(default="admin@luqi.ai")
    action: str = Field(default="payfast_charge")
    amount_zar: float = Field(default=0.0)


@router.post("/zta/step-up/challenge")
async def issue_step_up_challenge(req: StepUpChallengeRequest):
    """Issues a Step-Up 2FA/MFA challenge for high-risk operations (PayFast, billing, key rotation)."""
    challenge = zta_controller.step_up_gateway.issue_challenge(
        user_email=req.user_email,
        action=req.action,
        amount_zar=req.amount_zar
    )
    return challenge


class StepUpVerifyRequest(BaseModel):
    challenge_id: str
    code: str


@router.post("/zta/step-up/verify")
async def verify_step_up_code(req: StepUpVerifyRequest):
    """Verifies a Step-Up authentication challenge code."""
    ok, msg, token = zta_controller.step_up_gateway.verify_challenge(
        challenge_id=req.challenge_id,
        code_entered=req.code
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "step_up_token": token}


class SanitizeTestRequest(BaseModel):
    text: str


@router.post("/zta/sanitize-test")
async def test_dlp_and_injection(req: SanitizeTestRequest):
    """Interactive sandbox test bench for DLP/NER scrubbing and AST01 injection detection."""
    sanitized_in, is_injection, in_findings = SanitizationDLP.sanitize_input(req.text)
    sanitized_out, out_findings = SanitizationDLP.sanitize_output(req.text)
    return {
        "raw_input": req.text,
        "sanitized_input": sanitized_in,
        "is_prompt_injection": is_injection,
        "inbound_dlp_findings": in_findings,
        "sanitized_output_preview": sanitized_out,
        "outbound_dlp_findings": out_findings
    }


class LangGraphExecutionRequest(BaseModel):
    prompt: str
    agent_id: str = "luqi-data-architect"
    requested_tool: Optional[str] = None
    tool_parameters: Optional[dict] = None
    approval_id: Optional[str] = None
    approval_decision: Optional[str] = None


@router.post("/zta/langgraph/execute")
async def execute_langgraph_zta(req: LangGraphExecutionRequest):
    """Executes an agent request through the LangGraph ZTA multi-node state machine with HITL gating."""
    state = langgraph_zta.run_workflow(
        prompt=req.prompt,
        agent_id=req.agent_id,
        requested_tool=req.requested_tool,
        tool_parameters=req.tool_parameters,
        approval_id=req.approval_id,
        approval_decision=req.approval_decision
    )
    return state


# =============================================================================
# SELF-HEALING 70/30 CODE DEPLOYMENT PIPELINE ENDPOINTS
# =============================================================================

from backend.self_healing_pipeline import self_healing_pipeline


@router.get("/self-healing/pipeline/jobs")
async def get_pipeline_jobs():
    """Lists all self-healing pipeline jobs, sandbox logs, and 70/30 state traces."""
    return {
        "jobs": self_healing_pipeline.list_jobs()
    }


class PipelineTriggerRequest(BaseModel):
    bug_report: str = Field(..., description="Description or stack trace of the bug to be fixed")
    target_file: Optional[str] = Field(None, description="Target repository file being diagnosed")


@router.post("/self-healing/pipeline/run")
async def trigger_pipeline_job(req: PipelineTriggerRequest):
    """Triggers the 70% autonomous diagnostic + sandbox testing phase and pauses at human gate."""
    job = self_healing_pipeline.trigger_self_healing(
        bug_report=req.bug_report,
        target_file=req.target_file
    )
    return {
        "success": True,
        "job_id": job.job_id,
        "status": job.status,
        "pr_url": job.pr_url,
        "branch_name": job.branch_name,
        "execution_trace": job.execution_trace
    }


class SandboxRunRequest(BaseModel):
    code: str = Field(..., description="Python or bash snippet to safely execute in Docker container")


@router.post("/self-healing/pipeline/sandbox-exec")
async def run_code_in_sandbox(req: SandboxRunRequest):
    """Safely executes code in the isolated Docker container (30s circuit breaker)."""
    res = self_healing_pipeline.run_sandbox_code(req.code)
    return res


class HumanAuthRequest(BaseModel):
    reviewer: str = Field(default="Security & Reliability Operator")


@router.post("/self-healing/pipeline/jobs/{job_id}/authorize")
async def authorize_pipeline_job(job_id: str, req: HumanAuthRequest):
    """Human-in-the-Loop 30% Gated Phase: Authorizes PR to merge and deploy to production."""
    ok, msg = self_healing_pipeline.authorize_deployment(job_id=job_id, reviewer=req.reviewer)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "job_id": job_id, "status": "DEPLOYED_TO_PROD"}


class RejectJobRequest(BaseModel):
    reason: str = Field(default="Rejected during human review")
    reviewer: str = Field(default="Security & Reliability Operator")


@router.post("/self-healing/pipeline/jobs/{job_id}/reject")
async def reject_pipeline_job(job_id: str, req: RejectJobRequest):
    """Human-in-the-Loop 30% Gated Phase: Rejects deployment and prevents production merge."""
    ok, msg = self_healing_pipeline.reject_deployment(job_id=job_id, reason=req.reason, reviewer=req.reviewer)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "job_id": job_id, "status": "REJECTED"}


# =============================================================================
# AUTONOMOUS AFRICAN MARKET & TECHNOLOGY SENSING LOOP ENDPOINTS
# =============================================================================

from backend.african_sensing_loop import african_sensing_loop


@router.get("/sensing/radar")
async def get_african_market_radar():
    """Returns real-time African tech verticals radar, open grant opportunities, and strategic insights."""
    return african_sensing_loop.run_market_scan()


@router.post("/sensing/run-scan")
async def trigger_african_sensing_scan():
    """Triggers an on-demand Chief Strategy Officer sensing loop across African ecosystems."""
    return african_sensing_loop.run_market_scan()


class DraftGrantRequest(BaseModel):
    grant_id: str = Field(default="afcfta_dic_2026", description="ID of target grant or challenge")


@router.post("/sensing/draft-grant")
async def draft_grant_proposal(req: DraftGrantRequest):
    """Autonomously constructs an executive grant application aligned with LUQI architecture."""
    proposal = african_sensing_loop.draft_grant_application(req.grant_id)
    return proposal


class GenerateWrapperRequest(BaseModel):
    api_name: str = Field(default="Flutterwave", description="Flutterwave, PAPSS, Sand Technologies, or EskomSePush")


@router.post("/sensing/generate-api-wrapper")
async def generate_african_api_wrapper(req: GenerateWrapperRequest):
    """Autonomously writes, validates, and packages production integration code for African APIs."""
    wrapper = african_sensing_loop.generate_african_api_wrapper(req.api_name)
    return wrapper


class AgritechPredictRequest(BaseModel):
    region: str = Field(default="Free State, South Africa")
    crop: str = Field(default="Maize")
    soil_type: str = Field(default="Loam")


@router.post("/sensing/agritech-predict")
async def predict_agritech_yield(req: AgritechPredictRequest):
    """Calculates satellite NDVI vegetation index and yield forecasts for smallholder farmers."""
    prediction = african_sensing_loop.calculate_agritech_yield(
        region=req.region,
        crop=req.crop,
        soil_type=req.soil_type
    )
    return prediction


class AfcftaCorridorRequest(BaseModel):
    origin: str = Field(default="Durban, South Africa")
    destination: str = Field(default="Harare, Zimbabwe")
    cargo_type: str = Field(default="Agricultural Machinery")
    declared_value_usd: float = Field(default=50000.0)


@router.post("/sensing/afcfta-corridor")
async def calculate_afcfta_corridor(req: AfcftaCorridorRequest):
    """Calculates trade corridor transit time, border post delays, and AfCFTA tariff savings."""
    metrics = african_sensing_loop.calculate_afcfta_corridor(
        origin=req.origin,
        destination=req.destination,
        cargo_type=req.cargo_type,
        declared_value_usd=req.declared_value_usd
    )
    return metrics


class DispatchPrototypeRequest(BaseModel):
    opportunity_title: str
    target_vertical: str
    feature_specification: str


@router.post("/sensing/dispatch-to-pipeline")
async def dispatch_sensed_opportunity_to_pipeline(req: DispatchPrototypeRequest):
    """Connects the Market Sensing Agent to the 70/30 Self-Healing Pipeline for sandbox prototype generation."""
    job = self_healing_pipeline.trigger_self_healing(
        bug_report=f"African Opportunity Prototype: {req.opportunity_title} ({req.target_vertical}) - {req.feature_specification}",
        target_file=f"backend/integrations/{req.target_vertical.lower().replace(' ', '_')}.py"
    )
    return {
        "success": True,
        "message": "Opportunity specifications passed to CrewAI Senior Reliability Engineer for sandbox prototyping.",
        "job_id": job.job_id,
        "pr_url": job.pr_url,
        "status": job.status
    }


# =============================================================================
# MULTI-LINGUAL COMPANIONSHIP & SEPITORI LOCALIZATION ENDPOINT
# =============================================================================

class CompanionChatRequest(BaseModel):
    user_input: str
    user_location: str = Field(default="Soshanguve, South Africa")


@router.post("/chat")
async def luqi_companion_chat(request: CompanionChatRequest):
    """
    Multi-Lingual African Companionship Gateway.
    Responds natively in Sepitori, isiZulu, Sesotho, and local slang with warmth and real-time accuracy.
    """
    system_instruction = (
        "You are Luqi-AI, a highly intelligent, empathetic, and proactive digital companion "
        "built specifically to help Africans operate without hustle. "
        "Current local date: October 2026. "
        "1. Language Agility: You are fully fluent in all African languages. If the user speaks "
        "in Sepitori (Pretoria/Tshwane slang like 'Aowa daan', 'zaka', 'chomi', 'phanda', 'moja'), "
        "Zulu, Sotho, or a mix of local township slang, you MUST respond smoothly and warmly in that exact same dialect. "
        "2. Companionship: Treat the user with deep respect. Act as an empathetic strategic partner, uplifting their dignity ('Umuntu ngumuntu ngabantu'). "
        "3. Real-Time Accuracy (October 2026): Verify current dates accurately. Note that the AfCFTA Digital Innovation Challenge 2026 "
        "officially closed on Sep 4, 2026, and the Google for Startups Accelerator 2026 cohort was announced Oct 7-8, 2026. "
        "Immediately pivot the user to active alternatives like the TIA Seed Fund Q4 2026 window, DSI Grassroots Innovation Fund, "
        "or 2027 accelerator pre-registrations."
    )

    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            from google import genai
            from google.genai import types
            client = genai.Client()
            response = await client.aio.models.generate_content(
                model="gemini-flash-latest",
                contents=request.user_input,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.4,
                ),
            )
            return {"response": response.text, "dialect": "localized_african", "location": request.user_location}
        except Exception as e:
            logger.warning(f"Gemini API call failed, using native local companion fallback: {e}")

    # Highly responsive localized fallback with authentic Sepitori & Pan-African fluency
    text_lower = request.user_input.lower()
    if any(k in text_lower for k in ["sepitori", "soshanguve", "mamelodi", "daan", "zaka", "moja", "phanda", "chomi"]):
        resp = (
            "Dumela chomi! Kamo Soshanguve re phanda ka matla, aowa daan ha gona go lapa. "
            "Mo go tsa di-grant le zaka ya go godisa business ya gago: gopola gore AfCFTA ya 2026 e tswaletswe ka 4 September 2026, "
            "le Google for Startups cohort ya 2026 e phatlaladitswe bekeng e fetileng (7-8 October). "
            "Empa re na le TIA Seed Fund Q4 2026 window e bulegileng (go fihla ka R1.5M) le DSI Grassroots Innovation Fund. "
            "O batla re qale ka ho ngola proposal kapa re hlophise tech stack ya gago pele, grootman?"
        )
    elif any(k in text_lower for k in ["sawubona", "zulu", "unjani", "ngisize", "imali"]):
        resp = (
            "Sawubona mngani wami! Luqi-AI ukhona ukukusiza uphumelele ngaphandle kwenkinga. "
            "Mayelana nezimali zokuxhasa amabhizinisi (grants) kule nyanga kaMfumfu (October 2026): "
            "I-AfCFTA 2026 Challenge ivalwe ngo-September 4, kanti ne-Google Accelerator 2026 isiqediwe. "
            "Kodwa i-TIA Seed Fund Q4 2026 ivulekile manje (R500k - R1.5M) kanye ne-GSMA Climate Fund. "
            "Ake sihlale phansi sihlele isicelo sakho noma silungise i-prototype yakho masinyane!"
        )
    else:
        resp = (
            f"Greetings from Luqi-AI! As your strategic partner in {request.user_location}, I'm here to ensure you build and scale with zero hustle. "
            "Regarding capital and ecosystem opportunities as of October 2026: The 2026 AfCFTA Challenge closed on September 4, and Google for Startups just announced their 2026 SA cohort last week (October 7-8). "
            "I have already recalibrated our radar to active Q4 2026 emergency funding: the TIA Seed Fund Q4 window (up to R1.5M), DSI Grassroots Innovation Programme, and pre-registration for the 2027 Google Accelerator cohort. "
            "How can I assist your roadmap today?"
        )

    return {"response": resp, "dialect": "localized_african", "location": request.user_location}




