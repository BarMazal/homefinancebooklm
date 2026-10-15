@echo off
echo ===================================================
echo   Starting Home Finance BookLM Application
echo ===================================================

powershell -ExecutionPolicy Bypass -File "%~dp0install_ocr.ps1" -CheckOnly
if errorlevel 1 (
    echo [!] Hebrew receipt OCR ^(Tesseract^) is not installed - Hebrew receipts can't be read without it.
    choice /C YN /M "    Install it now"
    if not errorlevel 2 powershell -ExecutionPolicy Bypass -File "%~dp0install_ocr.ps1"
)

echo Cleaning up previous server instances on ports 8910 and 5190...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8910 ^| findstr LISTENING') do taskkill /f /t /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5190 ^| findstr LISTENING') do taskkill /f /t /pid %%a >nul 2>&1

echo Starting FastAPI Backend Server on http://127.0.0.1:8910 ...
start "Home Finance Backend" cmd /k "venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8910"

echo Starting Vite Frontend Server on http://localhost:5190 ...
start "Home Finance Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 2 /nobreak >nul 2>&1
start http://localhost:5190

echo ===================================================
echo   Application Launched!
echo   Dashboard UI: http://localhost:5190 (Opened in browser)
echo   API Docs:     http://127.0.0.1:8910/docs
echo ===================================================

