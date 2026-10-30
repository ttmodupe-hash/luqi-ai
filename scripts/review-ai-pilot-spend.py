#!/usr/bin/env python3
"""Offline, exact-decimal comparison of operator-normalized pilot cost evidence.

No network/DB access, environment credentials, automatic refunds, or activation.
A generated report is comparison evidence, NOT invoice or launch approval.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import stat
import sys

CAPS = {"gemini": Decimal("60"), "openai": Decimal("40")}
TOTAL_CAP = Decimal("100")
ATTEMPT_CENTS = 10
MAX_INPUT_BYTES = 64 * 1024
MAX_AGE = timedelta(hours=24)  # Review policy, NOT a provider finalization guarantee.
CI_MARKERS = ("CI", "GITHUB_ACTIONS", "GITLAB_CI", "TF_BUILD", "BUILDKITE")


class EvidenceError(ValueError):
    """Only fixed public-safe messages may escape this module."""


def require(condition: bool) -> None:
    if not condition:
        raise EvidenceError("Invalid spend evidence")


def exact_keys(value: object, keys: str) -> dict:
    require(type(value) is dict and set(value) == set(keys.split()))
    return value


def timestamp(value: object) -> datetime:
    require(type(value) is str and re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value) is not None)
    try:
        return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        raise EvidenceError("Invalid spend evidence") from None


def digest(value: object) -> None:
    require(type(value) is str and re.fullmatch(r"[0-9a-f]{64}", value) is not None)


def amount(value: object) -> Decimal:
    # Do not round provider values, accept exponent notation, floats, or NaN.
    require(type(value) is str and re.fullmatch(r"(?:0|[1-9]\d{0,8})(?:\.\d{1,12})?", value) is not None)
    return Decimal(value)


def usd(value: Decimal) -> str:
    return format(value, "f")


def no_duplicate_keys(pairs: list[tuple]) -> dict:
    result = {}
    for key, value in pairs:
        require(key not in result)
        result[key] = value
    return result


def load_evidence(path: Path, expected_sha256: str) -> tuple[dict, str]:
    """Bounded, private, regular file; never follows a final symlink or FIFO."""
    digest(expected_sha256)
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    fd = os.open(path, flags)
    try:
        info = os.fstat(fd)
        require(stat.S_ISREG(info.st_mode) and info.st_uid == os.geteuid())
        require(stat.S_IMODE(info.st_mode) & 0o077 == 0 and info.st_nlink == 1)
        require(0 < info.st_size <= MAX_INPUT_BYTES)
        with os.fdopen(fd, "rb", closefd=False) as handle:
            raw = handle.read(MAX_INPUT_BYTES + 1)
        require(0 < len(raw) <= MAX_INPUT_BYTES)
        observed = hashlib.sha256(raw).hexdigest()
        require(hmac.compare_digest(observed, expected_sha256))
        try:
            value = json.loads(raw.decode("utf-8"), object_pairs_hook=no_duplicate_keys,
                               parse_constant=lambda _: (_ for _ in ()).throw(EvidenceError("Invalid spend evidence")))
        except (ValueError, UnicodeError, RecursionError):
            raise EvidenceError("Invalid spend evidence") from None
        require(type(value) is dict)
        return value, observed
    finally:
        os.close(fd)


def assess(evidence: dict, now: datetime) -> dict:
    """Compare supplied totals. Source authenticity/mapping remain declarations."""
    require(now.tzinfo is not None and now.utcoffset() == timedelta(0))
    mixed = evidence.get("format") == "luqi.pilot-spend-evidence.v2"
    data = exact_keys(evidence, "format provenance month_utc cutoff_utc ledger providers" + (" budget_profile" if mixed else ""))
    require(data["format"] in ("luqi.pilot-spend-evidence.v1", "luqi.pilot-spend-evidence.v2"))
    caps = CAPS
    if mixed:
        require(data["budget_profile"] in ("approved-100-v1", "approved-300-v1"))
        if data["budget_profile"] == "approved-300-v1":
            caps = {"gemini": Decimal("165"), "openai": Decimal("135")}
    total_cap = sum(caps.values(), Decimal(0))
    require(data["provenance"] in ("fixture", "production"))
    month = data["month_utc"]
    require(type(month) is str and re.fullmatch(r"20\d{2}-(?:0[1-9]|1[0-2])", month) is not None)
    start = timestamp(month + "-01T00:00:00Z")
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    cutoff = timestamp(data["cutoff_utc"])
    require(start < cutoff <= min(end, now))
    ledger = exact_keys(data["ledger"], "source_sha256 rows")
    digest(ledger["source_sha256"])
    require(type(ledger["rows"]) is list and len(ledger["rows"]) <= 2)
    require(type(data["providers"]) is list and len(data["providers"]) <= 2)
    rows = {}
    for row in ledger["rows"]:
        row = exact_keys(row, "provider reserved_cents")
        provider = row["provider"]
        require(type(provider) is str and provider in CAPS and provider not in rows)
        cents = row["reserved_cents"]
        require(type(cents) is int and 0 <= cents <= 9_007_199_254_740_991)
        rows[provider] = cents
    sources = {}
    for source in data["providers"]:
        source = exact_keys(source, "provider source_sha256 reported_at_utc window_start_utc window_end_utc currency cost_basis scope mapping_reviewed billing_status usage_usd")
        provider = source["provider"]
        require(type(provider) is str and provider in CAPS and provider not in sources)
        digest(source["source_sha256"])
        report_time = timestamp(source["reported_at_utc"])
        range_start, range_end = timestamp(source["window_start_utc"]), timestamp(source["window_end_utc"])
        require(range_start < range_end <= report_time <= now)
        require(type(source["currency"]) is str and re.fullmatch(r"[A-Z]{3}", source["currency"]) is not None)
        require(source["cost_basis"] in ("api_usage_excluding_tax_credits_topups", "other_or_unknown"))
        require(source["scope"] in ("dedicated_pilot_project", "shared_or_unknown"))
        require(type(source["mapping_reviewed"]) is bool)
        require(source["billing_status"] in ("provisional", "final"))
        cost = amount(source["usage_usd"])
        sources[provider] = (source, report_time, range_start, range_end, cost)

    findings = []
    incomplete = False
    result = {}
    if cutoff < end and now - cutoff > MAX_AGE:
        findings.append("snapshot_stale")
    for provider, cap in caps.items():
        item = {"approved_cap_usd": usd(cap), "reserved_usd": None,
                "reservation_attempts": None, "reported_usage_usd": None,
                "reported_cost_status": "missing", "cost_comparable": False,
                "unallocated_reservation_usd": None}
        if provider not in rows:
            findings.append(provider + ":reservation_evidence_missing")
            incomplete = True
        else:
            cents = rows[provider]
            reserve = Decimal(cents) / 100
            item.update(reserved_usd=usd(reserve), unallocated_reservation_usd=usd(max(Decimal(0), cap - reserve)))
            if mixed:
                # Guest 1c, legacy/visual 10c, longer text 20c: money cannot
                # establish request counts or successful customer replies.
                item["reservation_attempts"] = None
            elif cents % ATTEMPT_CENTS:
                findings.append(provider + ":reservation_step_invalid")
            else:
                item["reservation_attempts"] = cents // ATTEMPT_CENTS
            if reserve >= cap:
                findings.append(provider + ":reservation_cap_reached_or_exceeded")
            elif reserve >= cap * Decimal("0.8"):
                findings.append(provider + ":reservation_near_cap")
        if provider not in sources:
            findings.append(provider + ":provider_cost_evidence_missing")
            incomplete = True
        else:
            source, report_time, range_start, range_end, cost = sources[provider]
            comparable = True
            for matches, code in (
                (source["currency"] == "USD", "currency_not_usd"),
                (source["cost_basis"] == "api_usage_excluding_tax_credits_topups", "cost_basis_unverified"),
                (source["scope"] == "dedicated_pilot_project", "project_scope_unverified"),
                (source["mapping_reviewed"], "project_mapping_unreviewed"),
                (range_start == start and range_end == cutoff, "period_mismatch"),
            ):
                if not matches:
                    findings.append(provider + ":" + code)
                    comparable = False
                    incomplete = True
            item["reported_cost_status"] = source["billing_status"]
            if source["billing_status"] == "provisional":
                findings.append(provider + ":billing_provisional")
            elif cutoff != end:
                findings.append(provider + ":final_claim_for_partial_month")
            if cutoff < end and now - report_time > MAX_AGE:
                findings.append(provider + ":provider_report_stale")
            item["cost_comparable"] = comparable
            if comparable:
                item["reported_usage_usd"] = usd(cost)
                if cost >= cap:
                    findings.append(provider + ":reported_cost_cap_reached_or_exceeded")
                elif cost >= cap * Decimal("0.8"):
                    findings.append(provider + ":reported_cost_near_cap")
                if provider in rows:
                    if cost > Decimal(rows[provider]) / 100:
                        findings.append(provider + ":reported_cost_exceeds_reservations")
                    if cost == 0 and rows[provider] > 0:
                        findings.append(provider + ":zero_reported_cost_with_reservations")
        result[provider] = item
    comparable_total = all(item["reported_usage_usd"] is not None for item in result.values())
    actual_total = sum((Decimal(item["reported_usage_usd"]) for item in result.values()), Decimal(0)) if comparable_total else None
    if actual_total is not None and actual_total >= total_cap:
        findings.append("total_reported_cost_cap_reached_or_exceeded")
    return {
        "format": "luqi.pilot-spend-review.v2" if mixed else "luqi.pilot-spend-review.v1", "provenance": data["provenance"],
        "month_utc": month, "cutoff_utc": data["cutoff_utc"],
        "reviewed_at_utc": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "comparison_status": "incomplete" if incomplete else "findings_require_review" if findings else "no_comparison_flags",
        "approved_total_usd": usd(total_cap),
        "total_reported_usage_usd": usd(actual_total) if actual_total is not None else None,
        "providers": result, "findings": sorted(findings),
        "source_authenticity_verified": False, "production_reconciliation_complete": False,
        "human_review_required": True, "launch_approved": False,
        "settings_changed": False,
        "limitations": ["Operator-normalized totals; no provider or database was queried.",
                        "Reservations are not invoices, successful calls, or safe-to-spend funds.",
                        "Mixed reservation rates cannot be converted into attempt counts.",
                        "Zero/low reported cost may reflect delayed billing or provider pricing arrangements.",
                        "No comparison flags does not verify completeness, authorization, or future spending."]
    }


def write_private_report(path: Path, report: dict) -> None:
    """Use a private owned parent and exclusive creation. Never overwrite."""
    parent_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        info = os.fstat(parent_fd)
        require(info.st_uid == os.geteuid() and stat.S_IMODE(info.st_mode) & 0o077 == 0)
        fd = os.open(path.name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=parent_fd)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(report, handle, indent=2, ensure_ascii=True, allow_nan=False)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
        except BaseException:
            os.unlink(path.name, dir_fd=parent_fd)
            raise
    finally:
        os.close(parent_fd)


class SafeParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise EvidenceError("Invalid spend-review arguments")


def main(argv: list[str] | None = None) -> int:
    parser = SafeParser(description="Compare private local pilot spend evidence. No remote access or launch approval.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--sha256", required=True)
    parser.add_argument("--report", required=True, type=Path)
    try:
        args = parser.parse_args(argv)
        data, input_digest = load_evidence(args.input, args.sha256)
        if data.get("provenance") == "production" and any(os.environ.get(name) for name in CI_MARKERS):
            raise EvidenceError("Production cost evidence is refused on CI")
        report = assess(data, datetime.now(timezone.utc))
        report["input_sha256"] = input_digest
        write_private_report(args.report, report)
        print("Private spend comparison written. Human review is required; no settings changed.")
        return 3 if report["findings"] else 0
    except (EvidenceError, OSError, ValueError, TypeError, KeyError, OverflowError, RecursionError):
        # Do not print file names, JSON fragments, account IDs, or raw diagnostics.
        print("Spend review refused: check the documented input and private-file requirements.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
