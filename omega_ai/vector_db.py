"""VectorDB — Simple TF-IDF vector database with cosine similarity search.

No external dependencies. Stores documents as JSON with word-frequency vectors.
Can be imported via ``__import__("omega_ai.vector_db")`` and instantiated as
``VectorDB(db_path="...")``.

Example::

    >>> from omega_ai.vector_db import VectorDB
    >>> db = VectorDB("my_vectors.json")
    >>> db.store("doc_1", "Python is great for machine learning")
    >>> db.search("machine learning", top_k=3)
    {"results": [{"id": "doc_1", "text": "...", "score": 0.98}], "query": "machine learning"}
"""

from __future__ import annotations

import json
import math
import os
import re
import time
from typing import Any


class VectorDB:
    """Simple vector database using TF word-frequency vectors and cosine similarity.

    Documents are persisted to a JSON file. The vector space is built from
    word-frequency (TF) representations — no external ML libraries required.

    Internally each document stores a **token-count map**; dense vectors are
    materialised lazily at search time against the current global vocabulary so
    that every vector shares the same dimensional space.

    Parameters
    ----------
    db_path : str
        Path to the JSON file used for persistence. Defaults to
        ``"data/vector_db.json"``.

    Attributes
    ----------
    db_path : str
        Resolved absolute path to the JSON storage file.
    documents : dict[str, dict[str, Any]]
        In-memory mapping of ``doc_id -> {"text": str, "tokens": dict[str, int]}``.
    vocabulary : set[str]
        Union of all tokens seen across stored documents.
    """

    def __init__(self, db_path: str = "data/vector_db.json") -> None:
        """Initialise the VectorDB and load any existing data.

        The parent directory of *db_path* is created automatically if it does
        not already exist.
        """
        self.db_path: str = os.path.abspath(db_path)
        self.documents: dict[str, dict[str, Any]] = {}
        self.vocabulary: set[str] = set()

        # Ensure directory exists
        db_dir = os.path.dirname(self.db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

        self._load()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def search(self, query: str, top_k: int = 5) -> dict[str, Any]:
        """Search documents by semantic (cosine) similarity.

        Parameters
        ----------
        query : str
            Free-text query.
        top_k : int, optional
            Maximum number of results to return (default 5).

        Returns
        -------
        dict
            ::

                {
                    "results": [
                        {"id": str, "text": str, "score": float},
                        ...
                    ],
                    "query": str,
                    "status": "ok"
                }
        """
        if not self.documents:
            return {
                "results": [],
                "query": query,
                "status": "ok",
            }

        if not query or not query.strip():
            return {
                "results": [],
                "query": query,
                "status": "ok",
                "message": "Empty query provided.",
            }

        query_vector = self._compute_vector(query)
        vocab_list = sorted(self.vocabulary)

        scored: list[tuple[str, float]] = []
        for doc_id, doc in self.documents.items():
            doc_tokens = doc.get("tokens", {})
            if not doc_tokens:
                continue
            doc_vector = self._tokens_to_dense_vector(doc_tokens, vocab_list)
            score = self._cosine_similarity(query_vector, doc_vector)
            scored.append((doc_id, score))

        # Sort by score descending
        scored.sort(key=lambda x: x[1], reverse=True)

        results = []
        for doc_id, score in scored[:top_k]:
            doc = self.documents[doc_id]
            results.append({
                "id": doc_id,
                "text": doc.get("text", ""),
                "score": round(score, 6),
            })

        return {
            "results": results,
            "query": query,
            "status": "ok",
        }

    def store(self, doc_id: str, text: str) -> dict[str, Any]:
        """Store a document with an auto-generated TF vector.

        Parameters
        ----------
        doc_id : str
            Unique identifier for the document.
        text : str
            Raw document text.

        Returns
        -------
        dict
            ::

                {
                    "id": str,
                    "stored": bool,
                    "unique_tokens": int,
                    "status": "ok"
                }
        """
        tokens = self._tokenise(text)
        token_counts: dict[str, int] = {}
        for t in tokens:
            token_counts[t] = token_counts.get(t, 0) + 1

        self.documents[doc_id] = {
            "text": text,
            "tokens": token_counts,
            "stored_at": time.time(),
        }
        self.vocabulary.update(token_counts.keys())
        self._save()

        return {
            "id": doc_id,
            "stored": True,
            "unique_tokens": len(token_counts),
            "status": "ok",
        }

    def delete(self, doc_id: str) -> dict[str, Any]:
        """Delete a document by ID.

        Parameters
        ----------
        doc_id : str
            The ID of the document to remove.

        Returns
        -------
        dict
            ::

                {
                    "id": str,
                    "deleted": bool,
                    "status": "ok"
                }
        """
        if doc_id in self.documents:
            del self.documents[doc_id]
            self._rebuild_vocabulary()
            self._save()
            return {
                "id": doc_id,
                "deleted": True,
                "status": "ok",
            }

        return {
            "id": doc_id,
            "deleted": False,
            "status": "ok",
            "message": "Document not found.",
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _compute_vector(self, text: str) -> list[float]:
        """Build a dense word-frequency (TF) vector from *text*.

        The vector is aligned to the **current global vocabulary** (sorted
        alphabetically) so that it is directly comparable with every stored
        document vector.

        Parameters
        ----------
        text : str
            Input text to vectorise.

        Returns
        -------
        list[float]
            Normalised word-frequency vector.
        """
        tokens = self._tokenise(text)
        if not tokens:
            # Return a zero vector of the correct dimension
            return [0.0] * len(self.vocabulary)

        token_counts: dict[str, int] = {}
        for t in tokens:
            token_counts[t] = token_counts.get(t, 0) + 1

        vocab_list = sorted(self.vocabulary)
        return self._tokens_to_dense_vector(token_counts, vocab_list)

    def _tokens_to_dense_vector(
        self,
        token_counts: dict[str, int],
        vocab_list: list[str],
    ) -> list[float]:
        """Convert a token-count map into a dense TF vector against *vocab_list*.

        Parameters
        ----------
        token_counts : dict[str, int]
            Mapping of token -> raw count.
        vocab_list : list[str]
            Ordered vocabulary (shared across all vectors).

        Returns
        -------
        list[float]
            L2-normalised TF vector.  Terms not present in *token_counts*
            contribute ``0.0``.
        """
        total = sum(token_counts.values())
        if total == 0:
            return [0.0] * len(vocab_list)

        vector = [token_counts.get(term, 0) / total for term in vocab_list]

        # L2-normalise
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0:
            vector = [x / norm for x in vector]

        return vector

    def _cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        """Cosine similarity between two dense float vectors.

        Both vectors are expected to be in the **same dimensional space**.
        """
        if not vec_a or not vec_b:
            return 0.0

        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(x * x for x in vec_a))
        norm_b = math.sqrt(sum(x * x for x in vec_b))

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot / (norm_a * norm_b)

    def _tokenise(self, text: str) -> list[str]:
        """Normalise and tokenise text into lowercase alphanumeric words."""
        text = text.lower()
        tokens = re.findall(r"[a-z0-9]+", text)
        return tokens

    def _rebuild_vocabulary(self) -> None:
        """Rebuild the vocabulary from all currently stored documents."""
        self.vocabulary = set()
        for doc in self.documents.values():
            self.vocabulary.update(doc.get("tokens", {}).keys())

    def _save(self) -> None:
        """Persist documents to the JSON file.

        The file is written atomically (via a temporary file + rename) to
        guard against corruption on process crash.
        """
        tmp_path = self.db_path + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as fh:
            json.dump(self.documents, fh, ensure_ascii=False, indent=2)
        os.replace(tmp_path, self.db_path)

    def _load(self) -> None:
        """Load documents from the JSON file if it exists."""
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, "r", encoding="utf-8") as fh:
                    self.documents = json.load(fh)
                for doc in self.documents.values():
                    self.vocabulary.update(doc.get("tokens", {}).keys())
            except (json.JSONDecodeError, OSError):
                self.documents = {}
                self.vocabulary = set()
