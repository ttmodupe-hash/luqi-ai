"""Deep Research — Multi-source research synthesis engine."""

import json
from typing import Dict, List


class DeepResearch:
    """Deep research and synthesis engine."""

    def __init__(self):
        self.sources = []
        self.findings = []

    def add_source(self, title: str, url: str, content: str, credibility: float = 0.8):
        self.sources.append({
            "title": title,
            "url": url,
            "content": content,
            "credibility": credibility,
        })

    def synthesize(self, query: str) -> Dict:
        """Synthesize findings from multiple sources."""
        relevant = [s for s in self.sources if query.lower() in s["content"].lower()]
        avg_credibility = sum(s["credibility"] for s in relevant) / len(relevant) if relevant else 0
        return {
            "query": query,
            "sources_consulted": len(self.sources),
            "relevant_sources": len(relevant),
            "avg_credibility": round(avg_credibility, 2),
            "summary": f"Found {len(relevant)} relevant sources for '{query}'",
            "key_points": [s["content"][:200] for s in relevant[:3]],
        }

    def generate_report(self, title: str) -> str:
        report = f"# {title}\n\n"
        report += "## Sources\n"
        for s in self.sources:
            report += f"- [{s['title']}]({s['url']}) (credibility: {s['credibility']})\n"
        report += "\n## Findings\n"
        for f in self.findings:
            report += f"- {f}\n"
        return report


if __name__ == "__main__":
    research = DeepResearch()
    research.add_source("SA Gov", "https://gov.za", "Economic policy update", 0.9)
    research.add_source("News24", "https://news24.com", "Business news", 0.7)
    print(json.dumps(research.synthesize("economic"), indent=2))
