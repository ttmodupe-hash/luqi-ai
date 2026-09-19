#!/usr/bin/env python3
"""
Education Endpoints — Luqi AI curriculum, lessons, quizzes, progress (REBUILT)

Rebuild note (2026-09-19): the original backend/education_endpoints.py never
contained real code on GitHub — it was a 13-byte PASTE_CONTENT placeholder at
every commit (the module described in commit c5ba4070 existed only on the
author's local machine). This is a from-scratch replacement:

- REAL seeded curriculum content (SA CAPS-aligned school tracks + TVET +
  financial literacy), not generated filler
- Deterministic server-side quiz scoring — correct answers never leave the
  server (the /quiz endpoint strips them)
- SQLite persistence (stdlib) for attempts and progress — same storage
  family the app already uses; tables self-create and seed idempotently
- Auth consistency: v25-era modules in this repo are unauthenticated;
  user_id is a client-supplied key here (same trust level as feedback_api).
  Harden when the unified auth layer lands (unification queue).

Mounted at /api/education by main.py mount_routers().
"""
import json
import logging
import sqlite3
import threading
import time
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("luqi.education")

router = APIRouter(tags=["education"])

_lock = threading.Lock()
_db_path = None  # resolved lazily from settings
_memo_conn = None  # shared connection for the :memory: fallback (one DB per process)


# ── Seed content (real, CAPS-aligned) ────────────────────────────────────

TRACKS = [
    {
        "code": "MATH-G8", "title": "Grade 8 Mathematics",
        "description": "Core CAPS Grade 8 maths: fractions, integers, and first algebra.",
        "level": "school", "grade": "8",
    },
    {
        "code": "PHYS-G10", "title": "Grade 10 Physical Sciences",
        "description": "Electric circuits and energy — CAPS Grade 10 physics foundations.",
        "level": "school", "grade": "10",
    },
    {
        "code": "LIFE-G11", "title": "Grade 11 Life Sciences",
        "description": "Photosynthesis and cellular energy — CAPS Grade 11 biology.",
        "level": "school", "grade": "11",
    },
    {
        "code": "ENG-G9", "title": "Grade 9 English First Additional Language",
        "description": "Parts of speech and sentence construction for FAL learners.",
        "level": "school", "grade": "9",
    },
    {
        "code": "TVET-ELEC", "title": "TVET Electronics Foundations",
        "description": "Ohm's law and circuit analysis for TVET electrical studies.",
        "level": "tvet", "grade": None,
    },
    {
        "code": "FINLIT", "title": "Financial Literacy",
        "description": "Budgeting, saving, and interest — practical money skills.",
        "level": "adult", "grade": None,
    },
]

LESSONS = [
    # ── Grade 8 Mathematics ──
    {
        "id": "math-g8-fractions", "track": "MATH-G8", "seq": 1,
        "title": "Adding and Subtracting Fractions",
        "minutes": 25,
        "content": (
            "A fraction names equal parts of a whole: the denominator (bottom) says how many "
            "equal parts the whole is cut into; the numerator (top) says how many of those parts "
            "you have.\n\n"
            "To add or subtract fractions they must share a common denominator. "
            "Example: 1/2 + 1/4. Rewrite 1/2 as 2/4, then 2/4 + 1/4 = 3/4.\n\n"
            "If denominators are unrelated, multiply them to find a common one: "
            "1/3 + 1/4 = 4/12 + 3/12 = 7/12.\n\n"
            "Always simplify the answer if numerator and denominator share a factor: "
            "6/8 = 3/4 (divide both by 2)."
        ),
        "quiz": [
            {
                "q": "What is 1/2 + 1/4?",
                "options": ["1/6", "3/4", "2/6", "1/4"],
                "answer": 1,
                "why": "Rewrite 1/2 as 2/4, then 2/4 + 1/4 = 3/4.",
            },
            {
                "q": "What is 1/3 + 1/4 in twelfths?",
                "options": ["2/12", "7/12", "5/12", "4/7"],
                "answer": 1,
                "why": "1/3 = 4/12 and 1/4 = 3/12, so the sum is 7/12.",
            },
            {
                "q": "Simplify 6/8.",
                "options": ["2/4", "3/4", "1/2", "6/8 is already simplest"],
                "answer": 1,
                "why": "Divide numerator and denominator by 2: 6/8 = 3/4.",
            },
        ],
    },
    {
        "id": "math-g8-algebra", "track": "MATH-G8", "seq": 2,
        "title": "Solving One-Step and Two-Step Equations",
        "minutes": 30,
        "content": (
            "An equation says two expressions are equal. Solving means finding the unknown "
            "value that keeps both sides balanced.\n\n"
            "Golden rule: whatever you do to one side, do to the other.\n\n"
            "One-step: x + 5 = 12 → subtract 5 from both sides → x = 7.\n\n"
            "Two-step: 2x + 3 = 11 → subtract 3 → 2x = 8 → divide by 2 → x = 4.\n\n"
            "Check your answer by substituting back: 2(4) + 3 = 11 ✓."
        ),
        "quiz": [
            {
                "q": "Solve: x + 5 = 12",
                "options": ["x = 7", "x = 17", "x = 5", "x = 60"],
                "answer": 0,
                "why": "Subtract 5 from both sides: x = 12 − 5 = 7.",
            },
            {
                "q": "Solve: 2x + 3 = 11",
                "options": ["x = 7", "x = 4", "x = 8", "x = 14"],
                "answer": 1,
                "why": "2x = 11 − 3 = 8, then x = 8 ÷ 2 = 4.",
            },
            {
                "q": "Solve: 3x = 21",
                "options": ["x = 18", "x = 24", "x = 7", "x = 63"],
                "answer": 2,
                "why": "Divide both sides by 3: x = 21 ÷ 3 = 7.",
            },
        ],
    },
    # ── Grade 10 Physical Sciences ──
    {
        "id": "phys-g10-circuits", "track": "PHYS-G10", "seq": 1,
        "title": "Series and Parallel Circuits",
        "minutes": 35,
        "content": (
            "In a SERIES circuit there is only one path for current. The same current flows "
            "through every component, and the voltages across components add up to the supply "
            "voltage. If one bulb breaks, the whole circuit goes open.\n\n"
            "In a PARALLEL circuit each component has its own branch. Every branch gets the "
            "full supply voltage, and the branch currents add up to the total current. A "
            "broken branch does not stop the others — this is why houses are wired in parallel.\n\n"
            "Resistance: series resistances add (R = R₁ + R₂); parallel resistances combine "
            "to LESS than the smallest branch."
        ),
        "quiz": [
            {
                "q": "Two 4 Ω resistors in series give a total resistance of:",
                "options": ["2 Ω", "4 Ω", "8 Ω", "16 Ω"],
                "answer": 2,
                "why": "Series resistances add: 4 Ω + 4 Ω = 8 Ω.",
            },
            {
                "q": "In a parallel circuit, each branch receives:",
                "options": [
                    "Half the supply voltage",
                    "The full supply voltage",
                    "Voltage divided by resistance",
                    "No voltage",
                ],
                "answer": 1,
                "why": "Every parallel branch connects across the same supply.",
            },
            {
                "q": "Why are home circuits wired in parallel?",
                "options": [
                    "To save wire",
                    "So one faulty appliance does not cut power to the rest",
                    "To increase resistance",
                    "To reduce voltage",
                ],
                "answer": 1,
                "why": "Each branch works independently; a fault in one leaves the others live.",
            },
        ],
    },
    {
        "id": "phys-g10-energy", "track": "PHYS-G10", "seq": 2,
        "title": "Kinetic and Potential Energy",
        "minutes": 30,
        "content": (
            "Energy is the ability to do work, measured in joules (J).\n\n"
            "KINETIC energy is the energy of motion: Ek = ½mv². Double the speed and the "
            "kinetic energy quadruples — this is why braking distance grows so fast.\n\n"
            "GRAVITATIONAL POTENTIAL energy is stored by height: Ep = mgh, with "
            "g ≈ 9,8 m/s² on Earth.\n\n"
            "Conservation: in a closed system energy is neither created nor destroyed, only "
            "transferred between stores. A falling object trades potential for kinetic energy."
        ),
        "quiz": [
            {
                "q": "Ek = ½mv². If an object's speed doubles, its kinetic energy becomes:",
                "options": ["Double", "Half", "Four times greater", "Unchanged"],
                "answer": 2,
                "why": "Ek depends on v²: (2v)² = 4v², so energy quadruples.",
            },
            {
                "q": "Ep = mgh. A 2 kg object held 5 m up (g = 9,8 m/s²) has potential energy of:",
                "options": ["10 J", "49 J", "98 J", "980 J"],
                "answer": 2,
                "why": "Ep = 2 × 9,8 × 5 = 98 J.",
            },
            {
                "q": "The law of conservation of energy says energy is:",
                "options": [
                    "Created when fuel burns",
                    "Destroyed by friction",
                    "Only transferred or transformed, never created or destroyed",
                    "Always stored as heat",
                ],
                "answer": 2,
                "why": "Burning and friction transform energy into other stores; the total is constant.",
            },
        ],
    },
    # ── Grade 11 Life Sciences ──
    {
        "id": "life-g11-photosynthesis", "track": "LIFE-G11", "seq": 1,
        "title": "Photosynthesis",
        "minutes": 30,
        "content": (
            "Photosynthesis is the process by which green plants convert light energy into "
            "chemical energy stored in glucose.\n\n"
            "Word equation: carbon dioxide + water →(light energy, chlorophyll)→ glucose + oxygen.\n\n"
            "Balanced symbol equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.\n\n"
            "The light-dependent stage happens in the thylakoid membranes of the chloroplast "
            "and splits water (photolysis), releasing O₂. The light-independent stage (Calvin "
            "cycle) in the stroma fixes CO₂ into glucose.\n\n"
            "Chlorophyll absorbs mainly red and blue light and reflects green — which is why "
            "leaves look green."
        ),
        "quiz": [
            {
                "q": "The oxygen released by photosynthesis comes from:",
                "options": ["Carbon dioxide", "Water", "Glucose", "Chlorophyll"],
                "answer": 1,
                "why": "Photolysis splits water molecules in the light-dependent stage, releasing O₂.",
            },
            {
                "q": "Which molecule stores the chemical energy produced by photosynthesis?",
                "options": ["Oxygen", "Chlorophyll", "Glucose", "Carbon dioxide"],
                "answer": 2,
                "why": "Glucose (C₆H₁₂O₆) is the energy store built in the Calvin cycle.",
            },
            {
                "q": "Leaves appear green because chlorophyll:",
                "options": [
                    "Absorbs green light",
                    "Reflects green light",
                    "Produces green light",
                    "Stores green light",
                ],
                "answer": 1,
                "why": "Chlorophyll absorbs red and blue light and reflects green wavelengths.",
            },
        ],
    },
    # ── Grade 9 English FAL ──
    {
        "id": "eng-g9-parts-of-speech", "track": "ENG-G9", "seq": 1,
        "title": "Parts of Speech",
        "minutes": 20,
        "content": (
            "Every word in a sentence plays a role.\n\n"
            "NOUN — names a person, place, thing or idea (teacher, Soweto, pencil, freedom).\n"
            "VERB — shows an action or state (run, is, think).\n"
            "ADJECTIVE — describes a noun (tall, bright, three).\n"
            "ADVERB — describes a verb, adjective or other adverb (quickly, very).\n"
            "PRONOUN — replaces a noun (she, it, they).\n"
            "PREPOSITION — shows relationship (on, under, between).\n"
            "CONJUNCTION — joins words or clauses (and, but, because).\n\n"
            "Example: 'The tired learner quickly finished her difficult homework.' — "
            "tired (adjective), learner (noun), quickly (adverb), finished (verb), "
            "her (pronoun), difficult (adjective), homework (noun)."
        ),
        "quiz": [
            {
                "q": "In 'She sang beautifully', the word 'beautifully' is a/an:",
                "options": ["Adjective", "Adverb", "Verb", "Noun"],
                "answer": 1,
                "why": "It describes HOW she sang — adverbs modify verbs.",
            },
            {
                "q": "In 'The tall boy kicked the ball', which word is the adjective?",
                "options": ["boy", "kicked", "tall", "ball"],
                "answer": 2,
                "why": "'Tall' describes the noun 'boy'.",
            },
            {
                "q": "Which word is a conjunction?",
                "options": ["under", "because", "they", "quickly"],
                "answer": 1,
                "why": "'Because' joins clauses — a conjunction. 'Under' is a preposition.",
            },
        ],
    },
    # ── TVET Electronics ──
    {
        "id": "tvet-elec-ohms-law", "track": "TVET-ELEC", "seq": 1,
        "title": "Ohm's Law",
        "minutes": 25,
        "content": (
            "Ohm's law links voltage (V, volts), current (I, amperes) and resistance "
            "(R, ohms): V = I × R.\n\n"
            "Rearrange to solve for any quantity: I = V / R and R = V / I.\n\n"
            "Example: a 12 V supply across a 4 Ω resistor drives I = 12 / 4 = 3 A.\n\n"
            "Power: P = V × I. That same circuit dissipates 12 V × 3 A = 36 W — size your "
            "components for the wattage or they overheat."
        ),
        "quiz": [
            {
                "q": "A 12 V supply is connected across a 4 Ω resistor. The current is:",
                "options": ["48 A", "3 A", "0,33 A", "8 A"],
                "answer": 1,
                "why": "I = V / R = 12 V / 4 Ω = 3 A.",
            },
            {
                "q": "If resistance doubles while voltage stays the same, the current:",
                "options": ["Doubles", "Halves", "Stays the same", "Quadruples"],
                "answer": 1,
                "why": "I = V / R — current is inversely proportional to resistance.",
            },
            {
                "q": "The power dissipated by a 12 V circuit drawing 3 A is:",
                "options": ["4 W", "15 W", "36 W", "9 W"],
                "answer": 2,
                "why": "P = V × I = 12 × 3 = 36 W.",
            },
        ],
    },
    # ── Financial Literacy ──
    {
        "id": "finlit-budgeting", "track": "FINLIT", "seq": 1,
        "title": "Building a Budget",
        "minutes": 20,
        "content": (
            "A budget is a plan for your money before the month begins.\n\n"
            "Step 1: list your NET income (what actually lands in your account).\n"
            "Step 2: list fixed costs (rent, transport, debit orders) and variable costs "
            "(food, airtime, entertainment).\n"
            "Step 3: pay yourself first — move savings the day you get paid, not with what "
            "is left over. Even 10% builds the habit.\n\n"
            "If expenses exceed income, cut variable costs first. Track every rand for one "
            "month to find the leaks."
        ),
        "quiz": [
            {
                "q": "Your net income is R5 000 and expenses are R4 600. Your monthly surplus is:",
                "options": ["R9 600", "R400", "R460", "R4 600"],
                "answer": 1,
                "why": "Surplus = income − expenses = 5 000 − 4 600 = R400.",
            },
            {
                "q": "The 'pay yourself first' rule means:",
                "options": [
                    "Spend on yourself before paying bills",
                    "Move savings aside on payday, before other spending",
                    "Pay debts only when reminded",
                    "Buy essentials last",
                ],
                "answer": 1,
                "why": "Saving first makes it consistent; saving 'what is left' usually means saving nothing.",
            },
        ],
    },
    {
        "id": "finlit-interest", "track": "FINLIT", "seq": 2,
        "title": "Simple Interest",
        "minutes": 20,
        "content": (
            "Interest is the price of money — earned when you save, paid when you borrow.\n\n"
            "SIMPLE interest is calculated only on the original amount (the principal):\n"
            "Interest = P × r × t, where r is the annual rate and t is the time in years.\n\n"
            "Example: R1 000 saved at 5% per year for 2 years earns "
            "1 000 × 0,05 × 2 = R100, giving R1 100 in total.\n\n"
            "Compound interest (next lesson) earns interest on interest — that is where "
            "real growth (or real debt trouble) comes from."
        ),
        "quiz": [
            {
                "q": "R1 000 at 5% simple interest for 2 years earns:",
                "options": ["R50", "R100", "R105", "R1 000"],
                "answer": 1,
                "why": "1 000 × 0,05 × 2 = R100.",
            },
            {
                "q": "R2 000 borrowed at 10% simple interest for 1 year must be repaid as:",
                "options": ["R2 100", "R2 200", "R2 010", "R3 000"],
                "answer": 1,
                "why": "Interest = 2 000 × 0,10 × 1 = R200; total = 2 000 + 200 = R2 200.",
            },
        ],
    },
]

# ── Persistence (stdlib sqlite, self-initializing) ───────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS edu_tracks (
    code TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
    level TEXT, grade TEXT);
CREATE TABLE IF NOT EXISTS edu_lessons (
    id TEXT PRIMARY KEY, track TEXT NOT NULL REFERENCES edu_tracks(code),
    seq INTEGER NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
    minutes INTEGER DEFAULT 20);
CREATE TABLE IF NOT EXISTS edu_quiz (
    lesson_id TEXT NOT NULL REFERENCES edu_lessons(id),
    q_index INTEGER NOT NULL, question TEXT NOT NULL,
    options TEXT NOT NULL, answer INTEGER NOT NULL, why TEXT NOT NULL,
    PRIMARY KEY (lesson_id, q_index));
CREATE TABLE IF NOT EXISTS edu_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL, lesson_id TEXT NOT NULL,
    score_pct REAL NOT NULL, correct INTEGER NOT NULL, total INTEGER NOT NULL,
    at REAL NOT NULL);
CREATE INDEX IF NOT EXISTS idx_edu_attempts_user ON edu_attempts(user_id);
"""


def _connect() -> sqlite3.Connection:
    """Resolve the DB path lazily (settings import at module load is avoided
    so the router can be imported/tested standalone), create schema, and seed
    the curriculum exactly once."""
    global _db_path, _memo_conn
    with _lock:
        if _db_path is None:
            try:
                from config import settings
                _db_path = str(settings.DATA_DIR / "education.db")
            except Exception:
                _db_path = ":memory:"  # standalone/test use
        if _db_path == ":memory:":
            # In-memory fallback must share ONE connection - a fresh connect
            # would get an empty database and lose all progress.
            if _memo_conn is None:
                _memo_conn = sqlite3.connect(":memory:", check_same_thread=False)
            conn = _memo_conn
        else:
            conn = sqlite3.connect(_db_path, timeout=15)
        conn.row_factory = sqlite3.Row
        conn.executescript(_SCHEMA)
        seeded = conn.execute("SELECT COUNT(*) FROM edu_tracks").fetchone()[0]
        if seeded == 0:
            for t in TRACKS:
                conn.execute(
                    "INSERT INTO edu_tracks (code, title, description, level, grade) VALUES (?,?,?,?,?)",
                    (t["code"], t["title"], t["description"], t["level"], t["grade"]),
                )
            for l in LESSONS:
                conn.execute(
                    "INSERT INTO edu_lessons (id, track, seq, title, content, minutes) VALUES (?,?,?,?,?,?)",
                    (l["id"], l["track"], l["seq"], l["title"], l["content"], l["minutes"]),
                )
                for i, q in enumerate(l["quiz"]):
                    conn.execute(
                        "INSERT INTO edu_quiz (lesson_id, q_index, question, options, answer, why) "
                        "VALUES (?,?,?,?,?,?)",
                        (l["id"], i, q["q"], json.dumps(q["options"]), q["answer"], q["why"]),
                    )
        conn.commit()
        return conn


def _lesson_or_404(conn: sqlite3.Connection, lesson_id: str) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM edu_lessons WHERE id = ?", (lesson_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Lesson '{lesson_id}' not found.")
    return row


class QuizSubmission(BaseModel):
    user_id: str = Field(min_length=1, max_length=120)
    answers: List[int] = Field(min_length=1)


# ── Routes ───────────────────────────────────────────────────────────────

@router.get("/tracks")
async def list_tracks():
    """All curriculum tracks with lesson counts."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT t.*, COUNT(l.id) AS lesson_count, COALESCE(SUM(l.minutes), 0) AS total_minutes "
            "FROM edu_tracks t LEFT JOIN edu_lessons l ON l.track = t.code "
            "GROUP BY t.code ORDER BY t.level, t.grade"
        ).fetchall()
        return {"tracks": [dict(r) for r in rows]}


@router.get("/tracks/{track_code}")
async def track_detail(track_code: str):
    """Track detail with its lesson outline."""
    with _connect() as conn:
        track = conn.execute("SELECT * FROM edu_tracks WHERE code = ?", (track_code,)).fetchone()
        if track is None:
            raise HTTPException(status_code=404, detail=f"Track '{track_code}' not found.")
        lessons = conn.execute(
            "SELECT id, seq, title, minutes FROM edu_lessons WHERE track = ? ORDER BY seq",
            (track_code,),
        ).fetchall()
        return {**dict(track), "lessons": [dict(l) for l in lessons]}


@router.get("/lessons/{lesson_id}")
async def lesson_detail(lesson_id: str):
    """Full lesson content."""
    with _connect() as conn:
        row = _lesson_or_404(conn, lesson_id)
        question_count = conn.execute(
            "SELECT COUNT(*) FROM edu_quiz WHERE lesson_id = ?", (lesson_id,)
        ).fetchone()[0]
        return {**dict(row), "quiz_questions": question_count}


@router.get("/lessons/{lesson_id}/quiz")
async def lesson_quiz(lesson_id: str):
    """Quiz questions WITHOUT answers — scoring is server-side only."""
    with _connect() as conn:
        _lesson_or_404(conn, lesson_id)
        rows = conn.execute(
            "SELECT q_index, question, options FROM edu_quiz WHERE lesson_id = ? ORDER BY q_index",
            (lesson_id,),
        ).fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="This lesson has no quiz.")
        return {
            "lesson_id": lesson_id,
            "questions": [
                {"index": r["q_index"], "question": r["question"], "options": json.loads(r["options"])}
                for r in rows
            ],
        }


@router.post("/lessons/{lesson_id}/quiz/submit")
async def submit_quiz(lesson_id: str, sub: QuizSubmission):
    """Deterministic server-side scoring; persists the attempt for progress."""
    with _connect() as conn:
        _lesson_or_404(conn, lesson_id)
        rows = conn.execute(
            "SELECT q_index, question, options, answer, why FROM edu_quiz "
            "WHERE lesson_id = ? ORDER BY q_index",
            (lesson_id,),
        ).fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="This lesson has no quiz.")
        if len(sub.answers) != len(rows):
            raise HTTPException(
                status_code=400,
                detail=f"Expected {len(rows)} answers, got {len(sub.answers)}.",
            )
        results = []
        correct = 0
        for r, chosen in zip(rows, sub.answers):
            options = json.loads(r["options"])
            if not (0 <= chosen < len(options)):
                raise HTTPException(status_code=400, detail=f"Answer {chosen} out of range.")
            is_right = chosen == r["answer"]
            correct += is_right
            results.append({
                "index": r["q_index"],
                "question": r["question"],
                "correct": is_right,
                "chosen_option": options[chosen],
                "correct_option": options[r["answer"]],
                "explanation": r["why"],
            })
        total = len(rows)
        score_pct = round(100.0 * correct / total, 1)
        conn.execute(
            "INSERT INTO edu_attempts (user_id, lesson_id, score_pct, correct, total, at) "
            "VALUES (?,?,?,?,?,?)",
            (sub.user_id[:120], lesson_id, score_pct, correct, total, time.time()),
        )
        conn.commit()
        return {
            "lesson_id": lesson_id,
            "score_pct": score_pct,
            "correct": correct,
            "total": total,
            "passed": score_pct >= 70.0,
            "results": results,
        }


@router.get("/progress/{user_id}")
async def user_progress(user_id: str):
    """Per-user progress: attempts, averages, and per-track completion."""
    with _connect() as conn:
        attempts = conn.execute(
            "SELECT lesson_id, MAX(score_pct) AS best, COUNT(*) AS tries, MAX(at) AS last_at "
            "FROM edu_attempts WHERE user_id = ? GROUP BY lesson_id",
            (user_id[:120],),
        ).fetchall()
        lessons_done = {a["lesson_id"] for a in attempts if a["best"] >= 70.0}
        total_lessons = conn.execute("SELECT COUNT(*) FROM edu_lessons").fetchone()[0]
        per_track = []
        for t in conn.execute("SELECT code, title FROM edu_tracks ORDER BY code").fetchall():
            track_lessons = {
                r[0] for r in conn.execute(
                    "SELECT id FROM edu_lessons WHERE track = ?", (t["code"],)
                ).fetchall()
            }
            done = len(track_lessons & lessons_done)
            per_track.append({
                "track": t["code"], "title": t["title"],
                "lessons_completed": done, "lessons_total": len(track_lessons),
                "complete": bool(track_lessons) and done == len(track_lessons),
            })
        best_scores = [a["best"] for a in attempts]
        return {
            "user_id": user_id,
            "lessons_passed": len(lessons_done),
            "lessons_total": total_lessons,
            "average_best_score": round(sum(best_scores) / len(best_scores), 1) if best_scores else None,
            "attempts": [
                {"lesson_id": a["lesson_id"], "best_score": a["best"], "tries": a["tries"]}
                for a in attempts
            ],
            "tracks": per_track,
        }


@router.get("/search")
async def search_lessons(q: str):
    """Search lessons by title or content."""
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required.")
    term = f"%{q.strip()[:80]}%"
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, track, title, minutes FROM edu_lessons "
            "WHERE title LIKE ? OR content LIKE ? ORDER BY track, seq LIMIT 20",
            (term, term),
        ).fetchall()
        return {"query": q.strip(), "results": [dict(r) for r in rows]}
