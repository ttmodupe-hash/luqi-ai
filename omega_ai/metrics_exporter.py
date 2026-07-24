"""Omega AI v3 — Metrics Exporter
Prometheus-compatible metrics collection and export.
"""
from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock
from typing import Any


class MetricsExporter:
    """Collect and export metrics for monitoring."""

    def __init__(self) -> None:
        self.counters: dict[str, int] = defaultdict(int)
        self.gauges: dict[str, float] = {}
        self.histograms: dict[str, list[float]] = defaultdict(list)
        self.timers: dict[str, list[float]] = defaultdict(list)
        self.lock = Lock()

    def increment(self, name: str, value: int = 1, labels: dict[str, str] | None = None) -> None:
        """Increment a counter."""
        key = self._key(name, labels)
        with self.lock:
            self.counters[key] += value

    def gauge(self, name: str, value: float, labels: dict[str, str] | None = None) -> None:
        """Set a gauge value."""
        key = self._key(name, labels)
        with self.lock:
            self.gauges[key] = value

    def histogram(self, name: str, value: float, labels: dict[str, str] | None = None) -> None:
        """Record a histogram observation."""
        key = self._key(name, labels)
        with self.lock:
            self.histograms[key].append(value)
            if len(self.histograms[key]) > 10000:
                self.histograms[key] = self.histograms[key][-5000:]

    def timer(self, name: str, elapsed: float, labels: dict[str, str] | None = None) -> None:
        """Record a timer observation."""
        key = self._key(name, labels)
        with self.lock:
            self.timers[key].append(elapsed)
            if len(self.timers[key]) > 10000:
                self.timers[key] = self.timers[key][-5000:]

    @staticmethod
    def _key(name: str, labels: dict[str, str] | None) -> str:
        if not labels:
            return name
        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f'{name}{{{label_str}}}'

    def prometheus_format(self) -> str:
        """Export metrics in Prometheus text format."""
        lines = []
        # Counters
        for key, value in sorted(self.counters.items()):
            lines.append(f"# TYPE {key.split('{')[0]} counter")
            lines.append(f"{key} {value}")
        # Gauges
        for key, value in sorted(self.gauges.items()):
            lines.append(f"# TYPE {key.split('{')[0]} gauge")
            lines.append(f"{key} {value}")
        # Histograms
        for key, values in sorted(self.histograms.items()):
            if values:
                avg = sum(values) / len(values)
                lines.append(f"# TYPE {key.split('{')[0]} histogram")
                lines.append(f"{key}_avg {avg:.4f}")
                lines.append(f"{key}_count {len(values)}")
        # Timers
        for key, values in sorted(self.timers.items()):
            if values:
                avg = sum(values) / len(values)
                lines.append(f"# TYPE {key.split('{')[0]} summary")
                lines.append(f"{key}_avg {avg:.4f}")
                lines.append(f"{key}_count {len(values)}")
        return "\n".join(lines) + "\n"

    def status(self) -> dict[str, Any]:
        return {
            "counters": dict(self.counters),
            "gauges": dict(self.gauges),
            "histogram_count": {k: len(v) for k, v in self.histograms.items()},
            "timer_count": {k: len(v) for k, v in self.timers.items()},
        }
