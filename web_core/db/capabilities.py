"""
web_core.db.capabilities - Capability/feature flag persistence.
"""

from __future__ import annotations

import logging
from typing import Dict, List

from web_core.db.connection import ConnectionPool
from web_core.models import CapabilityItem, CapabilityStatus

logger = logging.getLogger("luqi.db.capabilities")


class CapabilityStore:
    """Store and retrieve LUQI capabilities with their status."""

    # Seed data — 71 capabilities from the original codebase
    SEED_CAPABILITIES = [
        ("chat", "Chat", "active", "core", "AI-powered multi-model chat"),
        ("memory", "Persistent Memory", "active", "core", "SQLite-backed conversation storage"),
        ("web_search", "Web Search", "active", "core", "DuckDuckGo search integration"),
        ("doc_parse", "Document Parsing", "active", "core", "PDF, DOCX, XLSX, TXT, image parsing"),
        ("voice_tts", "Text-to-Speech", "active", "voice", "gTTS with 8 accents"),
        ("voice_stt", "Speech-to-Text", "active", "voice", "SpeechRecognition engine"),
        ("self_improve", "Self-Improvement", "active", "advanced", "AST-based code analysis"),
        ("code_analysis", "Code Analysis", "active", "advanced", "Python AST analysis"),
        ("multi_model", "Multi-Model AI", "active", "core", "GPT-4o, Claude, local Llama"),
        ("youtube", "YouTube Creation Suite", "active", "content", "Campaigns, scripts, thumbnails"),
        ("wealth", "Wealth Creation Engine", "active", "content", "Funnels, sponsors, pricing"),
        ("pwa", "PWA Support", "active", "platform", "Service worker, offline support"),
        ("desktop", "Desktop App", "active", "platform", "PyQt6 WebEngine wrapper"),
        ("mobile", "Mobile Responsive", "active", "platform", "Touch gestures, responsive layout"),
        ("auth", "API Key Auth", "active", "security", "SHA-256 key validation"),
        ("rate_limit", "Rate Limiting", "active", "security", "Token bucket algorithm"),
        ("ws", "WebSocket Chat", "active", "core", "Real-time bidirectional chat"),
        ("export", "Data Export", "active", "utility", "JSON, CSV, Markdown export"),
        ("webhooks", "Webhook System", "active", "utility", "Event-driven HTTP callbacks"),
        ("translate", "Auto-Translation", "active", "utility", "Multi-language translation"),
        ("sentiment", "Sentiment Analysis", "active", "utility", "Text sentiment scoring"),
        ("metrics", "Prometheus Metrics", "active", "monitoring", "/metrics endpoint"),
        ("health", "Health Monitoring", "active", "monitoring", "System health checks"),
        ("file_upload", "File Upload & Analysis", "active", "core", "Multi-format file processing"),
        ("theme", "Theme Toggle", "active", "ui", "Dark/light mode"),
        ("admin", "Admin Dashboard", "active", "ui", "System administration panel"),
        ("offline", "Offline Support", "active", "pwa", "Service worker caching"),
        ("push_notif", "Push Notifications", "planned", "pwa", "Browser push notifications"),
        ("sync", "Cross-Device Sync", "planned", "pwa", "Cloud synchronization"),
        ("collab", "Collaborative Editing", "planned", "advanced", "Multi-user editing"),
        ("agent_marketplace", "Agent Marketplace", "planned", "advanced", "Third-party agent store"),
        ("rag", "RAG (Document QA)", "active", "advanced", "Retrieval-augmented generation"),
        ("image_gen", "Image Generation", "active", "content", "AI image creation"),
        ("video_gen", "Video Generation", "planned", "content", "AI video creation"),
        ("music_gen", "Music Generation", "planned", "content", "AI music creation"),
        ("sandbox", "Python Sandbox", "active", "advanced", "Secure code execution"),
        ("browser", "Browser Automation", "active", "core", "Web scraping & automation"),
        ("scheduler", "Task Scheduler", "active", "utility", "Cron-like job scheduling"),
        ("data_viz", "Data Visualization", "active", "utility", "Charts and graphs"),
        ("email", "Email Integration", "planned", "utility", "SMTP/IMAP email"),
        ("sms", "SMS Integration", "planned", "utility", "Twilio SMS"),
        ("calendar", "Calendar Integration", "planned", "utility", "ICS/CalDAV support"),
        ("social_post", "Social Media Posting", "active", "content", "Multi-platform posting"),
        ("seo_audit", "SEO Audit", "active", "content", "Search optimization analysis"),
        ("funnel_builder", "Sales Funnel Builder", "active", "wealth", "Revenue funnel design"),
        ("pricing_optimizer", "Pricing Optimizer", "active", "wealth", "Dynamic pricing"),
        ("sponsor_finder", "Sponsor Finder", "active", "wealth", "Brand partnership matching"),
        ("analytics", "Analytics Dashboard", "active", "monitoring", "Usage analytics"),
        ("ab_testing", "A/B Testing", "planned", "wealth", "Conversion optimization"),
        ("affiliate", "Affiliate System", "planned", "wealth", "Affiliate tracking"),
        ("subscription", "Subscription Management", "active", "wealth", "Recurring billing"),
        ("invoice", "Invoice Generator", "active", "wealth", "PDF invoice creation"),
        ("meeting_notes", "Meeting Notes AI", "active", "utility", "Automated note-taking"),
        ("competitor_analysis", "Competitor Analysis", "active", "wealth", "Market intelligence"),
        ("trend_forecast", "Trend Forecasting", "active", "wealth", "Predictive analytics"),
        ("api_builder", "API Builder", "active", "advanced", "Auto-generated REST APIs"),
        ("database_designer", "Database Designer", "active", "advanced", "Schema generation"),
        ("test_generator", "Test Generator", "active", "advanced", "Auto unit test creation"),
        ("ci_cd", "CI/CD Pipeline", "active", "advanced", "Deployment automation"),
        ("security_audit", "Security Audit", "active", "security", "Vulnerability scanning"),
        ("penetration_test", "Penetration Testing", "planned", "security", "Ethical hacking"),
        ("backup_restore", "Backup & Restore", "active", "utility", "Data protection"),
        ("migration", "Database Migration", "active", "utility", "Schema migrations"),
        ("localization", "Localization (i18n)", "active", "utility", "Multi-language support"),
        ("accessibility", "Accessibility (a11y)", "active", "ui", "WCAG compliance"),
        ("gdpr_compliance", "GDPR Compliance", "active", "security", "Data privacy"),
        ("audit_log", "Audit Logging", "active", "security", "Immutable event log"),
        ("voice_clone", "Voice Cloning", "planned", "voice", "Personal voice synthesis"),
        ("live_transcribe", "Live Transcription", "planned", "voice", "Real-time meeting transcription"),
    ]

    def __init__(self, pool: ConnectionPool):
        self.pool = pool
        self._seed()

    def _seed(self):
        """Insert default capabilities if table is empty."""
        row = self.pool.fetchone("SELECT COUNT(*) as c FROM capabilities")
        if row and row["c"] == 0:
            for cid, name, status, category, desc in self.SEED_CAPABILITIES:
                self.pool.execute(
                    "INSERT OR IGNORE INTO capabilities (name, status, description) VALUES (?, ?, ?)",
                    (f"{cid}|{name}|{category}", status, desc)
                )
            logger.info("Seeded %d capabilities", len(self.SEED_CAPABILITIES))

    def list_all(self) -> List[CapabilityItem]:
        rows = self.pool.fetchall("SELECT * FROM capabilities ORDER BY updated DESC")
        items = []
        for r in rows:
            parts = r["name"].split("|", 2)
            cid = parts[0] if len(parts) > 0 else ""
            name = parts[1] if len(parts) > 1 else r["name"]
            category = parts[2] if len(parts) > 2 else "general"
            items.append(CapabilityItem(
                id=cid, name=name, status=CapabilityStatus(r["status"]),
                category=category, description=r["description"] if r["description"] else ""
            ))
        return items

    def get_by_category(self, category: str) -> List[CapabilityItem]:
        return [c for c in self.list_all() if c.category == category]

    def get_by_status(self, status: CapabilityStatus) -> List[CapabilityItem]:
        return [c for c in self.list_all() if c.status == status]

    def count_active(self) -> int:
        return len(self.get_by_status(CapabilityStatus.ACTIVE))

    def count_planned(self) -> int:
        return len(self.get_by_status(CapabilityStatus.PLANNED))

    def upsert(self, cid: str, name: str, status: str, category: str = "general", description: str = "") -> None:
        full_name = f"{cid}|{name}|{category}"
        self.pool.execute(
            "INSERT INTO capabilities (name, status, description, updated) VALUES (?, ?, ?, datetime('now')) "
            "ON CONFLICT(name) DO UPDATE SET status=excluded.status, description=excluded.description, "
            "updated=datetime('now')",
            (full_name, status, description)
        )
