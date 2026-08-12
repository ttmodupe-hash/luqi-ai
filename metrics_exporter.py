"""Metrics Exporter — System metrics and monitoring exporter."""

import json
from typing import Dict, List


class MetricsExporter:
    """Export system metrics in various formats."""

    def __init__(self):
        self.metrics = {}

    def record(self, name: str, value: float, labels: Dict = None):
        if name not in self.metrics:
            self.metrics[name] = []
        self.metrics[name].append({"value": value, "labels": labels or {}, "timestamp": json.dumps("now")})

    def to_prometheus(self) -> str:
        lines = []
        for name, values in self.metrics.items():
            prom_name = name.replace(".", "_").replace("-", "_")
            for v in values:
                labels = ",".join(f'{k}="{val}"' for k, val in v["labels"].items())
                label_str = "{" + labels + "}" if labels else ""
                lines.append(f"{prom_name}{label_str} {v['value']}")
        return "\n".join(lines)

    def to_json(self) -> Dict:
        return self.metrics

    def summary(self) -> Dict:
        result = {}
        for name, values in self.metrics.items():
            vals = [v["value"] for v in values]
            result[name] = {
                "count": len(vals),
                "sum": sum(vals),
                "avg": sum(vals) / len(vals) if vals else 0,
                "min": min(vals) if vals else 0,
                "max": max(vals) if vals else 0,
            }
        return result

    def clear(self):
        self.metrics = {}


if __name__ == "__main__":
    metrics = MetricsExporter()
    metrics.record("requests_total", 100, {"method": "GET", "status": "200"})
    metrics.record("requests_total", 50, {"method": "POST", "status": "201"})
    metrics.record("response_time", 0.25, {"endpoint": "/api"})
    print(metrics.to_prometheus())
    print(json.dumps(metrics.summary(), indent=2))
