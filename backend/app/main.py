import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth, dashboard, patients, scans
from app.config import settings
from app.database import Base, engine
from app.models import models as _models  # noqa: F401 — register models on Base.metadata
from app.schema_sync import apply_missing_columns

app = FastAPI(title="AcneTrack API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_dir = Path(settings.upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(scans.router, prefix="/api/scans", tags=["scans"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    apply_missing_columns(engine)


@app.get("/health")
def health():
    return {"status": "ok"}
