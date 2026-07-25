"""Omega AI v3 — Smart Reminder Manager
Deadline and recurring reminder system with JSON persistence.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any


class ReminderManager:
    """Manage reminders with support for recurring schedules and natural dates.

    Storage is at ``~/.omega_ai/reminders.json`` as a JSON list.
    Each reminder has: id, text, created, due_date, recurring,
    snoozed_until, and completed fields.
    """

    # ── ANSI Colors (embedded to avoid extra import) ─────────────────────
    _R = "\033[91m"
    _G = "\033[92m"
    _Y = "\033[93m"
    _B = "\033[94m"
    _C = "\033[96m"
    _M = "\033[95m"
    _W = "\033[97m"
    _D = "\033[2m"
    _RST = "\033[0m"
    _BD = "\033[1m"

    def __init__(self) -> None:
        """Initialize storage and ensure data file exists."""
        self._storage_path = Path.home() / ".omega_ai" / "reminders.json"
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        if not self._storage_path.exists():
            self._storage_path.write_text("[]", encoding="utf-8")

    # ── Persistence helpers ──────────────────────────────────────────────

    def _load(self) -> list[dict[str, Any]]:
        """Load reminders from JSON file."""
        try:
            text = self._storage_path.read_text(encoding="utf-8")
            if not text.strip():
                return []
            return json.loads(text)
        except (json.JSONDecodeError, OSError):
            return []

    def _save(self, data: list[dict[str, Any]]) -> None:
        """Atomically save reminders to JSON file."""
        tmp = self._storage_path.with_suffix(".tmp")
        tmp.write_text(
            json.dumps(data, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )
        tmp.replace(self._storage_path)

    # ── Date parsing ─────────────────────────────────────────────────────

    def _parse_date(self, date_str: str) -> str:
        """Convert a natural date string into ISO format (YYYY-MM-DD).

        Supports:
        - ISO format: ``2026-11-30``
        - Relative: ``today``, ``tomorrow``, ``next week``
        - ``next <dayname>`` (e.g. ``next monday``)
        - ``in N days/weeks/months``
        """
        today = date.today()
        s = date_str.lower().strip()

        if not s:
            return today.isoformat()

        # Already ISO
        try:
            datetime.strptime(s, "%Y-%m-%d").date()
            return s
        except ValueError:
            pass

        # Relative keywords
        if s in ("today",):
            return today.isoformat()
        if s in ("tomorrow", "tmrw"):
            return (today + timedelta(days=1)).isoformat()
        if s in ("next week", "1 week", "1week"):
            return (today + timedelta(weeks=1)).isoformat()
        if s in ("next month", "1 month", "1month"):
            return (today.replace(day=1) + timedelta(days=32)).replace(day=today.day).isoformat()
        if s in ("next year", "1 year", "1year"):
            try:
                return today.replace(year=today.year + 1).isoformat()
            except ValueError:
                return today.replace(year=today.year + 1, day=28).isoformat()

        # "in N days/weeks/months"
        in_match = re.match(r"in\s+(\d+)\s+(day|days|week|weeks|month|months)", s)
        if in_match:
            num = int(in_match.group(1))
            unit = in_match.group(2)
            if unit in ("day", "days"):
                return (today + timedelta(days=num)).isoformat()
            if unit in ("week", "weeks"):
                return (today + timedelta(weeks=num)).isoformat()
            if unit in ("month", "months"):
                target_month = today.month + num
                target_year = today.year + (target_month - 1) // 12
                target_month = ((target_month - 1) % 12) + 1
                max_day = (date(target_year, target_month % 12 + 1, 1) - timedelta(days=1)).day
                target_day = min(today.day, max_day)
                return date(target_year, target_month, target_day).isoformat()

        # "next <weekday>"
        weekdays = {
            "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
            "friday": 4, "saturday": 5, "sunday": 6,
        }
        if s.startswith("next "):
            day_name = s[5:].strip()
            if day_name in weekdays:
                target_dow = weekdays[day_name]
                days_ahead = (target_dow - today.weekday()) % 7
                if days_ahead == 0:
                    days_ahead = 7
                return (today + timedelta(days=days_ahead)).isoformat()

        # Fallback: try parsing with datetime
        try:
            parsed = datetime.fromisoformat(s)
            return parsed.date().isoformat()
        except ValueError:
            pass

        # If all parsing fails, return today
        return today.isoformat()

    # ── Public API ───────────────────────────────────────────────────────

    def add(self, text: str, date_str: str = "", recurring: str = "") -> dict[str, Any]:
        """Add a new reminder.

        Args:
            text: The reminder message.
            date_str: Due date. Supports "2026-11-30", "tomorrow", "next week",
                      "in 3 days", etc.  Empty defaults to today.
            recurring: Recurrence pattern — "daily", "weekly", "monthly",
                       "yearly", or "every N days/weeks/months".

        Returns:
            The newly created reminder dict.
        """
        try:
            due = self._parse_date(date_str)
            recurring = recurring.lower().strip()

            reminder: dict[str, Any] = {
                "id": str(uuid.uuid4())[:8],
                "text": text.strip(),
                "created": datetime.now(timezone.utc).isoformat(),
                "due_date": due,
                "recurring": recurring,
                "snoozed_until": "",
                "completed": False,
            }

            data = self._load()
            data.append(reminder)
            self._save(data)

            return reminder

        except Exception as e:
            return {"error": f"Failed to add reminder: {e}"}

    def list(self, show_all: bool = False) -> list[dict[str, Any]]:
        """List reminders.

        Args:
            show_all: If False, only pending (non-completed, future or due) reminders.
                      If True, return all reminders including completed past ones.

        Returns:
            List of reminder dicts.
        """
        try:
            data = self._load()
            if show_all:
                return data

            today = date.today().isoformat()
            pending: list[dict[str, Any]] = []
            for r in data:
                if r.get("completed"):
                    continue
                snoozed = r.get("snoozed_until", "")
                if snoozed and snoozed > today:
                    continue
                pending.append(r)
            return pending

        except Exception:
            return []

    def check_due(self) -> list[dict[str, Any]]:
        """Return reminders that are due today (intended for startup check).

        Returns:
            List of reminder dicts with due_date == today and not completed.
        """
        try:
            today = date.today().isoformat()
            data = self._load()
            due: list[dict[str, Any]] = []
            for r in data:
                if r.get("completed"):
                    continue
                snoozed = r.get("snoozed_until", "")
                if snoozed and snoozed > today:
                    continue
                if r.get("due_date", "") <= today:
                    due.append(r)
            return due

        except Exception:
            return []

    def delete(self, reminder_id: str) -> bool:
        """Delete a reminder by its short ID.

        Args:
            reminder_id: The 8-character reminder ID.

        Returns:
            True if deleted, False if not found.
        """
        try:
            data = self._load()
            original_len = len(data)
            data = [r for r in data if r.get("id") != reminder_id]
            if len(data) == original_len:
                return False
            self._save(data)
            return True

        except Exception:
            return False

    def snooze(self, reminder_id: str, days: int = 1) -> dict[str, Any]:
        """Snooze a reminder by pushing its due date forward.

        Args:
            reminder_id: The 8-character reminder ID.
            days: Number of days to snooze (default 1).

        Returns:
            Updated reminder dict, or error dict if not found.
        """
        try:
            data = self._load()
            for r in data:
                if r.get("id") == reminder_id:
                    new_due = date.today() + timedelta(days=days)
                    r["snoozed_until"] = new_due.isoformat()
                    self._save(data)
                    return r
            return {"error": f"Reminder '{reminder_id}' not found."}

        except Exception as e:
            return {"error": f"Snooze failed: {e}"}

    def complete(self, reminder_id: str) -> dict[str, Any]:
        """Mark a reminder as completed.  If recurring, schedule next occurrence.

        Args:
            reminder_id: The 8-character reminder ID.

        Returns:
            Updated reminder dict, or error dict if not found.
        """
        try:
            data = self._load()
            for r in data:
                if r.get("id") == reminder_id:
                    recurring = r.get("recurring", "")
                    if recurring:
                        # Schedule next occurrence
                        current_due = r.get("due_date", date.today().isoformat())
                        try:
                            current = date.fromisoformat(current_due)
                        except ValueError:
                            current = date.today()

                        next_due = self._next_recurring_date(current, recurring)
                        # Create new reminder for next occurrence
                        new_reminder: dict[str, Any] = {
                            "id": str(uuid.uuid4())[:8],
                            "text": r["text"],
                            "created": datetime.now(timezone.utc).isoformat(),
                            "due_date": next_due.isoformat(),
                            "recurring": recurring,
                            "snoozed_until": "",
                            "completed": False,
                        }
                        data.append(new_reminder)

                    r["completed"] = True
                    self._save(data)
                    return r
            return {"error": f"Reminder '{reminder_id}' not found."}

        except Exception as e:
            return {"error": f"Complete failed: {e}"}

    def _next_recurring_date(self, current: date, pattern: str) -> date:
        """Calculate the next due date from a recurrence pattern."""
        pattern = pattern.lower().strip()

        if pattern == "daily":
            return current + timedelta(days=1)
        if pattern == "weekly":
            return current + timedelta(weeks=1)
        if pattern == "monthly":
            target_month = current.month + 1
            target_year = current.year + (target_month - 1) // 12
            target_month = ((target_month - 1) % 12) + 1
            max_day = (date(target_year, target_month % 12 + 1, 1) - timedelta(days=1)).day
            target_day = min(current.day, max_day)
            return date(target_year, target_month, target_day)
        if pattern == "yearly":
            try:
                return current.replace(year=current.year + 1)
            except ValueError:
                return current.replace(year=current.year + 1, day=28)

        # "every N days/weeks/months"
        m = re.match(r"every\s+(\d+)\s*(day|days|week|weeks|month|months)", pattern)
        if m:
            num = int(m.group(1))
            unit = m.group(2)
            if unit in ("day", "days"):
                return current + timedelta(days=num)
            if unit in ("week", "weeks"):
                return current + timedelta(weeks=num)
            if unit in ("month", "months"):
                target_month = current.month + num
                target_year = current.year + (target_month - 1) // 12
                target_month = ((target_month - 1) % 12) + 1
                max_day = (date(target_year, target_month % 12 + 1, 1) - timedelta(days=1)).day
                target_day = min(current.day, max_day)
                return date(target_year, target_month, target_day)

        return current + timedelta(days=1)

    # ── Formatting ───────────────────────────────────────────────────────

    def format_list(self, reminders: list[dict[str, Any]]) -> str:
        """Pretty-print a list of reminders with ANSI colors.

        Args:
            reminders: List of reminder dicts.

        Returns:
            Formatted multi-line string.
        """
        if not reminders:
            return f"  {self._D}No reminders.{self._RST}"

        today = date.today().isoformat()
        lines: list[str] = [f"  {self._BD}{self._C}Reminders{self._RST}", ""]

        for r in reminders:
            rid = r.get("id", "?")
            text = r.get("text", "")
            due = r.get("due_date", "")
            recurring = r.get("recurring", "")
            completed = r.get("completed", False)
            snoozed = r.get("snoozed_until", "")

            # Status indicator
            if completed:
                icon = f"{self._D}✓{self._RST}"
                status_color = self._D
            elif snoozed and snoozed > today:
                icon = f"{self._Y}💤{self._RST}"
                status_color = self._Y
            elif due < today:
                icon = f"{self._R}⚠{self._RST}"
                status_color = self._R
            elif due == today:
                icon = f"{self._Y}●{self._RST}"
                status_color = self._Y
            else:
                icon = f"{self._G}○{self._RST}"
                status_color = self._G

            recurring_tag = f" {self._C}[{recurring}]{self._RST}" if recurring else ""

            # Date description
            date_desc = self._describe_date(due, today)

            lines.append(
                f"  {icon} [{self._BD}{rid}{self._RST}] {status_color}{text[:50]}{self._RST}"
                f"{recurring_tag}"
            )
            lines.append(f"     {self._D}Due: {due} ({date_desc}){self._RST}")

        return "\n".join(lines)

    def _describe_date(self, due: str, today: str) -> str:
        """Return a human-friendly description of due date relative to today."""
        try:
            due_d = date.fromisoformat(due)
            today_d = date.fromisoformat(today)
            delta = (due_d - today_d).days
            if delta < 0:
                return f"{self._R}{abs(delta)} days overdue{self._RST}"
            if delta == 0:
                return f"{self._Y}Today{self._RST}"
            if delta == 1:
                return "Tomorrow"
            if delta <= 7:
                return f"In {delta} days"
            if delta <= 30:
                weeks = delta // 7
                return f"In ~{weeks} week{'s' if weeks > 1 else ''}"
            return f"In ~{delta // 30} month{'s' if delta // 30 > 1 else ''}"
        except ValueError:
            return ""


# ── Self-test ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    rm = ReminderManager()

    # Add some reminders
    r1 = rm.add("Pay electricity bill", "tomorrow")
    r2 = rm.add("Review mining ROI", "next week", "weekly")
    r3 = rm.add("File tax return", "2026-07-31")
    r4 = rm.add("Check stokvel contributions", "in 3 days", "monthly")

    print(rm.format_list(rm.list()))
    print()

    # Show due today (none yet)
    due = rm.check_due()
    print(f"Due today: {len(due)}")

    # Snooze
    if "id" in r1:
        snoozed = rm.snooze(r1["id"], 2)
        print(f"Snoozed r1: {snoozed.get('snoozed_until', 'N/A')}")

    # Complete r2 (weekly — should create next)
    if "id" in r2:
        completed = rm.complete(r2["id"])
        print(f"Completed r2: {completed.get('completed', False)}")

    print()
    print(rm.format_list(rm.list(show_all=True)))

    # Cleanup test data
    for r in [r1, r2, r3, r4]:
        if "id" in r:
            rm.delete(r["id"])
