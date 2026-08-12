"""Legal Assistant — Legal information and document assistant."""

import json
from typing import Dict, List


class LegalAssistant:
    """South African legal information assistant."""

    def __init__(self):
        self.acts = {
            "constitution": {"year": 1996, "chapters": 14, "key_rights": ["Equality", "Human dignity", "Life", "Freedom"]},
            "companies_act": {"year": 2008, "focus": "Corporate governance", "key_sections": ["Directors", "Shareholders", "Audit"]},
            "labour_relations_act": {"year": 1995, "focus": "Worker rights", "key_sections": ["Unfair dismissal", "Strikes", "Unions"]},
            "popia": {"year": 2013, "focus": "Data protection", "key_sections": ["Consent", "Purpose", "Security"]},
            "poea": {"year": 2000, "focus": "Employment equity", "key_sections": ["Discrimination", "Affirmative action"]},
        }
        self.courts = [
            {"name": "Constitutional Court", "location": "Johannesburg", "jurisdiction": "Constitutional matters"},
            {"name": "Supreme Court of Appeal", "location": "Bloemfontein", "jurisdiction": "Appeals"},
            {"name": "High Court", "location": "Various", "jurisdiction": "General"},
            {"name": "Magistrates Court", "location": "Various", "jurisdiction": "Civil up to R400k"},
        ]

    def get_act(self, name: str) -> Dict:
        return self.acts.get(name.lower().replace(" ", "_"), {"error": "Act not found"})

    def find_court(self, jurisdiction: str = None) -> List[Dict]:
        if jurisdiction:
            return [c for c in self.courts if jurisdiction.lower() in c["jurisdiction"].lower()]
        return self.courts

    def legal_process(self, matter: str) -> List[str]:
        processes = {
            "small_claims": ["File claim at clerk", "Pay fee", "Serve defendant", "Attend hearing"],
            "divorce": ["Consult attorney", "Draft summons", "Serve spouse", "Mediation/Court"],
            "property_transfer": ["Offer to purchase", "Bond approval", "Conveyancer", "Needfuls", "Registration"],
        }
        return processes.get(matter.lower().replace(" ", "_"), ["Consult a legal professional"])

    def document_templates(self, doc_type: str) -> Dict:
        templates = {
            "affidavit": {"required": ["Deponent details", "Facts", "Oath"], "cost": "Commissioner free"},
            "poa": {"required": ["Principal", "Agent", "Powers"], "cost": "Attorney fees vary"},
            "nda": {"required": ["Parties", "Confidential info", "Duration"], "cost": "R500-R2000"},
        }
        return templates.get(doc_type.lower(), {"error": "Template not available"})


if __name__ == "__main__":
    legal = LegalAssistant()
    print(json.dumps(legal.get_act("popia"), indent=2))
    print(json.dumps(legal.find_court("Constitutional"), indent=2))
    print(legal.legal_process("small_claims"))
