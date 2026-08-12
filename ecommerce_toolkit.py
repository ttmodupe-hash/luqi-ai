"""E-commerce Toolkit — Online store management and marketplace integration."""

import json
from typing import Dict, List


class EcommerceToolkit:
    """E-commerce management toolkit."""

    def __init__(self):
        self.products = []
        self.orders = []

    def add_product(self, name: str, price: float, stock: int, category: str = "general") -> Dict:
        product = {
            "id": len(self.products) + 1,
            "name": name,
            "price": price,
            "stock": stock,
            "category": category,
        }
        self.products.append(product)
        return product

    def create_order(self, items: List[Dict], customer: str) -> Dict:
        total = sum(i["price"] * i["quantity"] for i in items)
        order = {
            "id": len(self.orders) + 1,
            "customer": customer,
            "items": items,
            "total": total,
            "status": "pending",
        }
        self.orders.append(order)
        return order

    def calculate_vat(self, amount: float, rate: float = 0.15) -> Dict:
        vat = amount * rate
        return {
            "subtotal": amount,
            "vat_rate": rate,
            "vat_amount": vat,
            "total": amount + vat,
        }

    def apply_discount(self, amount: float, discount_type: str = "percentage", value: float = 0.0) -> Dict:
        if discount_type == "percentage":
            discount = amount * (value / 100)
        else:
            discount = value
        return {
            "original": amount,
            "discount": discount,
            "final": max(0, amount - discount),
        }


if __name__ == "__main__":
    toolkit = EcommerceToolkit()
    toolkit.add_product("T-shirt", 250.0, 100, "clothing")
    order = toolkit.create_order([{"price": 250.0, "quantity": 2}], "John")
    print(json.dumps(order, indent=2))
    print(json.dumps(toolkit.calculate_vat(500), indent=2))
