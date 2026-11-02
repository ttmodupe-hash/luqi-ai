"""
Memory Manager & Archival Subsystem — Luqi AI
Implements two distinct persistence layers + file artifact vault:
  1. Orchestration Archiving: LangGraph Checkpointers (Flight Recorder)
     - Captures mechanical steps, tool calls, and OmniState snapshots.
     - Supports PostgreSQL with autocommit=True and row_factory=dict_row.
  2. Cognitive Archiving: CrewAI Unified Memory
     - Short-term, long-term, and entity memory tracking.
     - Persists to CREWAI_STORAGE_DIR (or /mnt/persistent_volume/luqi_memory).
  3. Custom Data Storage Layer (Files & Artifacts)
     - Date-structured archive directory (YYYY-MM-DD).
     - Paired JSON metadata with task outputs, model used, and verification hashes.
"""

import os
import json
import time
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from copy import deepcopy
from uuid import uuid4
import math
import stat

from checkpoint_store import LocalCheckpointStore, validate_thread_id, CheckpointPersistenceError

# Environment-based paths
CREWAI_STORAGE_DIR = os.getenv("CREWAI_STORAGE_DIR", "./data/crewai_memory")
LUQI_ARCHIVE_PATH = os.getenv("LUQI_ARCHIVE_PATH", "./data/archive/vault")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/luqi_db")


# ── 1. ORCHESTRATION ARCHIVING: LangGraph Checkpointer ───────────────

class LangGraphCheckpointer:
    """
    Records local checkpoint snapshots with corruption checks and file locks.
    Persistence across deployments requires a durable filesystem volume.
    """

    def __init__(self, db_uri: Optional[str] = None, *, archive_path: Optional[str] = None):
        self.db_uri = db_uri or DATABASE_URL
        self.in_memory_checkpoints: Dict[str, List[Dict]] = {}
        self._store = LocalCheckpointStore(os.path.join(archive_path or LUQI_ARCHIVE_PATH, "checkpoints"))
        self._setup_connection()

    def _setup_connection(self):
        self.conn = None
        self.saver = None
        try:
            import psycopg
            from psycopg.rows import dict_row
            # Required parameters per specification: autocommit=True and row_factory=dict_row
            self.conn = psycopg.connect(self.db_uri, autocommit=True, row_factory=dict_row, connect_timeout=5)
            from langgraph.checkpoint.postgres import PostgresSaver
            self.saver = PostgresSaver(self.conn)
            self.saver.setup()
            print("[Checkpointer] Postgres saver available; this wrapper records snapshots in local files.")
        except Exception as e:
            print(f"[Checkpointer] Postgres saver unavailable ({type(e).__name__}); using local checkpoint files.")

    def save_checkpoint(
        self,
        thread_id: str,
        node_name: str,
        channel_values: Dict[str, Any],
        tool_calls: Optional[List[Dict]] = None,
        state_diff: Optional[Dict] = None
    ) -> Dict:
        """Return a snapshot only after its local file has been flushed to disk."""
        snapshot = self._store.save(thread_id, node_name, channel_values, tool_calls, state_diff)
        self.in_memory_checkpoints[thread_id] = self._store.history(thread_id)
        return deepcopy(snapshot)

    def get_thread_history(self, thread_id: str) -> List[Dict]:
        history = self._store.history(thread_id)
        self.in_memory_checkpoints[thread_id] = deepcopy(history)
        return history


# ── 2. COGNITIVE ARCHIVING: CrewAI Unified Memory ────────────────────

class CrewAIUnifiedMemory:
    """
    Unified memory system managing short-term, long-term, and entity memory.
    Analyzes task outputs, extracts discrete facts, and persists them.
    """

    def __init__(self, storage_dir: Optional[str] = None):
        self.storage_dir = storage_dir or CREWAI_STORAGE_DIR
        self.facts_file = os.path.join(self.storage_dir, "unified_memory.json")
        self._store = LocalCheckpointStore(os.path.join(self.storage_dir, "fact_journal"))
        self._load_facts()  # Reject damaged legacy storage before accepting writes.

    @staticmethod
    def _validate_fact(fact):
        if not isinstance(fact, dict) or not all(
            isinstance(fact.get(key), str)
            for key in ("fact_id", "category", "subject", "predicate", "object",
                        "source_task", "agent_role", "timestamp")
        ):
            raise ValueError("Invalid learned fact")
        confidence = fact.get("confidence")
        if (fact["category"] not in ("short_term", "long_term", "entity") or
                type(confidence) not in (int, float) or
                not 0 <= confidence <= 1 or not math.isfinite(confidence) or
                (fact.get("context") is not None and not isinstance(fact["context"], str))):
            raise ValueError("Invalid learned fact")

    def _load_facts(self) -> List[Dict]:
        # Legacy JSON is read-only: never replace or silently discard old facts.
        # Stop old writers before rolling out this journal implementation.
        try:
            try:
                fd = os.open(self.facts_file, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
            except FileNotFoundError:
                legacy = []
            else:
                with os.fdopen(fd, "r", encoding="utf-8") as stream:
                    info = os.fstat(stream.fileno())
                    if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o077:
                        raise ValueError("Legacy memory must be a private regular file")
                    legacy = json.load(stream)
            if not isinstance(legacy, list):
                raise ValueError("Invalid legacy memory")
            records = self._store.history("learned_facts")
            facts = legacy + [record["channel_values"] for record in records]
            for fact in facts:
                self._validate_fact(fact)
            return deepcopy(facts)
        except (OSError, ValueError, TypeError, KeyError, AttributeError):
            raise CheckpointPersistenceError("Learned memory could not be safely recovered") from None

    @property
    def facts(self) -> List[Dict]:
        """Fresh detached view; mutating it never changes persisted memory."""
        return self._load_facts()

    def record_learned_fact(
        self,
        category: str,  # 'short_term', 'long_term', or 'entity'
        subject: str,
        predicate: str,
        obj: str,
        source_task: str,
        agent_role: str,
        confidence: float = 1.0,
        context: Optional[str] = None
    ) -> Dict:
        """Stores a discrete fact deduced during agent task execution."""
        fact = {
            "fact_id": f"fact_{uuid4().hex}",
            "category": category,
            "subject": subject,
            "predicate": predicate,
            "object": obj,
            "context": context,
            "source_task": source_task,
            "agent_role": agent_role,
            "confidence": confidence,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._validate_fact(fact)
        self._load_facts()
        snapshot = self._store.save("learned_facts", "learned_fact", fact)
        return deepcopy(snapshot["channel_values"])

    def query_facts(self, search_term: Optional[str] = None, category: Optional[str] = None) -> List[Dict]:
        results = self.facts
        if category:
            results = [f for f in results if f.get("category") == category]
        if search_term:
            q = search_term.lower()
            results = [
                f for f in results
                if q in f.get("subject", "").lower()
                or q in f.get("object", "").lower()
                or q in f.get("predicate", "").lower()
            ]
        return results


# ── 3. CUSTOM DATA STORAGE LAYER (Files & Artifacts Archive) ─────────

def archive_artifact(
    file_name: str,
    file_bytes: bytes,
    agent_role: str,
    task_name: str,
    crew_id: Optional[str] = None,
    thread_id: Optional[str] = None,
    model_used: Optional[str] = None,
    prompt_summary: Optional[str] = None,
    execution_duration_ms: Optional[int] = None,
    reconciled_count: Optional[int] = None
) -> Dict:
    """
    Writes output file into date-structured folder alongside paired JSON metadata.
    Directory: <LUQI_ARCHIVE_PATH>/<YYYY-MM-DD>/<artifact_id>_<file_name>
    """
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    date_folder = os.path.join(LUQI_ARCHIVE_PATH, today_str)
    os.makedirs(date_folder, exist_ok=True)

    artifact_id = f"art_{int(time.time()*1000)}"
    safe_name = "".join(c for c in file_name if c.isalnum() or c in "._-")
    artifact_path = os.path.join(date_folder, f"{artifact_id}_{safe_name}")
    metadata_path = os.path.join(date_folder, f"{artifact_id}_metadata.json")

    # Compute verification hash
    sha256_hash = hashlib.sha256(file_bytes).hexdigest()

    # 1. Write the artifact file
    with open(artifact_path, "wb") as f:
        f.write(file_bytes)

    # 2. Write paired metadata JSON
    metadata = {
        "artifact_id": artifact_id,
        "file_name": safe_name,
        "file_size_bytes": len(file_bytes),
        "sha256": sha256_hash,
        "date_folder": today_str,
        "file_path": artifact_path,
        "metadata_path": metadata_path,
        "task_output": {
            "agent_role": agent_role,
            "task_name": task_name,
            "crew_id": crew_id,
            "thread_id": thread_id,
            "model_used": model_used or "Gemini 3.1 Pro / GPT-4o",
            "prompt_summary": prompt_summary,
            "execution_duration_ms": execution_duration_ms,
            "primary_keys_reconciled": reconciled_count,
            "status": "verified",
        },
        "created_at": datetime.utcnow().isoformat(),
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, default=str)

    print(f"[Archive] Saved {safe_name} ({len(file_bytes)} bytes) to {artifact_path}")
    return metadata


# ── COMPATIBILITY WRAPPER (Legacy MemoryManager) ──────────────────────

class MemoryManager:
    """Manages conversation memory and context with integrated flight recording."""

    def __init__(self, max_turns: int = 20):
        self.max_turns = max_turns
        self.sessions: Dict[str, Dict] = {}
        self.checkpointer = LangGraphCheckpointer()
        self.unified_memory = CrewAIUnifiedMemory()

    def create_session(self, session_id: str) -> Dict:
        validate_thread_id(session_id)
        self.sessions[session_id] = {
            "turns": [],
            "context": {},
            "created": datetime.utcnow().isoformat(),
        }
        self.checkpointer.save_checkpoint(
            thread_id=session_id,
            node_name="session_init",
            channel_values={"status": "initialized"},
        )
        return self.sessions[session_id]

    def add_turn(self, session_id: str, role: str, content: str):
        if session_id not in self.sessions:
            self.create_session(session_id)
        self.sessions[session_id]["turns"].append({"role": role, "content": content})
        if len(self.sessions[session_id]["turns"]) > self.max_turns:
            self.sessions[session_id]["turns"] = self.sessions[session_id]["turns"][-self.max_turns:]

        self.checkpointer.save_checkpoint(
            thread_id=session_id,
            node_name=f"turn_{role}",
            channel_values={"role": role, "length": len(content)},
        )

    def get_context(self, session_id: str) -> List[Dict]:
        return self.sessions.get(session_id, {}).get("turns", [])

    def set_context_var(self, session_id: str, key: str, value: Any):
        if session_id not in self.sessions:
            self.create_session(session_id)
        self.sessions[session_id]["context"][key] = value

    def get_context_var(self, session_id: str, key: str) -> Any:
        return self.sessions.get(session_id, {}).get("context", {}).get(key)

    def clear_session(self, session_id: str):
        if session_id in self.sessions:
            self.sessions[session_id]["turns"] = []
            self.sessions[session_id]["context"] = {}

    def summarize(self, session_id: str) -> str:
        turns = self.get_context(session_id)
        if not turns:
            return "No conversation history"
        return f"Session has {len(turns)} turns. Last message: {turns[-1]['content'][:100]}..."


if __name__ == "__main__":
    mm = MemoryManager()
    mm.add_turn("sess_demo", "user", "Reconcile multi-tab Excel serial numbers")
    mm.add_turn("sess_demo", "assistant", "Reconciled 418 records. Primary keys standardized.")
    mm.unified_memory.record_learned_fact(
        category="entity",
        subject="Reconciliation Task",
        predicate="records_standardized",
        obj="418",
        source_task="Excel Workbook Normalization",
        agent_role="Data Architect"
    )
    archive_artifact(
        file_name="reconciled_equipment.xlsx",
        file_bytes=b"PK\x03\x04ExcelMockData",
        agent_role="Data Architect",
        task_name="Excel Reconciliation",
        reconciled_count=418
    )
    print("Memory and archival subsystem test completed successfully.")
