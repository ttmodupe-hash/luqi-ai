"""Government Services API for LUQI AI - v29.1.0"""
import os
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/gov", tags=["Government Services"])


# ─── Data Models ─────────────────────────────────────────────────────────────

class ServiceRequest(BaseModel):
    service_type: str  # 'permit', 'license', 'certificate', 'tax', 'social_services'
    applicant_name: str
    applicant_id: str
    contact_email: str
    contact_phone: Optional[str] = None
    documents: List[str] = []  # URLs to uploaded documents
    metadata: Dict[str, Any] = {}


class ServiceRequestResponse(BaseModel):
    id: str
    service_type: str
    applicant_name: str
    applicant_id: str
    status: str  # 'submitted', 'under_review', 'approved', 'rejected', 'completed'
    submitted_at: str
    updated_at: str
    documents: List[str]
    metadata: Dict[str, Any]
    notes: List[Dict[str, str]] = []


class AppointmentSlot(BaseModel):
    id: str
    service_type: str
    date: str
    time: str
    location: str
    available: bool


class AppointmentRequest(BaseModel):
    slot_id: str
    applicant_name: str
    applicant_id: str
    contact_email: str
    notes: Optional[str] = None


# ─── In-Memory Store ─────────────────────────────────────────────────────────

_service_requests: Dict[str, ServiceRequestResponse] = {}
_appointment_slots: Dict[str, AppointmentSlot] = {}
_appointments: Dict[str, Any] = {}

# Seed some appointment slots
from datetime import timedelta
_base_date = datetime(2024, 1, 15)
for i in range(30):
    slot_id = f"slot_{i:03d}"
    day = _base_date + timedelta(days=i // 3)
    hour = 9 + (i % 8)
    _appointment_slots[slot_id] = AppointmentSlot(
        id=slot_id,
        service_type=["permit", "license", "certificate", "tax"][i % 4],
        date=day.strftime("%Y-%m-%d"),
        time=f"{hour:02d}:00",
        location=f"City Hall - Room {(i % 5) + 100}",
        available=True,
    )


# ─── Service Request Endpoints ───────────────────────────────────────────────

@router.post("/requests", response_model=ServiceRequestResponse)
async def submit_request(request: ServiceRequest):
    """Submit a new government service request."""
    req_id = f"gov_req_{len(_service_requests) + 1:06d}"
    now = datetime.utcnow().isoformat()
    response = ServiceRequestResponse(
        id=req_id,
        service_type=request.service_type,
        applicant_name=request.applicant_name,
        applicant_id=request.applicant_id,
        status="submitted",
        submitted_at=now,
        updated_at=now,
        documents=request.documents,
        metadata=request.metadata,
        notes=[],
    )
    _service_requests[req_id] = response
    return response


@router.get("/requests", response_model=List[ServiceRequestResponse])
async def list_requests(
    service_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    applicant_id: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    """List service requests with filtering."""
    items = list(_service_requests.values())
    if service_type:
        items = [i for i in items if i.service_type == service_type]
    if status:
        items = [i for i in items if i.status == status]
    if applicant_id:
        items = [i for i in items if i.applicant_id == applicant_id]
    items.sort(key=lambda x: x.submitted_at, reverse=True)
    return items[skip : skip + limit]


@router.get("/requests/{req_id}", response_model=ServiceRequestResponse)
async def get_request(req_id: str):
    """Get a specific service request."""
    if req_id not in _service_requests:
        raise HTTPException(status_code=404, detail="Request not found")
    return _service_requests[req_id]


@router.put("/requests/{req_id}/status")
async def update_request_status(req_id: str, status: str, note: str = None):
    """Update service request status (staff only)."""
    if req_id not in _service_requests:
        raise HTTPException(status_code=404, detail="Request not found")
    if status not in ("submitted", "under_review", "approved", "rejected", "completed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    req = _service_requests[req_id]
    req.status = status
    req.updated_at = datetime.utcnow().isoformat()
    if note:
        req.notes.append({"timestamp": req.updated_at, "note": note})
    return {"success": True, "status": status}


# ─── Appointment Endpoints ─────────────────────────────────────────────────────

@router.get("/appointments/slots", response_model=List[AppointmentSlot])
async def list_slots(
    service_type: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    available_only: bool = True,
):
    """List available appointment slots."""
    slots = list(_appointment_slots.values())
    if service_type:
        slots = [s for s in slots if s.service_type == service_type]
    if date:
        slots = [s for s in slots if s.date == date]
    if available_only:
        slots = [s for s in slots if s.available]
    return slots


@router.post("/appointments/book")
async def book_appointment(request: AppointmentRequest):
    """Book an appointment slot."""
    if request.slot_id not in _appointment_slots:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot = _appointment_slots[request.slot_id]
    if not slot.available:
        raise HTTPException(status_code=400, detail="Slot already booked")
    
    appointment_id = f"appt_{len(_appointments) + 1:06d}"
    _appointments[appointment_id] = {
        "id": appointment_id,
        "slot": slot,
        "applicant_name": request.applicant_name,
        "applicant_id": request.applicant_id,
        "contact_email": request.contact_email,
        "notes": request.notes,
        "booked_at": datetime.utcnow().isoformat(),
    }
    slot.available = False
    return {"success": True, "appointment_id": appointment_id}


@router.get("/appointments")
async def list_appointments(applicant_id: Optional[str] = Query(None)):
    """List appointments."""
    items = list(_appointments.values())
    if applicant_id:
        items = [i for i in items if i["applicant_id"] == applicant_id]
    return items


@router.delete("/appointments/{appt_id}")
async def cancel_appointment(appt_id: str):
    """Cancel an appointment."""
    if appt_id not in _appointments:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt = _appointments[appt_id]
    slot_id = appt["slot"].id
    if slot_id in _appointment_slots:
        _appointment_slots[slot_id].available = True
    del _appointments[appt_id]
    return {"success": True}


# ─── Analytics Endpoints ─────────────────────────────────────────────────────

@router.get("/stats")
async def gov_stats():
    """Get government services statistics."""
    requests = list(_service_requests.values())
    status_counts = {}
    type_counts = {}
    for r in requests:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1
        type_counts[r.service_type] = type_counts.get(r.service_type, 0) + 1
    return {
        "total_requests": len(requests),
        "status_breakdown": status_counts,
        "type_breakdown": type_counts,
        "total_appointments": len(_appointments),
        "available_slots": sum(1 for s in _appointment_slots.values() if s.available),
    }


@router.get("/services/catalog")
async def service_catalog():
    """Get the catalog of available government services."""
    return [
        {
            "id": "permit",
            "name": "Building Permit",
            "description": "Apply for residential and commercial building permits",
            "required_documents": ["property_deed", "construction_plans", "insurance"],
            "estimated_days": 14,
        },
        {
            "id": "license",
            "name": "Business License",
            "description": "Register and license your business",
            "required_documents": ["business_plan", "tax_id", "address_proof"],
            "estimated_days": 7,
        },
        {
            "id": "certificate",
            "name": "Birth Certificate",
            "description": "Request birth certificates and vital records",
            "required_documents": ["id_proof", "hospital_records"],
            "estimated_days": 3,
        },
        {
            "id": "tax",
            "name": "Tax Filing",
            "description": "File and pay local taxes",
            "required_documents": ["income_statement", "deductions"],
            "estimated_days": 1,
        },
    ]
