"""Search Engine - Full-text and semantic search for LUQI AI v29.1.0"""
import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import hashlib


@dataclass
class SearchResult:
    id: str
    title: str
    content: str
    score: float
    source: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    highlights: List[str] = field(default_factory=list)


class SearchEngine:
    """Full-text and semantic search engine."""

    def __init__(self):
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.index: Dict[str, List[str]] = {}  # term -> doc_ids
        self._lock = asyncio.Lock()

    async def index_document(self, doc_id: str, title: str, content: str, source: str = "", metadata: Dict = None):
        """Index a document for search."""
        async with self._lock:
            self.documents[doc_id] = {
                "id": doc_id,
                "title": title,
                "content": content,
                "source": source,
                "metadata": metadata or {},
                "indexed_at": datetime.utcnow().isoformat(),
            }
            
            # Tokenize and index
            tokens = self._tokenize(title + " " + content)
            for token in tokens:
                if token not in self.index:
                    self.index[token] = []
                if doc_id not in self.index[token]:
                    self.index[token].append(doc_id)

    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization."""
        # Lowercase, remove punctuation, split
        import re
        text = re.sub(r'[^\w\s]', ' ', text.lower())
        return [t for t in text.split() if len(t) > 2]

    async def search(self, query: str, limit: int = 10) -> List[SearchResult]:
        """Search for documents matching the query."""
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []
        
        # Score documents
        doc_scores: Dict[str, float] = {}
        for token in query_tokens:
            for doc_id in self.index.get(token, []):
                doc_scores[doc_id] = doc_scores.get(doc_id, 0) + 1
        
        # Normalize by document length
        for doc_id, score in doc_scores.items():
            doc = self.documents.get(doc_id)
            if doc:
                doc_len = len(self._tokenize(doc["content"]))
                doc_scores[doc_id] = score / (doc_len + 1) * 100
        
        # Sort by score
        sorted_docs = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)
        
        results = []
        for doc_id, score in sorted_docs[:limit]:
            doc = self.documents.get(doc_id)
            if doc:
                results.append(SearchResult(
                    id=doc_id,
                    title=doc["title"],
                    content=doc["content"][:500] + "..." if len(doc["content"]) > 500 else doc["content"],
                    score=round(score, 2),
                    source=doc["source"],
                    metadata=doc["metadata"],
                    highlights=[query],
                ))
        
        return results

    async def delete_document(self, doc_id: str):
        """Remove a document from the index."""
        async with self._lock:
            if doc_id in self.documents:
                del self.documents[doc_id]
            for token, doc_ids in self.index.items():
                if doc_id in doc_ids:
                    doc_ids.remove(doc_id)

    async def clear_index(self):
        """Clear all indexed documents."""
        async with self._lock:
            self.documents.clear()
            self.index.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Get search engine statistics."""
        return {
            "total_documents": len(self.documents),
            "total_terms": len(self.index),
            "avg_doc_length": sum(len(d["content"]) for d in self.documents.values()) / len(self.documents) if self.documents else 0,
        }


# Global search engine instance
search_engine = SearchEngine()


async def search(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Convenience function for searching."""
    results = await search_engine.search(query, limit)
    return [
        {
            "id": r.id,
            "title": r.title,
            "content": r.content,
            "score": r.score,
            "source": r.source,
        }
        for r in results
    ]
