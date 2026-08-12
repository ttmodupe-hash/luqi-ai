"""Export Formats — Multi-format data export engine."""

import csv
import json
from io import StringIO
from typing import Any, Dict, List


class ExportFormats:
    """Export data to various formats."""

    def to_json(self, data: Any, indent: int = 2) -> str:
        return json.dumps(data, indent=indent, default=str)

    def to_csv(self, data: List[Dict], headers: List[str] = None) -> str:
        if not data:
            return ""
        headers = headers or list(data[0].keys())
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()

    def to_markdown(self, data: List[Dict], title: str = "Data") -> str:
        if not data:
            return f"# {title}\n\nNo data available."
        headers = list(data[0].keys())
        md = f"# {title}\n\n"
        md += "| " + " | ".join(headers) + " |\n"
        md += "| " + " | ".join(["---"] * len(headers)) + " |\n"
        for row in data:
            md += "| " + " | ".join(str(row.get(h, "")) for h in headers) + " |\n"
        return md

    def to_html(self, data: List[Dict], title: str = "Data") -> str:
        if not data:
            return f"<html><body><h1>{title}</h1><p>No data</p></body></html>"
        headers = list(data[0].keys())
        html = f"<html><head><title>{title}</title></head><body>"
        html += f"<h1>{title}</h1><table border='1'><tr>"
        for h in headers:
            html += f"<th>{h}</th>"
        html += "</tr>"
        for row in data:
            html += "<tr>"
            for h in headers:
                html += f"<td>{row.get(h, '')}</td>"
            html += "</tr>"
        html += "</table></body></html>"
        return html


if __name__ == "__main__":
    exporter = ExportFormats()
    data = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
    print(exporter.to_csv(data))
    print(exporter.to_markdown(data))
