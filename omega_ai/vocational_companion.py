#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vocational Companion Module for Omega AI
Provides career guidance, vocational training recommendations,
skills assessment, job market insights, and professional development planning.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
import random

logger = logging.getLogger(__name__)


class SkillLevel(Enum):
    """Skill proficiency levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class CareerStage(Enum):
    """Career development stages"""
    STUDENT = "student"
    ENTRY_LEVEL = "entry_level"
    MID_CAREER = "mid_career"
    SENIOR = "senior"
    CAREER_CHANGE = "career_change"


class Industry(Enum):
    """Major industry sectors"""
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    EDUCATION = "education"
    MANUFACTURING = "manufacturing"
    AGRICULTURE = "agriculture"
    RETAIL = "retail"
    CONSTRUCTION = "construction"
    TRANSPORTATION = "transportation"
    ENERGY = "energy"
    MEDIA = "media"
    GOVERNMENT = "government"
    HOSPITALITY = "hospitality"
    LEGAL = "legal"
    CONSULTING = "consulting"


class LearningStyle(Enum):
    """Learning style preferences"""
    VISUAL = "visual"
    AUDITORY = "auditory"
    KINESTHETIC = "kinesthetic"
    READING_WRITING = "reading_writing"
    SOCIAL = "social"
    SOLITARY = "solitary"


@dataclass
class Skill:
    """Represents a vocational skill"""
    name: str
    level: SkillLevel
    category: str
    description: str = ""
    years_experience: float = 0.0
    certifications: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "level": self.level.value,
            "category": self.category,
            "description": self.description,
            "years_experience": self.years_experience,
            "certifications": self.certifications
        }


@dataclass
class CareerPath:
    """Represents a potential career path"""
    title: str
    industry: Industry
    description: str
    required_skills: List[Skill]
    salary_range: Dict[str, float]
    growth_outlook: str
    entry_requirements: List[str]
    progression_steps: List[str]
    training_duration_months: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "industry": self.industry.value,
            "description": self.description,
            "required_skills": [s.to_dict() for s in self.required_skills],
            "salary_range": self.salary_range,
            "growth_outlook": self.growth_outlook,
            "entry_requirements": self.entry_requirements,
            "progression_steps": self.progression_steps,
            "training_duration_months": self.training_duration_months
        }


@dataclass
class TrainingProgram:
    """Represents a vocational training program"""
    name: str
    provider: str
    description: str
    duration_weeks: int
    cost_usd: float
    skills_covered: List[str]
    certification_offered: str
    delivery_mode: str  # online, in_person, hybrid
    prerequisites: List[str]
    reviews_rating: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "provider": self.provider,
            "description": self.description,
            "duration_weeks": self.duration_weeks,
            "cost_usd": self.cost_usd,
            "skills_covered": self.skills_covered,
            "certification_offered": self.certification_offered,
            "delivery_mode": self.delivery_mode,
            "prerequisites": self.prerequisites,
            "reviews_rating": self.reviews_rating
        }


@dataclass
class CareerProfile:
    """User's career profile for personalized recommendations"""
    user_id: str
    career_stage: CareerStage
    current_industry: Optional[Industry]
    target_industry: Optional[Industry]
    current_role: str = ""
    years_experience: float = 0.0
    education_level: str = ""
    skills: List[Skill] = field(default_factory=list)
    interests: List[str] = field(default_factory=list)
    learning_style: LearningStyle = LearningStyle.VISUAL
    location: str = ""
    salary_expectation: float = 0.0
    work_preference: str = ""  # remote, onsite, hybrid
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "career_stage": self.career_stage.value,
            "current_industry": self.current_industry.value if self.current_industry else None,
            "target_industry": self.target_industry.value if self.target_industry else None,
            "current_role": self.current_role,
            "years_experience": self.years_experience,
            "education_level": self.education_level,
            "skills": [s.to_dict() for s in self.skills],
            "interests": self.interests,
            "learning_style": self.learning_style.value,
            "location": self.location,
            "salary_expectation": self.salary_expectation,
            "work_preference": self.work_preference,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class VocationalCompanion:
    """
    Vocational Companion for career guidance and professional development.
    Provides skills assessment, career path recommendations, training suggestions,
    and job market insights.
    """
    
    def __init__(self):
        self.career_profiles: Dict[str, CareerProfile] = {}
        self.career_paths_db = self._initialize_career_paths()
        self.training_programs_db = self._initialize_training_programs()
        logger.info("VocationalCompanion initialized")
    
    def _initialize_career_paths(self) -> Dict[str, List[CareerPath]]:
        """Initialize the career paths database"""
        paths = {}
        
        # Technology career paths
        paths[Industry.TECHNOLOGY.value] = [
            CareerPath(
                title="Software Developer",
                industry=Industry.TECHNOLOGY,
                description="Design, build, and maintain software applications and systems.",
                required_skills=[
                    Skill("Python/JavaScript/Java", SkillLevel.INTERMEDIATE, "Programming"),
                    Skill("Git/GitHub", SkillLevel.INTERMEDIATE, "Version Control"),
                    Skill("Database Management", SkillLevel.BEGINNER, "Data"),
                    Skill("Problem Solving", SkillLevel.INTERMEDIATE, "Soft Skills")
                ],
                salary_range={"entry": 50000, "mid": 85000, "senior": 130000},
                growth_outlook="22% growth expected over next 10 years",
                entry_requirements=["Bachelor's degree or coding bootcamp", "Portfolio of projects"],
                progression_steps=["Junior Developer", "Mid-level Developer", "Senior Developer", "Lead Engineer", "CTO"],
                training_duration_months=6
            ),
            CareerPath(
                title="Data Scientist",
                industry=Industry.TECHNOLOGY,
                description="Analyze complex data to help organizations make better decisions.",
                required_skills=[
                    Skill("Python/R", SkillLevel.ADVANCED, "Programming"),
                    Skill("Statistics", SkillLevel.ADVANCED, "Math"),
                    Skill("Machine Learning", SkillLevel.INTERMEDIATE, "AI"),
                    Skill("SQL", SkillLevel.INTERMEDIATE, "Data")
                ],
                salary_range={"entry": 65000, "mid": 100000, "senior": 150000},
                growth_outlook="35% growth expected over next 10 years",
                entry_requirements=["Bachelor's in STEM field", "Strong math background"],
                progression_steps=["Junior Data Analyst", "Data Scientist", "Senior Data Scientist", "Principal Scientist", "Chief Data Officer"],
                training_duration_months=12
            ),
            CareerPath(
                title="Cybersecurity Analyst",
                industry=Industry.TECHNOLOGY,
                description="Protect organizations from cyber threats and security breaches.",
                required_skills=[
                    Skill("Network Security", SkillLevel.INTERMEDIATE, "Security"),
                    Skill("Linux/Windows Administration", SkillLevel.INTERMEDIATE, "Systems"),
                    Skill("Risk Assessment", SkillLevel.INTERMEDIATE, "Analysis"),
                    Skill("Incident Response", SkillLevel.BEGINNER, "Security")
                ],
                salary_range={"entry": 60000, "mid": 95000, "senior": 140000},
                growth_outlook="33% growth expected over next 10 years",
                entry_requirements=["Bachelor's in IT or certifications", "Security+ or CEH"],
                progression_steps=["Security Analyst", "Security Engineer", "Security Architect", "CISO"],
                training_duration_months=9
            ),
            CareerPath(
                title="Cloud Architect",
                industry=Industry.TECHNOLOGY,
                description="Design and oversee cloud computing strategies for organizations.",
                required_skills=[
                    Skill("AWS/Azure/GCP", SkillLevel.ADVANCED, "Cloud"),
                    Skill("Infrastructure as Code", SkillLevel.ADVANCED, "DevOps"),
                    Skill("Networking", SkillLevel.ADVANCED, "Systems"),
                    Skill("Security", SkillLevel.INTERMEDIATE, "Security")
                ],
                salary_range={"entry": 80000, "mid": 130000, "senior": 180000},
                growth_outlook="27% growth expected over next 10 years",
                entry_requirements=["5+ years IT experience", "Cloud certifications"],
                progression_steps=["System Administrator", "Cloud Engineer", "Senior Cloud Engineer", "Cloud Architect"],
                training_duration_months=12
            ),
            CareerPath(
                title="DevOps Engineer",
                industry=Industry.TECHNOLOGY,
                description="Bridge development and operations for faster software delivery.",
                required_skills=[
                    Skill("CI/CD Pipelines", SkillLevel.ADVANCED, "DevOps"),
                    Skill("Docker/Kubernetes", SkillLevel.ADVANCED, "Containers"),
                    Skill("Scripting (Bash/Python)", SkillLevel.INTERMEDIATE, "Programming"),
                    Skill("Cloud Platforms", SkillLevel.INTERMEDIATE, "Cloud")
                ],
                salary_range={"entry": 70000, "mid": 110000, "senior": 160000},
                growth_outlook="25% growth expected over next 10 years",
                entry_requirements=["Bachelor's in CS or IT", "Linux proficiency"],
                progression_steps=["System Admin", "DevOps Engineer", "Senior DevOps", "Platform Engineer", "VP Engineering"],
                training_duration_months=9
            ),
            CareerPath(
                title="AI/ML Engineer",
                industry=Industry.TECHNOLOGY,
                description="Build and deploy machine learning models and AI systems.",
                required_skills=[
                    Skill("Python", SkillLevel.ADVANCED, "Programming"),
                    Skill("TensorFlow/PyTorch", SkillLevel.ADVANCED, "ML Frameworks"),
                    Skill("Deep Learning", SkillLevel.ADVANCED, "AI"),
                    Skill("MLOps", SkillLevel.INTERMEDIATE, "DevOps")
                ],
                salary_range={"entry": 90000, "mid": 140000, "senior": 200000},
                growth_outlook="40% growth expected over next 10 years",
                entry_requirements=["Master's or PhD preferred", "Strong math foundation"],
                progression_steps=["ML Engineer", "Senior ML Engineer", "Staff ML Engineer", "Principal Scientist"],
                training_duration_months=18
            )
        ]
        
        # Healthcare career paths
        paths[Industry.HEALTHCARE.value] = [
            CareerPath(
                title="Registered Nurse",
                industry=Industry.HEALTHCARE,
                description="Provide patient care and support medical treatment plans.",
                required_skills=[
                    Skill("Patient Care", SkillLevel.ADVANCED, "Clinical"),
                    Skill("Medical Terminology", SkillLevel.ADVANCED, "Medical"),
                    Skill("Critical Thinking", SkillLevel.ADVANCED, "Soft Skills"),
                    Skill("Communication", SkillLevel.ADVANCED, "Soft Skills")
                ],
                salary_range={"entry": 55000, "mid": 75000, "senior": 100000},
                growth_outlook="9% growth expected over next 10 years",
                entry_requirements=["Nursing degree", "RN license"],
                progression_steps=["Staff Nurse", "Charge Nurse", "Nurse Manager", "Director of Nursing"],
                training_duration_months=24
            ),
            CareerPath(
                title="Medical Assistant",
                industry=Industry.HEALTHCARE,
                description="Support healthcare providers with clinical and administrative tasks.",
                required_skills=[
                    Skill("Vital Signs", SkillLevel.INTERMEDIATE, "Clinical"),
                    Skill("Medical Records", SkillLevel.INTERMEDIATE, "Administrative"),
                    Skill("Patient Communication", SkillLevel.INTERMEDIATE, "Soft Skills"),
                    Skill("Basic Clinical Procedures", SkillLevel.BEGINNER, "Clinical")
                ],
                salary_range={"entry": 30000, "mid": 40000, "senior": 50000},
                growth_outlook="19% growth expected over next 10 years",
                entry_requirements=["High school diploma", "Medical assistant certification"],
                progression_steps=["Medical Assistant", "Senior MA", "Clinical Coordinator", "Office Manager"],
                training_duration_months=9
            ),
            CareerPath(
                title="Health Information Technician",
                industry=Industry.HEALTHCARE,
                description="Manage patient health records and medical data systems.",
                required_skills=[
                    Skill("Medical Coding", SkillLevel.ADVANCED, "Technical"),
                    Skill("EHR Systems", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Data Privacy Laws", SkillLevel.INTERMEDIATE, "Legal"),
                    Skill("Attention to Detail", SkillLevel.ADVANCED, "Soft Skills")
                ],
                salary_range={"entry": 35000, "mid": 50000, "senior": 70000},
                growth_outlook="17% growth expected over next 10 years",
                entry_requirements=["Associate degree", "RHIT certification"],
                progression_steps=["HIT Technician", "Senior HIT", "HIT Manager", "Health Information Director"],
                training_duration_months=18
            ),
            CareerPath(
                title="Physical Therapist",
                industry=Industry.HEALTHCARE,
                description="Help patients recover movement and manage pain.",
                required_skills=[
                    Skill("Therapeutic Exercise", SkillLevel.ADVANCED, "Clinical"),
                    Skill("Patient Assessment", SkillLevel.ADVANCED, "Clinical"),
                    Skill("Treatment Planning", SkillLevel.ADVANCED, "Clinical"),
                    Skill("Documentation", SkillLevel.INTERMEDIATE, "Administrative")
                ],
                salary_range={"entry": 65000, "mid": 85000, "senior": 110000},
                growth_outlook="17% growth expected over next 10 years",
                entry_requirements=["Doctor of Physical Therapy degree", "State license"],
                progression_steps=["Staff PT", "Senior PT", "Clinical Specialist", "Practice Owner"],
                training_duration_months=36
            )
        ]
        
        # Finance career paths
        paths[Industry.FINANCE.value] = [
            CareerPath(
                title="Financial Analyst",
                industry=Industry.FINANCE,
                description="Analyze financial data and provide investment recommendations.",
                required_skills=[
                    Skill("Excel/Financial Modeling", SkillLevel.ADVANCED, "Technical"),
                    Skill("Accounting Principles", SkillLevel.ADVANCED, "Accounting"),
                    Skill("Data Analysis", SkillLevel.INTERMEDIATE, "Analytical"),
                    Skill("Presentation Skills", SkillLevel.INTERMEDIATE, "Soft Skills")
                ],
                salary_range={"entry": 55000, "mid": 80000, "senior": 120000},
                growth_outlook="9% growth expected over next 10 years",
                entry_requirements=["Bachelor's in Finance/Accounting", "CFA preferred"],
                progression_steps=["Junior Analyst", "Financial Analyst", "Senior Analyst", "Portfolio Manager", "CFO"],
                training_duration_months=12
            ),
            CareerPath(
                title="Accountant",
                industry=Industry.FINANCE,
                description="Prepare and examine financial records for accuracy and compliance.",
                required_skills=[
                    Skill("GAAP/IFRS", SkillLevel.ADVANCED, "Accounting"),
                    Skill("Accounting Software", SkillLevel.ADVANCED, "Technical"),
                    Skill("Tax Preparation", SkillLevel.INTERMEDIATE, "Tax"),
                    Skill("Attention to Detail", SkillLevel.ADVANCED, "Soft Skills")
                ],
                salary_range={"entry": 45000, "mid": 65000, "senior": 95000},
                growth_outlook="7% growth expected over next 10 years",
                entry_requirements=["Bachelor's in Accounting", "CPA license"],
                progression_steps=["Staff Accountant", "Senior Accountant", "Accounting Manager", "Controller", "CFO"],
                training_duration_months=12
            ),
            CareerPath(
                title="Insurance Underwriter",
                industry=Industry.FINANCE,
                description="Evaluate insurance applications and determine coverage terms.",
                required_skills=[
                    Skill("Risk Assessment", SkillLevel.ADVANCED, "Analytical"),
                    Skill("Insurance Regulations", SkillLevel.ADVANCED, "Legal"),
                    Skill("Data Analysis", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Decision Making", SkillLevel.ADVANCED, "Soft Skills")
                ],
                salary_range={"entry": 50000, "mid": 70000, "senior": 100000},
                growth_outlook="-2% decline expected (automation impact)",
                entry_requirements=["Bachelor's degree", "Insurance certifications"],
                progression_steps=["Underwriter Trainee", "Underwriter", "Senior Underwriter", "Underwriting Manager"],
                training_duration_months=6
            ),
            CareerPath(
                title="Personal Financial Advisor",
                industry=Industry.FINANCE,
                description="Help individuals manage their finances and plan for the future.",
                required_skills=[
                    Skill("Financial Planning", SkillLevel.ADVANCED, "Planning"),
                    Skill("Investment Knowledge", SkillLevel.ADVANCED, "Investing"),
                    Skill("Client Relations", SkillLevel.ADVANCED, "Soft Skills"),
                    Skill("Regulatory Compliance", SkillLevel.INTERMEDIATE, "Legal")
                ],
                salary_range={"entry": 45000, "mid": 75000, "senior": 130000},
                growth_outlook="15% growth expected over next 10 years",
                entry_requirements=["Bachelor's degree", "CFP certification"],
                progression_steps=["Junior Advisor", "Financial Advisor", "Senior Advisor", "Wealth Manager", "Partner"],
                training_duration_months=12
            )
        ]
        
        # Education career paths
        paths[Industry.EDUCATION.value] = [
            CareerPath(
                title="Teacher",
                industry=Industry.EDUCATION,
                description="Educate students in various subjects and grade levels.",
                required_skills=[
                    Skill("Curriculum Development", SkillLevel.ADVANCED, "Pedagogy"),
                    Skill("Classroom Management", SkillLevel.ADVANCED, "Management"),
                    Skill("Communication", SkillLevel.ADVANCED, "Soft Skills"),
                    Skill("Assessment Design", SkillLevel.INTERMEDIATE, "Pedagogy")
                ],
                salary_range={"entry": 40000, "mid": 55000, "senior": 75000},
                growth_outlook="4% growth expected over next 10 years",
                entry_requirements=["Bachelor's degree", "Teaching license"],
                progression_steps=["Student Teacher", "Classroom Teacher", "Lead Teacher", "Department Head", "Principal"],
                training_duration_months=24
            ),
            CareerPath(
                title="Instructional Designer",
                industry=Industry.EDUCATION,
                description="Create educational materials and learning experiences.",
                required_skills=[
                    Skill("E-learning Tools", SkillLevel.ADVANCED, "Technical"),
                    Skill("Adult Learning Theory", SkillLevel.ADVANCED, "Pedagogy"),
                    Skill("Multimedia Development", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Project Management", SkillLevel.INTERMEDIATE, "Management")
                ],
                salary_range={"entry": 50000, "mid": 70000, "senior": 95000},
                growth_outlook="12% growth expected over next 10 years",
                entry_requirements=["Bachelor's in Education or IT", "Portfolio required"],
                progression_steps=["Junior ID", "Instructional Designer", "Senior ID", "Learning Director"],
                training_duration_months=12
            ),
            CareerPath(
                title="Education Administrator",
                industry=Industry.EDUCATION,
                description="Manage educational institutions and programs.",
                required_skills=[
                    Skill("Leadership", SkillLevel.ADVANCED, "Management"),
                    Skill("Budget Management", SkillLevel.ADVANCED, "Finance"),
                    Skill("Policy Development", SkillLevel.ADVANCED, "Administrative"),
                    Skill("Strategic Planning", SkillLevel.INTERMEDIATE, "Planning")
                ],
                salary_range={"entry": 60000, "mid": 85000, "senior": 120000},
                growth_outlook="8% growth expected over next 10 years",
                entry_requirements=["Master's in Education Administration", "Administrative experience"],
                progression_steps=["Teacher", "Department Head", "Assistant Principal", "Principal", "Superintendent"],
                training_duration_months=24
            )
        ]
        
        # Manufacturing career paths
        paths[Industry.MANUFACTURING.value] = [
            CareerPath(
                title="Manufacturing Technician",
                industry=Industry.MANUFACTURING,
                description="Operate and maintain manufacturing equipment and processes.",
                required_skills=[
                    Skill("Equipment Operation", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Quality Control", SkillLevel.INTERMEDIATE, "Quality"),
                    Skill("Safety Protocols", SkillLevel.ADVANCED, "Safety"),
                    Skill("Troubleshooting", SkillLevel.INTERMEDIATE, "Technical")
                ],
                salary_range={"entry": 35000, "mid": 50000, "senior": 70000},
                growth_outlook="5% growth expected over next 10 years",
                entry_requirements=["High school diploma", "Technical training"],
                progression_steps=["Entry Technician", "Senior Technician", "Lead Technician", "Production Supervisor"],
                training_duration_months=6
            ),
            CareerPath(
                title="Quality Control Inspector",
                industry=Industry.MANUFACTURING,
                description="Ensure products meet quality standards and specifications.",
                required_skills=[
                    Skill("Quality Standards", SkillLevel.ADVANCED, "Quality"),
                    Skill("Measurement Tools", SkillLevel.ADVANCED, "Technical"),
                    Skill("Statistical Analysis", SkillLevel.INTERMEDIATE, "Analytical"),
                    Skill("Documentation", SkillLevel.INTERMEDIATE, "Administrative")
                ],
                salary_range={"entry": 35000, "mid": 50000, "senior": 70000},
                growth_outlook="2% growth expected over next 10 years",
                entry_requirements=["High school diploma", "Quality certification"],
                progression_steps=["QC Inspector", "Senior Inspector", "QC Lead", "Quality Manager"],
                training_duration_months=3
            ),
            CareerPath(
                title="Industrial Engineer",
                industry=Industry.MANUFACTURING,
                description="Optimize manufacturing processes and efficiency.",
                required_skills=[
                    Skill("Process Optimization", SkillLevel.ADVANCED, "Engineering"),
                    Skill("Lean/Six Sigma", SkillLevel.ADVANCED, "Methodology"),
                    Skill("CAD Software", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Data Analysis", SkillLevel.INTERMEDIATE, "Analytical")
                ],
                salary_range={"entry": 60000, "mid": 85000, "senior": 120000},
                growth_outlook="14% growth expected over next 10 years",
                entry_requirements=["Bachelor's in Industrial Engineering", "Six Sigma certification"],
                progression_steps=["Junior IE", "Industrial Engineer", "Senior IE", "Engineering Manager"],
                training_duration_months=12
            ),
            CareerPath(
                title="CNC Machinist",
                industry=Industry.MANUFACTURING,
                description="Operate computer numerical control machines to produce precision parts.",
                required_skills=[
                    Skill("CNC Programming", SkillLevel.ADVANCED, "Technical"),
                    Skill("Blueprint Reading", SkillLevel.ADVANCED, "Technical"),
                    Skill("Precision Measurement", SkillLevel.ADVANCED, "Technical"),
                    Skill("Machine Maintenance", SkillLevel.INTERMEDIATE, "Technical")
                ],
                salary_range={"entry": 40000, "mid": 55000, "senior": 75000},
                growth_outlook="8% growth expected over next 10 years",
                entry_requirements=["High school diploma", "CNC training program"],
                progression_steps=["CNC Operator", "CNC Machinist", "Senior Machinist", "Programming Specialist"],
                training_duration_months=12
            )
        ]
        
        # Agriculture career paths
        paths[Industry.AGRICULTURE.value] = [
            CareerPath(
                title="Agricultural Technician",
                industry=Industry.AGRICULTURE,
                description="Support agricultural research and production activities.",
                required_skills=[
                    Skill("Crop Management", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Soil Analysis", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Equipment Operation", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Data Collection", SkillLevel.BEGINNER, "Technical")
                ],
                salary_range={"entry": 30000, "mid": 45000, "senior": 60000},
                growth_outlook="9% growth expected over next 10 years",
                entry_requirements=["Associate degree", "Agricultural training"],
                progression_steps=["Field Technician", "Senior Technician", "Research Associate", "Lab Manager"],
                training_duration_months=12
            ),
            CareerPath(
                title="Precision Agriculture Specialist",
                industry=Industry.AGRICULTURE,
                description="Use technology to optimize farming practices and crop yields.",
                required_skills=[
                    Skill("GPS/GIS Technology", SkillLevel.ADVANCED, "Technical"),
                    Skill("Drone Operation", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Data Analytics", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Agronomy", SkillLevel.ADVANCED, "Science")
                ],
                salary_range={"entry": 45000, "mid": 65000, "senior": 90000},
                growth_outlook="15% growth expected over next 10 years",
                entry_requirements=["Bachelor's in Agriculture/IT", "Drone certification"],
                progression_steps=["Agricultural Technologist", "Precision Ag Specialist", "Senior Specialist", "Ag Tech Director"],
                training_duration_months=12
            ),
            CareerPath(
                title="Agricultural Manager",
                industry=Industry.AGRICULTURE,
                description="Oversee farm operations and agricultural businesses.",
                required_skills=[
                    Skill("Business Management", SkillLevel.ADVANCED, "Management"),
                    Skill("Crop/Livestock Knowledge", SkillLevel.ADVANCED, "Technical"),
                    Skill("Financial Planning", SkillLevel.INTERMEDIATE, "Finance"),
                    Skill("Leadership", SkillLevel.ADVANCED, "Soft Skills")
                ],
                salary_range={"entry": 50000, "mid": 75000, "senior": 110000},
                growth_outlook="5% growth expected over next 10 years",
                entry_requirements=["Bachelor's in Agriculture/Business", "Farm experience"],
                progression_steps=["Farm Supervisor", "Farm Manager", "Operations Manager", "Agricultural Director"],
                training_duration_months=12
            )
        ]
        
        # Construction career paths
        paths[Industry.CONSTRUCTION.value] = [
            CareerPath(
                title="Electrician",
                industry=Industry.CONSTRUCTION,
                description="Install and maintain electrical systems in buildings.",
                required_skills=[
                    Skill("Electrical Systems", SkillLevel.ADVANCED, "Technical"),
                    Skill("Blueprint Reading", SkillLevel.ADVANCED, "Technical"),
                    Skill("Safety Compliance", SkillLevel.ADVANCED, "Safety"),
                    Skill("Troubleshooting", SkillLevel.ADVANCED, "Technical")
                ],
                salary_range={"entry": 35000, "mid": 55000, "senior": 80000},
                growth_outlook="7% growth expected over next 10 years",
                entry_requirements=["High school diploma", "Apprenticeship (4-5 years)"],
                progression_steps=["Apprentice", "Journeyman", "Master Electrician", "Electrical Contractor"],
                training_duration_months=48
            ),
            CareerPath(
                title="HVAC Technician",
                industry=Industry.CONSTRUCTION,
                description="Install and repair heating, ventilation, and air conditioning systems.",
                required_skills=[
                    Skill("HVAC Systems", SkillLevel.ADVANCED, "Technical"),
                    Skill("Refrigeration", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Electrical Knowledge", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Customer Service", SkillLevel.INTERMEDIATE, "Soft Skills")
                ],
                salary_range={"entry": 35000, "mid": 50000, "senior": 75000},
                growth_outlook="5% growth expected over next 10 years",
                entry_requirements=["Technical school training", "EPA certification"],
                progression_steps=["HVAC Helper", "Technician", "Senior Technician", "HVAC Contractor"],
                training_duration_months=12
            ),
            CareerPath(
                title="Construction Manager",
                industry=Industry.CONSTRUCTION,
                description="Plan and oversee construction projects from start to finish.",
                required_skills=[
                    Skill("Project Management", SkillLevel.ADVANCED, "Management"),
                    Skill("Budget Management", SkillLevel.ADVANCED, "Finance"),
                    Skill("Building Codes", SkillLevel.ADVANCED, "Legal"),
                    Skill("Team Leadership", SkillLevel.ADVANCED, "Soft Skills")
                ],
                salary_range={"entry": 60000, "mid": 95000, "senior": 140000},
                growth_outlook="8% growth expected over next 10 years",
                entry_requirements=["Bachelor's in Construction Management", "Field experience"],
                progression_steps=["Project Engineer", "Assistant PM", "Project Manager", "Senior PM", "VP Operations"],
                training_duration_months=24
            ),
            CareerPath(
                title="Plumber",
                industry=Industry.CONSTRUCTION,
                description="Install and repair piping systems for water, gas, and drainage.",
                required_skills=[
                    Skill("Pipe Systems", SkillLevel.ADVANCED, "Technical"),
                    Skill("Blueprint Reading", SkillLevel.ADVANCED, "Technical"),
                    Skill("Problem Solving", SkillLevel.ADVANCED, "Soft Skills"),
                    Skill("Physical Stamina", SkillLevel.ADVANCED, "Physical")
                ],
                salary_range={"entry": 32000, "mid": 55000, "senior": 80000},
                growth_outlook="5% growth expected over next 10 years",
                entry_requirements=["High school diploma", "Apprenticeship (4-5 years)"],
                progression_steps=["Apprentice", "Journeyman", "Master Plumber", "Plumbing Contractor"],
                training_duration_months=48
            )
        ]
        
        # Add more industries with representative paths
        paths[Industry.RETAIL.value] = [
            CareerPath(
                title="Retail Manager",
                industry=Industry.RETAIL,
                description="Oversee daily operations of retail stores.",
                required_skills=[
                    Skill("Customer Service", SkillLevel.ADVANCED, "Soft Skills"),
                    Skill("Inventory Management", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Sales Strategy", SkillLevel.INTERMEDIATE, "Business"),
                    Skill("Team Leadership", SkillLevel.INTERMEDIATE, "Management")
                ],
                salary_range={"entry": 35000, "mid": 50000, "senior": 75000},
                growth_outlook="2% growth expected over next 10 years",
                entry_requirements=["High school diploma", "Retail experience"],
                progression_steps=["Sales Associate", "Department Manager", "Store Manager", "District Manager"],
                training_duration_months=6
            ),
            CareerPath(
                title="E-commerce Specialist",
                industry=Industry.RETAIL,
                description="Manage online sales platforms and digital marketing.",
                required_skills=[
                    Skill("Digital Marketing", SkillLevel.ADVANCED, "Marketing"),
                    Skill("E-commerce Platforms", SkillLevel.ADVANCED, "Technical"),
                    Skill("Data Analytics", SkillLevel.INTERMEDIATE, "Analytical"),
                    Skill("SEO/SEM", SkillLevel.INTERMEDIATE, "Marketing")
                ],
                salary_range={"entry": 45000, "mid": 65000, "senior": 95000},
                growth_outlook="18% growth expected over next 10 years",
                entry_requirements=["Bachelor's in Marketing/Business", "E-commerce experience"],
                progression_steps=["E-commerce Coordinator", "E-commerce Manager", "Digital Director", "VP E-commerce"],
                training_duration_months=9
            )
        ]
        
        paths[Industry.TRANSPORTATION.value] = [
            CareerPath(
                title="Commercial Truck Driver",
                industry=Industry.TRANSPORTATION,
                description="Transport goods over long distances using heavy trucks.",
                required_skills=[
                    Skill("Vehicle Operation", SkillLevel.ADVANCED, "Technical"),
                    Skill("Route Planning", SkillLevel.INTERMEDIATE, "Planning"),
                    Skill("Safety Regulations", SkillLevel.ADVANCED, "Safety"),
                    Skill("Vehicle Maintenance", SkillLevel.INTERMEDIATE, "Technical")
                ],
                salary_range={"entry": 40000, "mid": 55000, "senior": 75000},
                growth_outlook="6% growth expected over next 10 years",
                entry_requirements=["CDL license", "Clean driving record"],
                progression_steps=["Local Driver", "Regional Driver", "Long-haul Driver", "Owner-Operator"],
                training_duration_months=3
            ),
            CareerPath(
                title="Logistics Coordinator",
                industry=Industry.TRANSPORTATION,
                description="Coordinate the movement of goods and materials.",
                required_skills=[
                    Skill("Supply Chain Management", SkillLevel.ADVANCED, "Management"),
                    Skill("Inventory Systems", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Vendor Relations", SkillLevel.INTERMEDIATE, "Soft Skills"),
                    Skill("Data Analysis", SkillLevel.INTERMEDIATE, "Analytical")
                ],
                salary_range={"entry": 40000, "mid": 55000, "senior": 75000},
                growth_outlook="9% growth expected over next 10 years",
                entry_requirements=["Bachelor's in Logistics/Business", "SCMP certification"],
                progression_steps=["Logistics Coordinator", "Logistics Manager", "Supply Chain Manager", "VP Logistics"],
                training_duration_months=12
            )
        ]
        
        paths[Industry.ENERGY.value] = [
            CareerPath(
                title="Solar Panel Installer",
                industry=Industry.ENERGY,
                description="Install and maintain solar energy systems.",
                required_skills=[
                    Skill("Electrical Systems", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Roof Safety", SkillLevel.ADVANCED, "Safety"),
                    Skill("System Design", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Customer Service", SkillLevel.INTERMEDIATE, "Soft Skills")
                ],
                salary_range={"entry": 35000, "mid": 45000, "senior": 60000},
                growth_outlook="27% growth expected over next 10 years",
                entry_requirements=["High school diploma", "Electrical training"],
                progression_steps=["Installer", "Lead Installer", "Project Manager", "Solar Consultant"],
                training_duration_months=6
            ),
            CareerPath(
                title="Wind Turbine Technician",
                industry=Industry.ENERGY,
                description="Install and maintain wind turbines for power generation.",
                required_skills=[
                    Skill("Mechanical Systems", SkillLevel.ADVANCED, "Technical"),
                    Skill("Electrical Systems", SkillLevel.ADVANCED, "Technical"),
                    Skill("Hydraulics", SkillLevel.INTERMEDIATE, "Technical"),
                    Skill("Height Safety", SkillLevel.ADVANCED, "Safety")
                ],
                salary_range={"entry": 50000, "mid": 55000, "senior": 70000},
                growth_outlook="45% growth expected over next 10 years",
                entry_requirements=["Technical school training", "Tower climbing certification"],
                progression_steps=["Wind Tech I", "Wind Tech II", "Senior Technician", "Site Manager"],
                training_duration_months=12
            )
        ]
        
        paths[Industry.HOSPITALITY.value] = [
            CareerPath(
                title="Hotel Manager",
                industry=Industry.HOSPITALITY,
                description="Oversee all operations of a hotel or resort.",
                required_skills=[
                    Skill("Customer Service", SkillLevel.ADVANCED, "Soft Skills"),
                    Skill("Revenue Management", SkillLevel.ADVANCED, "Business"),
                    Skill("Staff Management", SkillLevel.ADVANCED, "Management"),
                    Skill("Marketing", SkillLevel.INTERMEDIATE, "Marketing")
                ],
                salary_range={"entry": 40000, "mid": 60000, "senior": 100000},
                growth_outlook="9% growth expected over next 10 years",
                entry_requirements=["Bachelor's in Hospitality Management", "Industry experience"],
                progression_steps=["Front Desk Agent", "Assistant Manager", "Department Manager", "General Manager"],
                training_duration_months=24
            ),
            CareerPath(
                title="Chef",
                industry=Industry.HOSPITALITY,
                description="Prepare meals and manage kitchen operations.",
                required_skills=[
                    Skill("Culinary Techniques", SkillLevel.ADVANCED, "Culinary"),
                    Skill("Menu Planning", SkillLevel.ADVANCED, "Planning"),
                    Skill("Kitchen Management", SkillLevel.INTERMEDIATE, "Management"),
                    Skill("Food Safety", SkillLevel.ADVANCED, "Safety")
                ],
                salary_range={"entry": 30000, "mid": 50000, "senior": 85000},
                growth_outlook="15% growth expected over next 10 years",
                entry_requirements=["Culinary school", "Kitchen experience"],
                progression_steps=["Line Cook", "Sous Chef", "Executive Sous", "Executive Chef"],
                training_duration_months=24
            )
        ]
        
        return paths
    
    def _initialize_training_programs(self) -> List[TrainingProgram]:
        """Initialize training programs database"""
        programs = [
            # Technology programs
            TrainingProgram(
                name="Full-Stack Web Development Bootcamp",
                provider="General Assembly",
                description="Intensive 12-week program covering front-end and back-end web development.",
                duration_weeks=12,
                cost_usd=15500,
                skills_covered=["HTML/CSS", "JavaScript", "React", "Node.js", "Python", "SQL", "Git"],
                certification_offered="Full-Stack Developer Certificate",
                delivery_mode="hybrid",
                prerequisites=["Basic computer literacy"],
                reviews_rating=4.5
            ),
            TrainingProgram(
                name="AWS Solutions Architect",
                provider="Amazon Web Services",
                description="Comprehensive cloud computing training for AWS architecture.",
                duration_weeks=8,
                cost_usd=2000,
                skills_covered=["AWS Core Services", "Architecture Design", "Security", "Cost Optimization"],
                certification_offered="AWS Solutions Architect Associate",
                delivery_mode="online",
                prerequisites=["Basic IT knowledge"],
                reviews_rating=4.7
            ),
            TrainingProgram(
                name="Data Science Professional Certificate",
                provider="Coursera/IBM",
                description="Comprehensive data science program covering Python, SQL, and machine learning.",
                duration_weeks=20,
                cost_usd=400,
                skills_covered=["Python", "SQL", "Data Visualization", "Machine Learning", "Statistics"],
                certification_offered="IBM Data Science Professional Certificate",
                delivery_mode="online",
                prerequisites=["Basic math and programming"],
                reviews_rating=4.6
            ),
            TrainingProgram(
                name="Cybersecurity Certification",
                provider="CompTIA",
                description="Industry-recognized cybersecurity certification program.",
                duration_weeks=16,
                cost_usd=1200,
                skills_covered=["Network Security", "Threat Management", "Cryptography", "Risk Management"],
                certification_offered="CompTIA Security+",
                delivery_mode="online",
                prerequisites=["CompTIA Network+ or equivalent"],
                reviews_rating=4.4
            ),
            # Healthcare programs
            TrainingProgram(
                name="Medical Assistant Program",
                provider="National Healthcareer Association",
                description="Comprehensive medical assistant training program.",
                duration_weeks=36,
                cost_usd=5000,
                skills_covered=["Clinical Procedures", "Medical Terminology", "EHR Systems", "Patient Care"],
                certification_offered="Certified Medical Assistant (CMA)",
                delivery_mode="hybrid",
                prerequisites=["High school diploma"],
                reviews_rating=4.3
            ),
            TrainingProgram(
                name="Medical Coding Specialist",
                provider="AAPC",
                description="Professional medical coding and billing certification.",
                duration_weeks=16,
                cost_usd=2500,
                skills_covered=["ICD-10", "CPT Coding", "Medical Terminology", "Billing Procedures"],
                certification_offered="Certified Professional Coder (CPC)",
                delivery_mode="online",
                prerequisites=["Medical terminology knowledge"],
                reviews_rating=4.5
            ),
            # Trade programs
            TrainingProgram(
                name="Electrical Apprenticeship",
                provider="IBEW",
                description="Comprehensive electrical apprenticeship program.",
                duration_weeks=208,
                cost_usd=0,
                skills_covered=["Electrical Theory", "Code Compliance", "Safety", "Blueprint Reading"],
                certification_offered="Journeyman Electrician License",
                delivery_mode="in_person",
                prerequisites=["High school diploma", "Pass aptitude test"],
                reviews_rating=4.8
            ),
            TrainingProgram(
                name="HVAC Technician Certification",
                provider="HVAC Excellence",
                description="Professional HVAC technician training and certification.",
                duration_weeks=36,
                cost_usd=8000,
                skills_covered=["Refrigeration", "Heating Systems", "Air Conditioning", "Troubleshooting"],
                certification_offered="EPA 608 Certification",
                delivery_mode="hybrid",
                prerequisites=["High school diploma"],
                reviews_rating=4.4
            ),
            # Manufacturing programs
            TrainingProgram(
                name="CNC Machinist Training",
                provider="Tooling U-SME",
                description="Comprehensive CNC machining training program.",
                duration_weeks=24,
                cost_usd=3500,
                skills_covered=["CNC Programming", "Blueprint Reading", "Quality Control", "Machine Setup"],
                certification_offered="NIMS CNC Programming Certification",
                delivery_mode="hybrid",
                prerequisites=["Basic math skills"],
                reviews_rating=4.6
            ),
            TrainingProgram(
                name="Six Sigma Green Belt",
                provider="ASQ",
                description="Process improvement and quality management certification.",
                duration_weeks=8,
                cost_usd=2500,
                skills_covered=["DMAIC Methodology", "Statistical Analysis", "Process Mapping", "Root Cause Analysis"],
                certification_offered="Six Sigma Green Belt",
                delivery_mode="online",
                prerequisites=["3+ years work experience"],
                reviews_rating=4.5
            ),
            # Finance programs
            TrainingProgram(
                name="Certified Public Accountant Prep",
                provider="Becker CPA Review",
                description="Comprehensive CPA exam preparation course.",
                duration_weeks=24,
                cost_usd=3500,
                skills_covered=["Auditing", "Financial Accounting", "Regulation", "Business Environment"],
                certification_offered="CPA License",
                delivery_mode="online",
                prerequisites=["Bachelor's degree in Accounting", "150 credit hours"],
                reviews_rating=4.7
            ),
            TrainingProgram(
                name="Certified Financial Planner",
                provider="CFP Board",
                description="Comprehensive financial planning certification program.",
                duration_weeks=24,
                cost_usd=5000,
                skills_covered=["Financial Planning", "Investment Management", "Tax Planning", "Estate Planning"],
                certification_offered="CFP Certification",
                delivery_mode="hybrid",
                prerequisites=["Bachelor's degree", "3 years experience"],
                reviews_rating=4.6
            ),
            # Education programs
            TrainingProgram(
                name="TESOL Certification",
                provider="International TEFL Academy",
                description="Teach English to speakers of other languages.",
                duration_weeks=11,
                cost_usd=1500,
                skills_covered=["Lesson Planning", "Classroom Management", "Grammar Instruction", "Assessment"],
                certification_offered="TESOL/TEFL Certificate",
                delivery_mode="online",
                prerequisites=["Native English proficiency", "Bachelor's degree"],
                reviews_rating=4.5
            ),
            TrainingProgram(
                name="Instructional Design Certificate",
                provider="University of California Irvine",
                description="Design effective learning experiences and educational content.",
                duration_weeks=12,
                cost_usd=3500,
                skills_covered=["Learning Theory", "E-learning Tools", "Content Development", "Assessment Design"],
                certification_offered="Instructional Design Certificate",
                delivery_mode="online",
                prerequisites=["Bachelor's degree"],
                reviews_rating=4.4
            ),
            # Energy programs
            TrainingProgram(
                name="Solar Installation Training",
                provider="Solar Energy International",
                description="Hands-on solar panel installation training.",
                duration_weeks=6,
                cost_usd=2500,
                skills_covered=["PV System Design", "Installation Techniques", "Electrical Wiring", "Safety"],
                certification_offered="NABCEP PV Associate",
                delivery_mode="hybrid",
                prerequisites=["Basic electrical knowledge"],
                reviews_rating=4.7
            ),
            TrainingProgram(
                name="Wind Turbine Technician Training",
                provider="WindTech Training Center",
                description="Comprehensive wind turbine maintenance training.",
                duration_weeks=24,
                cost_usd=15000,
                skills_covered=["Turbine Mechanics", "Electrical Systems", "Hydraulics", "Safety Protocols"],
                certification_offered="Wind Turbine Technician Certificate",
                delivery_mode="in_person",
                prerequisites=["High school diploma", "Physical fitness"],
                reviews_rating=4.6
            )
        ]
        return programs

    def create_career_profile(self, user_id: str, career_stage: str, **kwargs) -> CareerProfile:
        """Create a new career profile for a user"""
        try:
            stage = CareerStage(career_stage)
        except ValueError:
            stage = CareerStage.ENTRY_LEVEL
        
        profile = CareerProfile(
            user_id=user_id,
            career_stage=stage,
            current_industry=Industry(kwargs.get("current_industry")) if kwargs.get("current_industry") else None,
            target_industry=Industry(kwargs.get("target_industry")) if kwargs.get("target_industry") else None,
            current_role=kwargs.get("current_role", ""),
            years_experience=kwargs.get("years_experience", 0.0),
            education_level=kwargs.get("education_level", ""),
            interests=kwargs.get("interests", []),
            location=kwargs.get("location", ""),
            salary_expectation=kwargs.get("salary_expectation", 0.0),
            work_preference=kwargs.get("work_preference", "")
        )
        
        if "learning_style" in kwargs:
            try:
                profile.learning_style = LearningStyle(kwargs["learning_style"])
            except ValueError:
                pass
        
        self.career_profiles[user_id] = profile
        logger.info(f"Created career profile for user {user_id}")
        return profile
    
    def get_career_profile(self, user_id: str) -> Optional[CareerProfile]:
        """Get a user's career profile"""
        return self.career_profiles.get(user_id)
    
    def update_career_profile(self, user_id: str, **kwargs) -> Optional[CareerProfile]:
        """Update a user's career profile"""
        profile = self.career_profiles.get(user_id)
        if not profile:
            return None
        
        for key, value in kwargs.items():
            if hasattr(profile, key):
                if key == "career_stage":
                    try:
                        value = CareerStage(value)
                    except ValueError:
                        continue
                elif key == "current_industry" or key == "target_industry":
                    try:
                        value = Industry(value) if value else None
                    except ValueError:
                        continue
                elif key == "learning_style":
                    try:
                        value = LearningStyle(value)
                    except ValueError:
                        continue
                setattr(profile, key, value)
        
        profile.updated_at = datetime.now().isoformat()
        logger.info(f"Updated career profile for user {user_id}")
        return profile
    
    def assess_skills(self, user_id: str, skills_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Assess user's skills and provide recommendations"""
        profile = self.career_profiles.get(user_id)
        if not profile:
            return {"error": "Career profile not found. Please create a profile first."}
        
        assessed_skills = []
        skill_gaps = []
        strengths = []
        
        for skill_data in skills_assessment.get("skills", []):
            try:
                level = SkillLevel(skill_data.get("level", "beginner"))
            except ValueError:
                level = SkillLevel.BEGINNER
            
            skill = Skill(
                name=skill_data["name"],
                level=level,
                category=skill_data.get("category", "General"),
                description=skill_data.get("description", ""),
                years_experience=skill_data.get("years_experience", 0.0),
                certifications=skill_data.get("certifications", [])
            )
            assessed_skills.append(skill)
            
            if level in [SkillLevel.ADVANCED, SkillLevel.EXPERT]:
                strengths.append(skill.name)
            elif level in [SkillLevel.BEGINNER]:
                skill_gaps.append(skill.name)
        
        profile.skills = assessed_skills
        profile.updated_at = datetime.now().isoformat()
        
        return {
            "user_id": user_id,
            "assessed_skills_count": len(assessed_skills),
            "strengths": strengths,
            "skill_gaps": skill_gaps,
            "recommendations": self._generate_skill_recommendations(strengths, skill_gaps),
            "career_readiness_score": self._calculate_career_readiness(assessed_skills)
        }
    
    def _generate_skill_recommendations(self, strengths: List[str], skill_gaps: List[str]) -> List[str]:
        """Generate skill development recommendations"""
        recommendations = []
        
        if skill_gaps:
            recommendations.append(f"Focus on developing these foundational skills: {', '.join(skill_gaps[:5])}")
        
        if strengths:
            recommendations.append(f"Leverage your strengths in: {', '.join(strengths[:3])}")
        
        if len(strengths) > 3:
            recommendations.append("Consider mentoring others in your areas of expertise")
        
        if not skill_gaps:
            recommendations.append("Your skill set is well-developed. Consider specializing further or exploring leadership roles.")
        
        return recommendations
    
    def _calculate_career_readiness(self, skills: List[Skill]) -> float:
        """Calculate a career readiness score (0-100)"""
        if not skills:
            return 0.0
        
        level_scores = {
            SkillLevel.BEGINNER: 25,
            SkillLevel.INTERMEDIATE: 50,
            SkillLevel.ADVANCED: 75,
            SkillLevel.EXPERT: 100
        }
        
        total_score = sum(level_scores.get(s.level, 0) for s in skills)
        avg_score = total_score / len(skills)
        
        # Normalize to 0-100
        return round(min(100, max(0, avg_score)), 1)
    
    def recommend_career_paths(self, user_id: str, limit: int = 5) -> Dict[str, Any]:
        """Recommend career paths based on user's profile"""
        profile = self.career_profiles.get(user_id)
        if not profile:
            return {"error": "Career profile not found. Please create a profile first."}
        
        target_industry = profile.target_industry
        if not target_industry and profile.current_industry:
            target_industry = profile.current_industry
        
        # Get career paths for target industry
        industry_paths = self.career_paths_db.get(target_industry.value, []) if target_industry else []
        
        # If no target industry, get paths from all industries
        if not industry_paths:
            all_paths = []
            for paths in self.career_paths_db.values():
                all_paths.extend(paths)
            industry_paths = all_paths
        
        # Score each path based on user's skills and interests
        scored_paths = []
        user_skill_names = {s.name.lower() for s in profile.skills}
        
        for path in industry_paths:
            score = 0
            
            # Check skill matches
            path_skills = {s.name.lower() for s in path.required_skills}
            matching_skills = user_skill_names & path_skills
            score += len(matching_skills) * 10
            
            # Check interest matches
            for interest in profile.interests:
                if interest.lower() in path.title.lower() or interest.lower() in path.description.lower():
                    score += 5
            
            # Factor in salary expectation
            mid_salary = path.salary_range.get("mid", 0)
            if profile.salary_expectation > 0 and mid_salary >= profile.salary_expectation * 0.8:
                score += 10
            
            # Factor in experience level match
            if profile.career_stage == CareerStage.ENTRY_LEVEL and path.salary_range.get("entry", 0) < 60000:
                score += 5
            elif profile.career_stage == CareerStage.MID_CAREER and path.salary_range.get("mid", 0) > 60000:
                score += 5
            
            scored_paths.append((path, score))
        
        # Sort by score and return top recommendations
        scored_paths.sort(key=lambda x: x[1], reverse=True)
        
        recommendations = []
        for path, score in scored_paths[:limit]:
            path_dict = path.to_dict()
            path_dict["match_score"] = score
            recommendations.append(path_dict)
        
        return {
            "user_id": user_id,
            "based_on_industry": target_industry.value if target_industry else "all",
            "recommendations": recommendations,
            "total_options_considered": len(industry_paths)
        }
    
    def recommend_training_programs(self, user_id: str, limit: int = 5) -> Dict[str, Any]:
        """Recommend training programs based on user's profile and goals"""
        profile = self.career_profiles.get(user_id)
        if not profile:
            return {"error": "Career profile not found. Please create a profile first."}
        
        # Score each training program
        scored_programs = []
        
        for program in self.training_programs_db:
            score = 0
            
            # Check if program skills align with user's interests
            for skill in program.skills_covered:
                for interest in profile.interests:
                    if interest.lower() in skill.lower():
                        score += 5
            
            # Check if program fills skill gaps
            user_skills = {s.name.lower() for s in profile.skills}
            for program_skill in program.skills_covered:
                if program_skill.lower() not in user_skills:
                    score += 3  # Programs that teach new skills score higher
            
            # Factor in cost (lower cost = higher score for entry-level)
            if profile.career_stage in [CareerStage.STUDENT, CareerStage.ENTRY_LEVEL]:
                if program.cost_usd < 3000:
                    score += 10
                elif program.cost_usd < 10000:
                    score += 5
            
            # Factor in delivery mode preference
            if profile.work_preference == "remote" and program.delivery_mode in ["online", "hybrid"]:
                score += 5
            
            # High-rated programs get bonus
            if program.reviews_rating >= 4.5:
                score += 5
            
            scored_programs.append((program, score))
        
        # Sort by score
        scored_programs.sort(key=lambda x: x[1], reverse=True)
        
        recommendations = []
        for program, score in scored_programs[:limit]:
            program_dict = program.to_dict()
            program_dict["relevance_score"] = score
            recommendations.append(program_dict)
        
        return {
            "user_id": user_id,
            "recommended_programs": recommendations,
            "total_programs_available": len(self.training_programs_db),
            "learning_style": profile.learning_style.value
        }
    
    def create_career_roadmap(self, user_id: str, target_career: str) -> Dict[str, Any]:
        """Create a detailed career roadmap for a user"""
        profile = self.career_profiles.get(user_id)
        if not profile:
            return {"error": "Career profile not found. Please create a profile first."}
        
        # Find the career path
        target_path = None
        for paths in self.career_paths_db.values():
            for path in paths:
                if path.title.lower() == target_career.lower():
                    target_path = path
                    break
            if target_path:
                break
        
        if not target_path:
            return {
                "error": f"Career path '{target_career}' not found",
                "available_careers": self._list_all_careers()
            }
        
        # Analyze skill gaps
        user_skills = {s.name.lower(): s.level for s in profile.skills}
        skill_gaps = []
        skills_ready = []
        
        for req_skill in target_path.required_skills:
            user_level = user_skills.get(req_skill.name.lower())
            if not user_level:
                skill_gaps.append({
                    "skill": req_skill.name,
                    "required_level": req_skill.level.value,
                    "user_level": "none",
                    "action": f"Learn {req_skill.name} from scratch"
                })
            elif user_level.value != req_skill.level.value:
                # Simple level comparison (can be improved)
                level_order = ["beginner", "intermediate", "advanced", "expert"]
                if level_order.index(user_level.value) < level_order.index(req_skill.level.value):
                    skill_gaps.append({
                        "skill": req_skill.name,
                        "required_level": req_skill.level.value,
                        "user_level": user_level.value,
                        "action": f"Advance {req_skill.name} from {user_level.value} to {req_skill.level.value}"
                    })
                else:
                    skills_ready.append(req_skill.name)
            else:
                skills_ready.append(req_skill.name)
        
        # Create timeline
        timeline = []
        current_month = 0
        
        if skill_gaps:
            timeline.append({
                "phase": "Skill Development",
                "duration_months": target_path.training_duration_months,
                "activities": [gap["action"] for gap in skill_gaps[:5]],
                "start_month": current_month
            })
            current_month += target_path.training_duration_months
        
        timeline.append({
            "phase": "Entry Level Position",
            "duration_months": 12,
            "activities": [f"Apply for {target_path.title} entry positions", "Build portfolio", "Network with industry professionals"],
            "start_month": current_month
        })
        current_month += 12
        
        timeline.append({
            "phase": "Professional Development",
            "duration_months": 24,
            "activities": target_path.entry_requirements + ["Pursue certifications", "Take on challenging projects"],
            "start_month": current_month
        })
        current_month += 24
        
        timeline.append({
            "phase": "Career Advancement",
            "duration_months": 36,
            "activities": target_path.progression_steps[2:] if len(target_path.progression_steps) > 2 else ["Seek senior roles"],
            "start_month": current_month
        })
        
        return {
            "user_id": user_id,
            "target_career": target_career,
            "industry": target_path.industry.value,
            "skill_gaps": skill_gaps,
            "skills_ready": skills_ready,
            "estimated_timeline_months": current_month + 36,
            "timeline": timeline,
            "salary_potential": target_path.salary_range,
            "growth_outlook": target_path.growth_outlook,
            "next_steps": [
                "Review skill gaps and prioritize learning",
                "Explore recommended training programs",
                "Connect with professionals in the field",
                "Update resume to highlight transferable skills"
            ]
        }
    
    def _list_all_careers(self) -> List[str]:
        """List all available career paths"""
        careers = []
        for paths in self.career_paths_db.values():
            for path in paths:
                careers.append(f"{path.title} ({path.industry.value})")
        return careers
    
    def get_job_market_insights(self, industry: Optional[str] = None) -> Dict[str, Any]:
        """Get job market insights for an industry"""
        if industry:
            try:
                ind = Industry(industry)
                paths = self.career_paths_db.get(ind.value, [])
            except ValueError:
                return {"error": f"Industry '{industry}' not found", "available_industries": [i.value for i in Industry]}
        else:
            paths = []
            for p in self.career_paths_db.values():
                paths.extend(p)
        
        if not paths:
            return {"error": "No career paths found"}
        
        insights = {
            "industry": industry if industry else "all",
            "total_roles": len(paths),
            "average_entry_salary": sum(p.salary_range.get("entry", 0) for p in paths) / len(paths),
            "average_mid_salary": sum(p.salary_range.get("mid", 0) for p in paths) / len(paths),
            "average_senior_salary": sum(p.salary_range.get("senior", 0) for p in paths) / len(paths),
            "fastest_growing_roles": [],
            "highest_paying_roles": [],
            "most_accessible_roles": []
        }
        
        # Find fastest growing (simplified heuristic)
        for path in paths:
            if "20%" in path.growth_outlook or "30%" in path.growth_outlook or "40%" in path.growth_outlook:
                insights["fastest_growing_roles"].append({
                    "title": path.title,
                    "growth": path.growth_outlook,
                    "salary_range": path.salary_range
                })
        
        # Highest paying
        sorted_by_salary = sorted(paths, key=lambda p: p.salary_range.get("senior", 0), reverse=True)
        for path in sorted_by_salary[:5]:
            insights["highest_paying_roles"].append({
                "title": path.title,
                "senior_salary": path.salary_range.get("senior", 0),
                "industry": path.industry.value
            })
        
        # Most accessible (shortest training)
        sorted_by_training = sorted(paths, key=lambda p: p.training_duration_months)
        for path in sorted_by_training[:5]:
            insights["most_accessible_roles"].append({
                "title": path.title,
                "training_months": path.training_duration_months,
                "entry_salary": path.salary_range.get("entry", 0)
            })
        
        return insights
    
    def compare_careers(self, career1: str, career2: str) -> Dict[str, Any]:
        """Compare two career paths side by side"""
        path1 = None
        path2 = None
        
        for paths in self.career_paths_db.values():
            for path in paths:
                if path.title.lower() == career1.lower():
                    path1 = path
                if path.title.lower() == career2.lower():
                    path2 = path
        
        if not path1:
            return {"error": f"Career '{career1}' not found"}
        if not path2:
            return {"error": f"Career '{career2}' not found"}
        
        return {
            "career_1": {
                "title": path1.title,
                "industry": path1.industry.value,
                "salary_range": path1.salary_range,
                "growth_outlook": path1.growth_outlook,
                "training_duration_months": path1.training_duration_months,
                "required_skills": [s.name for s in path1.required_skills]
            },
            "career_2": {
                "title": path2.title,
                "industry": path2.industry.value,
                "salary_range": path2.salary_range,
                "growth_outlook": path2.growth_outlook,
                "training_duration_months": path2.training_duration_months,
                "required_skills": [s.name for s in path2.required_skills]
            },
            "comparison": {
                "salary_comparison": {
                    "career_1_higher_at_entry": path1.salary_range.get("entry", 0) > path2.salary_range.get("entry", 0),
                    "entry_difference": abs(path1.salary_range.get("entry", 0) - path2.salary_range.get("entry", 0))
                },
                "training_time_difference": abs(path1.training_duration_months - path2.training_duration_months),
                "shared_skills": list(
                    {s.name for s in path1.required_skills} & {s.name for s in path2.required_skills}
                )
            }
        }
    
    def generate_resume_tips(self, user_id: str) -> Dict[str, Any]:
        """Generate personalized resume tips based on career profile"""
        profile = self.career_profiles.get(user_id)
        if not profile:
            return {"error": "Career profile not found"}
        
        tips = []
        
        # Skill highlighting tips
        if profile.skills:
            top_skills = [s.name for s in profile.skills if s.level in [SkillLevel.ADVANCED, SkillLevel.EXPERT]]
            if top_skills:
                tips.append(f"Highlight these key skills prominently: {', '.join(top_skills[:5])}")
        
        # Career stage specific tips
        if profile.career_stage == CareerStage.STUDENT:
            tips.append("Include relevant coursework, projects, and internships")
            tips.append("Highlight academic achievements and extracurricular activities")
        elif profile.career_stage == CareerStage.ENTRY_LEVEL:
            tips.append("Emphasize transferable skills from previous experiences")
            tips.append("Include any volunteer work or side projects")
        elif profile.career_stage == CareerStage.CAREER_CHANGE:
            tips.append("Use a functional or hybrid resume format to highlight transferable skills")
            tips.append("Include a strong objective statement explaining your career transition")
        
        # Industry-specific tips
        if profile.target_industry == Industry.TECHNOLOGY:
            tips.append("Include links to GitHub, portfolio, or relevant projects")
            tips.append("List specific technologies and tools you're proficient with")
        elif profile.target_industry == Industry.HEALTHCARE:
            tips.append("List all relevant certifications and licenses")
            tips.append("Include clinical experience hours or patient care metrics")
        
        # General tips
        tips.extend([
            "Quantify achievements with numbers when possible (e.g., 'increased efficiency by 20%')",
            "Tailor your resume for each job application",
            "Keep resume to 1-2 pages maximum",
            "Use action verbs to describe accomplishments",
            "Include keywords from the job description"
        ])
        
        return {
            "user_id": user_id,
            "career_stage": profile.career_stage.value,
            "target_industry": profile.target_industry.value if profile.target_industry else None,
            "personalized_tips": tips,
            "sections_to_include": self._get_resume_sections(profile),
            "common_mistakes_to_avoid": [
                "Spelling and grammar errors",
                "Using generic objective statements",
                "Including irrelevant personal information",
                "Using unprofessional email addresses",
                "Listing duties instead of achievements"
            ]
        }
    
    def _get_resume_sections(self, profile: CareerProfile) -> List[str]:
        """Determine which resume sections to include based on profile"""
        sections = ["Contact Information", "Professional Summary", "Skills"]
        
        if profile.career_stage in [CareerStage.MID_CAREER, CareerStage.SENIOR]:
            sections.extend(["Professional Experience", "Key Achievements"])
        else:
            sections.extend(["Experience", "Education"])
        
        if profile.skills and any(s.certifications for s in profile.skills):
            sections.append("Certifications")
        
        if profile.career_stage == CareerStage.STUDENT:
            sections.extend(["Education", "Projects", "Relevant Coursework"])
        
        sections.append("Education")
        
        return sections
    
    def get_interview_prep(self, career: str) -> Dict[str, Any]:
        """Get interview preparation resources for a specific career"""
        path = None
        for paths in self.career_paths_db.values():
            for p in paths:
                if p.title.lower() == career.lower():
                    path = p
                    break
            if path:
                break
        
        if not path:
            return {"error": f"Career '{career}' not found"}
        
        common_questions = [
            "Tell me about yourself",
            "Why are you interested in this role?",
            "What are your strengths and weaknesses?",
            "Where do you see yourself in 5 years?",
            "Why should we hire you?"
        ]
        
        # Role-specific questions
        role_questions = {
            "software developer": [
                "Explain a challenging bug you fixed",
                "Describe your experience with agile methodologies",
                "How do you stay updated with new technologies?"
            ],
            "data scientist": [
                "Walk me through a data science project you completed",
                "How do you handle missing data?",
                "Explain a machine learning algorithm you used recently"
            ],
            "nurse": [
                "How do you handle stressful situations?",
                "Describe a time you advocated for a patient",
                "How do you prioritize patient care?"
            ],
            "financial analyst": [
                "How do you evaluate investment opportunities?",
                "Explain a financial model you've built",
                "How do you stay current with market trends?"
            ]
        }
        
        specific_questions = []
        for key, questions in role_questions.items():
            if key in career.lower():
                specific_questions = questions
                break
        
        return {
            "career": career,
            "common_questions": common_questions,
            "role_specific_questions": specific_questions,
            "key_skills_to_highlight": [s.name for s in path.required_skills],
            "recommended_preparation": [
                "Research the company thoroughly",
                "Practice the STAR method for behavioral questions",
                "Prepare examples that demonstrate required skills",
                "Prepare thoughtful questions to ask the interviewer",
                "Dress professionally and arrive early"
            ],
            "technical_preparation": [
                "Review fundamental concepts in your field",
                "Practice common technical problems",
                "Prepare to discuss your past projects in detail"
            ] if path.industry == Industry.TECHNOLOGY else []
        }
    
    def get_learning_resources(self, topic: str, skill_level: str = "beginner") -> Dict[str, Any]:
        """Get curated learning resources for a specific topic"""
        resources_db = {
            "python": [
                {"title": "Python for Everybody", "provider": "Coursera/University of Michigan", "type": "course", "cost": "free", "level": "beginner"},
                {"title": "Automate the Boring Stuff", "provider": "Udemy", "type": "course", "cost": "$20", "level": "beginner"},
                {"title": "Real Python", "provider": "realpython.com", "type": "tutorial", "cost": "free/premium", "level": "intermediate"},
                {"title": "Python Cookbook", "provider": "O'Reilly", "type": "book", "cost": "$50", "level": "advanced"}
            ],
            "javascript": [
                {"title": "JavaScript: The Good Parts", "provider": "O'Reilly", "type": "book", "cost": "$30", "level": "beginner"},
                {"title": "freeCodeCamp JavaScript", "provider": "freeCodeCamp", "type": "course", "cost": "free", "level": "beginner"},
                {"title": "JavaScript.info", "provider": "javascript.info", "type": "tutorial", "cost": "free", "level": "intermediate"},
                {"title": "You Don't Know JS", "provider": "Getify", "type": "book", "cost": "free", "level": "advanced"}
            ],
            "data science": [
                {"title": "Data Science Specialization", "provider": "Coursera/JHU", "type": "course", "cost": "$50/month", "level": "beginner"},
                {"title": "Kaggle Learn", "provider": "Kaggle", "type": "tutorial", "cost": "free", "level": "beginner"},
                {"title": "Introduction to Statistical Learning", "provider": "Stanford", "type": "book", "cost": "free", "level": "intermediate"},
                {"title": "Pattern Recognition and Machine Learning", "provider": "Springer", "type": "book", "cost": "$80", "level": "advanced"}
            ],
            "web development": [
                {"title": "The Odin Project", "provider": "theodinproject.com", "type": "course", "cost": "free", "level": "beginner"},
                {"title": "Full Stack Open", "provider": "University of Helsinki", "type": "course", "cost": "free", "level": "intermediate"},
                {"title": "MDN Web Docs", "provider": "Mozilla", "type": "reference", "cost": "free", "level": "all"}
            ],
            "cybersecurity": [
                {"title": "Cybrary", "provider": "cybrary.it", "type": "course", "cost": "free/premium", "level": "beginner"},
                {"title": "Security+", "provider": "CompTIA", "type": "certification", "cost": "$370", "level": "beginner"},
                {"title": "Penetration Testing with Kali Linux", "provider": "Offensive Security", "type": "course", "cost": "$1600", "level": "advanced"}
            ],
            "cloud computing": [
                {"title": "AWS Cloud Practitioner", "provider": "AWS", "type": "certification", "cost": "$100", "level": "beginner"},
                {"title": "A Cloud Guru", "provider": "acloudguru.com", "type": "course", "cost": "$35/month", "level": "intermediate"},
                {"title": "CloudAcademy", "provider": "cloudacademy.com", "type": "course", "cost": "$40/month", "level": "all"}
            ],
            "machine learning": [
                {"title": "Machine Learning by Andrew Ng", "provider": "Coursera/Stanford", "type": "course", "cost": "free", "level": "beginner"},
                {"title": "Fast.ai", "provider": "fast.ai", "type": "course", "cost": "free", "level": "intermediate"},
                {"title": "Deep Learning Specialization", "provider": "Coursera/deeplearning.ai", "type": "course", "cost": "$50/month", "level": "intermediate"}
            ],
            "project management": [
                {"title": "Project Management Basics", "provider": "PMI", "type": "course", "cost": "free", "level": "beginner"},
                {"title": "PMP Certification Prep", "provider": "Udemy", "type": "course", "cost": "$20", "level": "advanced"},
                {"title": "Agile Project Management", "provider": "Atlassian", "type": "tutorial", "cost": "free", "level": "intermediate"}
            ]
        }
        
        topic_lower = topic.lower()
        resources = resources_db.get(topic_lower, [])
        
        if not resources:
            # Return generic resources
            resources = [
                {"title": f"Introduction to {topic}", "provider": "Coursera", "type": "course", "cost": "varies", "level": "beginner"},
                {"title": f"{topic} Documentation", "provider": "Official Docs", "type": "reference", "cost": "free", "level": "all"},
                {"title": f"{topic} Tutorials", "provider": "YouTube", "type": "video", "cost": "free", "level": "beginner"}
            ]
        
        # Filter by level
        filtered = [r for r in resources if r["level"] in [skill_level, "all", "intermediate"] or skill_level == "all"]
        
        return {
            "topic": topic,
            "skill_level": skill_level,
            "resources": filtered if filtered else resources,
            "learning_path_suggestion": [
                f"Start with beginner {topic} fundamentals",
                f"Practice with hands-on {topic} projects",
                f"Join {topic} communities and forums",
                f"Build a portfolio of {topic} work",
                f"Pursue {topic} certifications"
            ]
        }
    
    def get_salary_benchmarks(self, role: str, location: str = "") -> Dict[str, Any]:
        """Get salary benchmarks for a specific role"""
        path = None
        for paths in self.career_paths_db.values():
            for p in paths:
                if p.title.lower() == role.lower():
                    path = p
                    break
            if path:
                break
        
        if not path:
            return {
                "error": f"Role '{role}' not found",
                "suggestion": "Try searching for similar role titles"
            }
        
        # Location adjustment (simplified)
        location_multiplier = 1.0
        if location:
            high_cost_areas = ["san francisco", "new york", "seattle", "boston", "los angeles"]
            low_cost_areas = ["rural", "small town", "midwest"]
            
            loc_lower = location.lower()
            if any(area in loc_lower for area in high_cost_areas):
                location_multiplier = 1.3
            elif any(area in loc_lower for area in low_cost_areas):
                location_multiplier = 0.85
        
        adjusted_range = {
            "entry": round(path.salary_range.get("entry", 0) * location_multiplier),
            "mid": round(path.salary_range.get("mid", 0) * location_multiplier),
            "senior": round(path.salary_range.get("senior", 0) * location_multiplier)
        }
        
        return {
            "role": role,
            "location": location if location else "national average",
            "salary_benchmarks": adjusted_range,
            "location_adjustment": f"{location_multiplier:.2f}x" if location else "none",
            "industry": path.industry.value,
            "growth_outlook": path.growth_outlook,
            "factors_affecting_salary": [
                "Years of experience",
                "Education level and certifications",
                "Company size and industry",
                "Location cost of living",
                "Specialized skills and expertise",
                "Performance and track record"
            ],
            "negotiation_tips": [
                "Research market rates before negotiating",
                "Highlight unique skills and achievements",
                "Consider total compensation (benefits, bonuses, equity)",
                "Practice your negotiation pitch",
                "Be prepared with specific salary ranges",
                "Consider non-salary benefits (remote work, flexible hours)"
            ]
        }
    
    def get_all_industries(self) -> List[str]:
        """Get list of all available industries"""
        return [ind.value for ind in Industry]
    
    def get_careers_by_industry(self, industry: str) -> Dict[str, Any]:
        """Get all career paths for a specific industry"""
        try:
            ind = Industry(industry)
        except ValueError:
            return {"error": f"Industry '{industry}' not found", "available": [i.value for i in Industry]}
        
        paths = self.career_paths_db.get(ind.value, [])
        
        return {
            "industry": industry,
            "total_careers": len(paths),
            "careers": [{"title": p.title, "description": p.description, "entry_salary": p.salary_range.get("entry", 0)} for p in paths]
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the vocational companion state"""
        return {
            "career_profiles": {uid: profile.to_dict() for uid, profile in self.career_profiles.items()},
            "total_career_paths": sum(len(paths) for paths in self.career_paths_db.values()),
            "total_training_programs": len(self.training_programs_db),
            "industries_covered": self.get_all_industries()
        }
