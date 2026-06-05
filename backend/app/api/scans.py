import re
import uuid
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_doctor, get_current_patient, get_token_payload
from app.models.models import Doctor, Patient, Scan
from app.services.inference import run_inference, severity_label

router = APIRouter()

_DEV_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _parse_dev_capture_date(raw: Optional[str]) -> Optional[date]:
    """When dev_mode is on, optional YYYY-MM-DD from the client for testing day boundaries."""
    if not raw or not settings.dev_mode:
        return None
    if not _DEV_DATE_RE.match(raw.strip()):
        return None
    try:
        return date.fromisoformat(raw.strip())
    except ValueError:
        return None


def _predictions_payload(scan: Scan) -> list[dict[str, Any]]:
    pj = scan.predictions_json
    if not pj:
        return []
    if isinstance(pj, dict):
        preds = pj.get("predictions")
        return preds if isinstance(preds, list) else []
    return []


def _scan_dict(scan: Scan, db: Session) -> dict:
    label = severity_label(scan.severity_score)
    preds = _predictions_payload(scan)
    return {
        "id": scan.id,
        "patient_id": scan.patient_id,
        "image_path": scan.image_path,
        "annotated_image_path": None,
        "predictions": preds,
        "acne_count": scan.acne_count,
        "avg_confidence": scan.avg_confidence,
        "severity_score": scan.severity_score,
        "severity_label": label,
        "day_number": scan.day_number,
        "inference_status": scan.inference_status,
        "inference_error": scan.inference_error,
        "captured_at": scan.captured_at.isoformat() if scan.captured_at else None,
        "notes": scan.notes,
    }


def _public_image_url(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    upload_dir = Path(settings.upload_dir).resolve()
    try:
        rel = Path(path).resolve().relative_to(upload_dir)
    except ValueError:
        rel = Path(path).name
    return f"/uploads/{rel.as_posix()}"


def _scan_with_urls(scan: Scan, db: Session) -> dict:
    d = _scan_dict(scan, db)
    d["image_url"] = _public_image_url(scan.image_path)
    d["annotated_image_url"] = None
    return d


@router.post("/upload")
async def upload_scan(
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    dev_capture_date: Optional[str] = Form(None),
):
    if not file.content_type or file.content_type not in (
        "image/jpeg",
        "image/png",
        "image/jpg",
    ):
        raise HTTPException(
            status_code=400,
            detail="Only image/jpeg and image/png are allowed",
        )

    dev_day = _parse_dev_capture_date(dev_capture_date)
    if dev_day is not None:
        day_start = datetime.combine(dev_day, time.min, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        existing = (
            db.query(Scan)
            .filter(
                and_(
                    Scan.patient_id == patient.id,
                    Scan.captured_at >= day_start,
                    Scan.captured_at < day_end,
                )
            )
            .first()
        )
    else:
        existing = (
            db.query(Scan)
            .filter(
                and_(
                    Scan.patient_id == patient.id,
                    func.date(Scan.captured_at) == func.current_date(),
                )
            )
            .first()
        )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scan already submitted for today",
        )

    max_day = (
        db.query(func.coalesce(func.max(Scan.day_number), 0))
        .filter(Scan.patient_id == patient.id)
        .scalar()
    )
    next_day = int(max_day or 0) + 1

    ext = ".jpg"
    if file.filename and file.filename.lower().endswith(".png"):
        ext = ".png"
    fname = f"{uuid.uuid4().hex}{ext}"
    patient_dir = Path(settings.upload_dir) / f"patient_{patient.id}"
    patient_dir.mkdir(parents=True, exist_ok=True)
    dest = patient_dir / fname
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    abs_path = str(dest.resolve())

    scan_kwargs: dict[str, Any] = {
        "patient_id": patient.id,
        "image_path": abs_path,
        "day_number": next_day,
        "inference_status": "processing",
        "notes": notes,
    }
    if dev_day is not None:
        scan_kwargs["captured_at"] = datetime.combine(
            dev_day, time(12, 0, 0), tzinfo=timezone.utc
        )

    scan = Scan(**scan_kwargs)
    db.add(scan)
    db.commit()
    db.refresh(scan)

    try:
        out = run_inference(abs_path)
        scan.acne_count = out["acne_count"]
        scan.avg_confidence = out["avg_confidence"]
        scan.severity_score = out["severity_score"]
        scan.predictions_json = {"predictions": out["predictions"]}
        scan.annotated_image_path = None
        scan.inference_status = "done"
        scan.inference_error = None

        patient.days_completed = (patient.days_completed or 0) + 1
        if patient.days_completed >= patient.tracking_days:
            patient.treatment_status = "completed"
        db.commit()
        db.refresh(scan)
    except Exception as e:
        scan.inference_status = "failed"
        scan.inference_error = str(e)
        db.commit()
        db.refresh(scan)

    return _scan_with_urls(scan, db)


@router.get("/my")
def my_scans(
    db: Session = Depends(get_db),
    patient: Patient = Depends(get_current_patient),
):
    scans = (
        db.query(Scan)
        .filter(Scan.patient_id == patient.id)
        .order_by(Scan.day_number.asc())
        .all()
    )
    return [_scan_with_urls(s, db) for s in scans]


@router.get("/patient/{patient_id}")
def scans_for_patient(
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
        .filter(Scan.patient_id == patient_id)
        .order_by(Scan.day_number.asc())
        .all()
    )
    return [_scan_with_urls(s, db) for s in scans]


@router.get("/{scan_id}")
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    role = payload.get("role")
    uid = int(payload.get("user_id", 0))
    if role == "patient":
        if scan.patient_id != uid:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif role == "doctor":
        patient = db.query(Patient).filter(Patient.id == scan.patient_id).first()
        if not patient or patient.doctor_id != uid:
            raise HTTPException(status_code=403, detail="Forbidden")
    else:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _scan_with_urls(scan, db)
