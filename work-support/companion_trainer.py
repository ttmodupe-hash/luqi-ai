#!/usr/bin/env python3
"""
Companion Trainer Module v25.1.0 "LUQI"
==========================================
AI-powered companion for learning, practice, and skill development.
Supports coding interviews, language practice, and study sessions.

Usage:
    from work_support.companion_trainer import start_session
    result = start_session("python_interview")
"""

import json
import random
from typing import Dict, List, Optional

# ═══════════════════════════════════════════════════════════════════════════════
#  SESSION TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

SESSION_TEMPLATES = {
    "python_interview": {
        "name": "Python Coding Interview",
        "description": "Practice common Python coding interview questions",
        "categories": ["data_structures", "algorithms", "python_basics", "oop", "problem_solving"],
        "difficulty_levels": ["easy", "medium", "hard"],
    },
    "system_design": {
        "name": "System Design Interview",
        "description": "Practice system design questions for senior roles",
        "categories": ["scalability", "databases", "microservices", "caching", "load_balancing"],
        "difficulty_levels": ["medium", "hard"],
    },
    "language_practice": {
        "name": "Language Practice",
        "description": "Practice conversation in a new language",
        "categories": ["greetings", "daily_conversation", "travel", "business", "food"],
        "difficulty_levels": ["beginner", "intermediate", "advanced"],
    },
    "math_practice": {
        "name": "Mathematics Practice",
        "description": "Practice math problems from algebra to calculus",
        "categories": ["algebra", "geometry", "calculus", "statistics", "probability"],
        "difficulty_levels": ["easy", "medium", "hard"],
    },
    "behavioral_interview": {
        "name": "Behavioral Interview",
        "description": "Practice STAR-method behavioral questions",
        "categories": ["leadership", "teamwork", "conflict", "failure", "achievement"],
        "difficulty_levels": ["easy", "medium"],
    },
}

# Question banks
PYTHON_QUESTIONS = [
    {"question": "What is the difference between a list and a tuple in Python?", "answer": "Lists are mutable (can be changed after creation) while tuples are immutable. Lists use square brackets [] while tuples use parentheses ().", "difficulty": "easy", "category": "python_basics"},
    {"question": "Explain list comprehensions in Python. Give an example.", "answer": "List comprehensions provide a concise way to create lists. Example: [x**2 for x in range(10)] creates a list of squares from 0 to 9.", "difficulty": "easy", "category": "python_basics"},
    {"question": "What are decorators in Python?", "answer": "Decorators are functions that modify the behavior of other functions. They take a function as input, add functionality, and return a modified function. Example: @property, @staticmethod.", "difficulty": "medium", "category": "python_basics"},
    {"question": "Explain the GIL (Global Interpreter Lock) in Python.", "answer": "The GIL is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecodes simultaneously. This means threads in Python are not truly parallel for CPU-bound tasks.", "difficulty": "hard", "category": "python_basics"},
    {"question": "Implement a function to check if a string is a palindrome.", "answer": "def is_palindrome(s): return s == s[::-1] # Or use two pointers for O(n) time, O(1) space", "difficulty": "easy", "category": "algorithms"},
    {"question": "How would you implement a LRU Cache?", "answer": "Use collections.OrderedDict or functools.lru_cache. Maintain a dictionary for O(1) lookup and a doubly-linked list for O(1) eviction of least recently used items.", "difficulty": "medium", "category": "data_structures"},
    {"question": "Explain the difference between *args and **kwargs.", "answer": "*args collects positional arguments into a tuple. **kwargs collects keyword arguments into a dict. They allow functions to accept variable numbers of arguments.", "difficulty": "easy", "category": "python_basics"},
    {"question": "What is the difference between __str__ and __repr__?", "answer": "__str__ is for informal string representation (user-friendly). __repr__ is for official string representation (should ideally be valid Python code to recreate the object).", "difficulty": "medium", "category": "oop"},
    {"question": "Explain Python's garbage collection mechanism.", "answer": "Python uses reference counting as the primary mechanism. When reference count drops to 0, memory is freed. For circular references, Python has a generational garbage collector that runs periodically.", "difficulty": "hard", "category": "python_basics"},
    {"question": "Implement a singleton pattern in Python.", "answer": "Use __new__ to control instance creation, or use a module-level variable, or use a decorator that caches the instance. Python modules are already singletons by nature.", "difficulty": "medium", "category": "oop"},
]

BEHAVIORAL_QUESTIONS = [
    {"question": "Tell me about a time you led a team through a difficult situation.", "framework": "STAR: Situation (context), Task (your responsibility), Action (what you did), Result (outcome with metrics)", "category": "leadership"},
    {"question": "Describe a time you had a conflict with a coworker and how you resolved it.", "framework": "Focus on professional communication, empathy, finding common ground, and positive outcome.", "category": "conflict"},
    {"question": "Tell me about a time you failed and what you learned from it.", "framework": "Be honest about the failure, take ownership, explain the lesson learned, and show how you've applied it since.", "category": "failure"},
    {"question": "Describe a situation where you had to work under pressure to meet a deadline.", "framework": "Show prioritization, time management, communication with stakeholders, and successful delivery.", "category": "achievement"},
    {"question": "Tell me about a time you went above and beyond for a project.", "framework": "Show initiative, extra effort, impact on the project/team, and recognition if applicable.", "category": "achievement"},
]

MATH_PROBLEMS = [
    {"question": "Solve for x: 2x + 5 = 15", "answer": "x = 5", "difficulty": "easy", "category": "algebra"},
    {"question": "What is the derivative of f(x) = x³ + 2x² - 5x + 1?", "answer": "f'(x) = 3x² + 4x - 5", "difficulty": "medium", "category": "calculus"},
    {"question": "A fair die is rolled twice. What is the probability of getting a sum of 7?", "answer": "6/36 = 1/6 ≈ 16.67%", "difficulty": "medium", "category": "probability"},
]


# ═══════════════════════════════════════════════════════════════════════════════
#  SESSION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

class TrainingSession:
    """Manages a training session with questions, scoring, and feedback."""
    
    def __init__(self, session_type: str, difficulty: str = "medium"):
        self.session_type = session_type
        self.difficulty = difficulty
        self.questions_asked = 0
        self.correct_answers = 0
        self.current_question = None
        self.history = []
        self.template = SESSION_TEMPLATES.get(session_type, {})
    
    def get_next_question(self) -> Dict:
        """Get the next question based on session type."""
        if self.session_type == "python_interview":
            questions = [q for q in PYTHON_QUESTIONS if q["difficulty"] == self.difficulty]
            if not questions:
                questions = PYTHON_QUESTIONS
            self.current_question = random.choice(questions)
        elif self.session_type == "behavioral_interview":
            self.current_question = random.choice(BEHAVIORAL_QUESTIONS)
        elif self.session_type == "math_practice":
            questions = [q for q in MATH_PROBLEMS if q["difficulty"] == self.difficulty]
            if not questions:
                questions = MATH_PROBLEMS
            self.current_question = random.choice(questions)
        else:
            return {"status": "error", "message": "Session type not implemented"}
        
        self.questions_asked += 1
        return {"status": "success", "question": self.current_question, "number": self.questions_asked}
    
    def submit_answer(self, answer: str) -> Dict:
        """Submit an answer and get feedback."""
        if not self.current_question:
            return {"status": "error", "message": "No active question"}
        
        correct_answer = self.current_question.get("answer", "")
        # Simple keyword matching for feedback
        keywords = correct_answer.lower().split()[:5]
        match_score = sum(1 for kw in keywords if kw in answer.lower()) / max(len(keywords), 1)
        
        if match_score > 0.5:
            self.correct_answers += 1
            feedback = "✓ Good answer!"
        elif match_score > 0.2:
            feedback = "~ Partially correct. Consider: " + correct_answer[:100]
        else:
            feedback = "✗ Review: " + correct_answer[:150]
        
        self.history.append({"question": self.current_question, "answer": answer, "feedback": feedback, "score": match_score})
        
        return {"status": "success", "feedback": feedback, "score": round(match_score, 2), "model_answer": correct_answer}
    
    def get_stats(self) -> Dict:
        """Get session statistics."""
        accuracy = (self.correct_answers / max(self.questions_asked, 1)) * 100
        return {
            "session_type": self.session_type,
            "difficulty": self.difficulty,
            "questions_asked": self.questions_asked,
            "correct_answers": self.correct_answers,
            "accuracy": round(accuracy, 1),
            "history": self.history,
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════════

def list_session_types() -> Dict:
    """List all available training session types."""
    return {"status": "success", "types": {k: {"name": v["name"], "description": v["description"], "categories": v["categories"], "levels": v["difficulty_levels"]} for k, v in SESSION_TEMPLATES.items()}}


def start_session(session_type: str, difficulty: str = "medium") -> Dict:
    """Start a new training session."""
    if session_type not in SESSION_TEMPLATES:
        return {"status": "error", "available": list(SESSION_TEMPLATES.keys())}
    
    session = TrainingSession(session_type, difficulty)
    question = session.get_next_question()
    
    return {
        "status": "success",
        "session_type": session_type,
        "difficulty": difficulty,
        "question": question.get("question"),
        "session": session,
    }


def get_question(session: TrainingSession) -> Dict:
    """Get a new question for an existing session."""
    return session.get_next_question()


def submit_answer(session: TrainingSession, answer: str) -> Dict:
    """Submit an answer for the current question."""
    return session.submit_answer(answer)


def get_session_stats(session: TrainingSession) -> Dict:
    """Get statistics for a session."""
    return session.get_stats()


# ═══════════════════════════════════════════════════════════════════════════════
#  FASTAPI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def api_list_sessions() -> Dict:
    return list_session_types()


def api_start_session(session_type: str, difficulty: str = "medium") -> Dict:
    result = start_session(session_type, difficulty)
    # Can't serialize session object, return question only
    if result["status"] == "success":
        return {"status": "success", "session_type": session_type, "difficulty": difficulty, "question": result["question"]}
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 50)
    print("Companion Trainer Demo")
    print("=" * 50)
    
    types = list_session_types()
    print("\nAvailable session types:")
    for key, info in types["types"].items():
        print(f"  {key}: {info['name']} - {info['description']}")
    
    print("\n--- Python Interview Demo (Easy) ---")
    session = TrainingSession("python_interview", "easy")
    for i in range(3):
        q = session.get_next_question()
        print(f"\nQ{i+1}: {q['question']['question']}")
        print(f"   [Test answer: sample answer here]")
        feedback = session.submit_answer("sample answer")
        print(f"   Feedback: {feedback['feedback'][:80]}")
    
    stats = session.get_stats()
    print(f"\nSession Stats: {stats['questions_asked']} questions, {stats['accuracy']:.0f}% accuracy")
