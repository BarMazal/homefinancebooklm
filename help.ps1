# ==============================================================================
#  Home Finance BookLM - Operations & Setup Manual (help.ps1)
# ==============================================================================
#  Usage:
#    .\help.ps1                      # Displays the complete interactive guide
#    .\help.ps1 -Topic Quick         # Shows the concise 2-sentence summary & quick commands
#    .\help.ps1 -Topic Servers       # How to run, inspect, and kill servers
#    .\help.ps1 -Topic NotebookLM    # NotebookLM roles & connection instructions
#    .\help.ps1 -Topic Usage         # Overview of web application features & modules
#    .\help.ps1 -CheckStatus         # Checks if backend (8910) or frontend (5190) are running
#    .\help.ps1 -KillServers         # Immediately terminates running servers on ports 8910/5190
# ==============================================================================

param (
    [ValidateSet("All", "Quick", "Servers", "NotebookLM", "Usage", "Roles")]
    [string]$Topic = "All",
    [switch]$KillServers,
    [switch]$CheckStatus
)

[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$backendPort = 8910
$frontendPort = 5190

# ------------------------------------------------------------------------------
# Action: Kill Servers
# ------------------------------------------------------------------------------
if ($KillServers) {
    Write-Host "`n==================================================================" -ForegroundColor Yellow
    Write-Host "  Stopping Home Finance BookLM Servers (Ports $backendPort & $frontendPort)" -ForegroundColor Yellow
    Write-Host "==================================================================" -ForegroundColor Yellow

    $ports = @($backendPort, $frontendPort)
    $killedCount = 0
    foreach ($p in $ports) {
        $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($procId in $pids) {
                if ($procId -and $procId -gt 0 -and $procId -ne $PID) {
                    Write-Host "  [!] Stopping process $procId listening on port $p..." -ForegroundColor Red
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    cmd.exe /c "taskkill /F /T /PID $procId" >$null 2>&1
                    $killedCount++
                }
            }
        }
    }

    # Also clean up any lingering uvicorn processes
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { 
        $_.CommandLine -like "*uvicorn app.main:app*" -or 
        ($_.CommandLine -like "*vite*" -and $_.CommandLine -like "*$frontendPort*")
    } | ForEach-Object {
        Write-Host "  [!] Terminating server process (PID $($_.ProcessId))..." -ForegroundColor Red
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        $killedCount++
    }

    Start-Sleep -Milliseconds 500
    Write-Host "`n  [+] Kill operation completed. Terminated $killedCount process(es)." -ForegroundColor Green
    Write-Host "==================================================================`n" -ForegroundColor Yellow
    Exit 0
}

# ------------------------------------------------------------------------------
# Action: Check Server Status
# ------------------------------------------------------------------------------
if ($CheckStatus) {
    Write-Host "`n==================================================================" -ForegroundColor Cyan
    Write-Host "  Checking Home Finance BookLM Server Status" -ForegroundColor Cyan
    Write-Host "==================================================================" -ForegroundColor Cyan

    $backendConn = Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue
    if ($backendConn) {
        $bPid = ($backendConn | Select-Object -ExpandProperty OwningProcess -Unique)[0]
        Write-Host "  [●] FastAPI Backend Server is RUNNING on port $backendPort (PID: $bPid)" -ForegroundColor Green
        Write-Host "      API Docs: http://127.0.0.1:$backendPort/docs" -ForegroundColor DarkGray
    } else {
        Write-Host "  [○] FastAPI Backend Server is STOPPED (Port $backendPort is free)" -ForegroundColor DarkGray
    }

    $frontendConn = Get-NetTCPConnection -LocalPort $frontendPort -State Listen -ErrorAction SilentlyContinue
    if ($frontendConn) {
        $fPid = ($frontendConn | Select-Object -ExpandProperty OwningProcess -Unique)[0]
        Write-Host "  [●] Vite Frontend Server is RUNNING on port $frontendPort (PID: $fPid)" -ForegroundColor Green
        Write-Host "      Dashboard UI: http://localhost:$frontendPort" -ForegroundColor DarkGray
    } else {
        Write-Host "  [○] Vite Frontend Server is STOPPED (Port $frontendPort is free)" -ForegroundColor DarkGray
    }

    Write-Host "==================================================================`n" -ForegroundColor Cyan
    Exit 0
}

# ------------------------------------------------------------------------------
# Section: What the Application Does (Two-Sentence Summary)
# ------------------------------------------------------------------------------
function Show-Overview {
    Write-Host "`n================================================================================" -ForegroundColor Cyan
    Write-Host "  HOME FINANCE BOOKLM - APPLICATION OVERVIEW" -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "Home Finance BookLM is a multi-account personal finance management, ingestion, and" -ForegroundColor White
    Write-Host "decision-support application that unifies bank accounts, credit cards, investments," -ForegroundColor White
    Write-Host "pensions, and real estate into one cohesive dashboard." -ForegroundColor White
    Write-Host "It combines local structured SQLite storage and deterministic financial engines" -ForegroundColor White
    Write-Host "(such as multi-currency XIRR calculation and mortgage amortization) with Google" -ForegroundColor White
    Write-Host "NotebookLM AI intelligence for semantic document analysis, OCR receipt parsing," -ForegroundColor White
    Write-Host "pension auditing, and retroactive history extraction." -ForegroundColor White
    Write-Host "================================================================================" -ForegroundColor Cyan
}

# ------------------------------------------------------------------------------
# Section: How to Run the Application
# ------------------------------------------------------------------------------
function Show-RunningGuide {
    Write-Host "`n--------------------------------------------------------------------------------" -ForegroundColor Green
    Write-Host "  1. HOW TO RUN THE APPLICATION" -ForegroundColor Green
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Green
    Write-Host "  Launch the application using either of the provided start scripts:" -ForegroundColor White
    Write-Host ""
    Write-Host "  PowerShell (Recommended Interactive Mode):" -ForegroundColor Yellow
    Write-Host "    .\run.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Windows Command Prompt / Batch Mode:" -ForegroundColor Yellow
    Write-Host "    .\run.bat" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  What happens automatically on startup:" -ForegroundColor White
    Write-Host "    1. Cleans up any orphaned processes previously listening on ports 8910 or 5190." -ForegroundColor Gray
    Write-Host "    2. Launches FastAPI backend server on http://127.0.0.1:8910" -ForegroundColor Gray
    Write-Host "    3. Launches Vite frontend dev server on http://localhost:5190" -ForegroundColor Gray
    Write-Host "    4. Automatically opens the dashboard UI in your default web browser." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Quick Access URLs:" -ForegroundColor White
    Write-Host "    - Web Dashboard: http://localhost:5190" -ForegroundColor Yellow
    Write-Host "    - API Docs (Swagger): http://127.0.0.1:8910/docs" -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# Section: How to Kill / Stop the Servers
# ------------------------------------------------------------------------------
function Show-KillGuide {
    Write-Host "`n--------------------------------------------------------------------------------" -ForegroundColor Red
    Write-Host "  2. HOW TO KILL / STOP THE SERVERS" -ForegroundColor Red
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Red
    Write-Host "  Method A - Clean Terminal Exit (Interactive Mode):" -ForegroundColor White
    Write-Host "    If you started the servers using '.\run.ps1', simply press CTRL+C in that" -ForegroundColor Gray
    Write-Host "    PowerShell console. The finally block will automatically stop both processes" -ForegroundColor Gray
    Write-Host "    and free the ports." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Method B - Quick One-Command Force Kill (From this script):" -ForegroundColor White
    Write-Host "    .\help.ps1 -KillServers" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Method C - Manual PowerShell Port Termination:" -ForegroundColor White
    Write-Host '    Get-NetTCPConnection -LocalPort 8910, 5190 -ErrorAction SilentlyContinue |' -ForegroundColor Gray
    Write-Host '      Select-Object -ExpandProperty OwningProcess -Unique |' -ForegroundColor Gray
    Write-Host '      ForEach-Object { Stop-Process -Id $_ -Force }' -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Method D - Manual Windows Command Prompt (CMD):" -ForegroundColor White
    Write-Host '    for /f "tokens=5" %a in (''netstat -aon ^| findstr :8910 ^| findstr LISTENING'') do taskkill /f /t /pid %a' -ForegroundColor Gray
    Write-Host '    for /f "tokens=5" %a in (''netstat -aon ^| findstr :5190 ^| findstr LISTENING'') do taskkill /f /t /pid %a' -ForegroundColor Gray
}

# ------------------------------------------------------------------------------
# Section: How to Use the Application
# ------------------------------------------------------------------------------
function Show-UsageGuide {
    Write-Host "`n--------------------------------------------------------------------------------" -ForegroundColor Magenta
    Write-Host "  3. HOW TO USE THE APPLICATION" -ForegroundColor Magenta
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Magenta
    Write-Host "  Open http://localhost:5190 in your browser. The application offers 8 main views:" -ForegroundColor White
    Write-Host ""
    Write-Host "  - Dashboard:" -ForegroundColor Yellow
    Write-Host "    High-level financial snapshot showing net worth, monthly burn rate, cash flow" -ForegroundColor Gray
    Write-Host "    trends, spending breakdown, and portfolio asset allocation." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  - Accounts & Transactions:" -ForegroundColor Yellow
    Write-Host "    Manage bank accounts, credit cards, cash, and investments. Import statements" -ForegroundColor Gray
    Write-Host "    (CSV, Excel, PDF) with automatic categorization and hierarchical expense clusters." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  - Receipts & OCR Processing:" -ForegroundColor Yellow
    Write-Host "    Upload receipts (images or PDFs) processed via dual OCR (EasyOCR / PyTesseract" -ForegroundColor Gray
    Write-Host "    and NotebookLM). Review merchant, date, tax, and line items with visual confidence" -ForegroundColor Gray
    Write-Host "    scoring, and reconcile confirmed receipts against bank line items." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  - Savings & XIRR Portfolio:" -ForegroundColor Yellow
    Write-Host "    Track liquid savings and kids' funds across multiple currencies (ILS/USD). Live" -ForegroundColor Gray
    Write-Host "    Bank of Israel FX rates normalize foreign assets and compute exact dynamic XIRR." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  - Pensions & Insurance Audit:" -ForegroundColor Yellow
    Write-Host "    Scan Israeli annual pension reports (Annual Statement) and insurance policies." -ForegroundColor Gray
    Write-Host "    Extracts management fees (% from deposit vs. % from accumulation), policy costs," -ForegroundColor Gray
    Write-Host "    and highlights duplicate coverage (Duplicate Coverage)." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  - Real Estate & Mortgage Intelligence:" -ForegroundColor Yellow
    Write-Host "    Track mortgage schedules across loan tracks (CPI-linked, Fixed, Prime), and compare" -ForegroundColor Gray
    Write-Host "    net rental yield against stock market returns adjusted for Israeli capital gains tax." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  - Scenario Simulator:" -ForegroundColor Yellow
    Write-Host "    Model financial stress tests: interest rate shifts (+/- 0.5% or 1%), savings" -ForegroundColor Gray
    Write-Host "    reallocations, and life events / separation asset splitting (50/50 or custom)." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  - Settings & Multi-Profile Management:" -ForegroundColor Yellow
    Write-Host "    Switch between isolated user profiles (Profile 1, Profile 2, etc.), customize" -ForegroundColor Gray
    Write-Host "    currency/theme preferences, and manage Google NotebookLM connectivity." -ForegroundColor Gray
}

# ------------------------------------------------------------------------------
# Section: NotebookLM Roles in the Application
# ------------------------------------------------------------------------------
function Show-RolesGuide {
    Write-Host "`n--------------------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "  4. GOOGLE NOTEBOOKLM ROLES IN HOME FINANCE BOOKLM" -ForegroundColor Cyan
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "  Google NotebookLM acts as the intelligent semantic and RAG (Retrieval-Augmented" -ForegroundColor White
    Write-Host "  Generation) brain of the application, serving four critical roles:" -ForegroundColor White
    Write-Host ""
    Write-Host "  1. Semantic Receipt & Statement Extraction:" -ForegroundColor Yellow
    Write-Host "     Transforms unstructured Hebrew and English receipt text, invoices, and bank" -ForegroundColor Gray
    Write-Host "     PDF statements into structured transactions, line items, and merchant data." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Pension & Insurance Document Auditing:" -ForegroundColor Yellow
    Write-Host "     Analyzes complex Israeli pension reports and insurance policy riders to identify" -ForegroundColor Gray
    Write-Host "     fee ceilings, hidden charges, and overlapping insurance policies without requiring" -ForegroundColor Gray
    Write-Host "     the user to be an insurance expert." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Retroactive Financial History Extraction & Sync:" -ForegroundColor Yellow
    Write-Host "     Scans notes and sources inside linked notebooks to extract past financial records." -ForegroundColor Gray
    Write-Host "     Provides an interactive review modal with duplicate/conflict detection before" -ForegroundColor Gray
    Write-Host "     committing clean data into the local SQLite database." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  4. Personal RAG Research & Advisor Layer:" -ForegroundColor Yellow
    Write-Host "     Enables users to query their personal financial corpus and domain-expert" -ForegroundColor Gray
    Write-Host "     notebooks (tax laws, mortgage strategies, retirement plans) directly within" -ForegroundColor Gray
    Write-Host "     the application using state-of-the-art Gemini reasoning." -ForegroundColor Gray
}

# ------------------------------------------------------------------------------
# Section: How to Connect to NotebookLM (App & CLI)
# ------------------------------------------------------------------------------
function Show-ConnectionGuide {
    Write-Host "`n--------------------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "  5. HOW TO CONNECT TO NOTEBOOKLM ACCOUNT" -ForegroundColor Yellow
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "  Home Finance BookLM supports dedicated, isolated Google sessions per user profile" -ForegroundColor White
    Write-Host "  (e.g., 'homefinance_p1') so multiple profiles or other apps never collide." -ForegroundColor White
    Write-Host ""
    Write-Host "  ----------------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  METHOD A: Connect From the Web Application (Recommended & 1-Click UI)" -ForegroundColor Cyan
    Write-Host "  ----------------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "    1. Start the app and open http://localhost:5190 in your browser." -ForegroundColor White
    Write-Host "    2. Click on the 'Settings' tab in the left navigation sidebar." -ForegroundColor White
    Write-Host "    3. Scroll to the 'Google NotebookLM Connection' card." -ForegroundColor White
    Write-Host "    4. Click 'Sign in to Google Account' (or 'Launch Sign-In Browser')." -ForegroundColor White
    Write-Host "       -> An isolated Chromium window opens directly to https://notebooklm.google.com" -ForegroundColor Gray
    Write-Host "    5. Complete Google sign-in with your desired account credentials in the window." -ForegroundColor White
    Write-Host "       -> The application detects successful sign-in, saves isolated session cookies" -ForegroundColor Gray
    Write-Host "          to data/profile_<id>/storage_state.json, and automatically closes the browser." -ForegroundColor Gray
    Write-Host "    6. Click 'Browse & Select Notebook' to view all notebooks in your account," -ForegroundColor White
    Write-Host "       and click 'Select Notebook' to link your financial notebook to the profile." -ForegroundColor White
    Write-Host ""
    Write-Host "  ----------------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  METHOD B: Connect From the Command Line (CLI)" -ForegroundColor Cyan
    Write-Host "  ----------------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "    The project includes the 'notebooklm-py' CLI inside the virtual environment." -ForegroundColor White
    Write-Host "    Always specify the profile flag (--profile homefinance_p<id>) to keep session" -ForegroundColor White
    Write-Host "    credentials completely isolated per profile:" -ForegroundColor White
    Write-Host ""
    Write-Host "    Step 1: Sign in with fresh credentials via CLI" -ForegroundColor Yellow
    Write-Host "      .\venv\Scripts\notebooklm.exe --profile homefinance_p1 login --fresh" -ForegroundColor Cyan
    Write-Host "      (This opens an authentication browser window. Sign in with Google to finish)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "    Step 2: Verify login and list available notebooks" -ForegroundColor Yellow
    Write-Host "      .\venv\Scripts\notebooklm.exe --profile homefinance_p1 list" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "    Step 3: Link Notebook ID to Active Profile" -ForegroundColor Yellow
    Write-Host "      Copy your Notebook ID from the CLI output (or from the URL at" -ForegroundColor White
    Write-Host "      https://notebooklm.google.com/notebook/<NOTEBOOK_ID>)." -ForegroundColor White
    Write-Host "      You can link it directly via the Backend API from PowerShell:" -ForegroundColor White
    Write-Host '      $body = @{ notebook_id = "YOUR_NOTEBOOK_ID" } | ConvertTo-Json' -ForegroundColor Gray
    Write-Host '      Invoke-RestMethod -Uri "http://127.0.0.1:8910/api/notebooklm/link-notebook" -Method Post -ContentType "application/json" -Body $body' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "    Alternative Python Auth Launcher (Interactive Headed Capture):" -ForegroundColor Yellow
    Write-Host "      .\venv\Scripts\python.exe -m app.services.auth_launcher 1 homefinance_p1" -ForegroundColor Cyan
}

# ------------------------------------------------------------------------------
# Dispatcher
# ------------------------------------------------------------------------------
switch ($Topic) {
    "Quick" {
        Show-Overview
        Write-Host "`nQuick Server Commands:" -ForegroundColor Yellow
        Write-Host "  Start: .\run.ps1" -ForegroundColor Cyan
        Write-Host "  Stop:  .\help.ps1 -KillServers" -ForegroundColor Red
        Write-Host "  Check: .\help.ps1 -CheckStatus" -ForegroundColor Green
        Write-Host ""
    }
    "Servers" {
        Show-RunningGuide
        Show-KillGuide
    }
    "NotebookLM" {
        Show-RolesGuide
        Show-ConnectionGuide
    }
    "Usage" {
        Show-UsageGuide
    }
    "Roles" {
        Show-RolesGuide
    }
    Default {
        Show-Overview
        Show-RunningGuide
        Show-KillGuide
        Show-UsageGuide
        Show-RolesGuide
        Show-ConnectionGuide
        Write-Host "`n================================================================================" -ForegroundColor Cyan
        Write-Host "  Help Tips:" -ForegroundColor White
        Write-Host "    - Check server health:   .\help.ps1 -CheckStatus" -ForegroundColor Gray
        Write-Host "    - Force kill all servers: .\help.ps1 -KillServers" -ForegroundColor Gray
        Write-Host "    - View focused topic:    .\help.ps1 -Topic Servers | NotebookLM | Usage" -ForegroundColor Gray
        Write-Host "================================================================================`n" -ForegroundColor Cyan
    }
}
