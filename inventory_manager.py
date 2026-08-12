"""Inventory Manager — Stock and inventory management system."""

import json
from typing import Dict, List


class InventoryManager:
    """Inventory and stock management system."""

    def __init__(self):
        self.items = []
        self.movements = []

    def add_item(self, sku: str, name: str, quantity: int, unit_cost: float, location: str = "main") -> Dict:
        item = {
            "sku": sku,
            "name": name,
            "quantity": quantity,
            "unit_cost": unit_cost,
            "location": location,
            "value": quantity * unit_cost,
        }
        self.items.append(item)
        return item

    def stock_in(self, sku: str, quantity: int, reason: str = "purchase"):
        item = next((i for i in self.items if i["sku"] == sku), None)
        if item:
            item["quantity"] += quantity
            item["value"] = item["quantity"] * item["unit_cost"]
            self.movements.append({"sku": sku, "type": "in", "quantity": quantity, "reason": reason})
            return True
        return False

    def stock_out(self, sku: str, quantity: int, reason: str = "sale"):
        item = next((i for i in self.items if i["sku"] == sku), None)
        if item and item["quantity"] >= quantity:
            item["quantity"] -= quantity
            item["value"] = item["quantity"] * item["unit_cost"]
            self.movements.append({"sku": sku, "type": "out", "quantity": quantity, "reason": reason})
            return True
        return False

    def get_valuation(self) -> Dict:
        total = sum(i["value"] for i in self.items)
        return {"total_items": len(self.items), "total_value": total}

    def low_stock_alert(self, threshold: int = 10) -> List[Dict]:
        return [i for i in self.items if i["quantity"] <= threshold]


if __name__ == "__main__":
    inv = InventoryManager()
    inv.add_item("SKU001", "Widget", 100, 50.0)
    inv.stock_out("SKU001", 20)
    print(json.dumps(inv.get_valuation(), indent=2))
    print(json.dumps(inv.low_stock_alert(), indent=2))
