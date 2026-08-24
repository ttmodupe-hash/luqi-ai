"""
LUQI AI — Grounding Document Store (Vector RAG Backend)
=========================================================
Production-grade document storage for anti-hallucination RAG:
  - Load documents from disk, URLs, or raw text
  - Semantic chunking with overlap
  - Sentence-transformer embeddings
  - FAISS-backed vector search
  - Source attribution with confidence scoring
  - Domain isolation to prevent cross-domain mixing
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional

import structlog
import numpy as np

logger = structlog.get_logger("luqi.grounding")

# ── Configuration ───────────────────────────────────────────────────────────
GROUNDING_DIR = Path(os.environ.get("COMPANION_RAG_GROUNDING_DOCS", "/tmp/luqi_grounding"))
GROUNDING_DIR.mkdir(parents=True, exist_ok=True)

CHUNK_SIZE = int(os.environ.get("RAG_CHUNK_SIZE", "512"))
CHUNK_OVERLAP = int(os.environ.get("RAG_CHUNK_OVERLAP", "128"))
EMBED_DIM = 384  # all-MiniLM-L6-v2
TOP_K_DEFAULT = 5
CONFIDENCE_THRESHOLD = float(os.environ.get("COMPANION_CONFIDENCE_THRESHOLD", "0.75"))

# ── Data Classes ──────────────────────────────────────────────────────────

@dataclass
class GroundingChunk:
    id: str
    doc_id: str
    doc_title: str
    doc_source: str
    content: str
    chunk_index: int
    total_chunks: int
    embedding: Optional[list[float]] = None
    metadata: Optional[dict] = None
    domain: str = "general"
    created_at: float = 0.0

    def to_dict(self) -> dict:
        d = asdict(self)
        d["embedding"] = None  # Don't serialize vectors
        return d


# ═══════════════════════════════════════════════════════════════════════════
#  Grounding Document Store
# ═══════════════════════════════════════════════════════════════════════════

class GroundingStore:
    """
    Persistent vector document store for RAG grounding.
    
    Loads documents, chunks them, embeds via sentence-transformers,
    stores in FAISS for fast semantic retrieval.
    """

    _instance: Optional["GroundingStore"] = None

    def __new__(cls) -> "GroundingStore":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self.chunks: dict[str, GroundingChunk] = {}
        self.documents: dict[str, dict] = {}
        self._faiss_index: Optional[Any] = None
        self._embedder: Optional[Any] = None
        self._index_built = False

        self._load_embedder()
        self._load_existing_chunks()

    # ── Initialization ──────────────────────────────────────────────────────
    def _load_embedder(self) -> None:
        """Lazy-load sentence-transformer model."""
        try:
            from sentence_transformers import SentenceTransformer
            self._embedder = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("grounding_embedder_loaded", model="all-MiniLM-L6-v2")
        except Exception as e:
            logger.error("grounding_embedder_failed", error=str(e))
            self._embedder = None

    def _load_existing_chunks(self) -> None:
        """Load persisted chunks from disk."""
        for chunk_file in GROUNDING_DIR.glob("chunk_*.json"):
            try:
                data = json.loads(chunk_file.read_text())
                chunk = GroundingChunk(**{k: v for k, v in data.items() if k != "embedding"})
                self.chunks[chunk.id] = chunk
            except Exception:
                continue
        logger.info("grounding_chunks_loaded", count=len(self.chunks))

    # ── Document Ingestion ──────────────────────────────────────────────────
    def ingest_document(
        self,
        title: str,
        content: str,
        source: str = "manual",
        doc_id: Optional[str] = None,
        domain: str = "general",
        metadata: Optional[dict] = None,
    ) -> dict:
        """
        Ingest a document: chunk, embed, store.
        
        Returns ingestion summary with chunk count and doc_id.
        """
        if not content or not content.strip():
            return {"error": "Empty content", "chunks_created": 0}

        doc_id = doc_id or hashlib.sha256(f"{title}:{source}:{time.time()}".encode()).hexdigest()[:16]
        self.documents[doc_id] = {
            "id": doc_id,
            "title": title,
            "source": source,
            "domain": domain,
            "metadata": metadata or {},
            "total_chunks": 0,
        }

        # Chunk the document
        raw_chunks = self._chunk_text(content, CHUNK_SIZE, CHUNK_OVERLAP)
        created = []

        for idx, chunk_text in enumerate(raw_chunks):
            chunk_id = f"{doc_id}_{idx}"
            chunk = GroundingChunk(
                id=chunk_id,
                doc_id=doc_id,
                doc_title=title,
                doc_source=source,
                content=chunk_text,
                chunk_index=idx,
                total_chunks=len(raw_chunks),
                domain=domain,
                metadata=metadata,
                created_at=time.time(),
            )

            # Embed
            if self._embedder:
                chunk.embedding = self._embed(chunk_text)

            self.chunks[chunk_id] = chunk
            created.append(chunk)

            # Persist
            self._persist_chunk(chunk)

        # Update document record
        self.documents[doc_id]["total_chunks"] = len(raw_chunks)
        self._persist_doc(doc_id)

        # Rebuild FAISS index
        self._rebuild_index()

        logger.info(
            "document_ingested",
            doc_id=doc_id,
            title=title,
            chunks=len(raw_chunks),
            domain=domain,
        )

        return {
            "doc_id": doc_id,
            "title": title,
            "chunks_created": len(raw_chunks),
            "domain": domain,
            "source": source,
        }

    def ingest_from_file(self, file_path: str, title: Optional[str] = None, domain: str = "general") -> dict:
        """Ingest a document from a local file path."""
        path = Path(file_path)
        if not path.exists():
            return {"error": f"File not found: {file_path}", "chunks_created": 0}
        
        content = path.read_text(encoding="utf-8", errors="replace")
        title = title or path.name
        return self.ingest_document(title, content, source=f"file:{file_path}", domain=domain)

    # ── Semantic Search ────────────────────────────────────────────────────
    def query(
        self,
        query_text: str,
        top_k: int = TOP_K_DEFAULT,
        domain_filter: Optional[str] = None,
        min_confidence: float = CONFIDENCE_THRESHOLD,
    ) -> dict:
        """
        Semantic search over grounding documents.
        
        Returns ranked results with confidence scores and source attribution.
        """
        if not self._embedder:
            return {"error": "Embedder not available", "results": [], "confidence": 0.0}

        if not self.chunks:
            return {"error": "No documents indexed", "results": [], "confidence": 0.0}

        query_embedding = self._embed(query_text)
        if query_embedding is None:
            return {"error": "Failed to embed query", "results": [], "confidence": 0.0}

        # Search via FAISS or brute force
        results = self._search(query_embedding, top_k * 3, domain_filter)  # Over-fetch for filtering

        # Calculate confidence and filter
        scored = []
        for chunk, distance in results:
            # Convert distance to similarity (cosine)
            similarity = 1.0 - distance
            if similarity < min_confidence:
                continue
            scored.append({
                "chunk_id": chunk.id,
                "doc_id": chunk.doc_id,
                "doc_title": chunk.doc_title,
                "doc_source": chunk.doc_source,
                "content": chunk.content,
                "domain": chunk.domain,
                "chunk_index": chunk.chunk_index,
                "confidence": round(similarity, 4),
                "metadata": chunk.metadata,
            })

        # Sort by confidence desc, take top_k
        scored.sort(key=lambda x: x["confidence"], reverse=True)
        top_results = scored[:top_k]

        # Overall confidence = average of top results
        avg_confidence = round(
            sum(r["confidence"] for r in top_results) / len(top_results), 4
        ) if top_results else 0.0

        return {
            "query": query_text,
            "results": top_results,
            "confidence": avg_confidence,
            "domain_filter": domain_filter,
            "total_chunks_searched": len(self.chunks),
            "results_count": len(top_results),
        }

    def get_document(self, doc_id: str) -> Optional[dict]:
        """Get document metadata by ID."""
        return self.documents.get(doc_id)

    def list_documents(self, domain: Optional[str] = None) -> list[dict]:
        """List all ingested documents, optionally filtered by domain."""
        docs = []
        for doc in self.documents.values():
            if domain and doc.get("domain") != domain:
                continue
            docs.append(doc)
        return docs

    def delete_document(self, doc_id: str) -> bool:
        """Delete a document and all its chunks."""
        if doc_id not in self.documents:
            return False
        
        # Remove chunks
        chunks_to_remove = [cid for cid, c in self.chunks.items() if c.doc_id == doc_id]
        for cid in chunks_to_remove:
            del self.chunks[cid]
            chunk_file = GROUNDING_DIR / f"{cid}.json"
            if chunk_file.exists():
                chunk_file.unlink()

        # Remove doc
        del self.documents[doc_id]
        doc_file = GROUNDING_DIR / f"doc_{doc_id}.json"
        if doc_file.exists():
            doc_file.unlink()

        self._rebuild_index()
        logger.info("document_deleted", doc_id=doc_id, chunks_removed=len(chunks_to_remove))
        return True

    # ── Internal ──────────────────────────────────────────────────────────────
    def _chunk_text(self, text: str, chunk_size: int, overlap: int) -> list[str]:
        """Split text into overlapping chunks by sentences."""
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) <= chunk_size:
            return [text]

        # Split into sentences
        sentences = re.split(r"(?<=[.!?])\s+", text)
        chunks = []
        current_chunk = ""

        for sentence in sentences:
            if len(current_chunk) + len(sentence) + 1 <= chunk_size:
                current_chunk = (current_chunk + " " + sentence).strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                # Overlap: keep last `overlap` chars from previous chunk
                if current_chunk and overlap > 0:
                    overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                    current_chunk = (overlap_text + " " + sentence).strip()
                else:
                    current_chunk = sentence

        if current_chunk:
            chunks.append(current_chunk)

        return chunks

    def _embed(self, text: str) -> Optional[list[float]]:
        """Embed text using sentence-transformers."""
        if self._embedder is None:
            return None
        try:
            vec = self._embedder.encode(text, convert_to_numpy=True, normalize_embeddings=True)
            return vec.tolist()
        except Exception as e:
            logger.error("embedding_failed", error=str(e))
            return None

    def _rebuild_index(self) -> None:
        """Rebuild FAISS index from current chunks."""
        try:
            import faiss
            vectors = []
            ids = []
            for cid, chunk in self.chunks.items():
                if chunk.embedding:
                    vectors.append(chunk.embedding)
                    ids.append(cid)

            if not vectors:
                self._faiss_index = None
                self._index_built = False
                return

            vecs = np.array(vectors, dtype="float32")
            index = faiss.IndexFlatIP(EMBED_DIM)  # Inner product = cosine for normalized
            index.add(vecs)
            self._faiss_index = index
            self._index_id_map = ids
            self._index_built = True
            logger.info("faiss_index_rebuilt", chunks=len(vectors))
        except ImportError:
            logger.warning("faiss_not_installed", detail="Using brute-force search")
            self._faiss_index = None
            self._index_built = False
        except Exception as e:
            logger.error("faiss_rebuild_failed", error=str(e))
            self._faiss_index = None
            self._index_built = False

    def _search(self, query_vec: list[float], top_k: int, domain_filter: Optional[str] = None) -> list[tuple[GroundingChunk, float]]:
        """Search index and return chunks with distances."""
        q = np.array([query_vec], dtype="float32")

        if self._index_built and self._faiss_index is not None:
            distances, indices = self._faiss_index.search(q, min(top_k, len(self._index_id_map)))
            results = []
            for dist, idx in zip(distances[0], indices[0]):
                if idx < 0 or idx >= len(self._index_id_map):
                    continue
                chunk_id = self._index_id_map[idx]
                chunk = self.chunks.get(chunk_id)
                if chunk:
                    if domain_filter and chunk.domain != domain_filter:
                        continue
                    results.append((chunk, float(dist)))
            return results
        else:
            # Brute-force fallback
            results = []
            for chunk in self.chunks.values():
                if not chunk.embedding:
                    continue
                if domain_filter and chunk.domain != domain_filter:
                    continue
                # Cosine similarity = dot product for normalized vectors
                sim = np.dot(q[0], np.array(chunk.embedding, dtype="float32"))
                results.append((chunk, 1.0 - float(sim)))  # Convert to distance
            results.sort(key=lambda x: x[1])
            return results[:top_k]

    def _persist_chunk(self, chunk: GroundingChunk) -> None:
        """Save chunk metadata to disk."""
        try:
            fpath = GROUNDING_DIR / f"{chunk.id}.json"
            fpath.write_text(json.dumps(chunk.to_dict(), indent=2))
        except Exception as e:
            logger.error("chunk_persist_failed", chunk_id=chunk.id, error=str(e))

    def _persist_doc(self, doc_id: str) -> None:
        """Save document metadata to disk."""
        try:
            fpath = GROUNDING_DIR / f"doc_{doc_id}.json"
            fpath.write_text(json.dumps(self.documents[doc_id], indent=2))
        except Exception as e:
            logger.error("doc_persist_failed", doc_id=doc_id, error=str(e))

    def get_stats(self) -> dict:
        """Get store statistics."""
        domains: dict[str, int] = {}
        for chunk in self.chunks.values():
            domains[chunk.domain] = domains.get(chunk.domain, 0) + 1

        return {
            "total_documents": len(self.documents),
            "total_chunks": len(self.chunks),
            "domains": domains,
            "index_built": self._index_built,
            "embedder_available": self._embedder is not None,
            "storage_dir": str(GROUNDING_DIR),
        }


# ── Helper: time import ────────────────────────────────────────────────────
import time

__all__ = ["GroundingStore", "GroundingChunk"]
