"""Blockchain Audit — Immutable audit trail using blockchain concepts."""

import hashlib
import json
import time
from dataclasses import asdict, dataclass
from typing import List, Optional


@dataclass
class AuditEntry:
    timestamp: float
    action: str
    actor: str
    resource: str
    details: dict
    previous_hash: str
    hash: str = ""


class BlockchainAudit:
    """Simple blockchain-style audit trail."""

    def __init__(self):
        self.chain: List[AuditEntry] = []
        self._create_genesis_block()

    def _create_genesis_block(self):
        entry = AuditEntry(
            timestamp=time.time(),
            action="GENESIS",
            actor="system",
            resource="audit_chain",
            details={},
            previous_hash="0",
        )
        entry.hash = self._hash_entry(entry)
        self.chain.append(entry)

    def _hash_entry(self, entry: AuditEntry) -> str:
        data = json.dumps(asdict(entry), sort_keys=True, default=str)
        return hashlib.sha256(data.encode()).hexdigest()

    def record(self, action: str, actor: str, resource: str, details: dict) -> str:
        previous = self.chain[-1]
        entry = AuditEntry(
            timestamp=time.time(),
            action=action,
            actor=actor,
            resource=resource,
            details=details,
            previous_hash=previous.hash,
        )
        entry.hash = self._hash_entry(entry)
        self.chain.append(entry)
        return entry.hash

    def verify(self) -> bool:
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]
            if current.previous_hash != previous.hash:
                return False
            if self._hash_entry(current) != current.hash:
                return False
        return True

    def get_history(self, resource: Optional[str] = None) -> List[dict]:
        entries = [asdict(e) for e in self.chain]
        if resource:
            entries = [e for e in entries if e["resource"] == resource]
        return entries


if __name__ == "__main__":
    audit = BlockchainAudit()
    audit.record("CREATE", "user_1", "document_1", {"title": "Report"})
    audit.record("UPDATE", "user_2", "document_1", {"title": "Report v2"})
    print(f"Chain valid: {audit.verify()}")
    print(json.dumps(audit.get_history(), indent=2))
