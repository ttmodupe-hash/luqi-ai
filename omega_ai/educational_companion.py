#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Educational Companion Module for Omega AI
Provides personalized learning assistance, study planning, subject tutoring,
progress tracking, and educational content generation across multiple disciplines.
"""

import json
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class Subject(Enum):
    """Academic subjects supported"""
    MATHEMATICS = "mathematics"
    SCIENCE = "science"
    PHYSICS = "physics"
    CHEMISTRY = "chemistry"
    BIOLOGY = "biology"
    COMPUTER_SCIENCE = "computer_science"
    HISTORY = "history"
    GEOGRAPHY = "geography"
    LITERATURE = "literature"
    LANGUAGE = "language"
    ECONOMICS = "economics"
    BUSINESS = "business"
    ART = "art"
    MUSIC = "music"
    PHILOSOPHY = "philosophy"
    PSYCHOLOGY = "psychology"
    ENGINEERING = "engineering"
    MEDICINE = "medicine"
    LAW = "law"


class EducationLevel(Enum):
    """Education levels"""
    ELEMENTARY = "elementary"
    MIDDLE_SCHOOL = "middle_school"
    HIGH_SCHOOL = "high_school"
    UNDERGRADUATE = "undergraduate"
    GRADUATE = "graduate"
    DOCTORAL = "doctoral"
    PROFESSIONAL = "professional"


class LearningStyle(Enum):
    """Learning style preferences"""
    VISUAL = "visual"
    AUDITORY = "auditory"
    KINESTHETIC = "kinesthetic"
    READING_WRITING = "reading_writing"
    SOCIAL = "social"
    SOLITARY = "solitary"
    MULTIMODAL = "multimodal"


class DifficultyLevel(Enum):
    """Content difficulty levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


@dataclass
class LearningObjective:
    """Represents a learning objective"""
    id: str
    subject: Subject
    topic: str
    description: str
    difficulty: DifficultyLevel
    estimated_hours: float
    prerequisites: List[str] = field(default_factory=list)
    completed: bool = False
    completion_date: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "subject": self.subject.value,
            "topic": self.topic,
            "description": self.description,
            "difficulty": self.difficulty.value,
            "estimated_hours": self.estimated_hours,
            "prerequisites": self.prerequisites,
            "completed": self.completed,
            "completion_date": self.completion_date
        }


@dataclass
class StudySession:
    """Represents a study session"""
    id: str
    subject: Subject
    topic: str
    duration_minutes: int
    scheduled_date: str
    completed: bool = False
    notes: str = ""
    effectiveness_rating: int = 0  # 1-5
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "subject": self.subject.value,
            "topic": self.topic,
            "duration_minutes": self.duration_minutes,
            "scheduled_date": self.scheduled_date,
            "completed": self.completed,
            "notes": self.notes,
            "effectiveness_rating": self.effectiveness_rating
        }


@dataclass
class StudentProfile:
    """Student profile for personalized learning"""
    student_id: str
    name: str = ""
    education_level: EducationLevel = EducationLevel.HIGH_SCHOOL
    learning_style: LearningStyle = LearningStyle.MULTIMODAL
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    interests: List[str] = field(default_factory=list)
    goals: List[str] = field(default_factory=list)
    available_hours_per_week: float = 10.0
    preferred_session_length: int = 45  # minutes
    subjects: List[Subject] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_id": self.student_id,
            "name": self.name,
            "education_level": self.education_level.value,
            "learning_style": self.learning_style.value,
            "strengths": self.strengths,
            "weaknesses": self.weaknesses,
            "interests": self.interests,
            "goals": self.goals,
            "available_hours_per_week": self.available_hours_per_week,
            "preferred_session_length": self.preferred_session_length,
            "subjects": [s.value for s in self.subjects],
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


@dataclass
class QuizQuestion:
    """Represents a quiz question"""
    id: str
    subject: Subject
    topic: str
    question: str
    options: List[str]
    correct_answer: int  # index of correct option
    explanation: str
    difficulty: DifficultyLevel
    hint: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "subject": self.subject.value,
            "topic": self.topic,
            "question": self.question,
            "options": self.options,
            "correct_answer": self.correct_answer,
            "explanation": self.explanation,
            "difficulty": self.difficulty.value,
            "hint": self.hint
        }


@dataclass
class ProgressReport:
    """Student progress report"""
    student_id: str
    period: str
    subjects_studied: List[str]
    total_study_hours: float
    sessions_completed: int
    objectives_achieved: int
    total_objectives: int
    average_effectiveness: float
    strengths_identified: List[str]
    areas_for_improvement: List[str]
    recommendations: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_id": self.student_id,
            "period": self.period,
            "subjects_studied": self.subjects_studied,
            "total_study_hours": self.total_study_hours,
            "sessions_completed": self.sessions_completed,
            "objectives_achieved": self.objectives_achieved,
            "total_objectives": self.total_objectives,
            "average_effectiveness": self.average_effectiveness,
            "strengths_identified": self.strengths_identified,
            "areas_for_improvement": self.areas_for_improvement,
            "recommendations": self.recommendations
        }


class EducationalCompanion:
    """
    Educational Companion for personalized learning assistance.
    Provides study planning, subject tutoring, progress tracking,
    quiz generation, and learning resource recommendations.
    """
    
    def __init__(self):
        self.student_profiles: Dict[str, StudentProfile] = {}
        self.learning_objectives: Dict[str, List[LearningObjective]] = {}
        self.study_sessions: Dict[str, List[StudySession]] = {}
        self.quiz_bank = self._initialize_quiz_bank()
        self.learning_resources = self._initialize_learning_resources()
        self.study_plans: Dict[str, Dict] = {}
        logger.info("EducationalCompanion initialized")
    
    def _initialize_quiz_bank(self) -> Dict[str, List[QuizQuestion]]:
        """Initialize the quiz question bank"""
        quizzes = {}
        
        # Mathematics questions
        quizzes["mathematics"] = [
            QuizQuestion(
                id="math_001",
                subject=Subject.MATHEMATICS,
                topic="Algebra",
                question="What is the value of x in the equation 2x + 5 = 15?",
                options=["5", "10", "7.5", "20"],
                correct_answer=0,
                explanation="Subtract 5 from both sides: 2x = 10. Then divide by 2: x = 5.",
                difficulty=DifficultyLevel.BEGINNER,
                hint="Isolate x by first subtracting 5 from both sides."
            ),
            QuizQuestion(
                id="math_002",
                subject=Subject.MATHEMATICS,
                topic="Calculus",
                question="What is the derivative of f(x) = x³?",
                options=["3x²", "x²", "3x", "x³/3"],
                correct_answer=0,
                explanation="Using the power rule: d/dx(xⁿ) = nxⁿ⁻¹. So d/dx(x³) = 3x².",
                difficulty=DifficultyLevel.INTERMEDIATE,
                hint="Use the power rule for differentiation."
            ),
            QuizQuestion(
                id="math_003",
                subject=Subject.MATHEMATICS,
                topic="Geometry",
                question="What is the sum of interior angles in a hexagon?",
                options=["720°", "540°", "360°", "900°"],
                correct_answer=0,
                explanation="The formula is (n-2) × 180° where n is the number of sides. For a hexagon: (6-2) × 180° = 720°.",
                difficulty=DifficultyLevel.BEGINNER,
                hint="Use the formula (n-2) × 180° where n is the number of sides."
            ),
            QuizQuestion(
                id="math_004",
                subject=Subject.MATHEMATICS,
                topic="Statistics",
                question="What does the standard deviation measure?",
                options=["Central tendency", "Data spread", "Correlation", "Skewness"],
                correct_answer=1,
                explanation="Standard deviation measures the amount of variation or dispersion in a set of values.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="math_005",
                subject=Subject.MATHEMATICS,
                topic="Linear Algebra",
                question="What is the determinant of a 2x2 matrix [[a, b], [c, d]]?",
                options=["ad + bc", "ad - bc", "ab + cd", "ab - cd"],
                correct_answer=1,
                explanation="The determinant of [[a, b], [c, d]] is ad - bc.",
                difficulty=DifficultyLevel.INTERMEDIATE
            ),
            QuizQuestion(
                id="math_006",
                subject=Subject.MATHEMATICS,
                topic="Probability",
                question="What is the probability of rolling a sum of 7 with two dice?",
                options=["1/6", "1/12", "1/36", "6/36"],
                correct_answer=3,
                explanation="There are 6 ways to get a sum of 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) out of 36 possible outcomes. So 6/36 = 1/6.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="math_007",
                subject=Subject.MATHEMATICS,
                topic="Trigonometry",
                question="What is the value of sin(90°)?",
                options=["0", "1", "0.5", "undefined"],
                correct_answer=1,
                explanation="sin(90°) = 1. This is a fundamental trigonometric value.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="math_008",
                subject=Subject.MATHEMATICS,
                topic="Number Theory",
                question="Which of the following is a prime number?",
                options=["51", "57", "61", "63"],
                correct_answer=2,
                explanation="61 is prime (only divisible by 1 and 61). 51 = 3 × 17, 57 = 3 × 19, 63 = 7 × 9.",
                difficulty=DifficultyLevel.INTERMEDIATE
            )
        ]
        
        # Science questions
        quizzes["science"] = [
            QuizQuestion(
                id="sci_001",
                subject=Subject.SCIENCE,
                topic="Physics",
                question="What is Newton's Second Law of Motion?",
                options=[
                    "F = ma",
                    "Every action has an equal and opposite reaction",
                    "An object in motion stays in motion",
                    "Energy cannot be created or destroyed"
                ],
                correct_answer=0,
                explanation="Newton's Second Law states that Force = mass × acceleration (F = ma).",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="sci_002",
                subject=Subject.SCIENCE,
                topic="Chemistry",
                question="What is the chemical formula for water?",
                options=["H2O", "CO2", "NaCl", "O2"],
                correct_answer=0,
                explanation="Water is composed of two hydrogen atoms and one oxygen atom: H₂O.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="sci_003",
                subject=Subject.SCIENCE,
                topic="Biology",
                question="What is the powerhouse of the cell?",
                options=["Nucleus", "Mitochondria", "Ribosome", "Endoplasmic Reticulum"],
                correct_answer=1,
                explanation="Mitochondria are called the powerhouse of the cell because they produce ATP through cellular respiration.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="sci_004",
                subject=Subject.SCIENCE,
                topic="Astronomy",
                question="What is the largest planet in our solar system?",
                options=["Saturn", "Jupiter", "Neptune", "Earth"],
                correct_answer=1,
                explanation="Jupiter is the largest planet, with a diameter about 11 times that of Earth.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="sci_005",
                subject=Subject.SCIENCE,
                topic="Earth Science",
                question="What layer of the Earth is directly beneath the crust?",
                options=["Core", "Mantle", "Outer Core", "Lithosphere"],
                correct_answer=1,
                explanation="The mantle is directly beneath the crust and is the thickest layer of the Earth.",
                difficulty=DifficultyLevel.BEGINNER
            )
        ]
        
        # Computer Science questions
        quizzes["computer_science"] = [
            QuizQuestion(
                id="cs_001",
                subject=Subject.COMPUTER_SCIENCE,
                topic="Data Structures",
                question="What is the time complexity of binary search?",
                options=["O(n)", "O(log n)", "O(n²)", "O(1)"],
                correct_answer=1,
                explanation="Binary search has O(log n) time complexity as it halves the search space each iteration.",
                difficulty=DifficultyLevel.INTERMEDIATE
            ),
            QuizQuestion(
                id="cs_002",
                subject=Subject.COMPUTER_SCIENCE,
                topic="Algorithms",
                question="Which sorting algorithm has the best average-case time complexity?",
                options=["Bubble Sort", "Quick Sort", "Merge Sort", "Insertion Sort"],
                correct_answer=2,
                explanation="Merge Sort has O(n log n) average and worst-case time complexity, making it very efficient.",
                difficulty=DifficultyLevel.INTERMEDIATE
            ),
            QuizQuestion(
                id="cs_003",
                subject=Subject.COMPUTER_SCIENCE,
                topic="Programming",
                question="What does OOP stand for?",
                options=[
                    "Object-Oriented Programming",
                    "Optimal Operating Procedure",
                    "Object Operation Process",
                    "Ordered Output Protocol"
                ],
                correct_answer=0,
                explanation="OOP stands for Object-Oriented Programming, a paradigm based on objects and classes.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="cs_004",
                subject=Subject.COMPUTER_SCIENCE,
                topic="Databases",
                question="What does SQL stand for?",
                options=[
                    "Structured Query Language",
                    "Simple Query Language",
                    "System Query Logic",
                    "Standard Question Language"
                ],
                correct_answer=0,
                explanation="SQL stands for Structured Query Language, used for managing relational databases.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="cs_005",
                subject=Subject.COMPUTER_SCIENCE,
                topic="Networks",
                question="What is the default port for HTTP?",
                options=["21", "80", "443", "8080"],
                correct_answer=1,
                explanation="HTTP uses port 80 by default. HTTPS uses port 443.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="cs_006",
                subject=Subject.COMPUTER_SCIENCE,
                topic="Operating Systems",
                question="What is virtual memory?",
                options=[
                    "Physical RAM",
                    "Memory management technique using disk space",
                    "Graphics card memory",
                    "Cache memory"
                ],
                correct_answer=1,
                explanation="Virtual memory uses disk space to extend RAM, allowing programs to use more memory than physically available.",
                difficulty=DifficultyLevel.INTERMEDIATE
            ),
            QuizQuestion(
                id="cs_007",
                subject=Subject.COMPUTER_SCIENCE,
                topic="Machine Learning",
                question="What is the difference between supervised and unsupervised learning?",
                options=[
                    "Supervised uses labeled data, unsupervised does not",
                    "Supervised is faster",
                    "Unsupervised is more accurate",
                    "There is no difference"
                ],
                correct_answer=0,
                explanation="Supervised learning uses labeled training data, while unsupervised learning finds patterns in unlabeled data.",
                difficulty=DifficultyLevel.INTERMEDIATE
            ),
            QuizQuestion(
                id="cs_008",
                subject=Subject.COMPUTER_SCIENCE,
                topic="Cybersecurity",
                question="What is a SQL injection attack?",
                options=[
                    "Injecting malicious SQL code into queries",
                    "Adding extra SQL servers",
                    "Speeding up database queries",
                    "Compressing SQL databases"
                ],
                correct_answer=0,
                explanation="SQL injection is a code injection technique where malicious SQL statements are inserted into queries.",
                difficulty=DifficultyLevel.INTERMEDIATE
            )
        ]
        
        # History questions
        quizzes["history"] = [
            QuizQuestion(
                id="hist_001",
                subject=Subject.HISTORY,
                topic="World History",
                question="In which year did World War II end?",
                options=["1943", "1944", "1945", "1946"],
                correct_answer=2,
                explanation="World War II ended in 1945 with the surrender of Germany in May and Japan in September.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="hist_002",
                subject=Subject.HISTORY,
                topic="US History",
                question="Who was the first President of the United States?",
                options=["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"],
                correct_answer=2,
                explanation="George Washington was the first President, serving from 1789 to 1797.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="hist_003",
                subject=Subject.HISTORY,
                topic="Ancient History",
                question="Which ancient civilization built the pyramids of Giza?",
                options=["Romans", "Greeks", "Egyptians", "Mayans"],
                correct_answer=2,
                explanation="The Great Pyramids of Giza were built by the Ancient Egyptians around 2560 BCE.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="hist_004",
                subject=Subject.HISTORY,
                topic="European History",
                question="The Renaissance began in which country?",
                options=["France", "England", "Italy", "Germany"],
                correct_answer=2,
                explanation="The Renaissance began in Italy, particularly in Florence, in the 14th century.",
                difficulty=DifficultyLevel.BEGINNER
            )
        ]
        
        # Economics questions
        quizzes["economics"] = [
            QuizQuestion(
                id="econ_001",
                subject=Subject.ECONOMICS,
                topic="Microeconomics",
                question="What happens to price when demand increases and supply remains constant?",
                options=["Price decreases", "Price increases", "Price stays the same", "Supply increases"],
                correct_answer=1,
                explanation="When demand increases with constant supply, the equilibrium price rises.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="econ_002",
                subject=Subject.ECONOMICS,
                topic="Macroeconomics",
                question="What does GDP stand for?",
                options=[
                    "Gross Domestic Product",
                    "General Development Plan",
                    "Global Demand Prediction",
                    "Government Debt Percentage"
                ],
                correct_answer=0,
                explanation="GDP stands for Gross Domestic Product, the total value of goods and services produced in a country.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="econ_003",
                subject=Subject.ECONOMICS,
                topic="Finance",
                question="What is compound interest?",
                options=[
                    "Interest on principal only",
                    "Interest on principal and accumulated interest",
                    "A type of bank account",
                    "Government interest rate"
                ],
                correct_answer=1,
                explanation="Compound interest is calculated on both the principal and accumulated interest from previous periods.",
                difficulty=DifficultyLevel.BEGINNER
            ),
            QuizQuestion(
                id="econ_004",
                subject=Subject.ECONOMICS,
                topic="International Trade",
                question="What is a trade surplus?",
                options=[
                    "When imports exceed exports",
                    "When exports exceed imports",
                    "When trade is balanced",
                    "When no trade occurs"
                ],
                correct_answer=1,
                explanation="A trade surplus occurs when a country's exports exceed its imports.",
                difficulty=DifficultyLevel.BEGINNER
            )
        ]
        
        return quizzes
    
    def _initialize_learning_resources(self) -> Dict[str, List[Dict]]:
        """Initialize learning resources database"""
        return {
            "mathematics": [
                {"title": "Khan Academy - Mathematics", "type": "website", "url": "https://khanacademy.org/math", "free": True},
                {"title": "3Blue1Brown", "type": "video", "url": "https://youtube.com/3blue1brown", "free": True},
                {"title": "Brilliant.org", "type": "interactive", "url": "https://brilliant.org", "free": False},
                {"title": "Paul's Online Math Notes", "type": "website", "url": "https://tutorial.math.lamar.edu", "free": True}
            ],
            "science": [
                {"title": "Khan Academy - Science", "type": "website", "url": "https://khanacademy.org/science", "free": True},
                {"title": "NASA Learning Resources", "type": "website", "url": "https://nasa.gov/education", "free": True},
                {"title": "National Geographic", "type": "website", "url": "https://nationalgeographic.com", "free": True}
            ],
            "computer_science": [
                {"title": "freeCodeCamp", "type": "interactive", "url": "https://freecodecamp.org", "free": True},
                {"title": "Codecademy", "type": "interactive", "url": "https://codecademy.com", "free": False},
                {"title": "MIT OpenCourseWare", "type": "course", "url": "https://ocw.mit.edu", "free": True},
                {"title": "CS50 by Harvard", "type": "course", "url": "https://cs50.harvard.edu", "free": True}
            ],
            "history": [
                {"title": "Crash Course History", "type": "video", "url": "https://youtube.com/crashcourse", "free": True},
                {"title": "History.com", "type": "website", "url": "https://history.com", "free": True},
                {"title": "Smithsonian Learning Lab", "type": "website", "url": "https://learninglab.si.edu", "free": True}
            ],
            "economics": [
                {"title": "Khan Academy - Economics", "type": "website", "url": "https://khanacademy.org/economics", "free": True},
                {"title": "Investopedia", "type": "website", "url": "https://investopedia.com", "free": True},
                {"title": "Marginal Revolution University", "type": "video", "url": "https://mru.org", "free": True}
            ]
        }
    
    def create_student_profile(self, student_id: str, name: str = "", **kwargs) -> StudentProfile:
        """Create a new student profile"""
        profile = StudentProfile(student_id=student_id, name=name)
        
        if "education_level" in kwargs:
            try:
                profile.education_level = EducationLevel(kwargs["education_level"])
            except ValueError:
                pass
        
        if "learning_style" in kwargs:
            try:
                profile.learning_style = LearningStyle(kwargs["learning_style"])
            except ValueError:
                pass
        
        for attr in ["strengths", "weaknesses", "interests", "goals"]:
            if attr in kwargs:
                setattr(profile, attr, kwargs[attr])
        
        if "available_hours_per_week" in kwargs:
            profile.available_hours_per_week = float(kwargs["available_hours_per_week"])
        
        if "preferred_session_length" in kwargs:
            profile.preferred_session_length = int(kwargs["preferred_session_length"])
        
        self.student_profiles[student_id] = profile
        self.learning_objectives[student_id] = []
        self.study_sessions[student_id] = []
        
        logger.info(f"Created student profile for {student_id}")
        return profile
    
    def get_student_profile(self, student_id: str) -> Optional[StudentProfile]:
        """Get a student's profile"""
        return self.student_profiles.get(student_id)
    
    def update_student_profile(self, student_id: str, **kwargs) -> Optional[StudentProfile]:
        """Update a student's profile"""
        profile = self.student_profiles.get(student_id)
        if not profile:
            return None
        
        for key, value in kwargs.items():
            if hasattr(profile, key):
                if key == "education_level":
                    try:
                        value = EducationLevel(value)
                    except ValueError:
                        continue
                elif key == "learning_style":
                    try:
                        value = LearningStyle(value)
                    except ValueError:
                        continue
                setattr(profile, key, value)
        
        profile.updated_at = datetime.now().isoformat()
        return profile
    
    def create_study_plan(self, student_id: str, subject: str, topics: List[str], 
                         weeks: int = 4) -> Dict[str, Any]:
        """Create a personalized study plan"""
        profile = self.student_profiles.get(student_id)
        if not profile:
            return {"error": "Student profile not found"}
        
        try:
            subject_enum = Subject(subject)
        except ValueError:
            return {"error": f"Subject '{subject}' not supported", 
                    "available_subjects": [s.value for s in Subject]}
        
        hours_per_week = profile.available_hours_per_week
        session_length = profile.preferred_session_length
        
        # Create weekly schedule
        schedule = []
        start_date = datetime.now()
        
        for week in range(weeks):
            week_topics = topics[week::weeks] if week < len(topics) else ["Review"]
            
            week_plan = {
                "week": week + 1,
                "start_date": (start_date + timedelta(weeks=week)).strftime("%Y-%m-%d"),
                "topics": week_topics,
                "sessions": [],
                "total_hours": hours_per_week
            }
            
            # Create sessions for the week
            sessions_per_week = int((hours_per_week * 60) / session_length)
            for session in range(sessions_per_week):
                topic = week_topics[session % len(week_topics)] if week_topics else "Review"
                session_date = start_date + timedelta(weeks=week, days=session)
                
                week_plan["sessions"].append({
                    "session_number": session + 1,
                    "topic": topic,
                    "duration_minutes": session_length,
                    "scheduled_date": session_date.strftime("%Y-%m-%d"),
                    "activities": self._get_learning_activities(topic, profile.learning_style)
                })
            
            schedule.append(week_plan)
        
        study_plan = {
            "student_id": student_id,
            "subject": subject,
            "topics": topics,
            "duration_weeks": weeks,
            "learning_style": profile.learning_style.value,
            "total_hours": hours_per_week * weeks,
            "schedule": schedule,
            "recommendations": self._get_study_recommendations(profile, subject_enum)
        }
        
        self.study_plans[student_id] = study_plan
        return study_plan
    
    def _get_learning_activities(self, topic: str, learning_style: LearningStyle) -> List[str]:
        """Get recommended learning activities based on learning style"""
        activities = {
            LearningStyle.VISUAL: [
                f"Watch video tutorials on {topic}",
                f"Create mind maps for {topic}",
                f"Study diagrams and infographics about {topic}",
                f"Use flashcards with visual cues for {topic}"
            ],
            LearningStyle.AUDITORY: [
                f"Listen to lectures on {topic}",
                f"Discuss {topic} with a study partner",
                f"Record yourself explaining {topic} concepts",
                f"Join a study group for {topic}"
            ],
            LearningStyle.KINESTHETIC: [
                f"Do hands-on exercises for {topic}",
                f"Build a project applying {topic}",
                f"Use interactive simulations for {topic}",
                f"Take breaks and move while studying {topic}"
            ],
            LearningStyle.READING_WRITING: [
                f"Read textbook chapters on {topic}",
                f"Take detailed notes on {topic}",
                f"Write a summary of {topic} concepts",
                f"Create written study guides for {topic}"
            ],
            LearningStyle.SOCIAL: [
                f"Join a study group for {topic}",
                f"Teach {topic} to someone else",
                f"Participate in online forums about {topic}",
                f"Collaborate on {topic} projects"
            ],
            LearningStyle.SOLITARY: [
                f"Study {topic} in a quiet environment",
                f"Set personal goals for {topic}",
                f"Self-assess your {topic} understanding",
                f"Create a personal study guide for {topic}"
            ],
            LearningStyle.MULTIMODAL: [
                f"Watch videos and take notes on {topic}",
                f"Practice problems and discuss {topic}",
                f"Create visual summaries of {topic}",
                f"Teach and apply {topic} concepts"
            ]
        }
        
        return activities.get(learning_style, activities[LearningStyle.MULTIMODAL])
    
    def _get_study_recommendations(self, profile: StudentProfile, subject: Subject) -> List[str]:
        """Get personalized study recommendations"""
        recommendations = []
        
        if profile.learning_style == LearningStyle.VISUAL:
            recommendations.append("Use color-coded notes and visual aids")
        elif profile.learning_style == LearningStyle.AUDITORY:
            recommendations.append("Record and listen to lectures")
        elif profile.learning_style == LearningStyle.KINESTHETIC:
            recommendations.append("Take frequent breaks and use hands-on activities")
        
        if profile.available_hours_per_week < 5:
            recommendations.append("Focus on high-yield topics due to limited study time")
        elif profile.available_hours_per_week > 20:
            recommendations.append("Consider adding practice problems and projects")
        
        recommendations.extend([
            "Review previous material before each session",
            "Test yourself regularly with practice questions",
            "Take breaks every 25-30 minutes (Pomodoro technique)",
            "Get adequate sleep to improve memory retention"
        ])
        
        return recommendations
    
    def generate_quiz(self, subject: str, topic: str = "", 
                     difficulty: str = "beginner", num_questions: int = 5) -> Dict[str, Any]:
        """Generate a quiz for a subject/topic"""
        try:
            subject_enum = Subject(subject)
        except ValueError:
            return {"error": f"Subject '{subject}' not supported",
                    "available_subjects": [s.value for s in Subject]}
        
        try:
            diff_enum = DifficultyLevel(difficulty)
        except ValueError:
            diff_enum = DifficultyLevel.BEGINNER
        
        # Get questions from quiz bank
        all_questions = self.quiz_bank.get(subject, [])
        
        # Filter by topic and difficulty
        filtered = all_questions
        if topic:
            filtered = [q for q in filtered if q.topic.lower() == topic.lower()]
        
        filtered = [q for q in filtered if q.difficulty == diff_enum]
        
        # If not enough questions at exact difficulty, include adjacent levels
        if len(filtered) < num_questions:
            filtered = [q for q in all_questions if q.topic.lower() == topic.lower()] if topic else all_questions
        
        # Randomly select questions
        if len(filtered) <= num_questions:
            selected = filtered
        else:
            selected = random.sample(filtered, num_questions)
        
        return {
            "subject": subject,
            "topic": topic,
            "difficulty": difficulty,
            "total_questions": len(selected),
            "questions": [q.to_dict() for q in selected]
        }
    
    def grade_quiz(self, student_id: str, quiz_id: str, 
                   answers: List[int]) -> Dict[str, Any]:
        """Grade a completed quiz"""
        # Find the quiz
        quiz = None
        for questions in self.quiz_bank.values():
            for q in questions:
                if q.id == quiz_id:
                    quiz = q
                    break
            if quiz:
                break
        
        if not quiz:
            return {"error": "Quiz not found"}
        
        is_correct = answers[0] == quiz.correct_answer if answers else False
        
        result = {
            "student_id": student_id,
            "quiz_id": quiz_id,
            "subject": quiz.subject.value,
            "topic": quiz.topic,
            "correct": is_correct,
            "user_answer": answers[0] if answers else None,
            "correct_answer": quiz.correct_answer,
            "explanation": quiz.explanation
        }
        
        if is_correct:
            result["feedback"] = "Correct! Great job!"
        else:
            result["feedback"] = f"Not quite. {quiz.explanation}"
        
        return result
    
    def get_learning_resources(self, subject: str, 
                              resource_type: str = "") -> Dict[str, Any]:
        """Get learning resources for a subject"""
        resources = self.learning_resources.get(subject, [])
        
        if resource_type:
            resources = [r for r in resources if r["type"] == resource_type]
        
        return {
            "subject": subject,
            "total_resources": len(resources),
            "resources": resources
        }
    
    def track_progress(self, student_id: str) -> Dict[str, Any]:
        """Track student learning progress"""
        profile = self.student_profiles.get(student_id)
        if not profile:
            return {"error": "Student profile not found"}
        
        objectives = self.learning_objectives.get(student_id, [])
        sessions = self.study_sessions.get(student_id, [])
        
        completed_objectives = [o for o in objectives if o.completed]
        completed_sessions = [s for s in sessions if s.completed]
        
        total_study_hours = sum(s.duration_minutes for s in completed_sessions) / 60
        avg_effectiveness = sum(s.effectiveness_rating for s in completed_sessions) / len(completed_sessions) if completed_sessions else 0
        
        # Calculate subject breakdown
        subject_hours = {}
        for session in completed_sessions:
            subject = session.subject.value
            subject_hours[subject] = subject_hours.get(subject, 0) + session.duration_minutes / 60
        
        return {
            "student_id": student_id,
            "name": profile.name,
            "total_study_hours": round(total_study_hours, 1),
            "sessions_completed": len(completed_sessions),
            "objectives_achieved": len(completed_objectives),
            "total_objectives": len(objectives),
            "completion_rate": round(len(completed_objectives) / len(objectives) * 100, 1) if objectives else 0,
            "average_effectiveness": round(avg_effectiveness, 1),
            "subject_breakdown": subject_hours,
            "streak_days": self._calculate_streak(sessions),
            "recommendations": self._get_progress_recommendations(profile, completed_objectives, objectives)
        }
    
    def _calculate_streak(self, sessions: List[StudySession]) -> int:
        """Calculate current study streak in days"""
        if not sessions:
            return 0
        
        completed_dates = sorted(set(
            datetime.strptime(s.scheduled_date, "%Y-%m-%d").date()
            for s in sessions if s.completed
        ), reverse=True)
        
        if not completed_dates:
            return 0
        
        streak = 1
        today = datetime.now().date()
        
        if (today - completed_dates[0]).days > 1:
            return 0  # Streak broken
        
        for i in range(len(completed_dates) - 1):
            if (completed_dates[i] - completed_dates[i + 1]).days == 1:
                streak += 1
            else:
                break
        
        return streak
    
    def _get_progress_recommendations(self, profile: StudentProfile, 
                                     completed: List[LearningObjective],
                                     total: List[LearningObjective]) -> List[str]:
        """Get recommendations based on progress"""
        recommendations = []
        
        completion_rate = len(completed) / len(total) if total else 0
        
        if completion_rate < 0.3:
            recommendations.append("Focus on completing one objective at a time")
            recommendations.append("Break large objectives into smaller, manageable tasks")
        elif completion_rate < 0.7:
            recommendations.append("You're making good progress! Keep up the momentum")
            recommendations.append("Consider increasing study time slightly")
        else:
            recommendations.append("Excellent progress! Consider tackling more advanced topics")
        
        if profile.weaknesses:
            recommendations.append(f"Spend extra time on weak areas: {', '.join(profile.weaknesses[:3])}")
        
        recommendations.extend([
            "Regular review of completed material improves long-term retention",
            "Try teaching concepts to others to reinforce your understanding"
        ])
        
        return recommendations
    
    def generate_progress_report(self, student_id: str, 
                                 period: str = "monthly") -> ProgressReport:
        """Generate a detailed progress report"""
        profile = self.student_profiles.get(student_id)
        progress = self.track_progress(student_id)
        
        if "error" in progress:
            return ProgressReport(
                student_id=student_id,
                period=period,
                subjects_studied=[],
                total_study_hours=0,
                sessions_completed=0,
                objectives_achieved=0,
                total_objectives=0,
                average_effectiveness=0,
                strengths_identified=[],
                areas_for_improvement=[],
                recommendations=["Create a student profile to start tracking progress"]
            )
        
        return ProgressReport(
            student_id=student_id,
            period=period,
            subjects_studied=list(progress.get("subject_breakdown", {}).keys()),
            total_study_hours=progress["total_study_hours"],
            sessions_completed=progress["sessions_completed"],
            objectives_achieved=progress["objectives_achieved"],
            total_objectives=progress["total_objectives"],
            average_effectiveness=progress["average_effectiveness"],
            strengths_identified=profile.strengths if profile else [],
            areas_for_improvement=profile.weaknesses if profile else [],
            recommendations=progress.get("recommendations", [])
        )
    
    def explain_concept(self, subject: str, concept: str, 
                       level: str = "beginner") -> Dict[str, Any]:
        """Explain a concept at the appropriate level"""
        explanations = {
            "photosynthesis": {
                "beginner": "Photosynthesis is how plants make their food using sunlight, water, and carbon dioxide to create sugar and oxygen.",
                "intermediate": "Photosynthesis is a biochemical process where plants convert light energy into chemical energy. It occurs in chloroplasts and involves two stages: light-dependent reactions and the Calvin cycle.",
                "advanced": "Photosynthesis is a complex redox process involving photosystems I and II, electron transport chains, and carbon fixation via the Calvin-Benson cycle, ultimately converting CO₂ and H₂O into glucose and O₂ using photonic energy."
            },
            "gravity": {
                "beginner": "Gravity is the force that pulls objects toward each other. It's what keeps us on the ground and makes things fall.",
                "intermediate": "Gravity is one of the four fundamental forces of nature. Newton's law states that every mass attracts every other mass with a force proportional to the product of their masses and inversely proportional to the square of the distance between them.",
                "advanced": "Gravity, described by Einstein's General Theory of Relativity, is the curvature of spacetime caused by mass and energy. The Einstein field equations describe how matter and energy determine the geometry of spacetime."
            },
            "programming": {
                "beginner": "Programming is writing instructions for computers to follow. It's like creating a recipe that tells the computer exactly what to do.",
                "intermediate": "Programming involves writing code using programming languages to solve problems. It includes concepts like variables, control structures, functions, and data structures to create software applications.",
                "advanced": "Programming is the process of designing, writing, testing, and maintaining source code. It involves algorithm design, computational thinking, software architecture, and applying principles like abstraction, encapsulation, and modularity."
            },
            "supply_and_demand": {
                "beginner": "Supply and demand is the relationship between how much of something is available and how much people want it. When something is rare but wanted, it costs more.",
                "intermediate": "Supply and demand is an economic model where the price of a good is determined by the intersection of supply (producers willing to sell) and demand (consumers willing to buy). Changes in either shift the equilibrium price and quantity.",
                "advanced": "Supply and demand analysis involves understanding elasticity, consumer and producer surplus, market interventions (price floors/ceilings), and how externalities, taxes, and subsidies affect market equilibrium in partial and general equilibrium frameworks."
            },
            "mitosis": {
                "beginner": "Mitosis is how cells divide to make two identical copies of themselves. It's used for growth and repair.",
                "intermediate": "Mitosis is a type of cell division that results in two daughter cells with identical genetic material. It consists of prophase, metaphase, anaphase, and telophase, followed by cytokinesis.",
                "advanced": "Mitosis is a precisely regulated process involving cyclin-dependent kinases, spindle assembly checkpoint proteins, and dynamic microtubule rearrangements ensuring equal segregation of replicated chromosomes into two daughter nuclei."
            }
        }
        
        concept_lower = concept.lower().replace(" ", "_")
        explanation = explanations.get(concept_lower, {}).get(level)
        
        if not explanation:
            explanation = f"Concept '{concept}' explanation at {level} level would be provided here with detailed information about the topic."
        
        return {
            "subject": subject,
            "concept": concept,
            "level": level,
            "explanation": explanation,
            "key_points": self._get_key_points(concept),
            "related_concepts": self._get_related_concepts(concept)
        }
    
    def _get_key_points(self, concept: str) -> List[str]:
        """Get key points for a concept"""
        key_points_db = {
            "photosynthesis": [
                "Requires sunlight, water, and CO₂",
                "Produces glucose and oxygen",
                "Occurs in chloroplasts",
                "Has light-dependent and independent reactions"
            ],
            "gravity": [
                "One of the four fundamental forces",
                "Always attractive",
                "Follows inverse square law",
                "Described by General Relativity at large scales"
            ],
            "programming": [
                "Uses formal languages",
                "Requires logical thinking",
                "Involves problem decomposition",
                "Needs testing and debugging"
            ]
        }
        return key_points_db.get(concept.lower().replace(" ", "_"), ["Key point 1", "Key point 2", "Key point 3"])
    
    def _get_related_concepts(self, concept: str) -> List[str]:
        """Get related concepts"""
        related_db = {
            "photosynthesis": ["cellular respiration", "chlorophyll", "carbon cycle", "ecosystems"],
            "gravity": ["mass", "weight", "orbit", "general relativity"],
            "programming": ["algorithms", "data structures", "software engineering", "debugging"]
        }
        return related_db.get(concept.lower().replace(" ", "_"), ["Related concept 1", "Related concept 2"])
    
    def solve_problem(self, subject: str, problem: str) -> Dict[str, Any]:
        """Provide step-by-step solution to a problem"""
        # This is a simplified version - in production, this would use
        # more sophisticated problem-solving logic or external APIs
        
        return {
            "subject": subject,
            "problem": problem,
            "solution_steps": [
                "Analyze the given problem and identify known values",
                "Determine what needs to be found or solved",
                "Select appropriate formulas or methods",
                "Apply the solution method step by step",
                "Verify the answer by checking units and reasonableness"
            ],
            "hint": "Break the problem into smaller, manageable parts",
            "note": "For detailed solutions, please specify the exact problem with all given values."
        }
    
    def get_all_subjects(self) -> List[str]:
        """Get list of all supported subjects"""
        return [s.value for s in Subject]
    
    def get_topics_by_subject(self, subject: str) -> List[str]:
        """Get available topics for a subject"""
        topics_db = {
            "mathematics": ["Algebra", "Calculus", "Geometry", "Statistics", "Trigonometry", "Linear Algebra", "Probability", "Number Theory"],
            "science": ["Physics", "Chemistry", "Biology", "Astronomy", "Earth Science"],
            "computer_science": ["Programming", "Data Structures", "Algorithms", "Databases", "Networks", "Operating Systems", "Machine Learning", "Cybersecurity"],
            "history": ["World History", "US History", "Ancient History", "European History", "Asian History"],
            "economics": ["Microeconomics", "Macroeconomics", "Finance", "International Trade"]
        }
        return topics_db.get(subject, [])
    
    def get_study_tips(self, category: str = "general") -> Dict[str, Any]:
        """Get study tips by category"""
        tips = {
            "general": [
                "Create a dedicated study space free from distractions",
                "Use the Pomodoro technique: 25 minutes study, 5 minutes break",
                "Review material within 24 hours of learning it",
                "Get 7-9 hours of sleep for optimal memory consolidation",
                "Stay hydrated and eat brain-healthy foods",
                "Exercise regularly to improve cognitive function",
                "Use active recall instead of passive re-reading",
                "Space out your study sessions over time"
            ],
            "exam_prep": [
                "Start studying at least 2 weeks before the exam",
                "Create a study schedule and stick to it",
                "Practice with past exam papers",
                "Form study groups to discuss difficult topics",
                "Teach the material to someone else",
                "Focus on understanding, not memorization",
                "Get plenty of rest the night before",
                "Read all exam instructions carefully"
            ],
            "memorization": [
                "Use mnemonics and acronyms",
                "Create mental images and visual associations",
                "Use spaced repetition systems (SRS)",
                "Break information into chunks",
                "Use flashcards for active recall",
                "Create songs or rhymes",
                "Connect new info to what you already know",
                "Teach the material to reinforce memory"
            ],
            "time_management": [
                "Prioritize tasks using the Eisenhower matrix",
                "Set SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)",
                "Use a planner or digital calendar",
                "Break large tasks into smaller subtasks",
                "Eliminate time-wasting activities",
                "Batch similar tasks together",
                "Set deadlines for yourself",
                "Review and adjust your schedule weekly"
            ]
        }
        
        return {
            "category": category,
            "tips": tips.get(category, tips["general"])
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the educational companion state"""
        return {
            "total_students": len(self.student_profiles),
            "total_quiz_questions": sum(len(q) for q in self.quiz_bank.values()),
            "subjects_available": self.get_all_subjects(),
            "total_study_plans": len(self.study_plans)
        }
