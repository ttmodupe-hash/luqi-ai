"""Memory Store — Persistent memory storage with vector capabilities."""

import json
import os
from typing import Dict, List


class MemoryStore:
    """Persistent memory store for Omega AI."""

    def __init__(self, path: str = "data/memory_store.json"):
        self.path = path
        self.memories = []
        self.load()

    def load(self):
        if os.path.exists(self.path):
            with open(self.path, "r") as f:
                self.memories = json.load(f)

    def save(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "w") as f:
            json.dump(self.memories, f, indent=2)

    def add(self, content: str, category: str = "general", importance: float = 0.5) -> Dict:
        memory = {
            "id": len(self.memories) + 1,
            "content": content,
            "category": category,
            "importance": importance,
            "created": json.dumps("now"),
            "access_count": 0,
        }
        self.memories.append(memory)
        self.save()
        return memory

    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        # Simple keyword search - in production, use vector search
        results = []
        for m in self.memories:
            if query.lower() in m["content"].lower():
                m["access_count"] += 1
                results.append(m)
        return sorted(results, key=lambda x: x["importance"], reverse=True)[:top_k]

    def get_by_category(self, category: str) -> List[Dict]:
        return [m for m in self.memories if m["category"] == category]

    def delete(self, memory_id: int) -> bool:
        self.memories = [m for m in self.memories if m["id"] != memory_id]
        self.save()
        return True

    def stats(self) -> Dict:
        categories = {}
        for m in self.memories:
            categories[m["category"]] = categories.get(m["category"], 0) + 1
        return {"total": len(self.memories), "categories": categories}


if __name__ == "__main__":
    store = MemoryStore()
    store.add("User prefers dark mode", "preference", 0.9)
    store.add("User works in finance", "profile", 0.8)
    print(json.dumps(store.search("dark mode"), indent=2))
    print(json.dumps(store.stats(), indent=2))
