# PHASE 3 — IMAGE UPLOAD, STORAGE & IMAGE MANAGEMENT

## 0. PROJECT CONTEXT

This project is an AI OCR web application.

PHASE 1 has been completed and approved.

PHASE 2 has been completed, self-audited and approved.

Current architecture:

                    USER
                     │
                     ▼
              ┌───────────────┐
              │   FRONTEND    │
              │ React + Vite  │
              │ TypeScript    │
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
          ┌───────────┼───────────────┐
          │                           │
          ▼                           ▼
     ┌──────────┐              ┌──────────────┐
     │ MongoDB  │              │ AI SERVICE   │
     │ Atlas    │              │ FastAPI      │
     └──────────┘              │ Python       │
                               │ PaddleOCR     │
                               └──────────────┘

IMPORTANT:

The frontend communicates ONLY with NestJS.

The frontend must NOT communicate directly with MongoDB.

The frontend must NOT communicate directly with the AI service.

The NestJS backend remains the main API Gateway.

PHASE 2 already provides:

- User registration
- Login
- bcrypt password hashing
- JWT authentication
- JWT strategy
- JWT guard
- /api/auth/me
- Protected frontend routes
- Authentication state
- Logout
- Persistent login

DO NOT BREAK ANY EXISTING PHASE 1 OR PHASE 2 FUNCTIONALITY.

---

# 1. PHASE 3 OBJECTIVE

Implement the complete image upload and image management pipeline.

The desired flow is:

React
  ↓
JWT authenticated request
  ↓
NestJS Image Module
  ↓
Multer / multipart handling
  ↓
Cloudinary
  ↓
Image URL + public ID
  ↓
MongoDB Image document

The user must be able to:

1. Upload an image.
2. Validate the image.
3. Store the image in Cloudinary.
4. Store image metadata in MongoDB.
5. Retrieve their own uploaded images.
6. Retrieve one image by ID.
7. Delete their own image.
8. See the uploaded image on the frontend.
9. Preview an image before uploading.

---

# 2. IMPORTANT SCOPE LIMITATION

This phase ONLY implements:

- Image upload
- Image validation
- Cloudinary storage
- Image metadata
- Image CRUD required for the application
- Frontend image upload UI
- Image preview
- Image listing
- Image deletion
- Ownership/security

DO NOT implement:

- PaddleOCR
- OCR processing
- OpenCV OCR preprocessing
- Translation
- OCR result storage
- OCR history
- YOLO
- Gemini
- SAM
- TTS
- Camera OCR processing

Those belong to later phases.

The AI service should remain unchanged except for keeping its existing health endpoint functional.

---

# 3. CLOUDINARY

Use Cloudinary as the image storage provider.

Required environment variables:

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

These values must come from environment variables.

NEVER hardcode them.

NEVER commit real secrets.

NEVER expose CLOUDINARY_API_SECRET to the frontend.

---

# 4. BACKEND ENVIRONMENT

The backend .env should contain:

PORT=3000

MONGODB_URI=

AI_SERVICE_URL=http://localhost:8000

JWT_SECRET=

JWT_EXPIRES_IN=1d

CLOUDINARY_CLOUD_NAME=

CLOUDINARY_API_KEY=

CLOUDINARY_API_SECRET=

Update backend/.env.example accordingly.

Do not expose real secret values in the repository.

---

# 5. CLOUDINARY FOLDER

Store uploaded images under a dedicated Cloudinary folder.

Recommended:

ocr-ai/uploads

The exact folder should be configurable if practical.

Do not mix application images with unrelated Cloudinary assets.

---

# 6. IMAGE MONGOOSE SCHEMA

Create an Image schema under:

backend/src/modules/images/

Recommended structure:

images/
├── images.module.ts
├── images.controller.ts
├── images.service.ts
├── schemas/
│   └── image.schema.ts
├── dto/
└── interfaces/

Image document should contain at minimum:

_id
userId
imageUrl
publicId
originalName
mimeType
size
width
height
createdAt
updatedAt

Where practical, use timestamps.

---

# 7. IMAGE OWNERSHIP

Every image MUST belong to exactly one authenticated user.

Example:

{
  "_id": "...",
  "userId": "...",
  "imageUrl": "...",
  "publicId": "...",
  "originalName": "menu.jpg",
  "mimeType": "image/jpeg",
  "size": 245678,
  "width": 1920,
  "height": 1080,
  "createdAt": "...",
  "updatedAt": "..."
}

userId must reference the authenticated user's ID.

Do NOT accept userId from the frontend upload request.

The backend must derive userId from the JWT authenticated user.

This is a SECURITY REQUIREMENT.

---

# 8. DATABASE INDEX

Create an index for userId.

Recommended:

userId + createdAt

This will support:

GET /api/images

for the current user.

---

# 9. IMAGE VALIDATION

Only allow real image MIME types.

Minimum allowed:

image/jpeg
image/png
image/webp

Optionally:

image/gif

if implementation is safe and useful.

Do not accept arbitrary files.

Reject:

- PDF
- ZIP
- EXE
- JS
- HTML
- SVG unless explicitly required
- arbitrary binary files

The validation must occur on the backend.

Do NOT trust only the frontend file extension.

---

# 10. FILE SIZE LIMIT

Define a reasonable maximum image size.

Recommended:

10 MB

Make this configurable where practical.

Example:

MAX_IMAGE_SIZE_MB=10

If file exceeds the limit:

Return:

HTTP 413 Payload Too Large

with a clean JSON error.

---

# 11. MULTIPART UPLOAD

Use NestJS-compatible multipart handling.

Multer may be used.

Prefer memory-based handling if uploading directly to Cloudinary.

Avoid unnecessary permanent local file storage.

The application should NOT depend on an uploads/ directory for persistent storage.

---

# 12. IMAGE UPLOAD API

Create:

POST /api/images

Authentication:

REQUIRED

Request:

Authorization: Bearer <JWT>

Content-Type:

multipart/form-data

Form field:

image

Example conceptual request:

POST /api/images
Authorization: Bearer <JWT>

multipart:
image = menu.jpg

---

# 13. UPLOAD FLOW

The backend must perform:

1. Authenticate JWT.
2. Verify an image file exists.
3. Validate MIME type.
4. Validate file size.
5. Upload image to Cloudinary.
6. Obtain Cloudinary URL.
7. Obtain Cloudinary public_id.
8. Extract image metadata if available.
9. Create MongoDB Image document.
10. Associate document with authenticated user.
11. Return sanitized image information.

Expected response:

{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "image": {
      "id": "...",
      "imageUrl": "...",
      "originalName": "menu.jpg",
      "mimeType": "image/jpeg",
      "size": 245678,
      "width": 1920,
      "height": 1080,
      "createdAt": "..."
    }
  }
}

Do not return unnecessary internal Cloudinary information.

Do not expose Cloudinary API credentials.

---

# 14. TRANSACTION / FAILURE HANDLING

Handle partial failures carefully.

Potential failure:

Cloudinary upload succeeds
BUT
MongoDB save fails.

In this situation, do not leave an orphaned Cloudinary asset if it can be safely deleted.

Recommended:

Cloudinary upload
      ↓
MongoDB save
      ↓
if MongoDB fails
      ↓
delete Cloudinary asset
      ↓
return error

Implement reasonable cleanup logic.

---

# 15. GET USER IMAGES

Create:

GET /api/images

Authentication:

REQUIRED

Return only images belonging to the authenticated user.

Example:

GET /api/images

Response:

{
  "success": true,
  "data": {
    "images": [
      {
        "id": "...",
        "imageUrl": "...",
        "originalName": "menu.jpg",
        "mimeType": "image/jpeg",
        "size": 245678,
        "createdAt": "..."
      }
    ]
  }
}

Sort newest first.

Do NOT return images belonging to other users.

---

# 16. GET IMAGE BY ID

Create:

GET /api/images/:id

Authentication:

REQUIRED

The endpoint must:

1. Authenticate the user.
2. Find the image.
3. Verify image ownership.
4. Return image information.

If image belongs to another user:

Return HTTP 403 or a secure equivalent.

Do not leak information about private resources.

---

# 17. DELETE IMAGE

Create:

DELETE /api/images/:id

Authentication:

REQUIRED

Flow:

JWT
 ↓
userId
 ↓
find image
 ↓
verify ownership
 ↓
delete Cloudinary asset
 ↓
delete MongoDB document
 ↓
return success

Do NOT allow User A to delete User B's image.

If Cloudinary deletion fails, handle the failure safely and do not blindly delete the database record without considering consistency.

---

# 18. SECURITY REQUIREMENTS

This section is critical.

The frontend must NEVER provide:

userId

for determining ownership.

The backend must use:

request.user.id

from JWT authentication.

Never trust:

- userId from request body
- userId from form data
- userId from query parameters

Ownership must always be server-side.

Example:

User A JWT
    ↓
request.user.id = A
    ↓
GET /api/images
    ↓
MongoDB query:
userId = A

Never:

GET /api/images?userId=A

as an ownership mechanism.

---

# 19. IMAGE ID VALIDATION

Validate MongoDB ObjectId before querying when applicable.

Malformed IDs should return a clean error.

Do not expose raw Mongoose errors.

---

# 20. CLOUDINARY SERVICE

Do not put all Cloudinary logic directly inside ImagesController.

Create a reusable Cloudinary service/provider.

Conceptual structure:

images/
  images.controller.ts
  images.service.ts
  schemas/
  dto/

common or infrastructure:

cloudinary/
  cloudinary.module.ts
  cloudinary.service.ts

The Cloudinary service should handle:

- upload
- delete
- configuration

The Image service should handle:

- ownership
- database persistence
- application business logic

Keep responsibilities separated.

---

# 21. FRONTEND — OCR PAGE

The existing /ocr page currently contains a placeholder.

Upgrade it into a real image upload interface.

The UI should contain:

1. Upload area
2. Drag and drop support if practical
3. File picker
4. Image preview
5. Selected filename
6. File size
7. Upload button
8. Upload progress/loading state
9. Success state
10. Error state

Do NOT implement OCR results yet.

After successful upload, display:

Image uploaded successfully.

And show the uploaded image.

---

# 22. FRONTEND FILE VALIDATION

Frontend may perform early validation for better UX.

Validate:

- file type
- file size

However:

IMPORTANT:

Frontend validation is NOT a security mechanism.

Backend validation remains mandatory.

---

# 23. IMAGE PREVIEW

Use browser APIs such as:

URL.createObjectURL()

or an equivalent safe approach.

Ensure temporary object URLs are properly released when necessary.

Do not upload the image automatically just because the user selected it.

The user should explicitly press Upload.

---

# 24. FRONTEND API SERVICE

Create reusable image API methods.

Example:

frontend/src/services/imageService.ts

Functions:

uploadImage(file)
getImages()
getImageById(id)
deleteImage(id)

Use the existing Axios client.

The Axios authentication interceptor from Phase 2 must continue to attach:

Authorization: Bearer <token>

Do not duplicate authentication logic inside every component.

---

# 25. IMAGE LIST

The /history page is still NOT the OCR history page.

For this phase, it may display uploaded images.

Example:

My Images

[image] [image] [image]

Each item can show:

- preview
- filename
- upload date
- delete button

Do not call this "OCR History" yet because OCR has not been implemented.

---

# 26. DASHBOARD

Update Dashboard only if necessary.

A small section may show:

Recent Images

or:

Uploaded Images

Do not implement unrelated dashboard features.

---

# 27. ERROR HANDLING

Use the existing global backend error handling architecture.

Expected errors:

401 Unauthorized
403 Forbidden
404 Not Found
413 Payload Too Large
415 Unsupported Media Type
400 Bad Request
500 Internal Server Error

Return clean JSON responses.

Example:

{
  "success": false,
  "message": "Unsupported image type",
  "error": "UNSUPPORTED_IMAGE_TYPE"
}

Do not expose:

- Cloudinary credentials
- MongoDB URI
- stack traces
- internal implementation details

---

# 28. LOADING STATES

Frontend must clearly handle:

Uploading...
Loading images...
Deleting...

Disable buttons when appropriate to avoid duplicate requests.

Prevent multiple simultaneous uploads unless explicitly designed.

---

# 29. DUPLICATE UPLOAD

Do not implement sophisticated duplicate-image detection in this phase.

Two identical files may be uploaded.

This is acceptable.

Do not add unnecessary AI or hashing logic.

---

# 30. IMAGE TRANSFORMATION

Do not implement advanced Cloudinary transformations yet.

Do not implement:

- OCR-specific cropping
- automatic enhancement
- AI image transformation
- background removal
- segmentation

These belong to future phases.

---

# 31. AI SERVICE

DO NOT implement OCR in this phase.

The FastAPI service must continue to expose:

GET /health

Expected:

{
  "status": "ok",
  "service": "ai-service"
}

No PaddleOCR processing is required yet.

---

# 32. ENVIRONMENT CONFIGURATION

Backend:

PORT=
MONGODB_URI=
AI_SERVICE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
MAX_IMAGE_SIZE_MB=10

Frontend:

VITE_API_URL=

Never expose:

CLOUDINARY_API_SECRET

to frontend.

---

# 33. DOCKER

If Docker configuration exists from Phase 1, keep it working.

Do not unnecessarily redesign Docker.

Cloudinary is an external service, so the backend container must receive:

CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

through environment variables.

Do not put secrets inside Dockerfile.

---

# 34. TESTING — BACKEND

Actually run tests.

Test at minimum:

### Authentication

1. Upload without JWT.
2. Upload with invalid JWT.
3. Upload with valid JWT.

### File validation

4. Valid JPG.
5. Valid PNG.
6. Valid WebP.
7. Unsupported file type.
8. File larger than configured limit.
9. Missing image field.

### Database

10. Verify Image document created.
11. Verify userId is correct.
12. Verify metadata is stored.

### Ownership

13. User A can retrieve User A images.
14. User A cannot retrieve User B private image.
15. User A cannot delete User B image.

### Delete

16. Delete existing owned image.
17. Verify Cloudinary asset deletion.
18. Verify MongoDB document deletion.

### Error handling

19. Invalid MongoDB image ID.
20. Non-existent image ID.

---

# 35. TESTING — FRONTEND

Test:

1. Unauthenticated user cannot access protected image functionality.
2. Authenticated user can select image.
3. Image preview works.
4. Invalid file type shows error.
5. Oversized image shows error.
6. Upload button works.
7. Loading state appears.
8. Successful upload displays image.
9. Image list loads.
10. Delete works.
11. Logout still works.
12. Authentication persistence still works.
13. Phase 1 HealthStatus still works.

---

# 36. INTEGRATION TEST

Verify:

React
  ↓
NestJS
  ↓
Cloudinary
  ↓
MongoDB

The actual uploaded image must be visible through the returned Cloudinary URL.

Verify:

MongoDB Image document
contains the same uploaded image information.

---

# 37. IMPORTANT SECURITY CHECK

Before declaring Phase 3 complete, inspect the project for accidentally exposed secrets.

Search source code for:

CLOUDINARY_API_SECRET
JWT_SECRET
MONGODB_URI

Make sure real values do not appear in:

- TypeScript source
- React source
- Python source
- README
- Git-tracked files
- Dockerfile
- frontend environment variables

Only backend runtime environment may contain the real Cloudinary secret.

---

# 38. GIT CHECK

Before completion:

Run a Git status/check if the project is under Git.

Verify:

.env

is ignored.

Do not commit:

- backend/.env
- secrets
- API keys
- credentials

---

# 39. DO NOT IMPLEMENT

Do NOT implement the following in Phase 3:

- PaddleOCR
- OpenCV OCR
- OCR result schema
- OCR history
- Translation
- Gemini
- YOLO
- SAM
- TTS
- OCR bounding boxes
- OCR confidence
- language detection
- OCR preprocessing
- camera OCR

Stop after Image Upload & Storage is working.

---

# 40. ACCEPTANCE CRITERIA

Phase 3 is COMPLETE only if:

[ ] Cloudinary configuration works.

[ ] Backend can upload images to Cloudinary.

[ ] Image metadata is stored in MongoDB.

[ ] Image belongs to authenticated user.

[ ] User cannot specify another userId.

[ ] Backend validates file type.

[ ] Backend validates file size.

[ ] Upload without JWT is rejected.

[ ] GET /api/images works.

[ ] Only user's own images are returned.

[ ] GET /api/images/:id works.

[ ] Ownership is verified.

[ ] DELETE /api/images/:id works.

[ ] Cloudinary asset is deleted.

[ ] MongoDB image document is deleted.

[ ] Frontend can select image.

[ ] Frontend preview works.

[ ] Frontend upload works.

[ ] Frontend displays uploaded image.

[ ] Frontend displays image list.

[ ] Frontend delete works.

[ ] Loading states work.

[ ] Error states work.

[ ] Authentication from Phase 2 still works.

[ ] Health checks from Phase 1 still work.

[ ] Backend build succeeds.

[ ] Frontend build succeeds.

[ ] AI service health check still works.

[ ] No secrets are committed.

---

# 41. DO NOT DECLARE COMPLETE WITHOUT VERIFICATION

Do not simply say "implemented".

Actually:

1. Start MongoDB connection.
2. Start FastAPI.
3. Start NestJS.
4. Start React.
5. Login.
6. Upload a real JPG.
7. Verify Cloudinary.
8. Verify MongoDB.
9. Retrieve image through API.
10. Retrieve image through frontend.
11. Delete image.
12. Verify Cloudinary deletion.
13. Verify MongoDB deletion.
14. Test ownership.
15. Test invalid file.
16. Test oversized file.
17. Test unauthenticated request.

Fix errors before completion.

---

# 42. PHASE 3 COMPLETION REPORT

After implementation, DO NOT start Phase 4.

Instead, produce a detailed report using the following structure:

## 1. Phase Information

Phase:
Phase name:
Status:

COMPLETE / PARTIAL / BLOCKED / FAILED

## 2. Requirement Checklist

| Requirement | Status | Implementation | Verified |
|-------------|--------|----------------|----------|

Include EVERY Phase 3 requirement.

## 3. Files Created

For every new file:

- Path
- Purpose
- Responsibility

## 4. Files Modified

For every modified file:

- Path
- Changes
- Reason

## 5. Database

Report:

- Image schema
- Fields
- Indexes
- userId relationship
- Sample document structure

Do not expose secrets.

## 6. Cloudinary

Report:

- Configuration
- Upload flow
- Delete flow
- Folder
- Cleanup strategy

Never print API secret.

## 7. API

| Method | Endpoint | Auth | Purpose | Status |
|--------|----------|------|---------|--------|

Include request/response examples.

## 8. Frontend

Report:

- Upload UI
- Preview
- Image list
- Delete
- Loading states
- Error states
- Services

## 9. Testing

Report actual tests executed.

Do not claim tests were run if they were not.

Include actual HTTP status codes.

## 10. Security Audit

Check:

- JWT
- ownership
- file validation
- file size
- secrets
- CORS
- MongoDB
- Cloudinary

## 11. Known Issues

List all known problems.

## 12. Unimplemented Items

Explicitly list features intentionally NOT implemented because they belong to future phases.

## 13. Architecture Impact

Confirm whether architecture remains:

React
 ↓
NestJS
 ↓
MongoDB
 ↓
FastAPI

and:

NestJS
 ↓
Cloudinary

## 14. Acceptance Criteria

| Criteria | Result | Evidence |
|----------|--------|----------|

## 15. Final Verdict

Choose:

✅ READY FOR REVIEW

⚠️ NEEDS FIXES

❌ NOT COMPLETE

## 16. Next Phase

Only recommend the next phase.

DO NOT implement it.

---

# 43. FINAL RULE

DO NOT START PHASE 4.

Wait for user approval.

After the report is generated, stop.