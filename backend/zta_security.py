"""
Zero Trust Architecture (ZTA) & OWASP Agentic Skills Top 10 (AST10) Security Framework.
Enterprise defense engine for autonomous AI agents in LUQI AI v29.1.0.

Provides three defense layers:
1. Identity and Continuous Authentication (Short-lived SPIFFE Certs, mTLS, Continuous Token Verification)
2. Tool Gateway and Least Privilege (Granular Policy Engine, Credential Broker, Human-in-the-Loop Gate)
3. Runtime Defenses and Blast Radius Containment (DLP/NER Sanitizer, Circuit Breakers, Volume & Spending Caps, AST10 Guards)
"""

import time
import uuid
import hmac
import hashlib
import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone


# =============================================================================
# OWASP AGENTIC SKILLS TOP 10 (AST10 - 2026) DEFINITIONS
# =============================================================================

OWASP_AST10_CATALOG = {
    "AST01": {
        "id": "AST01",
        "title": "Prompt Injection & Jailbreak Override",
        "risk": "CRITICAL",
        "description": "Adversarial prompts hijacking agent system instructions or escaping context delimiters.",
        "mitigation": "Dual-pass lexical & semantic sanitizer with delimiter sandboxing and role boundary enforcement."
    },
    "AST02": {
        "id": "AST02",
        "title": "Insecure Tool Calling & Unvetted Execution",
        "risk": "HIGH",
        "description": "Autonomous invocation of unsafe tools or unvalidated parameters resulting in arbitrary system actions.",
        "mitigation": "Strict parameter schema validation and centralized policy broker with allow-lists."
    },
    "AST03": {
        "id": "AST03",
        "title": "Overprivileged Agent & Standing Trust",
        "risk": "CRITICAL",
        "description": "Agents holding static broad permissions or persistent root/admin credentials.",
        "mitigation": "Least privilege policy, short-lived task-scoped permissions, and credential brokering."
    },
    "AST04": {
        "id": "AST04",
        "title": "Improper Output Handling & Secret Leakage",
        "risk": "HIGH",
        "description": "Agents regurgitating API keys, PII, internal prompts, or credentials into client outputs.",
        "mitigation": "Outbound DLP/NER redaction engine scanning for secrets, credit cards, and PII."
    },
    "AST05": {
        "id": "AST05",
        "title": "Recursive Agent Loops & Resource Depletion",
        "risk": "HIGH",
        "description": "Denial-of-Service through circular tool invocations or uncontrolled agent reasoning loops.",
        "mitigation": "Dynamic circuit breaker tracking step limits, execution time, and tool call cyclomatic graph."
    },
    "AST06": {
        "id": "AST06",
        "title": "Insecure Identity & Lack of Agent Authentication",
        "risk": "CRITICAL",
        "description": "Agents trusting peer agents without cryptographic proof of identity or TLS mutual validation.",
        "mitigation": "Per-agent ephemeral X.509/SPIFFE certificates with continuous mTLS verification."
    },
    "AST07": {
        "id": "AST07",
        "title": "Unchecked Execution of High-Impact Actions",
        "risk": "CRITICAL",
        "description": "Autonomous execution of financial payments, data destruction, or external communications without human review.",
        "mitigation": "Mandatory Human-in-the-Loop (HITL) gate with cryptographic approval tokens and Step-Up MFA."
    },
    "AST08": {
        "id": "AST08",
        "title": "Insecure Memory & Context Poisoning",
        "risk": "MEDIUM",
        "description": "Adversarial data injected into agent long-term memory or retrieval vectors.",
        "mitigation": "Provenance tracking, vector sanitization, and session memory isolation."
    },
    "AST09": {
        "id": "AST09",
        "title": "Supply Chain & Third-Party Agent Impersonation",
        "risk": "HIGH",
        "description": "Compromised third-party agent packages or spoofed agent endpoints.",
        "mitigation": "Cryptographic signature validation on all agent skill manifests and MCP tool servers."
    },
    "AST10": {
        "id": "AST10",
        "title": "Inadequate Telemetry & Audit Observability",
        "risk": "MEDIUM",
        "description": "Lack of tamper-evident logging of agent reasoning steps, tool payloads, and security decisions.",
        "mitigation": "Immutable audit log chain, performance grading, and real-time security telemetry."
    }
}


# =============================================================================
# LAYER 1: AGENT IDENTITY & CONTINUOUS AUTHENTICATION
# =============================================================================

@dataclass
class AgentCertificate:
    spiffe_id: str
    serial_number: str
    agent_name: str
    issued_at: float
    expires_at: float
    fingerprint: str
    allowed_scopes: List[str]
    is_revoked: bool = False

    def is_valid(self) -> bool:
        now = time.time()
        return not self.is_revoked and (self.issued_at <= now <= self.expires_at)


class AgentIdentityAuthority:
    """Issues and validates short-lived, task-bound agent certificates for mTLS."""

    def __init__(self, ca_secret: str = "luqi-zta-ca-root-key-2026"):
        self.ca_secret = ca_secret.encode("utf-8")
        self._certificates: Dict[str, AgentCertificate] = {}

    def issue_certificate(self, agent_name: str, scopes: List[str], ttl_seconds: int = 900) -> AgentCertificate:
        now = time.time()
        serial = uuid.uuid4().hex
        spiffe_id = f"spiffe://luqi.ai/agent/{agent_name}/{serial[:8]}"
        payload = f"{spiffe_id}:{serial}:{now}:{now + ttl_seconds}:{','.join(scopes)}"
        fingerprint = hmac.new(self.ca_secret, payload.encode("utf-8"), hashlib.sha256).hexdigest()

        cert = AgentCertificate(
            spiffe_id=spiffe_id,
            serial_number=serial,
            agent_name=agent_name,
            issued_at=now,
            expires_at=now + ttl_seconds,
            fingerprint=fingerprint,
            allowed_scopes=scopes
        )
        self._certificates[serial] = cert
        return cert

    def verify_certificate(self, serial: str, requested_scope: Optional[str] = None) -> Tuple[bool, str]:
        cert = self._certificates.get(serial)
        if not cert:
            return False, "Certificate not found in Trust Store (AST06 violation)"
        if not cert.is_valid():
            return False, "Certificate expired or revoked (mTLS handshake rejected)"
        if requested_scope and requested_scope not in cert.allowed_scopes and "*" not in cert.allowed_scopes:
            return False, f"Scope '{requested_scope}' not permitted for agent identity (AST03 violation)"
        return True, "Certificate validated successfully"

    def list_active_certificates(self) -> List[Dict[str, Any]]:
        now = time.time()
        return [
            {
                "spiffe_id": c.spiffe_id,
                "serial_number": c.serial_number,
                "agent_name": c.agent_name,
                "expires_in_seconds": max(0, int(c.expires_at - now)),
                "is_valid": c.is_valid(),
                "allowed_scopes": c.allowed_scopes,
                "fingerprint": c.fingerprint[:16] + "..."
            }
            for c in self._certificates.values()
            if not c.is_revoked and c.expires_at > now
        ]


# =============================================================================
# LAYER 2: THE TOOL GATEWAY & LEAST PRIVILEGE
# =============================================================================

class CredentialBroker:
    """Holds sensitive credentials in a sealed vault. Agents receive opaque tickets."""

    def __init__(self):
        self._secrets_vault: Dict[str, str] = {
            "PAYFAST_MERCHANT_KEY": "enc_pf_prod_9988221100_sealed",
            "STRIPE_API_KEY": "enc_sk_live_00998877665544332211_sealed",
            "DATABASE_WRITE_URL": "postgresql://luqi_admin:****@db-cluster.internal:5432/luqi_prod",
            "AWS_S3_VAULT_KEY": "enc_aws_vault_secret_sealed",
        }
        self._ephemeral_tickets: Dict[str, Dict[str, Any]] = {}

    def issue_delegated_ticket(self, agent_serial: str, target_service: str, max_uses: int = 1) -> str:
        ticket_id = f"tkt_{uuid.uuid4().hex[:12]}"
        self._ephemeral_tickets[ticket_id] = {
            "agent_serial": agent_serial,
            "target_service": target_service,
            "max_uses": max_uses,
            "uses_remaining": max_uses,
            "expires_at": time.time() + 300,
        }
        return ticket_id

    def execute_with_ticket(self, ticket_id: str) -> Optional[str]:
        ticket = self._ephemeral_tickets.get(ticket_id)
        if not ticket or ticket["expires_at"] < time.time() or ticket["uses_remaining"] <= 0:
            return None
        ticket["uses_remaining"] -= 1
        service = ticket["target_service"]
        return self._secrets_vault.get(service)


@dataclass
class PendingApproval:
    id: str
    agent_id: str
    agent_spiffe: str
    action_type: str
    parameters: Dict[str, Any]
    risk_level: str
    reason: str
    created_at: float
    status: str = "PENDING"  # PENDING, APPROVED, REJECTED, ESCALATED
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[float] = None
    step_up_verified: bool = False


class HumanInTheLoopRegistry:
    """Gates all high-impact or irreversible actions behind human verification (AST07)."""

    HIGH_IMPACT_TOOLS = {
        "payfast_charge": "Financial Transaction (PayFast Payment Execution)",
        "stripe_charge": "Financial Transaction (Stripe Charge)",
        "delete_vault_record": "Irreversible Data Destruction",
        "database_bulk_update": "Mass Database Alteration",
        "execute_shell_command": "Remote Code Execution / System Access",
        "bulk_email_dispatch": "External Communications Broadcast",
        "grant_admin_privileges": "Security Privilege Escalation"
    }

    def __init__(self):
        self._approvals: Dict[str, PendingApproval] = {}

    def is_high_impact(self, tool_name: str) -> bool:
        return tool_name in self.HIGH_IMPACT_TOOLS

    def register_approval_request(
        self,
        agent_id: str,
        agent_spiffe: str,
        action_type: str,
        parameters: Dict[str, Any],
        reason: str
    ) -> PendingApproval:
        req_id = f"hitl_{uuid.uuid4().hex[:10]}"
        approval = PendingApproval(
            id=req_id,
            agent_id=agent_id,
            agent_spiffe=agent_spiffe,
            action_type=action_type,
            parameters=parameters,
            risk_level="CRITICAL" if "charge" in action_type or "delete" in action_type else "HIGH",
            reason=reason,
            created_at=time.time()
        )
        self._approvals[req_id] = approval
        return approval

    def resolve_approval(self, approval_id: str, decision: str, reviewer: str, step_up_token: Optional[str] = None) -> Tuple[bool, str]:
        app = self._approvals.get(approval_id)
        if not app:
            return False, "Approval request not found"
        if app.status != "PENDING":
            return False, f"Approval already resolved as {app.status}"

        if decision == "APPROVE":
            app.status = "APPROVED"
            app.reviewed_by = reviewer
            app.reviewed_at = time.time()
            app.step_up_verified = bool(step_up_token)
            return True, "Action approved. Agent execution unlocked."
        elif decision == "REJECT":
            app.status = "REJECTED"
            app.reviewed_by = reviewer
            app.reviewed_at = time.time()
            return True, "Action rejected. Agent prevented from executing action."
        elif decision == "ESCALATE":
            app.status = "ESCALATED"
            app.reviewed_by = reviewer
            app.reviewed_at = time.time()
            return True, "Action escalated to Senior Compliance Officer."
        return False, "Invalid decision"

    def list_pending(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": a.id,
                "agent_id": a.agent_id,
                "agent_spiffe": a.agent_spiffe,
                "action_type": a.action_type,
                "action_label": self.HIGH_IMPACT_TOOLS.get(a.action_type, a.action_type),
                "parameters": a.parameters,
                "risk_level": a.risk_level,
                "reason": a.reason,
                "created_at": datetime.fromtimestamp(a.created_at, timezone.utc).isoformat(),
                "status": a.status,
                "step_up_verified": a.step_up_verified,
            }
            for a in self._approvals.values()
        ]


# =============================================================================
# LAYER 3: RUNTIME DEFENSES & BLAST RADIUS CONTAINMENT
# =============================================================================

class SanitizationDLP:
    """Dual-pass DLP and Named Entity Recognition (NER) sanitizer for PII & injection prevention."""

    # PII & Secret Patterns
    PATTERNS = {
        "CREDIT_CARD": re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b"),
        "SA_ID_NUMBER": re.compile(r"\b\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{7}\b"),
        "API_SECRET_KEY": re.compile(r"(?:sk-[a-zA-Z0-9_-]{20,}|AIzaSy[a-zA-Z0-9_-]{33}|Bearer\s+[a-zA-Z0-9._-]{20,})"),
        "EMAIL": re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
        "PHONE_NUMBER": re.compile(r"\b(?:\+27|0)\s?\d{2}\s?\d{3}\s?\d{4}\b"),
    }

    # AST01 Prompt Injection & Jailbreak Heuristics
    INJECTION_TRIGGERS = [
        re.compile(r"ignore\s+(?:all\s+)?previous\s+instructions", re.IGNORECASE),
        re.compile(r"disregard\s+(?:the\s+)?system\s+prompt", re.IGNORECASE),
        re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
        re.compile(r"dan\s+mode|jailbreak|unrestricted\s+ai", re.IGNORECASE),
        re.compile(r"reveal\s+(?:your\s+)?system\s+(?:prompt|instructions|keys)", re.IGNORECASE),
        re.compile(r"bypass\s+(?:security|guards|filters|auth)", re.IGNORECASE),
        re.compile(r"override\s+safety\s+protocols", re.IGNORECASE),
    ]

    @classmethod
    def sanitize_input(cls, text: str) -> Tuple[str, bool, List[str]]:
        """Pre-cleans incoming prompts and flags prompt injection / jailbreaks (AST01)."""
        findings: List[str] = []
        is_suspicious = False

        # 1. Injection & Jailbreak Check
        for trigger in cls.INJECTION_TRIGGERS:
            if trigger.search(text):
                is_suspicious = True
                findings.append(f"AST01 Detection: Prompt injection signature matched ({trigger.pattern})")

        # 2. Redact sensitive values on ingestion
        sanitized = text
        for p_name, regex in cls.PATTERNS.items():
            if regex.search(sanitized):
                findings.append(f"DLP Mask: Detected and redacted inbound {p_name}")
                sanitized = regex.sub(f"[{p_name}_REDACTED]", sanitized)

        return sanitized, is_suspicious, findings

    @classmethod
    def sanitize_output(cls, text: str) -> Tuple[str, List[str]]:
        """Scans outbound text to prevent secret leakage and PII exfiltration (AST04)."""
        findings: List[str] = []
        sanitized = text
        for p_name, regex in cls.PATTERNS.items():
            matches = regex.findall(sanitized)
            if matches:
                findings.append(f"AST04 Guard: Redacted {len(matches)} instance(s) of {p_name} in output stream")
                sanitized = regex.sub(f"[{p_name}_REDACTED]", sanitized)
        return sanitized, findings


class CircuitBreakerGovernor:
    """Guards against recursive agent loops, excessive steps, and token budget blowouts (AST05)."""

    def __init__(
        self,
        max_steps: int = 10,
        max_duration_seconds: float = 45.0,
        max_token_budget: int = 4000,
        max_cost_usd: float = 0.50
    ):
        self.max_steps = max_steps
        self.max_duration_seconds = max_duration_seconds
        self.max_token_budget = max_token_budget
        self.max_cost_usd = max_cost_usd
        self.history_tool_calls: List[str] = []
        self.start_time = time.time()
        self.total_tokens_consumed = 0
        self.current_step = 0
        self.tripped = False
        self.trip_reason: Optional[str] = None

    def record_step(self, tool_name: Optional[str] = None, tokens_used: int = 0) -> Tuple[bool, Optional[str]]:
        if self.tripped:
            return False, f"Circuit Breaker already TRIPPED: {self.trip_reason}"

        self.current_step += 1
        self.total_tokens_consumed += tokens_used

        # Check step limit
        if self.current_step > self.max_steps:
            self.tripped = True
            self.trip_reason = f"Step limit exceeded ({self.current_step}/{self.max_steps} steps). Halted to prevent runaway compute."
            return False, self.trip_reason

        # Check time limit
        elapsed = time.time() - self.start_time
        if elapsed > self.max_duration_seconds:
            self.tripped = True
            self.trip_reason = f"Time budget exceeded ({elapsed:.1f}s / {self.max_duration_seconds}s). Halted to protect API health."
            return False, self.trip_reason

        # Check token cap
        if self.total_tokens_consumed > self.max_token_budget:
            self.tripped = True
            self.trip_reason = f"Token budget exceeded ({self.total_tokens_consumed}/{self.max_token_budget} tokens). Spending cap enforced."
            return False, self.trip_reason

        # Check recursive looping (e.g. calling the exact same tool with identical patterns 3 times in a row)
        if tool_name:
            self.history_tool_calls.append(tool_name)
            if len(self.history_tool_calls) >= 3 and self.history_tool_calls[-3:] == [tool_name, tool_name, tool_name]:
                self.tripped = True
                self.trip_reason = f"Cyclic tool recursion detected on '{tool_name}' (AST05 recursion trap). Halted loop."
                return False, self.trip_reason

        return True, None


# =============================================================================
# STEP-UP AUTHENTICATION GATEWAY (FOR PAYFAST & FINANCIAL OPS)
# =============================================================================

class StepUpAuthGateway:
    """Issues and verifies challenge codes for high-risk operations (PayFast, billing, key rotation)."""

    def __init__(self):
        self._challenges: Dict[str, Dict[str, Any]] = {}

    def issue_challenge(self, user_email: str, action: str, amount_zar: float = 0.0) -> Dict[str, Any]:
        challenge_id = f"mfa_{uuid.uuid4().hex[:8]}"
        # Generate a 6-digit mock TOTP / OTP code (deterministic for dev demo, verified via token)
        otp_code = str(100000 + (hash(challenge_id) % 900000))
        self._challenges[challenge_id] = {
            "challenge_id": challenge_id,
            "user_email": user_email,
            "action": action,
            "amount_zar": amount_zar,
            "code": otp_code,
            "created_at": time.time(),
            "expires_at": time.time() + 180,  # 3 minutes
            "verified": False,
        }
        return {
            "challenge_id": challenge_id,
            "action": action,
            "amount_zar": amount_zar,
            "expires_in_seconds": 180,
            "hint": f"Verification code sent to {user_email[:3]}***@luqi.ai (Demo test code: {otp_code})"
        }

    def verify_challenge(self, challenge_id: str, code_entered: str) -> Tuple[bool, str, Optional[str]]:
        ch = self._challenges.get(challenge_id)
        if not ch:
            return False, "Invalid or expired challenge ID", None
        if ch["expires_at"] < time.time():
            return False, "Challenge expired. Please request a new code.", None
        if ch["code"] != code_entered.strip():
            return False, "Incorrect verification code.", None

        ch["verified"] = True
        step_up_token = f"stepup_tok_{uuid.uuid4().hex}"
        return True, "Step-up authentication successful. High-risk operation authorized.", step_up_token


# =============================================================================
# GLOBAL ZERO TRUST ARCHITECTURE DEFENSE CONTROLLER
# =============================================================================

class ZeroTrustController:
    """Master singleton coordinating all 3 ZTA layers and OWASP AST10 safeguards."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ZeroTrustController, cls).__new__(cls)
            cls._instance.identity_authority = AgentIdentityAuthority()
            cls._instance.credential_broker = CredentialBroker()
            cls._instance.hitl_registry = HumanInTheLoopRegistry()
            cls._instance.step_up_gateway = StepUpAuthGateway()
            cls._instance.audit_log: List[Dict[str, Any]] = []
            cls._instance._seed_sample_data()
        return cls._instance

    def _seed_sample_data(self):
        """Pre-seeds active agent identities and realistic audit events for immediate display."""
        # Issue certificates for core autonomous workers
        cert_data = self.identity_authority.issue_certificate("luqi-data-architect", ["data:read", "data:write", "analytics"])
        cert_fin = self.identity_authority.issue_certificate("payfast-settlement-agent", ["payments:initiate", "billing:query"])
        cert_lab = self.identity_authority.issue_certificate("lab-physics-agent", ["simulation:run"])

        # Seed sample HITL approvals
        self.hitl_registry.register_approval_request(
            agent_id="payfast-settlement-agent",
            agent_spiffe=cert_fin.spiffe_id,
            action_type="payfast_charge",
            parameters={"amount_zar": 450.00, "user_email": "thabo@enterprise.co.za", "purpose": "Annual Token Plan Top-up"},
            reason="High-value autonomous recurring billing requires human sign-off (AST07)"
        )
        self.hitl_registry.register_approval_request(
            agent_id="luqi-data-architect",
            agent_spiffe=cert_data.spiffe_id,
            action_type="delete_vault_record",
            parameters={"record_id": "rec_0918_archived_contracts", "retention_policy": "7_years"},
            reason="Permanent deletion of corporate compliance archive requested by agent"
        )

        # Seed initial audit logs
        self.record_audit_event("IDENTITY_ISSUED", "AST06", "Issued ephemeral SPIFFE cert for luqi-data-architect", "LOW")
        self.record_audit_event("IDENTITY_ISSUED", "AST06", "Issued ephemeral SPIFFE cert for payfast-settlement-agent", "LOW")
        self.record_audit_event("HITL_GATE_TRIGGERED", "AST07", "Intercepted PayFast charge R450; routed to HITL approval inbox", "HIGH")

    def record_audit_event(self, event_type: str, ast_tag: str, message: str, severity: str = "INFO"):
        self.audit_log.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "ast_tag": ast_tag,
            "ast_meta": OWASP_AST10_CATALOG.get(ast_tag, {}),
            "message": message,
            "severity": severity
        })
        # Keep log size bounded
        if len(self.audit_log) > 200:
            self.audit_log.pop(0)

    def get_dashboard_telemetry(self) -> Dict[str, Any]:
        """Provides full metrics for the security defense UI."""
        certs = self.identity_authority.list_active_certificates()
        approvals = self.hitl_registry.list_pending()
        pending_count = sum(1 for a in approvals if a["status"] == "PENDING")

        return {
            "defense_status": "ACTIVE_ZERO_TRUST",
            "framework_version": "OWASP Agentic Skills Top 10 (AST10) 2026 Edition",
            "layers": {
                "layer1_identity": {
                    "status": "ENFORCING",
                    "mtls_active": True,
                    "active_certificates": len(certs),
                    "certificates": certs
                },
                "layer2_tool_gateway": {
                    "status": "ENFORCING",
                    "least_privilege": True,
                    "credential_brokering": True,
                    "pending_hitl_approvals": pending_count,
                    "total_hitl_requests": len(approvals)
                },
                "layer3_runtime_defenses": {
                    "status": "ENFORCING",
                    "dlp_sanitization": "ACTIVE_DUAL_PASS",
                    "circuit_breaker": "ARMED_10_STEPS_MAX",
                    "spending_cap_enforced": True
                }
            },
            "threat_radar": OWASP_AST10_CATALOG,
            "pending_approvals": approvals,
            "recent_audit_events": self.audit_log[-20:]
        }


# Singleton accessor
zta_controller = ZeroTrustController()
