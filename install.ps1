# Home Finance BookLM Installation PowerShell Script

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Installing Home Finance BookLM Environment" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

if (-not (Test-Path -Path "venv")) {
    Write-Host "Creating Python Virtual Environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "Installing Python Backend Dependencies..." -ForegroundColor Yellow
& .\venv\Scripts\python.exe -m pip install --upgrade pip
& .\venv\Scripts\pip.exe install -r requirements.txt
& .\venv\Scripts\playwright.exe install chromium

Write-Host "Installing Tesseract OCR (Hebrew + English receipt OCR)..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File .\install_ocr.ps1

Write-Host "Installing Frontend NPM Dependencies..." -ForegroundColor Yellow
Push-Location frontend
npm install
Pop-Location

Write-Host "===================================================" -ForegroundColor Green
Write-Host "  Installation Complete! Run .\run.ps1 to start." -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
