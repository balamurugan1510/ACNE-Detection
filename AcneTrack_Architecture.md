# AcneTrack — Architecture & Implementation (As-Built)

AI-powered dermatology treatment tracker: doctors onboard patients; patients upload daily photos; **Roboflow-hosted object detection** estimates lesion counts; both sides see trends.

| | |
| :--- | :--- |
| **Version** | 2.0 (as-built) |
| **Status** | Reflects current repository |
| **Stack** | FastAPI · PostgreSQL 16 · React (Vite) · Docker · Roboflow Inference SDK (Serverless) |
| **Date** | March 2026 |

A verbatim copy of the previous product spec is kept in **`AcneTrack_Spec.docx.archive.md`** (backup of `AcneTrack_Spec.docx.md` at archive time).

---

## 1. Product overview

### 1.1 What the app does

- **Doctors** register with email/password (JWT), onboard patients (name, phone, notes, face region, tracking window), and view a dashboard with per-patient trends.
- **Patients** log in with **phone + OTP** (OTP is generated and stored in the database; there is **no SMS integration** — suitable for dev/demo).
- Patients submit **one image per calendar day** (JPEG/PNG). The backend calls **Roboflow** for inference **synchronously** in the upload request, then stores counts, severity, and **prediction JSON** for the UI.
- **Bounding boxes** are drawn in the **browser** from stored prediction coordinates (not server-side OpenCV rendering).
- **Severity** is derived from lesion count: `min(100, (count / 30) × 100)` with human-readable bands (Clear / Mild / …).

### 1.2 What is not implemented (vs older planning docs)

- **Redis, Celery, Celery Beat** — not present; no background inference queue, no scheduled SMS/push.
- **Nginx** — optional service is **commented out** in `docker-compose.yml`; typical access is **backend :8000** and **frontend :3000**.
- **Local Ultralytics YOLO** — not used in the running app; inference is **Roboflow Serverless API** via `inference-sdk`.
- **SMS / WhatsApp / push notifications** — not implemented. `notification_time` is stored; **`last_notified_at` is never updated** by any job.
- **Alembic** — not used; schema is created with SQLAlchemy `create_all` plus a small **PostgreSQL column sync** for existing volumes (see below).

---

## 2. System architecture

### 2.1 High level

| Layer | Technology | Responsibility |
| :--- | :--- | :--- |
| Frontend | React + Vite, Tailwind, Recharts, React Router | Doctor and patient UIs; detection overlay from JSON |
| Backend | FastAPI (Python 3.11) | REST API, JWT auth, uploads, Roboflow inference, static `/uploads` |
| Database | PostgreSQL 16 (Docker) | Doctors, patients, scans |
| ML inference | Roboflow Serverless + `inference-sdk` | Object detection; default path is **direct model** `infer()`, not a workflow |
| File storage | Docker volume `uploads_data` | Raw images under `UPLOAD_DIR` |

### 2.2 Docker Compose services (current)

| Service | Purpose | Host ports (typical) |
| :--- | :--- | :--- |
| `db` | PostgreSQL 16 | 5432 |
| `backend` | FastAPI + Uvicorn | 8000 |
| `frontend` | Vite production preview / static | 3000 |

There is **no** `redis`, `celery_worker`, or `nginx` service in the default compose file.

### 2.3 Request flow — photo upload to result

1. Patient selects/takes a photo; frontend `POST /api/scans/upload` with `multipart/form-data` (`file`, optional `notes`).
2. Backend saves the file under `{UPLOAD_DIR}/patient_{id}/`, creates a `Scan` with `inference_status="processing"`.
3. Backend calls **`run_inference(image_path)`** (Roboflow) **in the same request** (synchronous).
4. On success: updates `acne_count`, `avg_confidence`, `severity_score`, `predictions_json`, sets `inference_status="done"`, increments `days_completed` when appropriate.
5. Response includes `image_url`, `predictions`, etc. — the patient UI can show results **without polling** (unless you add polling for other reasons).

### 2.4 Database migrations

- On startup: `Base.metadata.create_all()` then **`apply_missing_columns(engine)`** (`app/schema_sync.py`) for PostgreSQL — adds **missing columns** (e.g. `predictions_json`) when an old volume already had tables created without them.

### 2.5 Static files

- FastAPI mounts **`/uploads`** to the upload directory. Frontend builds image URLs from the API origin + `/uploads/...`.

---

## 3. Database schema (implemented)

ORM: `backend/app/models/models.py`. Key fields:

**doctors** — id, name, email (unique), phone (optional unique), hashed_password, specialization, is_active, created_at.

**patients** — id, doctor_id FK, name, phone (unique), case_notes, face_region, tracking_days, days_completed, treatment_status (`active` / `completed` / `paused`), notification_time, last_notified_at (unused), OTP fields, start_date, created_at.

**scans** — id, patient_id FK, image_path, annotated_image_path (optional; **not used for server-drawn overlays in current UI**), **predictions_json** (JSON), acne_count, avg_confidence, severity_score, day_number, inference_status, inference_error, captured_at, notes.

---

## 4. API summary (implemented)

Base URL: `http://localhost:8000` (no `/api` prefix on the host root; routes are under `/api/...`).

### 4.1 Auth — `/api/auth`

| Method | Path | Notes |
| :--- | :--- | :--- |
| POST | `/doctor/register` | Body: name, email, password, optional phone, specialization |
| POST | `/doctor/login` | email + password → JWT |
| POST | `/patient/request-otp` | phone must exist; OTP stored; **`dev_otp` in JSON when `dev_mode`** |
| POST | `/patient/verify-otp` | phone + otp → JWT |

### 4.2 Patients — `/api/patients`

Doctor JWT: `POST /`, `GET /`, `GET /{patient_id}`, `PATCH /{patient_id}`.  
Patient JWT: `GET /me`.

### 4.3 Scans — `/api/scans`

| Method | Path | Notes |
| :--- | :--- | :--- |
| POST | `/upload` | Patient JWT; multipart `file`, optional `notes`; optional **`dev_capture_date`** when `dev_mode` (testing calendar day) |
| GET | `/my` | Patient JWT; own scans |
| GET | `/patient/{patient_id}` | Doctor JWT |
| GET | `/{scan_id}` | Doctor or patient (ownership checked) |

### 4.4 Dashboard — `/api/dashboard`

Doctor JWT: `GET /overview`, `GET /patient/{patient_id}/trend`, `GET /all-trends`.

---

## 5. ML inference — Roboflow (as implemented)

**Code:** `backend/app/services/inference.py`  
**Config:** `backend/app/config.py` and environment variables in `docker-compose.yml`.

### 5.1 Default: direct model inference (`infer`)

- Uses **`InferenceHTTPClient.infer(inference_input=image_path, model_id=...)`** against **`https://serverless.roboflow.com`** (or `ROBOFLOW_API_URL`).
- **`InferenceConfiguration`** passes:
  - **`confidence_threshold`** (mapped to API `confidence`) — default **0.01** to retain more low-confidence boxes than a typical workflow filter.
  - **`max_detections`** — default **300**.
  - **`visualize_predictions=False`** (no server-side viz dependency for boxes).
- This avoids **workflow-only** steps that might apply extra thresholds; the **model** endpoint still applies model NMS and API limits.

### 5.2 Optional: workflow mode

- Set **`ROBOFLOW_USE_WORKFLOW=true`**.
- Uses **`client.run_workflow(...)`** with `ROBOFLOW_WORKSPACE_NAME` and `ROBOFLOW_WORKFLOW_ID`.
- When workflow mode is on, **`ROBOFLOW_MODEL_ID`** is not used for inference.

### 5.3 Storing and displaying boxes

- Parsed detection dicts are stored under **`predictions_json`** as `{"predictions": [...]}`.
- The **frontend** (`DetectionOverlay`) maps **x/y/width/height** or **x_min/y_min/x_max/y_max** to CSS overlays on the image — **no** OpenCV drawing on the server for the main UI path.

### 5.4 Backend Docker image

- **`libgl1`** and **`libglib2.0-0`** are installed in the backend image because **`inference-sdk`** may pull **OpenCV**-related dependencies that expect `libGL.so.1` at runtime.

---

## 6. Setting up Roboflow for direct model inference

Follow these steps so **`ROBOFLOW_MODEL_ID`** matches a deployed model your API key can run.

### Step 1 — Project and model on Roboflow

1. Sign in at [Roboflow](https://roboflow.com) and open your **workspace**.
2. Create or open a **Project** for acne/detection (object detection).
3. Upload images, label, and **train** or use your existing workflow to produce a **model version**.
4. **Deploy** the model version to Roboflow’s hosted inference (Serverless / Deploy — per current Roboflow UI).

### Step 2 — Model identifier

- The Serverless Python SDK expects a **`model_id`** of the form **`project-slug/version`**, e.g. `my-project/1`.
- Find the **project slug** and **version number** on the model’s page in the Roboflow dashboard (Deploy / Model tab).

### Step 3 — API key

1. Open **Roboflow → Account / API** (or Workspace settings).
2. Create or copy an **API key** with permission to run inference.

### Step 4 — Configure the backend

Set environment variables (e.g. in `docker-compose.yml` under `backend.environment`):

| Variable | Example | Purpose |
| :--- | :--- | :--- |
| `ROBOFLOW_API_KEY` | *(secret)* | Authentication |
| `ROBOFLOW_API_URL` | `https://serverless.roboflow.com` | Serverless base URL |
| `ROBOFLOW_MODEL_ID` | `my-first-project-soi1o/1` | **Direct model** inference |
| `ROBOFLOW_USE_WORKFLOW` | `false` | Use `infer`, not workflow |
| `ROBOFLOW_CONFIDENCE_THRESHOLD` | `0.01` | Lower = more detections (subject to model/API) |
| `ROBOFLOW_MAX_DETECTIONS` | `300` | Cap on returned boxes |

For **workflow** mode instead:

| Variable | Purpose |
| :--- | :--- |
| `ROBOFLOW_USE_WORKFLOW` | `true` |
| `ROBOFLOW_WORKSPACE_NAME` | Workspace URL slug |
| `ROBOFLOW_WORKFLOW_ID` | Workflow id string |

### Step 5 — Verify

1. `docker compose up --build`
2. Open `http://localhost:8000/docs`
3. Register a doctor, onboard a patient, log in as patient, upload an image.
4. Check response JSON for `inference_status`, `acne_count`, and `predictions`.

---

## 7. Frontend (as-built)

- **Vite** (`import.meta.env`); API base via **`VITE_API_URL`** build arg (empty string often means same-origin proxy or relative URLs — see `frontend/src/api/client.js`).
- **Routes** align with the earlier spec: landing, doctor login/register/dashboard/patients/onboarding/detail, patient login/home/upload/history.
- **NotificationBanner** on patient home: **in-app only** — reminds user if today’s scan is missing; **not** a service worker or push notification.

---

## 8. Environment variables (backend)

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL DSN |
| `SECRET_KEY` | JWT signing (use a long random value in production) |
| `JWT_ALGORITHM` | Default HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default 7 days in dev |
| `UPLOAD_DIR` | Upload root inside container |
| `DEV_MODE` / `dev_mode` | Enables e.g. `dev_otp` and optional `dev_capture_date` on upload |
| `ROBOFLOW_*` | See §5 and §6 |

---

## 9. Directory layout (relevant parts)

```
ACNE-Detection/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py           # FastAPI, CORS, /uploads, startup schema
│       ├── config.py
│       ├── database.py
│       ├── schema_sync.py    # PostgreSQL ADD COLUMN IF NOT EXISTS for drift
│       ├── deps.py           # JWT dependencies
│       ├── models/models.py
│       ├── api/              # auth, patients, scans, dashboard
│       └── services/
│           ├── auth_utils.py
│           ├── inference.py  # Roboflow
│           └── trends.py
├── frontend/
│   └── src/
│       ├── api/client.js
│       ├── components/       # DetectionOverlay, NotificationBanner, …
│       └── pages/
└── ml_models/                # Notebooks / scripts; not required at runtime for Serverless inference
```

---

## 10. Run locally

```bash
docker compose up --build
```

- API: `http://localhost:8000` — Swagger: `/docs`
- Frontend: `http://localhost:3000`

Stop: `docker compose down` (volumes persist).  
Wipe DB/uploads volumes: `docker compose down -v` (destructive).

---

## 11. Production hardening (short list)

- Strong `SECRET_KEY`, rotate DB password, restrict CORS, HTTPS, remove `dev_otp` / set `dev_mode=false`.
- Replace OTP-in-DB-only with real SMS or another second factor if needed.
- Consider **Alembic** for migrations instead of relying solely on `schema_sync` for additive columns.

---

## 12. Glossary

| Term | Meaning |
| :--- | :--- |
| **Serverless** | Roboflow-hosted HTTP inference (`serverless.roboflow.com`) |
| **`model_id`** | `project-slug/version` for `infer()` |
| **Workflow** | Optional Roboflow graph (`run_workflow`) with extra steps |
| **JWT** | Bearer token for doctor vs patient roles |
| **Severity score** | `min(100, count/30×100)` from lesion count |

---

*End of architecture document (as-built).*
