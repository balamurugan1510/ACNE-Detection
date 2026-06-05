from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Doctor, Patient
from app.services.auth_utils import decode_token

security = HTTPBearer(auto_error=False)


def _payload_from_credentials(
    credentials: Optional[HTTPAuthorizationCredentials],
) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        return decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_current_doctor(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> Doctor:
    payload = _payload_from_credentials(credentials)
    if payload.get("role") != "doctor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor access only")
    uid = payload.get("user_id")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    doctor = db.query(Doctor).filter(Doctor.id == int(uid)).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Doctor not found")
    return doctor


def get_token_payload(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
) -> dict:
    """Valid JWT payload (doctor or patient)."""
    return _payload_from_credentials(credentials)


def get_current_patient(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> Patient:
    payload = _payload_from_credentials(credentials)
    if payload.get("role") != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access only")
    uid = payload.get("user_id")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    patient = db.query(Patient).filter(Patient.id == int(uid)).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Patient not found")
    return patient
