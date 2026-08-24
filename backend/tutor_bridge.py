"""
LUQI AI — Education Tutor Bridge (Companion + OmniLab)
======================================================
Connects the Advanced Companion to the 57 education endpoints,
enabling the companion to act as a personal AI tutor using
OmniLab curriculum, simulators, and training modules.

Key capabilities:
  - Switch companion to "tutor mode" for any subject
  - Retrieve course content and explain concepts
  - Generate practice problems with step-by-step solutions
  - Track learning progress across sessions
  - Use physics simulators for interactive demonstrations
  - Connect to federated learning for personalized difficulty
"""
from __future__ import annotations

import json
import time
from typing import Any, Optional

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = structlog.get_logger("luqi.tutor")

# ── Router ─────────────────────────────────────────────────────────────────
tutor_router = APIRouter(tags=["tutor"])

# ═══════════════════════════════════════════════════════════════════════════
#  Data Models
# ═══════════════════════════════════════════════════════════════════════════

class TutorSessionStart(BaseModel):
    user_id: str
    subject: str = Field(..., description="Subject area: mathematics, physics, chemistry, biology, computer_science, economics, literature")
    level: str = Field(default="intermediate", description="beginner | intermediate | advanced | expert")
    goal: Optional[str] = None
    companion_profile: str = Field(default="archer")  # Archer is the mentor profile

class TutorChatRequest(BaseModel):
    user_id: str
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str

class PracticeProblemRequest(BaseModel):
    user_id: str
    subject: str
    topic: str
    difficulty: str = Field(default="intermediate")
    problem_type: str = Field(default="mixed")  # mixed, multiple_choice, open_ended, calculation, proof

class SimulatorDemoRequest(BaseModel):
    user_id: str
    simulation_type: str = Field(..., description="projectile, pendulum, circuit, wave, orbital, collision, thermodynamics")
    parameters: Optional[dict] = None

class ProgressUpdateRequest(BaseModel):
    user_id: str
    subject: str
    topic: str
    score: float = Field(..., ge=0.0, le=1.0)
    time_spent_minutes: int = Field(default=0, ge=0)

class TutorSessionEnd(BaseModel):
    user_id: str
    session_id: str
    rating: Optional[float] = Field(default=None, ge=1.0, le=5.0)


# ═══════════════════════════════════════════════════════════════════════════
#  Tutor Session Store
# ═══════════════════════════════════════════════════════════════════════════

class TutorSession:
    def __init__(self, user_id: str, subject: str, level: str, session_id: str,
                 companion_profile: str = "archer", goal: Optional[str] = None):
        self.user_id = user_id
        self.subject = subject
        self.level = level
        self.session_id = session_id
        self.companion_profile = companion_profile
        self.goal = goal
        self.started_at = time.time()
        self.messages: list[dict] = []
        self.topics_covered: list[str] = []
        self.problems_solved = 0
        self.total_score = 0.0
        self.active = True

    def add_message(self, role: str, text: str, metadata: Optional[dict] = None) -> None:
        self.messages.append({
            "role": role,
            "text": text,
            "timestamp": time.time(),
            "metadata": metadata or {},
        })

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "subject": self.subject,
            "level": self.level,
            "companion_profile": self.companion_profile,
            "goal": self.goal,
            "started_at": self.started_at,
            "duration_minutes": round((time.time() - self.started_at) / 60, 1),
            "message_count": len(self.messages),
            "topics_covered": self.topics_covered,
            "problems_solved": self.problems_solved,
            "average_score": round(self.total_score / self.problems_solved, 2) if self.problems_solved > 0 else 0,
            "active": self.active,
        }


_sessions: dict[str, TutorSession] = {}

SUBJECT_CATALOG = {
    "mathematics": {
        "description": "Algebra, calculus, geometry, statistics, and number theory",
        "topics": ["algebra", "calculus", "geometry", "statistics", "trigonometry", "linear_algebra", "number_theory"],
        "simulators": ["projectile", "pendulum"],
    },
    "physics": {
        "description": "Mechanics, electromagnetism, thermodynamics, optics, and quantum physics",
        "topics": ["mechanics", "electromagnetism", "thermodynamics", "optics", "quantum", "relativity", "waves"],
        "simulators": ["projectile", "pendulum", "circuit", "wave", "orbital", "collision", "thermodynamics"],
    },
    "chemistry": {
        "description": "Organic, inorganic, physical chemistry, and biochemistry",
        "topics": ["organic", "inorganic", "physical", "biochemistry", "analytical", "electrochemistry"],
        "simulators": ["circuit", "thermodynamics"],
    },
    "biology": {
        "description": "Cell biology, genetics, ecology, evolution, and anatomy",
        "topics": ["cell_biology", "genetics", "ecology", "evolution", "anatomy", "microbiology", "physiology"],
        "simulators": [],
    },
    "computer_science": {
        "description": "Algorithms, data structures, AI, networking, and software engineering",
        "topics": ["algorithms", "data_structures", "ai", "networking", "databases", "security", "software_engineering"],
        "simulators": ["circuit"],
    },
    "economics": {
        "description": "Microeconomics, macroeconomics, econometrics, and behavioral economics",
        "topics": ["micro", "macro", "econometrics", "behavioral", "international", "development"],
        "simulators": [],
    },
    "literature": {
        "description": "Poetry, prose, drama, literary theory, and creative writing",
        "topics": ["poetry", "prose", "drama", "theory", "creative_writing", "criticism"],
        "simulators": [],
    },
}


# ═══════════════════════════════════════════════════════════════════════════
#  Tutor Engine
# ═══════════════════════════════════════════════════════════════════════════

class TutorEngine:
    """
    Core tutoring logic that bridges the companion with education endpoints.
    """

    async def start_session(self, user_id: str, subject: str, level: str,
                           companion_profile: str = "archer", goal: Optional[str] = None) -> dict:
        """Start a new tutoring session."""
        session_id = f"tutor_{user_id}_{int(time.time())}"
        session = TutorSession(user_id, subject, level, session_id, companion_profile, goal)
        _sessions[session_id] = session

        # Switch companion to tutor mode
        from omega_ai.companion_engine import _get_companion
        companion = _get_companion(user_id, companion_profile)
        companion.switch_profile(companion_profile)

        # Generate welcome message
        catalog = SUBJECT_CATALOG.get(subject, {})
        welcome = (
            f"Welcome to your {subject.replace('_', ' ').title()} session! 🎓\n\n"
            f"I'm here to help you with: {catalog.get('description', 'this subject')}.\n\n"
            f"Your level: {level.title()}\n"
        )
        if goal:
            welcome += f"Today's goal: {goal}\n\n"
        welcome += (
            "You can ask me to:\n"
            "• Explain any concept\n"
            "• Generate practice problems\n"
            "• Run a physics simulation\n"
            "• Check your progress\n\n"
            "What would you like to start with?"
        )

        session.add_message("tutor", welcome)

        return {
            "session_id": session_id,
            "welcome_message": welcome,
            "subject": subject,
            "level": level,
            "companion_name": companion.profile["name"],
            "catalog": catalog,
        }

    async def chat(self, session_id: str, message: str) -> dict:
        """Process a tutoring chat message."""
        if session_id not in _sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        session = _sessions[session_id]
        session.add_message("student", message)

        # Use companion for response, but with tutoring context
        from omega_ai.companion_engine import _get_companion
        companion = _get_companion(session.user_id, session.companion_profile)

        # Inject tutoring context into the conversation
        context = (
            f"[TUTOR MODE: Subject={session.subject}, Level={session.level}, "
            f"Goal={session.goal or 'general learning'}] "
        )
        result = await companion.chat(context + message)

        session.add_message("tutor", result["response"], {
            "emotion": result.get("emotion"),
            "memories_used": result.get("memories_used"),
        })

        return {
            "response": result["response"],
            "session_id": session_id,
            "subject": session.subject,
            "emotion": result.get("emotion"),
            "memories_used": result.get("memories_used", 0),
            "trust_score": result.get("trust_score", 0),
            "message_count": len(session.messages),
        }

    async def generate_problem(self, user_id: str, subject: str, topic: str,
                                difficulty: str, problem_type: str) -> dict:
        """Generate a practice problem with solution."""
        # In production: this would call the education engine
        problems_db = {
            ("mathematics", "algebra", "beginner"): {
                "question": "Solve for x: 2x + 5 = 13",
                "solution": "Subtract 5 from both sides: 2x = 8. Divide by 2: x = 4.",
                "hints": ["Isolate the term with x", "Divide by the coefficient"],
                "answer": "4",
            },
            ("mathematics", "calculus", "intermediate"): {
                "question": "Find the derivative of f(x) = x³ + 2x² - 5x + 1",
                "solution": "Using the power rule: f'(x) = 3x² + 4x - 5",
                "hints": ["Apply power rule to each term", "d/dx(x^n) = nx^(n-1)"],
                "answer": "3x² + 4x - 5",
            },
            ("physics", "mechanics", "intermediate"): {
                "question": "A 2kg object accelerates at 3 m/s². What is the net force?",
                "solution": "Using Newton's Second Law: F = ma = 2 kg × 3 m/s² = 6 N",
                "hints": ["Recall F = ma", "Substitute the given values"],
                "answer": "6 N",
            },
            ("computer_science", "algorithms", "intermediate"): {
                "question": "What is the time complexity of binary search on a sorted array?",
                "solution": "Binary search divides the search space in half each iteration, giving O(log n) time complexity.",
                "hints": ["How many times can you divide n by 2?", "Think logarithmic growth"],
                "answer": "O(log n)",
            },
        }

        problem = problems_db.get((subject, topic, difficulty), {
            "question": f"[Generate a {difficulty} {problem_type} problem about {topic} in {subject}]",
            "solution": "[Step-by-step solution would be generated by the education engine]",
            "hints": ["Hint 1", "Hint 2"],
            "answer": "[Answer]",
        })

        return {
            "subject": subject,
            "topic": topic,
            "difficulty": difficulty,
            "type": problem_type,
            "question": problem["question"],
            "solution": problem["solution"],
            "hints": problem["hints"],
            "answer": problem["answer"],
            "timestamp": time.time(),
        }

    async def run_simulator(self, user_id: str, simulation_type: str, parameters: Optional[dict]) -> dict:
        """Run a physics simulator for interactive demonstration."""
        # Bridge to education_endpoints simulators
        sim_params = parameters or {}

        simulators = {
            "projectile": {
                "description": "Projectile motion simulation",
                "default_params": {"velocity": 20, "angle": 45, "gravity": 9.81, "height": 0},
                "output": ["trajectory", "max_height", "range", "flight_time"],
            },
            "pendulum": {
                "description": "Simple pendulum simulation",
                "default_params": {"length": 1.0, "mass": 0.5, "amplitude": 15, "gravity": 9.81},
                "output": ["period", "frequency", "energy", "motion_graph"],
            },
            "circuit": {
                "description": "Electrical circuit simulation",
                "default_params": {"voltage": 12, "resistance": 100, "components": ["resistor", "led"]},
                "output": ["current", "power", "voltage_drop", "circuit_diagram"],
            },
            "wave": {
                "description": "Wave mechanics simulation",
                "default_params": {"amplitude": 2, "frequency": 5, "wavelength": 0.5, "medium": "air"},
                "output": ["wave_equation", "propagation", "interference_pattern"],
            },
            "orbital": {
                "description": "Orbital mechanics simulation",
                "default_params": {"central_mass": 1e30, "orbiting_mass": 6e24, "distance": 1.5e11, "eccentricity": 0.0167},
                "output": ["orbital_period", "velocity", "aphelion", "perihelion"],
            },
            "collision": {
                "description": "Elastic and inelastic collision simulation",
                "default_params": {"mass1": 1, "velocity1": 5, "mass2": 2, "velocity2": -2, "type": "elastic"},
                "output": ["final_velocities", "momentum", "kinetic_energy", "collision_graph"],
            },
            "thermodynamics": {
                "description": "Thermodynamic process simulation",
                "default_params": {"process": "isothermal", "initial_temp": 300, "initial_volume": 1, "final_volume": 2},
                "output": ["work_done", "heat_transfer", "entropy_change", "pv_diagram"],
            },
        }

        sim = simulators.get(simulation_type)
        if not sim:
            raise HTTPException(status_code=400, detail=f"Unknown simulation type: {simulation_type}")

        merged_params = {**sim["default_params"], **sim_params}

        return {
            "simulation_type": simulation_type,
            "description": sim["description"],
            "parameters": merged_params,
            "expected_outputs": sim["output"],
            "status": "ready",
            "note": "In production, this would execute the actual physics simulator from education_endpoints",
        }

    async def update_progress(self, user_id: str, subject: str, topic: str,
                             score: float, time_spent: int) -> dict:
        """Update learning progress for a student."""
        # Store in companion memory for cross-session persistence
        from omega_ai.companion_engine import _get_companion
        companion = _get_companion(user_id)
        companion.memory.add_memory(
            content=f"Completed {topic} in {subject} with score {score:.0%} after {time_spent} minutes",
            category="education",
            importance=0.7,
            metadata={"subject": subject, "topic": topic, "score": score, "time_spent": time_spent},
        )

        # Determine mastery level
        mastery = "beginner" if score < 0.5 else "intermediate" if score < 0.8 else "advanced"

        return {
            "user_id": user_id,
            "subject": subject,
            "topic": topic,
            "score": score,
            "mastery": mastery,
            "time_spent_minutes": time_spent,
            "next_recommended": self._recommend_next(subject, topic, mastery),
        }

    def _recommend_next(self, subject: str, topic: str, mastery: str) -> str:
        """Recommend the next topic based on current mastery."""
        recommendations = {
            ("mathematics", "algebra", "advanced"): "calculus",
            ("mathematics", "calculus", "advanced"): "linear_algebra",
            ("physics", "mechanics", "advanced"): "electromagnetism",
            ("physics", "electromagnetism", "advanced"): "quantum",
            ("computer_science", "algorithms", "advanced"): "ai",
        }
        return recommendations.get((subject, topic, mastery), "review_fundamentals")

    async def end_session(self, session_id: str, rating: Optional[float]) -> dict:
        """End a tutoring session."""
        if session_id not in _sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        session = _sessions[session_id]
        session.active = False
        duration = round((time.time() - session.started_at) / 60, 1)

        # Save session summary to companion memory
        from omega_ai.companion_engine import _get_companion
        companion = _get_companion(session.user_id)
        companion.memory.add_memory(
            content=f"Tutor session on {session.subject} lasted {duration}min. Topics: {', '.join(session.topics_covered)}",
            category="education",
            importance=0.6,
            metadata={"session_id": session_id, "duration": duration, "rating": rating},
        )

        return {
            "session_id": session_id,
            "status": "ended",
            "duration_minutes": duration,
            "topics_covered": session.topics_covered,
            "problems_solved": session.problems_solved,
            "rating": rating,
            "average_score": round(session.total_score / session.problems_solved, 2) if session.problems_solved > 0 else 0,
        }

    def get_catalog(self) -> dict:
        """Get full subject catalog."""
        return SUBJECT_CATALOG


# ═══════════════════════════════════════════════════════════════════════════
#  REST API Endpoints
# ═══════════════════════════════════════════════════════════════════════════

engine = TutorEngine()

@tutor_router.post("/tutor/session/start")
async def start_session(request: TutorSessionStart):
    """Start a new tutoring session."""
    result = await engine.start_session(
        request.user_id, request.subject, request.level,
        request.companion_profile, request.goal,
    )
    return result

@tutor_router.post("/tutor/session/chat")
async def tutor_chat(request: TutorChatRequest):
    """Send a message within an active tutoring session."""
    result = await engine.chat(request.session_id, request.message)
    return result

@tutor_router.get("/tutor/session/{session_id}")
async def get_session(session_id: str):
    """Get current session status."""
    if session_id not in _sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return _sessions[session_id].to_dict()

@tutor_router.post("/tutor/session/end")
async def end_session(request: TutorSessionEnd):
    """End a tutoring session."""
    result = await engine.end_session(request.session_id, request.rating)
    return result

@tutor_router.get("/tutor/catalog")
async def get_catalog():
    """Get full subject catalog with available topics and simulators."""
    return {"subjects": engine.get_catalog(), "count": len(SUBJECT_CATALOG)}

@tutor_router.post("/tutor/problem")
async def generate_problem(request: PracticeProblemRequest):
    """Generate a practice problem with solution."""
    result = await engine.generate_problem(
        request.user_id, request.subject, request.topic,
        request.difficulty, request.problem_type,
    )
    return result

@tutor_router.post("/tutor/simulator")
async def run_simulator(request: SimulatorDemoRequest):
    """Run a physics simulator for interactive demonstration."""
    result = await engine.run_simulator(
        request.user_id, request.simulation_type, request.parameters,
    )
    return result

@tutor_router.post("/tutor/progress")
async def update_progress(request: ProgressUpdateRequest):
    """Update learning progress for a topic."""
    result = await engine.update_progress(
        request.user_id, request.subject, request.topic,
        request.score, request.time_spent_minutes,
    )
    return result

@tutor_router.get("/tutor/user/{user_id}/progress")
async def get_user_progress(user_id: str):
    """Get learning progress summary for a user."""
    from omega_ai.companion_engine import _get_companion
    companion = _get_companion(user_id)
    education_memories = [
        m.to_dict() for m in companion.memory.recall("education learning", top_k=20)
        if m.category == "education"
    ]
    return {
        "user_id": user_id,
        "education_memories": education_memories,
        "memory_count": len(education_memories),
        "companion_name": companion.profile["name"],
    }

# ── Router export ──────────────────────────────────────────────────────────
router = tutor_router
