"""
web_core.agents.document - Document processing agent.
Coordinates parsing engine with document store.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, Optional

from web_core.db.documents import DocumentStore
from web_core.engines.document import DocumentEngine

logger = logging.getLogger("luqi.agents.document")


class DocumentAgent:
    """Handles file uploads, parsing, and retrieval."""

    def __init__(self, engine: DocumentEngine, store: DocumentStore):
        self.engine = engine
        self.store = store

    def process_upload(self, file_path: str | Path) -> Dict[str, Any]:
        """Parse a file and persist metadata. Returns result dict."""
        result = self.engine.parse(file_path)
        if result.get("status") == "ok":
            doc_id = self.store.save_document(
                filename=result["filename"],
                ext=result["type"],
                preview=result["content"][:1000],
                file_path=str(file_path)
            )
            result["document_id"] = doc_id
        return result

    def get_documents(self) -> list:
        return self.store.get_all()

    def get_document(self, doc_id: int) -> Optional[dict]:
        info = self.store.get_by_id(doc_id)
        if info:
            return {
                "id": info.id,
                "filename": info.filename,
                "type": info.doc_type,
                "preview": info.content_preview,
            }
        return None

    def supported_types(self) -> list:
        return sorted(self.engine.supported_extensions())
