"""Omega AI v3 — Data Visualization Engine
Chart generation with matplotlib/seaborn fallback to ASCII art.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class VizEngine:
    """Data visualization engine with multiple backends."""

    def __init__(self, output_dir: str = "charts") -> None:
        self._output_dir = Path(output_dir)
        self._output_dir.mkdir(exist_ok=True)
        self._has_matplotlib = self._check_matplotlib()
        self._has_seaborn = self._check_seaborn()

    def _check_matplotlib(self) -> bool:
        try:
            import matplotlib
            return True
        except ImportError:
            return False

    def _check_seaborn(self) -> bool:
        try:
            import seaborn
            return True
        except ImportError:
            return False

    def bar_chart(self, data: dict[str, float], title: str = "Bar Chart", filename: str = "") -> str:
        """Create a bar chart."""
        if self._has_matplotlib:
            return self._bar_chart_matplotlib(data, title, filename)
        return self._bar_chart_ascii(data, title)

    def _bar_chart_matplotlib(self, data: dict[str, float], title: str, filename: str) -> str:
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.bar(data.keys(), data.values())
        ax.set_title(title)
        ax.set_ylabel("Value")
        plt.xticks(rotation=45, ha="right")
        plt.tight_layout()
        out = self._output_dir / (filename or f"bar_{title.lower().replace(' ', '_')}.png")
        fig.savefig(out)
        plt.close(fig)
        return str(out)

    def _bar_chart_ascii(self, data: dict[str, float], title: str) -> str:
        lines = [f"## {title}", ""]
        max_val = max(data.values()) if data else 1
        max_key_len = max(len(k) for k in data.keys()) if data else 0
        for key, val in data.items():
            bar_len = int((val / max_val) * 40)
            bar = "█" * bar_len
            lines.append(f"{key:<{max_key_len}} |{bar:<40}| {val}")
        return "\n".join(lines)

    def line_chart(self, x: list, y: list, title: str = "Line Chart", filename: str = "") -> str:
        """Create a line chart."""
        if self._has_matplotlib:
            import matplotlib.pyplot as plt
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.plot(x, y, marker="o")
            ax.set_title(title)
            ax.set_ylabel("Value")
            plt.tight_layout()
            out = self._output_dir / (filename or f"line_{title.lower().replace(' ', '_')}.png")
            fig.savefig(out)
            plt.close(fig)
            return str(out)
        return self._line_chart_ascii(x, y, title)

    def _line_chart_ascii(self, x: list, y: list, title: str) -> str:
        lines = [f"## {title}", ""]
        if not y:
            return "\n".join(lines) + "\nNo data"
        max_y = max(y)
        min_y = min(y)
        range_y = max_y - min_y if max_y != min_y else 1
        height = 10
        for row in range(height, -1, -1):
            threshold = min_y + (range_y * row / height)
            row_str = f"{threshold:6.1f} |"
            for val in y:
                row_str += " * " if val >= threshold else "   "
            lines.append(row_str)
        return "\n".join(lines)

    def pie_chart(self, data: dict[str, float], title: str = "Pie Chart", filename: str = "") -> str:
        """Create a pie chart."""
        if self._has_matplotlib:
            import matplotlib.pyplot as plt
            fig, ax = plt.subplots(figsize=(8, 8))
            ax.pie(data.values(), labels=data.keys(), autopct="%1.1f%%")
            ax.set_title(title)
            out = self._output_dir / (filename or f"pie_{title.lower().replace(' ', '_')}.png")
            fig.savefig(out)
            plt.close(fig)
            return str(out)
        return self._pie_chart_ascii(data, title)

    def _pie_chart_ascii(self, data: dict[str, float], title: str) -> str:
        total = sum(data.values())
        lines = [f"## {title}", ""]
        for key, val in data.items():
            pct = (val / total * 100) if total > 0 else 0
            bar = "█" * int(pct / 2)
            lines.append(f"{key:<15} {bar:<50} {pct:.1f}%")
        return "\n".join(lines)

    def status(self) -> dict[str, Any]:
        return {"matplotlib": self._has_matplotlib, "seaborn": self._has_seaborn, "output_dir": str(self._output_dir)}
