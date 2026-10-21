"""Security regression checks for the fail-closed Python agent pipeline.

Deliberately runs with the standard library only; no credentials or AI vendor
services, Docker daemon, repository write access, or host code execution.
"""
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.self_healing_pipeline import (
    GitHubPRTool,
    MAX_JOBS_IN_MEMORY,
    SandboxedExecutionTool,
    SelfHealingPipelineManager,
)


class FailClosedHealingTests(unittest.TestCase):
    def setUp(self):
        self.manager = SelfHealingPipelineManager()

    def test_no_fabricated_history_is_seeded(self):
        self.assertEqual(self.manager.list_jobs(), [])

    def test_intake_does_not_claim_ci_pr_or_deployment(self):
        job = self.manager.trigger_self_healing(
            "Database timeout after 5 seconds", "api/db.ts"
        )
        self.assertEqual(job.status, "AWAITING_EXTERNAL_REVIEW")
        self.assertEqual(job.heuristic_category, "potential_reliability")
        self.assertIsNone(job.pr_url)
        self.assertIsNone(job.pr_number)
        self.assertIsNone(job.branch_name)
        self.assertIsNone(job.fix_diff)
        self.assertIsNone(job.sandbox_output)
        self.assertFalse(job.execution_verified)
        self.assertFalse(job.ci_verified)
        self.assertFalse(job.deployed)
        self.assertEqual(len(job.evidence_sha256), 64)
        self.assertEqual(job.persistence, "in_memory_only")
        self.assertEqual(len(self.manager.list_jobs()), 1)
        self.assertFalse(any(
            step["status"] in ("PASSED", "DEPLOYED", "CI_VERIFIED")
            for step in job.execution_trace
        ))

    def test_never_executes_model_code_even_if_docker_unavailable(self):
        with tempfile.TemporaryDirectory() as temp, patch(
            "subprocess.run",
            side_effect=AssertionError("Host process must not execute"),
        ):
            victim = Path(temp) / "should-not-be-created"
            malicious = f"from pathlib import Path; Path({str(victim)!r}).write_text('owned')"
            result = self.manager.run_sandbox_code(malicious)
            self.assertFalse(result["executed"])
            self.assertFalse(result["isolated"])
            self.assertFalse(result["tests_passed"])
            self.assertIn("BLOCKED", result["output"])
            self.assertFalse(victim.exists())
            self.assertIn("BLOCKED", SandboxedExecutionTool()._run(malicious))

    def test_never_forges_a_pull_request_even_when_token_is_present(self):
        with patch.dict(os.environ, {"GITHUB_TOKEN": "fake-test-not-a-token"}):
            response = GitHubPRTool()._run(
                "agent-fix/unsafe", "api/foo.ts", "malicious code", "Fix", "Evidence"
            )
        self.assertIn("UNAVAILABLE", response)
        self.assertIn("no GitHub pull request was created", response)
        self.assertNotIn("https://github.com/", response)

    def test_caller_controlled_reviewer_cannot_merge_or_deploy(self):
        job = self.manager.trigger_self_healing("Suspicious CSRF bypass")
        approved, response = self.manager.authorize_deployment(
            job.job_id, reviewer="system-admin"
        )
        self.assertFalse(approved)
        self.assertIn("No merge or deployment occurred", response)
        rejected, reason = self.manager.reject_deployment(
            job.job_id, reviewer="system-admin"
        )
        self.assertFalse(rejected)
        self.assertIn("unverified", reason)
        self.assertEqual(self.manager.list_jobs()[0]["status"], "AWAITING_EXTERNAL_REVIEW")
        self.assertFalse(self.manager.list_jobs()[0]["deployed"])

    def test_missing_approval_target_does_not_mutate_jobs(self):
        self.assertFalse(self.manager.authorize_deployment("missing")[0])
        self.assertFalse(self.manager.reject_deployment("missing")[0])
        self.assertEqual(self.manager.list_jobs(), [])

    def test_advisory_target_path_cannot_traverse_or_escape(self):
        for bad in ("../secrets.env", "/etc/passwd", "api/../../.env",
                    "api//hidden", "api\\hidden", "-run", ""):
            with self.subTest(path=bad):
                with self.assertRaises(ValueError):
                    self.manager.trigger_self_healing("Report", bad)
        self.assertEqual(self.manager.list_jobs(), [])

    def test_redacts_credential_like_fields_before_storage(self):
        job = self.manager.trigger_self_healing(
            "Provider error token=secret123 password:pa55 api_key=privatekey"
        )
        self.assertNotIn("secret123", job.bug_report)
        self.assertNotIn("pa55", job.bug_report)
        self.assertNotIn("privatekey", job.bug_report)
        self.assertIn("[REDACTED]", job.bug_report)

    def test_proposal_queue_is_bounded_and_fails_closed(self):
        for number in range(MAX_JOBS_IN_MEMORY):
            self.manager.trigger_self_healing(f"Case {number}")
        with self.assertRaisesRegex(RuntimeError, "capacity"):
            self.manager.trigger_self_healing("Case overflow")
        self.assertEqual(len(self.manager.list_jobs()), MAX_JOBS_IN_MEMORY)

    def test_input_validation_rejects_missing_and_oversize_reports(self):
        with self.assertRaises(ValueError):
            self.manager.trigger_self_healing("")
        with self.assertRaises(ValueError):
            self.manager.trigger_self_healing("x" * 4001)
        self.assertEqual(self.manager.list_jobs(), [])

    def test_returned_job_listing_does_not_allow_trace_mutation(self):
        self.manager.trigger_self_healing("Unverified possible outage")
        result = self.manager.list_jobs()
        result[0]["execution_trace"][0]["status"] = "DEPLOYED"
        self.assertEqual(
            self.manager.list_jobs()[0]["execution_trace"][0]["status"], "RECORDED"
        )


if __name__ == "__main__":
    unittest.main()
