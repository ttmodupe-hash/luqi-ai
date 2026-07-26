"""
Blockchain Audit Module for LUQI AI.

Provides an immutable, hash-linked audit trail where every entry becomes a block
chained to the previous one via SHA-256. Any tampering breaks the chain and is
detected by verify_chain().

Usage:
    mod = __import__("omega_ai.blockchain_audit")
    engine = mod.BlockchainAuditor(chain_path="data/audit.json")
    engine.add_entry("user.login", "admin@luqi.ai", {"ip": "1.2.3.4"})
    result = engine.verify_chain()
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from typing import Any


class BlockchainAuditor:
    """Simple blockchain-based audit log. Each entry is a block with hash linking."""

    def __init__(self, chain_path: str = "data/audit_chain.json") -> None:
        """Initialize the auditor, loading existing chain or creating a genesis block.

        Args:
            chain_path: File path where the JSON chain is persisted.
        """
        self.chain_path = chain_path
        self._chain: list[dict[str, Any]] = []
        self._load()

    # ── internal helpers ──────────────────────────────────────────────────

    def _load(self) -> None:
        """Load chain from disk or start fresh with a genesis block."""
        if os.path.exists(self.chain_path):
            try:
                with open(self.chain_path, "r", encoding="utf-8") as fh:
                    self._chain = json.load(fh)
                return
            except (json.JSONDecodeError, OSError):
                pass
        self._chain = [self._create_genesis_block()]
        self._persist()

    def _persist(self) -> None:
        """Save the current chain to disk."""
        os.makedirs(os.path.dirname(self.chain_path) or ".", exist_ok=True)
        with open(self.chain_path, "w", encoding="utf-8") as fh:
            json.dump(self._chain, fh, indent=2)

    def _create_genesis_block(self) -> dict[str, Any]:
        """Create the genesis block (index 0)."""
        block = {
            "index": 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "GENESIS",
            "actor": "system",
            "details": {},
            "prev_hash": "0",
            "hash": "",
        }
        block["hash"] = self._compute_hash(block)
        return block

    def _compute_hash(self, block: dict[str, Any]) -> str:
        """Compute SHA-256 hash of a block (excludes the 'hash' field itself).

        Args:
            block: A block dictionary.

        Returns:
            Hex digest string of the block's canonical JSON encoding.
        """
        payload = {k: v for k, v in block.items() if k != "hash"}
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    # ── public API ────────────────────────────────────────────────────────

    def add_entry(self, action: str, actor: str, details: dict | None = None) -> dict:
        """Add a new audit entry as a block linked to the previous one.

        Args:
            action: Description of the action being logged.
            actor: Identifier of the entity performing the action.
            details: Optional dictionary with extra metadata.

        Returns:
            Dictionary with block_index, hash, and timestamp.
        """
        prev_block = self._chain[-1]
        block: dict[str, Any] = {
            "index": len(self._chain),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "actor": actor,
            "details": details or {},
            "prev_hash": prev_block["hash"],
            "hash": "",
        }
        block["hash"] = self._compute_hash(block)
        self._chain.append(block)
        self._persist()
        return {
            "result": "success",
            "status": "ok",
            "data": {
                "block_index": block["index"],
                "hash": block["hash"],
                "timestamp": block["timestamp"],
            },
        }

    def get_audit_log(self) -> dict:
        """Get the full audit log with integrity summary.

        Returns:
            Dictionary with chain_length, blocks, and an integrity flag.
        """
        integrity = self.verify_chain()["data"]["valid"]
        return {
            "result": "success",
            "status": "ok",
            "data": {
                "chain_length": len(self._chain),
                "blocks": list(self._chain),
                "integrity": integrity,
            },
        }

    def verify_chain(self) -> dict:
        """Verify chain integrity by checking every hash link.

        Returns:
            Dictionary with valid flag, blocks_checked, and tampered_blocks list.
        """
        tampered: list[int] = []
        for i in range(1, len(self._chain)):
            curr = self._chain[i]
            prev = self._chain[i - 1]
            if curr["prev_hash"] != prev["hash"]:
                tampered.append(i)
            if self._compute_hash(curr) != curr["hash"]:
                tampered.append(i)
        tampered = sorted(set(tampered))
        return {
            "result": "success",
            "status": "ok",
            "data": {
                "valid": len(tampered) == 0,
                "blocks_checked": len(self._chain),
                "tampered_blocks": tampered,
            },
        }
