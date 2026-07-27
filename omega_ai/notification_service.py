"""
Omega AI Notification Service v3.7.0 "Prometheus"
====================================================
Unified Email & SMS notification engine with multi-provider fallback,
SQLite-backed queue, pre-built templates, and graceful degradation.

Providers (Email): SendGrid > Mailgun > SMTP > Queue
Providers (SMS):   Twilio > Africa's Talking > Queue

Usage:
    svc = NotificationService()
    svc.send_email("user@example.com", "Welcome", "Hello!")
    svc.send_sms("+27123456789", "Your code is 123456")
"""

from __future__ import annotations

import json
import logging
import os
import re
import smtplib
import sqlite3
import threading
import time
import uuid
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("omega_ai.notification_service")

# ═══════════════════════════════════════════════════════════════════════════════
#  ENVIRONMENT CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

ENV_SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
ENV_MAILGUN_API_KEY = os.environ.get("MAILGUN_API_KEY", "")
ENV_MAILGUN_DOMAIN = os.environ.get("MAILGUN_DOMAIN", "")
ENV_SMTP_HOST = os.environ.get("SMTP_HOST", "")
ENV_SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
ENV_SMTP_USER = os.environ.get("SMTP_USER", "")
ENV_SMTP_PASS = os.environ.get("SMTP_PASS", "")
ENV_FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@omega-ai.local")
ENV_FROM_NAME = os.environ.get("FROM_NAME", "Omega AI")
ENV_TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
ENV_TWILIO_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
ENV_TWILIO_FROM = os.environ.get("TWILIO_PHONE_NUMBER", "")
ENV_AT_API_KEY = os.environ.get("AFRICASTALKING_API_KEY", "")
ENV_AT_USERNAME = os.environ.get("AFRICASTALKING_USERNAME", "")
ENV_QUEUE_DB_PATH = os.environ.get("NOTIFICATION_QUEUE_DB", "")


# ═══════════════════════════════════════════════════════════════════════════════
#  DEFAULT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_TEMPLATES: dict[str, dict[str, Any]] = {
    "welcome": {
        "id": "welcome",
        "category": "onboarding",
        "name": "Welcome Email",
        "subject": "Welcome to {{platform_name}}, {{first_name}}!",
        "body_text": """Hi {{first_name}},

Welcome to {{platform_name}}! We're thrilled to have you on board.

Your account has been successfully created. Here are your details:
  • Username: {{username}}
  • Email:    {{email}}
  • Plan:     {{plan}}

Get started:
  1. Complete your profile: {{profile_url}}
  2. Explore our features:  {{features_url}}
  3. Join the community:    {{community_url}}

If you have any questions, reply to this email or contact support at {{support_email}}.

Best regards,
The {{platform_name}} Team
""",
        "body_html": """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Welcome</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px;text-align:center;color:#fff;">
    <h1>Welcome to {{platform_name}}, {{first_name}}!</h1>
  </div>
  <div style="padding:30px;">
    <p>Hi {{first_name}},</p>
    <p>Welcome to <strong>{{platform_name}}</strong>! We're thrilled to have you on board.</p>
    <div style="background:#f7f7f7;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:5px 0;"><strong>Username:</strong> {{username}}</p>
      <p style="margin:5px 0;"><strong>Email:</strong> {{email}}</p>
      <p style="margin:5px 0;"><strong>Plan:</strong> {{plan}}</p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="{{profile_url}}" style="background:#667eea;color:#fff;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;margin:5px;">Complete Profile</a>
      <a href="{{features_url}}" style="background:#764ba2;color:#fff;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;margin:5px;">Explore Features</a>
    </div>
    <p>Need help? Contact us at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
    <p>Best regards,<br>The {{platform_name}} Team</p>
  </div>
</body></html>""",
        "variables": ["first_name", "username", "email", "plan", "platform_name", "profile_url", "features_url", "community_url", "support_email"],
    },
    "password_reset": {
        "id": "password_reset",
        "category": "security",
        "name": "Password Reset",
        "subject": "Password reset request for {{platform_name}}",
        "body_text": """Hi {{first_name}},

We received a request to reset your password for your {{platform_name}} account ({{email}}).

If you made this request, click the link below to reset your password:
  {{reset_url}}

This link will expire in {{expiry_hours}} hours.

If you did NOT request a password reset, please ignore this email. Your account is safe.

For security, this request was made from:
  IP: {{request_ip}}
  Time: {{request_time}}

Best regards,
The {{platform_name}} Security Team
""",
        "body_html": """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Password Reset</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:#ff6b6b;padding:40px;text-align:center;color:#fff;">
    <h1>Password Reset Request</h1>
  </div>
  <div style="padding:30px;">
    <p>Hi {{first_name}},</p>
    <p>We received a request to reset your password for <strong>{{platform_name}}</strong>.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="{{reset_url}}" style="background:#ff6b6b;color:#fff;padding:14px 40px;text-decoration:none;border-radius:5px;font-size:16px;">Reset Password</a>
    </div>
    <p style="color:#888;font-size:13px;">This link expires in {{expiry_hours}} hours.</p>
    <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;font-size:13px;">
      <strong>Didn't request this?</strong> Ignore this email. Your account is safe.
    </div>
    <p style="font-size:12px;color:#888;">Request from IP: {{request_ip}} at {{request_time}}</p>
    <p>Best regards,<br>The {{platform_name}} Security Team</p>
  </div>
</body></html>""",
        "variables": ["first_name", "email", "platform_name", "reset_url", "expiry_hours", "request_ip", "request_time"],
    },
    "ticket_update": {
        "id": "ticket_update",
        "category": "support",
        "name": "Ticket Update",
        "subject": "[Ticket #{{ticket_id}}] {{status}} - {{subject}}",
        "body_text": """Hi {{first_name}},

Your support ticket has been updated:

  Ticket ID:  #{{ticket_id}}
  Subject:    {{subject}}
  Status:     {{status}}
  Priority:   {{priority}}
  Updated by: {{agent_name}}

Latest message:
---
{{message}}
---

View ticket: {{ticket_url}}

Best regards,
{{agent_name}}
{{platform_name}} Support Team
""",
        "body_html": """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket Update</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:#4ecdc4;padding:30px;text-align:center;color:#fff;">
    <h1>Ticket #{{ticket_id}} Updated</h1>
  </div>
  <div style="padding:30px;">
    <p>Hi {{first_name}},</p>
    <p>Your support ticket has been updated:</p>
    <table style="width:100%;background:#f7f7f7;border-radius:8px;padding:15px;margin:15px 0;">
      <tr><td style="padding:8px;color:#888;">Ticket ID</td><td style="padding:8px;font-weight:bold;">#{{ticket_id}}</td></tr>
      <tr><td style="padding:8px;color:#888;">Subject</td><td style="padding:8px;">{{subject}}</td></tr>
      <tr><td style="padding:8px;color:#888;">Status</td><td style="padding:8px;"><span style="background:#4ecdc4;color:#fff;padding:3px 10px;border-radius:3px;">{{status}}</span></td></tr>
      <tr><td style="padding:8px;color:#888;">Priority</td><td style="padding:8px;">{{priority}}</td></tr>
      <tr><td style="padding:8px;color:#888;">Updated by</td><td style="padding:8px;">{{agent_name}}</td></tr>
    </table>
    <div style="background:#fff;border-left:4px solid #4ecdc4;padding:15px;margin:20px 0;">
      <p style="margin:0;font-style:italic;">{{message}}</p>
    </div>
    <div style="text-align:center;margin:25px 0;">
      <a href="{{ticket_url}}" style="background:#4ecdc4;color:#fff;padding:12px 30px;text-decoration:none;border-radius:5px;">View Ticket</a>
    </div>
    <p>Best regards,<br>{{agent_name}}<br>{{platform_name}} Support Team</p>
  </div>
</body></html>""",
        "variables": ["first_name", "ticket_id", "subject", "status", "priority", "agent_name", "message", "ticket_url", "platform_name"],
    },
    "reminder": {
        "id": "reminder",
        "category": "general",
        "name": "Reminder",
        "subject": "Reminder: {{reminder_title}}",
        "body_text": """Hi {{first_name}},

This is a friendly reminder about:

  {{reminder_title}}

Details:
{{details}}

Scheduled for: {{scheduled_time}}

{{action_text}}: {{action_url}}

Best regards,
The {{platform_name}} Team
""",
        "body_html": """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Reminder</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:#f7b731;padding:40px;text-align:center;color:#fff;">
    <h1>{{reminder_title}}</h1>
  </div>
  <div style="padding:30px;">
    <p>Hi {{first_name}},</p>
    <p>This is a friendly reminder:</p>
    <div style="background:#fffbeb;border-left:4px solid #f7b731;padding:20px;margin:20px 0;">
      <p style="margin:0;font-size:16px;"><strong>{{reminder_title}}</strong></p>
      <p style="margin:10px 0 0 0;">{{details}}</p>
      <p style="margin:10px 0 0 0;color:#888;">Scheduled: {{scheduled_time}}</p>
    </div>
    <div style="text-align:center;margin:25px 0;">
      <a href="{{action_url}}" style="background:#f7b731;color:#fff;padding:12px 30px;text-decoration:none;border-radius:5px;">{{action_text}}</a>
    </div>
    <p>Best regards,<br>The {{platform_name}} Team</p>
  </div>
</body></html>""",
        "variables": ["first_name", "reminder_title", "details", "scheduled_time", "action_text", "action_url", "platform_name"],
    },
    "security_alert": {
        "id": "security_alert",
        "category": "security",
        "name": "Security Alert",
        "subject": "SECURITY ALERT: {{alert_type}} detected on your {{platform_name}} account",
        "body_text": """Hi {{first_name}},

We detected unusual activity on your {{platform_name}} account:

  Alert Type:    {{alert_type}}
  Severity:      {{severity}}
  Detected at:   {{detected_at}}
  IP Address:    {{ip_address}}
  Location:      {{location}}
  Device:        {{device}}

Details:
{{details}}

If this was you, you can ignore this alert.
If this was NOT you, please secure your account immediately:
  {{secure_account_url}}

You can also contact our security team at {{security_email}}.

Best regards,
The {{platform_name}} Security Team
""",
        "body_html": """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Security Alert</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:#e74c3c;padding:40px;text-align:center;color:#fff;">
    <h1>SECURITY ALERT</h1>
    <p>{{alert_type}} detected</p>
  </div>
  <div style="padding:30px;">
    <p>Hi {{first_name}},</p>
    <p>We detected unusual activity on your <strong>{{platform_name}}</strong> account:</p>
    <table style="width:100%;background:#fdf2f2;border-radius:8px;padding:15px;margin:15px 0;">
      <tr><td style="padding:8px;color:#888;">Alert Type</td><td style="padding:8px;font-weight:bold;">{{alert_type}}</td></tr>
      <tr><td style="padding:8px;color:#888;">Severity</td><td style="padding:8px;"><span style="background:{{severity_color}};color:#fff;padding:3px 10px;border-radius:3px;">{{severity}}</span></td></tr>
      <tr><td style="padding:8px;color:#888;">Detected</td><td style="padding:8px;">{{detected_at}}</td></tr>
      <tr><td style="padding:8px;color:#888;">IP Address</td><td style="padding:8px;font-family:monospace;">{{ip_address}}</td></tr>
      <tr><td style="padding:8px;color:#888;">Location</td><td style="padding:8px;">{{location}}</td></tr>
      <tr><td style="padding:8px;color:#888;">Device</td><td style="padding:8px;">{{device}}</td></tr>
    </table>
    <div style="background:#fff;border-left:4px solid #e74c3c;padding:15px;margin:20px 0;">
      <p style="margin:0;">{{details}}</p>
    </div>
    <div style="text-align:center;margin:25px 0;">
      <a href="{{secure_account_url}}" style="background:#e74c3c;color:#fff;padding:14px 40px;text-decoration:none;border-radius:5px;font-size:16px;">Secure My Account</a>
    </div>
    <p style="font-size:13px;color:#888;">Contact security: <a href="mailto:{{security_email}}">{{security_email}}</a></p>
    <p>Best regards,<br>The {{platform_name}} Security Team</p>
  </div>
</body></html>""",
        "variables": ["first_name", "alert_type", "severity", "severity_color", "detected_at", "ip_address", "location", "device", "details", "secure_account_url", "security_email", "platform_name"],
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
#  NOTIFICATION SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class NotificationService:
    """
    Unified notification service supporting Email and SMS with
    multi-provider cascading fallback and SQLite queue storage.
    """

    # ── Singleton ────────────────────────────────────────────────────────────
    _instance: Optional["NotificationService"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "NotificationService":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    # ── Init ─────────────────────────────────────────────────────────────────

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self._initialized = True

        self.email_configured = False
        self.sms_configured = False
        self._email_provider: Optional[str] = None
        self._sms_provider: Optional[str] = None

        # Templates
        self._templates: dict[str, dict[str, Any]] = dict(DEFAULT_TEMPLATES)

        # Queue DB
        self._db_path = self._resolve_db_path()
        self._init_queue_db()

        # Detect available providers
        self._detect_email_providers()
        self._detect_sms_providers()

        logger.info(
            "NotificationService initialized | email=%s (%s) | sms=%s (%s) | db=%s",
            self.email_configured, self._email_provider or "none",
            self.sms_configured, self._sms_provider or "none",
            self._db_path,
        )

    # ── DB Resolution ────────────────────────────────────────────────────────

    def _resolve_db_path(self) -> str:
        if ENV_QUEUE_DB_PATH:
            return ENV_QUEUE_DB_PATH
        # Store in project root / data dir
        candidates = [
            Path(__file__).resolve().parent.parent / "data" / "notification_queue.db",
            Path(__file__).resolve().parent.parent / "notification_queue.db",
            Path.cwd() / "data" / "notification_queue.db",
            Path.cwd() / "notification_queue.db",
        ]
        for p in candidates:
            try:
                p.parent.mkdir(parents=True, exist_ok=True)
                return str(p)
            except Exception:
                continue
        return str(Path.cwd() / "notification_queue.db")

    def _init_queue_db(self):
        with sqlite3.connect(self._db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notification_queue (
                    id          TEXT PRIMARY KEY,
                    type        TEXT NOT NULL,
                    recipient   TEXT NOT NULL,
                    subject     TEXT,
                    body        TEXT,
                    body_html   TEXT,
                    provider    TEXT,
                    status      TEXT DEFAULT 'pending',
                    attempts    INTEGER DEFAULT 0,
                    max_attempts INTEGER DEFAULT 5,
                    created_at  TEXT,
                    scheduled_at TEXT,
                    processed_at TEXT,
                    error       TEXT,
                    metadata    TEXT
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_queue_status ON notification_queue(status)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON notification_queue(scheduled_at)
            """)
            conn.commit()

    # ── Provider Detection ───────────────────────────────────────────────────

    def _detect_email_providers(self):
        """Detect available email providers in priority order."""
        if ENV_SENDGRID_API_KEY:
            self.email_configured = True
            self._email_provider = "sendgrid"
            return
        if ENV_MAILGUN_API_KEY and ENV_MAILGUN_DOMAIN:
            self.email_configured = True
            self._email_provider = "mailgun"
            return
        if ENV_SMTP_HOST and ENV_SMTP_USER and ENV_SMTP_PASS:
            self.email_configured = True
            self._email_provider = "smtp"
            return
        self.email_configured = False
        self._email_provider = None

    def _detect_sms_providers(self):
        """Detect available SMS providers in priority order."""
        if ENV_TWILIO_SID and ENV_TWILIO_TOKEN and ENV_TWILIO_FROM:
            self.sms_configured = True
            self._sms_provider = "twilio"
            return
        if ENV_AT_API_KEY and ENV_AT_USERNAME:
            self.sms_configured = True
            self._sms_provider = "africastalking"
            return
        self.sms_configured = False
        self._sms_provider = None

    # ═════════════════════════════════════════════════════════════════════════
    #  EMAIL
    # ═════════════════════════════════════════════════════════════════════════

    def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        html: bool = False,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> dict:
        """
        Send an email using the best available provider.

        Cascade: SendGrid > Mailgun > SMTP > Queue
        Returns: {success, method, message_id|queued, error?}
        """
        if not self._is_valid_email(to):
            return {"success": False, "method": "none", "error": f"Invalid email: {to}"}

        _from = from_email or ENV_FROM_EMAIL
        _name = from_name or ENV_FROM_NAME

        # Try providers in order
        if self._email_provider == "sendgrid":
            result = self._send_sendgrid(to, _from, _name, subject, body, html)
            if result["success"]:
                return result
            logger.warning("SendGrid failed, falling back: %s", result.get("error"))

        if self._email_provider == "mailgun":
            result = self._send_mailgun(to, _from, _name, subject, body, html)
            if result["success"]:
                return result
            logger.warning("Mailgun failed, falling back: %s", result.get("error"))

        if self._email_provider in ("smtp", "sendgrid", "mailgun"):
            result = self._send_smtp(to, _from, _name, subject, body, html)
            if result["success"]:
                return result
            logger.warning("SMTP failed, queuing: %s", result.get("error"))

        # Queue as fallback
        return self.queue_notification(
            "email", to,
            {"subject": subject, "body": body, "body_html": body if html else None,
             "from_email": _from, "from_name": _name}
        )

    def _send_sendgrid(
        self, to: str, from_email: str, from_name: str, subject: str, body: str, html: bool
    ) -> dict:
        try:
            import urllib.request
            import urllib.error

            payload = {
                "personalizations": [{"to": [{"email": to}]}],
                "from": {"email": from_email, "name": from_name},
                "subject": subject,
            }
            if html:
                payload["content"] = [{"type": "text/html", "value": body}]
            else:
                payload["content"] = [{"type": "text/plain", "value": body}]

            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                "https://api.sendgrid.com/v3/mail/send",
                data=data,
                headers={
                    "Authorization": f"Bearer {ENV_SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                msg_id = resp.headers.get("X-Message-Id", f"sg-{uuid.uuid4().hex[:16]}")
                return {"success": True, "method": "sendgrid", "message_id": msg_id}
        except Exception as e:
            return {"success": False, "method": "sendgrid", "error": str(e)}

    def _send_mailgun(
        self, to: str, from_email: str, from_name: str, subject: str, body: str, html: bool
    ) -> dict:
        try:
            import urllib.request
            import urllib.parse

            data = urllib.parse.urlencode({
                "from": f"{from_name} <{from_email}>",
                "to": to,
                "subject": subject,
                "text": "" if html else body,
                "html": body if html else "",
            }).encode("utf-8")

            req = urllib.request.Request(
                f"https://api.mailgun.net/v3/{ENV_MAILGUN_DOMAIN}/messages",
                data=data,
                headers={
                    "Authorization": f"Basic {self._b64_auth('api', ENV_MAILGUN_API_KEY)}"
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = json.loads(resp.read().decode("utf-8"))
                return {"success": True, "method": "mailgun", "message_id": resp_body.get("id", "")}
        except Exception as e:
            return {"success": False, "method": "mailgun", "error": str(e)}

    def _send_smtp(
        self, to: str, from_email: str, from_name: str, subject: str, body: str, html: bool
    ) -> dict:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = to

            msg.attach(MIMEText(body, "plain", "utf-8"))
            if html:
                msg.attach(MIMEText(body, "html", "utf-8"))

            with smtplib.SMTP(ENV_SMTP_HOST, ENV_SMTP_PORT, timeout=30) as server:
                server.starttls()
                server.login(ENV_SMTP_USER, ENV_SMTP_PASS)
                server.send_message(msg)

            return {"success": True, "method": "smtp", "message_id": f"smtp-{uuid.uuid4().hex[:16]}"}
        except Exception as e:
            return {"success": False, "method": "smtp", "error": str(e)}

    # ═════════════════════════════════════════════════════════════════════════
    #  SMS
    # ═════════════════════════════════════════════════════════════════════════

    def send_sms(self, to: str, message: str, from_number: Optional[str] = None) -> dict:
        """
        Send an SMS using the best available provider.

        Cascade: Twilio > Africa's Talking > Queue
        Returns: {success, provider, message_id|queued, error?}
        """
        if not self._is_valid_phone(to):
            return {"success": False, "provider": "none", "error": f"Invalid phone: {to}"}

        _from = from_number or ENV_TWILIO_FROM

        if self._sms_provider == "twilio":
            result = self._send_twilio(to, _from, message)
            if result["success"]:
                return result
            logger.warning("Twilio failed, falling back: %s", result.get("error"))

        if self._sms_provider in ("africastalking", "twilio"):
            result = self._send_africastalking(to, message)
            if result["success"]:
                return result
            logger.warning("Africa's Talking failed, queuing: %s", result.get("error"))

        return self.queue_notification("sms", to, {"message": message})

    def _send_twilio(self, to: str, from_number: str, message: str) -> dict:
        try:
            import urllib.request
            import urllib.parse

            data = urllib.parse.urlencode({
                "To": to,
                "From": from_number,
                "Body": message,
            }).encode("utf-8")

            req = urllib.request.Request(
                f"https://api.twilio.com/2010-04-01/Accounts/{ENV_TWILIO_SID}/Messages.json",
                data=data,
                headers={
                    "Authorization": f"Basic {self._b64_auth(ENV_TWILIO_SID, ENV_TWILIO_TOKEN)}"
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = json.loads(resp.read().decode("utf-8"))
                return {
                    "success": True,
                    "provider": "twilio",
                    "message_id": resp_body.get("sid", ""),
                }
        except Exception as e:
            return {"success": False, "provider": "twilio", "error": str(e)}

    def _send_africastalking(self, to: str, message: str) -> dict:
        try:
            import urllib.request
            import urllib.parse

            data = urllib.parse.urlencode({
                "username": ENV_AT_USERNAME,
                "to": to,
                "message": message,
                "from": ENV_FROM_NAME.replace(" ", "")[:11],
            }).encode("utf-8")

            req = urllib.request.Request(
                "https://api.africastalking.com/version1/messaging",
                data=data,
                headers={
                    "apiKey": ENV_AT_API_KEY,
                    "Accept": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = json.loads(resp.read().decode("utf-8"))
                msg_data = resp_body.get("SMSMessageData", {})
                recipients = msg_data.get("Recipients", [])
                msg_id = recipients[0].get("messageId", "") if recipients else f"at-{uuid.uuid4().hex[:16]}"
                return {"success": True, "provider": "africastalking", "message_id": msg_id}
        except Exception as e:
            return {"success": False, "provider": "africastalking", "error": str(e)}

    # ═════════════════════════════════════════════════════════════════════════
    #  QUEUE
    # ═════════════════════════════════════════════════════════════════════════

    def queue_notification(
        self, notification_type: str, recipient: str, content: dict
    ) -> dict:
        """
        Queue a notification for later delivery when no provider is available.
        Stored in SQLite with automatic retry logic.
        """
        notif_id = f"q-{uuid.uuid4().hex[:20]}"
        now = datetime.utcnow().isoformat()
        scheduled = (datetime.utcnow() + timedelta(minutes=5)).isoformat()

        with sqlite3.connect(self._db_path) as conn:
            conn.execute(
                """
                INSERT INTO notification_queue
                (id, type, recipient, subject, body, body_html, status, attempts,
                 max_attempts, created_at, scheduled_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    notif_id,
                    notification_type,
                    recipient,
                    content.get("subject", ""),
                    content.get("body") or content.get("message", ""),
                    content.get("body_html", ""),
                    "pending",
                    0,
                    5,
                    now,
                    scheduled,
                    json.dumps({
                        "from_email": content.get("from_email"),
                        "from_name": content.get("from_name"),
                    }),
                ),
            )
            conn.commit()

        logger.info("Queued %s to %s (id=%s)", notification_type, recipient, notif_id)
        return {
            "success": True,
            "method": "queued",
            "queued": True,
            "message_id": notif_id,
            "scheduled_at": scheduled,
        }

    def process_queue(self, batch_size: int = 50) -> dict:
        """
        Process queued notifications. Retry pending items up to max_attempts.
        Returns summary of processed items.
        """
        now = datetime.utcnow().isoformat()
        processed = {"sent": 0, "failed": 0, "skipped": 0, "details": []}

        with sqlite3.connect(self._db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """
                SELECT * FROM notification_queue
                WHERE status = 'pending' AND scheduled_at <= ? AND attempts < max_attempts
                ORDER BY created_at ASC
                LIMIT ?
                """,
                (now, batch_size),
            ).fetchall()

            for row in rows:
                item = dict(row)
                result = self._process_queue_item(item)

                new_status = "sent" if result.get("success") else "pending"
                new_attempts = item["attempts"] + 1
                if new_status != "sent" and new_attempts >= item["max_attempts"]:
                    new_status = "failed"

                conn.execute(
                    """
                    UPDATE notification_queue
                    SET status = ?, attempts = ?, processed_at = ?, error = ?
                    WHERE id = ?
                    """,
                    (
                        new_status,
                        new_attempts,
                        datetime.utcnow().isoformat() if new_status == "sent" else None,
                        result.get("error", ""),
                        item["id"],
                    ),
                )

                if new_status == "sent":
                    processed["sent"] += 1
                elif new_status == "failed":
                    processed["failed"] += 1
                else:
                    processed["skipped"] += 1

                processed["details"].append({
                    "id": item["id"],
                    "type": item["type"],
                    "recipient": item["recipient"],
                    "status": new_status,
                    "attempts": new_attempts,
                    **{k: v for k, v in result.items() if k in ("method", "message_id", "error")},
                })

            conn.commit()

        logger.info("Queue processed: %s sent, %s failed, %s skipped", processed["sent"], processed["failed"], processed["skipped"])
        return processed

    def _process_queue_item(self, item: dict) -> dict:
        """Attempt to send a queued notification with current providers."""
        if item["type"] == "email":
            return self.send_email(
                to=item["recipient"],
                subject=item["subject"] or "",
                body=item["body_html"] or item["body"] or "",
                html=bool(item["body_html"]),
            )
        elif item["type"] == "sms":
            return self.send_sms(
                to=item["recipient"],
                message=item["body"] or "",
            )
        return {"success": False, "error": f"Unknown type: {item['type']}"}

    def get_queue_status(self) -> dict:
        """Get current queue statistics."""
        with sqlite3.connect(self._db_path) as conn:
            conn.row_factory = sqlite3.Row
            stats = conn.execute("""
                SELECT
                    status,
                    type,
                    COUNT(*) as count,
                    MIN(created_at) as oldest,
                    MAX(created_at) as newest
                FROM notification_queue
                GROUP BY status, type
            """).fetchall()

            total = conn.execute("SELECT COUNT(*) FROM notification_queue").fetchone()[0]
            pending = conn.execute(
                "SELECT COUNT(*) FROM notification_queue WHERE status = 'pending'"
            ).fetchone()[0]

        return {
            "total": total,
            "pending": pending,
            "breakdown": [dict(r) for r in stats],
            "db_path": self._db_path,
        }

    # ═════════════════════════════════════════════════════════════════════════
    #  TEMPLATES
    # ═════════════════════════════════════════════════════════════════════════

    def get_templates(self, category: str | None = None) -> dict:
        """
        Return available templates, optionally filtered by category.
        Categories: onboarding, security, support, general
        """
        templates = {
            tid: {
                "id": t["id"],
                "name": t["name"],
                "category": t["category"],
                "subject": t["subject"],
                "variables": t["variables"],
            }
            for tid, t in self._templates.items()
            if category is None or t["category"] == category
        }
        return {
            "count": len(templates),
            "category": category or "all",
            "templates": templates,
        }

    def render_template(self, template_id: str, variables: dict) -> dict:
        """
        Render a template by filling in variables.
        Returns {subject, body_text, body_html, missing_variables}.
        """
        tmpl = self._templates.get(template_id)
        if not tmpl:
            return {
                "success": False,
                "error": f"Template '{template_id}' not found",
                "available": list(self._templates.keys()),
            }

        missing = [v for v in tmpl["variables"] if v not in variables]
        subject = self._render_string(tmpl["subject"], variables)
        body_text = self._render_string(tmpl.get("body_text", ""), variables)
        body_html = self._render_string(tmpl.get("body_html", ""), variables)

        return {
            "success": True,
            "template_id": template_id,
            "template_name": tmpl["name"],
            "subject": subject,
            "body_text": body_text,
            "body_html": body_html,
            "missing_variables": missing,
            "has_html": bool(body_html),
        }

    def send_templated_email(
        self, to: str, template_id: str, variables: dict
    ) -> dict:
        """
        Convenience: render a template and immediately send as email.
        """
        rendered = self.render_template(template_id, variables)
        if not rendered["success"]:
            return rendered

        return self.send_email(
            to=to,
            subject=rendered["subject"],
            body=rendered["body_html"] or rendered["body_text"],
            html=bool(rendered["body_html"]),
        )

    def add_custom_template(self, template: dict) -> dict:
        """Add or override a custom template."""
        tid = template.get("id")
        if not tid:
            return {"success": False, "error": "Template must have an 'id'"}
        self._templates[tid] = template
        return {"success": True, "template_id": tid}

    # ═════════════════════════════════════════════════════════════════════════
    #  UTILITIES
    # ═════════════════════════════════════════════════════════════════════════

    @staticmethod
    def _render_string(template: str, variables: dict) -> str:
        """Simple {{var}} substitution."""
        def replacer(match):
            key = match.group(1).strip()
            return str(variables.get(key, match.group(0)))
        return re.sub(r"\{\{(\s*\w+\s*)\}\}", replacer, template)

    @staticmethod
    def _is_valid_email(email: str) -> bool:
        return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))

    @staticmethod
    def _is_valid_phone(phone: str) -> bool:
        return bool(re.match(r"^\+?[\d\s\-\(\)]{7,20}$", phone))

    @staticmethod
    def _b64_auth(username: str, password: str) -> str:
        import base64
        return base64.b64encode(f"{username}:{password}".encode()).decode()

    # ── Status ───────────────────────────────────────────────────────────────

    def get_status(self) -> dict:
        """Return full service status."""
        return {
            "email": {
                "configured": self.email_configured,
                "provider": self._email_provider,
            },
            "sms": {
                "configured": self.sms_configured,
                "provider": self._sms_provider,
            },
            "templates": {
                "count": len(self._templates),
                "ids": list(self._templates.keys()),
            },
            "queue": self.get_queue_status(),
        }

    # ── Health Check ─────────────────────────────────────────────────────────

    def health_check(self) -> dict:
        """Quick health check for monitoring."""
        return {
            "healthy": True,
            "email_ready": self.email_configured,
            "sms_ready": self.sms_configured,
            "queue_db": self._db_path,
            "timestamp": datetime.utcnow().isoformat(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  CONVENIENCE FUNCTIONS (module-level)
# ═══════════════════════════════════════════════════════════════════════════════

_service: Optional[NotificationService] = None


def get_service() -> NotificationService:
    """Get or create the singleton NotificationService."""
    global _service
    if _service is None:
        _service = NotificationService()
    return _service


def send_email(to: str, subject: str, body: str, html: bool = False) -> dict:
    return get_service().send_email(to, subject, body, html)


def send_sms(to: str, message: str) -> dict:
    return get_service().send_sms(to, message)


def queue(notification_type: str, recipient: str, content: dict) -> dict:
    return get_service().queue_notification(notification_type, recipient, content)


def process_queue() -> dict:
    return get_service().process_queue()


def get_templates(category: str | None = None) -> dict:
    return get_service().get_templates(category)


def render_template(template_id: str, variables: dict) -> dict:
    return get_service().render_template(template_id, variables)


def send_templated_email(to: str, template_id: str, variables: dict) -> dict:
    return get_service().send_templated_email(to, template_id, variables)


# ═══════════════════════════════════════════════════════════════════════════════
#  CLI (for testing / queue processing)
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Omega AI Notification Service")
    parser.add_argument("action", choices=["status", "process-queue", "send-test-email", "send-test-sms", "templates"])
    parser.add_argument("--to", default="")
    parser.add_argument("--subject", default="Test")
    parser.add_argument("--body", default="Hello from Omega AI!")
    parser.add_argument("--template", default="welcome")
    args = parser.parse_args()

    svc = get_service()

    if args.action == "status":
        print(json.dumps(svc.get_status(), indent=2))
    elif args.action == "process-queue":
        print(json.dumps(svc.process_queue(), indent=2))
    elif args.action == "send-test-email":
        print(json.dumps(svc.send_email(args.to, args.subject, args.body), indent=2))
    elif args.action == "send-test-sms":
        print(json.dumps(svc.send_sms(args.to, args.body), indent=2))
    elif args.action == "templates":
        print(json.dumps(svc.get_templates(), indent=2))
