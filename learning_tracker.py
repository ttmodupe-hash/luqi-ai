"""Learning Tracker — Student progress and learning analytics."""

import json
from typing import Dict, List


class LearningTracker:
    """Student learning progress tracker."""

    def __init__(self):
        self.students = {}

    def register_student(self, student_id: str, name: str, grade: str) -> Dict:
        self.students[student_id] = {
            "name": name,
            "grade": grade,
            "subjects": {},
            "overall_progress": 0.0,
        }
        return self.students[student_id]

    def record_score(self, student_id: str, subject: str, score: float, max_score: float = 100):
        if student_id not in self.students:
            return {"error": "Student not found"}
        if subject not in self.students[student_id]["subjects"]:
            self.students[student_id]["subjects"][subject] = {"scores": [], "average": 0}
        self.students[student_id]["subjects"][subject]["scores"].append(score)
        scores = self.students[student_id]["subjects"][subject]["scores"]
        self.students[student_id]["subjects"][subject]["average"] = sum(scores) / len(scores)
        self._update_overall(student_id)

    def _update_overall(self, student_id: str):
        subjects = self.students[student_id]["subjects"]
        if subjects:
            avg = sum(s["average"] for s in subjects.values()) / len(subjects)
            self.students[student_id]["overall_progress"] = round(avg, 1)

    def get_report(self, student_id: str) -> Dict:
        return self.students.get(student_id, {"error": "Student not found"})

    def class_average(self, subject: str) -> float:
        scores = []
        for student in self.students.values():
            if subject in student["subjects"]:
                scores.append(student["subjects"][subject]["average"])
        return round(sum(scores) / len(scores), 1) if scores else 0.0

    def at_risk_students(self, threshold: float = 50.0) -> List[Dict]:
        return [{"id": sid, **data} for sid, data in self.students.items() if data["overall_progress"] < threshold]


if __name__ == "__main__":
    tracker = LearningTracker()
    tracker.register_student("S001", "Thabo", "Grade 10")
    tracker.record_score("S001", "Math", 75)
    tracker.record_score("S001", "Math", 80)
    tracker.record_score("S001", "Science", 65)
    print(json.dumps(tracker.get_report("S001"), indent=2))
    print(json.dumps(tracker.at_risk_students(), indent=2))
