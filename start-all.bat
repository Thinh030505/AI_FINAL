@echo off
title AI OCR Hub - Full Stack Launcher
echo ===================================================
echo     LAUNCHING AI OCR APPLICATION FULL STACK
echo ===================================================

echo [0/3] Checking and freeing ports (3000, 8000, 5173)...
powershell -NoProfile -Command "try { Get-NetTCPConnection -LocalPort 3000, 8000, 5173 -ErrorAction Stop | ForEach-Object { taskkill /F /T /PID $_.OwningProcess 2>`$null; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {} ; exit 0"
timeout /t 1 /nobreak >nul

echo [1/3] Launching AI Service (FastAPI :8000)...
start "AI Service (FastAPI :8000)" cmd /k "cd /d D:\hocWeb\P_AI\ai-service && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [2/3] Launching Backend Gateway (NestJS :3000)...
start "Backend Gateway (NestJS :3000)" cmd /k "cd /d D:\hocWeb\P_AI\backend && npm run start:dev"

echo [3/3] Launching Frontend (React Vite :5173)...
start "Frontend (React Vite :5173)" cmd /k "cd /d D:\hocWeb\P_AI\frontend && npm run dev"

echo.
echo ===================================================
echo   ALL 3 SERVICES LAUNCHED SUCCESSFULLY!
echo   Frontend:       http://localhost:5173
echo   Backend Gateway: http://localhost:3000/api
echo   AI Service:     http://localhost:8000
echo ===================================================
pause
