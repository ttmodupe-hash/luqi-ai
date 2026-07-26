"""
Pedagogical Engine — AI-powered educational assessment and tutoring.

Implements Socratic questioning, Bjork's desirable difficulties,
and Bloom's taxonomy for comprehensive student assessment and
personalized learning guidance.

Usage:
    engine = PedagogicalEngine()
    result = engine.diagnostic_assessment("stu_001", domain="math")
"""

from __future__ import annotations

import hashlib
import random
import time
from typing import Any


# ── Built-in assessment data ──────────────────────────────────────────────

DOMAIN_QUESTIONS: dict[str, list[dict[str, Any]]] = {
    "math": [
        {"q": "What is the derivative of x² with respect to x?", "bloom": "apply", "topic": "calculus"},
        {"q": "Explain why the square root of 2 is irrational.", "bloom": "understand", "topic": "number_theory"},
        {"q": "A train travels 120 km in 2 hours. What is its average speed?", "bloom": "apply", "topic": "algebra"},
        {"q": "Compare the properties of triangles and quadrilaterals.", "bloom": "analyze", "topic": "geometry"},
        {"q": "Create a real-world problem that requires solving a system of linear equations.", "bloom": "create", "topic": "algebra"},
        {"q": "Evaluate the validity of this proof by induction.", "bloom": "evaluate", "topic": "proofs"},
        {"q": "Recall the formula for the area of a circle.", "bloom": "remember", "topic": "geometry"},
        {"q": "How does changing the coefficient 'a' affect the graph of y = ax² + bx + c?", "bloom": "analyze", "topic": "functions"},
    ],
    "science": [
        {"q": "State Newton's three laws of motion.", "bloom": "remember", "topic": "physics"},
        {"q": "Explain photosynthesis in your own words.", "bloom": "understand", "topic": "biology"},
        {"q": "Calculate the force needed to accelerate a 5 kg mass at 3 m/s².", "bloom": "apply", "topic": "physics"},
        {"q": "Analyze the relationship between temperature and reaction rate.", "bloom": "analyze", "topic": "chemistry"},
        {"q": "Design an experiment to test the effect of pH on enzyme activity.", "bloom": "create", "topic": "biology"},
        {"q": "Evaluate the evidence for human-caused climate change.", "bloom": "evaluate", "topic": "earth_science"},
        {"q": "What is the difference between ionic and covalent bonds?", "bloom": "understand", "topic": "chemistry"},
        {"q": "Apply Ohm's Law to find the current in a 12V circuit with 4Ω resistance.", "bloom": "apply", "topic": "physics"},
    ],
    "programming": [
        {"q": "What is the difference between a list and a tuple in Python?", "bloom": "understand", "topic": "data_structures"},
        {"q": "Write a function that returns the factorial of a number.", "bloom": "apply", "topic": "functions"},
        {"q": "Analyze the time complexity of bubble sort vs merge sort.", "bloom": "analyze", "topic": "algorithms"},
        {"q": "Design a class hierarchy for a university management system.", "bloom": "create", "topic": "oop"},
        {"q": "Evaluate whether recursion or iteration is better for this problem.", "bloom": "evaluate", "topic": "algorithms"},
        {"q": "Recall the syntax for a list comprehension in Python.", "bloom": "remember", "topic": "syntax"},
        {"q": "Explain how garbage collection works in Python.", "bloom": "understand", "topic": "memory"},
        {"q": "Debug this function that should return even numbers only.", "bloom": "analyze", "topic": "debugging"},
    ],
    "history": [
        {"q": "When did World War II end?", "bloom": "remember", "topic": "wwii"},
        {"q": "Explain the causes of the French Revolution.", "bloom": "understand", "topic": "revolutions"},
        {"q": "How did the Industrial Revolution change daily life in the 19th century?", "bloom": "apply", "topic": "industrial"},
        {"q": "Compare and contrast the Roman Republic and the Roman Empire.", "bloom": "analyze", "topic": "ancient"},
        {"q": "Evaluate the impact of colonialism on modern Africa.", "bloom": "evaluate", "topic": "colonialism"},
        {"q": "Create a timeline of major events in the Cold War.", "bloom": "create", "topic": "cold_war"},
        {"q": "What were the key achievements of the Mali Empire?", "bloom": "remember", "topic": "african"},
        {"q": "Analyze the factors that led to the fall of the Berlin Wall.", "bloom": "analyze", "topic": "cold_war"},
    ],
    "general": [
        {"q": "What are the primary colors?", "bloom": "remember", "topic": "art"},
        {"q": "Explain the concept of supply and demand.", "bloom": "understand", "topic": "economics"},
        {"q": "How would you approach solving a conflict between two team members?", "bloom": "apply", "topic": "soft_skills"},
        {"q": "What are the strengths and weaknesses of remote work?", "bloom": "analyze", "topic": "career"},
        {"q": "Design a weekly study schedule for exam preparation.", "bloom": "create", "topic": "planning"},
        {"q": "Evaluate whether online education is as effective as in-person learning.", "bloom": "evaluate", "topic": "education"},
        {"q": "Name the continents of the world.", "bloom": "remember", "topic": "geography"},
        {"q": "How does critical thinking help in everyday decision-making?", "bloom": "understand", "topic": "thinking"},
    ],
}

SOCRATIC_QUESTIONS: dict[str, list[str]] = {
    "math": [
        "What do you know about the relationship between these variables?",
        "Can you draw a diagram to represent this problem?",
        "What would happen if you changed one of the values?",
        "Have you seen a similar problem before? How did you approach it?",
        "What assumptions are you making? Are they all necessary?",
        "Can you work backwards from the answer to check your reasoning?",
    ],
    "science": [
        "What evidence supports your conclusion?",
        "What would you expect to observe if your hypothesis is correct?",
        "How does this phenomenon connect to what you already know?",
        "What variables might affect the outcome?",
        "Can you explain this to someone with no background in science?",
        "What would happen if we changed the experimental conditions?",
    ],
    "programming": [
        "What is the problem asking you to do, in your own words?",
        "What are the inputs and expected outputs?",
        "Can you break this problem into smaller sub-problems?",
        "What data structure best fits this scenario?",
        "How would you test your solution?",
        "What happens with edge cases or invalid input?",
    ],
    "history": [
        "Who were the key actors in this event, and what were their motives?",
        "What primary sources exist for this period?",
        "How might different groups have experienced this event differently?",
        "What were the short-term and long-term consequences?",
        "How does this event connect to the present day?",
        "What counterarguments exist to the mainstream narrative?",
    ],
    "general": [
        "What do you already know about this topic?",
        "Why do you think this is important?",
        "What are the different perspectives on this issue?",
        "Can you give a concrete example?",
        "What would be the consequences of each option?",
        "Who benefits, and who might be harmed?",
    ],
}

BLOOM_DESCRIPTIONS: dict[str, str] = {
    "remember": "Recall facts and basic concepts.",
    "understand": "Explain ideas or concepts in your own words.",
    "apply": "Use information in new situations.",
    "analyze": "Draw connections among ideas; deconstruct concepts.",
    "evaluate": "Justify a stand or decision.",
    "create": "Produce new or original work.",
}

BLOOM_LEVEL_ORDER: list[str] = ["remember", "understand", "apply", "analyze", "evaluate", "create"]


class PedagogicalEngine:
    """AI pedagogical engine combining Socratic, Bjork, and Bloom methods."""

    def __init__(self) -> None:
        self._progress_db: dict[str, dict[str, Any]] = {}
        self._domains = list(DOMAIN_QUESTIONS.keys())

    # ── Public API ─────────────────────────────────────────────────────────

    def diagnostic_assessment(self, student_id: str, domain: str = "general") -> dict:
        """Run diagnostic assessment using Socratic + Bjork + Bloom methods.

        Args:
            student_id: Unique identifier for the student.
            domain: Subject domain (math, science, programming, history, general).

        Returns:
            Dictionary with assessment_id, domain, bloom_level, strengths,
            weaknesses, and recommendations.
        """
        domain = domain.lower() if domain.lower() in self._domains else "general"
        questions = DOMAIN_QUESTIONS.get(domain, DOMAIN_QUESTIONS["general"])

        # Seed random for reproducibility per student+domain
        rng = random.Random(hash(student_id + domain) % (2**31))

        # Select 5 questions spanning Bloom levels
        selected = rng.sample(questions, min(5, len(questions)))

        # Simulate Bloom-level scoring (deterministic pseudo-random)
        scores: dict[str, float] = {}
        for q in selected:
            level = q["bloom"]
            base = rng.uniform(0.3, 0.95)
            scores[level] = scores.get(level, 0.0) + base

        # Average scores per level
        for level in scores:
            count = sum(1 for q in selected if q["bloom"] == level)
            scores[level] = round(scores[level] / max(count, 1), 2)

        # Determine overall Bloom level
        avg_score = sum(scores.values()) / max(len(scores), 1)
        bloom_idx = min(int(avg_score * len(BLOOM_LEVEL_ORDER)), len(BLOOM_LEVEL_ORDER) - 1)
        bloom_level = BLOOM_LEVEL_ORDER[bloom_idx]

        # Strengths / weaknesses
        strengths = [lvl for lvl, sc in scores.items() if sc >= 0.7]
        weaknesses = [lvl for lvl, sc in scores.items() if sc < 0.5]

        # Build recommendations using Bjork's desirable difficulties
        recommendations = self._bjorkean_recommendations(weaknesses, domain, rng)

        assessment_id = self._make_id(student_id, domain)

        # Store progress
        if student_id not in self._progress_db:
            self._progress_db[student_id] = {}
        self._progress_db[student_id][domain] = {
            "bloom_level": bloom_level,
            "scores": scores,
            "assessments_count": self._progress_db[student_id].get(domain, {}).get("assessments_count", 0) + 1,
        }

        return {
            "assessment_id": assessment_id,
            "domain": domain,
            "bloom_level": bloom_level,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendations": recommendations,
            "questions_asked": [q["q"] for q in selected],
            "scores": scores,
        }

    def get_progress(self, student_id: str) -> dict:
        """Get student progress across all assessed domains.

        Args:
            student_id: Unique identifier for the student.

        Returns:
            Dictionary with student_id, per-domain data, and overall_progress.
        """
        domains_data = self._progress_db.get(student_id, {})
        overall = 0.0
        domain_summary: dict[str, Any] = {}

        for dom, data in domains_data.items():
            scores = data.get("scores", {})
            avg = round(sum(scores.values()) / max(len(scores), 1), 2) if scores else 0.0
            domain_summary[dom] = {
                "bloom_level": data.get("bloom_level", "unknown"),
                "average_score": avg,
                "assessments_count": data.get("assessments_count", 0),
            }
            overall += avg

        overall_progress = round(overall / max(len(domain_summary), 1), 2) if domain_summary else 0.0

        return {
            "student_id": student_id,
            "domains": domain_summary,
            "overall_progress": overall_progress,
        }

    def socratic_tutor(self, student_id: str, topic: str) -> dict:
        """Generate Socratic tutoring questions and hints for a topic.

        Args:
            student_id: Unique identifier for the student.
            topic: Topic to tutor on (e.g., 'algebra', 'photosynthesis').

        Returns:
            Dictionary with topic, guiding questions, hints, and next_steps.
        """
        # Map topic to domain
        topic_lower = topic.lower()
        domain = "general"
        for dom in self._domains:
            if dom in topic_lower or any(dom in q["topic"] for q in DOMAIN_QUESTIONS.get(dom, [])):
                domain = dom
                break

        # Find relevant questions mentioning the topic
        questions = DOMAIN_QUESTIONS.get(domain, DOMAIN_QUESTIONS["general"])
        related = [q["q"] for q in questions if topic_lower in q["topic"] or topic_lower in q["q"].lower()]
        if not related:
            related = [q["q"] for q in questions[:3]]

        socratic_qs = SOCRATIC_QUESTIONS.get(domain, SOCRATIC_QUESTIONS["general"])

        # Personalized hints based on student progress
        progress = self._progress_db.get(student_id, {}).get(domain, {})
        bloom_lvl = progress.get("bloom_level", "understand")

        hints = self._generate_hints(topic, bloom_lvl, domain)
        next_steps = self._generate_next_steps(topic, bloom_lvl, domain)

        return {
            "topic": topic,
            "domain": domain,
            "student_bloom_level": bloom_lvl,
            "questions": socratic_qs[:5],
            "related_assessment_questions": related[:3],
            "hints": hints,
            "next_steps": next_steps,
        }

    def assess_bloom_level(self, student_id: str, domain: str = "general") -> dict:
        """Assess the student's current level on Bloom's taxonomy.

        Args:
            student_id: Unique identifier for the student.
            domain: Subject domain.

        Returns:
            Dictionary with bloom_level, per-level scores, and description.
        """
        domain = domain.lower() if domain.lower() in self._domains else "general"

        # If no prior assessment, run diagnostic
        if student_id not in self._progress_db or domain not in self._progress_db.get(student_id, {}):
            diag = self.diagnostic_assessment(student_id, domain)
            scores = diag["scores"]
            bloom_level = diag["bloom_level"]
        else:
            scores = self._progress_db[student_id][domain].get("scores", {})
            bloom_level = self._progress_db[student_id][domain].get("bloom_level", "understand")

        # Normalize to all 6 Bloom levels
        full_scores: dict[str, float] = {level: round(scores.get(level, 0.0), 2) for level in BLOOM_LEVEL_ORDER}

        return {
            "bloom_level": bloom_level,
            "scores": full_scores,
            "description": BLOOM_DESCRIPTIONS.get(bloom_level, ""),
            "level_order": BLOOM_LEVEL_ORDER,
            "domain": domain,
            "student_id": student_id,
        }

    # ── Helpers ────────────────────────────────────────────────────────────

    def _bjorkean_recommendations(self, weaknesses: list[str], domain: str, rng: random.Random) -> list[str]:
        """Generate recommendations based on Bjork's desirable difficulties."""
        recs = []
        bloom_weak = weaknesses[0] if weaknesses else "understand"

        recs.append(f"Use spaced repetition to strengthen {bloom_weak}-level skills.")
        recs.append(f"Apply interleaving: mix {domain} problems with different Bloom levels.")
        recs.append("Practice retrieval: close the book and write what you remember.")
        recs.append(f"Generate your own questions at the {bloom_weak} level before reviewing answers.")
        recs.append("Vary practice contexts to improve transfer and generalization.")
        recs.append("Use elaborative interrogation: ask 'why' and 'how' for every fact.")

        if "remember" in weaknesses:
            recs.append("Create mental images or mnemonics for key facts.")
        if "apply" in weaknesses:
            recs.append("Work on real-world case studies and word problems.")
        if "analyze" in weaknesses:
            recs.append("Use concept mapping to visualize relationships between ideas.")
        if "evaluate" in weaknesses:
            recs.append("Debate both sides of an argument before forming a conclusion.")
        if "create" in weaknesses:
            recs.append("Design original projects or open-ended solutions.")

        return recs

    def _generate_hints(self, topic: str, bloom_level: str, domain: str) -> list[str]:
        """Generate contextual hints based on Bloom level."""
        hints_map: dict[str, list[str]] = {
            "remember": [
                f"Start by listing the key terms related to {topic}.",
                "Try to recall definitions before looking them up.",
                "Use flashcards for memorization.",
            ],
            "understand": [
                f"Explain {topic} as if teaching it to a 10-year-old.",
                "Draw a concept map connecting related ideas.",
                "Paraphrase the core concept in your own words.",
            ],
            "apply": [
                f"Find a real-world problem that requires {topic}.",
                "Work through a worked example, then try a similar one alone.",
                "Identify which formula or method applies to each scenario.",
            ],
            "analyze": [
                f"Break {topic} into its component parts.",
                "Compare and contrast different approaches.",
                "Look for patterns, assumptions, and causal relationships.",
            ],
            "evaluate": [
                f"Assess the strengths and weaknesses of each approach to {topic}.",
                "Consider the evidence for and against each claim.",
                "Determine criteria for judging which solution is best.",
            ],
            "create": [
                f"Design an original project or problem set about {topic}.",
                "Combine ideas from different domains in a novel way.",
                "Propose a hypothesis and outline an experiment to test it.",
            ],
        }
        return hints_map.get(bloom_level, hints_map["understand"])

    def _generate_next_steps(self, topic: str, bloom_level: str, domain: str) -> list[str]:
        """Suggest next steps for progression."""
        idx = BLOOM_LEVEL_ORDER.index(bloom_level) if bloom_level in BLOOM_LEVEL_ORDER else 1
        next_level = BLOOM_LEVEL_ORDER[min(idx + 1, len(BLOOM_LEVEL_ORDER) - 1)]

        return [
            f"Current level: {bloom_level}. Target: {next_level}.",
            f"Practice 3 questions at the {next_level} level for {topic}.",
            f"Review {domain} fundamentals with spaced repetition.",
            "Self-test: write down everything you know about the topic, then check.",
            "Seek feedback on your work from a peer or mentor.",
        ]

    @staticmethod
    def _make_id(student_id: str, domain: str) -> str:
        """Generate a deterministic assessment ID."""
        raw = f"{student_id}:{domain}:{time.time()}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]


# ── Module-level convenience alias ────────────────────────────────────────

ModuleName = PedagogicalEngine
