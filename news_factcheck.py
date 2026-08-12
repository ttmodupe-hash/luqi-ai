"""News FactCheck — News verification and fact-checking engine."""

import json
from typing import Dict, List


class NewsFactCheck:
    """News verification and fact-checking system."""

    def __init__(self):
        self.fact_checks = []
        self.sources = {
            "reliable": ["News24", "Daily Maverick", "Mail & Guardian", "BBC Africa", "Reuters"],
            "unreliable": ["Unknown blogs", "Social media without verification", "Satire sites"],
        }

    def submit_claim(self, claim: str, source: str = None) -> Dict:
        check = {
            "id": len(self.fact_checks) + 1,
            "claim": claim,
            "source": source,
            "status": "pending",
            "verdict": None,
            "confidence": 0.0,
        }
        self.fact_checks.append(check)
        return check

    def verify(self, check_id: int, verdict: str, confidence: float, evidence: str = None) -> Dict:
        check = next((c for c in self.fact_checks if c["id"] == check_id), None)
        if check:
            check["status"] = "verified"
            check["verdict"] = verdict
            check["confidence"] = confidence
            check["evidence"] = evidence
        return check

    def check_source_reliability(self, source: str) -> Dict:
        if source in self.sources["reliable"]:
            return {"source": source, "reliability": "high", "note": "Established fact-checking processes"}
        elif source in self.sources["unreliable"]:
            return {"source": source, "reliability": "low", "note": "Verify through other sources"}
        return {"source": source, "reliability": "unknown", "note": "Cannot assess reliability"}

    def red_flags(self, article: str) -> List[str]:
        flags = []
        red_flags = [
            ("ALL CAPS", "Excessive use of all caps"),
            ("!!!", "Multiple exclamation marks"),
            ("guaranteed", "Guarantees or promises"),
            ("secret", "Claims of secret information"),
            ("they don't want you to know", "Conspiracy language"),
        ]
        for pattern, reason in red_flags:
            if pattern.lower() in article.lower():
                flags.append(reason)
        return flags

    def get_fact_checks(self, status: str = None) -> List[Dict]:
        if status:
            return [c for c in self.fact_checks if c["status"] == status]
        return self.fact_checks


if __name__ == "__main__":
    fc = NewsFactCheck()
    claim = fc.submit_claim("Load shedding will end in 2025", "Social media")
    print(json.dumps(claim, indent=2))
    print(json.dumps(fc.check_source_reliability("News24"), indent=2))
    print(fc.red_flags("BREAKING!!! They don't want you to know the SECRET!!!"))
