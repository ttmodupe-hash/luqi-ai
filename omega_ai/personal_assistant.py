#!/usr/bin/env python3
"""
Personal Assistant Module

A comprehensive personal productivity assistant for managing tasks, reminders,
notes, calendar events, and daily briefings. All data persists to JSON files.

Author: Omega AI Systems
Version: 1.0
"""

import json
import os
import re
import uuid
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional


class PersonalAssistant:
    """
    Personal productivity assistant with task management, reminders, notes,
    calendar events, and daily briefings. Data persists to JSON files.
    """

    DATA_DIR = Path("data/assistant")
    TASKS_FILE = DATA_DIR / "tasks.json"
    REMINDERS_FILE = DATA_DIR / "reminders.json"
    NOTES_FILE = DATA_DIR / "notes.json"
    EVENTS_FILE = DATA_DIR / "events.json"

    VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
    VALID_STATUSES = {"pending", "in_progress", "completed", "cancelled"}
    VALID_CATEGORIES = {"general", "work", "personal", "ideas", "meeting"}
    VALID_RECURRING = {"daily", "weekly", "monthly"}

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

    def _today(self) -> str:
        return datetime.now().strftime("%Y-%m-%d")

    def _generate_id(self, prefix: str = "") -> str:
        return f"{prefix}{uuid.uuid4().hex[:12]}"

    # ─────────────────────────────────────────── Seeding ──────────────────────────────────

    def _seed_data_if_empty(self) -> None:
        if not self.TASKS_FILE.exists():
            self._seed_tasks()
        if not self.REMINDERS_FILE.exists():
            self._seed_reminders()
        if not self.NOTES_FILE.exists():
            self._seed_notes()
        if not self.EVENTS_FILE.exists():
            self._seed_events()

    def _seed_tasks(self) -> None:
        now = self._now()
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        last_week = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")

        tasks = {
            "TASK-001": {
                "task_id": "TASK-001",
                "title": "Complete tax calculation report",
                "description": "Finish the PAYE calculation for Q3 and export to PDF",
                "priority": "high",
                "status": "in_progress",
                "due_date": yesterday[:10],
                "tags": ["tax", "finance", "urgent"],
                "recurring": None,
                "created_at": last_week,
                "completed_at": None
            },
            "TASK-002": {
                "task_id": "TASK-002",
                "title": "Review Python course module 3",
                "description": "Go through the lesson on functions and complete the quiz",
                "priority": "medium",
                "status": "pending",
                "due_date": tomorrow,
                "tags": ["learning", "python"],
                "recurring": None,
                "created_at": now,
                "completed_at": None
            },
            "TASK-003": {
                "task_id": "TASK-003",
                "title": "Daily standup notes",
                "description": "Prepare updates for the team standup meeting",
                "priority": "low",
                "status": "pending",
                "due_date": self._today(),
                "tags": ["work", "daily"],
                "recurring": "daily",
                "created_at": now,
                "completed_at": None
            }
        }
        self._save_json(self.TASKS_FILE, tasks)

    def _seed_reminders(self) -> None:
        now = datetime.now()
        reminder_time = (now + timedelta(hours=2)).isoformat()
        evening_time = (now.replace(hour=18, minute=0) + timedelta(days=1)).isoformat()

        reminders = {
            "REM-001": {
                "reminder_id": "REM-001",
                "title": "Submit VAT201 return",
                "description": "SARS VAT201 for August is due today",
                "remind_at": reminder_time,
                "repeat": None,
                "status": "active",
                "created_at": self._now()
            },
            "REM-002": {
                "reminder_id": "REM-002",
                "title": "Team meeting",
                "description": "Weekly sync with the development team",
                "remind_at": evening_time,
                "repeat": "weekly",
                "status": "active",
                "created_at": self._now()
            }
        }
        self._save_json(self.REMINDERS_FILE, reminders)

    def _seed_notes(self) -> None:
        notes = {
            "NOTE-001": {
                "note_id": "NOTE-001",
                "title": "Project Ideas",
                "content": "1. Add voice support for Zulu language\n2. Create mobile app for the platform\n3. Integrate with SARS eFiling API",
                "category": "ideas",
                "tags": ["features", "roadmap"],
                "word_count": 19,
                "created_at": self._now(),
                "updated_at": self._now()
            },
            "NOTE-002": {
                "note_id": "NOTE-002",
                "title": "Meeting Notes - Finance Review",
                "content": "Discussed Q3 budget allocation. Approved R500k for infrastructure upgrade. Action items: get 3 vendor quotes by Friday.",
                "category": "meeting",
                "tags": ["finance", "budget", "action-items"],
                "word_count": 22,
                "created_at": self._now(),
                "updated_at": self._now()
            }
        }
        self._save_json(self.NOTES_FILE, notes)

    def _seed_events(self) -> None:
        today = datetime.now()
        tomorrow = today + timedelta(days=1)

        events = {
            "EVT-001": {
                "event_id": "EVT-001",
                "title": "SARS Submission Deadline",
                "start_time": today.replace(hour=17, minute=0).isoformat(),
                "end_time": today.replace(hour=17, minute=30).isoformat(),
                "description": "Final deadline for VAT201 submission",
                "location": "Online - SARS eFiling",
                "attendees": [],
                "reminder_minutes_before": 60,
                "created_at": self._now()
            },
            "EVT-002": {
                "event_id": "EVT-002",
                "title": "Team Standup",
                "start_time": tomorrow.replace(hour=9, minute=0).isoformat(),
                "end_time": tomorrow.replace(hour=9, minute=30).isoformat(),
                "description": "Daily team synchronization meeting",
                "location": "Zoom",
                "attendees": ["team@luqi.ai"],
                "reminder_minutes_before": 15,
                "created_at": self._now()
            }
        }
        self._save_json(self.EVENTS_FILE, events)

    # ─────────────────────────────────────────── Task Manager ──────────────────────────────────

    def create_task(self, title: str, description: str = "", priority: str = "medium",
                    due_date: str = None, tags: list = None, recurring: str = None) -> dict:
        with self._lock:
            if priority not in self.VALID_PRIORITIES:
                return {"success": False, "error": f"Invalid priority. Valid: {self.VALID_PRIORITIES}"}
            if recurring and recurring not in self.VALID_RECURRING:
                return {"success": False, "error": f"Invalid recurring. Valid: {self.VALID_RECURRING}"}

            task_id = self._generate_id("TASK-")
            now = self._now()
            task = {
                "task_id": task_id,
                "title": title,
                "description": description,
                "priority": priority,
                "status": "pending",
                "due_date": due_date,
                "tags": tags or [],
                "recurring": recurring,
                "created_at": now,
                "completed_at": None
            }
            tasks = self._load_json(self.TASKS_FILE, {})
            tasks[task_id] = task
            self._save_json(self.TASKS_FILE, tasks)
            return {"success": True, "task_id": task_id, "title": title,
                    "status": "pending", "created_at": now}

    def get_task(self, task_id: str) -> dict:
        tasks = self._load_json(self.TASKS_FILE, {})
        task = tasks.get(task_id)
        if not task:
            return {"success": False, "error": f"Task {task_id} not found"}
        return {"success": True, "task": task}

    def list_tasks(self, status: str = None, priority: str = None, tag: str = None,
                   due_before: str = None) -> dict:
        tasks = self._load_json(self.TASKS_FILE, {})
        result = list(tasks.values())

        if status:
            result = [t for t in result if t["status"] == status]
        if priority:
            result = [t for t in result if t["priority"] == priority]
        if tag:
            result = [t for t in result if tag in t.get("tags", [])]
        if due_before:
            result = [t for t in result if t.get("due_date") and t["due_date"] <= due_before]

        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        result.sort(key=lambda x: (priority_order.get(x["priority"], 2), x.get("due_date", "") or "9999"))
        return {"success": True, "count": len(result), "tasks": result}

    def update_task(self, task_id: str, **updates) -> dict:
        with self._lock:
            tasks = self._load_json(self.TASKS_FILE, {})
            task = tasks.get(task_id)
            if not task:
                return {"success": False, "error": f"Task {task_id} not found"}

            allowed = {"title", "description", "priority", "status", "due_date", "tags", "recurring"}
            for key, value in updates.items():
                if key in allowed:
                    task[key] = value

            self._save_json(self.TASKS_FILE, tasks)
            return {"success": True, "task_id": task_id, "updated_fields": list(updates.keys())}

    def complete_task(self, task_id: str) -> dict:
        return self.update_task(task_id, status="completed", completed_at=self._now())

    def delete_task(self, task_id: str) -> dict:
        with self._lock:
            tasks = self._load_json(self.TASKS_FILE, {})
            if task_id not in tasks:
                return {"success": False, "error": f"Task {task_id} not found"}
            del tasks[task_id]
            self._save_json(self.TASKS_FILE, tasks)
            return {"success": True, "task_id": task_id, "deleted": True}

    def get_overdue_tasks(self) -> dict:
        today = self._today()
        tasks = self.list_tasks(status="pending")
        overdue = [t for t in tasks["tasks"] if t.get("due_date") and t["due_date"] < today]
        return {"success": True, "overdue_count": len(overdue), "tasks": overdue}

    def get_tasks_for_today(self) -> dict:
        today = self._today()
        tasks = self._load_json(self.TASKS_FILE, {})
        today_tasks = [t for t in tasks.values() if t.get("due_date") == today and t["status"] != "completed"]
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        today_tasks.sort(key=lambda x: priority_order.get(x["priority"], 2))
        return {"success": True, "date": today, "count": len(today_tasks), "tasks": today_tasks}

    # ─────────────────────────────────────────── Reminders ──────────────────────────────────

    def set_reminder(self, title: str, remind_at: str, description: str = "",
                     repeat: str = None) -> dict:
        with self._lock:
            if repeat and repeat not in self.VALID_RECURRING:
                return {"success": False, "error": f"Invalid repeat. Valid: {self.VALID_RECURRING}"}

            reminder_id = self._generate_id("REM-")
            reminder = {
                "reminder_id": reminder_id,
                "title": title,
                "description": description,
                "remind_at": remind_at,
                "repeat": repeat,
                "status": "active",
                "created_at": self._now()
            }
            reminders = self._load_json(self.REMINDERS_FILE, {})
            reminders[reminder_id] = reminder
            self._save_json(self.REMINDERS_FILE, reminders)
            return {"success": True, "reminder_id": reminder_id, "title": title,
                    "remind_at": remind_at, "status": "active"}

    def get_reminders(self, upcoming_only: bool = True) -> dict:
        reminders = self._load_json(self.REMINDERS_FILE, {})
        result = [r for r in reminders.values() if r["status"] == "active"]
        if upcoming_only:
            now = self._now()
            result = [r for r in result if r["remind_at"] >= now]
        result.sort(key=lambda x: x["remind_at"])
        return {"success": True, "count": len(result), "reminders": result}

    def dismiss_reminder(self, reminder_id: str) -> dict:
        with self._lock:
            reminders = self._load_json(self.REMINDERS_FILE, {})
            reminder = reminders.get(reminder_id)
            if not reminder:
                return {"success": False, "error": f"Reminder {reminder_id} not found"}
            reminder["status"] = "dismissed"
            self._save_json(self.REMINDERS_FILE, reminders)
            return {"success": True, "reminder_id": reminder_id, "status": "dismissed"}

    def snooze_reminder(self, reminder_id: str, snooze_minutes: int = 15) -> dict:
        with self._lock:
            reminders = self._load_json(self.REMINDERS_FILE, {})
            reminder = reminders.get(reminder_id)
            if not reminder:
                return {"success": False, "error": f"Reminder {reminder_id} not found"}
            current = datetime.fromisoformat(reminder["remind_at"])
            new_time = (current + timedelta(minutes=snooze_minutes)).isoformat()
            reminder["remind_at"] = new_time
            self._save_json(self.REMINDERS_FILE, reminders)
            return {"success": True, "reminder_id": reminder_id, "new_remind_at": new_time}

    def check_due_reminders(self) -> dict:
        now = datetime.now()
        reminders = self._load_json(self.REMINDERS_FILE, {})
        due = []
        for r in reminders.values():
            if r["status"] != "active":
                continue
            remind_dt = datetime.fromisoformat(r["remind_at"])
            if remind_dt <= now:
                due_since = int((now - remind_dt).total_seconds() / 60)
                due.append({
                    "id": r["reminder_id"],
                    "title": r["title"],
                    "description": r["description"],
                    "due_since_minutes": due_since
                })
        return {"success": True, "due_count": len(due), "reminders": due}

    # ─────────────────────────────────────────── Notes ──────────────────────────────────

    def create_note(self, title: str, content: str = "", category: str = "general",
                    tags: list = None) -> dict:
        with self._lock:
            if category not in self.VALID_CATEGORIES:
                return {"success": False, "error": f"Invalid category. Valid: {self.VALID_CATEGORIES}"}

            note_id = self._generate_id("NOTE-")
            now = self._now()
            word_count = len(content.split()) if content else 0
            note = {
                "note_id": note_id,
                "title": title,
                "content": content,
                "category": category,
                "tags": tags or [],
                "word_count": word_count,
                "created_at": now,
                "updated_at": now
            }
            notes = self._load_json(self.NOTES_FILE, {})
            notes[note_id] = note
            self._save_json(self.NOTES_FILE, notes)
            return {"success": True, "note_id": note_id, "title": title,
                    "created_at": now, "word_count": word_count}

    def get_note(self, note_id: str) -> dict:
        notes = self._load_json(self.NOTES_FILE, {})
        note = notes.get(note_id)
        if not note:
            return {"success": False, "error": f"Note {note_id} not found"}
        return {"success": True, "note": note}

    def list_notes(self, category: str = None, tag: str = None, search: str = None) -> dict:
        notes = self._load_json(self.NOTES_FILE, {})
        result = list(notes.values())

        if category:
            result = [n for n in result if n["category"] == category]
        if tag:
            result = [n for n in result if tag in n.get("tags", [])]
        if search:
            search_lower = search.lower()
            result = [n for n in result if search_lower in n["title"].lower()
                      or search_lower in n["content"].lower()]

        result.sort(key=lambda x: x["updated_at"], reverse=True)
        return {"success": True, "count": len(result), "notes": result}

    def update_note(self, note_id: str, **updates) -> dict:
        with self._lock:
            notes = self._load_json(self.NOTES_FILE, {})
            note = notes.get(note_id)
            if not note:
                return {"success": False, "error": f"Note {note_id} not found"}

            allowed = {"title", "content", "category", "tags"}
            for key, value in updates.items():
                if key in allowed:
                    note[key] = value
                    if key == "content":
                        note["word_count"] = len(value.split()) if value else 0

            note["updated_at"] = self._now()
            self._save_json(self.NOTES_FILE, notes)
            return {"success": True, "note_id": note_id, "updated_fields": list(updates.keys())}

    def delete_note(self, note_id: str) -> dict:
        with self._lock:
            notes = self._load_json(self.NOTES_FILE, {})
            if note_id not in notes:
                return {"success": False, "error": f"Note {note_id} not found"}
            del notes[note_id]
            self._save_json(self.NOTES_FILE, notes)
            return {"success": True, "note_id": note_id, "deleted": True}

    # ─────────────────────────────────────────── Calendar Events ──────────────────────────────────

    def add_event(self, title: str, start_time: str, end_time: str = None,
                  description: str = "", location: str = "", attendees: list = None,
                  reminder_minutes_before: int = 15) -> dict:
        event_id = self._generate_id("EVT-")
        event = {
            "event_id": event_id,
            "title": title,
            "start_time": start_time,
            "end_time": end_time or start_time,
            "description": description,
            "location": location,
            "attendees": attendees or [],
            "reminder_minutes_before": reminder_minutes_before,
            "created_at": self._now()
        }
        events = self._load_json(self.EVENTS_FILE, {})
        events[event_id] = event
        self._save_json(self.EVENTS_FILE, events)
        return {"success": True, "event_id": event_id, "title": title,
                "start_time": start_time, "end_time": end_time}

    def get_events(self, date: str = None, week_of: str = None) -> dict:
        events = self._load_json(self.EVENTS_FILE, {})
        result = list(events.values())

        if date:
            result = [e for e in result if e["start_time"].startswith(date)]
        elif week_of:
            week_start = datetime.strptime(week_of, "%Y-%m-%d")
            week_end = week_start + timedelta(days=7)
            result = [e for e in result
                      if week_start <= datetime.fromisoformat(e["start_time"]) < week_end]

        result.sort(key=lambda x: x["start_time"])
        return {"success": True, "count": len(result), "events": result}

    def get_upcoming_events(self, limit: int = 5) -> dict:
        now = self._now()
        events = self._load_json(self.EVENTS_FILE, {})
        upcoming = [e for e in events.values() if e["start_time"] >= now]
        upcoming.sort(key=lambda x: x["start_time"])
        return {"success": True, "count": len(upcoming[:limit]),
                "events": upcoming[:limit]}

    def delete_event(self, event_id: str) -> dict:
        with self._lock:
            events = self._load_json(self.EVENTS_FILE, {})
            if event_id not in events:
                return {"success": False, "error": f"Event {event_id} not found"}
            del events[event_id]
            self._save_json(self.EVENTS_FILE, events)
            return {"success": True, "event_id": event_id, "deleted": True}

    # ─────────────────────────────────────────── Daily Briefing ──────────────────────────────────

    def get_daily_briefing(self, date: str = None) -> dict:
        target_date = date or self._today()
        now = datetime.now()
        hour = now.hour

        if hour < 12:
            greeting = "Good morning"
        elif hour < 17:
            greeting = "Good afternoon"
        else:
            greeting = "Good evening"

        # Today's tasks
        tasks_data = self.get_tasks_for_today()
        tasks_today = tasks_data.get("tasks", [])

        # Overdue tasks
        overdue_data = self.get_overdue_tasks()
        overdue = overdue_data.get("tasks", [])

        # Upcoming reminders
        reminders_data = self.get_reminders(upcoming_only=True)
        upcoming_reminders = reminders_data.get("reminders", [])[:3]

        # Today's events
        events_data = self.get_events(date=target_date)
        todays_events = events_data.get("events", [])

        # Top priorities
        all_tasks = self.list_tasks()
        top_priorities = [t for t in all_tasks.get("tasks", [])
                          if t["priority"] in ("urgent", "high") and t["status"] != "completed"][:5]

        # Suggestion
        if overdue:
            suggestion = f"You have {len(overdue)} overdue task(s). Consider tackling the oldest one first."
        elif tasks_today:
            suggestion = f"You have {len(tasks_today)} task(s) due today. Start with the highest priority."
        elif top_priorities:
            suggestion = "No tasks due today, but you have high-priority items in your backlog."
        else:
            suggestion = "You're all caught up! Great time to review your goals or learn something new."

        return {
            "success": True,
            "date": target_date,
            "greeting": greeting,
            "tasks_today": tasks_today,
            "overdue_tasks": overdue,
            "upcoming_reminders": upcoming_reminders,
            "todays_events": todays_events,
            "top_priorities": top_priorities,
            "suggestion": suggestion
        }

    def get_weekly_summary(self, week_start: str = None) -> dict:
        if not week_start:
            today = datetime.now()
            week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")

        week_start_dt = datetime.strptime(week_start, "%Y-%m-%d")
        week_end_dt = week_start_dt + timedelta(days=7)

        # Tasks completed this week
        tasks = self._load_json(self.TASKS_FILE, {})
        completed_this_week = 0
        created_this_week = 0
        for t in tasks.values():
            created_dt = datetime.fromisoformat(t["created_at"])
            if week_start_dt <= created_dt < week_end_dt:
                created_this_week += 1
            if t.get("completed_at"):
                completed_dt = datetime.fromisoformat(t["completed_at"])
                if week_start_dt <= completed_dt < week_end_dt:
                    completed_this_week += 1

        completion_rate = round((completed_this_week / max(created_this_week, 1)) * 100, 1)

        # Events this week
        events = self._load_json(self.EVENTS_FILE, {})
        events_this_week = sum(
            1 for e in events.values()
            if week_start_dt <= datetime.fromisoformat(e["start_time"]) < week_end_dt
        )

        # Notes created this week
        notes = self._load_json(self.NOTES_FILE, {})
        notes_this_week = sum(
            1 for n in notes.values()
            if week_start_dt <= datetime.fromisoformat(n["created_at"]) < week_end_dt
        )

        # Productivity score (0-100)
        score = min(100, int(completion_rate * 0.6 + min(events_this_week * 5, 20) + min(notes_this_week * 5, 20)))

        return {
            "success": True,
            "week": week_start,
            "tasks_completed": completed_this_week,
            "tasks_created": created_this_week,
            "completion_rate": completion_rate,
            "events_attended": events_this_week,
            "notes_created": notes_this_week,
            "productivity_score": score
        }

    # ─────────────────────────────────────────── Quick Actions ──────────────────────────────────

    def quick_capture(self, text: str) -> dict:
        text_lower = text.lower().strip()

        # Detect reminder
        if text_lower.startswith("remind me") or "remind me to" in text_lower:
            title = text[text_lower.find("remind me") + 9:].strip(" to ")
            remind_at = (datetime.now() + timedelta(hours=1)).isoformat()
            result = self.set_reminder(title=title, remind_at=remind_at)
            return {**result, "type": "reminder", "parsed_from": text}

        # Detect task
        if text_lower.startswith("todo:") or text_lower.startswith("task:"):
            title = text[5:].strip()
            result = self.create_task(title=title)
            return {**result, "type": "task", "parsed_from": text}

        # Default to note
        result = self.create_note(title=text[:50], content=text)
        return {**result, "type": "note", "parsed_from": text}

    def search_everything(self, query: str) -> dict:
        query_lower = query.lower()
        results = []

        # Search tasks
        tasks = self._load_json(self.TASKS_FILE, {})
        for t in tasks.values():
            if query_lower in t["title"].lower() or query_lower in t.get("description", "").lower():
                results.append({"type": "task", "id": t["task_id"], "title": t["title"], "relevance": 1.0})

        # Search notes
        notes = self._load_json(self.NOTES_FILE, {})
        for n in notes.values():
            if query_lower in n["title"].lower() or query_lower in n["content"].lower():
                results.append({"type": "note", "id": n["note_id"], "title": n["title"], "relevance": 0.9})

        # Search reminders
        reminders = self._load_json(self.REMINDERS_FILE, {})
        for r in reminders.values():
            if query_lower in r["title"].lower():
                results.append({"type": "reminder", "id": r["reminder_id"], "title": r["title"], "relevance": 0.8})

        # Search events
        events = self._load_json(self.EVENTS_FILE, {})
        for e in events.values():
            if query_lower in e["title"].lower():
                results.append({"type": "event", "id": e["event_id"], "title": e["title"], "relevance": 0.7})

        results.sort(key=lambda x: x["relevance"], reverse=True)
        return {"success": True, "query": query, "count": len(results), "results": results}


# ─────────────────────────────────────────── Factory ──────────────────────────────────

def create_personal_assistant() -> PersonalAssistant:
    return PersonalAssistant()
