"""Plugin Registry — Plugin registration and lifecycle management."""

import json
from typing import Dict, List


class PluginRegistry:
    """Central plugin registry for Omega AI."""

    def __init__(self):
        self.registered = {}
        self.dependencies = {}

    def register(self, name: str, version: str, entry_point: str, dependencies: List[str] = None) -> Dict:
        plugin = {
            "name": name,
            "version": version,
            "entry_point": entry_point,
            "dependencies": dependencies or [],
            "status": "registered",
        }
        self.registered[name] = plugin
        self.dependencies[name] = dependencies or []
        return plugin

    def unregister(self, name: str) -> bool:
        if name in self.registered:
            del self.registered[name]
            del self.dependencies[name]
            return True
        return False

    def get(self, name: str) -> Dict:
        return self.registered.get(name, {"error": "Plugin not registered"})

    def list_all(self) -> List[Dict]:
        return list(self.registered.values())

    def check_dependencies(self, name: str) -> Dict:
        deps = self.dependencies.get(name, [])
        missing = [d for d in deps if d not in self.registered]
        return {"plugin": name, "dependencies": deps, "missing": missing, "satisfied": len(missing) == 0}

    def resolve_load_order(self) -> List[str]:
        """Topological sort for plugin loading."""
        loaded = set()
        order = []
        def load(name):
            if name in loaded:
                return
            for dep in self.dependencies.get(name, []):
                load(dep)
            loaded.add(name)
            order.append(name)
        for name in self.registered:
            load(name)
        return order


if __name__ == "__main__":
    registry = PluginRegistry()
    registry.register("core", "1.0", "core.plugin")
    registry.register("weather", "1.0", "weather.plugin", ["core"])
    registry.register("advanced", "2.0", "advanced.plugin", ["core", "weather"])
    print(json.dumps(registry.check_dependencies("advanced"), indent=2))
    print(json.dumps(registry.resolve_load_order(), indent=2))
