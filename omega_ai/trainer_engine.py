"""
trainer_engine.py - Training & Course Management Engine

A comprehensive learning management system for creating courses, managing lessons,
tracking student progress, and generating certificates. Provides adaptive learning
paths, assessment generation, and skill gap analysis.

Author: Omega AI Team
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union


# ---------------------------------------------------------------------------
# Constants & Configuration
# ---------------------------------------------------------------------------

DEFAULT_DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "training")

DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "expert"]
LESSON_TYPES = ["text", "video", "quiz", "exercise", "discussion"]
QUESTION_TYPES = ["multiple_choice", "true_false", "short_answer"]
GRADE_THRESHOLDS = {
    "A": (90.0, 100.0),
    "B": (80.0, 89.99),
    "C": (70.0, 79.99),
    "D": (60.0, 69.99),
    "F": (0.0, 59.99),
}

COURSE_CATEGORIES = [
    "general", "programming", "finance", "business", "design",
    "marketing", "data_science", "language", "leadership", "technology"
]


class TrainerEngine:
    """
    TrainerEngine - A Learning Management System Engine.

    Provides comprehensive functionality for:
    - Course creation and management with modular structure
    - Module and lesson building with multiple content types
    - Assessment creation with automatic grading
    - Student enrollment and progress tracking
    - Adaptive learning path generation
    - Completion certificate generation

    All data is persisted as JSON files in the data/training directory.

    Attributes:
        data_dir (str): Directory path for JSON data storage.
        courses_file (str): Path to courses.json.
        enrollments_file (str): Path to enrollments.json.
        progress_file (str): Path to progress.json.
        assessments_file (str): Path to assessments.json.
        certificates_file (str): Path to certificates.json.
    """

    def __init__(self, data_dir: str = None) -> None:
        """
        Initialize the TrainerEngine with data persistence.

        Args:
            data_dir: Optional custom directory path for data files.
                      Defaults to data/training relative to this module.
        """
        self.data_dir: str = data_dir or DEFAULT_DATA_DIR
        self.courses_file: str = os.path.join(self.data_dir, "courses.json")
        self.enrollments_file: str = os.path.join(self.data_dir, "enrollments.json")
        self.progress_file: str = os.path.join(self.data_dir, "progress.json")
        self.assessments_file: str = os.path.join(self.data_dir, "assessments.json")
        self.certificates_file: str = os.path.join(self.data_dir, "certificates.json")

        self._ensure_data_directory()
        self._load_all_data()

    # ------------------------------------------------------------------
    # Internal: Persistence helpers
    # ------------------------------------------------------------------

    def _ensure_data_directory(self) -> None:
        """Create the data directory if it does not exist."""
        os.makedirs(self.data_dir, exist_ok=True)

    def _load_json(self, filepath: str) -> Dict[str, Any]:
        """
        Load JSON data from a file.

        Args:
            filepath: Path to the JSON file.

        Returns:
            Parsed JSON data as a dictionary.
        """
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _save_json(self, filepath: str, data: Dict[str, Any]) -> None:
        """
        Save dictionary data to a JSON file.

        Args:
            filepath: Path to the JSON file.
            data: Dictionary data to serialize.
        """
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _load_all_data(self) -> None:
        """Load all data files into memory attributes."""
        self.courses: Dict[str, Dict[str, Any]] = self._load_json(self.courses_file)
        self.enrollments: Dict[str, List[str]] = self._load_json(self.enrollments_file)
        self.progress: Dict[str, Dict[str, Any]] = self._load_json(self.progress_file)
        self.assessments: Dict[str, Dict[str, Any]] = self._load_json(self.assessments_file)
        self.certificates: Dict[str, Dict[str, Any]] = self._load_json(self.certificates_file)

    def _save_all_data(self) -> None:
        """Persist all in-memory data to JSON files."""
        self._save_json(self.courses_file, self.courses)
        self._save_json(self.enrollments_file, self.enrollments)
        self._save_json(self.progress_file, self.progress)
        self._save_json(self.assessments_file, self.assessments)
        self._save_json(self.certificates_file, self.certificates)

    def _generate_id(self, prefix: str = "") -> str:
        """
        Generate a unique identifier string.

        Args:
            prefix: Optional prefix for the generated ID.

        Returns:
            A unique identifier string.
        """
        return f"{prefix}{uuid.uuid4().hex[:12]}"

    def _now_iso(self) -> str:
        """Return the current UTC time as an ISO 8601 string."""
        return datetime.now(timezone.utc).isoformat()

    # ==================================================================
    # 1. COURSE MANAGEMENT
    # ==================================================================

    def create_course(
        self,
        title: str,
        description: str,
        category: str = "general",
        difficulty: str = "beginner",
        estimated_hours: int = 10,
        instructor: str = "AI Trainer",
        modules: list = None,
    ) -> Dict[str, str]:
        """
        Create a new course.

        Args:
            title: The course title.
            description: Detailed description of the course.
            category: Course category (e.g., "programming", "finance").
            difficulty: Difficulty level - "beginner", "intermediate", "advanced".
            estimated_hours: Estimated completion time in hours.
            instructor: Name of the instructor.
            modules: Optional list of pre-built module dictionaries.

        Returns:
            Dictionary with keys: course_id, title, created_at, status.
        """
        course_id = self._generate_id("crs_")
        course_data = {
            "course_id": course_id,
            "title": title,
            "description": description,
            "category": category,
            "difficulty": difficulty,
            "estimated_hours": estimated_hours,
            "instructor": instructor,
            "modules": modules or [],
            "lessons": {},
            "assessments": [],
            "created_at": self._now_iso(),
            "updated_at": self._now_iso(),
            "status": "active",
            "enrolled_count": 0,
        }
        self.courses[course_id] = course_data
        self._save_json(self.courses_file, self.courses)
        return {
            "course_id": course_id,
            "title": title,
            "created_at": course_data["created_at"],
            "status": "active",
        }

    def get_course(self, course_id: str) -> Dict[str, Any]:
        """
        Get course details including all modules and lessons.

        Args:
            course_id: The unique course identifier.

        Returns:
            Full course dictionary or error dict if not found.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        course = self.courses[course_id].copy()
        # Attach lesson counts per module
        for mod in course.get("modules", []):
            mod["lesson_count"] = len(mod.get("lessons", []))
        return course

    def list_courses(
        self, category: str = None, difficulty: str = None
    ) -> Dict[str, Any]:
        """
        List all courses with optional filtering.

        Args:
            category: Optional filter by course category.
            difficulty: Optional filter by difficulty level.

        Returns:
            Dictionary with count and list of matching courses.
        """
        results = []
        for course in self.courses.values():
            if category and course.get("category") != category:
                continue
            if difficulty and course.get("difficulty") != difficulty:
                continue
            results.append(
                {
                    "course_id": course["course_id"],
                    "title": course["title"],
                    "description": course["description"],
                    "category": course["category"],
                    "difficulty": course["difficulty"],
                    "estimated_hours": course["estimated_hours"],
                    "instructor": course["instructor"],
                    "status": course["status"],
                    "enrolled_count": course.get("enrolled_count", 0),
                    "module_count": len(course.get("modules", [])),
                    "created_at": course["created_at"],
                }
            )
        return {"count": len(results), "courses": results}

    def update_course(self, course_id: str, **updates) -> Dict[str, Any]:
        """
        Update course properties.

        Args:
            course_id: The unique course identifier.
            **updates: Arbitrary keyword arguments of fields to update.

        Returns:
            Dictionary with updated course_id, status, and updated fields.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        forbidden = {"course_id", "created_at", "modules", "lessons"}
        for key, value in updates.items():
            if key not in forbidden:
                self.courses[course_id][key] = value
        self.courses[course_id]["updated_at"] = self._now_iso()
        self._save_json(self.courses_file, self.courses)
        return {
            "course_id": course_id,
            "status": "updated",
            "updated_fields": list(updates.keys()),
            "updated_at": self.courses[course_id]["updated_at"],
        }

    def delete_course(self, course_id: str) -> Dict[str, str]:
        """
        Delete a course.

        Args:
            course_id: The unique course identifier.

        Returns:
            Dictionary with course_id and status.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        del self.courses[course_id]
        self._save_json(self.courses_file, self.courses)
        return {"course_id": course_id, "status": "deleted"}

    # ==================================================================
    # 2. MODULE & LESSON BUILDER
    # ==================================================================

    def add_module(
        self,
        course_id: str,
        title: str,
        description: str = "",
        order: int = None,
    ) -> Dict[str, str]:
        """
        Add a module to a course.

        Args:
            course_id: The unique course identifier.
            title: The module title.
            description: Optional module description.
            order: Optional display order; defaults to appending at the end.

        Returns:
            Dictionary with module_id, course_id, and title.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        module_id = self._generate_id("mod_")
        if order is None:
            order = len(self.courses[course_id].get("modules", [])) + 1
        module = {
            "module_id": module_id,
            "course_id": course_id,
            "title": title,
            "description": description,
            "order": order,
            "lessons": [],
            "created_at": self._now_iso(),
        }
        self.courses[course_id].setdefault("modules", []).append(module)
        self.courses[course_id]["updated_at"] = self._now_iso()
        self._save_json(self.courses_file, self.courses)
        return {"module_id": module_id, "course_id": course_id, "title": title}

    def add_lesson(
        self,
        course_id: str,
        module_id: str,
        title: str,
        content: str = "",
        lesson_type: str = "text",
        duration_minutes: int = 15,
        resources: list = None,
    ) -> Dict[str, str]:
        """
        Add a lesson to a module.

        Args:
            course_id: The unique course identifier.
            module_id: The unique module identifier.
            title: The lesson title.
            content: Lesson content text.
            lesson_type: One of 'text', 'video', 'quiz', 'exercise', 'discussion'.
            duration_minutes: Estimated lesson duration in minutes.
            resources: Optional list of resource URLs or descriptions.

        Returns:
            Dictionary with lesson_id, module_id, and title.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        course = self.courses[course_id]
        target_module = None
        for mod in course.get("modules", []):
            if mod["module_id"] == module_id:
                target_module = mod
                break
        if target_module is None:
            return {"error": f"Module '{module_id}' not found in course '{course_id}'."}
        lesson_id = self._generate_id("les_")
        lesson = {
            "lesson_id": lesson_id,
            "module_id": module_id,
            "course_id": course_id,
            "title": title,
            "content": content,
            "lesson_type": lesson_type,
            "duration_minutes": duration_minutes,
            "resources": resources or [],
            "created_at": self._now_iso(),
        }
        target_module.setdefault("lessons", []).append(lesson)
        course["lessons"][lesson_id] = lesson
        course["updated_at"] = self._now_iso()
        self._save_json(self.courses_file, self.courses)
        return {"lesson_id": lesson_id, "module_id": module_id, "title": title}

    def get_lesson(self, course_id: str, lesson_id: str) -> Dict[str, Any]:
        """
        Get full lesson content.

        Args:
            course_id: The unique course identifier.
            lesson_id: The unique lesson identifier.

        Returns:
            Full lesson dictionary or error dict.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        lesson = self.courses[course_id].get("lessons", {}).get(lesson_id)
        if lesson is None:
            return {"error": f"Lesson '{lesson_id}' not found in course '{course_id}'."}
        return lesson

    def reorder_modules(self, course_id: str, module_order: List[str]) -> Dict[str, Any]:
        """
        Reorder modules within a course.

        Args:
            course_id: The unique course identifier.
            module_order: List of module_id strings in the desired order.

        Returns:
            Dictionary with course_id, status, and new order.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        modules = self.courses[course_id].get("modules", [])
        module_map = {mod["module_id"]: mod for mod in modules}
        new_modules = []
        for mod_id in module_order:
            if mod_id in module_map:
                new_modules.append(module_map[mod_id])
        # Append any modules not specified in the order
        for mod in modules:
            if mod["module_id"] not in module_order:
                new_modules.append(mod)
        for idx, mod in enumerate(new_modules, start=1):
            mod["order"] = idx
        self.courses[course_id]["modules"] = new_modules
        self.courses[course_id]["updated_at"] = self._now_iso()
        self._save_json(self.courses_file, self.courses)
        return {
            "course_id": course_id,
            "status": "reordered",
            "new_order": [mod["module_id"] for mod in new_modules],
        }

    # ==================================================================
    # 3. ASSESSMENT GENERATOR
    # ==================================================================

    def create_assessment(
        self,
        course_id: str,
        module_id: str = None,
        title: str = "",
        questions: list = None,
        passing_score: int = 70,
        time_limit_minutes: int = 30,
    ) -> Dict[str, Any]:
        """
        Create an assessment / quiz.

        Args:
            course_id: The unique course identifier.
            module_id: Optional module identifier to associate the assessment.
            title: The assessment title.
            questions: List of question dicts with keys:
                - question (str): The question text.
                - type (str): "multiple_choice", "true_false", or "short_answer".
                - options (list): Answer options for multiple_choice.
                - correct_answer (int|str): Index of correct option or answer text.
                - points (int): Points for the question.
            passing_score: Minimum percentage required to pass.
            time_limit_minutes: Time allowed to complete the assessment.

        Returns:
            Dictionary with assessment_id, course_id, and total_points.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        assessment_id = self._generate_id("asm_")
        question_list = questions or []
        total_points = sum(q.get("points", 1) for q in question_list)
        assessment = {
            "assessment_id": assessment_id,
            "course_id": course_id,
            "module_id": module_id,
            "title": title,
            "questions": question_list,
            "total_points": total_points,
            "passing_score": passing_score,
            "time_limit_minutes": time_limit_minutes,
            "created_at": self._now_iso(),
        }
        self.assessments[assessment_id] = assessment
        self.courses[course_id].setdefault("assessments", []).append(assessment_id)
        self.courses[course_id]["updated_at"] = self._now_iso()
        self._save_json(self.assessments_file, self.assessments)
        self._save_json(self.courses_file, self.courses)
        return {
            "assessment_id": assessment_id,
            "course_id": course_id,
            "total_points": total_points,
        }

    def grade_assessment(
        self, assessment_id: str, student_id: str, answers: List[Any]
    ) -> Dict[str, Any]:
        """
        Grade a student's assessment submission.

        Args:
            assessment_id: The unique assessment identifier.
            student_id: The unique student identifier.
            answers: List of student answers corresponding to each question.

        Returns:
            Dictionary with score, total_points, percentage, passed,
            and a per-question breakdown.
        """
        if assessment_id not in self.assessments:
            return {"error": f"Assessment '{assessment_id}' not found."}
        assessment = self.assessments[assessment_id]
        questions = assessment.get("questions", [])
        total_points = assessment.get("total_points", 0)
        score = 0.0
        breakdown = []
        for idx, question in enumerate(questions):
            correct_answer = question.get("correct_answer")
            q_type = question.get("type", "multiple_choice")
            points = question.get("points", 1)
            student_answer = answers[idx] if idx < len(answers) else None
            is_correct = False
            if q_type in ("multiple_choice", "true_false"):
                if isinstance(correct_answer, int) and isinstance(student_answer, int):
                    is_correct = student_answer == correct_answer
                elif isinstance(correct_answer, str) and isinstance(student_answer, str):
                    is_correct = student_answer.strip().lower() == correct_answer.strip().lower()
            elif q_type == "short_answer":
                if isinstance(correct_answer, str) and isinstance(student_answer, str):
                    is_correct = correct_answer.strip().lower() in student_answer.strip().lower()
            points_earned = points if is_correct else 0
            score += points_earned
            breakdown.append(
                {
                    "question": question.get("question", ""),
                    "correct": is_correct,
                    "points_earned": points_earned,
                    "points_possible": points,
                }
            )
        percentage = (score / total_points * 100.0) if total_points > 0 else 0.0
        passed = percentage >= assessment.get("passing_score", 70)
        # Record in student progress
        student_prog = self.progress.setdefault(student_id, {})
        course_id = assessment["course_id"]
        course_prog = student_prog.setdefault(course_id, {
            "completed_lessons": [],
            "assessments": {},
            "enrolled_at": self._now_iso(),
        })
        course_prog["assessments"][assessment_id] = {
            "score": score,
            "total_points": total_points,
            "percentage": round(percentage, 2),
            "passed": passed,
            "submitted_at": self._now_iso(),
        }
        self._save_json(self.progress_file, self.progress)
        return {
            "score": round(score, 2),
            "total_points": total_points,
            "percentage": round(percentage, 2),
            "passed": passed,
            "breakdown": breakdown,
        }

    def generate_practice_questions(
        self, topic: str, count: int = 5, difficulty: str = "medium"
    ) -> Dict[str, Any]:
        """
        Generate practice questions on a topic using built-in templates.

        Args:
            topic: The subject/topic for questions.
            count: Number of questions to generate (max 20).
            difficulty: Difficulty level - "easy", "medium", or "hard".

        Returns:
            Dictionary with topic, questions list, and difficulty.
        """
        count = min(max(count, 1), 20)
        templates = {
            "multiple_choice": [
                {
                    "question": f"What is a key concept in {topic}?",
                    "type": "multiple_choice",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": 1,
                    "points": 2,
                },
                {
                    "question": f"Which of the following best describes {topic}?",
                    "type": "multiple_choice",
                    "options": ["Description A", "Description B", "Description C", "Description D"],
                    "correct_answer": 0,
                    "points": 2,
                },
                {
                    "question": f"In {topic}, what is the primary purpose of the main component?",
                    "type": "multiple_choice",
                    "options": ["To organize", "To analyze", "To execute", "To communicate"],
                    "correct_answer": 2,
                    "points": 3,
                },
            ],
            "true_false": [
                {
                    "question": f"{topic} is considered a fundamental skill in modern industry.",
                    "type": "true_false",
                    "options": ["True", "False"],
                    "correct_answer": 0,
                    "points": 1,
                },
                {
                    "question": f"Understanding {topic} requires no prior knowledge.",
                    "type": "true_false",
                    "options": ["True", "False"],
                    "correct_answer": 1,
                    "points": 1,
                },
            ],
            "short_answer": [
                {
                    "question": f"Briefly explain the importance of {topic} in your own words.",
                    "type": "short_answer",
                    "correct_answer": topic.lower(),
                    "points": 5,
                },
                {
                    "question": f"Name and describe one real-world application of {topic}.",
                    "type": "short_answer",
                    "correct_answer": "application",
                    "points": 5,
                },
            ],
        }
        difficulty_weights = {
            "easy": {"multiple_choice": 0.5, "true_false": 0.4, "short_answer": 0.1},
            "medium": {"multiple_choice": 0.4, "true_false": 0.2, "short_answer": 0.4},
            "hard": {"multiple_choice": 0.2, "true_false": 0.1, "short_answer": 0.7},
        }
        weights = difficulty_weights.get(difficulty, difficulty_weights["medium"])
        import random
        questions = []
        q_types = list(weights.keys())
        type_probs = [weights[t] for t in q_types]
        for _ in range(count):
            q_type = random.choices(q_types, weights=type_probs, k=1)[0]
            pool = templates[q_type]
            base = random.choice(pool).copy()
            # Customize the question text
            base["question"] = base["question"].format(topic=topic)
            base["difficulty"] = difficulty
            base["topic"] = topic
            questions.append(base)
        return {"topic": topic, "questions": questions, "difficulty": difficulty}

    # ==================================================================
    # 4. STUDENT PROGRESS TRACKING
    # ==================================================================

    def enroll_student(self, course_id: str, student_id: str) -> Dict[str, str]:
        """
        Enroll a student in a course.

        Args:
            course_id: The unique course identifier.
            student_id: The unique student identifier.

        Returns:
            Dictionary with student_id, course_id, and enrollment status.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        if student_id not in self.enrollments:
            self.enrollments[student_id] = []
        if course_id in self.enrollments[student_id]:
            return {
                "student_id": student_id,
                "course_id": course_id,
                "status": "already_enrolled",
            }
        self.enrollments[student_id].append(course_id)
        # Initialize progress tracking
        student_prog = self.progress.setdefault(student_id, {})
        if course_id not in student_prog:
            student_prog[course_id] = {
                "completed_lessons": [],
                "assessments": {},
                "enrolled_at": self._now_iso(),
                "last_activity": self._now_iso(),
            }
        self.courses[course_id]["enrolled_count"] = self.courses[course_id].get("enrolled_count", 0) + 1
        self._save_json(self.enrollments_file, self.enrollments)
        self._save_json(self.progress_file, self.progress)
        self._save_json(self.courses_file, self.courses)
        return {
            "student_id": student_id,
            "course_id": course_id,
            "status": "enrolled",
            "enrolled_at": self._now_iso(),
        }

    def get_student_progress(
        self, student_id: str, course_id: str = None
    ) -> Dict[str, Any]:
        """
        Get detailed progress for a student.

        Args:
            student_id: The unique student identifier.
            course_id: Optional specific course to filter progress.

        Returns:
            Dictionary with student_id and list of course progress details.
        """
        student_prog = self.progress.get(student_id, {})
        course_ids = [course_id] if course_id else self.enrollments.get(student_id, [])
        if course_id and course_id not in student_prog:
            return {"student_id": student_id, "courses": [], "message": "No progress data found."}
        courses_data = []
        for cid in course_ids:
            if cid not in self.courses:
                continue
            course_info = self.courses[cid]
            prog = student_prog.get(cid, {})
            total_lessons = len(course_info.get("lessons", {}))
            completed_lessons = len(prog.get("completed_lessons", []))
            progress_percent = (
                (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
            )
            assessments = prog.get("assessments", {})
            avg_score = 0.0
            if assessments:
                avg_score = sum(a.get("percentage", 0) for a in assessments.values()) / len(assessments)
            courses_data.append(
                {
                    "course_id": cid,
                    "title": course_info["title"],
                    "progress_percent": round(progress_percent, 2),
                    "completed_lessons": completed_lessons,
                    "total_lessons": total_lessons,
                    "assessments_taken": len(assessments),
                    "average_score": round(avg_score, 2),
                }
            )
        return {"student_id": student_id, "courses": courses_data}

    def complete_lesson(
        self,
        course_id: str,
        module_id: str,
        lesson_id: str,
        student_id: str,
    ) -> Dict[str, Any]:
        """
        Mark a lesson as completed for a student and update progress.

        Args:
            course_id: The unique course identifier.
            module_id: The unique module identifier.
            lesson_id: The unique lesson identifier.
            student_id: The unique student identifier.

        Returns:
            Dictionary with completion status and updated progress.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        if student_id not in self.enrollments or course_id not in self.enrollments[student_id]:
            return {"error": f"Student '{student_id}' is not enrolled in course '{course_id}'."}
        lesson = self.courses[course_id].get("lessons", {}).get(lesson_id)
        if lesson is None:
            return {"error": f"Lesson '{lesson_id}' not found."}
        student_prog = self.progress.setdefault(student_id, {})
        course_prog = student_prog.setdefault(course_id, {
            "completed_lessons": [],
            "assessments": {},
            "enrolled_at": self._now_iso(),
        })
        if lesson_id not in course_prog["completed_lessons"]:
            course_prog["completed_lessons"].append(lesson_id)
        course_prog["last_activity"] = self._now_iso()
        total_lessons = len(self.courses[course_id].get("lessons", {}))
        completed = len(course_prog["completed_lessons"])
        progress_percent = (completed / total_lessons * 100) if total_lessons > 0 else 0
        self._save_json(self.progress_file, self.progress)
        return {
            "student_id": student_id,
            "lesson_id": lesson_id,
            "status": "completed",
            "progress_percent": round(progress_percent, 2),
            "completed_lessons": completed,
            "total_lessons": total_lessons,
            "completed_at": self._now_iso(),
        }

    def get_skill_gap_analysis(self, student_id: str) -> Dict[str, Any]:
        """
        Analyze skill gaps across all enrolled courses.

        Args:
            student_id: The unique student identifier.

        Returns:
            Dictionary with student_id, strengths, weaknesses,
            recommended_courses, and overall_level.
        """
        student_prog = self.progress.get(student_id, {})
        enrolled = self.enrollments.get(student_id, [])
        strengths = []
        weaknesses = []
        category_scores = {}
        for cid in enrolled:
            if cid not in self.courses:
                continue
            course = self.courses[cid]
            category = course.get("category", "general")
            prog = student_prog.get(cid, {})
            assessments = prog.get("assessments", {})
            if assessments:
                avg = sum(a.get("percentage", 0) for a in assessments.values()) / len(assessments)
            else:
                total_lessons = len(course.get("lessons", {}))
                completed = len(prog.get("completed_lessons", []))
                avg = (completed / total_lessons * 100) if total_lessons > 0 else 0
            category_scores.setdefault(category, []).append(avg)
        # Compute category averages
        category_avg = {}
        for cat, scores in category_scores.items():
            category_avg[cat] = sum(scores) / len(scores)
        for cat, avg in category_avg.items():
            if avg >= 75:
                strengths.append({"category": cat, "score": round(avg, 2)})
            elif avg < 60:
                weaknesses.append({"category": cat, "score": round(avg, 2)})
        # Determine overall level
        if category_avg:
            overall = sum(category_avg.values()) / len(category_avg)
        else:
            overall = 0
        if overall >= 85:
            overall_level = "expert"
        elif overall >= 70:
            overall_level = "advanced"
        elif overall >= 50:
            overall_level = "intermediate"
        else:
            overall_level = "beginner"
        # Recommend courses for weak categories
        recommended = []
        for course in self.courses.values():
            cat = course.get("category", "general")
            if cat in [w["category"] for w in weaknesses] and course["course_id"] not in enrolled:
                recommended.append(
                    {
                        "course_id": course["course_id"],
                        "title": course["title"],
                        "category": cat,
                        "reason": f"Improve {cat} skills",
                    }
                )
        return {
            "student_id": student_id,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommended_courses": recommended,
            "overall_level": overall_level,
        }

    # ==================================================================
    # 5. ADAPTIVE LEARNING
    # ==================================================================

    def generate_learning_path(
        self,
        student_id: str,
        goal: str,
        current_level: str = "beginner",
    ) -> Dict[str, Any]:
        """
        Generate a personalized learning path based on goals and current level.

        Uses the student's skill gap analysis, goal keywords, and current
        proficiency to recommend a prioritized sequence of courses.

        Args:
            student_id: The unique student identifier.
            goal: Description of the learning goal (e.g., "become a data scientist").
            current_level: Current proficiency level - "beginner", "intermediate", "advanced".

        Returns:
            Dictionary with student_id, goal, and a prioritized path list.
        """
        gap = self.get_skill_gap_analysis(student_id)
        enrolled = set(self.enrollments.get(student_id, []))
        goal_lower = goal.lower()
        # Keyword mapping from goals to categories
        category_keywords = {
            "programming": ["programming", "coding", "software", "developer", "engineer", "python", "java", "javascript"],
            "data_science": ["data", "analytics", "machine learning", "ai", "statistics", "modeling"],
            "finance": ["finance", "investing", "accounting", "financial", "money", "stock", "budget"],
            "business": ["business", "entrepreneur", "startup", "management", "leadership", "strategy"],
            "design": ["design", "ux", "ui", "graphic", "creative", "visual"],
            "marketing": ["marketing", "seo", "social media", "branding", "growth"],
            "language": ["language", "english", "spanish", "french", "communication"],
        }
        target_categories = set()
        for cat, keywords in category_keywords.items():
            if any(kw in goal_lower for kw in keywords):
                target_categories.add(cat)
        if not target_categories:
            target_categories = {"general"}
        level_order = {"beginner": 0, "intermediate": 1, "advanced": 2, "expert": 3}
        student_level_idx = level_order.get(current_level, 0)
        path = []
        seen = set()
        # 1. Enrolled but incomplete courses first
        for cid in enrolled:
            course = self.courses.get(cid)
            if not course:
                continue
            prog = self.progress.get(student_id, {}).get(cid, {})
            total = len(course.get("lessons", {}))
            completed = len(prog.get("completed_lessons", []))
            if total > 0 and completed < total:
                path.append(
                    {
                        "course_id": cid,
                        "title": course["title"],
                        "reason": "Continue incomplete course",
                        "priority": 1,
                    }
                )
                seen.add(cid)
        # 2. Recommend target category courses matching level
        for course in self.courses.values():
            cid = course["course_id"]
            if cid in seen or cid in enrolled:
                continue
            if course.get("category") in target_categories:
                course_level_idx = level_order.get(course.get("difficulty", "beginner"), 0)
                if course_level_idx <= student_level_idx + 1:
                    path.append(
                        {
                            "course_id": cid,
                            "title": course["title"],
                            "reason": f"Aligned with goal: {goal}",
                            "priority": 2 if course_level_idx <= student_level_idx else 3,
                        }
                    )
                    seen.add(cid)
        # 3. Fill gaps from weaknesses
        for rec in gap.get("recommended_courses", []):
            cid = rec["course_id"]
            if cid not in seen and cid not in enrolled:
                path.append(
                    {
                        "course_id": cid,
                        "title": rec["title"],
                        "reason": f"Strengthen {rec['category']} skills",
                        "priority": 4,
                    }
                )
                seen.add(cid)
        # 4. General beginner courses if path is still short
        if len(path) < 3:
            for course in self.courses.values():
                cid = course["course_id"]
                if cid in seen or cid in enrolled:
                    continue
                if course.get("difficulty") == "beginner":
                    path.append(
                        {
                            "course_id": cid,
                            "title": course["title"],
                            "reason": "Foundational skill building",
                            "priority": 5,
                        }
                    )
                    seen.add(cid)
                    if len(path) >= 5:
                        break
        path.sort(key=lambda x: x["priority"])
        return {"student_id": student_id, "goal": goal, "path": path}

    def recommend_next_lesson(self, student_id: str, course_id: str) -> Dict[str, Any]:
        """
        Recommend the next lesson based on progress and performance.

        Uses completion rate and assessment scores to recommend the most
        appropriate next lesson for the student.

        Args:
            student_id: The unique student identifier.
            course_id: The unique course identifier.

        Returns:
            Dictionary with recommendation details or a completion message.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        if student_id not in self.enrollments or course_id not in self.enrollments[student_id]:
            return {"error": f"Student '{student_id}' is not enrolled in course '{course_id}'."}
        course = self.courses[course_id]
        prog = self.progress.get(student_id, {}).get(course_id, {})
        completed = set(prog.get("completed_lessons", []))
        all_lessons = course.get("lessons", {})
        if not all_lessons:
            return {"message": "No lessons available in this course."}
        # Check if all lessons are completed
        if completed.issuperset(all_lessons.keys()):
            return {
                "student_id": student_id,
                "course_id": course_id,
                "message": "All lessons completed. Ready for final assessment or certificate.",
                "next_lesson": None,
                "progress_percent": 100.0,
            }
        # Find first incomplete lesson in module order
        for module in course.get("modules", []):
            for lesson in module.get("lessons", []):
                lid = lesson["lesson_id"]
                if lid not in completed:
                    # Check if student is struggling based on assessments
                    assessments = prog.get("assessments", {})
                    avg_score = 0.0
                    if assessments:
                        avg_score = sum(a.get("percentage", 0) for a in assessments.values()) / len(assessments)
                    recommendation = {
                        "student_id": student_id,
                        "course_id": course_id,
                        "next_lesson": {
                            "lesson_id": lid,
                            "title": lesson["title"],
                            "module": module["title"],
                            "type": lesson["lesson_type"],
                            "duration_minutes": lesson["duration_minutes"],
                        },
                        "progress_percent": round(len(completed) / len(all_lessons) * 100, 2),
                        "average_assessment_score": round(avg_score, 2),
                        "reason": "Next lesson in sequence",
                    }
                    if avg_score < 60 and assessments:
                        recommendation["reason"] = (
                            "Recommended review: assessment scores indicate difficulty. "
                            "Consider revisiting previous material."
                        )
                    return recommendation
        # Fallback: return first uncompleted lesson
        for lid, lesson in all_lessons.items():
            if lid not in completed:
                return {
                    "student_id": student_id,
                    "course_id": course_id,
                    "next_lesson": {
                        "lesson_id": lid,
                        "title": lesson["title"],
                        "type": lesson["lesson_type"],
                        "duration_minutes": lesson["duration_minutes"],
                    },
                    "progress_percent": round(len(completed) / len(all_lessons) * 100, 2),
                    "reason": "Next incomplete lesson",
                }
        return {"message": "Course progress analysis complete."}

    # ==================================================================
    # 6. CERTIFICATES
    # ==================================================================

    def generate_certificate(self, student_id: str, course_id: str) -> Dict[str, Any]:
        """
        Generate a completion certificate for a student.

        Verifies the student has completed all lessons and calculates
        a final grade based on assessment performance.

        Args:
            student_id: The unique student identifier.
            course_id: The unique course identifier.

        Returns:
            Dictionary with certificate_id, student_id, course_id, course_name,
            completed_at, final_score, and letter grade.
        """
        if course_id not in self.courses:
            return {"error": f"Course '{course_id}' not found."}
        course = self.courses[course_id]
        student_prog = self.progress.get(student_id, {})
        course_prog = student_prog.get(course_id, {})
        total_lessons = len(course.get("lessons", {}))
        completed_lessons = len(course_prog.get("completed_lessons", []))
        if total_lessons == 0 or completed_lessons < total_lessons:
            return {
                "error": "Course not completed.",
                "completed_lessons": completed_lessons,
                "total_lessons": total_lessons,
                "message": "Complete all lessons before generating a certificate.",
            }
        # Calculate final score from assessments
        assessments = course_prog.get("assessments", {})
        final_score = 0.0
        if assessments:
            final_score = sum(a.get("percentage", 0) for a in assessments.values()) / len(assessments)
        else:
            final_score = 100.0  # All lessons done, no assessments
        # Determine letter grade
        grade = "F"
        for letter, (low, high) in GRADE_THRESHOLDS.items():
            if low <= final_score <= high:
                grade = letter
                break
        certificate_id = self._generate_id("cert_")
        cert_data = {
            "certificate_id": certificate_id,
            "student_id": student_id,
            "course_id": course_id,
            "course_name": course["title"],
            "completed_at": self._now_iso(),
            "final_score": round(final_score, 2),
            "grade": grade,
        }
        self.certificates[certificate_id] = cert_data
        self._save_json(self.certificates_file, self.certificates)
        return cert_data

    def list_certificates(self, student_id: str) -> Dict[str, Any]:
        """
        List all certificates for a student.

        Args:
            student_id: The unique student identifier.

        Returns:
            Dictionary with student_id, count, and list of certificates.
        """
        student_certs = [
            cert
            for cert in self.certificates.values()
            if cert.get("student_id") == student_id
        ]
        return {
            "student_id": student_id,
            "count": len(student_certs),
            "certificates": student_certs,
        }

    # ==================================================================
    # 7. SEED DATA INITIALIZATION
    # ==================================================================

    def seed_courses(self) -> Dict[str, Any]:
        """
        Seed the system with 3 sample courses for demonstration.

        Creates:
            1. "Python for Beginners" (programming, beginner, 20 hours, 4 modules)
            2. "Financial Literacy Fundamentals" (finance, beginner, 15 hours, 3 modules)
            3. "African Business Essentials" (business, intermediate, 25 hours, 5 modules)

        Returns:
            Dictionary with count and list of seeded course IDs.
        """
        seeded = []
        # --- Course 1: Python for Beginners ---
        c1 = self.create_course(
            title="Python for Beginners",
            description="Learn Python programming from scratch. Covers variables, loops, functions, file handling, and basic data structures with hands-on exercises.",
            category="programming",
            difficulty="beginner",
            estimated_hours=20,
            instructor="Dr. Ada Nwosu",
        )
        c1_id = c1["course_id"]
        seeded.append(c1_id)
        m1 = self.add_module(c1_id, "Getting Started", "Introduction to Python and setup.", 1)
        self.add_lesson(c1_id, m1["module_id"], "Why Python?", "Python is a versatile language used in web dev, data science, AI, and automation.", "text", 20)
        self.add_lesson(c1_id, m1["module_id"], "Installing Python", "Step-by-step guide to install Python on Windows, macOS, and Linux.", "video", 15)
        m2 = self.add_module(c1_id, "Core Concepts", "Variables, data types, and control flow.", 2)
        self.add_lesson(c1_id, m2["module_id"], "Variables and Types", "Learn about strings, integers, floats, booleans, and type conversion.", "text", 25)
        self.add_lesson(c1_id, m2["module_id"], "Conditionals", "Master if/elif/else statements for decision making in programs.", "quiz", 20)
        self.add_lesson(c1_id, m2["module_id"], "Loops", "For and while loops with practical examples and exercises.", "exercise", 30)
        m3 = self.add_module(c1_id, "Functions & Modules", "Writing reusable code.", 3)
        self.add_lesson(c1_id, m3["module_id"], "Defining Functions", "Create functions with parameters, return values, and default arguments.", "text", 25)
        self.add_lesson(c1_id, m3["module_id"], "Importing Modules", "Use standard library modules like os, sys, math, and datetime.", "video", 20)
        m4 = self.add_module(c1_id, "Data Structures", "Lists, dictionaries, and more.", 4)
        self.add_lesson(c1_id, m4["module_id"], "Lists & Tuples", "Create and manipulate ordered collections of data.", "exercise", 30)
        self.add_lesson(c1_id, m4["module_id"], "Dictionaries", "Key-value data structures for efficient data lookup.", "quiz", 20)
        self.add_lesson(c1_id, m4["module_id"], "Final Project", "Build a mini-project combining all concepts learned.", "exercise", 45)

        # --- Course 2: Financial Literacy Fundamentals ---
        c2 = self.create_course(
            title="Financial Literacy Fundamentals",
            description="Master personal finance essentials including budgeting, saving, investing, debt management, and retirement planning.",
            category="finance",
            difficulty="beginner",
            estimated_hours=15,
            instructor="Prof. Kwame Asante",
        )
        c2_id = c2["course_id"]
        seeded.append(c2_id)
        fm1 = self.add_module(c2_id, "Budgeting Basics", "Understanding income and expenses.", 1)
        self.add_lesson(c2_id, fm1["module_id"], "Tracking Your Money", "Learn to track income sources and monthly expenses systematically.", "text", 20)
        self.add_lesson(c2_id, fm1["module_id"], "The 50/30/20 Rule", "A simple budgeting framework: 50% needs, 30% wants, 20% savings.", "video", 15)
        fm2 = self.add_module(c2_id, "Saving & Investing", "Grow your wealth over time.", 2)
        self.add_lesson(c2_id, fm2["module_id"], "Emergency Funds", "Why and how to build a 3-6 month emergency fund.", "text", 20)
        self.add_lesson(c2_id, fm2["module_id"], "Introduction to Investing", "Stocks, bonds, mutual funds, and risk assessment basics.", "quiz", 25)
        self.add_lesson(c2_id, fm2["module_id"], "Compound Interest", "Understanding how compound interest works for savings and investments.", "exercise", 20)
        fm3 = self.add_module(c2_id, "Debt & Credit", "Managing debt responsibly.", 3)
        self.add_lesson(c2_id, fm3["module_id"], "Understanding Credit Scores", "How credit scores are calculated and strategies to improve them.", "text", 20)
        self.add_lesson(c2_id, fm3["module_id"], "Debt Repayment Strategies", "Snowball vs avalanche methods for paying off debt efficiently.", "discussion", 25)

        # --- Course 3: African Business Essentials ---
        c3 = self.create_course(
            title="African Business Essentials",
            description="A comprehensive guide to doing business in Africa. Covers market entry, cultural considerations, regulations, funding, and growth strategies.",
            category="business",
            difficulty="intermediate",
            estimated_hours=25,
            instructor="Ms. Amina Diallo",
        )
        c3_id = c3["course_id"]
        seeded.append(c3_id)
        bm1 = self.add_module(c3_id, "African Markets Overview", "Understanding the landscape.", 1)
        self.add_lesson(c3_id, bm1["module_id"], "The AfCFTA Opportunity", "Explore the African Continental Free Trade Area and its impact on business.", "text", 25)
        self.add_lesson(c3_id, bm1["module_id"], "Regional Economies", "Key economic indicators and growth trends across African regions.", "video", 20)
        bm2 = self.add_module(c3_id, "Market Entry Strategies", "Entering African markets successfully.", 2)
        self.add_lesson(c3_id, bm2["module_id"], "Local Partnerships", "Why partnering with local businesses accelerates market entry.", "text", 20)
        self.add_lesson(c3_id, bm2["module_id"], "Regulatory Frameworks", "Navigating business registration, taxes, and compliance across countries.", "quiz", 25)
        bm3 = self.add_module(c3_id, "Cultural Intelligence", "Doing business across cultures.", 3)
        self.add_lesson(c3_id, bm3["module_id"], "Communication Styles", "High-context vs low-context communication in African business settings.", "text", 20)
        self.add_lesson(c3_id, bm3["module_id"], "Building Trust", "Relationship-first business culture and long-term partnership building.", "discussion", 25)
        self.add_lesson(c3_id, bm3["module_id"], "Negotiation Tactics", "Effective negotiation strategies tailored to African business contexts.", "exercise", 30)
        bm4 = self.add_module(c3_id, "Funding & Finance", "Accessing capital in Africa.", 4)
        self.add_lesson(c3_id, bm4["module_id"], "Local Banking Systems", "Overview of banking services and credit access across the continent.", "text", 20)
        self.add_lesson(c3_id, bm4["module_id"], "Venture Capital & Angel Investors", "Understanding the startup funding ecosystem in Africa.", "video", 25)
        self.add_lesson(c3_id, bm4["module_id"], "Government Grants", "Public sector funding opportunities and application processes.", "quiz", 20)
        bm5 = self.add_module(c3_id, "Growth & Scaling", "Expanding your business.", 5)
        self.add_lesson(c3_id, bm5["module_id"], "Digital Transformation", "Leveraging technology for business growth in African markets.", "text", 25)
        self.add_lesson(c3_id, bm5["module_id"], "Cross-Border Expansion", "Strategies for scaling across multiple African countries.", "exercise", 35)
        self.add_lesson(c3_id, bm5["module_id"], "Sustainability Practices", "Building sustainable and socially responsible businesses.", "discussion", 25)

        self._save_all_data()
        return {"count": len(seeded), "course_ids": seeded}

    def initialize(self) -> Dict[str, Any]:
        """
        Initialize the TrainerEngine with seed data if no courses exist.

        Returns:
            Dictionary with initialization status and course count.
        """
        if not self.courses:
            seeded = self.seed_courses()
            return {"status": "initialized", "seeded_courses": seeded["count"]}
        return {"status": "already_initialized", "existing_courses": len(self.courses)}



# ==============================================================================
# Main entry point for CLI / quick test
# ==============================================================================

if __name__ == "__main__":
    engine = TrainerEngine()
    init_result = engine.initialize()
    print("TrainerEngine initialized:", init_result)
    courses = engine.list_courses()
    print(f"Total courses available: {courses['count']}")
    for c in courses["courses"]:
        print(f"  - {c['title']} ({c['category']}, {c['difficulty']}, {c['estimated_hours']}h)")
