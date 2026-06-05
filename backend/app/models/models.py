from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    specialization = Column(String(200), default="Dermatologist")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patients = relationship("Patient", back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    case_notes = Column(Text, nullable=True)
    face_region = Column(String(100), default="full_face")
    tracking_days = Column(Integer, default=30)
    days_completed = Column(Integer, default=0)
    treatment_status = Column(String(20), default="active")
    notification_time = Column(String(10), default="09:00")
    last_notified_at = Column(DateTime(timezone=True), nullable=True)
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    doctor = relationship("Doctor", back_populates="patients")
    scans = relationship("Scan", back_populates="patient")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    image_path = Column(String(500), nullable=False)
    annotated_image_path = Column(String(500), nullable=True)
    predictions_json = Column(JSON, nullable=True)
    acne_count = Column(Integer, default=0)
    avg_confidence = Column(Float, default=0.0)
    severity_score = Column(Float, default=0.0)
    day_number = Column(Integer, nullable=False)
    inference_status = Column(String(20), default="pending")
    inference_error = Column(Text, nullable=True)
    captured_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="scans")
