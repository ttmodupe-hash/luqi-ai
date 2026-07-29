"""
LUQI AI — OmniLab Evolver: Autonomous Curriculum Engine
=========================================================
Self-updating STEM lab system that evolves its own curriculum by
cycling through educational standards from 6 global superpowers and
generating practical, resource-light experiments.

Integrates with OmniLab Academies Hexagonal Global Matrix.
Features SePitori (South African township language) translations.

v29.0.0 — Enhanced from standalone server.py into LUQI AI capability
"""
from __future__ import annotations
import json
import time
import sqlite3
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# =============================================================================
# SEPITORI PHRASE ENGINE
# =============================================================================

SEPITORI_PHRASES: Dict[str, List[str]] = {
    "thermal": [
        "Re cheka mofuthu wa letsatsi le mahlasedi re sebelisa di-can tse pedi, e ntsho le e shiny. O tlo bona efe e gowfelang pele bafethu.",
        "Tswaya di-can tse pedi, e ntsho le e shiny. E ntsho e tla gowa ka bokgoni ka ge e amogela mofuthu.",
    ],
    "gravity": [
        "Re dabolola dipalo tsa pendulum re sebelisa tateo le boima. Cheka gore nako ya go swaya e a tshwana naa.",
        "Tateo e telele e tla tsea nako e telele go swaya. Leboteng le lefsa, pendulum e a potlaka.",
    ],
    "ohmic": [
        "Re tswaya pencil graphite re bona gore e ka tsamaisa moya. Carbon ya graphite e na ga e tshwane le diamond.",
        "Graphite ya pencil e na le electrons tse di lokologilego. Ka lebaka leo, e ka tsamaisa moya wa motlakase.",
    ],
    "quantum": [
        "Quantum physics e bontsha gore dilo di ka ba gona mafelong a mantle. Particles tsa quantum di ka tsamaya ka moedi.",
    ],
    "chemistry": [
        "Re dira chemical reaction ka household items. Vinegar le baking soda di bopa gas e lebotse.",
    ],
    "biology": [
        "Re tsoma maanakana a go tshwana ka microscope wa DIY. Ka mahlaahla a megala, o ka bona diphatlha tsa go bopegilega.",
    ],
    "math": [
        "Re bontsha gore math ke everywhere. Go bala di-angles ya architecture ya gae ke geometry ya practical.",
    ],
    "energy": [
        "Re dira solar cell ya DIY ka disc ya CD. Solar energy ke free gore ka Mzansi re na le letsatsi le telele.",
    ],
}

# =============================================================================
# AUTONOMOUS CURRICULUM VECTORS
# =============================================================================

EVOLUTION_VECTORS: List[Dict[str, Any]] = [
    {
        "title": "Quantum Wave Mechanical Oscillations",
        "tier": "Advanced Varsity Level", "subject": "Physics",
        "source": "Tokyo SSH Framework × Russian MIPT × Cambridge Tripos",
        "superpowers": ["JP", "RU", "UK"],
        "sandbox_type": "gravity",
        "materials": ["1x Symmetrical heavy mass pendulum string array", "1x Manual tracking chronograph rule"],
        "procedure": "1. Suspend the massive anchor point to guarantee rigid structural linear limits.\n2. Execute oscillations strictly under a 15-degree amplitude displacement vector.\n3. Time 10 full cycles and compute mean period.\n4. Derive local g from T = 2π√(L/g).",
    },
    {
        "title": "Electrochemical Energy Density Mapping",
        "tier": "High School Level", "subject": "Chemistry",
        "source": "German MINT Applied Chemistry × US AP Chem × Chinese Gaokao",
        "superpowers": ["DE", "US", "CN"],
        "sandbox_type": "chemistry",
        "materials": ["1x White vinegar (acetic acid)", "1x Baking soda (NaHCO₃)", "1x Empty plastic bottle", "1x Balloon"],
        "procedure": "1. Pour 100ml vinegar into the bottle.\n2. Spoon 2 tablespoons baking soda into balloon via funnel.\n3. Stretch balloon over bottle mouth without spilling.\n4. Lift balloon to release soda — observe inflation.\n5. Measure balloon circumference to estimate CO₂ yield.",
    },
    {
        "title": "Photovoltaic Quantum Harvesting Array",
        "tier": "Primary Level", "subject": "Energy",
        "source": "Japanese SSH Energy Studies × German Fraunhofer × MIT OCW",
        "superpowers": ["JP", "DE", "US"],
        "sandbox_type": "thermal",
        "materials": ["1x Old CD/DVD disc", "1x Copper tape", "1x Alligator clips", "1x Multimeter"],
        "procedure": "1. Apply copper tape in parallel lines across the CD surface.\n2. Connect alligator clips to tape ends.\n3. Set multimeter to DC voltage mode.\n4. Expose to sunlight — record voltage output.\n5. Test at different angles to find optimal harvest position.",
    },
    {
        "title": "Biological Micro-Structure Optical Analysis",
        "tier": "High School Level", "subject": "Biology",
        "source": "UK Cambridge Biology (9700) × Russian MIPT Biophysics",
        "superpowers": ["UK", "RU"],
        "sandbox_type": "biology",
        "materials": ["1x Smartphone with camera", "1x Water droplet (lens)", "1x Glass slide", "1x Leaf or onion skin sample"],
        "procedure": "1. Place sample on glass slide.\n2. Add single water droplet on top (acts as convex lens).\n3. Position smartphone camera directly above droplet.\n4. Adjust distance until image is sharp.\n5. Capture photos of cell structures visible through DIY microscope.",
    },
    {
        "title": "Geometric Fractal Dimension Construction",
        "tier": "Advanced Varsity Level", "subject": "Mathematics",
        "source": "Chinese Gaokao Advanced Math × Cambridge STEP × MIT OCW 18.06",
        "superpowers": ["CN", "UK", "US"],
        "sandbox_type": "math",
        "materials": ["1x Ruler", "1x Protractor", "1x Graph paper", "1x Pencil"],
        "procedure": "1. Draw an equilateral triangle (Iteration 0).\n2. On each edge, mark a point at 1/3 and 2/3.\n3. Construct outward equilateral triangles on middle thirds.\n4. Repeat for 4 iterations — the Koch snowflake emerges.\n5. Calculate fractal dimension: D = log(4)/log(3) ≈ 1.262.",
    },
    {
        "title": "Doppler Wave Shift Acoustic Analysis",
        "tier": "High School Level", "subject": "Physics",
        "source": "German MINT Wave Mechanics × US AP Physics 1 × Japanese SSH",
        "superpowers": ["DE", "US", "JP"],
        "sandbox_type": "math",
        "materials": ["1x Smartphone with sound recording app", "1x Buzzer or speaker", "1x String (2m)", "1x Metronome app"],
        "procedure": "1. Record buzzer sound at rest — this is your reference frequency.\n2. Swing buzzer in circle on 2m string at constant speed.\n3. Record sound while swinging.\n4. Use frequency analysis app to compare recordings.\n5. Calculate approximate swing speed from Δf/f = v/c.",
    },
    {
        "title": "Acid-Base Titration with Natural Indicators",
        "tier": "Primary Level", "subject": "Chemistry",
        "source": "UK Cambridge IGCSE × Chinese Gaokao Chemistry × Russian MIPT",
        "superpowers": ["UK", "CN", "RU"],
        "sandbox_type": "chemistry",
        "materials": ["1x Red cabbage juice (indicator)", "1x Lemon juice (acid)", "1x Baking soda solution (base)", "3x Clear cups"],
        "procedure": "1. Boil red cabbage, strain to get purple indicator juice.\n2. Pour equal amounts into 3 cups.\n3. Add lemon juice to cup 1 — observe color change (pink).\n4. Add baking soda solution to cup 2 — observe change (green).\n5. Leave cup 3 as control. Document the pH color spectrum.",
    },
    {
        "title": "Simple Harmonic Motion Energy Conservation",
        "tier": "High School Level", "subject": "Physics",
        "source": "German Abitur × US AP Physics C × Cambridge A2",
        "superpowers": ["DE", "US", "UK"],
        "sandbox_type": "gravity",
        "materials": ["1x Spring (from pen or toy)", "1x Small weight", "1x Ruler", "1x Stopwatch"],
        "procedure": "1. Hang spring vertically, attach known weight.\n2. Measure equilibrium extension x₀.\n3. Displace by Δx and release.\n4. Time 10 oscillations.\n5. Verify T = 2π√(m/k) and E = ½kA² is constant at all points.",
    },
]

# =============================================================================
# SQLITE DATABASE LAYER
# =============================================================================

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "omnilab_evolver.db"


def _init_db():
    """Initialize the SQLite database with tables."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()

    # Main labs table
    c.execute("""
        CREATE TABLE IF NOT EXISTS evolver_labs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            tier TEXT NOT NULL,
            subject TEXT NOT NULL,
            source TEXT,
            superpowers TEXT,
            sandbox_type TEXT,
            materials TEXT,
            procedure TEXT,
            sepitori TEXT,
            created_at REAL,
            generation INTEGER DEFAULT 1
        )
    """)

    # Evolution audit trail
    c.execute("""
        CREATE TABLE IF NOT EXISTS evolution_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            lab_title TEXT,
            lab_id INTEGER,
            details TEXT,
            created_at REAL
        )
    """)

    # Seed data if empty
    c.execute("SELECT COUNT(*) FROM evolver_labs")
    if c.fetchone()[0] == 0:
        seed_lab = {
            "title": "Kinetic Energy Radiative Flux Matrix",
            "tier": "High School Level",
            "subject": "Physics",
            "source": "German Abitur MINT & US AP Physics Core Alignment",
            "superpowers": json.dumps(["DE", "US"]),
            "sandbox_type": "thermal",
            "materials": json.dumps(["2x Empty aluminum cans", "1x Matte black charcoal powder", "1x Shiny aluminum foil"]),
            "procedure": "1. Coat one can with charcoal powder (matte black surface).\n2. Wrap the other with aluminum foil (shiny reflective surface).\n3. Fill both with equal amounts of hot water (60°C).\n4. Record temperature every 2 minutes for 20 minutes.\n5. Plot cooling curves and compare radiative heat loss.",
            "sepitori": "Re cheka mofuthu wa letsatsi le mahlasedi re sebelisa di-can tse pedi, e ntsho le e shiny. O tlo bona efe e gowfelang pele bafethu.",
            "created_at": time.time(),
            "generation": 1,
        }
        c.execute("""
            INSERT INTO evolver_labs (title, tier, subject, source, superpowers, sandbox_type, materials, procedure, sepitori, created_at, generation)
            VALUES (:title, :tier, :subject, :source, :superpowers, :sandbox_type, :materials, :procedure, :sepitori, :created_at, :generation)
        """, seed_lab)

        # Log the seed
        c.execute("""
            INSERT INTO evolution_log (action, lab_title, lab_id, details, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, ("seed", seed_lab["title"], 1, "Seeded initial lab from German Abitur × US AP Physics alignment", time.time()))

    conn.commit()
    conn.close()
    logger.info("OmniLab Evolver DB initialized at %s", DB_PATH)


# Auto-init on module load
_init_db()


# =============================================================================
# EVOLVER CLASS
# =============================================================================

class OmniLabEvolver:
    """Autonomous curriculum evolution engine.

    Cycles through 8 evolution vectors spanning 6 global superpower standards,
    generating practical STEM labs with SePitori translations.
    """

    def __init__(self):
        self._evolution_index = 0
        self._db = str(DB_PATH)

    def _conn(self):
        return sqlite3.connect(self._db)

    def _get_sepitori(self, sandbox_type: str) -> str:
        """Get a random SePitori phrase for the sandbox type."""
        phrases = SEPITORI_PHRASES.get(sandbox_type, SEPITORI_PHRASES["thermal"])
        import random
        return random.choice(phrases)

    # ── Public API ──────────────────────────────────────────────────────────

    def list_labs(self, tier: Optional[str] = None, subject: Optional[str] = None,
                  superpower: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all evolved labs with optional filtering."""
        conn = self._conn()
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        query = "SELECT * FROM evolver_labs WHERE 1=1"
        params = []
        if tier:
            query += " AND tier = ?"
            params.append(tier)
        if subject:
            query += " AND subject = ?"
            params.append(subject)
        if superpower:
            query += " AND superpowers LIKE ?"
            params.append(f"%{superpower}%")
        query += " ORDER BY created_at DESC"

        rows = c.execute(query, params).fetchall()
        conn.close()

        result = []
        for row in rows:
            d = dict(row)
            d["superpowers"] = json.loads(d.get("superpowers", "[]"))
            d["materials"] = json.loads(d.get("materials", "[]"))
            result.append(d)
        return result

    def get_lab(self, lab_id: int) -> Optional[Dict[str, Any]]:
        """Get a single lab by ID."""
        conn = self._conn()
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        row = c.execute("SELECT * FROM evolver_labs WHERE id = ?", (lab_id,)).fetchone()
        conn.close()
        if row:
            d = dict(row)
            d["superpowers"] = json.loads(d.get("superpowers", "[]"))
            d["materials"] = json.loads(d.get("materials", "[]"))
            return d
        return None

    def add_lab(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new lab (manual entry or from evolution)."""
        conn = self._conn()
        c = conn.cursor()

        lab_data = {
            "title": data.get("title", "Untitled Lab"),
            "tier": data.get("tier", "High School Level"),
            "subject": data.get("subject", "General"),
            "source": data.get("source", ""),
            "superpowers": json.dumps(data.get("superpowers", [])),
            "sandbox_type": data.get("sandbox_type", "thermal"),
            "materials": json.dumps(data.get("materials", [])),
            "procedure": data.get("procedure", ""),
            "sepitori": data.get("sepitori", self._get_sepitori(data.get("sandbox_type", "thermal"))),
            "created_at": time.time(),
            "generation": data.get("generation", 1),
        }

        c.execute("""
            INSERT INTO evolver_labs (title, tier, subject, source, superpowers, sandbox_type, materials, procedure, sepitori, created_at, generation)
            VALUES (:title, :tier, :subject, :source, :superpowers, :sandbox_type, :materials, :procedure, :sepitori, :created_at, :generation)
        """, lab_data)
        lab_id = c.lastrowid
        conn.commit()
        conn.close()

        return {"success": True, "lab_id": lab_id, "title": lab_data["title"]}

    def evolve(self) -> Dict[str, Any]:
        """Trigger autonomous curriculum evolution.

        Selects the next evolution vector, creates a lab, logs the action,
        and cycles the vector index.
        """
        vector = EVOLUTION_VECTORS[self._evolution_index]

        # Build the lab from the evolution vector
        lab_data = {
            "title": vector["title"],
            "tier": vector["tier"],
            "subject": vector["subject"],
            "source": vector["source"],
            "superpowers": vector["superpowers"],
            "sandbox_type": vector["sandbox_type"],
            "materials": vector["materials"],
            "procedure": vector["procedure"],
            "sepitori": self._get_sepitori(vector["sandbox_type"]),
            "generation": self._evolution_index + 2,  # +1 for seed, +1 for 1-based
        }

        result = self.add_lab(lab_data)
        lab_id = result.get("lab_id", 0)

        # Log the evolution
        conn = self._conn()
        c = conn.cursor()
        c.execute("""
            INSERT INTO evolution_log (action, lab_title, lab_id, details, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            "evolve",
            vector["title"],
            lab_id,
            f"Evolution vector #{self._evolution_index + 1}: {'/'.join(vector['superpowers'])} superpower {vector['subject']} synthesis",
            time.time(),
        ))
        conn.commit()
        conn.close()

        # Cycle to next vector
        self._evolution_index = (self._evolution_index + 1) % len(EVOLUTION_VECTORS)

        return {
            "success": True,
            "lab": {"id": lab_id, **lab_data},
            "vector_index": self._evolution_index,
            "total_vectors": len(EVOLUTION_VECTORS),
        }

    def get_evolution_log(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get the evolution audit trail."""
        conn = self._conn()
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        rows = c.execute(
            "SELECT * FROM evolution_log ORDER BY created_at DESC LIMIT ?",
            (limit,)
        ).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        conn = self._conn()
        c = conn.cursor()

        total_labs = c.execute("SELECT COUNT(*) FROM evolver_labs").fetchone()[0]
        total_evolutions = c.execute("SELECT COUNT(*) FROM evolution_log WHERE action = 'evolve'").fetchone()[0]

        subjects = [row[0] for row in c.execute("SELECT DISTINCT subject FROM evolver_labs").fetchall()]
        tiers = [row[0] for row in c.execute("SELECT DISTINCT tier FROM evolver_labs").fetchall()]

        # Per-subject counts
        subject_counts = {
            row[0]: row[1]
            for row in c.execute("SELECT subject, COUNT(*) FROM evolver_labs GROUP BY subject").fetchall()
        }

        # Per-tier counts
        tier_counts = {
            row[0]: row[1]
            for row in c.execute("SELECT tier, COUNT(*) FROM evolver_labs GROUP BY tier").fetchall()
        }

        conn.close()

        return {
            "total_labs": total_labs,
            "total_evolutions": total_evolutions,
            "subjects": subjects,
            "tiers": tiers,
            "subject_counts": subject_counts,
            "tier_counts": tier_counts,
            "current_vector_index": self._evolution_index,
            "total_vectors": len(EVOLUTION_VECTORS),
        }

    def delete_lab(self, lab_id: int) -> Dict[str, Any]:
        """Delete a lab by ID."""
        conn = self._conn()
        c = conn.cursor()

        # Get lab info for logging
        row = c.execute("SELECT title FROM evolver_labs WHERE id = ?", (lab_id,)).fetchone()
        if not row:
            conn.close()
            return {"success": False, "error": "Lab not found"}

        title = row[0]
        c.execute("DELETE FROM evolver_labs WHERE id = ?", (lab_id,))

        # Log deletion
        c.execute("""
            INSERT INTO evolution_log (action, lab_title, lab_id, details, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, ("delete", title, lab_id, f"Deleted lab #{lab_id}: {title}", time.time()))

        conn.commit()
        conn.close()

        return {"success": True, "deleted_id": lab_id}


# =============================================================================
# SINGLETON
# =============================================================================

_evolver_instance: Optional[OmniLabEvolver] = None


def get_evolver() -> OmniLabEvolver:
    """Get the singleton OmniLabEvolver instance."""
    global _evolver_instance
    if _evolver_instance is None:
        _evolver_instance = OmniLabEvolver()
    return _evolver_instance
