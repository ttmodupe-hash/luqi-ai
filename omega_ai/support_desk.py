"""
Support Desk & Help Center Module

A comprehensive help desk system for managing support tickets, FAQs,
auto-responses, sentiment analysis, and SLA tracking.

Author: Omega AI Systems
Version: 1.0
"""

import json
import os
import re
import time
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional


class SupportDesk:
    """
    Full help desk system for ticket management, FAQ auto-responses,
    sentiment analysis, SLA tracking, and support analytics.
    """

    DATA_DIR = Path("data/support")
    TICKETS_FILE = DATA_DIR / "tickets.json"
    FAQS_FILE = DATA_DIR / "faqs.json"
    RESPONSES_FILE = DATA_DIR / "responses.json"
    SLA_CONFIG_FILE = DATA_DIR / "sla_config.json"
    METRICS_FILE = DATA_DIR / "metrics.json"

    VALID_CATEGORIES = {"general", "billing", "technical", "feature_request", "bug", "account"}
    VALID_PRIORITIES = {"low", "medium", "high", "critical"}
    VALID_STATUSES = {"open", "in_progress", "waiting", "resolved", "closed", "reopened"}

    # Simple sentiment word lists
    POSITIVE_WORDS = {
        "good", "great", "excellent", "happy", "satisfied", "love", "awesome",
        "fantastic", "amazing", "perfect", "wonderful", "best", "helpful",
        "quick", "fast", "easy", "smooth", "efficient", "professional",
        "thanks", "thank", "appreciate", "grateful", "pleased", "delighted"
    }
    NEGATIVE_WORDS = {
        "bad", "terrible", "awful", "horrible", "hate", "angry", "frustrated",
        "disappointed", "worst", "slow", "broken", "useless", "stupid",
        "annoying", "poor", "unacceptable", "ridiculous", "pathetic",
        "fail", "error", "crash", "bug", "problem", "issue", "complaint",
        "refund", "cancel", "quit", "leave", "sue", "lawyer"
    }
    URGENCY_WORDS = {
        "urgent", "asap", "immediately", "emergency", "critical", "today",
        "deadline", "overdue", "late", "blocking", "stuck", "cannot work",
        "down", "outage", "lost money", "security", "breach", "hack"
    }

    def __init__(self):
        self._lock = Lock()
        self._ensure_data_dir()
        self._seed_data_if_empty()

    # ─────────────────────────────────────────── Persistence ──────────────────────────────────

    def _ensure_data_dir(self) -> None:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)

    def _load_json(self, path: Path, default: Any = None) -> Any:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return default if default is not None else {}

    def _save_json(self, path: Path, data: Any) -> None:
        tmp = path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        os.replace(tmp, path)

    def _now(self) -> str:
        return datetime.now().isoformat()

    def _generate_id(self, prefix: str = "") -> str:
        return f"{prefix}{uuid.uuid4().hex[:12]}"

    # ─────────────────────────────────────────── Seeding ──────────────────────────────────

    def _seed_data_if_empty(self) -> None:
        if not self.TICKETS_FILE.exists():
            self._seed_tickets()
        if not self.FAQS_FILE.exists():
            self._seed_faqs()
        if not self.SLA_CONFIG_FILE.exists():
            self._seed_sla_config()

    def _seed_tickets(self) -> None:
        now = self._now()
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        last_week = (datetime.now() - timedelta(days=5)).isoformat()

        tickets = {
            "TICK-001": {
                "ticket_id": "TICK-001",
                "subject": "Login not working after password reset",
                "description": "I reset my password but cannot log in with the new password.",
                "customer_id": "user_001",
                "category": "technical",
                "priority": "high",
                "status": "open",
                "assignee": None,
                "tags": ["login", "password"],
                "created_at": yesterday,
                "updated_at": yesterday,
                "resolved_at": None,
                "resolution": None,
                "satisfaction": None,
                "responses": []
            },
            "TICK-002": {
                "ticket_id": "TICK-002",
                "subject": "Billing question - double charged",
                "description": "I was charged twice for my subscription this month.",
                "customer_id": "user_002",
                "category": "billing",
                "priority": "medium",
                "status": "in_progress",
                "assignee": "agent_001",
                "tags": ["billing", "duplicate"],
                "created_at": last_week,
                "updated_at": yesterday,
                "resolved_at": None,
                "resolution": None,
                "satisfaction": None,
                "responses": [
                    {
                        "response_id": "RESP-001",
                        "message": "Thank you for contacting us. We are investigating the duplicate charge.",
                        "responder_id": "agent_001",
                        "is_internal": False,
                        "created_at": yesterday
                    }
                ]
            },
            "TICK-003": {
                "ticket_id": "TICK-003",
                "subject": "Feature request: Dark mode",
                "description": "Would love to have a dark mode option for the interface.",
                "customer_id": "user_003",
                "category": "feature_request",
                "priority": "low",
                "status": "waiting",
                "assignee": None,
                "tags": ["ui", "feature"],
                "created_at": now,
                "updated_at": now,
                "resolved_at": None,
                "resolution": None,
                "satisfaction": None,
                "responses": []
            },
            "TICK-004": {
                "ticket_id": "TICK-004",
                "subject": "Account locked after multiple failed attempts",
                "description": "My account got locked. I need access urgently for a presentation.",
                "customer_id": "user_001",
                "category": "account",
                "priority": "critical",
                "status": "open",
                "assignee": None,
                "tags": ["account", "security", "urgent"],
                "created_at": now,
                "updated_at": now,
                "resolved_at": None,
                "resolution": None,
                "satisfaction": None,
                "responses": []
            },
            "TICK-005": {
                "ticket_id": "TICK-005",
                "subject": "How to export data to PDF?",
                "description": "I want to export my tax calculation report to PDF format.",
                "customer_id": "user_004",
                "category": "general",
                "priority": "medium",
                "status": "closed",
                "assignee": "agent_002",
                "tags": ["export", "pdf", "how-to"],
                "created_at": last_week,
                "updated_at": yesterday,
                "resolved_at": yesterday,
                "resolution": "You can use the Export button on any report page. Select PDF format and click Download.",
                "satisfaction": 5,
                "responses": [
                    {
                        "response_id": "RESP-002",
                        "message": "You can use the Export button on any report page. Select PDF format and click Download.",
                        "responder_id": "agent_002",
                        "is_internal": False,
                        "created_at": yesterday
                    }
                ]
            }
        }
        self._save_json(self.TICKETS_FILE, tickets)

    def _seed_faqs(self) -> None:
        faqs = [
            {
                "faq_id": "FAQ-001",
                "question": "How do I reset my password?",
                "answer": "Go to Settings > Security > Change Password. Enter your current password, then your new password twice, and click Save.",
                "category": "account",
                "helpful_count": 42,
                "search_keywords": ["password", "reset", "change", "forgot"]
            },
            {
                "faq_id": "FAQ-002",
                "question": "How do I update my billing information?",
                "answer": "Navigate to Settings > Billing. You can update your payment method, billing address, and view your invoice history.",
                "category": "billing",
                "helpful_count": 28,
                "search_keywords": ["billing", "payment", "card", "invoice", "charge"]
            },
            {
                "faq_id": "FAQ-003",
                "question": "Why was I charged twice?",
                "answer": "Duplicate charges usually resolve automatically within 24-48 hours. If the charge persists, please submit a support ticket with your transaction ID.",
                "category": "billing",
                "helpful_count": 35,
                "search_keywords": ["duplicate", "charged", "twice", "double", "refund"]
            },
            {
                "faq_id": "FAQ-004",
                "question": "How do I cancel my subscription?",
                "answer": "Go to Settings > Subscription > Cancel. Your access will continue until the end of your current billing period.",
                "category": "billing",
                "helpful_count": 56,
                "search_keywords": ["cancel", "subscription", "stop", "terminate"]
            },
            {
                "faq_id": "FAQ-005",
                "question": "The app keeps crashing. What should I do?",
                "answer": "Try these steps: 1) Clear your browser cache, 2) Disable browser extensions, 3) Try an incognito window, 4) If still crashing, submit a ticket with your browser version.",
                "category": "technical",
                "helpful_count": 19,
                "search_keywords": ["crash", "error", "bug", "freeze", "loading"]
            },
            {
                "faq_id": "FAQ-006",
                "question": "How do I export my data?",
                "answer": "Go to any report or data page and click the Export button. Available formats: PDF, CSV, Excel. You can also use Settings > Data > Export All for a full backup.",
                "category": "technical",
                "helpful_count": 31,
                "search_keywords": ["export", "download", "save", "backup", "pdf", "csv"]
            },
            {
                "faq_id": "FAQ-007",
                "question": "Is my data secure?",
                "answer": "Yes. We use AES-256 encryption at rest, TLS 1.3 in transit, and comply with POPIA (Protection of Personal Information Act). Your data is stored in South African data centers.",
                "category": "security",
                "helpful_count": 47,
                "search_keywords": ["security", "secure", "encryption", "privacy", "popia", "data"]
            },
            {
                "faq_id": "FAQ-008",
                "question": "How do I enable two-factor authentication?",
                "answer": "Go to Settings > Security > Two-Factor Authentication. Scan the QR code with your authenticator app (Google Authenticator, Authy, or Microsoft Authenticator) and enter the 6-digit code.",
                "category": "security",
                "helpful_count": 23,
                "search_keywords": ["2fa", "two-factor", "authentication", "security", "login"]
            },
            {
                "faq_id": "FAQ-009",
                "question": "How do I calculate tax for my small business?",
                "answer": "Use the Chartered Accountant feature. Navigate to Finance > Tax Calculator, select 'Small Business Corporation', enter your taxable income, and the system will apply the correct SARS tiered rates.",
                "category": "features",
                "helpful_count": 38,
                "search_keywords": ["tax", "business", "sbc", "calculate", "sars"]
            },
            {
                "faq_id": "FAQ-010",
                "question": "Can I use the platform on my phone?",
                "answer": "Yes! Our platform is fully responsive and works on all mobile devices. You can access all features from your phone's browser. We also offer mobile-optimized views for key features.",
                "category": "features",
                "helpful_count": 15,
                "search_keywords": ["mobile", "phone", "app", "responsive", "device"]
            },
            {
                "faq_id": "FAQ-011",
                "question": "How do I change my email address?",
                "answer": "Go to Settings > Profile > Email. Enter your new email address and click Update. You'll receive a verification email at the new address.",
                "category": "account",
                "helpful_count": 12,
                "search_keywords": ["email", "change", "update", "address"]
            },
            {
                "faq_id": "FAQ-012",
                "question": "What payment methods do you accept?",
                "answer": "We accept credit/debit cards (Visa, Mastercard), EFT (Electronic Funds Transfer), and PayFast for South African customers. Enterprise clients can request invoice-based billing.",
                "category": "billing",
                "helpful_count": 20,
                "search_keywords": ["payment", "card", "eft", "payfast", "method"]
            },
            {
                "faq_id": "FAQ-013",
                "question": "How do I contact support?",
                "answer": "You can: 1) Use the chat widget in the bottom right, 2) Submit a ticket via Help > Submit Ticket, 3) Email support@luqi.ai. Premium users get priority response within 4 hours.",
                "category": "general",
                "helpful_count": 33,
                "search_keywords": ["contact", "support", "help", "email", "chat"]
            },
            {
                "faq_id": "FAQ-014",
                "question": "How do I track my learning progress?",
                "answer": "Go to Education > My Progress. You'll see completion percentages for each course, assessment scores, and recommended next steps based on your performance.",
                "category": "features",
                "helpful_count": 18,
                "search_keywords": ["progress", "learning", "track", "course", "education"]
            },
            {
                "faq_id": "FAQ-015",
                "question": "Can I download my tax reports?",
                "answer": "Yes. After generating any tax report, click the 'Export' button and select PDF or Excel format. Reports include all calculations with SARS references.",
                "category": "features",
                "helpful_count": 25,
                "search_keywords": ["tax", "report", "download", "export", "pdf"]
            },
            {
                "faq_id": "FAQ-016",
                "question": "What languages are supported?",
                "answer": "We support 5 African languages: Swahili, isiZulu, Hausa, Yoruba, and Amharic. Each language includes common phrases, translations, and cultural context.",
                "category": "features",
                "helpful_count": 14,
                "search_keywords": ["language", "african", "swahili", "zulu", "translate"]
            },
            {
                "faq_id": "FAQ-017",
                "question": "How do API keys work?",
                "answer": "API keys authenticate your requests. Find yours in Settings > API Keys. Include it in the X-API-Key header. Keep it secret - never share or commit it to code repositories.",
                "category": "technical",
                "helpful_count": 9,
                "search_keywords": ["api", "key", "authentication", "developer"]
            },
            {
                "faq_id": "FAQ-018",
                "question": "What are your SLA response times?",
                "answer": "Critical: 2 hours, High: 4 hours, Medium: 24 hours, Low: 72 hours. Premium subscribers get 50% faster response times across all priorities.",
                "category": "general",
                "helpful_count": 11,
                "search_keywords": ["sla", "response", "time", "priority", "support"]
            },
            {
                "faq_id": "FAQ-019",
                "question": "How do I change my notification preferences?",
                "answer": "Go to Settings > Notifications. You can toggle email, SMS, and in-app notifications for different event types like billing, security alerts, and course updates.",
                "category": "account",
                "helpful_count": 7,
                "search_keywords": ["notification", "email", "settings", "alert"]
            },
            {
                "faq_id": "FAQ-020",
                "faq_id": "FAQ-020",
                "question": "Is there a referral program?",
                "answer": "Yes! Refer friends and earn 1 month free for each successful referral. Go to Settings > Referrals to get your unique link and track your referrals.",
                "category": "general",
                "helpful_count": 16,
                "search_keywords": ["referral", "invite", "free", "friend", "program"]
            }
        ]
        self._save_json(self.FAQS_FILE, faqs)

    def _seed_sla_config(self) -> None:
        config = {
            "first_response_hours": {
                "critical": 2,
                "high": 4,
                "medium": 24,
                "low": 72
            },
            "resolution_hours": {
                "critical": 8,
                "high": 24,
                "medium": 72,
                "low": 168
            },
            "escalation_rules": [
                {
                    "rule_id": "ESC-001",
                    "name": "SLA Breach",
                    "condition": "first_response_sla_breached",
                    "action": "escalate_to_manager",
                    "description": "Escalate when first response SLA is breached"
                },
                {
                    "rule_id": "ESC-002",
                    "name": "Critical Priority",
                    "condition": "priority == critical AND status == open",
                    "action": "notify_team_lead",
                    "description": "Immediately notify team lead for critical tickets"
                },
                {
                    "rule_id": "ESC-003",
                    "name": "Negative Sentiment",
                    "condition": "sentiment_score < -0.5",
                    "action": "assign_senior_agent",
                    "description": "Assign senior agent when customer sentiment is very negative"
                },
                {
                    "rule_id": "ESC-004",
                    "name": "No Response 24h",
                    "condition": "status == open AND age_hours > 24",
                    "action": "auto_assign_and_notify",
                    "description": "Auto-assign tickets that have been open for 24+ hours without response"
                }
            ],
            "created_at": self._now(),
            "updated_at": self._now()
        }
        self._save_json(self.SLA_CONFIG_FILE, config)

    # ─────────────────────────────────────────── Ticket CRUD ──────────────────────────────────

    def create_ticket(self, subject: str, description: str, customer_id: str = None,
                      category: str = "general", priority: str = "medium",
                      tags: list = None) -> dict:
        with self._lock:
            if category not in self.VALID_CATEGORIES:
                return {"success": False, "error": f"Invalid category. Valid: {self.VALID_CATEGORIES}"}
            if priority not in self.VALID_PRIORITIES:
                return {"success": False, "error": f"Invalid priority. Valid: {self.VALID_PRIORITIES}"}

            ticket_id = self._generate_id("TICK-")
            now = self._now()
            ticket = {
                "ticket_id": ticket_id,
                "subject": subject,
                "description": description,
                "customer_id": customer_id,
                "category": category,
                "priority": priority,
                "status": "open",
                "assignee": None,
                "tags": tags or [],
                "created_at": now,
                "updated_at": now,
                "resolved_at": None,
                "resolution": None,
                "satisfaction": None,
                "responses": []
            }
            tickets = self._load_json(self.TICKETS_FILE, {})
            tickets[ticket_id] = ticket
            self._save_json(self.TICKETS_FILE, tickets)
            return {"success": True, "ticket_id": ticket_id, "subject": subject,
                    "status": "open", "created_at": now}

    def get_ticket(self, ticket_id: str) -> dict:
        tickets = self._load_json(self.TICKETS_FILE, {})
        ticket = tickets.get(ticket_id)
        if not ticket:
            return {"success": False, "error": f"Ticket {ticket_id} not found"}
        # Add sentiment analysis to ticket view
        sentiment = self.analyze_sentiment(ticket["subject"] + " " + ticket["description"])
        ticket_with_sentiment = {**ticket, "sentiment": sentiment}
        return {"success": True, "ticket": ticket_with_sentiment}

    def update_ticket(self, ticket_id: str, **updates) -> dict:
        with self._lock:
            tickets = self._load_json(self.TICKETS_FILE, {})
            ticket = tickets.get(ticket_id)
            if not ticket:
                return {"success": False, "error": f"Ticket {ticket_id} not found"}

            allowed = {"status", "priority", "category", "assignee", "tags", "resolution", "satisfaction"}
            for key, value in updates.items():
                if key in allowed:
                    if key in ("status", "priority", "category") and value is not None:
                        valid_set = self.VALID_STATUSES if key == "status" else (
                            self.VALID_PRIORITIES if key == "priority" else self.VALID_CATEGORIES)
                        if value not in valid_set:
                            return {"success": False, "error": f"Invalid {key}: {value}"}
                    ticket[key] = value

            ticket["updated_at"] = self._now()
            if updates.get("status") == "closed" and ticket.get("resolved_at") is None:
                ticket["resolved_at"] = self._now()

            self._save_json(self.TICKETS_FILE, tickets)
            return {"success": True, "ticket_id": ticket_id, "updated_fields": list(updates.keys())}

    def add_response(self, ticket_id: str, message: str, responder_id: str = "system",
                     is_internal: bool = False) -> dict:
        with self._lock:
            tickets = self._load_json(self.TICKETS_FILE, {})
            ticket = tickets.get(ticket_id)
            if not ticket:
                return {"success": False, "error": f"Ticket {ticket_id} not found"}

            response = {
                "response_id": self._generate_id("RESP-"),
                "message": message,
                "responder_id": responder_id,
                "is_internal": is_internal,
                "created_at": self._now()
            }
            ticket["responses"].append(response)
            ticket["updated_at"] = self._now()
            if ticket["status"] == "open":
                ticket["status"] = "in_progress"

            self._save_json(self.TICKETS_FILE, tickets)
            return {"success": True, "ticket_id": ticket_id, "response_id": response["response_id"],
                    "status": ticket["status"]}

    def close_ticket(self, ticket_id: str, resolution: str = "") -> dict:
        return self.update_ticket(ticket_id, status="closed", resolution=resolution)

    def reopen_ticket(self, ticket_id: str, reason: str = "") -> dict:
        with self._lock:
            tickets = self._load_json(self.TICKETS_FILE, {})
            ticket = tickets.get(ticket_id)
            if not ticket:
                return {"success": False, "error": f"Ticket {ticket_id} not found"}
            ticket["status"] = "reopened"
            ticket["resolved_at"] = None
            ticket["updated_at"] = self._now()
            if reason:
                ticket["responses"].append({
                    "response_id": self._generate_id("RESP-"),
                    "message": f"Ticket reopened: {reason}",
                    "responder_id": "system",
                    "is_internal": False,
                    "created_at": self._now()
                })
            self._save_json(self.TICKETS_FILE, tickets)
            return {"success": True, "ticket_id": ticket_id, "status": "reopened"}

    def list_tickets(self, status: str = None, category: str = None, priority: str = None,
                     assignee: str = None, customer_id: str = None) -> dict:
        tickets = self._load_json(self.TICKETS_FILE, {})
        result = list(tickets.values())

        if status:
            result = [t for t in result if t["status"] == status]
        if category:
            result = [t for t in result if t["category"] == category]
        if priority:
            result = [t for t in result if t["priority"] == priority]
        if assignee is not None:
            result = [t for t in result if t["assignee"] == assignee]
        if customer_id:
            result = [t for t in result if t["customer_id"] == customer_id]

        result.sort(key=lambda x: x["created_at"], reverse=True)
        return {"success": True, "count": len(result), "tickets": result}

    def assign_ticket(self, ticket_id: str, assignee_id: str) -> dict:
        return self.update_ticket(ticket_id, assignee=assignee_id)

    # ─────────────────────────────────────────── FAQ System ──────────────────────────────────

    def get_faqs(self, category: str = None) -> dict:
        faqs = self._load_json(self.FAQS_FILE, [])
        if category:
            faqs = [f for f in faqs if f.get("category") == category]
        faqs.sort(key=lambda x: x.get("helpful_count", 0), reverse=True)
        return {"success": True, "count": len(faqs), "faqs": faqs}

    def search_faqs(self, query: str) -> dict:
        faqs = self._load_json(self.FAQS_FILE, [])
        query_lower = query.lower()
        results = []
        for faq in faqs:
            score = 0
            # Check question match
            if query_lower in faq["question"].lower():
                score += 0.5
            # Check answer match
            if query_lower in faq["answer"].lower():
                score += 0.3
            # Check keywords
            for kw in faq.get("search_keywords", []):
                if query_lower in kw.lower() or kw.lower() in query_lower:
                    score += 0.2
            if score > 0:
                results.append({**faq, "relevance_score": round(score, 2)})

        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return {"success": True, "query": query, "count": len(results), "results": results}

    def suggest_auto_response(self, ticket_subject: str, ticket_description: str = "") -> dict:
        combined = ticket_subject + " " + ticket_description
        search_result = self.search_faqs(combined)

        if search_result["results"]:
            best_match = search_result["results"][0]
            return {
                "success": True,
                "suggested_response": best_match["answer"],
                "confidence": best_match["relevance_score"],
                "matched_faq_id": best_match["faq_id"],
                "suggestion_source": "faq_match"
            }
        return {
            "success": True,
            "suggested_response": "Thank you for contacting us. We have received your message and will respond shortly.",
            "confidence": 0.0,
            "matched_faq_id": None,
            "suggestion_source": "generic"
        }

    def mark_faq_helpful(self, faq_id: str) -> dict:
        with self._lock:
            faqs = self._load_json(self.FAQS_FILE, [])
            for faq in faqs:
                if faq["faq_id"] == faq_id:
                    faq["helpful_count"] = faq.get("helpful_count", 0) + 1
                    self._save_json(self.FAQS_FILE, faqs)
                    return {"success": True, "faq_id": faq_id, "helpful_count": faq["helpful_count"]}
            return {"success": False, "error": f"FAQ {faq_id} not found"}

    # ─────────────────────────────────────────── Sentiment Analysis ──────────────────────────────────

    def analyze_sentiment(self, text: str) -> dict:
        text_lower = text.lower()
        words = re.findall(r"\b\w+\b", text_lower)

        pos_count = sum(1 for w in words if w in self.POSITIVE_WORDS)
        neg_count = sum(1 for w in words if w in self.NEGATIVE_WORDS)
        urgency_count = sum(1 for w in words if w in self.URGENCY_WORDS)

        total = pos_count + neg_count
        if total == 0:
            sentiment = "neutral"
            score = 0.0
        else:
            score = (pos_count - neg_count) / total
            if score > 0.2:
                sentiment = "positive"
            elif score < -0.2:
                sentiment = "negative"
            else:
                sentiment = "neutral"

        urgency_level = "low"
        if urgency_count >= 3:
            urgency_level = "critical"
        elif urgency_count >= 1:
            urgency_level = "high"

        return {
            "sentiment": sentiment,
            "score": round(score, 2),
            "positive_words": pos_count,
            "negative_words": neg_count,
            "urgency_keywords": urgency_count,
            "urgency_level": urgency_level,
            "keywords_found": [w for w in words if w in self.POSITIVE_WORDS or w in self.NEGATIVE_WORDS]
        }

    def analyze_ticket_sentiment(self, ticket_id: str) -> dict:
        tickets = self._load_json(self.TICKETS_FILE, {})
        ticket = tickets.get(ticket_id)
        if not ticket:
            return {"success": False, "error": f"Ticket {ticket_id} not found"}

        full_text = ticket["subject"] + " " + ticket["description"]
        for resp in ticket.get("responses", []):
            full_text += " " + resp["message"]

        sentiment = self.analyze_sentiment(full_text)
        escalation_recommended = (
            sentiment["sentiment"] == "negative" and sentiment["score"] < -0.5
        ) or ticket["priority"] == "critical" or sentiment["urgency_level"] == "critical"

        return {
            "success": True,
            "ticket_id": ticket_id,
            "overall_sentiment": sentiment["sentiment"],
            "sentiment_score": sentiment["score"],
            "customer_mood": "frustrated" if sentiment["score"] < -0.5 else (
                "concerned" if sentiment["score"] < 0 else "satisfied"),
            "urgency_level": sentiment["urgency_level"],
            "escalation_recommended": escalation_recommended,
            "keywords_found": sentiment["keywords_found"]
        }

    # ─────────────────────────────────────────── SLA & Escalation ──────────────────────────────────

    def get_sla_config(self) -> dict:
        config = self._load_json(self.SLA_CONFIG_FILE, {})
        return {"success": True, "sla_config": config}

    def check_sla_status(self, ticket_id: str) -> dict:
        tickets = self._load_json(self.TICKETS_FILE, {})
        ticket = tickets.get(ticket_id)
        if not ticket:
            return {"success": False, "error": f"Ticket {ticket_id} not found"}

        config = self._load_json(self.SLA_CONFIG_FILE, {})
        first_response_hours = config.get("first_response_hours", {})
        sla_hours = first_response_hours.get(ticket["priority"], 24)

        created = datetime.fromisoformat(ticket["created_at"].replace("Z", "+00:00"))
        now = datetime.now()
        elapsed = (now - created).total_seconds() / 3600

        has_response = len(ticket.get("responses", [])) > 0
        breached = not has_response and elapsed > sla_hours

        return {
            "success": True,
            "ticket_id": ticket_id,
            "within_sla": not breached,
            "has_response": has_response,
            "time_elapsed_hours": round(elapsed, 1),
            "sla_hours": sla_hours,
            "time_remaining_hours": round(max(0, sla_hours - elapsed), 1) if not has_response else 0,
            "breached": breached,
            "priority": ticket["priority"]
        }

    def get_escalation_recommendations(self) -> dict:
        tickets = self._load_json(self.TICKETS_FILE, {})
        escalations = []

        for ticket in tickets.values():
            # Check SLA breach
            sla_status = self.check_sla_status(ticket["ticket_id"])
            if sla_status.get("breached"):
                escalations.append({
                    "ticket_id": ticket["ticket_id"],
                    "reason": "SLA breach - no first response",
                    "priority": ticket["priority"],
                    "time_elapsed_hours": sla_status["time_elapsed_hours"]
                })
                continue

            # Check critical priority
            if ticket["priority"] == "critical" and ticket["status"] == "open":
                escalations.append({
                    "ticket_id": ticket["ticket_id"],
                    "reason": "Critical priority ticket still open",
                    "priority": "critical",
                    "time_elapsed_hours": sla_status["time_elapsed_hours"]
                })
                continue

            # Check negative sentiment
            sentiment = self.analyze_sentiment(ticket["subject"] + " " + ticket["description"])
            if sentiment["score"] < -0.5:
                escalations.append({
                    "ticket_id": ticket["ticket_id"],
                    "reason": "Negative customer sentiment",
                    "priority": ticket["priority"],
                    "sentiment_score": sentiment["score"]
                })

        escalations.sort(key=lambda x: x.get("time_elapsed_hours", 0), reverse=True)
        return {"success": True, "escalation_count": len(escalations), "escalations": escalations}

    # ─────────────────────────────────────────── Analytics ──────────────────────────────────

    def get_dashboard_metrics(self) -> dict:
        tickets_data = self._load_json(self.TICKETS_FILE, {})
        tickets = list(tickets_data.values())

        total = len(tickets)
        open_tickets = sum(1 for t in tickets if t["status"] in ("open", "in_progress", "reopened"))
        closed_today = sum(
            1 for t in tickets
            if t["status"] == "closed"
            and t.get("resolved_at")
            and datetime.fromisoformat(t["resolved_at"].replace("Z", "+00:00")).date() == datetime.now().date()
        )

        # Resolution times
        resolution_times = []
        for t in tickets:
            if t.get("resolved_at") and t.get("created_at"):
                created = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
                resolved = datetime.fromisoformat(t["resolved_at"].replace("Z", "+00:00"))
                resolution_times.append((resolved - created).total_seconds() / 3600)
        avg_resolution = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0

        # By category
        by_category = Counter(t["category"] for t in tickets)
        by_priority = Counter(t["priority"] for t in tickets)

        # Top issues (most common words in subjects)
        all_subjects = " ".join(t["subject"] for t in tickets).lower()
        words = re.findall(r"\b\w{4,}\b", all_subjects)
        top_issues = [{"issue": word, "count": count} for word, count in Counter(words).most_common(5)]

        # Satisfaction
        ratings = [t["satisfaction"] for t in tickets if t.get("satisfaction")]
        csat = round(sum(ratings) / len(ratings), 1) if ratings else 0

        # SLA compliance
        sla_breaches = sum(
            1 for t in tickets
            if t["status"] != "closed" and self.check_sla_status(t["ticket_id"]).get("breached")
        )
        sla_compliance = round(((total - sla_breaches) / total) * 100, 1) if total > 0 else 100

        return {
            "success": True,
            "total_tickets": total,
            "open_tickets": open_tickets,
            "closed_today": closed_today,
            "avg_resolution_hours": avg_resolution,
            "sla_compliance_percent": sla_compliance,
            "tickets_by_category": dict(by_category),
            "tickets_by_priority": dict(by_priority),
            "top_issues": top_issues,
            "customer_satisfaction": csat
        }

    def get_agent_performance(self, agent_id: str = None) -> dict:
        tickets_data = self._load_json(self.TICKETS_FILE, {})
        tickets = list(tickets_data.values())

        if agent_id:
            agent_tickets = [t for t in tickets if t.get("assignee") == agent_id]
            return self._calc_agent_metrics(agent_id, agent_tickets)

        # Aggregate for all agents
        agents = set(t.get("assignee") for t in tickets if t.get("assignee"))
        return {
            "success": True,
            "agents": [self._calc_agent_metrics(aid, [t for t in tickets if t.get("assignee") == aid]) for aid in agents]
        }

    def _calc_agent_metrics(self, agent_id: str, agent_tickets: list) -> dict:
        handled = len(agent_tickets)
        resolved = [t for t in agent_tickets if t.get("resolved_at")]
        times = []
        for t in resolved:
            created = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
            resolved_dt = datetime.fromisoformat(t["resolved_at"].replace("Z", "+00:00"))
            times.append((resolved_dt - created).total_seconds() / 3600)
        avg_time = round(sum(times) / len(times), 1) if times else 0
        ratings = [t["satisfaction"] for t in agent_tickets if t.get("satisfaction")]
        rating = round(sum(ratings) / len(ratings), 1) if ratings else 0

        return {
            "agent_id": agent_id,
            "tickets_handled": handled,
            "tickets_resolved": len(resolved),
            "avg_resolution_time_hours": avg_time,
            "customer_rating": rating
        }

    # ─────────────────────────────────────────── Bulk Operations ──────────────────────────────────

    def bulk_update_priority(self, ticket_ids: list, priority: str) -> dict:
        if priority not in self.VALID_PRIORITIES:
            return {"success": False, "error": f"Invalid priority: {priority}"}
        updated = 0
        for tid in ticket_ids:
            result = self.update_ticket(tid, priority=priority)
            if result.get("success"):
                updated += 1
        return {"success": True, "updated": updated, "total": len(ticket_ids), "new_priority": priority}

    def merge_tickets(self, primary_id: str, secondary_id: str) -> dict:
        with self._lock:
            tickets = self._load_json(self.TICKETS_FILE, {})
            primary = tickets.get(primary_id)
            secondary = tickets.get(secondary_id)
            if not primary or not secondary:
                return {"success": False, "error": "One or both tickets not found"}

            primary["responses"].extend(secondary.get("responses", []))
            primary["tags"] = list(set(primary.get("tags", []) + secondary.get("tags", [])))
            primary["updated_at"] = self._now()

            secondary["status"] = "closed"
            secondary["resolution"] = f"Merged into {primary_id}"
            secondary["resolved_at"] = self._now()

            self._save_json(self.TICKETS_FILE, tickets)
            return {"success": True, "primary_id": primary_id, "secondary_id": secondary_id,
                    "responses_merged": len(secondary.get("responses", []))}

    def export_tickets(self) -> dict:
        tickets = self._load_json(self.TICKETS_FILE, {})
        return {"success": True, "count": len(tickets), "export": list(tickets.values())}


# ─────────────────────────────────────────── Factory ──────────────────────────────────

def create_support_desk() -> SupportDesk:
    return SupportDesk()
