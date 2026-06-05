import hashlib
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import Doctor, Patient


def _password_secret_bytes_for_bcrypt(password: str) -> bytes:
    """SHA-256 hex digest (64 bytes ASCII) so bcrypt never exceeds its 72-byte input limit."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("ascii")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        _password_secret_bytes_for_bcrypt(password),
        bcrypt.gensalt(),
    ).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    # New hashes: bcrypt(SHA256(plain)); legacy passlib/bcrypt: bcrypt(plain)
    h = hashed.encode("ascii")
    try:
        if bcrypt.checkpw(plain.encode("utf-8"), h):
            return True
    except ValueError:
        pass
    try:
        return bcrypt.checkpw(_password_secret_bytes_for_bcrypt(plain), h)
    except ValueError:
        return False


def create_access_token(
    data: dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def get_doctor_by_email(db: Session, email: str) -> Optional[Doctor]:
    return db.query(Doctor).filter(Doctor.email == email).first()


def get_patient_by_phone(db: Session, phone: str) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.phone == phone).first()
