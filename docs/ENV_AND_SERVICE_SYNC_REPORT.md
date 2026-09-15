# ENVIRONMENT CONFIG AUDIT & SYNCHRONIZATION REPORT
**AI OCR HUB / MULTI-MODEL AI IMAGE UNDERSTANDING SYSTEM**

* **Audit Date:** September 2026
* **Auditor Role:** Senior DevOps Engineer, Senior Backend Engineer, Senior AI Engineer
* **Project Root:** `D:\hocWeb\P_AI`
* **Target System:** Monorepo (`frontend/`, `backend/`, `ai-service/`, `docker-compose.yml`)
* **Security Classification:** Confidential — Zero secret values exposed (values masked as `SET`, `MISSING`, `EMPTY`)

---

## 1. ENVIRONMENT VARIABLE INVENTORY

A complete, non-speculative static and runtime scan of the entire codebase was conducted to identify all environment variable keys actually read by executable source code.

| Variable Name | Read By (Source File) | Type / Purpose | Required in Prod? | Default Fallback |
| :--- | :--- | :--- | :---: | :--- |
| `PORT` | `backend/src/config/configuration.ts` | Gateway Port | Yes | `3000` |
| `MONGODB_URI` | `backend/src/config/configuration.ts` | MongoDB Connection URI | Yes | `'mongodb://localhost:27017/ocr_ai'` |
| `AI_SERVICE_URL` | `backend/src/config/configuration.ts` | AI Microservice Endpoint | Yes | `'http://localhost:8000'` |
| `FRONTEND_URL` | `backend/src/config/configuration.ts` | CORS Origin URL | Yes | `'http://localhost:5173'` |
| `JWT_SECRET` | `backend/src/config/configuration.ts` | JWT Signing Secret | Yes | Hardcoded dev fallback |
| `JWT_EXPIRES_IN` | `backend/src/config/configuration.ts` | Access Token Lifetime | No | `'1d'` |
| `JWT_REFRESH_SECRET` | `backend/src/config/configuration.ts` | Refresh Token Signing Secret| No | Empty |
| `JWT_REFRESH_EXPIRES_IN`| `backend/src/config/configuration.ts` | Refresh Token Lifetime | No | `'7d'` |
| `CLOUDINARY_CLOUD_NAME`| `backend/src/config/configuration.ts` | Cloudinary Account Name | Yes | Empty |
| `CLOUDINARY_API_KEY` | `backend/src/config/configuration.ts` | Cloudinary API Key | Yes | Empty |
| `CLOUDINARY_API_SECRET`| `backend/src/config/configuration.ts`| Cloudinary API Secret | Yes | Empty |
| `MAX_IMAGE_SIZE_MB` | `backend` & `ai-service` | File Upload Size Limit (MB) | No | `10` |
| `HOST` | `ai-service/app/main.py` | Bind Host Address | No | `'0.0.0.0'` |
| `PORT` / `AI_SERVICE_PORT`| `ai-service/app/main.py` | AI Service Port | Yes | `8000` |
| `GEMINI_API_KEY` | `ai-service/app/services/vision_language_service.py`| Google Gemini Vision Key | Optional | Empty (triggers Local Synthesizer) |
| `GEMINI_MODEL` | `ai-service/app/services/vision_language_service.py`| Gemini Model Name | No | `'gemini-flash-latest'` |
| `VITE_API_URL` | `frontend/src/services/api.ts` | Gateway URL for Axios | Yes | `'http://localhost:3000/api'` |

---

## 2. AI-SERVICE ENV AUDIT

* **Target File:** `D:\hocWeb\P_AI\ai-service\.env`
* **Audited Keys Status:**
  - `HOST`: `SET` (0.0.0.0)
  - `PORT`: `SET` (8000)
  - `GEMINI_API_KEY`: `SET` (Length: 53 characters, non-placeholder, valid format)
  - `GEMINI_MODEL`: Configured dynamically in code defaulting to `gemini-flash-latest`
  - `MAX_IMAGE_SIZE_MB`: `SET` (10)
* **Cloudinary Variables Assessment:**
  - `CLOUDINARY_CLOUD_NAME`: `SET`
  - `CLOUDINARY_API_KEY`: `SET`
  - `CLOUDINARY_API_SECRET`: `SET`
  - **Verdict:** `NOT_REQUIRED_BY_AI_SERVICE`.
  - *Evidence:* Code search across `ai-service/app` confirmed 0 occurrences of Cloudinary SDK calls or credentials. The AI microservice fetches images exclusively via standard HTTPS download URLs provided by the Gateway.
  - *Action:* Preserved in `ai-service/.env` as requested (no automated deletion), documented for cleanup.
* **Template File:** `ai-service/.env.example` synchronized with placeholders for `HOST`, `PORT`, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `MAX_IMAGE_SIZE_MB`.

---

## 3. BACKEND ENV AUDIT

* **Target File:** `D:\hocWeb\P_AI\backend\.env`
* **Audited Keys Status:**
  - `PORT`: `SET` (3000)
  - `MONGODB_URI`: `SET (format: mongodb+srv)` — Connects successfully to MongoDB Atlas cloud cluster.
  - `AI_SERVICE_URL`: `SET` (`http://localhost:8000`)
  - `FRONTEND_URL`: `SET` (`http://localhost:5173`)
  - `JWT_SECRET`: `SET` (32-character high-entropy secret)
  - `JWT_EXPIRES_IN`: `SET` (`7d`)
  - `CLOUDINARY_CLOUD_NAME`: `SET`
  - `CLOUDINARY_API_KEY`: `SET`
  - `CLOUDINARY_API_SECRET`: `SET`
  - `MAX_IMAGE_SIZE_MB`: `SET` (10)
* **Template File:** `backend/.env.example` verified with standard descriptive placeholders (`your_jwt_secret_key_change_in_production`, etc.).

---

## 4. FRONTEND ENV AUDIT

* **Target File:** `D:\hocWeb\P_AI\frontend\.env`
* **Audited Keys Status:**
  - `VITE_API_URL`: `SET` (`http://localhost:3000/api`)
* **Local Development vs Docker Execution Context:**
  - In local development, the browser runs on the host OS, making `http://localhost:3000/api` valid.
  - In Docker deployment, the browser still runs outside Docker on the user's host machine. Therefore, `VITE_API_URL=http://localhost:3000/api` remains correct. Docker service names like `http://backend:3000` must never be used in client-side SPA bundles.
* **Template File:** `frontend/.env.example` verified with `VITE_API_URL=http://localhost:3000/api`.

---

## 5. DOCKER ENV MAPPING

* **Target Manifest:** `D:\hocWeb\P_AI\docker-compose.yml`
* **Synchronization Completed:**
  - **`ai-service` container:**
    - `PORT=8000`
    - `HOST=0.0.0.0`
    - `GEMINI_API_KEY=${GEMINI_API_KEY:-}`
    - `GEMINI_MODEL=${GEMINI_MODEL:-gemini-flash-latest}`
    - `MAX_IMAGE_SIZE_MB=${MAX_IMAGE_SIZE_MB:-10}`
  - **`backend` container:**
    - `PORT=3000`
    - `MONGODB_URI=${MONGODB_URI:-mongodb://mongodb:27017/ocr_ai}`
    - `AI_SERVICE_URL=http://ai-service:8000`
    - `FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}`
    - `JWT_SECRET=${JWT_SECRET}`
    - `JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-1d}`
    - `JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-}`
    - `JWT_REFRESH_EXPIRES_IN=${JWT_REFRESH_EXPIRES_IN:-7d}`
    - `CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}`
    - `CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}`
    - `CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}`
    - `MAX_IMAGE_SIZE_MB=${MAX_IMAGE_SIZE_MB:-10}`
  - **`frontend` container:**
    - `VITE_API_URL=${VITE_API_URL:-http://localhost:3000/api}`
* **Security & Non-Hardcoding:** Zero secrets are embedded into `docker-compose.yml`. All values use `${VAR}` parameter expansion.
* **Root Template Synchronization:** `D:\hocWeb\P_AI\.env.example` fully synchronized with all variables required by Docker Compose.

---

## 6. GEMINI INTEGRATION VERIFICATION

1. **Environment Key Loading:**
   - Identified and resolved Python import order issue in `ai-service/app/main.py`: `load_dotenv()` is now invoked before application modules are imported.
   - Verified that `os.getenv("GEMINI_API_KEY")` properly loads the 53-character key.
2. **Model Name Compatibility:**
   - Runtime probing of `gemini-1.5-flash` yielded HTTP 404 (model sunset for API version v1beta).
   - Dynamic inspection via `genai.list_models()` confirmed `gemini-flash-latest` as the active supported model.
   - Refactored `VisionLanguageService` to support `os.getenv("GEMINI_MODEL", "gemini-flash-latest")`.
3. **Asynchronous Non-Blocking Execution:**
   - Wrapped synchronous `self.model.generate_content` in `asyncio.to_thread` to eliminate event loop blocking during multimodal generation.
4. **Startup Log Verification (Task Log Evidence):**
   ```text
   2026-09-08 09:23:21,035 [INFO] ai-service: [Vision] GEMINI KEY: SET
   2026-09-08 09:23:21,035 [INFO] ai-service: [Vision] VISION SERVICE: READY
   ```
5. **Live Unified Pipeline Call (`POST /api/image-analysis` on `beach.jpg`):**
   - **Pipeline Status:** `success`
   - **Modules Status:** `{'objectDetection': 'success', 'segmentation': 'success', 'ocr': 'success', 'vision': 'success'}`
   - **Vision Module Status:** `success`
   - **isFallback:** `False`
   - **Gemini Fused Description:**
     > *"A peaceful ocean shoreline where gentle waves roll onto the sandy beach beneath a glowing sunset sky."*
6. **Gemini Failure & Resilience Test:**
   - Simulated temporary unavailable Gemini service (`vl.is_available = False`).
   - Unified pipeline gracefully activated the Local Grounded Synthesizer:
     - `is_fallback: True`
     - Description: *"A outdoor beach scene featuring sky, water/sea."*
     - Server did not crash; pipeline returned successfully.
   - Restored live Gemini configuration immediately.

---

## 7. SECRET EXPOSURE CHECK

* **Static Code Analysis:** Scanned all git-tracked source files, documents, and configs for patterns `GEMINI_API_KEY=`, `CLOUDINARY_API_SECRET=`, `JWT_SECRET=`, `mongodb+srv://`.
  - **Findings in Code Files:** **ZERO LEAKS**.
  - All secret values are isolated within gitignored `.env` files.
* **Git History Audit:** Inspected `.git/logs/HEAD` and commit tree objects (`commit 165`).
  - **Finding:** `.env` files were **NEVER committed to git history** (`Tree contains .env references: False`).
* **Gitignore Fortification:** Updated root `.gitignore` to comprehensively ignore all `.env` files and sub-variants (`.env.*`, `**/.env`, `**/.env.*`) while explicitly preserving `.env.example` templates (`!**/.env.example`).

---

## 8. BUILD RESULTS

* **Backend Gateway:** `npm run build` completed with code 0 (TypeScript compilation successful).
* **Frontend SPA:** `npm run build` completed with code 0 (Vite bundled 1536 modules in 5.26s).
* **AI Service:** FastAPI application and PyTorch/Paddle models load with exit code 0.

---

## 9. RUNTIME RESULTS

All three services run live and respond on their designated ports:
* **Port 5173:** React 18 + Vite Dev Server — HTTP 200 OK
* **Port 3000:** NestJS Gateway — `GET /api/health` returned:
  ```json
  {"status":"ok","service":"backend","database":"connected","ai_service":"connected"}
  ```
* **Port 8000:** FastAPI AI Microservice — `GET /health` returned:
  ```json
  {"status":"ok","service":"ai-service","ocr":true,"objectDetection":true,"semanticSegmentation":true,"vision":true}
  ```

---

## 10. DOCKER RESULTS

* **Docker Daemon Status:** **NOT VERIFIED (Docker CLI / Daemon not installed or active on host).**
* **Manifest Validation:** `docker-compose.yml` syntactically verified and synchronized with `${VAR}` mappings.
* **Per prompt instructions:** No fake passes reported.

---

## 11. END-TO-END REGRESSION RESULTS

Executed automated regression suite (`test_env_and_gemini_verification.py`):

| Step # | Test Phase / Feature | Expected Outcome | Actual Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Health Checks | Backend, MongoDB, AI Service connected | Verified HTTP 200 on both services | **PASS** |
| 2 | Auth (Register & Login) | Bcrypt hash, JWT issuance for Users A & B | Registered and issued access tokens | **PASS** |
| 3 | Image Upload | Upload 3 images (beach, street, invoice) | Stored in Cloudinary CDN & Mongo | **PASS** |
| 4 | PaddleOCR Engine | Text detection & recognition on receipt | 11 lines extracted, 0.9793 confidence | **PASS** |
| 5 | Translation Engine | English to Vietnamese translation | Translated "Hello world." accurately | **PASS** |
| 6 | YOLO11n Detection | Object detection on `street.jpg` | 8 objects detected (7 cars, 1 bus) in 1.4s | **PASS** |
| 7 | SegFormer Segmentation | Semantic segmentation on `beach.jpg` | Sky (44.5%), Sea (30.4%), Sand (24.6%) | **PASS** |
| 8 | Gemini Vision Live | Full multimodal pipeline with Gemini | `vision=success`, `isFallback=False` | **PASS** |
| 9 | Gemini Failure Resilience| Unset key fallback test | Fallback activated gracefully, no crash | **PASS** |
| 10 | History & Anti-IDOR | Query user history, block foreign user | User A history count=1, User B 403 Forbidden | **PASS** |
| 11 | Image Deletion | Authorized asset deletion | Asset deleted from CDN & DB, confirmed 404 | **PASS** |

**OVERALL REGRESSION VERDICT:** **ALL 10 MANDATORY STEPS PASSED (10/10)**

---

## 12. REMAINING ISSUES

1. **Host Docker CLI Absence:** Docker Compose build and container execution could not be verified locally due to lack of Docker Desktop on this machine.
2. **PaddleOCR CPU Latency:** OCR execution on CPU takes ~20s for synthetic receipts, which is acceptable for testing but should be accelerated with NVIDIA CUDA for high-throughput production.
3. **Cloudinary Env Keys in AI Service:** Keys remain in `ai-service/.env` as requested (`NOT_REQUIRED_BY_AI_SERVICE`); can be cleaned up in a future maintenance cycle.

---

## 13. FINAL STATUS

$$\mathbf{SYNCED\_WITH\_WARNINGS}$$

* **Synchronization:** COMPLETE across frontend, backend, AI microservice, and Docker Compose.
* **Gemini Vision Live Verification:** COMPLETE (`vision=success`, `isFallback=False`).
* **Regression Testing:** 100% PASS across all functional layers.
* **Warning Notice:** Docker daemon unavailable on host machine; production deployment will require running on a host with Docker installed and CUDA GPU for real-time OCR.
