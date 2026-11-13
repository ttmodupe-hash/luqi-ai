"""Security regression checks for the fail-closed Python agent pipeline.

Deliberately runs with the standard library only; no credentials or AI vendor
services, Docker daemon, repository write access, or host code execution.
"""
import json
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
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

    def test_untrusted_advisory_target_is_withheld_from_all_outputs(self):
        target = "api/9901011234088_syntheticSecretMarker.py"
        job = self.manager.trigger_self_healing("Synthetic incident", target)
        self.assertEqual(job.target_file, "[TARGET_WITHHELD]")
        self.assertNotIn(target, repr(job))
        self.assertNotIn(target, repr(self.manager.jobs))
        self.assertNotIn(target, repr(self.manager.list_jobs()))
        self.assertFalse(job.ci_verified)
        self.assertFalse(job.deployed)

    def test_private_correlation_preserved_for_withheld_targets(self):
        first = self.manager.trigger_self_healing("Synthetic timeout", "api/a.py")
        second = self.manager.trigger_self_healing("Synthetic timeout", "api/b.py")
        third = self.manager.trigger_self_healing("Synthetic timeout", "api/a.py")
        self.assertEqual(first.target_file, "[TARGET_WITHHELD]")
        self.assertEqual(second.target_file, "[TARGET_WITHHELD]")
        self.assertEqual(first.evidence_sha256, third.evidence_sha256)
        self.assertNotEqual(first.evidence_sha256, second.evidence_sha256)
        self.assertEqual(
            self.manager.trigger_self_healing("No target").target_file, "unassigned"
        )

    def test_oversize_raw_padding_is_rejected_before_trimming(self):
        # Previously whitespace padding bypassed the post-strip limit, causing
        # unbounded input processing and correlation for untrusted reports.
        over_limit = " " * (4000 * 250) + "timeout"
        with self.assertRaisesRegex(ValueError, "too long"):
            self.manager.trigger_self_healing(over_limit, "api/synthetic.py")
        self.assertEqual(self.manager.list_jobs(), [])

    def test_oversize_report_never_calls_stripping_hook(self):
        # A synthetic str subclass proves the bound is checked before any
        # report normalization. The input never enters triage/HMAC processing.
        class UntrustedString(str):
            def strip(self, *args, **kwargs):
                raise AssertionError("Oversized report must be rejected before strip")
        with self.assertRaisesRegex(ValueError, "too long"):
            self.manager.trigger_self_healing(UntrustedString("x" * 4001))
        self.assertEqual(self.manager.list_jobs(), [])

    def test_valid_boundary_length_stays_accepted_and_non_authoritative(self):
        report = "timeout" + ("x" * (4000 - 7))
        job = self.manager.trigger_self_healing(report, "api/synthetic.py")
        self.assertEqual(job.bug_report, "[REPORT_WITHHELD]")
        self.assertEqual(job.target_file, "[TARGET_WITHHELD]")
        self.assertEqual(job.heuristic_category, "potential_reliability")
        self.assertFalse(job.execution_verified)
        self.assertFalse(job.ci_verified)
        self.assertFalse(job.deployed)

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

    def test_report_content_is_never_retained_in_job_or_listing(self):
        # Old regex redaction leaked values after Authorization: Bearer and
        # unrecognised query/cookie/identity fields. Use entirely fake fixtures.
        fake_secrets = (
            "synthetic-bearer-never-store",
            "synthetic-cookie-never-store",
            "synthetic-query-never-store",
            "synthetic-email@example.invalid",
        )
        report = (
            "Provider timeout Authorization: Bearer " + fake_secrets[0]
            + " Cookie: sessionid=" + fake_secrets[1]
            + " URL=https://example.invalid/?access_token=" + fake_secrets[2]
            + " Customer=" + fake_secrets[3]
        )
        job = self.manager.trigger_self_healing(report, "api/handler.py")
        self.assertEqual(job.bug_report, "[REPORT_WITHHELD]")
        self.assertEqual(job.heuristic_category, "potential_reliability")
        self.assertEqual(job.persistence, "in_memory_only")
        self.assertEqual(len(job.evidence_sha256), 64)
        for secret in fake_secrets:
            with self.subTest(secret=secret):
                self.assertNotIn(secret, repr(job))
                self.assertNotIn(secret, repr(self.manager.list_jobs()))
        self.assertIn("non-auditable", job.execution_trace[0]["detail"])
        # Keyed fingerprints distinguish different reports but do not assert
        # real CI, diagnosis, approvals or durable audit provenance.
        same = self.manager.trigger_self_healing(report, "api/handler.py")
        other = self.manager.trigger_self_healing(report + " another incident", "api/handler.py")
        self.assertEqual(job.evidence_sha256, same.evidence_sha256)
        self.assertNotEqual(job.evidence_sha256, other.evidence_sha256)
        self.assertFalse(job.ci_verified)
        self.assertFalse(job.deployed)

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

    def test_escaped_lone_surrogates_rejected_without_job_or_500(self):
        for encoded in (r'"timeout \ud800"', r'"\udc00 incident"'):
            with self.subTest(encoded=encoded):
                report = json.loads(encoded)
                with self.assertRaisesRegex(ValueError, "invalid Unicode"):
                    self.manager.trigger_self_healing(report, "api/synthetic.py")
        self.assertEqual(self.manager.list_jobs(), [])

    def test_valid_unicode_report_fingerprint_is_stable(self):
        first = self.manager.trigger_self_healing("café \u2713", "api/synthetic.py")
        second = self.manager.trigger_self_healing("café \u2713", "api/synthetic.py")
        self.assertEqual(first.evidence_sha256, second.evidence_sha256)
        self.assertFalse(first.execution_verified)
        self.assertFalse(first.deployed)

    def test_returned_intake_job_cannot_forge_registered_state(self):
        returned = self.manager.trigger_self_healing("Synthetic outage")
        returned.status = "DEPLOYED_TO_PROD"
        returned.reviewer = "Self-appointed approver"
        returned.deployed = True
        returned.ci_verified = True
        returned.execution_trace[0]["status"] = "PASSED"
        registered = self.manager.list_jobs()[0]
        self.assertEqual(registered["status"], "AWAITING_EXTERNAL_REVIEW")
        self.assertIsNone(registered["reviewer"])
        self.assertFalse(registered["deployed"])
        self.assertFalse(registered["ci_verified"])
        self.assertEqual(registered["execution_trace"][0]["status"], "RECORDED")

    def test_returned_job_listing_does_not_allow_trace_mutation(self):
        self.manager.trigger_self_healing("Unverified possible outage")
        result = self.manager.list_jobs()
        result[0]["execution_trace"][0]["status"] = "DEPLOYED"
        self.assertEqual(
            self.manager.list_jobs()[0]["execution_trace"][0]["status"], "RECORDED"
        )


    def test_swapped_tool_cannot_reenable_code_execution(self):
        class UnsafeReplacementTool:
            def _run(self, code_to_test):
                raise AssertionError("Injected sandbox must never run")

        self.manager.sandbox_tool = UnsafeReplacementTool()
        with patch("subprocess.run", side_effect=AssertionError("Host process attempted")):
            result = self.manager.run_sandbox_code("print('never-run')")
        self.assertFalse(result["executed"])
        self.assertFalse(result["tests_passed"])
        self.assertFalse(result["isolated"])
        self.assertIn("BLOCKED", result["output"])

    def test_public_job_registry_is_only_a_detached_snapshot(self):
        job = self.manager.trigger_self_healing("Synthetic report with no secrets")
        public_registry = self.manager.jobs
        public_registry[job.job_id].status = "DEPLOYED_TO_PROD"
        public_registry[job.job_id].reviewer = "forged-reviewer"
        public_registry[job.job_id].execution_trace[0]["status"] = "CI_VERIFIED"
        public_registry[job.job_id].deployed = True
        public_registry[job.job_id].ci_verified = True
        public_registry.clear()
        with self.assertRaises(AttributeError):
            self.manager.jobs = {}
        canonical = self.manager.list_jobs()
        self.assertEqual(len(canonical), 1)
        self.assertEqual(canonical[0]["status"], "AWAITING_EXTERNAL_REVIEW")
        self.assertIsNone(canonical[0]["reviewer"])
        self.assertEqual(canonical[0]["execution_trace"][0]["status"], "RECORDED")
        self.assertFalse(canonical[0]["ci_verified"])
        self.assertFalse(canonical[0]["deployed"])


    def test_parallel_intake_cannot_bypass_capacity(self):
        # Synchronize at HMAC creation: the former cap check ran before HMAC,
        # so parallel calls could all pass it and overfill the bounded queue.
        import hmac
        barrier = Barrier(8)
        original_hmac_new = hmac.new

        def synchronize_hmac(*args, **kwargs):
            barrier.wait(timeout=10)
            return original_hmac_new(*args, **kwargs)

        def submit(number):
            try:
                return self.manager.trigger_self_healing(
                    f"Synthetic parallel incident {number}"
                ).job_id
            except RuntimeError as exc:
                return "blocked:" + str(exc)

        with patch("backend.self_healing_pipeline.MAX_JOBS_IN_MEMORY", 1), patch(
            "backend.self_healing_pipeline.hmac.new", side_effect=synchronize_hmac
        ):
            with ThreadPoolExecutor(max_workers=8) as executor:
                results = list(executor.map(submit, range(8)))
        accepted = [value for value in results if value.startswith("sh_")]
        blocked = [value for value in results if value.startswith("blocked:")]
        self.assertEqual(len(accepted), 1)
        self.assertEqual(len(blocked), 7)
        self.assertTrue(all("capacity reached" in value for value in blocked))
        self.assertEqual(len(self.manager.list_jobs()), 1)
        self.assertEqual(self.manager.list_jobs()[0]["status"], "AWAITING_EXTERNAL_REVIEW")

    def test_duplicate_proposal_id_never_overwrites_existing_intake(self):
        with patch("backend.self_healing_pipeline.uuid.uuid4") as synthetic_uuid:
            synthetic_uuid.return_value.hex = "a" * 32
            first = self.manager.trigger_self_healing("First synthetic report")
            with self.assertRaisesRegex(RuntimeError, "identifier collision"):
                self.manager.trigger_self_healing("Second synthetic report")
        entries = self.manager.list_jobs()
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["job_id"], first.job_id)
        self.assertEqual(entries[0]["evidence_sha256"], first.evidence_sha256)
        self.assertFalse(entries[0]["ci_verified"])
        self.assertFalse(entries[0]["deployed"])

    def test_malformed_review_identifiers_fail_closed_without_server_error(self):
        # HTTP/JSON callers can submit arrays and objects, not only strings.
        # Never turn a denied action into an unhandled TypeError or alter evidence.
        job = self.manager.trigger_self_healing("Synthetic incident")
        prior = self.manager.list_jobs()

        class UnhashableString(str):
            __hash__ = None

        invalid_ids = ([], {}, [job.job_id], {"job_id": job.job_id},
                       UnhashableString(job.job_id), None, 4)
        for method in (self.manager.authorize_deployment,
                       self.manager.reject_deployment):
            expected_denial = method(job.job_id, reviewer="synthetic-admin")[1]
            for candidate in invalid_ids:
                with self.subTest(method=method.__name__,
                                  kind=type(candidate).__name__):
                    allowed, message = method(candidate, reviewer="synthetic-admin")
                    self.assertFalse(allowed)
                    self.assertEqual(message, expected_denial)
                    self.assertEqual(self.manager.list_jobs(), prior)
            allowed, message = method(job.job_id, reviewer="synthetic-admin")
            self.assertFalse(allowed)
            self.assertEqual(self.manager.list_jobs(), prior)


    def test_review_identifiers_rejected_before_registry_lookup(self):
        # A giant or malformed JSON ID must not even reach the keyed register.
        # The old implementation performed a hash-table lookup on arbitrary
        # strings (including huge input) before refusing them.
        existing = self.manager.trigger_self_healing("Synthetic security report")
        original = self.manager.list_jobs()

        class LookupGuard(dict):
            def __contains__(self, key):
                if (type(key) is not str or len(key) != 19 or
                        not key.startswith("sh_") or
                        any(char not in "0123456789abcdef" for char in key[3:])):
                    raise AssertionError("Malformed ID reached the job register")
                return super().__contains__(key)

        self.manager._jobs = LookupGuard(self.manager._jobs)
        invalid = (
            "x" * 300_000, "sh_" + "f" * 17, "sh_" + "g" * 16,
            "Sh_" + "a" * 16, "sh_" + "a" * 15,
            "sh_" + "a" * 16 + "\n", "", None, [], {},
        )
        for operation in (self.manager.authorize_deployment,
                          self.manager.reject_deployment):
            expected_denial = operation(existing.job_id, reviewer="fake-admin")[1]
            for candidate in invalid:
                with self.subTest(operation=operation.__name__,
                                  input_type=type(candidate).__name__):
                    permitted, message = operation(candidate, reviewer="fake-admin")
                    self.assertFalse(permitted)
                    self.assertEqual(message, expected_denial)
            permitted, message = operation(existing.job_id, reviewer="fake-admin")
            self.assertFalse(permitted)
        self.assertEqual(self.manager.list_jobs(), original)


    def test_denied_review_calls_do_not_reveal_private_proposal_existence(self):
        # The caller has not proved its identity. It must not learn whether
        # a private incident identifier is registered; no registry access is
        # necessary because BOTH operations always refuse.
        existing = self.manager.trigger_self_healing("Synthetic private incident")
        original = self.manager.list_jobs()

        class NoLookup(dict):
            def __contains__(self, key):
                raise AssertionError("Unverified operation queried the incident registry")

            def get(self, key, default=None):
                raise AssertionError("Unverified operation queried the incident registry")

            def __getitem__(self, key):
                raise AssertionError("Unverified operation queried the incident registry")

        self.manager._jobs = NoLookup(self.manager._jobs)
        for operation in (self.manager.authorize_deployment,
                          self.manager.reject_deployment):
            responses = [
                operation(identifier, reviewer="synthetic-admin")
                for identifier in (existing.job_id, "sh_" + "0" * 16,
                                   "not-an-id", [], {}, None, "x" * 300_000)
            ]
            self.assertTrue(all(not permitted for permitted, _ in responses))
            self.assertEqual(len({message for _, message in responses}), 1)
            self.assertNotIn(existing.job_id, responses[0][1])
        self.assertEqual(self.manager.list_jobs(), original)


if __name__ == "__main__":
    unittest.main()
