# Home Finance BookLM Run Script (Interactive Mode)

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Home Finance BookLM Application" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$backendPort = 8910
$frontendPort = 5190

function Stop-PortProcesses($port) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            if ($pidToKill -and $pidToKill -gt 0) {
                Write-Host "[!] Stopping process $pidToKill on port $port..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                cmd.exe /c "taskkill /F /T /PID $pidToKill" >$null 2>&1
            }
        }
    }
}

# Dummy-proof check: Hebrew/English receipt OCR (Tesseract) must be installed
& powershell -ExecutionPolicy Bypass -File .\install_ocr.ps1 -CheckOnly
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Hebrew receipt OCR (Tesseract) is not installed - Hebrew receipts can't be read without it." -ForegroundColor Yellow
    $answer = Read-Host "    Install it now? [Y/n]"
    if ($answer -eq "" -or $answer -match "^[Yy]") {
        & powershell -ExecutionPolicy Bypass -File .\install_ocr.ps1
    } else {
        Write-Host "    Skipped. You can install it later from the Receipts page or by running install_ocr.ps1." -ForegroundColor DarkYellow
    }
}

# Stop any existing processes on ports 8910 and 5190
Stop-PortProcesses $backendPort
Stop-PortProcesses $frontendPort
Start-Sleep -Milliseconds 600

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
Write-Host "  API Docs:     http://127.0.0.1:$backendPort/docs" -ForegroundColor Cyan
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
    Stop-PortProcesses $backendPort
    Stop-PortProcesses $frontendPort
    Write-Host "[+] All servers stopped cleanly." -ForegroundColor Green
}
