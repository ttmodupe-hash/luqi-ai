"""Plugin Marketplace — Plugin discovery and marketplace."""

import json
from typing import Dict, List


class PluginMarketplace:
    """Plugin marketplace for Omega AI."""

    def __init__(self):
        self.plugins = []

    def list_plugins(self, category: str = None) -> List[Dict]:
        if category:
            return [p for p in self.plugins if p.get("category") == category]
        return self.plugins

    def get_plugin(self, name: str) -> Dict:
        return next((p for p in self.plugins if p["name"] == name), {"error": "Plugin not found"})

    def install(self, name: str) -> Dict:
        plugin = self.get_plugin(name)
        if "error" in plugin:
            return plugin
        return {"status": "installed", "plugin": name, "version": plugin.get("version")}

    def uninstall(self, name: str) -> Dict:
        return {"status": "uninstalled", "plugin": name}

    def add_to_marketplace(self, name: str, version: str, description: str, category: str, author: str, downloads: int = 0) -> Dict:
        plugin = {
            "name": name,
            "version": version,
            "description": description,
            "category": category,
            "author": author,
            "downloads": downloads,
            "rating": 0.0,
        }
        self.plugins.append(plugin)
        return plugin

    def rate_plugin(self, name: str, rating: float) -> Dict:
        plugin = next((p for p in self.plugins if p["name"] == name), None)
        if plugin:
            plugin["rating"] = round((plugin["rating"] + rating) / 2, 1)
            return {"status": "rated", "new_rating": plugin["rating"]}
        return {"error": "Plugin not found"}


if __name__ == "__main__":
    market = PluginMarketplace()
    market.add_to_marketplace("weather", "1.0", "Weather forecasts", "utility", "Omega Team")
    market.add_to_marketplace("finance", "2.0", "Financial advisor", "finance", "Omega Team")
    print(json.dumps(market.list_plugins(), indent=2))
    print(json.dumps(market.install("weather"), indent=2))
