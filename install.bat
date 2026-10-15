@echo off
echo ===================================================
echo   Installing Home Finance BookLM Environment
echo ===================================================

if not exist venv (
    echo Creating Python Virtual Environment...
    python -m venv venv
)

echo Installing Python Backend Dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
playwright install chromium

echo Installing Tesseract OCR (Hebrew + English receipt OCR)...
powershell -ExecutionPolicy Bypass -File "%~dp0install_ocr.ps1"

echo Installing Frontend NPM Dependencies...
cd frontend
call npm install
cd ..

echo ===================================================
echo   Installation Complete! Run run.bat to start.
echo ===================================================
pause
