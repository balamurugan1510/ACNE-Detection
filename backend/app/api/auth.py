from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import Doctor, Patient
from app.services.auth_utils import (
    create_access_token,
    generate_otp,
    get_doctor_by_email,
    get_patient_by_phone,
    hash_password,
    verify_password,
)

router = APIRouter()


class DoctorRegister(BaseModel):
    name: str = Field(..., max_length=200)
    email: EmailStr
    phone: str | None = Field(None, max_length=20)
    password: str = Field(..., min_length=6)
    specialization: str = Field(default="Dermatologist", max_length=200)


class DoctorLogin(BaseModel):
    email: EmailStr
    password: str


class PatientRequestOtp(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)


class PatientVerifyOtp(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)
    otp: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str


@router.post("/doctor/register", response_model=TokenResponse)
def doctor_register(body: DoctorRegister, db: Session = Depends(get_db)):
    if get_doctor_by_email(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    doctor = Doctor(
        name=body.name,
        email=body.email,
        phone=body.phone,
        hashed_password=hash_password(body.password),
        specialization=body.specialization,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    token = create_access_token(
        {
            "sub": str(doctor.id),
            "role": "doctor",
            "user_id": doctor.id,
            "name": doctor.name,
        }
    )
    return TokenResponse(
        access_token=token,
        role="doctor",
        user_id=doctor.id,
        name=doctor.name,
    )


@router.post("/doctor/login", response_model=TokenResponse)
def doctor_login(body: DoctorLogin, db: Session = Depends(get_db)):
    doctor = get_doctor_by_email(db, body.email)
    if not doctor or not verify_password(body.password, doctor.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(
        {
            "sub": str(doctor.id),
            "role": "doctor",
            "user_id": doctor.id,
            "name": doctor.name,
        }
    )
    return TokenResponse(
        access_token=token,
        role="doctor",
        user_id=doctor.id,
        name=doctor.name,
    )


@router.post("/patient/request-otp")
def patient_request_otp(body: PatientRequestOtp, db: Session = Depends(get_db)):
    patient = get_patient_by_phone(db, body.phone)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No patient found with this phone number",
        )
    otp = generate_otp()
    patient.otp_code = otp
    patient.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.commit()
    out: dict = {"message": "OTP sent", "expires_in_minutes": 10}
    if settings.dev_mode:
        out["dev_otp"] = otp
    return out


@router.post("/patient/verify-otp", response_model=TokenResponse)
def patient_verify_otp(body: PatientVerifyOtp, db: Session = Depends(get_db)):
    patient = get_patient_by_phone(db, body.phone)
    if not patient or not patient.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request",
        )
    if patient.otp_expires_at and patient.otp_expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired",
        )
    if patient.otp_code != body.otp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )
    patient.otp_code = None
    patient.otp_expires_at = None
    db.commit()
    token = create_access_token(
        {
            "sub": str(patient.id),
            "role": "patient",
            "user_id": patient.id,
            "name": patient.name,
        }
    )
    return TokenResponse(
        access_token=token,
        role="patient",
        user_id=patient.id,
        name=patient.name,
    )
