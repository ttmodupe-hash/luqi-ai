"""Government Services — South African government services guide."""

import json
from typing import Dict, List


class GovernmentServices:
    """South African government services directory."""

    def __init__(self):
        self.services = {
            "id_document": {"department": "Home Affairs", "requirements": ["Birth certificate", "Proof of residence"], "fee": "Free (first issue)"},
            "passport": {"department": "Home Affairs", "requirements": ["ID document", "Photos"], "fee": "R600 (adult)"},
            "drivers_license": {"department": "Traffic Department", "requirements": ["ID", "Eye test", "Photos"], "fee": "R250-R500"},
            "birth_certificate": {"department": "Home Affairs", "requirements": ["Hospital record", "Parent IDs"], "fee": "Free"},
            "marriage_certificate": {"department": "Home Affairs", "requirements": ["IDs", "Witnesses"], "fee": "R150"},
        }

    def get_service_info(self, service: str) -> Dict:
        return self.services.get(service.lower().replace(" ", "_"), {"error": "Service not found"})

    def list_services(self) -> List[str]:
        return list(self.services.keys())

    def find_office(self, service: str, province: str) -> Dict:
        offices = {
            "gauteng": {"home_affairs": "77 Harrison St, Johannesburg", "traffic": "Various licensing centres"},
            "western_cape": {"home_affairs": "56 Barrack St, Cape Town", "traffic": "City of Cape Town offices"},
        }
        dept = self.services.get(service.lower().replace(" ", "_"), {}).get("department", "").lower().replace(" ", "_")
        return offices.get(province.lower(), {}).get(dept, "Contact provincial office")

    def required_documents(self, service: str) -> List[str]:
        return self.services.get(service.lower().replace(" ", "_"), {}).get("requirements", [])


if __name__ == "__main__":
    gov = GovernmentServices()
    print(json.dumps(gov.get_service_info("passport"), indent=2))
    print(json.dumps(gov.find_office("passport", "gauteng"), indent=2))
