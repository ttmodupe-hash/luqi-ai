"""Omega AI v3.7.0 — Federated Learning Coordinator
Learn from distributed users without centralizing raw data.
Aggregates model updates from edge clients while keeping data local.
"""
from __future__ import annotations

import hashlib
import json
import time
from typing import Any

from cache_manager import ModuleCache


class FederatedCoordinator:
    """Coordinate federated learning across distributed Luqi-AI instances.
    Implements FedAvg-style aggregation for intent classification weights."""

    def __init__(self) -> None:
        self._clients: dict[str, dict[str, Any]] = {}
        self._global_model: dict[str, Any] = self._init_global_model()
        self._round = 0
        self._cache = ModuleCache(default_ttl=3600)

    def _init_global_model(self) -> dict[str, Any]:
        """Initialize the global model with default intent weights."""
        return {
            "version": 1,
            "intent_weights": {k: 1.0 for k in [
                "language", "tax", "investment", "companion", "self_improve",
                "opportunity", "email", "financial_lit", "professional",
                "deep_research", "wisdom", "workflow", "visualization",
                "file_analysis", "digital_transform",
            ]},
            "updated_at": time.time(),
        }

    def register_client(self, client_id: str, capabilities: list[str] | None = None) -> dict[str, Any]:
        """Register a new federated learning client."""
        self._clients[client_id] = {
            "client_id": client_id,
            "capabilities": capabilities or [],
            "last_update": time.time(),
            "update_count": 0,
            "status": "active",
        }
        return {"success": True, "client_id": client_id, "global_version": self._global_model["version"]}

    def submit_update(self, client_id: str, local_weights: dict[str, float], sample_count: int = 1) -> dict[str, Any]:
        """Submit local model update from a client."""
        if client_id not in self._clients:
            return {"success": False, "error": "Client not registered"}
        # Store the update
        key = f"fl_update_{client_id}_{self._round}"
        self._cache.set(key, {"weights": local_weights, "samples": sample_count, "time": time.time()})
        self._clients[client_id]["update_count"] += 1
        self._clients[client_id]["last_update"] = time.time()
        return {"success": True, "round": self._round, "global_version": self._global_model["version"]}

    def aggregate(self) -> dict[str, Any]:
        """Aggregate all client updates using weighted averaging (FedAvg)."""
        # Collect all updates for current round
        updates = []
        total_samples = 0
        for client_id in self._clients:
            key = f"fl_update_{client_id}_{self._round}"
            update = self._cache.get(key)
            if update:
                updates.append((client_id, update))
                total_samples += update.get("samples", 1)
        if not updates:
            return {"success": False, "error": "No updates to aggregate"}
        # FedAvg: weighted average by sample count
        aggregated = dict(self._global_model["intent_weights"])
        for weight_key in aggregated:
            weighted_sum = 0.0
            for client_id, update in updates:
                local_weight = update["weights"].get(weight_key, 1.0)
                sample_weight = update["samples"] / total_samples
                weighted_sum += local_weight * sample_weight
            # Moving average with global model
            aggregated[weight_key] = 0.7 * aggregated[weight_key] + 0.3 * weighted_sum
        # Update global model
        self._global_model["intent_weights"] = aggregated
        self._global_model["version"] += 1
        self._global_model["updated_at"] = time.time()
        self._round += 1
        return {
            "success": True,
            "round": self._round,
            "participants": len(updates),
            "total_samples": total_samples,
            "new_version": self._global_model["version"],
        }

    def get_global_model(self) -> dict[str, Any]:
        """Get the current global model for clients to download."""
        return dict(self._global_model)

    def get_status(self) -> dict[str, Any]:
        return {
            "round": self._round,
            "registered_clients": len(self._clients),
            "global_version": self._global_model["version"],
            "model_size": len(str(self._global_model)),
            "mode": "federated_averaging",
        }
