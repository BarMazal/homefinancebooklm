# Home Finance BookLM - Hebrew/English receipt OCR installer (Tesseract)
# Installs Tesseract OCR via winget and downloads the Hebrew + English language data
# into the project's data\tessdata folder. Safe to run repeatedly: skips what's already there.
# Usage:  powershell -ExecutionPolicy Bypass -File install_ocr.ps1 [-CheckOnly]
param([switch]$CheckOnly)

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$tessData = Join-Path $projectRoot "data\tessdata"

function Find-Tesseract {
    $candidates = @(
        "C:\Program Files\Tesseract-OCR\tesseract.exe",
        "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        "$env:LOCALAPPDATA\Programs\Tesseract-OCR\tesseract.exe"
    )
    $found = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $found) {
        $cmd = Get-Command tesseract -ErrorAction SilentlyContinue
        if ($cmd) { $found = $cmd.Source }
    }
    return $found
}

function Test-OcrReady {
    return (Find-Tesseract) -and (Test-Path (Join-Path $tessData "heb.traineddata")) -and (Test-Path (Join-Path $tessData "eng.traineddata"))
}

if ($CheckOnly) {
    if (Test-OcrReady) { exit 0 } else { exit 1 }
}

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Installing Hebrew + English receipt OCR (Tesseract)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

if (-not (Find-Tesseract)) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Host "[!] winget is not available. Install Tesseract manually from:" -ForegroundColor Red
        Write-Host "    https://github.com/UB-Mannheim/tesseract/wiki" -ForegroundColor Yellow
    } else {
        Write-Host "[+] Installing Tesseract OCR (Windows may ask for permission)..." -ForegroundColor Yellow
        winget install --id UB-Mannheim.TesseractOCR -e --accept-source-agreements --accept-package-agreements
    }
} else {
    Write-Host "[=] Tesseract already installed: $(Find-Tesseract)" -ForegroundColor Green
}

New-Item -ItemType Directory -Force -Path $tessData | Out-Null
foreach ($lang in @("heb", "eng")) {
    $dest = Join-Path $tessData "$lang.traineddata"
    if (-not (Test-Path $dest)) {
        Write-Host "[+] Downloading $lang.traineddata..." -ForegroundColor Yellow
        try {
            Invoke-WebRequest -UseBasicParsing "https://github.com/tesseract-ocr/tessdata_best/raw/main/$lang.traineddata" -OutFile "$dest.part"
            Move-Item -Force "$dest.part" $dest
        } catch {
            Write-Host "[!] Failed to download $lang.traineddata: $($_.Exception.Message)" -ForegroundColor Red
            Remove-Item -Force "$dest.part" -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "[=] $lang.traineddata already present" -ForegroundColor Green
    }
}

if (Test-OcrReady) {
    Write-Host "[OK] Hebrew + English OCR is ready." -ForegroundColor Green
    exit 0
} else {
    Write-Host "[!] OCR setup is incomplete - receipts will still upload to NotebookLM, but won't be read locally." -ForegroundColor Red
    exit 1
}
