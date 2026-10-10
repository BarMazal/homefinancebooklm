# Home Finance BookLM Run Script

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Home Finance BookLM Application" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$backendPort = 8900
$frontendPort = 5190

# Terminate previous processes listening on ports 8900 and 5190
$portBackend = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue
if ($portBackend) {
    Write-Host "[!] Stopping existing process on port $backendPort..." -ForegroundColor Yellow
    Stop-Process -Id $portBackend.OwningProcess -Force -ErrorAction SilentlyContinue
}

$portFrontend = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue
if ($portFrontend) {
    Write-Host "[!] Stopping existing process on port $frontendPort..." -ForegroundColor Yellow
    Stop-Process -Id $portFrontend.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "[+] Starting FastAPI Backend Server on http://127.0.0.1:$backendPort ..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k venv\Scripts\activate.bat && uvicorn app.main:app --reload --port $backendPort" -WorkingDirectory (Get-Location).Path

Write-Host "[+] Starting Vite Frontend Server on http://localhost:$frontendPort ..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd frontend && npm run dev" -WorkingDirectory (Get-Location).Path

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Application Launched!" -ForegroundColor Green
Write-Host "  Dashboard UI: http://localhost:$frontendPort" -ForegroundColor Yellow
Write-Host "  API Docs:     http://127.0.0.1:$backendPort/docs" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
