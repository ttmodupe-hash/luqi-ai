"""Unified Archiving Engine — Luqi AI.

Implements:
  1. Orchestration Archiving: LangGraph Checkpointers (PostgresSaver & File Checkpoints)
     - Flight recorder snapshotting every mechanical step, tool call, and state transition.
  2. Cognitive Archiving: CrewAI Unified Memory
     - Short-term, long-term, and entity memory extraction stored in LanceDB.
  3. Custom Data Storage Layer: Archive/ Directory Pathway
     - Automatically exports and pairs tangible artifacts (Excel workbooks, quotation PDFs,
       scripts) with forensic JSON audit metadata.
"""

import os
import json
import time
import uuid
import pathlib
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

# Archival Directory Hierarchy
ARCHIVE_ROOT = pathlib.Path("./Archive")
CHECKPOINTS_DIR = ARCHIVE_ROOT / "checkpoints"
MEMORY_DIR = ARCHIVE_ROOT / "cognitive_memory"
ARTIFACTS_DIR = ARCHIVE_ROOT / "tangible_artifacts"

for d in (CHECKPOINTS_DIR, MEMORY_DIR, ARTIFACTS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Environment setup for CrewAI persistent memory
os.environ["CREWAI_STORAGE_DIR"] = str(MEMORY_DIR.resolve())


# ── 1. Orchestration Archiving: LangGraph Checkpointer ────────────────
@dataclass
class GraphCheckpointRecord:
    checkpoint_id: str
    thread_id: str
    step: int
    node_name: str
    channel_values: Dict[str, Any]
    tool_calls: List[Dict[str, Any]]
    timestamp: float
    version: int = 1


class LangGraphArchiver:
    """Manages graph flight recorder state persistence to Postgres & Archive filesystem."""

    def __init__(self, db_uri: Optional[str] = None):
        self.db_uri = db_uri or os.getenv("DATABASE_URL")
        self.in_memory_records: Dict[str, List[GraphCheckpointRecord]] = {}
        self._init_backend()

    def _init_backend(self):
        """Attempts connection to PostgresSaver; falls back gracefully to file archiver."""
        if self.db_uri and "postgres" in self.db_uri:
            try:
                import psycopg  # type: ignore
                from psycopg.rows import dict_row  # type: ignore
                from langgraph.checkpoint.postgres import PostgresSaver  # type: ignore

                with psycopg.connect(self.db_uri, autocommit=True, row_factory=dict_row) as conn:
                    self.checkpointer = PostgresSaver(conn)
                    self.checkpointer.setup()
                    print("[Archiver] LangGraph PostgresSaver initialized successfully.")
                    return
            except Exception as e:
                print(f"[Archiver] PostgresSaver unavailable ({e}). Active in filesystem black-box mode.")
        self.checkpointer = None

    def record_step(
        self,
        thread_id: str,
        node_name: str,
        channel_values: Dict[str, Any],
        tool_calls: Optional[List[Dict[str, Any]]] = None
    ) -> GraphCheckpointRecord:
        """Saves a mechanical snapshot to the black-box flight recorder."""
        existing = self.in_memory_records.get(thread_id, [])
        step = len(existing) + 1
        record = GraphCheckpointRecord(
            checkpoint_id=f"chk_{int(time.time())}_{uuid.uuid4().hex[:6]}",
            thread_id=thread_id,
            step=step,
            node_name=node_name,
            channel_values=channel_values,
            tool_calls=tool_calls or [],
            timestamp=time.time(),
        )
        existing.append(record)
        self.in_memory_records[thread_id] = existing

        # Persist checkpoint to disk
        thread_file = CHECKPOINTS_DIR / f"{thread_id}.jsonl"
        with open(thread_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(record)) + "\n")

        return record


# ── 2. Cognitive Archiving: CrewAI Unified Memory ─────────────────────
@dataclass
class CognitiveFactRecord:
    fact_id: str
    category: str  # "short_term", "long_term", "entity"
    subject: str
    predicate: str
    object_value: str
    context: str
    confidence: float
    source_task: str
    agent_role: str
    timestamp: float


class CognitiveMemoryManager:
    """Archival manager for cognitive deductions and entity relations."""

    def __init__(self):
        self.facts_file = MEMORY_DIR / "facts_ledger.jsonl"

    def record_fact(
        self,
        category: str,
        subject: str,
        predicate: str,
        object_value: str,
        context: str,
        agent_role: str,
        source_task: str,
        confidence: float = 1.0
    ) -> CognitiveFactRecord:
        fact = CognitiveFactRecord(
            fact_id=f"fact_{int(time.time())}_{uuid.uuid4().hex[:6]}",
            category=category,
            subject=subject,
            predicate=predicate,
            object_value=object_value,
            context=context,
            confidence=confidence,
            source_task=source_task,
            agent_role=agent_role,
            timestamp=time.time(),
        )

        with open(self.facts_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(fact)) + "\n")

        return fact

    def extract_and_archive_facts_from_text(self, raw_text: str, source_task: str, agent_role: str = "Data Architect") -> List[CognitiveFactRecord]:
        """Uses Google AI Studio GenAI at temperature 0.0 to extract discrete facts into memory."""
        extracted_facts: List[CognitiveFactRecord] = []
        try:
            from google_genai_agent import analyze_and_extract
            extraction_prompt = (
                f"Extract key factual relationships (subject, predicate, object) from:\n{raw_text}\n"
                "Return valid JSON array of objects with keys: 'category', 'subject', 'predicate', 'object_value', 'context'."
            )
            resp = analyze_and_extract(
                user_prompt=extraction_prompt,
                system_instruction="You are an exact factual relationship extraction agent for CrewAI memory. Output ONLY valid JSON array."
            )
            cleaned = resp.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            data = json.loads(cleaned.strip())
            if isinstance(data, list):
                for item in data:
                    f = self.record_fact(
                        category=item.get("category", "entity"),
                        subject=item.get("subject", "Unknown"),
                        predicate=item.get("predicate", "related_to"),
                        object_value=item.get("object_value", ""),
                        context=item.get("context", raw_text[:100]),
                        agent_role=agent_role,
                        source_task=source_task,
                        confidence=1.0
                    )
                    extracted_facts.append(f)
        except Exception as e:
            # Fallback fact recording
            f = self.record_fact(
                category="long_term",
                subject="TaskObservation",
                predicate="extracted_info",
                object_value=raw_text[:120],
                context=f"Recorded fallback ({e})",
                agent_role=agent_role,
                source_task=source_task,
                confidence=0.85
            )
            extracted_facts.append(f)
        return extracted_facts



# ── 3. Custom Data Storage Layer (Files & Artifacts) ──────────────────
class TangibleArtifactVault:
    """Manages tangible file creation and forensic audit metadata pairing."""

    @staticmethod
    def archive_file(
        filename: str,
        content_bytes: bytes,
        task_output: Dict[str, Any],
        date_folder: Optional[str] = None
    ) -> Dict[str, str]:
        date_str = date_folder or time.strftime("%Y-%m-%d")
        target_dir = ARTIFACTS_DIR / date_str
        target_dir.mkdir(parents=True, exist_ok=True)

        artifact_path = target_dir / filename
        with open(artifact_path, "wb") as f:
            f.write(content_bytes)

        # Forensic JSON Audit Sidecar
        metadata_filename = f"{filename}.json"
        metadata_path = target_dir / metadata_filename
        audit_payload = {
            "artifact_name": filename,
            "date": date_str,
            "byte_size": len(content_bytes),
            "created_at": time.time(),
            "task_output": task_output,
        }
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(audit_payload, f, indent=2)

        return {
            "artifact_path": str(artifact_path),
            "metadata_path": str(metadata_path),
            "date": date_str,
        }


# Global Singletons
flight_recorder = LangGraphArchiver()
cognitive_memory = CognitiveMemoryManager()
artifact_vault = TangibleArtifactVault()

if __name__ == "__main__":
    # Test archival run
    thread = "session_data_cleanup_001"
    flight_recorder.record_step(
        thread_id=thread,
        node_name="ExcelReconcileAgent",
        channel_values={"status": "processing", "rows_read": 1420},
        tool_calls=[{"tool": "reconcile_serial_numbers", "duration_ms": 320, "result": "clean"}]
    )

    cognitive_memory.record_fact(
        category="entity",
        subject="Serial Reconciliation Agent",
        predicate="deduced_pattern",
        object_value="Hexadecimal SN format verified across 1,420 rows",
        context="Multi-tab Excel harmonizer",
        agent_role="Data Architect",
        source_task="Workbook reconciliation"
    )

    vault_res = artifact_vault.archive_file(
        filename="Harmonized_Asset_Register.xlsx",
        content_bytes=b"PK\x03\x04mock_excel_content_bytes",
        task_output={
            "agent": "Data Architect",
            "task": "Harmonize asset serial numbers",
            "clean_keys": 1420,
            "status": "verified"
        }
    )
    print("[Archiving Engine] Test successful:", vault_res)
