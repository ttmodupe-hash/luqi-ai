"""Jobs and Skills API for LUQI AI - v29.1.0"""
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/jobs", tags=["Jobs & Skills"])


# ─── Data Models ─────────────────────────────────────────────────────────────

class JobListing(BaseModel):
    id: str
    title: str
    company: str
    location: str
    remote: bool
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: str = "USD"
    description: str
    requirements: List[str]
    skills: List[str]
    posted_at: str
    expires_at: Optional[str] = None
    status: str  # 'active', 'paused', 'filled', 'expired'
    applications_count: int = 0


class JobApplication(BaseModel):
    id: str
    job_id: str
    applicant_name: str
    applicant_email: str
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None
    skills: List[str] = []
    status: str  # 'submitted', 'reviewing', 'interview', 'offered', 'rejected'
    applied_at: str


class SkillProfile(BaseModel):
    id: str
    name: str
    category: str
    proficiency: int  # 1-10
    endorsements: int = 0
    verified: bool = False


class CourseRecommendation(BaseModel):
    id: str
    title: str
    provider: str
    skill_tags: List[str]
    duration_hours: int
    difficulty: str  # 'beginner', 'intermediate', 'advanced'
    rating: float
    url: str


# ─── In-Memory Store ─────────────────────────────────────────────────────────

_job_listings: Dict[str, JobListing] = {}
_job_applications: Dict[str, JobApplication] = {}
_skill_profiles: Dict[str, SkillProfile] = {}

# Seed sample data
_sample_jobs = [
    {
        "id": "job_001",
        "title": "Senior AI Engineer",
        "company": "LUQI AI",
        "location": "San Francisco, CA",
        "remote": True,
        "salary_min": 180000,
        "salary_max": 250000,
        "description": "Lead AI model development and deployment",
        "requirements": ["5+ years ML experience", "Python", "PyTorch"],
        "skills": ["Python", "PyTorch", "Machine Learning", "NLP"],
        "posted_at": datetime.utcnow().isoformat(),
        "status": "active",
    },
    {
        "id": "job_002",
        "title": "Full Stack Developer",
        "company": "TechCorp",
        "location": "New York, NY",
        "remote": False,
        "salary_min": 120000,
        "salary_max": 160000,
        "description": "Build and maintain web applications",
        "requirements": ["3+ years experience", "React", "Node.js"],
        "skills": ["React", "Node.js", "TypeScript", "PostgreSQL"],
        "posted_at": datetime.utcnow().isoformat(),
        "status": "active",
    },
]

for job_data in _sample_jobs:
    _job_listings[job_data["id"]] = JobListing(**job_data)


# ─── Job Listing Endpoints ───────────────────────────────────────────────────

@router.get("/listings", response_model=List[JobListing])
async def list_jobs(
    q: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    remote: Optional[bool] = Query(None),
    skills: Optional[str] = Query(None),  # comma-separated
    min_salary: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    """List job listings with filtering."""
    jobs = list(_job_listings.values())
    if q:
        q_lower = q.lower()
        jobs = [j for j in jobs if q_lower in j.title.lower() or q_lower in j.description.lower()]
    if location:
        jobs = [j for j in jobs if location.lower() in j.location.lower()]
    if remote is not None:
        jobs = [j for j in jobs if j.remote == remote]
    if skills:
        skill_list = [s.strip().lower() for s in skills.split(",")]
        jobs = [j for j in jobs if any(s.lower() in [x.lower() for x in j.skills] for s in skill_list)]
    if min_salary:
        jobs = [j for j in jobs if j.salary_min and j.salary_min >= min_salary]
    jobs.sort(key=lambda x: x.posted_at, reverse=True)
    return jobs[skip : skip + limit]


@router.get("/listings/{job_id}", response_model=JobListing)
async def get_job(job_id: str):
    """Get a specific job listing."""
    if job_id not in _job_listings:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_listings[job_id]


@router.post("/listings")
async def create_job(listing: JobListing):
    """Create a new job listing."""
    _job_listings[listing.id] = listing
    return listing


@router.put("/listings/{job_id}")
async def update_job(job_id: str, listing: JobListing):
    """Update a job listing."""
    if job_id not in _job_listings:
        raise HTTPException(status_code=404, detail="Job not found")
    _job_listings[job_id] = listing
    return listing


@router.delete("/listings/{job_id}")
async def delete_job(job_id: str):
    """Delete a job listing."""
    if job_id not in _job_listings:
        raise HTTPException(status_code=404, detail="Job not found")
    del _job_listings[job_id]
    return {"success": True}


# ─── Application Endpoints ───────────────────────────────────────────────────

@router.post("/applications")
async def submit_application(application: JobApplication):
    """Submit a job application."""
    if application.job_id not in _job_listings:
        raise HTTPException(status_code=404, detail="Job not found")
    _job_applications[application.id] = application
    _job_listings[application.job_id].applications_count += 1
    return application


@router.get("/applications")
async def list_applications(job_id: str = None, applicant_email: str = None):
    """List job applications."""
    apps = list(_job_applications.values())
    if job_id:
        apps = [a for a in apps if a.job_id == job_id]
    if applicant_email:
        apps = [a for a in apps if a.applicant_email == applicant_email]
    return apps


@router.put("/applications/{app_id}/status")
async def update_application_status(app_id: str, status: str):
    """Update application status."""
    if app_id not in _job_applications:
        raise HTTPException(status_code=404, detail="Application not found")
    if status not in ("submitted", "reviewing", "interview", "offered", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")
    _job_applications[app_id].status = status
    return {"success": True}


# ─── Skills Endpoints ────────────────────────────────────────────────────────

@router.get("/skills")
async def list_skills(category: str = None):
    """List skills with optional category filter."""
    skills = list(_skill_profiles.values())
    if category:
        skills = [s for s in skills if s.category == category]
    return skills


@router.post("/skills")
async def add_skill(skill: SkillProfile):
    """Add a skill profile."""
    _skill_profiles[skill.id] = skill
    return skill


@router.get("/recommendations")
async def get_course_recommendations(skill_gap: str = Query(...)):
    """Get course recommendations based on skill gaps."""
    return [
        CourseRecommendation(
            id="course_001",
            title=f"Master {skill_gap}",
            provider="LUQI Academy",
            skill_tags=[skill_gap],
            duration_hours=40,
            difficulty="intermediate",
            rating=4.8,
            url=f"https://academy.luqi.ai/courses/{skill_gap.lower().replace(' ', '-')}",
        ),
        CourseRecommendation(
            id="course_002",
            title=f"Advanced {skill_gap}",
            provider="TechLearn",
            skill_tags=[skill_gap],
            duration_hours=60,
            difficulty="advanced",
            rating=4.6,
            url=f"https://techlearn.io/{skill_gap.lower().replace(' ', '-')}",
        ),
    ]


@router.get("/stats")
async def jobs_stats():
    """Get jobs and skills statistics."""
    jobs = list(_job_listings.values())
    active_jobs = [j for j in jobs if j.status == "active"]
    return {
        "total_listings": len(jobs),
        "active_listings": len(active_jobs),
        "total_applications": len(_job_applications),
        "total_skills": len(_skill_profiles),
        "top_skills": ["Python", "Machine Learning", "React", "Cloud Computing"],
    }
