# AI OCR Application — Phase 1 Project Architecture

## Project Overview

This is a web-based AI OCR application designed for optical character recognition, text region detection, multilingual text extraction, and automated translation. 

Phase 1 establishes a clean, modular, scalable microservices architecture adhering to Clean Architecture principles.

---

## Architecture Overview

```
                          USER
                            │
                            ▼
                    ┌───────────────┐
                    │   FRONTEND    │
                    │ React + Vite  │
                    │ Tailwind CSS  │
                    └───────┬───────┘
                            │
                         REST API
                            │
                            ▼
                    ┌───────────────┐
                    │    BACKEND    │
                    │    NestJS     │
                    └───────┬───────┘
                            │
                ┌───────────┼───────────┐
                │                       │
                ▼                       ▼
           ┌──────────┐          ┌──────────────┐
           │ MongoDB  │          │ AI SERVICE   │
           │ Mongoose │          │ FastAPI      │
           └──────────┘          │ Python       │
                                 └──────────────┘
```

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Axios, React Router.
- **Backend (API Gateway)**: NestJS, Node.js, Mongoose, REST API.
- **AI Service**: Python 3, FastAPI, Uvicorn (Independent AI microservice).
- **Database**: MongoDB (Mongoose ORM).

---

## Prerequisites & Requirements

- **Node.js**: v18.x or v20.x+ (Tested on v22.3.0)
- **npm**: v9.x or v10.x+
- **Python**: 3.9+ (Tested on Python 3.13)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or Docker MongoDB
- **Docker & Docker Compose**: (Optional, for containerized execution)

---

## Environment Setup

Clone the repository and inspect environment configuration files:

```bash
# Copy example .env files in each service:
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
```

Default configuration variables:

- **Frontend**: `VITE_API_URL=http://localhost:3000/api`
- **Backend**: `PORT=3000`, `MONGODB_URI=mongodb://localhost:27017/ocr_ai`, `AI_SERVICE_URL=http://localhost:8000`
- **AI Service**: `PORT=8000`

---

## Local Development Installation & Execution

### 1. Running MongoDB

#### Option A: Local MongoDB Service
Ensure MongoDB is running locally on `localhost:27017`.

#### Option B: Docker MongoDB
```bash
docker run -d --name ocr_ai_mongodb -p 27017:27017 mongo:latest
```

### 2. Running AI Service (FastAPI)

```bash
cd ai-service

# Create virtual environment (optional)
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Health endpoint: `http://localhost:8000/health`

### 3. Running Backend (NestJS)

```bash
cd backend

# Install node dependencies
npm install

# Start development server
npm run start:dev
```
Health endpoint: `http://localhost:3000/api/health`

### 4. Running Frontend (React + Vite)

```bash
cd frontend

# Install node dependencies
npm install

# Start Vite dev server
npm run dev
```
Access the application at `http://localhost:5173`.

---

## Docker Compose Execution (Alternative)

To start all services simultaneously using Docker:

```bash
docker-compose up --build
```

---

## Health Check Endpoints

| Service | Endpoint | Expected HTTP Status | Expected Response |
| :--- | :--- | :--- | :--- |
| **Backend API Gateway** | `GET http://localhost:3000/api/health` | `200 OK` | `{"status":"ok","service":"backend","database":"connected","ai_service":"connected"}` |
| **AI Microservice** | `GET http://localhost:8000/health` | `200 OK` | `{"status":"ok","service":"ai-service"}` |

---

## Verification Matrix

- [x] Monorepo structure defined (`frontend/`, `backend/`, `ai-service/`).
- [x] React + Vite + TypeScript frontend initialized with Tailwind CSS design.
- [x] NestJS API gateway backend configured with Mongoose & `/api/health`.
- [x] Python FastAPI AI service initialized with `/health`.
- [x] CORS & environment-based parameters configured.
- [x] Docker compose configuration created.
