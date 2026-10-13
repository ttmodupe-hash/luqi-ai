"""API Server — FastAPI-based REST API for Omega AI."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from auth_middleware import AuthMiddleware
from cache_manager import CacheManager
from rate_limiter import RateLimiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.cache = CacheManager()
    app.state.limiter = RateLimiter()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="Omega AI API",
    version="29.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuthMiddleware)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "29.1.0"}


@app.get("/")
async def root():
    return {"message": "Omega AI v29.1.0", "docs": "/docs"}


@app.get("/api/v1/status")
async def status(request: Request):
    return {
        "version": "29.1.0",
        "cache_hits": request.app.state.cache.hits if hasattr(request.app.state.cache, "hits") else 0,
    }


@app.post("/api/v1/chat")
async def chat(request: Request, body: dict):
    prompt = body.get("prompt", "")
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt required")
    return {"response": f"Echo: {prompt}"}


@app.get("/api/v1/agents")
async def list_agents():
    return {"agents": []}


@app.post("/api/v1/agents/{agent_id}/task")
async def agent_task(agent_id: str, body: dict):
    return {"agent_id": agent_id, "task_status": "queued"}


@app.post("/api/v1/extract")
async def extract_high_precision(body: dict):
    """High-precision extraction endpoint via unified google-genai SDK."""
    prompt = body.get("prompt", "")
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt required")
    
    system_inst = body.get("system_instruction")
    model = body.get("model", "gemini-2.5-flash")
    
    from google_genai_agent import async_analyze_and_extract
    result = await async_analyze_and_extract(
        user_prompt=prompt,
        system_instruction=system_inst,
        model=model,
        temperature=0.0
    )
    return {
        "status": "success",
        "precision": "deterministic_temperature_0.0",
        "model": model,
        "result": result
    }


@app.post("/api/v1/animation/storyboard")
async def generate_storyboard(body: dict):
    """Generates animation storyboard and dialogue using high-precision Gemini extraction."""
    topic = body.get("topic", "")
    duration = int(body.get("duration_seconds", 5))
    language = body.get("language", "isiZulu")
    
    from google_genai_agent import extract_storyboard_script
    storyboard = extract_storyboard_script(topic, duration, language)
    return {
        "status": "success",
        "storyboard": storyboard
    }


# ─── Asynchronous Job Queue (Celery + Redis) with Pre-Execution Token Gate ───

@app.post("/api/v1/jobs/submit")
async def submit_async_job(body: dict):
    """Submits a heavy multi-agent task asynchronously.
    Enforces pre-deduction of Luqi credits before pushing to the Celery / Redis queue.
    """
    prompt = body.get("prompt", "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt required")

    task_type = body.get("task_type", "data_reconciliation")
    user_email = body.get("user_email", "guest@luqi.ai").strip().lower()
    required_tokens = int(body.get("required_tokens", 5))

    from token_billing_gateway import TokenBillingGateway
    deduction = TokenBillingGateway.check_and_deduct_tokens(
        user_email=user_email,
        required_tokens=required_tokens,
        description=f"Async job: {task_type}",
    )

    if not deduction["success"]:
        return JSONResponse(
            status_code=402,
            content={
                "detail": deduction["error"],
                "current_balance": deduction["current_balance"],
                "required_tokens": deduction["required_tokens"],
                "action": "Please top up your Luqi credits via /api/v1/billing/topup or the Pricing page.",
            },
        )

    # Dispatch to Celery Redis queue (or async fallback)
    from worker import dispatch_heavy_job
    job_info = dispatch_heavy_job(
        prompt=prompt,
        task_type=task_type,
        user_email=user_email,
    )

    return {
        "status": "queued",
        "task_id": job_info["task_id"],
        "queue": job_info.get("queue", "celery_redis"),
        "tokens_deducted": required_tokens,
        "remaining_balance": deduction["remaining_balance"],
        "poll_url": f"/api/v1/jobs/{job_info['task_id']}",
    }


@app.get("/api/v1/jobs/{task_id}")
async def get_job_status(task_id: str):
    """Polls the status of an asynchronous agent job."""
    from worker import query_task_status
    status_info = query_task_status(task_id)
    return status_info


# ─── Token Billing Gateway & Webhooks (PayFast + Stripe) ──────────────────────

@app.get("/api/v1/billing/balance")
async def get_token_balance(user_email: str = "guest@luqi.ai"):
    """Returns the current credit/token balance for the user."""
    from token_billing_gateway import TokenBillingGateway
    balance = TokenBillingGateway.get_balance(user_email)
    return {
        "user_email": user_email,
        "credits": balance,
        "price_per_credit_usd": 0.05,
        "video_seconds_available": balance // 10,
    }


@app.post("/api/v1/billing/topup")
async def topup_credits(body: dict):
    """Top-up credits for development, sandboxing, or testing."""
    user_email = body.get("user_email", "guest@luqi.ai")
    credits = int(body.get("credits", 100))
    from token_billing_gateway import TokenBillingGateway
    res = TokenBillingGateway.credit_tokens(
        user_email=user_email,
        amount_tokens=credits,
        provider="instant_topup",
    )
    return res


@app.post("/api/v1/billing/payfast/webhook")
async def payfast_itn_webhook(request: Request):
    """Instant Transaction Notification (ITN) webhook from PayFast.
    Refills user's database credit balance upon confirmed payment.
    """
    try:
        # PayFast typically sends multipart/form-data or application/x-www-form-urlencoded
        form_data = await request.form()
        data_dict = dict(form_data)
        if not data_dict:
            data_dict = await request.json()
    except Exception:
        data_dict = {}

    from token_billing_gateway import TokenBillingGateway
    return TokenBillingGateway.process_payfast_webhook(data_dict)


@app.post("/api/v1/billing/stripe/webhook")
async def stripe_webhook(request: Request):
    """Stripe webhook for checkout.session.completed and payment_intent.succeeded."""
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    from token_billing_gateway import TokenBillingGateway
    return TokenBillingGateway.process_stripe_webhook(payload)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
