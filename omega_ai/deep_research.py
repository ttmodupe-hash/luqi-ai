"""Omega AI v3 — Deep Research Engine
Multi-source deep research with citations, summaries, and fact-checking.
"""
from __future__ import annotations

import json
import time
import urllib.request
from typing import Any

from web_search import WebSearch
from local_llm import LocalLLM


class DeepResearch:
    """Deep research engine with multi-source analysis and citations."""

    def __init__(self) -> None:
        self.search = WebSearch()
        self.llm = LocalLLM()

    def research(self, query: str, depth: str = "deep") -> dict[str, Any]:
        """Conduct deep research on a topic."""
        # Search multiple angles
        angles = [query, f"{query} overview", f"{query} analysis", f"{query} recent developments"]
        all_results = []
        for angle in angles[:2 if depth == "quick" else 4]:
            results = self.search.search(angle, num_results=5)
            all_results.extend(results)

        # Deduplicate by title
        seen = set()
        unique = []
        for r in all_results:
            if r.get("title") not in seen:
                seen.add(r.get("title"))
                unique.append(r)

        # Build cited response
        sources = []
        cited_text = f"## Research: {query}\n\n"
        for i, r in enumerate(unique[:8], 1):
            cited_text += f"[{i}] **{r.get('title', 'Untitled')}**\n{r.get('snippet', '')[:200]}...\n\n"
            sources.append({"title": r.get("title"), "source": r.get("source"), "link": r.get("link")})

        # Add summary via LLM if available
        if self.llm.is_available():
            summary = self.llm.chat([
                {"role": "user", "content": f"Summarize research on '{query}' based on these sources. Provide 3 key insights:\n{cited_text[:2000]}"}
            ])
            cited_text += f"\n## Key Insights\n{summary.get('response', '')}\n"

        cited_text += f"\n*Sources: {len(sources)} references analyzed*"

        return {
            "query": query,
            "cited_response": cited_text,
            "sources": sources,
            "source_count": len(sources),
            "depth": depth,
        }

    def compare(self, topic_a: str, topic_b: str) -> dict[str, Any]:
        """Compare two topics."""
        research_a = self.research(topic_a, depth="quick")
        research_b = self.research(topic_b, depth="quick")

        comparison = f"## Comparison: {topic_a} vs {topic_b}\n\n"
        comparison += f"### {topic_a}\n{research_a['cited_response'][:500]}...\n\n"
        comparison += f"### {topic_b}\n{research_b['cited_response'][:500]}...\n\n"

        return {
            "topic_a": topic_a,
            "topic_b": topic_b,
            "comparison": comparison,
            "sources_a": research_a["sources"],
            "sources_b": research_b["sources"],
        }

    def fact_check(self, claim: str) -> dict[str, Any]:
        """Fact-check a claim against web sources."""
        results = self.search.search(claim, num_results=5)
        evidence = []
        for r in results:
            snippet = r.get("snippet", "").lower()
            claim_words = set(claim.lower().split())
            snippet_words = set(snippet.split())
            overlap = len(claim_words & snippet_words) / max(len(claim_words), 1)
            evidence.append({"source": r.get("source"), "relevance": round(overlap, 2), "snippet": r.get("snippet")})

        avg_relevance = sum(e["relevance"] for e in evidence) / max(len(evidence), 1)
        verdict = "likely true" if avg_relevance > 0.5 else "uncertain" if avg_relevance > 0.2 else "likely false"

        return {"claim": claim, "verdict": verdict, "confidence": round(avg_relevance, 2), "evidence": evidence}
