"""Invoice System — Invoice generation and management."""

import json
from datetime import datetime, timedelta
from typing import Dict, List


class InvoiceSystem:
    """Invoice management system."""

    def __init__(self):
        self.invoices = []

    def create_invoice(self, customer: str, items: List[Dict], vat_rate: float = 0.15) -> Dict:
        subtotal = sum(i["price"] * i["quantity"] for i in items)
        vat = subtotal * vat_rate
        total = subtotal + vat
        invoice = {
            "id": f"INV-{len(self.invoices) + 1001}",
            "customer": customer,
            "items": items,
            "subtotal": subtotal,
            "vat": vat,
            "total": total,
            "date": datetime.now().isoformat(),
            "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "status": "pending",
        }
        self.invoices.append(invoice)
        return invoice

    def get_invoice(self, invoice_id: str) -> Dict:
        return next((i for i in self.invoices if i["id"] == invoice_id), {"error": "Invoice not found"})

    def mark_paid(self, invoice_id: str) -> bool:
        inv = next((i for i in self.invoices if i["id"] == invoice_id), None)
        if inv:
            inv["status"] = "paid"
            return True
        return False

    def overdue_invoices(self) -> List[Dict]:
        now = datetime.now()
        return [i for i in self.invoices if i["status"] == "pending" and datetime.fromisoformat(i["due_date"]) < now]

    def revenue_report(self) -> Dict:
        paid = sum(i["total"] for i in self.invoices if i["status"] == "paid")
        pending = sum(i["total"] for i in self.invoices if i["status"] == "pending")
        return {"paid": paid, "pending": pending, "total": paid + pending}


if __name__ == "__main__":
    inv = InvoiceSystem()
    inv.create_invoice("Acme Inc", [{"description": "Consulting", "price": 5000, "quantity": 2}])
    print(json.dumps(inv.revenue_report(), indent=2))
