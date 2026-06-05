from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_doctor, get_current_patient
from app.models.models import Doctor, Patient
from app.services.inference import severity_label
from app.services.trends import compute_trend_for_patient, latest_severity

router = APIRouter()


def _patient_to_response(db: Session, p: Patient) -> dict:
    trend = compute_trend_for_patient(db, p.id)
    sev = latest_severity(db, p.id)
    td = p.tracking_days or 30
    dc = p.days_completed or 0
    progress_pct = round((dc / td) * 100, 1) if td else 0.0
    return {
        "id": p.id,
        "name": p.name,
        "phone": p.phone,
        "case_notes": p.case_notes,
        "face_region": p.face_region,
        "tracking_days": td,
        "days_completed": dc,
        "treatment_status": p.treatment_status,
        "notification_time": p.notification_time,
        "progress_pct": progress_pct,
        "latest_severity": sev,
        "trend": trend,
    }


class OnboardPatient(BaseModel):
    name: str = Field(..., max_length=200)
    phone: str = Field(..., max_length=20)
    case_notes: str | None = None
    face_region: str = Field(default="full_face", max_length=100)
    tracking_days: int = Field(default=30, ge=1, le=365)
    notification_time: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")


class PatchPatient(BaseModel):
    case_notes: str | None = None
    face_region: str | None = Field(None, max_length=100)
    tracking_days: int | None = Field(None, ge=1, le=365)
    treatment_status: Literal["active", "completed", "paused"] | None = None


@router.post("/")
def onboard_patient(
    body: OnboardPatient,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
):
    existing = db.query(Patient).filter(Patient.phone == body.phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered",
        )
    p = Patient(
        doctor_id=doctor.id,
        name=body.name,
        phone=body.phone,
        case_notes=body.case_notes,
        face_region=body.face_region,
        tracking_days=body.tracking_days,
        notification_time=body.notification_time,
        treatment_status="active",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _patient_to_response(db, p)


@router.get("/")
def list_patients(
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    q = db.query(Patient).filter(Patient.doctor_id == doctor.id)
    if status_filter:
        q = q.filter(Patient.treatment_status == status_filter)
    patients = q.order_by(Patient.id.desc()).all()
    return [_patient_to_response(db, p) for p in patients]


@router.get("/me")
def patient_me(
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
):
    return _patient_to_response(db, patient)


@router.get("/{patient_id}")
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
):
    p = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.doctor_id == doctor.id)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _patient_to_response(db, p)


@router.patch("/{patient_id}")
def patch_patient(
    patient_id: int,
    body: PatchPatient,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
):
    p = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.doctor_id == doctor.id)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    data = body.model_dump(exclude_unset=True)
    if "treatment_status" in data and data["treatment_status"] is not None:
        p.treatment_status = data.pop("treatment_status")
    for k, v in data.items():
        if v is not None and hasattr(p, k):
            setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return _patient_to_response(db, p)
