from typing import Literal, Optional

from sqlalchemy.orm import Session

from app.models.models import Scan

Trend = Literal["improving", "worsening", "stable", "insufficient_data"]


def compute_trend_for_patient(db: Session, patient_id: int) -> Trend:
    scans = (
        db.query(Scan)
        .filter(
            Scan.patient_id == patient_id,
            Scan.inference_status == "done",
        )
        .order_by(Scan.day_number.asc())
        .all()
    )
    if len(scans) < 3:
        return "insufficient_data"
    last_three = scans[-3:]
    counts = [s.acne_count for s in last_three]
    if counts[2] < counts[0]:
        return "improving"
    if counts[2] > counts[0]:
        return "worsening"
    return "stable"


def latest_severity(db: Session, patient_id: int) -> Optional[float]:
    scan = (
        db.query(Scan)
        .filter(
            Scan.patient_id == patient_id,
            Scan.inference_status == "done",
        )
        .order_by(Scan.day_number.desc())
        .first()
    )
    return float(scan.severity_score) if scan else None
