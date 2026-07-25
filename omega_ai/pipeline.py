#!/usr/bin/env python3
"""
Capability Chaining (Pipeline Runner) for Luqi-AI.

Parses Unix-style pipe syntax, executes a sequence of module calls with
shared context, and supports named presets for common multi-step
workflows.

Each step in a pipeline receives the accumulated context from all
previous steps, enabling data to flow from research → analysis →
export → notification.

Example::

    from pipeline import PipelineRunner

    runner = PipelineRunner()
    results = runner.run("/research Bitcoin | /price btc | /export md")
    for r in results:
        print(r["module"], r["status"])
"""

from __future__ import annotations

import re
import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional


# ---------------------------------------------------------------------------
# Module registry stubs
# ---------------------------------------------------------------------------
# In a full Luqi-AI deployment these would import and delegate to real
# modules.  Here we provide thin stubs so the pipeline runner remains
# fully self-contained and can be exercised standalone.

_StubFn = Callable[..., dict[str, Any]]


def _stub_research(args: str, _ctx: dict[str, Any]) -> dict[str, Any]:
    """Simulate the research module."""
    return {
        "module": "research",
        "query": args,
        "summary": f"Research results for '{args}' would appear here.",
        "sources": ["https://example.com/source1", "https://example.com/source2"],
    }


def _stub_price(args: str, _ctx: dict[str, Any]) -> dict[str, Any]:
    """Simulate the price-ticker module."""
    symbols = [s.strip().upper() for s in args.replace(",", " ").split() if s.strip()]
    return {
        "module": "price",
        "symbols": symbols,
        "prices": [
            {"symbol": s, "price_usd": 100_000.0, "change_24h": 2.5}
            for s in (symbols or ["BTC"])
        ],
    }


def _stub_scam(args: str, _ctx: dict[str, Any]) -> dict[str, Any]:
    """Simulate the scam-checker module."""
    return {
        "module": "scam",
        "target": args,
        "risk_score": 0.15,
        "verdict": "Likely legitimate",
        "checks": ["domain_age", "social_presence", "code_audit"],
    }


def _stub_invest(args: str, _ctx: dict[str, Any]) -> dict[str, Any]:
    """Simulate the investment-analysis module."""
    return {
        "module": "invest",
        "asset": args,
        "projected_roi_12m": 0.25,
        "risk_level": "medium",
        "recommendation": "Consider dollar-cost averaging.",
    }


def _stub_tax(args: str, ctx: dict[str, Any]) -> dict[str, Any]:
    """Simulate the tax-calculation module."""
    prices = ctx.get("price", {}).get("prices", [])
    total = sum(p.get("price_usd", 0) for p in prices)
    return {
        "module": "tax",
        "jurisdiction": args or "generic",
        "estimated_tax": total * 0.20,
        "notes": "Tax estimate based on current holdings.",
    }


def _stub_export(args: str, ctx: dict[str, Any]) -> dict[str, Any]:
    """Simulate the export module."""
    fmt = args.strip().lower() or "md"
    return {
        "module": "export",
        "format": fmt,
        "filename": f"pipeline_export.{fmt}",
        "context_keys": list(ctx.keys()),
    }


def _stub_email(args: str, ctx: dict[str, Any]) -> dict[str, Any]:
    """Simulate the email-digest module."""
    return {
        "module": "email",
        "recipient": args,
        "subject": f"Luqi-AI Pipeline Digest — {len(ctx)} steps",
        "context_summary": {k: v.get("module", "?") for k, v in ctx.items()},
    }


def _stub_lang(args: str, _ctx: dict[str, Any]) -> dict[str, Any]:
    """Simulate the language-translation module."""
    return {
        "module": "lang",
        "target_language": args,
        "ready": True,
    }


def _stub_opportunity(args: str, _ctx: dict[str, Any]) -> dict[str, Any]:
    """Simulate the opportunity-finder module."""
    return {
        "module": "opportunity",
        "sector": args,
        "opportunities": [
            {"name": f"{args} Opportunity #1", "score": 0.85},
            {"name": f"{args} Opportunity #2", "score": 0.72},
        ],
    }


# Mapping of CLI command names to stub dispatchers
_MODULE_REGISTRY: dict[str, _StubFn] = {
    "research": _stub_research,
    "price": _stub_price,
    "scam": _stub_scam,
    "invest": _stub_invest,
    "tax": _stub_tax,
    "export": _stub_export,
    "email": _stub_email,
    "lang": _stub_lang,
    "opportunity": _stub_opportunity,
}


# ---------------------------------------------------------------------------
# Presets
# ---------------------------------------------------------------------------

# Each preset is a list of (command, args) tuples.
_PRESETS: dict[str, list[tuple[str, str]]] = {
    "mining_setup": [
        ("research", "cryptocurrency mining hardware 2024"),
        ("invest", "ASIC miners"),
        ("tax", "mining_revenue"),
        ("export", "md"),
    ],
    "startup_guide": [
        ("opportunity", "African tech startups"),
        ("research", "funding landscape East Africa"),
        ("email", "investor@example.com"),
        ("export", "md"),
    ],
    "investment_due_diligence": [
        ("research", "project fundamentals"),
        ("scam", "contract audit"),
        ("invest", "token allocation"),
        ("export", "json"),
    ],
    "daily_digest": [
        ("price", "BTC ETH SOL"),
        ("research", "crypto market news"),
        ("export", "md"),
    ],
    "tax_report": [
        ("price", "BTC ETH"),
        ("tax", "south_africa"),
        ("export", "csv"),
    ],
}


# ---------------------------------------------------------------------------
# PipelineRunner
# ---------------------------------------------------------------------------

class PipelineRunner:
    """
    Chain multiple Luqi-AI capabilities together with shared context.

    A pipeline is expressed as a string using pipe syntax::

        /research Bitcoin | /price btc | /export md

    Each segment ``/command args`` is executed in order.  The result of
    each step is stored in :attr:`context` under the module name and is
    available to downstream steps.
    """

    def __init__(self) -> None:
        self.steps: list[dict[str, Any]] = []
        """Steps parsed from the most recent pipeline string."""

        self.context: dict[str, Any] = {}
        """Shared context populated by executed steps."""

    # -- Parsing ------------------------------------------------------------

    @staticmethod
    def parse_pipeline(command: str) -> list[dict[str, str]]:
        """
        Parse pipe syntax into a list of step descriptors.

        Args:
            command: Pipeline string such as
                ``"/research X | /price Y | /export md"``.

        Returns:
            List of dictionaries with keys ``command`` and ``args``.

        Raises:
            ValueError: If the pipeline string is empty or malformed.
        """
        command = command.strip()
        if not command:
            raise ValueError("Pipeline string cannot be empty.")

        steps: list[dict[str, str]] = []
        segments = [seg.strip() for seg in command.split("|") if seg.strip()]

        for seg in segments:
            # Support both "/command args" and "command args" prefixes
            match = re.match(r"^/?(\w+)\s*(.*)$", seg)
            if not match:
                raise ValueError(f"Invalid pipeline segment: {seg!r}")
            cmd, args = match.groups()
            steps.append({"command": cmd, "args": args.strip()})

        if not steps:
            raise ValueError("No valid steps found in pipeline.")

        return steps

    # -- Execution ----------------------------------------------------------

    def run(self, pipeline_str: str) -> list[dict[str, Any]]:
        """
        Execute a pipeline string end-to-end.

        Each step result is stored in :attr:`context` under its module
        name and included in the returned list.

        Args:
            pipeline_str: Pipeline expression (see :meth:`parse_pipeline`).

        Returns:
            List of result dictionaries, one per step.
        """
        self.steps = self.parse_pipeline(pipeline_str)
        self.context.clear()
        results: list[dict[str, Any]] = []

        for i, step in enumerate(self.steps, start=1):
            cmd = step["command"]
            args = step["args"]

            result: dict[str, Any] = {
                "step": i,
                "module": cmd,
                "args": args,
                "status": "pending",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": None,
                "data": {},
            }

            dispatcher = _MODULE_REGISTRY.get(cmd)
            if dispatcher is None:
                result["status"] = "error"
                result["error"] = f"Unknown module: '{cmd}'. Available: {', '.join(sorted(_MODULE_REGISTRY))}"
            else:
                try:
                    data = dispatcher(args, self.context)
                    result["data"] = data
                    result["status"] = "ok"
                    self.context[cmd] = data
                except Exception as exc:
                    result["status"] = "error"
                    result["error"] = str(exc)

            results.append(result)

        return results

    def run_preset(
        self, preset_name: str, **kwargs: str
    ) -> list[dict[str, Any]]:
        """
        Run a predefined pipeline by name.

        Args:
            preset_name: One of the keys returned by :meth:`list_presets`.
            **kwargs: Optional string overrides keyed by module name
                (e.g. ``research="Solana"``).

        Returns:
            List of step results (see :meth:`run`).

        Raises:
            ValueError: If *preset_name* is not recognised.
        """
        preset = _PRESETS.get(preset_name)
        if preset is None:
            available = ", ".join(sorted(_PRESETS))
            raise ValueError(
                f"Unknown preset '{preset_name}'. Available: {available}"
            )

        # Build pipeline string from preset, applying any overrides
        segments: list[str] = []
        for cmd, default_args in preset:
            args = kwargs.get(cmd, default_args)
            segments.append(f"/{cmd} {args}")

        pipeline_str = " | ".join(segments)
        return self.run(pipeline_str)

    # -- Formatting ---------------------------------------------------------

    @staticmethod
    def format_results(results: list[dict[str, Any]]) -> str:
        """
        Pretty-print multi-step results with step numbers and separators.

        Args:
            results: List of result dictionaries from :meth:`run` or
                :meth:`run_preset`.

        Returns:
            Multi-line formatted string.
        """
        if not results:
            return "No results."

        lines: list[str] = [
            "╔══════════════════════════════════════════════╗",
            "║           PIPELINE EXECUTION RESULTS          ║",
            "╚══════════════════════════════════════════════╝",
            "",
        ]

        for r in results:
            step_num = r.get("step", "?")
            module = r.get("module", "?")
            status = r.get("status", "?")
            ts = r.get("timestamp", "")

            status_icon = "✅" if status == "ok" else "❌" if status == "error" else "⏳"

            lines.append(f"{'─' * 50}")
            lines.append(f"  Step {step_num}  |  /{module}  |  {status_icon} {status.upper()}")
            if ts:
                lines.append(f"  Time: {ts}")
            lines.append("")

            data = r.get("data", {})
            if data:
                for key, value in data.items():
                    if isinstance(value, list):
                        lines.append(f"  • {key}:")
                        for item in value[:5]:  # cap list display
                            lines.append(f"      - {item}")
                        if len(value) > 5:
                            lines.append(f"      ... and {len(value) - 5} more")
                    elif isinstance(value, dict):
                        lines.append(f"  • {key}:")
                        for sub_k, sub_v in value.items():
                            lines.append(f"      {sub_k}: {sub_v}")
                    else:
                        lines.append(f"  • {key}: {value}")

            error = r.get("error")
            if error:
                lines.append(f"  ⚠️  ERROR: {error}")

            lines.append("")

        lines.append(f"{'─' * 50}")
        lines.append(f"Pipeline completed: {len(results)} step(s)")
        return "\n".join(lines)

    @staticmethod
    def list_presets() -> list[str]:
        """
        Return the names of all available pipeline presets.

        Returns:
            Sorted list of preset name strings.
        """
        return sorted(_PRESETS)

    @staticmethod
    def list_modules() -> list[str]:
        """
        Return the names of all registered pipeline modules.

        Returns:
            Sorted list of module name strings.
        """
        return sorted(_MODULE_REGISTRY)


# ---------------------------------------------------------------------------
# Self-test / demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    runner = PipelineRunner()

    print("=== Available modules ===")
    print(", ".join(runner.list_modules()))

    print("\n=== Available presets ===")
    print(", ".join(runner.list_presets()))

    print("\n=== Custom pipeline ===")
    results = runner.run("/research Solana | /price SOL | /export md")
    print(runner.format_results(results))

    print("\n=== Preset: daily_digest ===")
    results = runner.run_preset("daily_digest")
    print(runner.format_results(results))

    print("\n=== Preset: mining_setup ===")
    results = runner.run_preset("mining_setup")
    print(runner.format_results(results))
