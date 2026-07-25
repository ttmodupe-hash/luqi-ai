"""Omega AI v3 — Conversation History Manager
Search, filter, and manage conversation history stored in MemoryStore.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class HistoryManager:
    """Search and manage conversation history from MemoryStore.

    Provides full-text search, filtering by module and date range,
    plus usage statistics.  All data is read from the shared
    ``MemoryStore`` so this class is a view layer only.
    """

    # ── ANSI Colors (embedded) ───────────────────────────────────────────
    _R = "\033[91m"
    _G = "\033[92m"
    _Y = "\033[93m"
    _B = "\033[94m"
    _C = "\033[96m"
    _M = "\033[95m"
    _RST = "\033[0m"
    _BD = "\033[1m"
    _D = "\033[2m"

    def __init__(self) -> None:
        """Initialize and connect to MemoryStore."""
        try:
            from memory_store import MemoryStore
            self._store = MemoryStore()
        except ImportError:
            self._store = None

    def _has_store(self) -> bool:
        """Check if MemoryStore is available."""
        return self._store is not None

    def _all_entries(self) -> list[dict[str, Any]]:
        """Fetch all conversation entries from storage."""
        if not self._has_store():
            return []
        try:
            return self._store.get_history(limit=1000)
        except Exception:
            return []

    # ── Search ───────────────────────────────────────────────────────────

    def search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        """Full-text search across all conversations.

        Searches in both ``query`` and ``response_preview`` fields.
        Results are sorted by relevance: exact matches score higher than
        partial matches.

        Args:
            query: Search string (case-insensitive).
            limit: Maximum number of results to return.

        Returns:
            List of matching entry dicts sorted by relevance.
        """
        if not query.strip():
            return []

        entries = self._all_entries()
        q = query.lower().strip()
        q_words = [w for w in q.split() if len(w) > 1]

        scored: list[tuple[float, dict[str, Any]]] = []
        for entry in entries:
            text = f"{entry.get('query', '')} {entry.get('response_preview', '')}".lower()

            # Relevance scoring
            score = 0.0
            if q in text:
                score += 10.0  # Exact phrase match
            for word in q_words:
                if word in text:
                    score += 2.0  # Word match

            if score > 0:
                scored.append((score, entry))

        # Sort by score descending, then by timestamp descending
        scored.sort(key=lambda x: (-x[0], x[1].get("timestamp", "")), reverse=False)
        return [entry for _, entry in scored[:limit]]

    # ── List & Filter ────────────────────────────────────────────────────

    def list_recent(self, limit: int = 20) -> list[dict[str, Any]]:
        """List the most recent conversations.

        Args:
            limit: Maximum number of entries.

        Returns:
            List of recent entry dicts, newest first.
        """
        entries = self._all_entries()
        try:
            entries.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
        except Exception:
            pass
        return entries[:limit]

    def get_by_module(self, module: str, limit: int = 10) -> list[dict[str, Any]]:
        """Filter conversations by module/category.

        Args:
            module: Module name to filter by (e.g. "tax", "deep_research").
            limit: Maximum number of entries.

        Returns:
            List of matching entry dicts.
        """
        entries = self._all_entries()
        module_lower = module.lower().strip()
        filtered = [
            e for e in entries
            if module_lower in e.get("module", "").lower()
        ]
        try:
            filtered.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
        except Exception:
            pass
        return filtered[:limit]

    def get_by_date_range(self, start: str, end: str) -> list[dict[str, Any]]:
        """Filter conversations by date range.

        Args:
            start: Start date in ISO format (YYYY-MM-DD), inclusive.
            end: End date in ISO format (YYYY-MM-DD), inclusive.

        Returns:
            List of entry dicts within the date range.
        """
        entries = self._all_entries()
        filtered: list[dict[str, Any]] = []
        for e in entries:
            ts = e.get("timestamp", "")
            if ts:
                date_part = ts[:10]
                if start <= date_part <= end:
                    filtered.append(e)
        try:
            filtered.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
        except Exception:
            pass
        return filtered

    # ── Management ───────────────────────────────────────────────────────

    def clear_all(self) -> bool:
        """Clear all conversation history.

        Returns:
            True if cleared, False on error or if store unavailable.
        """
        if not self._has_store():
            return False
        try:
            # MemoryStore stores data in memory.json — we can't directly clear
            # it through the public API, so we overwrite with empty array
            from config import get_memory_dir
            from pathlib import Path
            mem_file = get_memory_dir() / "memory.json"
            mem_file.write_text("[]", encoding="utf-8")
            return True
        except Exception:
            return False

    # ── Formatting ───────────────────────────────────────────────────────

    def format_results(self, results: list[dict[str, Any]]) -> str:
        """Pretty-print search results with timestamps, module badges, and previews.

        Args:
            results: List of entry dicts from search/list methods.

        Returns:
            Formatted multi-line string.
        """
        if not results:
            return f"  {self._D}No results found.{self._RST}"

        lines: list[str] = [f"  {self._BD}{self._C}Search Results{self._RST} ({len(results)})", ""]

        for i, entry in enumerate(results, 1):
            ts = entry.get("timestamp", "N/A")
            ts_short = ts[:19].replace("T", " ") if len(ts) > 10 else ts
            module = entry.get("module", "general")
            query = entry.get("query", "")
            preview = entry.get("response_preview", "")

            # Module badge color
            badge_color = self._Y
            if module in ("tax", "financial_literacy"):
                badge_color = self._G
            elif module in ("deep_research", "investment_mining"):
                badge_color = self._C
            elif module in ("error", "fallback"):
                badge_color = self._R

            lines.append(
                f"  {self._D}[{i}]{self._RST} {self._D}{ts_short}{self._RST} "
                f"{badge_color}[{module}]{self._RST}"
            )
            lines.append(f"      Q: {query[:70]}{'...' if len(query) > 70 else ''}")
            if preview:
                preview_text = preview[:90].replace("\n", " ")
                lines.append(f"      A: {self._D}{preview_text}{'...' if len(preview) > 90 else ''}{self._RST}")
            lines.append("")

        return "\n".join(lines)

    # ── Statistics ───────────────────────────────────────────────────────

    def stats(self) -> dict[str, Any]:
        """Return usage statistics.

        Returns:
            Dict with total conversations, breakdown by module,
            date range, and average rating.
        """
        if not self._has_store():
            return {
                "total": 0,
                "by_module": {},
                "by_date": {},
                "avg_rating": 0.0,
                "note": "MemoryStore not available",
            }

        try:
            store_stats = self._store.get_stats()
            entries = self._all_entries()

            # Date distribution
            by_date: dict[str, int] = {}
            for e in entries:
                ts = e.get("timestamp", "")
                if ts:
                    day = ts[:10]
                    by_date[day] = by_date.get(day, 0) + 1

            # Sort dates
            sorted_dates = dict(sorted(by_date.items(), reverse=True)[:30])

            return {
                "total": store_stats.get("total", 0),
                "by_module": store_stats.get("modules", {}),
                "by_date": sorted_dates,
                "avg_rating": store_stats.get("avg_rating", 0.0),
                "period": store_stats.get("period", "N/A"),
            }

        except Exception as e:
            return {
                "total": 0,
                "by_module": {},
                "by_date": {},
                "avg_rating": 0.0,
                "error": str(e),
            }

    def format_stats(self) -> str:
        """Pretty-print usage statistics.

        Returns:
            Formatted multi-line string.
        """
        data = self.stats()

        if data.get("total", 0) == 0:
            return f"  {self._D}No conversation history yet.{self._RST}"

        lines: list[str] = [
            f"  {self._BD}{self._C}Conversation Stats{self._RST}",
            "",
            f"  Total Conversations: {self._BD}{data['total']}{self._RST}",
            f"  Average Rating:      {data.get('avg_rating', 0):.1f}/5",
            f"  Period:              {data.get('period', 'N/A')}",
            "",
            f"  {self._BD}By Module:{self._RST}",
        ]

        modules = data.get("by_module", {})
        if modules:
            for mod, count in sorted(modules.items(), key=lambda x: -x[1]):
                pct = (count / data["total"] * 100) if data["total"] > 0 else 0
                bar = "█" * int(pct / 5)
                lines.append(f"    {mod:<22} {count:>4}  {bar}  {pct:.0f}%")
        else:
            lines.append(f"    {self._D}No module data.{self._RST}")

        # Recent activity
        by_date = data.get("by_date", {})
        if by_date:
            lines.append("")
            lines.append(f"  {self._BD}Recent Activity:{self._RST}")
            for day, count in list(by_date.items())[:7]:
                lines.append(f"    {day}: {count} conversation{'s' if count > 1 else ''}")

        return "\n".join(lines)


# ── Self-test ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    hm = HistoryManager()

    print(hm.format_stats())
    print()

    # Search
    results = hm.search("bitcoin", limit=5)
    print(hm.format_results(results))
    print()

    # Recent
    recent = hm.list_recent(limit=5)
    print(f"Recent: {len(recent)} entries")
    print()

    # By module
    tax_results = hm.get_by_module("tax", limit=3)
    print(f"Tax module: {len(tax_results)} entries")
    print()

    # Date range
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    range_results = hm.get_by_date_range(today, today)
    print(f"Today: {len(range_results)} entries")
