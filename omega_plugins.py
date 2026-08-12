"""Omega Plugins — Plugin management and discovery."""

import json
from typing import Dict, List


class OmegaPlugins:
    """Plugin management system for Omega AI."""

    def __init__(self):
        self.plugins = {}
        self.hooks = {}

    def register(self, name: str, plugin_class, version: str = "1.0.0", description: str = "") -> Dict:
        plugin = {
            "name": name,
            "class": plugin_class,
            "version": version,
            "description": description,
            "enabled": True,
            "hooks": [],
        }
        self.plugins[name] = plugin
        return plugin

    def enable(self, name: str) -> bool:
        if name in self.plugins:
            self.plugins[name]["enabled"] = True
            return True
        return False

    def disable(self, name: str) -> bool:
        if name in self.plugins:
            self.plugins[name]["enabled"] = False
            return True
        return False

    def get_plugin(self, name: str) -> Dict:
        return self.plugins.get(name, {"error": "Plugin not found"})

    def list_plugins(self) -> List[Dict]:
        return [{"name": k, "version": v["version"], "enabled": v["enabled"], "description": v["description"]} for k, v in self.plugins.items()]

    def register_hook(self, event: str, plugin_name: str, handler):
        if event not in self.hooks:
            self.hooks[event] = []
        self.hooks[event].append({"plugin": plugin_name, "handler": handler})

    def trigger_hooks(self, event: str, data: Dict) -> List[Dict]:
        results = []
        for hook in self.hooks.get(event, []):
            if self.plugins.get(hook["plugin"], {}).get("enabled"):
                try:
                    result = hook["handler"](data)
                    results.append({"plugin": hook["plugin"], "result": result})
                except Exception as e:
                    results.append({"plugin": hook["plugin"], "error": str(e)})
        return results


if __name__ == "__main__":
    plugins = OmegaPlugins()
    plugins.register("weather", None, "1.0", "Weather information")
    plugins.register("news", None, "2.0", "News aggregator")
    print(json.dumps(plugins.list_plugins(), indent=2))
