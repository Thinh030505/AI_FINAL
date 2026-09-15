# PHASE 2 — AUTHENTICATION & USER MANAGEMENT

## 1. Context

PHASE 1 has been completed successfully.

Current architecture:

React + Vite + TypeScript
↓
NestJS
↓
MongoDB Atlas
↓
FastAPI AI Service

The following services are already working:

* Frontend: React + Vite + TypeScript + Tailwind
* Backend: NestJS + Mongoose
* Database: MongoDB Atlas
* AI Service: Python + FastAPI

Existing health checks:

GET /api/health

GET /health

Do NOT modify the existing architecture unnecessarily.

This phase introduces real user authentication.

---

# 2. Phase 2 Objective

Implement a complete authentication system:

1. User registration
2. User login
3. Password hashing
4. JWT access token
5. Authentication guard
6. Protected API
7. Current-user endpoint
8. Logout on frontend
9. Persistent login on frontend
10. User information displayed in dashboard

Authentication must be implemented primarily in the NestJS backend.

MongoDB stores user information.

The frontend communicates only with NestJS.

The frontend must NOT communicate directly with MongoDB.

The frontend must NOT communicate directly with FastAPI.

---

# 3. Technology

Backend:

* NestJS
* Mongoose
* MongoDB Atlas
* JWT
* Passport
* passport-jwt
* bcrypt or argon2
* class-validator
* class-transformer

Frontend:

* React
* TypeScript
* Axios
* React Router

Do not add unnecessary dependencies.

---

# 4. User Schema

Create a User schema.

Suggested fields:

_id
username
email
passwordHash
displayName
avatarUrl
role
createdAt
updatedAt

Default role:

"user"

Do not store plaintext passwords.

The field must be called passwordHash rather than password.

---

# 5. User Constraints

Email:

* Required
* Unique
* Lowercase
* Trimmed

Username:

* Required
* Unique
* Trimmed

Password:

* Required during registration
* Must NOT be stored directly
* Must be hashed before saving

Use appropriate MongoDB indexes for email and username.

---

# 6. Registration API

Create:

POST /api/auth/register

Request:

{
"username": "demo_user",
"email": "[demo@example.com](mailto:demo@example.com)",
"password": "password123",
"displayName": "Demo User"
}

Response should NOT expose passwordHash.

Example:

{
"success": true,
"message": "Registration successful",
"data": {
"user": {
"id": "...",
"username": "demo_user",
"email": "[demo@example.com](mailto:demo@example.com)",
"displayName": "Demo User",
"role": "user"
}
}
}

Do not return passwordHash.

---

# 7. Registration Validation

Validate:

* username is required
* email must be valid
* password must satisfy minimum length
* username must be unique
* email must be unique

If duplicate email:

Return an appropriate HTTP error.

If duplicate username:

Return an appropriate HTTP error.

Do not expose internal MongoDB errors directly to the client.

---

# 8. Password Hashing

Passwords must NEVER be stored as plaintext.

Use bcrypt or argon2.

Recommended:

bcrypt with an appropriate salt factor.

Flow:

User password
↓
Password hashing
↓
passwordHash
↓
MongoDB

Never log passwords.

Never return passwords.

---

# 9. Login API

Create:

POST /api/auth/login

Request:

{
"email": "[demo@example.com](mailto:demo@example.com)",
"password": "password123"
}

Flow:

email
↓
find user
↓
compare password
↓
generate JWT
↓
return token + user

Example response:

{
"success": true,
"message": "Login successful",
"data": {
"accessToken": "...",
"user": {
"id": "...",
"username": "demo_user",
"email": "[demo@example.com](mailto:demo@example.com)",
"displayName": "Demo User",
"role": "user"
}
}
}

Never return passwordHash.

---

# 10. JWT

Use JWT access tokens.

JWT payload should contain minimal information.

Example:

{
"sub": "userId",
"username": "demo_user",
"role": "user"
}

Do not put:

* password
* passwordHash
* unnecessary personal data

inside the JWT.

JWT secret must come from environment variables.

Example:

JWT_SECRET=your_secret_here

JWT expiration must also be configurable.

Example:

JWT_EXPIRES_IN=1d

Do not hardcode secrets.

---

# 11. JWT Guard

Create a reusable JWT authentication guard.

Example protected endpoint:

GET /api/auth/me

Without valid JWT:

HTTP 401

With valid JWT:

Return current authenticated user.

The guard must be reusable by future modules.

Future modules such as:

* images
* OCR
* history
* translations

will use the same authentication mechanism.

---

# 12. Current User API

Create:

GET /api/auth/me

Request header:

Authorization: Bearer <accessToken>

Response:

{
"success": true,
"data": {
"user": {
"id": "...",
"username": "demo_user",
"email": "[demo@example.com](mailto:demo@example.com)",
"displayName": "Demo User",
"role": "user"
}
}
}

Never return passwordHash.

---

# 13. Authentication Module Structure

Recommended:

backend/src/modules/auth/

auth.module.ts
auth.controller.ts
auth.service.ts
dto/
register.dto.ts
login.dto.ts
guards/
jwt-auth.guard.ts
strategies/
jwt.strategy.ts
interfaces/

User-related code should remain inside:

backend/src/modules/users/

Example:

users/
users.module.ts
users.service.ts
schemas/
user.schema.ts
dto/

Keep authentication logic and user persistence logic separated.

---

# 14. Frontend Authentication

Implement actual login and registration.

Existing placeholder pages:

/login
/register

must now become functional.

Registration flow:

Register form
↓
POST /api/auth/register
↓
success
↓
redirect to /login

Login flow:

Login form
↓
POST /api/auth/login
↓
receive accessToken
↓
store authentication state
↓
redirect to /dashboard

---

# 15. Axios Configuration

Create a reusable Axios API client.

Example conceptual structure:

frontend/src/services/api.ts

The API base URL must come from:

VITE_API_URL

Do not hardcode:

http://localhost:3000/api

inside components.

---

# 16. Authentication State

Create a centralized authentication state.

Use either:

* React Context

or

* Zustand

Choose ONE.

Do not introduce both.

Authentication state should contain:

* current user
* access token
* isAuthenticated
* loading state

---

# 17. Protected Routes

Dashboard, OCR and History should require authentication.

Routes:

/dashboard
/ocr
/history

If unauthenticated:

redirect to:

/login

Public routes:

/
/login
/register

Do not allow unauthenticated users to access protected pages.

---

# 18. Token Persistence

The application must preserve authentication after browser refresh.

Choose a reasonable approach for this project.

For this student project, a simple token persistence mechanism may be used.

However:

* Do not store passwords.
* Do not expose JWT secrets to frontend.
* Keep the implementation modular so it can later be upgraded to httpOnly cookies if needed.

---

# 19. Logout

Implement frontend logout.

Logout should:

* clear authentication state
* remove persisted access token
* redirect to /login

At this stage, server-side token revocation is NOT required.

JWT is stateless.

---

# 20. Dashboard

Update Dashboard to display authenticated user information.

Example:

Welcome, Demo User

Email:
[demo@example.com](mailto:demo@example.com)

Buttons:

* OCR
* History
* Logout

Do not implement OCR functionality yet.

---

# 21. Navbar

The existing Navbar / HealthStatus must continue working.

Do NOT break:

GET /api/health

HealthStatus should continue to show:

* Backend
* Database
* AI Service

Authentication must not interfere with health checking.

---

# 22. Security Requirements

Strictly follow:

* Never store plaintext password
* Never return passwordHash
* Never log passwords
* Never expose JWT secret
* Validate all input
* Sanitize appropriate fields
* Use HTTP 401 for authentication failures
* Use HTTP 409 where appropriate for duplicate resources
* Do not expose raw database errors

---

# 23. Environment Variables

Backend .env should contain:

PORT=3000

MONGODB_URI=

AI_SERVICE_URL=http://localhost:8000

JWT_SECRET=

JWT_EXPIRES_IN=1d

Frontend:

VITE_API_URL=http://localhost:3000/api

Update .env.example accordingly.

Do not commit real .env files.

---

# 24. MongoDB User Collection

After registration, MongoDB should contain a user document similar to:

{
"_id": "...",
"username": "demo_user",
"email": "[demo@example.com](mailto:demo@example.com)",
"passwordHash": "...",
"displayName": "Demo User",
"role": "user",
"createdAt": "...",
"updatedAt": "..."
}

The password field must NOT exist.

Only passwordHash is allowed.

---

# 25. Error Handling

Use the existing global error handling architecture from Phase 1.

Maintain a consistent response structure.

Example:

{
"success": false,
"message": "Invalid credentials",
"error": "INVALID_CREDENTIALS"
}

Do not expose sensitive implementation details.

---

# 26. Testing Requirements

Test backend:

1. Register valid user.
2. Register duplicate email.
3. Register duplicate username.
4. Register invalid email.
5. Register short password.
6. Login valid credentials.
7. Login invalid credentials.
8. Access /api/auth/me without token.
9. Access /api/auth/me with invalid token.
10. Access /api/auth/me with valid token.

Test frontend:

1. Register successfully.
2. Login successfully.
3. Redirect to dashboard.
4. Refresh browser and remain authenticated.
5. Open /dashboard without authentication.
6. Verify redirect to /login.
7. Logout.
8. Verify redirect to /login.
9. Verify user information appears in dashboard.
10. Verify HealthStatus still works.

---

# 27. Acceptance Criteria

Phase 2 is complete only when:

[ ] User registration works.

[ ] Password is hashed.

[ ] User is stored in MongoDB Atlas.

[ ] Password is never stored as plaintext.

[ ] Login works.

[ ] JWT is generated.

[ ] JWT guard works.

[ ] /api/auth/me works.

[ ] Protected routes work.

[ ] Frontend login works.

[ ] Frontend registration works.

[ ] Frontend logout works.

[ ] Authentication persists after refresh.

[ ] Dashboard displays current user.

[ ] Existing health check still works.

[ ] No real secrets are committed.

[ ] No passwordHash is returned through API.

[ ] Existing Phase 1 functionality remains intact.

---

# 28. IMPORTANT — DO NOT IMPLEMENT YET

Do NOT implement:

* Image upload
* Cloudinary
* S3
* Multer
* PaddleOCR
* OpenCV OCR preprocessing
* Translation
* OCR history
* YOLO
* Gemini
* SAM
* TTS

These belong to later phases.

Do not modify the AI service except where necessary to keep its health endpoint working.

---

# 29. Final Verification

Before declaring Phase 2 complete:

1. Start MongoDB / MongoDB Atlas connection.
2. Start AI Service.
3. Start NestJS.
4. Start React.
5. Register a test account.
6. Verify user exists in MongoDB.
7. Verify only passwordHash exists.
8. Login.
9. Copy JWT.
10. Test /api/auth/me.
11. Test protected frontend routes.
12. Logout.
13. Test protected route again.
14. Verify Phase 1 health checks remain functional.

Fix all errors before completion.

Do NOT automatically continue to Phase 3.

At the end, provide:

* Files created/modified
* API endpoints
* MongoDB schema
* Authentication flow
* Environment variables
* Test results
* Known issues
* Recommended next phase

WAIT FOR USER APPROVAL BEFORE MOVING TO PHASE 3.
