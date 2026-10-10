# Home Finance BookLM Run Script (Interactive Mode)

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Home Finance BookLM Application" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$backendPort = 8900
$frontendPort = 5190

# Stop any existing processes on ports 8900 and 5190
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
$backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c venv\Scripts\activate.bat && uvicorn app.main:app --port $backendPort --reload" -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru

Write-Host "[+] Starting Vite Frontend Server on http://localhost:$frontendPort ..." -ForegroundColor Green
$frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd frontend && npm run dev" -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru

Start-Sleep -Seconds 2

# Automatically open Dashboard UI in default browser
Start-Process "http://localhost:$frontendPort"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Application Running!" -ForegroundColor Green
Write-Host "  Dashboard UI: http://localhost:$frontendPort (Opened in browser)" -ForegroundColor Yellow
Write-Host "  Press CTRL+C anytime in this window to stop both servers cleanly." -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Cyan

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "`n[!] Stopping Home Finance BookLM servers..." -ForegroundColor Yellow
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    # Clean up listening ports
    $p1 = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue
    if ($p1) { Stop-Process -Id $p1.OwningProcess -Force -ErrorAction SilentlyContinue }
    $p2 = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue
    if ($p2) { Stop-Process -Id $p2.OwningProcess -Force -ErrorAction SilentlyContinue }
    Write-Host "[+] All servers stopped cleanly." -ForegroundColor Green
}
