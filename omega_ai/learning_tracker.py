"""Omega AI v3 — Learning Tracker
Progress tracking for financial literacy lessons.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class LearningTracker:
    """Track user progress through financial literacy lessons.

    Lessons are organised by **topic** and **difficulty level**.
    Progress is persisted at ``~/.omega_ai/learning_progress.json``.

    Topic → lesson mapping delegates to ``financial_literacy.FinancialLiteracy``
    so content always stays in sync with the main curriculum.
    """

    # ── Curriculum structure ─────────────────────────────────────────────
    TOPICS: list[str] = [
        "budgeting", "saving", "investing", "debt",
        "credit", "crypto", "scams", "retirement",
        "insurance", "tax", "entrepreneurship", "banking",
    ]

    LEVELS: list[str] = ["beginner", "intermediate", "advanced"]

    # Map tracker topic names → FinancialLiteracy keys
    _TOPIC_MAP: dict[str, str] = {
        "budgeting": "budgeting",
        "saving": "saving",
        "investing": "investing",
        "debt": "debt",
        "credit": "credit",
        "crypto": "crypto_lit",
        "scams": "scam_protection",
        "retirement": "retirement",
        "insurance": "insurance",
        "tax": "tax_basics",
        "entrepreneurship": "side_hustle",
        "banking": "banking",
    }

    @property
    def total_lessons(self) -> int:
        """Total number of lessons in the curriculum."""
        return len(self.TOPICS) * len(self.LEVELS)

    # ── ANSI Colors (embedded) ───────────────────────────────────────────
    _R = "\033[91m"
    _G = "\033[92m"
    _Y = "\033[93m"
    _B = "\033[94m"
    _C = "\033[96m"
    _RST = "\033[0m"
    _BD = "\033[1m"
    _D = "\033[2m"

    def __init__(self) -> None:
        """Initialize storage and load existing progress."""
        self._storage_path = Path.home() / ".omega_ai" / "learning_progress.json"
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        if not self._storage_path.exists():
            self._storage_path.write_text("{}", encoding="utf-8")

    # ── Persistence helpers ──────────────────────────────────────────────

    def _load(self) -> dict[str, Any]:
        """Load progress data from JSON file."""
        try:
            text = self._storage_path.read_text(encoding="utf-8")
            if not text.strip():
                return {}
            return json.loads(text)
        except (json.JSONDecodeError, OSError):
            return {}

    def _save(self, data: dict[str, Any]) -> None:
        """Atomically save progress to JSON file."""
        tmp = self._storage_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self._storage_path)

    def _key(self, topic: str, level: str) -> str:
        """Create a storage key for a topic+level combination."""
        return f"{topic.lower().strip()}:{level.lower().strip()}"

    # ── Public API ───────────────────────────────────────────────────────

    def get_progress(self) -> dict[str, Any]:
        """Return current learning progress summary.

        Returns:
            Dict with ``completed``, ``total``, ``percentage``, and ``by_topic`` keys.
        """
        data = self._load()
        by_topic: dict[str, dict[str, Any]] = {}
        completed_total = 0

        for topic in self.TOPICS:
            topic_completed = 0
            levels: dict[str, str] = {}
            for level in self.LEVELS:
                key = self._key(topic, level)
                ts = data.get(key, "")
                levels[level] = ts
                if ts:
                    topic_completed += 1
                    completed_total += 1

            by_topic[topic] = {
                "completed": topic_completed,
                "total": len(self.LEVELS),
                "levels": levels,
            }

        total = self.total_lessons
        percentage = (completed_total / total * 100) if total > 0 else 0.0

        return {
            "completed": completed_total,
            "total": total,
            "percentage": round(percentage, 1),
            "by_topic": by_topic,
        }

    def mark_completed(self, topic: str, level: str) -> None:
        """Mark a specific lesson as completed with timestamp.

        Args:
            topic: Lesson topic name.
            level: Difficulty level (beginner/intermediate/advanced).
        """
        try:
            data = self._load()
            key = self._key(topic, level)
            data[key] = datetime.now(timezone.utc).isoformat()
            self._save(data)
        except Exception:
            pass

    def get_next_lesson(self) -> dict[str, Any]:
        """Find the first incomplete lesson across all topics.

        Returns:
            Dict with ``topic``, ``level``, and ``content`` keys,
            or an empty dict if all lessons are complete.
        """
        data = self._load()

        for topic in self.TOPICS:
            for level in self.LEVELS:
                key = self._key(topic, level)
                if not data.get(key):
                    return {
                        "topic": topic,
                        "level": level,
                        "content": self.get_lesson_content(topic, level),
                    }
        return {}

    def get_lesson_content(self, topic: str, level: str) -> str:
        """Retrieve lesson content from the FinancialLiteracy module.

        Args:
            topic: Lesson topic.
            level: Difficulty level.

        Returns:
            Lesson content string, or a fallback message on import/error.
        """
        try:
            from financial_literacy import FinancialLiteracy
        except ImportError:
            return f"{self._R}Error:{self._RST} FinancialLiteracy module not available."

        try:
            fl = FinancialLiteracy()
            mapped_topic = self._TOPIC_MAP.get(topic.lower(), topic.lower())
            return fl.lesson(mapped_topic, level)
        except Exception as e:
            return f"{self._R}Lesson load error:{self._RST} {e}"

    def format_progress(self) -> str:
        """Create a pretty ASCII progress report.

        Returns:
            Multi-line formatted string with progress bar and topic breakdown.
        """
        progress = self.get_progress()
        completed = progress["completed"]
        total = progress["total"]
        pct = progress["percentage"]
        by_topic = progress["by_topic"]

        # Progress bar (20 chars wide)
        filled = int(pct / 5)
        bar = f"{self._G}{('█' * filled)}{self._RST}{self._D}{('░' * (20 - filled))}{self._RST}"

        lines: list[str] = [
            f"{self._BD}{self._C}Your Progress:{self._RST} {completed}/{total} lessons ({pct}%)",
            f"{bar} {pct}%",
            "",
        ]

        for topic in self.TOPICS:
            info = by_topic.get(topic, {})
            tc = info.get("completed", 0)
            tt = info.get("total", len(self.LEVELS))

            if tc == tt:
                icon = f"{self._G}✅{self._RST}"
                note = ""
            elif tc > 0:
                remaining = tt - tc
                icon = f"{self._Y}🔶{self._RST}"
                note = f"  {self._D}← {remaining} remaining{self._RST}"
            else:
                icon = f"{self._D}⬜{self._RST}"
                note = ""

            lines.append(f"  {icon} {topic.title():<18} ({tc}/{tt}){note}")

        # Next lesson
        next_lesson = self.get_next_lesson()
        if next_lesson:
            lines.append("")
            lines.append(
                f"{self._BD}Next up:{self._RST} {next_lesson['topic'].title()} — "
                f"{next_lesson['level'].title()}"
            )
        else:
            lines.append("")
            lines.append(f"{self._G}{self._BD}🎉 All lessons complete!{self._RST}")

        return "\n".join(lines)

    def reset_progress(self) -> None:
        """Clear all learning progress. This action is irreversible."""
        try:
            self._storage_path.write_text("{}", encoding="utf-8")
        except Exception:
            pass


# ── Self-test ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    lt = LearningTracker()

    # Show initial progress
    print(lt.format_progress())
    print()

    # Mark some lessons complete
    lt.mark_completed("budgeting", "beginner")
    lt.mark_completed("budgeting", "intermediate")
    lt.mark_completed("budgeting", "advanced")
    lt.mark_completed("saving", "beginner")
    lt.mark_completed("debt", "beginner")

    print(lt.format_progress())
    print()

    # Show next lesson
    next_l = lt.get_next_lesson()
    print(f"Next: {next_l.get('topic', 'N/A')} — {next_l.get('level', 'N/A')}")

    # Reset
    lt.reset_progress()
    print("\nProgress reset.")
