# PHASE 1 — PROJECT FOUNDATION & ARCHITECTURE

## 1. Project Overview

We are building a web-based AI OCR application.

The application allows users to upload or capture an image containing text, then use AI to:

1. Detect text regions in the image.
2. Recognize text using PaddleOCR.
3. Return recognized text with confidence scores and bounding boxes.
4. Detect/handle multiple languages.
5. Translate recognized text into a selected target language.
6. Store OCR history.
7. Display OCR results visually on the frontend.

The project will be developed incrementally in multiple phases.

IMPORTANT:

Do NOT implement all features at once.

This task is ONLY PHASE 1.

The purpose of Phase 1 is to establish a clean, scalable, maintainable project architecture.

---

# 2. Final Technology Stack

## Frontend

- React
- Vite
- JavaScript or TypeScript
- Tailwind CSS
- Axios
- React Router

Preferred:
- TypeScript if possible.

## Backend

- Node.js
- NestJS
- MongoDB
- Mongoose
- REST API
- JWT authentication will be introduced in a later phase.

## AI Service

- Python
- FastAPI
- PaddleOCR
- OpenCV

IMPORTANT:

The AI service must remain an independent service.

Do NOT install PaddleOCR directly into the NestJS backend.

Architecture:

React
    ↓
NestJS
    ↓
FastAPI AI Service
    ↓
PaddleOCR

---

# 3. Architecture

The system must follow this architecture:

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
     │          │          │ FastAPI      │
     └──────────┘          │ Python       │
                           │ PaddleOCR    │
                           │ OpenCV       │
                           └──────────────┘

The frontend communicates ONLY with the NestJS backend.

The frontend must NOT directly communicate with the Python AI service.

The NestJS backend is the main API gateway.

---

# 4. Monorepo Structure

Create the project with this structure:

ocr-ai-project/
│
├── frontend/
│
├── backend/
│
├── ai-service/
│
├── docker-compose.yml
│
├── .gitignore
│
├── README.md
│
└── .env.example

---

# 5. Frontend Structure

Create:

frontend/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── assets/
│   ├── App.tsx
│   └── main.tsx
│
├── public/
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env.example

Use React Router.

Create basic routes:

/
 /login
 /register
 /dashboard
 /ocr
 /history

These pages can initially contain placeholder UI only.

Do NOT implement authentication logic yet.

---

# 6. Backend Structure

Use NestJS.

Create:

backend/
│
├── src/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── images/
│   │   ├── ocr/
│   │   └── translations/
│   │
│   ├── common/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   └── decorators/
│   │
│   ├── config/
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── package.json
├── tsconfig.json
└── .env.example

Create the module structure, but do not implement business logic yet.

---

# 7. AI Service Structure

Create:

ai-service/
│
├── app/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── utils/
│   └── main.py
│
├── requirements.txt
├── Dockerfile
└── .env.example

Create a basic FastAPI application.

The AI service must expose:

GET /health

Expected response:

{
  "status": "ok",
  "service": "ai-service"
}

Do NOT implement PaddleOCR processing in this phase.

Only prepare the structure.

---

# 8. Backend Health API

NestJS must expose:

GET /api/health

Expected response:

{
  "status": "ok",
  "service": "backend"
}

Use a proper HealthController or equivalent clean NestJS structure.

---

# 9. MongoDB

Connect NestJS to MongoDB using Mongoose.

Use environment variables.

Example:

MONGODB_URI=mongodb://localhost:27017/ocr_ai

Do NOT hardcode credentials or connection strings.

At this phase, the database only needs to establish a successful connection.

Do NOT implement full schemas yet unless required by NestJS setup.

Schemas will be implemented in later phases.

---

# 10. Environment Configuration

Create .env.example files.

Frontend:

VITE_API_URL=http://localhost:3000/api

Backend:

PORT=3000
MONGODB_URI=mongodb://localhost:27017/ocr_ai
AI_SERVICE_URL=http://localhost:8000

AI service:

PORT=8000

IMPORTANT:

Never commit real .env files.

Only commit .env.example.

---

# 11. Docker

Prepare Docker support.

docker-compose.yml should provide:

- mongodb
- backend
- ai-service
- frontend

However, prioritize development simplicity.

If React development through Docker introduces unnecessary complexity, document both:

1. Local development
2. Docker development

The important requirement is that all services can communicate correctly.

Expected conceptual network:

frontend
   ↓
backend:3000
   ↓
ai-service:8000

backend
   ↓
mongodb:27017

---

# 12. CORS

Configure NestJS CORS so that the React frontend can communicate with the backend during local development.

Do not use unrestricted production configuration blindly.

Use environment-based configuration where practical.

---

# 13. API Prefix

NestJS API prefix:

/api

Therefore:

GET /api/health

AI service:

GET /health

The AI service does not need /api prefix at this stage.

---

# 14. Initial UI

Create a very simple but clean application layout.

Dashboard should contain:

- Application name
- Navigation
- OCR button
- History button
- User area placeholder

OCR page should contain:

- Upload image placeholder
- Camera placeholder
- OCR result placeholder

Do not implement actual OCR yet.

---

# 15. Coding Principles

Follow these principles strictly:

1. Clean Architecture
2. Separation of concerns
3. Reusable components
4. Environment-based configuration
5. No hardcoded secrets
6. No unnecessary dependencies
7. Strong typing with TypeScript where applicable
8. Meaningful naming
9. Small modular files
10. Avoid duplicated logic
11. Keep AI service independent from backend
12. Keep frontend independent from AI service

Do not create unnecessary abstraction just for the sake of abstraction.

---

# 16. Error Handling

Prepare a consistent error response strategy.

Example:

{
  "success": false,
  "message": "Something went wrong",
  "error": "ERROR_CODE"
}

This does not need to be fully implemented everywhere in Phase 1.

Just establish the architecture so future modules follow the same convention.

---

# 17. Logging

Prepare basic development logging.

Backend should log:

- Application startup
- MongoDB connection
- Server port
- Important errors

AI service should log:

- Application startup
- Server port
- Important errors

Do not log passwords, tokens, or sensitive user information.

---

# 18. README

Create a useful README.md containing:

## Project Overview

Explain the project briefly.

## Architecture

Explain:

React
→ NestJS
→ MongoDB
→ FastAPI
→ PaddleOCR

## Requirements

List:

- Node.js
- npm
- Python
- MongoDB
- Docker (optional)

## Installation

Explain how to install dependencies.

## Running Frontend

Explain the command.

## Running Backend

Explain the command.

## Running AI Service

Explain the command.

## Running MongoDB

Explain both local and Docker options.

## Health Checks

Explain:

GET /api/health

GET /health

---

# 19. Phase 1 Acceptance Criteria

Phase 1 is considered COMPLETE only when all of these work:

[ ] Frontend starts successfully.

[ ] Backend starts successfully.

[ ] AI service starts successfully.

[ ] MongoDB connection works.

[ ] GET /api/health returns HTTP 200.

[ ] GET /health returns HTTP 200.

[ ] React can communicate with NestJS.

[ ] NestJS can communicate with MongoDB.

[ ] NestJS can communicate with the AI service.

[ ] No hardcoded secrets.

[ ] .env.example files exist.

[ ] README contains setup instructions.

[ ] Project structure follows the architecture above.

---

# 20. IMPORTANT — DO NOT IMPLEMENT YET

Do NOT implement the following in Phase 1:

- Real authentication
- JWT
- Password hashing
- Real OCR
- PaddleOCR inference
- Image upload processing
- Image storage
- Translation
- OCR history
- YOLO
- Gemini
- SAM
- TTS

These will be implemented in later phases.

---

# 21. Verification

After implementation:

1. Start MongoDB.
2. Start AI service.
3. Start NestJS backend.
4. Start React frontend.
5. Test backend health endpoint.
6. Test AI health endpoint.
7. Test frontend → backend communication.
8. Test backend → MongoDB connection.
9. Test backend → AI service communication.

Fix all startup errors before declaring Phase 1 complete.

Do not proceed to Phase 2 automatically.

At the end, provide a concise report containing:

- What was created
- Folder structure
- Technologies used
- Commands to run each service
- Health check results
- Any known issues
- Exact next recommended phase

WAIT FOR USER APPROVAL BEFORE MOVING TO PHASE 2.