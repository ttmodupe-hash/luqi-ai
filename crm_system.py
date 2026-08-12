"""CRM System — Customer relationship management."""

import json
from datetime import datetime
from typing import Dict, List, Optional


class CRMSystem:
    """Lightweight CRM for small businesses."""

    def __init__(self):
        self.contacts: List[Dict] = []
        self.leads: List[Dict] = []
        self.interactions: List[Dict] = []

    def add_contact(self, name: str, email: str, phone: str = "", company: str = "", tags: List[str] = None) -> Dict:
        contact = {
            "id": len(self.contacts) + 1,
            "name": name,
            "email": email,
            "phone": phone,
            "company": company,
            "tags": tags or [],
            "created": datetime.now().isoformat(),
        }
        self.contacts.append(contact)
        return contact

    def add_lead(self, name: str, source: str, status: str = "new", value: float = 0.0) -> Dict:
        lead = {
            "id": len(self.leads) + 1,
            "name": name,
            "source": source,
            "status": status,
            "value": value,
            "created": datetime.now().isoformat(),
        }
        self.leads.append(lead)
        return lead

    def add_interaction(self, contact_id: int, type: str, notes: str) -> Dict:
        interaction = {
            "id": len(self.interactions) + 1,
            "contact_id": contact_id,
            "type": type,
            "notes": notes,
            "timestamp": datetime.now().isoformat(),
        }
        self.interactions.append(interaction)
        return interaction

    def get_pipeline(self) -> Dict:
        stages = ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]
        return {stage: len([l for l in self.leads if l["status"] == stage]) for stage in stages}

    def search(self, query: str) -> List[Dict]:
        results = []
        for c in self.contacts:
            if query.lower() in c["name"].lower() or query.lower() in c["email"].lower():
                results.append(c)
        return results


if __name__ == "__main__":
    crm = CRMSystem()
    crm.add_contact("John Doe", "john@example.com", "+27123456789", "Acme Inc")
    crm.add_lead("Jane Smith", "Website", "new", 50000)
    print(json.dumps(crm.get_pipeline(), indent=2))
    print(json.dumps(crm.search("john"), indent=2))
