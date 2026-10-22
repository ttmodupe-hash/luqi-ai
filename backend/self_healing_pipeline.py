"""Fail-closed LUQI agent remediation intake.

The application server is NOT an isolated code-execution environment. This
module records bounded, redacted review proposals only. It does not execute
model-written code, create GitHub PRs, merge branches, grant deployment rights
or pretend that tests have run. Real corrections must go through an isolated,
least-privilege CI pipeline, independent review and separately authorized
deployment.

A local in-memory proposal register is deliberately NOT described as durable
audit evidence. Replace it with an authorized, owner-scoped database workflow
before exposing this service to users or relying on it after a restart.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

MAX_REPORT_LENGTH = 4000
MAX_JOBS_IN_MEMORY = 100
_SAFE_PATH = re.compile(r"^[a-zA-Z0-9_./-]{1,180}$")
_SECRET = re.compile(
    r"(?i)\b(api[_-]?key|token|secret|password|authorization)\b\s*[:=]\s*"
    r"([^\s,;]+)"
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sanitize_report(value: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Bug report must be a nonempty string.")
    text = value.strip()
    if len(text) > MAX_REPORT_LENGTH:
        raise ValueError("Bug report is too long.")
    return _SECRET.sub(lambda match: f"{match.group(1)}=[REDACTED]", text)


def _safe_target(value: Optional[str]) -> str:
    if value is None:
        return "unassigned"
    if not isinstance(value, str) or not _SAFE_PATH.fullmatch(value):
        raise ValueError("Invalid advisory target path.")
    segments = value.split("/")
    if any(segment in ("", ".", "..") for segment in segments):
        raise ValueError("Invalid advisory target path.")
    if value.startswith("/") or value.startswith("-") or "\\" in value:
        raise ValueError("Invalid advisory target path.")
    return value


def _heuristic_category(description: str) -> str:
    """Unverified triage hint, not a diagnosis or a completed remediation."""
    value = description.lower()
    if any(key in value for key in ("unauthorized", "injection", "csrf", "credential", "secret leaked")):
        return "potential_security"
    if any(key in value for key in ("timeout", "connection refused", "deadlock", "unavailable")):
        return "potential_reliability"
    if any(key in value for key in ("incorrect total", "wrong amount", "double charge", "duplicate payment")):
        return "potential_financial"
    return "unclassified"


class SandboxedExecutionTool:
    """Compatibility surface: refuses app-host execution of untrusted code."""

    name = "Execute_Code_In_Sandbox"
    description = "Disabled: external isolated CI and independent review required."

    def _run(self, code_to_test: str) -> str:
        # Deliberately do not inspect, write to disk, shell out or evaluate code.
        return (
            "BLOCKED: application-host code execution is disabled. "
            "No sandbox was started, no tests were run."
        )


class GitHubPRTool:
    """Compatibility surface: never fabricates a PR or pushes model-produced code."""

    name = "Create_GitHub_Pull_Request"
    description = "Disabled: verified external CI and reviewed GitHub integration required."

    def _run(
        self, branch_name: str, file_path: str, updated_code: str,
        pr_title: str, pr_body: str
    ) -> str:
        return (
            "UNAVAILABLE: no GitHub pull request was created. "
            "Code review, isolated CI and a least-privilege integration are required."
        )


@dataclass
class PipelineJob:
    job_id: str
    bug_report: str
    target_file: str
    status: str  # AWAITING_EXTERNAL_REVIEW; REJECTED is not writable here.
    sandbox_output: Optional[str] = None
    pr_url: Optional[str] = None
    pr_number: Optional[int] = None
    branch_name: Optional[str] = None
    fix_diff: Optional[str] = None
    created_at: str = field(default_factory=_utc_now)
    resolved_at: Optional[str] = None
    reviewer: Optional[str] = None
    execution_trace: List[Dict[str, Any]] = field(default_factory=list)
    evidence_sha256: str = ""
    heuristic_category: str = "unclassified"
    persistence: str = "in_memory_only"
    execution_verified: bool = False
    ci_verified: bool = False
    deployed: bool = False


class SelfHealingPipelineManager:
    """Records bounded proposals without any production mutation capability.

    This class intentionally exposes no working deployment authorization.
    Reviewers must verify identity and CI evidence in a separate control plane.
    """

    def __init__(self) -> None:
        self.jobs: Dict[str, PipelineJob] = {}
        self.sandbox_tool = SandboxedExecutionTool()
        self.pr_tool = GitHubPRTool()

    def run_sandbox_code(self, code_to_test: str) -> Dict[str, Any]:
        return {
            "output": self.sandbox_tool._run(code_to_test),
            "duration_seconds": 0,
            "circuit_breaker_timeout": None,
            "isolated": False,
            "executed": False,
            "tests_passed": False,
        }

    def trigger_self_healing(
        self, bug_report: str, target_file: Optional[str] = None
    ) -> PipelineJob:
        redacted = _sanitize_report(bug_report)
        advisory_path = _safe_target(target_file)
        if len(self.jobs) >= MAX_JOBS_IN_MEMORY:
            raise RuntimeError(
                "In-memory proposal capacity reached; durable reviewed queue required."
            )
        evidence_hash = hashlib.sha256(
            f"{redacted}\n{advisory_path}".encode("utf-8")
        ).hexdigest()
        job = PipelineJob(
            job_id=f"sh_{uuid.uuid4().hex[:16]}",
            bug_report=redacted,
            target_file=advisory_path,
            status="AWAITING_EXTERNAL_REVIEW",
            evidence_sha256=evidence_hash,
            heuristic_category=_heuristic_category(redacted),
        )
        job.execution_trace = [
            {
                "step": "Intake",
                "status": "RECORDED",
                "detail": "Redacted report retained in process memory only.",
                "timestamp": job.created_at,
            },
            {
                "step": "Risk triage",
                "status": "HEURISTIC_ONLY",
                "detail": "Category is an unverified keyword-based review hint.",
                "timestamp": job.created_at,
            },
            {
                "step": "External security gate",
                "status": "AWAITING_EXTERNAL_REVIEW",
                "detail": (
                    "No code executed, no sandbox tests completed, no GitHub PR "
                    "created and no deployment authorized."
                ),
                "timestamp": job.created_at,
            },
        ]
        self.jobs[job.job_id] = job
        return job

    def authorize_deployment(
        self, job_id: str, reviewer: str = "unverified"
    ) -> Tuple[bool, str]:
        # The caller's reviewer string is NOT proof of identity.
        # In-process approval cannot merge/deploy or change the job to deployed.
        if job_id not in self.jobs:
            return False, "Proposal not found."
        return (
            False,
            "Deployment is blocked. Verified reviewer identity, independent CI, "
            "staging acceptance and an external release approval are required. "
            "No merge or deployment occurred.",
        )

    def reject_deployment(
        self, job_id: str, reason: str = "Requires manual code review",
        reviewer: str = "unverified"
    ) -> Tuple[bool, str]:
        if job_id not in self.jobs:
            return False, "Proposal not found."
        return (
            False,
            "Review state cannot be changed by an unverified in-process caller. "
            "Use an authenticated external approval workflow.",
        )

    def list_jobs(self) -> List[Dict[str, Any]]:
        # Snapshot only: avoid returning internal mutable lists to callers.
        return [
            {
                "job_id": job.job_id,
                "bug_report": job.bug_report,
                "target_file": job.target_file,
                "status": job.status,
                "sandbox_output": job.sandbox_output,
                "pr_url": job.pr_url,
                "pr_number": job.pr_number,
                "branch_name": job.branch_name,
                "fix_diff": job.fix_diff,
                "created_at": job.created_at,
                "resolved_at": job.resolved_at,
                "reviewer": job.reviewer,
                "execution_trace": [dict(step) for step in job.execution_trace],
                "evidence_sha256": job.evidence_sha256,
                "heuristic_category": job.heuristic_category,
                "persistence": job.persistence,
                "execution_verified": job.execution_verified,
                "ci_verified": job.ci_verified,
                "deployed": job.deployed,
            }
            for job in reversed(list(self.jobs.values()))
        ]


self_healing_pipeline = SelfHealingPipelineManager()
