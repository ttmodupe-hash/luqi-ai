"""Synthetic-only tests: never read provider credentials or production reports."""
import contextlib
import copy
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("spend_review", ROOT / "scripts/review-ai-pilot-spend.py")
review = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(review)
NOW = datetime(2026, 10, 24, 10, tzinfo=timezone.utc)


def fixture():
    return {
        "format": "luqi.pilot-spend-evidence.v1", "provenance": "fixture",
        "month_utc": "2026-09", "cutoff_utc": "2026-10-01T00:00:00Z",
        "ledger": {"source_sha256": "a" * 64, "rows": [
            {"provider": "gemini", "reserved_cents": 100},
            {"provider": "openai", "reserved_cents": 100}]},
        "providers": [{"provider": provider, "source_sha256": character * 64,
            "reported_at_utc": "2026-10-02T00:00:00Z",
            "window_start_utc": "2026-09-01T00:00:00Z",
            "window_end_utc": "2026-10-01T00:00:00Z", "currency": "USD",
            "cost_basis": "api_usage_excluding_tax_credits_topups",
            "scope": "dedicated_pilot_project", "mapping_reviewed": True,
            "billing_status": "final", "usage_usd": cost}
            for provider, character, cost in [("gemini", "b", "0.005"), ("openai", "c", "0.004")]],
    }


def partial():
    data = fixture()
    data.update(month_utc="2026-10", cutoff_utc="2026-10-24T08:00:00Z")
    for source in data["providers"]:
        source.update(window_start_utc="2026-10-01T00:00:00Z", window_end_utc=data["cutoff_utc"],
                      reported_at_utc="2026-10-24T09:00:00Z", billing_status="provisional")
    return data


class ComparisonTests(unittest.TestCase):
    def test_exact_totals_are_not_launch_or_reconciliation_approval(self):
        result = review.assess(fixture(), NOW)
        self.assertEqual(result["total_reported_usage_usd"], "0.009")
        self.assertEqual(result["providers"]["gemini"]["reserved_usd"], "1")
        self.assertEqual(result["providers"]["gemini"]["reservation_attempts"], 10)
        self.assertEqual(result["comparison_status"], "no_comparison_flags")
        self.assertFalse(result["source_authenticity_verified"])
        self.assertFalse(result["production_reconciliation_complete"])
        self.assertFalse(result["launch_approved"])
        self.assertFalse(result["settings_changed"])
        self.assertTrue(result["human_review_required"])

    def test_provisional_billing_never_claims_reconciliation(self):
        result = review.assess(partial(), NOW)
        self.assertIn("gemini:billing_provisional", result["findings"])
        self.assertEqual(result["comparison_status"], "findings_require_review")
        self.assertFalse(result["production_reconciliation_complete"])

    def test_missing_provider_is_unknown_not_zero(self):
        data = fixture(); data["providers"].pop()
        result = review.assess(data, NOW)
        self.assertIsNone(result["total_reported_usage_usd"])
        self.assertIsNone(result["providers"]["openai"]["reported_usage_usd"])
        self.assertEqual(result["comparison_status"], "incomplete")

    def test_missing_reservation_is_not_zero_attempts(self):
        data = fixture(); data["ledger"]["rows"].pop()
        result = review.assess(data, NOW)
        self.assertIsNone(result["providers"]["openai"]["reservation_attempts"])
        self.assertIn("openai:reservation_evidence_missing", result["findings"])

    def test_duplicate_providers_and_ledger_rows_are_refused(self):
        for target in ("providers", "rows"):
            data = fixture(); entries = data["providers"] if target == "providers" else data["ledger"]["rows"]
            entries[1] = copy.deepcopy(entries[0])
            with self.subTest(target=target), self.assertRaises(review.EvidenceError):
                review.assess(data, NOW)

    def test_currency_scope_mapping_and_range_mismatches_never_make_usd_total(self):
        for key, value, code in [("currency", "ZAR", "currency_not_usd"),
                ("scope", "shared_or_unknown", "project_scope_unverified"),
                ("cost_basis", "other_or_unknown", "cost_basis_unverified"),
                ("mapping_reviewed", False, "project_mapping_unreviewed"),
                ("window_start_utc", "2026-09-02T00:00:00Z", "period_mismatch")]:
            data = fixture(); data["providers"][0][key] = value
            result = review.assess(data, NOW)
            with self.subTest(key=key):
                self.assertIn("gemini:" + code, result["findings"])
                self.assertIsNone(result["providers"]["gemini"]["reported_usage_usd"])
                self.assertIsNone(result["total_reported_usage_usd"])

    def test_actual_cost_thresholds_and_total_preserve_exact_fraction(self):
        data = fixture(); data["providers"][0]["usage_usd"] = "60.000000000001"
        data["providers"][1]["usage_usd"] = "40"
        result = review.assess(data, NOW)
        self.assertEqual(result["total_reported_usage_usd"], "100.000000000001")
        self.assertIn("total_reported_cost_cap_reached_or_exceeded", result["findings"])
        self.assertIn("gemini:reported_cost_exceeds_reservations", result["findings"])
        self.assertIn("openai:reported_cost_cap_reached_or_exceeded", result["findings"])

    def test_near_caps_are_review_flags_not_automatic_mutations(self):
        data = fixture(); data["providers"][0]["usage_usd"] = "48"
        data["ledger"]["rows"][0]["reserved_cents"] = 4800
        result = review.assess(data, NOW)
        self.assertIn("gemini:reported_cost_near_cap", result["findings"])
        self.assertIn("gemini:reservation_near_cap", result["findings"])
        self.assertFalse(result["settings_changed"])

    def test_bad_reservation_increment_and_exhaustion_are_visible(self):
        data = fixture(); data["ledger"]["rows"][0]["reserved_cents"] = 6001
        result = review.assess(data, NOW)
        self.assertIn("gemini:reservation_step_invalid", result["findings"])
        self.assertIn("gemini:reservation_cap_reached_or_exceeded", result["findings"])
        self.assertIsNone(result["providers"]["gemini"]["reservation_attempts"])
        self.assertEqual(result["providers"]["gemini"]["unallocated_reservation_usd"], "0")

    def test_invalid_money_cannot_be_silently_rounded(self):
        for value in (-1, 0.1, True, "-1", "1e1", "NaN", "Infinity", "00", "0.0000000000001", "$1", " 1"):
            data = fixture(); data["providers"][0]["usage_usd"] = value
            with self.subTest(value=value), self.assertRaises(review.EvidenceError):
                review.assess(data, NOW)

    def test_invalid_reserved_cents_are_refused(self):
        for value in (True, -1, 1.2, "10", 9_007_199_254_740_992):
            data = fixture(); data["ledger"]["rows"][0]["reserved_cents"] = value
            with self.subTest(value=value), self.assertRaises(review.EvidenceError):
                review.assess(data, NOW)

    def test_zero_reported_cost_does_not_erase_attempt_evidence(self):
        data = fixture(); data["providers"][0]["usage_usd"] = "0"
        result = review.assess(data, NOW)
        self.assertIn("gemini:zero_reported_cost_with_reservations", result["findings"])
        self.assertEqual(result["providers"]["gemini"]["reservation_attempts"], 10)

    def test_empty_evidence_stays_incomplete(self):
        data = fixture(); data["providers"] = []; data["ledger"]["rows"] = []
        result = review.assess(data, NOW)
        self.assertEqual(result["comparison_status"], "incomplete")
        self.assertIsNone(result["total_reported_usage_usd"])
        self.assertEqual(len(result["findings"]), 4)

    def test_sensitive_extra_fields_are_refused(self):
        for location in ("root", "provider", "ledger", "row"):
            data = fixture()
            target = {"root": data, "provider": data["providers"][0], "ledger": data["ledger"],
                      "row": data["ledger"]["rows"][0]}[location]
            target["api_key"] = "PRIVATE-SYNTHETIC-ONLY"
            with self.subTest(location=location), self.assertRaises(review.EvidenceError):
                review.assess(data, NOW)

    def test_invalid_dates_and_future_cutoffs_are_refused(self):
        for value in ("2026-11-01T00:00:00Z", "2026-09-01T00:00:00Z", "2026-09-31T00:00:00Z",
                      "2026-09-30T02:00:00+02:00", "2026-09-30", None):
            data = fixture(); data["cutoff_utc"] = value
            with self.subTest(value=value), self.assertRaises(review.EvidenceError):
                review.assess(data, NOW)
        data = partial(); data["cutoff_utc"] = "2026-10-24T11:00:00Z"
        with self.assertRaises(review.EvidenceError): review.assess(data, NOW)

    def test_future_provider_report_is_refused(self):
        data = fixture(); data["providers"][0]["reported_at_utc"] = "2026-10-25T00:00:00Z"
        with self.assertRaises(review.EvidenceError): review.assess(data, NOW)

    def test_stale_active_month_is_flagged_without_inventing_finality(self):
        data = partial(); data["cutoff_utc"] = "2026-10-20T00:00:00Z"
        for source in data["providers"]:
            source.update(window_end_utc=data["cutoff_utc"], reported_at_utc="2026-10-21T00:00:00Z")
        result = review.assess(data, NOW)
        self.assertIn("snapshot_stale", result["findings"])
        self.assertIn("gemini:provider_report_stale", result["findings"])

    def test_partial_month_cannot_claim_final_invoice(self):
        data = partial(); data["providers"][0]["billing_status"] = "final"
        self.assertIn("gemini:final_claim_for_partial_month", review.assess(data, NOW)["findings"])

    def test_bad_month_hash_and_unbounded_provider_list_are_refused(self):
        for kind in ("month", "hash", "count"):
            data = fixture()
            if kind == "month": data["month_utc"] = "2026-13"
            if kind == "hash": data["ledger"]["source_sha256"] = "PRIVATE-SYNTHETIC"
            if kind == "count": data["providers"].append(copy.deepcopy(data["providers"][0]))
            with self.subTest(kind=kind), self.assertRaises(review.EvidenceError): review.assess(data, NOW)

    def test_input_object_is_not_mutated(self):
        data = fixture(); before = copy.deepcopy(data)
        review.assess(data, NOW)
        self.assertEqual(data, before)


@unittest.skipUnless(os.name == "posix", "Private file guards require POSIX")
class FileAndCliTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.root.chmod(0o700)
        self.input = self.root / "input.json"; self.output = self.root / "report.json"

    def save(self, data=None, raw=None):
        value = raw if raw is not None else json.dumps(data if data is not None else fixture()).encode()
        self.input.write_bytes(value); self.input.chmod(0o600)
        return hashlib.sha256(value).hexdigest()

    def run_cli(self, checksum):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = review.main(["--input", str(self.input), "--sha256", checksum, "--report", str(self.output)])
        return code, out.getvalue(), err.getvalue()

    def test_private_checksum_input_read_and_report_permissions(self):
        checksum = self.save(); original = self.input.read_bytes()
        code, out, err = self.run_cli(checksum)
        self.assertEqual(code, 0); self.assertEqual(err, "")
        self.assertIn("Human review is required", out)
        self.assertEqual(self.input.read_bytes(), original)
        self.assertEqual(stat.S_IMODE(self.output.stat().st_mode), 0o600)
        report = json.loads(self.output.read_text())
        self.assertEqual(report["input_sha256"], checksum)
        self.assertNotIn("source_sha256", json.dumps(report))

    def test_findings_write_report_but_exit_three(self):
        data = fixture(); data["providers"] = []
        code, _, _ = self.run_cli(self.save(data))
        self.assertEqual(code, 3); self.assertTrue(self.output.exists())

    def test_hash_mismatch_or_private_mode_violation_produces_no_report(self):
        checksum = self.save()
        code, out, err = self.run_cli("0" * 64)
        self.assertEqual(code, 2); self.assertEqual(out, "")
        self.assertNotIn(str(self.input), err); self.assertFalse(self.output.exists())
        self.input.chmod(0o644)
        self.assertEqual(self.run_cli(checksum)[0], 2)

    def test_symlink_fifo_and_hardlink_inputs_are_refused(self):
        checksum = self.save(); original = self.root / "original.json"; self.input.rename(original)
        self.input.symlink_to(original)
        self.assertEqual(self.run_cli(checksum)[0], 2)
        self.input.unlink(); os.mkfifo(self.input, 0o600)
        self.assertEqual(self.run_cli(checksum)[0], 2)
        self.input.unlink(); os.link(original, self.input)
        self.assertEqual(self.run_cli(checksum)[0], 2)
        self.assertFalse(self.output.exists())

    def test_non_owned_input_is_refused(self):
        checksum = self.save()
        with patch.object(review.os, "geteuid", return_value=self.input.stat().st_uid + 1):
            self.assertEqual(self.run_cli(checksum)[0], 2)

    def test_malformed_duplicate_and_oversized_json_are_refused(self):
        for raw in (b'{"format":1,"format":2}', b'{"x":NaN}', b'{"x":Infinity}', b'[]', b'\xff', b' ', b'x' * (review.MAX_INPUT_BYTES + 1)):
            with self.subTest(raw_length=len(raw)):
                self.assertEqual(self.run_cli(self.save(raw=raw))[0], 2)
                self.assertFalse(self.output.exists())

    def test_existing_report_and_report_symlink_are_never_overwritten(self):
        checksum = self.save(); self.output.write_text("KEEP")
        self.assertEqual(self.run_cli(checksum)[0], 2); self.assertEqual(self.output.read_text(), "KEEP")
        self.output.unlink(); self.output.symlink_to(self.input)
        self.assertEqual(self.run_cli(checksum)[0], 2)
        self.assertEqual(hashlib.sha256(self.input.read_bytes()).hexdigest(), checksum)

    def test_nonprivate_output_directory_is_refused(self):
        checksum = self.save(); parent = self.root / "public"; parent.mkdir(mode=0o755)
        self.output = parent / "report.json"
        self.assertEqual(self.run_cli(checksum)[0], 2); self.assertFalse(self.output.exists())

    def test_partial_output_is_removed_after_write_failure(self):
        checksum = self.save()
        with patch.object(review.json, "dump", side_effect=OSError("PRIVATE-SYNTHETIC-DIAGNOSTIC")):
            code, out, err = self.run_cli(checksum)
        self.assertEqual(code, 2); self.assertNotIn("PRIVATE", out + err); self.assertFalse(self.output.exists())

    def test_production_declared_input_is_refused_in_ci(self):
        data = fixture(); data["provenance"] = "production"  # Still synthetic test data.
        checksum = self.save(data)
        with patch.dict(os.environ, {"GITHUB_ACTIONS": "true"}):
            self.assertEqual(self.run_cli(checksum)[0], 2)
        self.assertFalse(self.output.exists())

    def test_no_environment_credentials_enter_report(self):
        checksum = self.save()
        with patch.dict(os.environ, {"OPENAI_API_KEY": "PRIVATE-OPENAI-SYNTHETIC", "GOOGLE_API_KEY": "PRIVATE-GOOGLE-SYNTHETIC", "DATABASE_URL": "PRIVATE-DB-SYNTHETIC"}):
            self.assertEqual(self.run_cli(checksum)[0], 0)
        self.assertNotIn("PRIVATE", self.output.read_text())

    def test_invalid_arguments_do_not_echo_values(self):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            self.assertEqual(review.main(["--unexpected", "PRIVATE-SYNTHETIC"]), 2)
        self.assertNotIn("PRIVATE", out.getvalue() + err.getvalue())

    def test_runtime_has_no_network_subprocess_or_database_import(self):
        import ast
        tree = ast.parse((ROOT / "scripts/review-ai-pilot-spend.py").read_text())
        imports = {node.names[0].name for node in ast.walk(tree) if isinstance(node, ast.Import)}
        imports |= {node.module for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)}
        self.assertTrue(imports <= {"__future__", "argparse", "datetime", "decimal", "hashlib", "hmac", "json", "os", "pathlib", "re", "stat", "sys"})


if __name__ == "__main__":
    unittest.main()
