"""Safety Alignment - Content safety and alignment for LUQI AI v29.1.0"""
import os
import re
from typing import List, Dict, Any, Optional


class SafetyAlignment:
    """Content safety filtering and alignment checks."""

    def __init__(self):
        self.blocked_patterns = [
            r"\b(hack|exploit|breach|penetrate)\s+(?:into|through)\b",
            r"\b(stolen|fake|forged)\s+(?:id|passport|document)\b",
            r"\b(weapon|bomb|explosive)\s+(?:making|construction|recipe)\b",
        ]
        self.sensitive_topics = [
            "self-harm", "violence", "illegal activity", "hate speech",
        ]
        self.max_input_length = 10000

    def check_input(self, text: str) -> Dict[str, Any]:
        """Check user input for safety issues."""
        result = {
            "safe": True,
            "issues": [],
            "action": "allow",
        }

        # Length check
        if len(text) > self.max_input_length:
            result["safe"] = False
            result["issues"].append("Input too long")
            result["action"] = "block"
            return result

        # Pattern checks
        for pattern in self.blocked_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                result["safe"] = False
                result["issues"].append(f"Blocked pattern detected")
                result["action"] = "block"

        # Topic checks
        text_lower = text.lower()
        for topic in self.sensitive_topics:
            if topic in text_lower:
                result["issues"].append(f"Sensitive topic: {topic}")
                if result["action"] != "block":
                    result["action"] = "warn"

        if result["issues"]:
            result["safe"] = False

        return result

    def check_output(self, text: str) -> Dict[str, Any]:
        """Check model output for safety issues."""
        result = {
            "safe": True,
            "issues": [],
            "action": "allow",
        }

        # Check for potential harmful content
        harmful_indicators = [
            "step-by-step instructions for",
            "here's how to make",
            "follow these steps to",
        ]

        text_lower = text.lower()
        for indicator in harmful_indicators:
            if indicator in text_lower:
                result["safe"] = False
                result["issues"].append("Potentially harmful instructions detected")
                result["action"] = "block"

        return result

    def sanitize(self, text: str) -> str:
        """Sanitize text by removing potentially harmful content."""
        # Remove email addresses
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
        # Remove phone numbers
        text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)
        return text


# Global instance
safety = SafetyAlignment()
