# PHASE 4 — PADDLEOCR ENGINE & OCR PIPELINE

Phase 1, Phase 2 and Phase 3 have been completed and audited.

You are now implementing PHASE 4.

IMPORTANT:

Do not break existing functionality.

Architecture must remain:

React
 ↓
NestJS Backend
 ↓
MongoDB / Cloudinary

NestJS
 ↓
FastAPI AI Service
 ↓
PaddleOCR

==================================================
1. PHASE 4 OBJECTIVE
==================================================

Implement a real OCR pipeline using PaddleOCR.

The system must allow an authenticated user to:

1. Select one of their uploaded images.
2. Request OCR.
3. Backend verifies ownership.
4. Backend obtains the Cloudinary image URL.
5. Backend sends the image to AI Service.
6. AI Service performs PaddleOCR inference.
7. AI Service returns:
   - full text
   - individual text lines
   - confidence
   - bounding boxes
   - processing time
8. Backend returns normalized OCR result.
9. OCR result is stored in MongoDB.
10. Frontend displays OCR result.

==================================================
2. IMPORTANT ARCHITECTURE RULE
==================================================

PaddleOCR MUST run inside:

ai-service/

Do NOT install PaddleOCR into NestJS.

Do NOT run OCR inside the React frontend.

Frontend MUST NOT call AI Service directly.

Correct:

React
 ↓
NestJS
 ↓
FastAPI
 ↓
PaddleOCR

==================================================
3. AI SERVICE
==================================================

Use the existing FastAPI AI Service.

Do not create a second AI service.

Add OCR functionality using a clean service architecture.

Suggested:

ai-service/app/

api/
services/
models/
utils/

Create appropriate OCR files.

Do not put all OCR logic into main.py.

==================================================
4. PADDLEOCR
==================================================

Integrate PaddleOCR into the AI Service.

Primary OCR language requirements:

Vietnamese
English

The implementation should be structured so additional languages can be added later.

Do not attempt to support excessive languages in this phase.

==================================================
5. OCR OUTPUT
==================================================

OCR result must contain:

fullText

lines[]

Each line should contain:

text
confidence
box

Box format should be consistent.

Example:

{
  "text": "Xin chào Việt Nam",
  "confidence": 0.96,
  "box": [
    [20,30],
    [300,30],
    [300,70],
    [20,70]
  ]
}

Also return:

processingTimeMs

==================================================
6. IMAGE PREPROCESSING
==================================================

Create a dedicated preprocessing layer.

Possible operations:

- decode
- resize
- normalization
- optional grayscale
- optional contrast enhancement
- optional denoising
- optional sharpening

Do NOT blindly apply every preprocessing operation.

The preprocessing pipeline must be modular.

OCR should be able to process the original image.

==================================================
7. AI SERVICE API
==================================================

Create:

POST /ocr

It should receive an image from NestJS.

Return normalized JSON.

Success example:

{
  "success": true,
  "data": {
    "fullText": "...",
    "lines": [],
    "processingTimeMs": 250
  }
}

If no text is detected:

Return successful OCR response with:

fullText = ""
lines = []

Do NOT treat "no text found" as a server error.

==================================================
8. BACKEND OCR MODULE
==================================================

Use the existing NestJS architecture.

Create or extend:

backend/src/modules/ocr/

Use:

controller
service
dto
schema/model where appropriate

Reuse:

JWT Guard
existing authentication
existing exception filter
existing configuration
existing Axios/HTTP mechanism

==================================================
9. BACKEND OCR API
==================================================

Create:

POST /api/ocr

Request:

{
  "imageId": "..."
}

JWT required.

Do NOT accept arbitrary image URLs from frontend.

==================================================
10. OWNERSHIP SECURITY
==================================================

Backend must resolve image ownership using:

current authenticated user
+
imageId

Conceptually:

find Image where:

_id = imageId
AND
userId = currentUserId

If image does not belong to current user:

Do NOT send it to AI Service.

Return safe 404/403 according to existing project conventions.

This MUST prevent:

User A → OCR User B image

==================================================
11. AI SERVICE COMMUNICATION
==================================================

NestJS communicates with FastAPI AI Service.

Use existing AI_SERVICE_URL configuration.

Do not hardcode URLs.

Handle:

AI service unavailable
AI timeout
invalid AI response
AI inference failure

Return appropriate backend errors.

==================================================
12. OCR DATABASE
==================================================

Create an OCR result model/collection.

Conceptual structure:

OCRResult

_id
userId
imageId
fullText
lines[]
processingTimeMs
createdAt
updatedAt

lines contain:

text
confidence
box

OCR result must be associated with:

userId
imageId

==================================================
13. OCR HISTORY
==================================================

Implement an authenticated API to retrieve OCR history.

Suggested:

GET /api/ocr

Return only OCR results belonging to current user.

Newest first.

If the existing project has a better naming convention,
follow the existing convention.

==================================================
14. FRONTEND OCR
==================================================

Update /ocr.

Use existing uploaded images.

User flow:

1. Select image.
2. Preview image.
3. Click "Run OCR".
4. Show loading state.
5. Display OCR result.

States:

idle
loading
success
error

Disable OCR button during processing.

==================================================
15. OCR RESULT UI
==================================================

Display:

Full extracted text.

For each detected line:

text
confidence

Example:

OCR Result

Xin chào Việt Nam

Confidence: 96%

Do not overcomplicate UI.

Bounding box visualization may be implemented if compatible with current architecture,
but it is not required for initial Phase 4 acceptance.

==================================================
16. HISTORY UI
==================================================

Extend /history.

Display OCR results associated with the authenticated user.

Each result should show:

image
text preview
createdAt
confidence if available

Handle:

loading
empty
error

==================================================
17. ERROR HANDLING
==================================================

Handle:

401 unauthenticated
404 image not found
403/404 unauthorized ownership
503 AI service unavailable
502 AI service communication failure
500 OCR inference failure

No sensitive infrastructure details should be exposed.

==================================================
18. TESTING
==================================================

Actually execute tests.

Do not fabricate results.

AI SERVICE:

1. GET /health
2. POST /ocr with valid Vietnamese image
3. POST /ocr with English image
4. POST /ocr with image containing no text
5. invalid image
6. AI service failure scenario if safely testable

BACKEND:

7. POST /api/ocr without JWT
8. POST /api/ocr with valid JWT
9. invalid imageId
10. User A attempts OCR on User B image
11. AI service unavailable
12. OCR result stored in MongoDB

REGRESSION:

13. GET /api/health
14. Authentication APIs
15. Image APIs

FRONTEND:

16. npm run build

BACKEND:

17. npm run build

==================================================
19. IMPORTANT TEST EVIDENCE RULE
==================================================

Only mark a test PASS if actually executed.

Use:

| Test | Command/Request | Expected | Actual | Status |

Statuses:

PASS
FAIL
NOT EXECUTED
CANNOT VERIFY

Never fabricate test evidence.

==================================================
20. DO NOT IMPLEMENT
==================================================

DO NOT implement:

- Translation
- YOLO
- SAM
- Gemini
- TTS
- Object Detection
- Semantic Segmentation
- OCR translation
- AI chatbot
- advanced AI analysis

These belong to later phases.

==================================================
21. BACKWARD COMPATIBILITY
==================================================

Do not break:

GET /health
GET /api/health

Authentication.

Image upload.

Image listing.

Image deletion.

Cloudinary.

MongoDB.

Existing frontend routing.

==================================================
22. BUILD AND RUNTIME
==================================================

Actually run:

Frontend build
Backend build
AI Service startup
Health endpoints

Verify actual AI Service port.

Do not assume port 8000.

Use existing AI_SERVICE_URL configuration.

==================================================
23. FINAL REPORT
==================================================

After implementation, STOP.

Do NOT automatically start Phase 5.

Produce:

# PHASE 4 IMPLEMENTATION REPORT

## A. IMPLEMENTED

## B. FILES CREATED

## C. FILES MODIFIED

## D. AI SERVICE

## E. PADDLEOCR CONFIGURATION

## F. OCR API

## G. BACKEND API

## H. DATABASE CHANGES

## I. FRONTEND CHANGES

## J. TESTS ACTUALLY EXECUTED

Use a table.

## K. TESTS NOT EXECUTED

## L. FAILURES

## M. WARNINGS

## N. SECURITY VERIFICATION

## O. BUILD STATUS

## P. RUNTIME STATUS

## Q. REGRESSION STATUS

Phase 1:
Phase 2:
Phase 3:

## R. FINAL VERDICT

Choose exactly:

PASS
PASS WITH WARNINGS
FAIL

## S. READY FOR PHASE 5?

YES / NO

Do not implement Phase 5.

==================================================
24. ABSOLUTE RULE
==================================================

Implement ONLY Phase 4.

Do not expand scope.

Do not fabricate tests.

Do not expose secrets.

Do not modify unrelated modules unnecessarily.

After completing Phase 4 and producing the report, STOP.