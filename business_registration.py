"""Business Registration — South African CIPC business registration helper."""

import json
from typing import Dict, List


class BusinessRegistration:
    """CIPC business registration assistant."""

    def __init__(self):
        self.business_types = {
            "pty_ltd": "Private Company (Pty) Ltd",
            "sole_prop": "Sole Proprietorship",
            "partnership": "Partnership",
            "ncc": "Non-Profit Company (NPC)",
            "coop": "Cooperative",
        }

    def get_requirements(self, business_type: str) -> Dict:
        reqs = {
            "pty_ltd": {
                "documents": ["ID copies of directors", "MOI (Memorandum of Incorporation)", "Name reservation"],
                "fees": {"CIPC": "R175", "name_reservation": "R50"},
                "time": "5-10 business days",
                "min_directors": 1,
            },
            "sole_prop": {
                "documents": ["ID copy", "proof of address"],
                "fees": {"CIPC": "Not required"},
                "time": "Immediate",
                "min_directors": 1,
            },
        }
        return reqs.get(business_type, {"error": "Unknown business type"})

    def check_name_availability(self, name: str) -> Dict:
        # Placeholder for CIPC name search
        return {"name": name, "available": True, "message": "Name appears available (simulated)"}

    def registration_steps(self, business_type: str) -> List[str]:
        return [
            "1. Reserve company name via CIPC",
            "2. Prepare MOI and director IDs",
            "3. Submit registration online",
            "4. Receive COR14.1, COR14.1A, COR14.3",
            "5. Open business bank account",
            "6. Register for SARS tax",
            "7. Register for UIF and COIDA",
        ]


if __name__ == "__main__":
    reg = BusinessRegistration()
    print(json.dumps(reg.get_requirements("pty_ltd"), indent=2))
    print(json.dumps(reg.check_name_availability("Omega AI Solutions"), indent=2))
