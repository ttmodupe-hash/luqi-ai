"""Omega AI v3.3 — Core Capability Plugins

Wraps all existing OmegaBrain handler methods as proper PluginRegistry plugins.
Each handler becomes a class implementing PluginInterface, auto-registered via
@capability decorator on import.

Importing this module (``from omega_plugins import *``) registers all 10 core
capabilities into the global plugin_registry, making them available for dynamic
intent matching without any changes to core_brain.py.

New capabilities can be added by creating new @capability-decorated classes in
this file or in separate modules discovered via registry.discover().
"""
from __future__ import annotations

from plugin_registry import PluginInterface, capability


# ── Plugin: Deep Research ──────────────────────────────────────────────────

@capability(
    "deep_research",
    keywords=[
        "research", "analyze", "compare", "difference between", "explain",
        "what is", "how does", "why is", "history of", "pros and cons",
        "deep dive", "comprehensive", "overview of", "tell me about",
    ],
    priority=2,
)
class DeepResearchPlugin(PluginInterface):
    """Multi-source research with citations."""

    def handle(self, query: str) -> dict:
        from deep_research import DeepResearch

        result = DeepResearch().research(query, depth="deep")
        return {
            "response": result.get(
                "cited_response", result.get("summary", str(result))
            ),
            "module": "deep_research",
            "sources": result.get("sources", []),
        }


# ── Plugin: Investment ─────────────────────────────────────────────────────

@capability(
    "investment",
    keywords=[
        "bitcoin", "btc", "ethereum", "crypto", "mining", "asic", "hashrate",
        "portfolio", "invest", "trading", "forex", "stock market", "dividend",
        "blockchain", "altcoin", "defi", "nft", "staking", "wallet",
    ],
    priority=2,
)
class InvestmentPlugin(PluginInterface):
    """Crypto, mining, and portfolio guidance."""

    def handle(self, query: str) -> dict:
        from investment_mining import InvestmentMining

        im = InvestmentMining()
        q = query.lower()
        if "mining" in q or "profitability" in q or "asic" in q:
            return {
                "response": im.mining_guide("profitability", {}),
                "module": "investment",
            }
        elif "portfolio" in q:
            return {
                "response": im.portfolio_advice({"BTC": 0.5, "ETH": 0.3}),
                "module": "investment",
            }
        else:
            analysis = im.investment_analysis("bitcoin")
            return {
                "response": analysis.get("outlook", "") + im.disclaimer(),
                "module": "investment",
                "sources": analysis.get("sources", []),
            }


# ── Plugin: Tax ────────────────────────────────────────────────────────────

@capability(
    "tax",
    keywords=[
        "tax", "sars", "firs", "kra", "gra", "vat", "income tax",
        "corporate tax", "tax return", "filing", "deduction", "rebate",
        "capital gains tax", "crypto tax",
    ],
    priority=2,
)
class TaxPlugin(PluginInterface):
    """Country-specific tax guidance."""

    # Countries recognised by the tax engine
    _COUNTRIES = [
        "south africa", "nigeria", "kenya", "ghana", "egypt", "morocco",
        "united states", "united kingdom", "australia",
    ]

    def handle(self, query: str) -> dict:
        from tax_engine import TaxEngine

        te = TaxEngine()
        country = "south africa"
        q_lower = query.lower()
        for c in self._COUNTRIES:
            if c in q_lower:
                country = c
                break
        return {
            "response": te.tax_query(country, "personal_income"),
            "module": "tax",
            "sources": [
                {"title": f"{country.title()} Tax Guide", "source": "Tax Authority"}
            ],
        }


# ── Plugin: Companion ──────────────────────────────────────────────────────

@capability(
    "companion",
    keywords=[
        "train you", "teach you", "rate your answer", "feedback",
        "that was wrong", "improve your", "learn from", "training mode",
        "companion mode",
    ],
    priority=3,  # Higher priority — companion/training is a specific intent
)
class CompanionPlugin(PluginInterface):
    """Training mode and feedback instructions."""

    def handle(self, query: str) -> dict:
        return {
            "response": (
                "Enter training mode with command: /train\n\nYou can:\n"
                "\u2022 Rate my responses (1-5 stars)\n"
                "\u2022 Submit corrections\n"
                "\u2022 View training status\n\n"
                "Your feedback helps me improve!"
            ),
            "module": "companion",
        }


# ── Plugin: Self-Improve ───────────────────────────────────────────────────

@capability(
    "self_improve",
    keywords=[
        "self improve", "lab report", "health check", "benchmark",
        "system status", "performance report", "analyze yourself",
        "how are you doing",
    ],
    priority=1,
)
class SelfImprovePlugin(PluginInterface):
    """System health check and lab report."""

    def handle(self, query: str) -> dict:
        from self_improve import SelfImprovementLab

        return {
            "response": SelfImprovementLab().lab_report(),
            "module": "self_improve",
        }


# ── Plugin: Language ───────────────────────────────────────────────────────

@capability(
    "language",
    keywords=[
        "translate", "in zulu", "in xhosa", "in swahili", "say in",
        "how do you say", "greetings in", "language lesson", "speak",
        "meaning of", "what does * mean in",
    ],
    priority=2,
)
class LanguagePlugin(PluginInterface):
    """African language translation and learning."""

    def handle(self, query: str) -> dict:
        from african_languages import AfricanLanguages

        al = AfricanLanguages()
        q = query.lower()

        # Try to extract language and text to translate
        for lang_code, info_data in al.LANGUAGES.items():
            lang_name = info_data["name"].lower()
            if f" in {lang_code}" in q or lang_name in q:
                text = self._extract_text(query, q, lang_code, lang_name)
                return {"response": al.translate(text, lang_code), "module": "language"}

        # Default: show learning mode for Zulu
        return {"response": al.learn_mode("zu"), "module": "language"}

    @staticmethod
    def _extract_text(query: str, q_lower: str, lang_code: str, lang_name: str) -> str:
        """Extract the text the user wants translated."""
        if '"' in query:
            parts = query.split('"')
            if len(parts) >= 2:
                return parts[1]
        if "translate" in q_lower:
            text = (
                q_lower.replace("translate", "")
                .replace(f"in {lang_code}", "")
                .replace(lang_name, "")
                .strip(" '")
                .split(" to ")[0]
            )
            if text:
                return text
        return "hello"


# ── Plugin: Financial Literacy ─────────────────────────────────────────────

@capability(
    "financial_lit",
    keywords=[
        "scam", "ponzi", "budget", "save money", "financial literacy",
        "debt", "credit score", "emergency fund", "stokvel", "mobile money",
        "protect from", "is this a scam", "red flag", "too good to be true",
    ],
    priority=2,
)
class FinancialLitPlugin(PluginInterface):
    """Financial education and scam detection."""

    def handle(self, query: str) -> dict:
        from financial_literacy import FinancialLiteracy

        fl = FinancialLiteracy()
        if "scam" in query.lower():
            result = fl.scam_check(query)
            lines = [
                f"Scam Risk Score: {result['risk_score']}/100",
                result["risk_level"],
                "",
                "Red Flags:",
            ]
            for flag in result["red_flags"]:
                lines.append(f"  \u2022 {flag}")
            lines.extend(["", result["advice"]])
            return {"response": "\n".join(lines), "module": "financial_lit"}
        return {"response": fl.lesson("budgeting"), "module": "financial_lit"}


# ── Plugin: Professional ───────────────────────────────────────────────────

@capability(
    "professional",
    keywords=[
        "write code", "python function", "javascript", "engineering calc",
        "how to build", "architecture question", "plumbing help", "electrical",
        "medical info", "legal question", "hr policy", "marketing strategy",
    ],
    priority=1,
)
class ProfessionalPlugin(PluginInterface):
    """Multi-domain professional assistance."""

    def handle(self, query: str) -> dict:
        from professional_assist import ProfessionalAssist

        return {
            "response": ProfessionalAssist().get_help("software_eng", query),
            "module": "professional",
        }


# ── Plugin: Opportunity ────────────────────────────────────────────────────

@capability(
    "opportunity",
    keywords=[
        "business opportunity", "business opportunities", "market gap", "trend analysis",
        "entrepreneur", "startup idea", "african market", "investment opportunity",
        "investment opportunities", "side hustle",
    ],
    priority=2,
)
class OpportunityPlugin(PluginInterface):
    """African business opportunities and market gaps."""

    _COUNTRIES = [
        "nigeria", "kenya", "ghana", "south africa", "egypt",
        "morocco", "ethiopia",
    ]

    def handle(self, query: str) -> dict:
        from opportunity_engine import OpportunityEngine

        oe = OpportunityEngine()
        country = ""
        q_lower = query.lower()
        for c in self._COUNTRIES:
            if c in q_lower:
                country = c
                break

        ops = oe.african_opportunities(country)
        lines = [
            f"## African Business Opportunities{f' in {country.title()}' if country else ''}\n"
        ]
        sources: list[dict[str, str]] = []
        for op in ops[:5]:
            lines.append(f"\u2022 {op['title']}")
            lines.append(f"  {op['description'][:120]}...")
            if op.get("source"):
                sources.append({"title": op["title"], "source": op["source"]})
        return {"response": "\n".join(lines), "module": "opportunity", "sources": sources}


# ── Plugin: Email ──────────────────────────────────────────────────────────

@capability(
    "email",
    keywords=[
        "write an email", "draft email", "email to", "professional email",
        "grammar check", "improve this email", "email template",
        "tone analysis", "subject line",
    ],
    priority=1,
)
class EmailPlugin(PluginInterface):
    """Email composition, grammar, and tone assistance."""

    def handle(self, query: str) -> dict:
        from email_assistant import EmailAssistant

        ea = EmailAssistant()
        if "write" in query.lower() or "draft" in query.lower():
            return {
                "response": ea.compose_email(
                    "follow_up", "Recipient", ["Project update"], topic="Project Update"
                ),
                "module": "email",
            }
        return {"response": ea.improve_email(query), "module": "email"}
