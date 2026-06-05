from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_doctor
from app.models.models import Doctor, Patient, Scan
from app.services.inference import severity_label
from app.services.trends import compute_trend_for_patient, latest_severity

router = APIRouter()


@router.get("/overview")
def dashboard_overview(
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
):
    patients = db.query(Patient).filter(Patient.doctor_id == doctor.id).all()
    total = len(patients)
    active = sum(1 for p in patients if p.treatment_status == "active")
    completed = sum(1 for p in patients if p.treatment_status == "completed")
    improving = 0
    worsening = 0
    for p in patients:
        t = compute_trend_for_patient(db, p.id)
        if t == "improving":
            improving += 1
        elif t == "worsening":
            worsening += 1
    return {
        "total_patients": total,
        "active": active,
        "completed": completed,
        "improving": improving,
        "worsening": worsening,
    }


@router.get("/patient/{patient_id}/trend")
def patient_trend(
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
    scans = (
        db.query(Scan)
        .filter(Scan.patient_id == patient_id, Scan.inference_status == "done")
        .order_by(Scan.day_number.asc())
        .all()
    )
    chart_data = []
    for s in scans:
        cap = s.captured_at
        date_str = cap.date().isoformat() if cap else ""
        chart_data.append(
            {
                "day": s.day_number,
                "acne_count": s.acne_count,
                "severity_score": round(s.severity_score, 2),
                "severity_label": severity_label(s.severity_score),
                "date": date_str,
            }
        )
    return {
        "patient_id": p.id,
        "patient_name": p.name,
        "tracking_days": p.tracking_days,
        "days_completed": p.days_completed or 0,
        "face_region": p.face_region,
        "chart_data": chart_data,
    }


@router.get("/all-trends")
def all_trends(
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor),
):
    patients = (
        db.query(Patient)
        .filter(Patient.doctor_id == doctor.id)
        .order_by(Patient.id.desc())
        .all()
    )
    rows = []
    for p in patients:
        sev = latest_severity(db, p.id)
        trend = compute_trend_for_patient(db, p.id)
        td = p.tracking_days or 30
        dc = p.days_completed or 0
        progress_pct = round((dc / td) * 100, 1) if td else 0.0
        rows.append(
            {
                "id": p.id,
                "name": p.name,
                "phone": p.phone,
                "face_region": p.face_region,
                "tracking_days": td,
                "days_completed": dc,
                "treatment_status": p.treatment_status,
                "progress_pct": progress_pct,
                "latest_severity": sev,
                "trend": trend,
            }
        )
    return rows
