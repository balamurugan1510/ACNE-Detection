# AcneTrack - AI-Powered Acne Detection System

## Overview

AcneTrack is an AI-powered healthcare application that detects and monitors acne severity using computer vision and deep learning techniques. The system enables users to upload facial images, analyze acne conditions, and track progress over time through an interactive dashboard.

The project combines modern web technologies, machine learning, and healthcare-focused analytics to provide an efficient acne assessment solution.

---

## Features

### Patient Features

* Secure patient authentication
* Upload facial images for acne analysis
* View acne severity reports
* Track treatment progress over time
* Access historical scan records

### Doctor Features

* Doctor registration and login
* Patient onboarding and management
* Patient progress monitoring
* Dashboard with analytics and insights

### AI Features

* Acne detection using YOLO
* Severity assessment
* Detection visualization with bounding boxes
* Automated image analysis

---

## Technology Stack

### Frontend

* React.js
* Vite
* Tailwind CSS

### Backend

* Python
* FastAPI
* REST APIs

### Machine Learning

* YOLO Object Detection
* PyTorch

### Database

* SQL Database Integration

### Deployment

* Docker
* Docker Compose

---

## Project Structure

```text
ACNE-Detection/
│
├── backend/
│   ├── app/
│   ├── api/
│   ├── models/
│   └── services/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── context/
│
├── ml_models/
│   ├── training1/
│   └── best.pt
│
├── docker-compose.yml
└── README.md
```

## Installation

### Clone Repository

```bash
git clone https://github.com/balamurugan1510/ACNE-Detection.git
cd ACNE-Detection
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Run with Docker

```bash
docker-compose up --build
```

---

## Workflow

1. User uploads a facial image.
2. Backend receives and preprocesses the image.
3. YOLO model performs acne detection.
4. Severity score is generated.
5. Results are displayed on the dashboard.
6. Progress history is stored for future comparison.

---

## Future Enhancements

* Treatment recommendation system
* Mobile application support
* Real-time camera analysis
* Advanced dermatology reports
* Cloud deployment


---

## License

This project is developed for educational and research purposes.
