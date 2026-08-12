"""Federated Learning — Distributed machine learning framework."""

import json
from typing import Dict, List


class FederatedLearning:
    """Federated learning coordinator."""

    def __init__(self):
        self.nodes: List[Dict] = []
        self.global_model = {}
        self.rounds = 0

    def register_node(self, node_id: str, capabilities: Dict) -> Dict:
        node = {
            "id": node_id,
            "capabilities": capabilities,
            "status": "ready",
            "last_update": None,
        }
        self.nodes.append(node)
        return node

    def collect_updates(self, node_id: str, model_update: Dict) -> bool:
        for node in self.nodes:
            if node["id"] == node_id:
                node["last_update"] = model_update
                node["status"] = "updated"
                return True
        return False

    def aggregate(self) -> Dict:
        """Aggregate model updates using FedAvg."""
        updates = [n["last_update"] for n in self.nodes if n["last_update"]]
        if not updates:
            return self.global_model

        # Simple averaging placeholder
        self.global_model = {
            "weights": "averaged",
            "nodes_contributed": len(updates),
            "round": self.rounds,
        }
        self.rounds += 1
        return self.global_model

    def get_status(self) -> Dict:
        return {
            "nodes": len(self.nodes),
            "rounds": self.rounds,
            "ready_nodes": len([n for n in self.nodes if n["status"] == "updated"]),
        }


if __name__ == "__main__":
    fl = FederatedLearning()
    fl.register_node("node_1", {"compute": "gpu", "bandwidth": "1gbps"})
    fl.register_node("node_2", {"compute": "cpu", "bandwidth": "100mbps"})
    fl.collect_updates("node_1", {"weights": [0.1, 0.2]})
    fl.collect_updates("node_2", {"weights": [0.15, 0.25]})
    print(json.dumps(fl.aggregate(), indent=2))
    print(json.dumps(fl.get_status(), indent=2))
