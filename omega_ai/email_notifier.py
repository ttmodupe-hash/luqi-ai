"""Omega AI v3.7.0 — Email Notification System
Send email alerts from scheduler tasks and system events.
Uses SMTP with TLS. Supports HTML + plain text.
"""
from __future__ import annotations

import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any


class EmailNotifier:
    """Send email notifications with template support."""

    def __init__(self, host: str = "", port: int = 587, user: str = "", password: str = "") -> None:
        import os
        self._host = host or os.environ.get("SMTP_HOST", "")
        self._port = port or int(os.environ.get("SMTP_PORT", "587"))
        self._user = user or os.environ.get("SMTP_USER", "")
        self._password = password or os.environ.get("SMTP_PASSWORD", "")

    def is_configured(self) -> bool:
        return bool(self._host and self._user and self._password)

    def send(self, to: str, subject: str, body: str, html: str | None = None) -> dict[str, Any]:
        """Send an email."""
        if not self.is_configured():
            return {"success": False, "error": "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD env vars."}
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self._user
            msg["To"] = to
            msg.attach(MIMEText(body, "plain"))
            if html:
                msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP(self._host, self._port, timeout=30) as server:
                server.starttls()
                server.login(self._user, self._password)
                server.sendmail(self._user, [to], msg.as_string())
            return {"success": True, "message": f"Email sent to {to}", "timestamp": time.time()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_alert(self, to: str, alert_type: str, details: str) -> dict[str, Any]:
        """Send a pre-formatted alert email."""
        subject = f"[Luqi-AI Alert] {alert_type}"
        body = f"Alert Type: {alert_type}\nDetails: {details}\nTime: {time.strftime('%Y-%m-%d %H:%M:%S')}\n"
        html = f"""<html><body style="font-family:sans-serif">
        <h2 style="color:#00e5ff">Luqi-AI Alert</h2>
        <p><strong>Type:</strong> {alert_type}</p>
        <p><strong>Details:</strong> {details}</p>
        <p><strong>Time:</strong> {time.strftime('%Y-%m-%d %H:%M:%S')}</p>
        <hr><p style="color:#666;font-size:12px">Luqi-AI v3.7.0 Automated Alert</p>
        </body></html>"""
        return self.send(to, subject, body, html)

    def status(self) -> dict[str, Any]:
        return {
            "configured": self.is_configured(),
            "host": self._host or "not set",
            "user": self._user[:5] + "..." if self._user else "not set",
        }
