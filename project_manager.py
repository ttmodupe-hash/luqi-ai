"""Project Manager — Project management and tracking."""

import json
from typing import Dict, List


class ProjectManager:
    """Project management system."""

    def __init__(self):
        self.projects = []

    def create_project(self, name: str, description: str, start_date: str, end_date: str, budget: float = 0) -> Dict:
        project = {
            "id": len(self.projects) + 1,
            "name": name,
            "description": description,
            "start_date": start_date,
            "end_date": end_date,
            "budget": budget,
            "status": "planning",
            "tasks": [],
            "team": [],
        }
        self.projects.append(project)
        return project

    def add_task(self, project_id: int, title: str, assignee: str = None, due: str = None) -> Dict:
        project = next((p for p in self.projects if p["id"] == project_id), None)
        if not project:
            return {"error": "Project not found"}
        task = {"id": len(project["tasks"]) + 1, "title": title, "assignee": assignee, "due": due, "status": "pending"}
        project["tasks"].append(task)
        return task

    def update_status(self, project_id: int, status: str) -> bool:
        project = next((p for p in self.projects if p["id"] == project_id), None)
        if project:
            project["status"] = status
            return True
        return False

    def get_project(self, project_id: int) -> Dict:
        return next((p for p in self.projects if p["id"] == project_id), {"error": "Project not found"})

    def get_all_projects(self) -> List[Dict]:
        return self.projects

    def dashboard(self) -> Dict:
        total = len(self.projects)
        by_status = {}
        for p in self.projects:
            by_status[p["status"]] = by_status.get(p["status"], 0) + 1
        return {"total_projects": total, "by_status": by_status}


if __name__ == "__main__":
    pm = ProjectManager()
    pm.create_project("AI Platform", "Build Omega AI", "2024-01-01", "2024-12-31", 500000)
    pm.add_task(1, "Design architecture", "John", "2024-02-01")
    pm.add_task(1, "Implement core", "Jane", "2024-03-01")
    print(json.dumps(pm.get_project(1), indent=2))
    print(json.dumps(pm.dashboard(), indent=2))
