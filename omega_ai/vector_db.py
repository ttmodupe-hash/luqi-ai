"""Omega AI v3.7.0 — Vector Database (Semantic Search)
Lightweight semantic search using sentence embeddings. Falls back to TF-IDF.
Enables RAG (Retrieval-Augmented Generation) pipeline.
"""
from __future__ import annotations

import json
import math
import pickle
import re
import time
from pathlib import Path
from typing import Any

# Try sentence-transformers, fall back to TF-IDF
try:
    from sentence_transformers import SentenceTransformer
    _HAS_ST = True
except ImportError:
    _HAS_ST = False


class VectorDatabase:
    """Semantic vector database with cosine similarity search."""

    def __init__(self, persist_path: str = ".omega_sessions/vector_db.pkl") -> None:
        self._persist_path = persist_path
        self._documents: list[dict[str, Any]] = []
        self._vectors: list[list[float]] = []
        self._model = None
        self._tfidf_fallback = {}
        if _HAS_ST:
            try:
                self._model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception:
                pass
        self._load()

    def _load(self) -> None:
        """Load persisted vectors."""
        path = Path(self._persist_path)
        if path.exists():
            try:
                data = pickle.loads(path.read_bytes())
                self._documents = data.get("docs", [])
                self._vectors = data.get("vecs", [])
            except Exception:
                pass

    def _save(self) -> None:
        """Persist vectors to disk."""
        Path(self._persist_path).parent.mkdir(parents=True, exist_ok=True)
        Path(self._persist_path).write_bytes(pickle.dumps({
            "docs": self._documents,
            "vecs": self._vectors,
        }))

    def _embed(self, text: str) -> list[float]:
        """Create embedding vector for text."""
        if self._model:
            return self._model.encode(text).tolist()
        # TF-IDF fallback
        return self._tfidf_vector(text)

    def _tfidf_vector(self, text: str) -> list[float]:
        """Simple TF-IDF vector as fallback."""
        words = re.findall(r'\w+', text.lower())
        vocab = self._tfidf_fallback.get("vocab", {})
        vec = [0.0] * len(vocab) if vocab else [float(hash(w) % 1000) / 1000 for w in words[:384]]
        if vocab:
            for w in words:
                if w in vocab:
                    vec[vocab[w]] += 1
        # Normalize
        norm = math.sqrt(sum(v**2 for v in vec)) or 1.0
        return [v / norm for v in vec]

    def add(self, text: str, metadata: dict[str, Any] | None = None, doc_id: str | None = None) -> str:
        """Add a document to the vector database."""
        vector = self._embed(text)
        doc = {
            "id": doc_id or f"doc_{len(self._documents)}_{int(time.time())}",
            "text": text,
            "metadata": metadata or {},
            "added_at": time.time(),
        }
        self._documents.append(doc)
        self._vectors.append(vector)
        self._save()
        return doc["id"]

    def search(self, query: str, top_k: int = 5, threshold: float = 0.3) -> list[dict[str, Any]]:
        """Semantic search with cosine similarity."""
        if not self._documents:
            return []
        query_vec = self._embed(query)
        # Compute cosine similarities
        similarities = []
        for doc, vec in zip(self._documents, self._vectors):
            sim = self._cosine_similarity(query_vec, vec)
            if sim >= threshold:
                similarities.append((sim, doc))
        # Sort by similarity descending
        similarities.sort(key=lambda x: x[0], reverse=True)
        results = []
        for sim, doc in similarities[:top_k]:
            results.append({
                **doc,
                "similarity": round(sim, 4),
            })
        return results

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        # Pad shorter vector
        max_len = max(len(a), len(b))
        a = a + [0.0] * (max_len - len(a))
        b = b + [0.0] * (max_len - len(b))
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x**2 for x in a)) or 1.0
        norm_b = math.sqrt(sum(x**2 for x in b)) or 1.0
        return dot / (norm_a * norm_b)

    def delete(self, doc_id: str) -> bool:
        """Delete a document by ID."""
        for i, doc in enumerate(self._documents):
            if doc["id"] == doc_id:
                del self._documents[i]
                del self._vectors[i]
                self._save()
                return True
        return False

    def count(self) -> int:
        return len(self._documents)

    def clear(self) -> None:
        self._documents = []
        self._vectors = []
        self._save()

    def stats(self) -> dict[str, Any]:
        return {
            "documents": len(self._documents),
            "has_model": self._model is not None,
            "backend": "sentence-transformers" if self._model else "tfidf-fallback",
            "persist_path": self._persist_path,
        }

    def ingest_knowledge_base(self) -> int:
        """Ingest all KB entries as vectors."""
        try:
            from knowledge_base import KNOWLEDGE_BASE
            count = 0
            for entry in KNOWLEDGE_BASE:
                text = f"{entry.get('question', '')} {entry.get('answer', '')}"
                if text.strip():
                    self.add(text, metadata={"source": "knowledge_base", "category": entry.get("category", "")})
                    count += 1
            return count
        except Exception:
            return 0


# Global instance
_vector_db: VectorDatabase | None = None

def get_vector_db() -> VectorDatabase:
    global _vector_db
    if _vector_db is None:
        _vector_db = VectorDatabase()
    return _vector_db
