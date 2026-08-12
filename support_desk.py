"""Support Desk — Customer support and ticketing system."""

import json
from typing import Dict, List


class SupportDesk:
    """Customer support ticketing system."""

    def __init__(self):
        self.tickets = []

    def create_ticket(self, user: str, subject: str, description: str, priority: str = "medium") -> Dict:
        ticket = {
            "id": len(self.tickets) + 1000,
            "user": user,
            "subject": subject,
            "description": description,
            "priority": priority,
            "status": "open",
            "created": json.dumps("now"),
            "responses": [],
        }
        self.tickets.append(ticket)
        return ticket

    def respond(self, ticket_id: int, responder: str, message: str) -> Dict:
        ticket = next((t for t in self.tickets if t["id"] == ticket_id), None)
        if not ticket:
            return {"error": "Ticket not found"}
        ticket["responses"].append({"responder": responder, "message": message, "time": json.dumps("now")})
        return ticket

    def update_status(self, ticket_id: int, status: str) -> bool:
        ticket = next((t for t in self.tickets if t["id"] == ticket_id), None)
        if ticket:
            ticket["status"] = status
            return True
        return False

    def get_ticket(self, ticket_id: int) -> Dict:
        return next((t for t in self.tickets if t["id"] == ticket_id), {"error": "Ticket not found"})

    def list_tickets(self, status: str = None, user: str = None) -> List[Dict]:
        results = self.tickets
        if status:
            results = [t for t in results if t["status"] == status]
        if user:
            results = [t for t in results if t["user"] == user]
        return results

    def stats(self) -> Dict:
        statuses = {}
        for t in self.tickets:
            statuses[t["status"]] = statuses.get(t["status"], 0) + 1
        return {"total": len(self.tickets), "by_status": statuses}


if __name__ == "__main__":
    desk = SupportDesk()
    desk.create_ticket("user1", "Login issue", "Cannot log in to my account", "high")
    desk.respond(1000, "agent1", "Please reset your password")
    print(json.dumps(desk.get_ticket(1000), indent=2))
    print(json.dumps(desk.stats(), indent=2))
