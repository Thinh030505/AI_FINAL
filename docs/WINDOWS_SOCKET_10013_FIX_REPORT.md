# Windows Socket 10013 Investigation & Resolution Report

**Project**: AI OCR Hub & Multimodal Understanding Workspace (`D:\hocWeb\P_AI`)  
**Service**: AI Service (`D:\hocWeb\P_AI\ai-service`)  
**Date**: September 8, 2026  
**Final Status**: `FIXED`  

---

## 1. Original Error

When launching the FastAPI / Uvicorn server via:
```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Windows returned the following fatal socket error:
```
ERROR: [WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions
```

---

## 2. Port 8000 Inspection

Executed command:
```powershell
netstat -ano | findstr :8000
```
**Actual Output**:
```
TCP    0.0.0.0:8000           0.0.0.0:0              LISTENING       9300
TCP    127.0.0.1:8000         127.0.0.1:55658        ESTABLISHED     9300
TCP    127.0.0.1:55658        127.0.0.1:8000         ESTABLISHED     7380
```
**Finding**: Port `8000` was already actively held in state `LISTENING` by process PID `9300`.

---

## 3. Process Holding Port

Executed command:
```powershell
Get-Process -Id 9300 | Select-Object Id, ProcessName, Path, StartTime
Get-CimInstance Win32_Process -Filter "ProcessId = 9300" | Select-Object ProcessId, CommandLine
```
**Actual Output**:
- **Process ID**: `9300`
- **Name**: `python.exe`
- **Path**: `C:\Users\thinh\AppData\Local\Programs\Python\Python312\python.exe`
- **Command Line**: `"C:\Users\thinh\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000`

**Finding**: Port `8000` was not held by a foreign service or Windows system process; it was held by an existing background instance of the project's own Uvicorn AI service.

---

## 4. Windows Excluded Port Range Result

To verify whether Windows Hyper-V, WSL, or WinNAT had dynamically reserved or excluded port `8000`:
```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
netsh interface ipv6 show excludedportrange protocol=tcp
```
**Actual Output**:
```
Protocol tcp Port Exclusion Ranges

Start Port    End Port      
----------    --------      
      5357        5357      

* - Administered port exclusions.
```
**Finding**: Port `8000` is **NOT** reserved or excluded by Windows in either IPv4 or IPv6. The error was purely caused by a duplicate bind attempt on an already occupied port.

---

## 5. Binding Test

1. **Stale Process Termination**:
   Terminated the background Uvicorn instance (PID `9300`) and verified port clearance:
   ```powershell
   Stop-Process -Id 9300 -Force
   netstat -ano | findstr :8000
   ```
   Port `8000` returned 0 listening sockets.

2. **0.0.0.0 Binding Verification**:
   Started Uvicorn on `0.0.0.0:8000`:
   ```powershell
   .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   **Result**:
   ```
   INFO:     Started server process [19328]
   INFO:     Waiting for application startup.
   INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
   ```
   Successfully bound to `0.0.0.0:8000` without any permission or socket errors.

---

## 6. Alternate Port Test

Not required as Option A (terminating stale process holding port `8000`) completely resolved the issue without requiring port reconfiguration.

---

## 7. Root Cause

1. The AI service process was already running in the background listening on `0.0.0.0:8000` (PID `9300`).
2. When a second instance of `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000` was launched in the user terminal, Windows WinSock rejected the second `bind()` call under `SO_EXCLUSIVEADDRUSE` with error code `WSAEACCES` (`[WinError 10013]`).

---

## 8. Fix Applied

1. Terminated the existing background instance PID `9300`.
2. Verified port `8000` is free via `netstat -ano | findstr :8000`.
3. Relaunched Uvicorn cleanly on `http://0.0.0.0:8000`.

---

## 9. Config Changes

- **Port Preserved**: Port `8000` was kept intact as prioritized in the requirements.
- No changes required to `ai-service/.env`, `backend/.env`, or `docker-compose.yml`.
- `AI_SERVICE_URL=http://localhost:8000` in `backend` remains 100% valid and untouched.

---

## 10. AI Health Test

Executed:
```powershell
Invoke-RestMethod http://localhost:8000/health
```
**Output**:
```json
{
  "status": "ok",
  "service": "ai-service",
  "ocr": true,
  "objectDetection": true,
  "semanticSegmentation": true,
  "vision": true
}
```
**Result**: `PASS` (All 4 AI models loaded and active).

---

## 11. Backend Health Test

Executed:
```powershell
Invoke-RestMethod http://localhost:3000/api/health
```
**Output**:
```json
{
  "status": "ok",
  "service": "backend",
  "database": "connected",
  "ai_service": "connected"
}
```
**Result**: `PASS` (`database=connected`, `ai_service=connected`).

---

## 12. Regression Test

Executed end-to-end full pipeline verification against the restored port 8000 service:
- `POST /api/auth/login`: `PASS` (JWT issued)
- `POST /api/images` (upload `beach.jpg`): `PASS` (Cloudinary + MongoDB record created)
- `POST /api/object-detection`: `PASS` (YOLO11n model inference verified)
- `POST /api/image-analysis`: `PASS` (Full pipeline: YOLO + SegFormer + PaddleOCR + Gemini Vision + AI Fusion)
- `DELETE /api/images/:id`: `PASS` (Asset and database cleanup verified)

---

## 13. Final Status

```
STATUS: FIXED
```
