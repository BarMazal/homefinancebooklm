@echo off
echo ===================================================
echo   Starting Home Finance BookLM Application
echo ===================================================

echo Cleaning up previous server instances on ports 8900 and 5190...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8900 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5190 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo Starting FastAPI Backend Server on http://127.0.0.1:8900 ...
start "Home Finance Backend" cmd /k "venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8900"

echo Starting Vite Frontend Server on http://localhost:5190 ...
start "Home Finance Frontend" cmd /k "cd frontend && npm run dev"

echo ===================================================
echo   Application Launched!
echo   Dashboard UI: http://localhost:5190
echo   API Docs:     http://127.0.0.1:8900/docs
echo ===================================================
