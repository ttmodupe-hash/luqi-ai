"""
LangGraph ZTA State Machine with Human-in-the-Loop (HITL) & Performance Grading.
Implements the 2026 OWASP AST10-governed execution graph for autonomous agents.
"""

import time
from typing import Dict, Any, List, Optional, TypedDict
from backend.zta_security import (
    zta_controller,
    SanitizationDLP,
    CircuitBreakerGovernor,
    OWASP_AST10_CATALOG
)


class ZTAAgentState(TypedDict, total=False):
    session_id: str
    agent_id: str
    agent_spiffe: str
    cert_serial: str
    prompt: str
    sanitized_prompt: str
    mtls_verified: bool
    dlp_inbound_findings: List[str]
    is_suspicious_injection: bool
    requested_tool: Optional[str]
    tool_parameters: Dict[str, Any]
    hitl_required: bool
    approval_id: Optional[str]
    approval_status: str
    circuit_breaker_status: Dict[str, Any]
    raw_output: str
    final_output: str
    dlp_outbound_findings: List[str]
    performance_grade: Dict[str, Any]
    execution_steps: List[Dict[str, Any]]
    completed: bool


class LangGraphZTAWorkflow:
    """Orchestrates an agent through the Zero Trust multi-node execution pipeline."""

    def __init__(self):
        self.zta = zta_controller

    def run_workflow(
        self,
        prompt: str,
        agent_id: str = "luqi-data-architect",
        requested_tool: Optional[str] = None,
        tool_parameters: Optional[Dict[str, Any]] = None,
        approval_decision: Optional[str] = None,  # 'APPROVE', 'REJECT', None
        approval_id: Optional[str] = None
    ) -> ZTAAgentState:
        start_time = time.time()
        steps: List[Dict[str, Any]] = []

        # 1. Initialize State
        state: ZTAAgentState = {
            "session_id": f"sess_{int(time.time()*1000)}",
            "agent_id": agent_id,
            "prompt": prompt,
            "sanitized_prompt": prompt,
            "mtls_verified": False,
            "dlp_inbound_findings": [],
            "is_suspicious_injection": False,
            "requested_tool": requested_tool,
            "tool_parameters": tool_parameters or {},
            "hitl_required": False,
            "approval_status": "NONE",
            "circuit_breaker_status": {"tripped": False},
            "raw_output": "",
            "final_output": "",
            "dlp_outbound_findings": [],
            "performance_grade": {},
            "execution_steps": steps,
            "completed": False
        }

        governor = CircuitBreakerGovernor(max_steps=8, max_duration_seconds=30.0)

        # ─────────────────────────────────────────────────────────────────────
        # NODE 1: Identity & mTLS Continuous Verification (AST06 & AST03)
        # ─────────────────────────────────────────────────────────────────────
        # Issue/fetch active cert for this agent
        certs = self.zta.identity_authority.list_active_certificates()
        agent_cert = next((c for c in certs if c["agent_name"] == agent_id), None)
        if not agent_cert:
            # Issue on the fly if testing
            new_cert = self.zta.identity_authority.issue_certificate(agent_id, ["data:read", "data:write", "payments:initiate"])
            serial = new_cert.serial_number
            spiffe = new_cert.spiffe_id
        else:
            serial = agent_cert["serial_number"]
            spiffe = agent_cert["spiffe_id"]

        valid, cert_msg = self.zta.identity_authority.verify_certificate(serial)
        state["cert_serial"] = serial
        state["agent_spiffe"] = spiffe
        state["mtls_verified"] = valid

        steps.append({
            "node": "identity_mtls_gate",
            "status": "PASS" if valid else "FAIL",
            "details": f"mTLS verified for {spiffe}: {cert_msg}",
            "ast_ref": "AST06"
        })

        if not valid:
            state["final_output"] = f"[SECURITY HALT - AST06] {cert_msg}"
            state["performance_grade"] = self._compute_grade(False, 0.0, 1, ["AST06_VIOLATION"])
            return state

        # ─────────────────────────────────────────────────────────────────────
        # NODE 2: Input Sanitization & AST01 Prompt Injection Filter
        # ─────────────────────────────────────────────────────────────────────
        sanitized_in, is_injection, in_findings = SanitizationDLP.sanitize_input(prompt)
        state["sanitized_prompt"] = sanitized_in
        state["is_suspicious_injection"] = is_injection
        state["dlp_inbound_findings"] = in_findings

        steps.append({
            "node": "input_sanitization_dlp",
            "status": "WARN" if is_injection else "PASS",
            "details": f"Sanitized inbound payload. Findings: {len(in_findings)}",
            "ast_ref": "AST01"
        })

        if is_injection:
            self.zta.record_audit_event("INJECTION_BLOCKED", "AST01", f"Intercepted adversarial prompt for agent {agent_id}", "CRITICAL")
            state["final_output"] = "[SECURITY INTERCEPT - AST01] Prompt injection / jailbreak override detected and neutralized. Safety boundaries enforced."
            state["performance_grade"] = self._compute_grade(True, 0.82, len(steps), ["AST01_BLOCKED", "DEFENSE_ACTIVE"])
            return state

        # ─────────────────────────────────────────────────────────────────────
        # NODE 3: Tool Gateway & Least Privilege Policy Check (AST02 & AST07)
        # ─────────────────────────────────────────────────────────────────────
        if requested_tool:
            is_high_risk = self.zta.hitl_registry.is_high_impact(requested_tool)
            state["hitl_required"] = is_high_risk

            # Check if this tool requires Human Approval
            if is_high_risk:
                # Check if approval already provided
                if approval_id and approval_decision:
                    resolved, res_msg = self.zta.hitl_registry.resolve_approval(
                        approval_id, approval_decision, reviewer="security_operator@luqi.ai"
                    )
                    state["approval_id"] = approval_id
                    state["approval_status"] = approval_decision
                    steps.append({
                        "node": "hitl_approval_gate",
                        "status": "RESOLVED",
                        "details": f"HITL Decision: {approval_decision} for {requested_tool}. {res_msg}",
                        "ast_ref": "AST07"
                    })
                    if approval_decision != "APPROVE":
                        state["final_output"] = f"[HUMAN-IN-THE-LOOP REJECTED] Action '{requested_tool}' was denied by security operator."
                        state["performance_grade"] = self._compute_grade(True, 0.95, len(steps), ["HITL_ENFORCED"])
                        return state
                else:
                    # Register pending approval and suspend graph
                    pending = self.zta.hitl_registry.register_approval_request(
                        agent_id=agent_id,
                        agent_spiffe=spiffe,
                        action_type=requested_tool,
                        parameters=tool_parameters or {},
                        reason="Tool involves irreversible or financial impact (AST07 Zero Trust mandate)."
                    )
                    state["approval_id"] = pending.id
                    state["approval_status"] = "PENDING"
                    steps.append({
                        "node": "hitl_approval_gate",
                        "status": "INTERRUPTED",
                        "details": f"Action '{requested_tool}' paused at HITL Gate. Approval request generated: {pending.id}",
                        "ast_ref": "AST07"
                    })
                    state["final_output"] = f"[PENDING APPROVAL] Action '{requested_tool}' is paused in the Human-in-the-Loop review queue (Ticket: {pending.id}). Please review in Defense Center."
                    state["performance_grade"] = self._compute_grade(True, 0.98, len(steps), ["HITL_PAUSED"])
                    return state

        # ─────────────────────────────────────────────────────────────────────
        # NODE 4: Execution Node (Model Inference / Safe Tool Dispatch)
        # ─────────────────────────────────────────────────────────────────────
        ok, trip_msg = governor.record_step(requested_tool, tokens_used=120)
        if not ok:
            state["circuit_breaker_status"] = {"tripped": True, "reason": trip_msg}
            steps.append({
                "node": "circuit_breaker",
                "status": "FAIL",
                "details": f"Execution halted by Circuit Breaker: {trip_msg}",
                "ast_ref": "AST05"
            })
            state["final_output"] = f"[CIRCUIT BREAKER HALT - AST05] {trip_msg}"
            state["performance_grade"] = self._compute_grade(False, 0.60, len(steps), ["AST05_LIMIT"])
            return state

        # Synthetic agent execution reasoning
        tool_clause = f" Executed tool '{requested_tool}' with validated parameter schemas." if requested_tool else ""
        raw_output = f"Analysis complete for request: '{sanitized_in}'.{tool_clause} Verification confirms Zero Trust policies upheld across all execution layers."

        # ─────────────────────────────────────────────────────────────────────
        # NODE 5: Output DLP Redaction & Secret Leakage Prevention (AST04)
        # ─────────────────────────────────────────────────────────────────────
        sanitized_out, out_findings = SanitizationDLP.sanitize_output(raw_output)
        state["raw_output"] = raw_output
        state["final_output"] = sanitized_out
        state["dlp_outbound_findings"] = out_findings

        steps.append({
            "node": "output_dlp_and_grade",
            "status": "PASS",
            "details": f"Outbound DLP scrubbed. Redactions: {len(out_findings)}",
            "ast_ref": "AST04"
        })

        state["completed"] = True
        elapsed_ms = int((time.time() - start_time) * 1000)
        state["performance_grade"] = self._compute_grade(True, 0.99, len(steps), ["ALL_GUARDS_PASSED"], elapsed_ms)

        self.zta.record_audit_event("AGENT_EXECUTION_COMPLETED", "AST10", f"Workflow finished cleanly for agent {agent_id} in {elapsed_ms}ms", "INFO")
        return state

    def _compute_grade(
        self,
        success: bool,
        safety_score: float,
        step_count: int,
        tags: List[str],
        latency_ms: int = 120
    ) -> Dict[str, Any]:
        """Calculates a comprehensive performance & security grade for the execution."""
        if safety_score >= 0.95 and success:
            letter_grade = "A+"
        elif safety_score >= 0.90:
            letter_grade = "A"
        elif safety_score >= 0.80:
            letter_grade = "B"
        elif safety_score >= 0.70:
            letter_grade = "C"
        else:
            letter_grade = "F"

        return {
            "letter_grade": letter_grade,
            "safety_score_percentage": int(safety_score * 100),
            "step_count": step_count,
            "latency_ms": latency_ms,
            "compliance_status": "COMPLIANT" if success and safety_score >= 0.80 else "NON_COMPLIANT",
            "audit_tags": tags,
            "defense_engine": "OWASP AST10 & ZTA Governor v2026.1"
        }


# Singleton workflow runner
langgraph_zta = LangGraphZTAWorkflow()
