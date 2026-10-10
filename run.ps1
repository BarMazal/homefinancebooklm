# Home Finance BookLM Run Script

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Home Finance BookLM Application" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Terminate previous processes listening on ports 8000 and 5173
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "Stopping existing process on port 8000..." -ForegroundColor Yellow
    Stop-Process -Id $port8000.OwningProcess -Force -ErrorAction SilentlyContinue
}

$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "Stopping existing process on port 5173..." -ForegroundColor Yellow
    Stop-Process -Id $port5173.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "Starting FastAPI Backend Server on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000" -WorkingDirectory (Get-Location).Path

Write-Host "Starting Vite Frontend Server on http://localhost:5173 ..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd frontend && npm run dev" -WorkingDirectory (Get-Location).Path

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Application Launched!" -ForegroundColor Green
Write-Host "  Dashboard UI: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  API Docs:     http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
