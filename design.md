# System Design Document: Home Finance BookLM

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Vite + React Frontend                            │
│  - Dashboard & Visualizations (Recharts / Chart.js)                         │
│  - Receipt Review & Verification Modal                                      │
│  - Account & Statement Upload Wizards                                       │
│  - Insurance / Pension Audit Cards                                          │
│  - Financial Simulator & Scenario Sandbox                                   │
│  - Settings & NotebookLM Chromium Authentication Panel                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API / WebSockets
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FastAPI Backend (Python)                           │
│  ├── API Routes (`/api/receipts`, `/api/transactions`, `/api/xirr`, etc.)  │
│  ├── Receipt Processor Engine (EasyOCR / Tesseract + Dual AI Validation)    │
│  ├── XIRR & Math Engine (`pyxirr`, `pandas`, `numpy`)                       │
│  ├── FX Rate Engine (USD/ILS API Integration & Cache)                       │
│  ├── Notification & Reminder Service (APScheduler + Telegram/Email)         │
│  └── NotebookLM Integration Layer (`notebooklm-py` / Chromium Session)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
┌──────────────────────────────────────┐┌─────────────────────────────────────┐
│       SQLite Database (Local)        ││    Chromium Profile / NotebookLM    │
│  (Transactions, Receipts, Accounts,  ││  (Isolated Google Auth Profile in   │
│   Pensions, Insurance, Settings)     ││   `.chromium_profile/` directory)   │
└──────────────────────────────────────┘└─────────────────────────────────────┘
```

---

## 2. Component Design

### 2.1 Backend Architecture (Python FastAPI)
- **`app/main.py`**: Entry point, FastAPI initialization, CORS middleware, router registration.
- **`app/database.py`**: SQLAlchemy async/sync connection to `data/homefinance.db`.
- **`app/models/`**: SQLAlchemy ORM models:
  - `Account`: Bank, Credit Card, Savings, Kids, Real Estate, Pension accounts.
  - `Transaction`: Consolidated transaction records (date, amount, currency, cluster, merchant, account_id).
  - `Receipt`: Staged receipt records (raw text, parsed fields, confidence scores, status: `pending_review`, `confirmed`).
  - `PensionPolicy`: Pension and insurance policy records (fees, covered sums, premiums).
  - `MortgageTrack`: Real estate mortgage tracks, interest rates, balances.
  - `Setting`: System configuration (Telegram bot token, email credentials, NotebookLM notebook ID, Chromium path).
- **`app/services/`**:
  - `ocr_service.py`: Receipt image preprocessing (OpenCV) + OCR execution (EasyOCR / PyTesseract) + dual extraction.
  - `notebooklm_service.py`: Communication with NotebookLM via `notebooklm-py` or Playwright Chromium profile.
  - `xirr_service.py`: Financial math calculations using `pyxirr` and exchange rate conversions.
  - `reminder_service.py`: Automated scheduling for upload reminders via Telegram / Email.

### 2.2 Frontend Architecture (Vite + React)
- **`src/components/`**:
  - `Dashboard/`: Expense pie charts, net worth area chart, monthly cash flow bar chart.
  - `ReceiptWizard/`: Upload dropzone, side-by-side image viewer with interactive confidence-highlighted edit form.
  - `Accounts/`: Accounts list, manual transaction entry, CSV/Excel import wizard.
  - `XirrCalculator/`: Savings performance graphs, dynamic $:ILS FX table, kids' account projections.
  - `PensionsInsurance/`: Policy summary cards, management fee audit, duplicate coverage warning badge.
  - `RealEstateSimulator/`: Mortgage amortisation chart, rental yield vs. stock market 25% tax simulator.
  - `Simulator/`: Life event & divorce asset split scenario sandbox.
  - `Settings/`: NotebookLM login button (launches Chromium profile window), Telegram setup, Email configuration.

---

## 3. Data Schema & Models

### 3.1 `accounts`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer (PK) | Primary Key |
| `name` | String | Account name (e.g. "Bank Leumi Main", "Isracard") |
| `type` | String | `bank`, `credit_card`, `savings`, `kids_savings`, `pension`, `real_estate` |
| `currency` | String | `ILS`, `USD`, `EUR` |
| `current_balance` | Float | Latest computed balance |
| `last_uploaded_at` | DateTime | Timestamp of last statement upload |

### 3.2 `transactions`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer (PK) | Primary Key |
| `account_id` | Integer (FK) | Reference to `accounts.id` |
| `date` | Date | Transaction date |
| `amount` | Float | Amount (positive for income, negative for expense) |
| `currency` | String | `ILS`, `USD`, etc. |
| `merchant` | String | Merchant / Payee name |
| `cluster` | String | Category (Groceries, Housing, Utilities, Subscriptions, etc.) |
| `receipt_id` | Integer (FK, optional) | Linked receipt ID |

### 3.3 `receipts`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer (PK) | Primary Key |
| `file_path` | String | Temporary path to uploaded receipt image |
| `merchant` | String | Extracted merchant |
| `amount` | Float | Extracted amount |
| `date` | Date | Extracted date |
| `category` | String | Extracted category |
| `confidence` | JSON | Field-level confidence scores `{"merchant": 0.95, "amount": 0.82}` |
| `status` | String | `pending_review`, `confirmed`, `archived` |

---

## 4. NotebookLM Integration & Isolated Chromium Auth

```
[User Clicks "Authenticate NotebookLM" in Settings]
                         │
                         ▼
[FastAPI launches Playwright Chromium with persistent context]
  Executable: Installed Chromium
  User Data Dir: `c:\Projects\homefinancebooklm\.chromium_profile\`
                         │
                         ▼
[Separate Browser Window Opens pointing to notebooklm.google.com]
                         │
                         ▼
[User logs in with preferred Google Account (isolated from system Chrome)]
                         │
                         ▼
[Cookies & Auth State saved permanently in `.chromium_profile/`]
                         │
                         ▼
[App backend uses `.chromium_profile/` context for `notebooklm-py` / automation]
```

---

## 5. UI Layout & User Experience Workflow

- **Navigation Bar**: Top/Sidebar header with shortcuts to:
  1. **Dashboard** (Executive Summary, Net Worth, Expense Cuts)
  2. **Receipts Vault** (Upload & Verification Wizard)
  3. **Accounts & Statements** (Bank/Credit Card reconciliation)
  4. **Savings & XIRR** (Portfolio growth & FX rate conversion)
  5. **Pension & Insurance** (Audit cards & fee detector)
  6. **Real Estate & Simulator** (Mortgages & Scenario engine)
  7. **Settings** (NotebookLM auth, Telegram/Email alerts)

---

## 6. Verification & Installation Scripts Architecture
- `install.bat` / `install.ps1`:
  1. Creates Python `venv` if not existing.
  2. Upgrades pip and installs backend dependencies (`requirements.txt`).
  3. Installs Playwright Chromium browser binaries (`playwright install chromium`).
  4. Runs `npm install` in `frontend/`.
- `run.bat` / `run.ps1`:
  1. Checks and kills any running instances on ports 8000 (Backend) and 5173 (Frontend).
  2. Starts FastAPI uvicorn server on `http://127.0.0.1:8000`.
  3. Starts Vite dev server on `http://127.0.0.1:5173`.
  4. Displays status and links in console.
