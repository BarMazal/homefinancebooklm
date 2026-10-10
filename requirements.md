# Requirements Document: Home Finance BookLM

## 1. Project Overview
**Home Finance BookLM** is a personal finance management, ingestion, visualization, and decision-support application. It combines local structured data storage (SQLite) and deterministic mathematical engines (XIRR, currency conversion, tax comparison) with Google NotebookLM / Gemini AI intelligence (semantic OCR, receipt parsing, pension/insurance document auditing, RAG-based financial advisor).

---

## 2. Target Persona & Core User Needs
- **Primary User**: Managing household budget, multiple bank accounts, credit cards, savings/investment accounts, real estate, pensions, and insurance policies.
- **Key Pain Points**:
  - Unstructured receipt images piling up without reliable categorization or line-item breakdown.
  - Annoying monthly logins across multiple credit cards and banks without unified statement tracking.
  - Difficulty tracking exact dynamic investment performance (XIRR) across 4+ savings accounts and kids' savings with currency fluctuations ($:ILS).
  - Lack of clarity on insurance policies, costs vs. coverages, overlapping duplicates, and pension fee structures.
  - Lack of reminders when receipts or monthly statements have not been uploaded for several weeks.
  - NotebookLM built-in charts being imprecise or uncontrollable for exact financial tracking.

---

## 3. Functional Requirements

### Module 1: Ingestion, OCR & Receipt Processing Pipeline
- **FR-1.1**: Support uploading receipt images (PNG, JPG, WEBP, PDF).
- **FR-1.2**: Process receipts through dual OCR (Local Python OCR like EasyOCR/PyTesseract + `notebooklm-py` / Gemini API) to extract: Merchant, Date, Total Amount, Currency, Tax, Line Items, and Suggested Category.
- **FR-1.3**: Assign a confidence score to each extracted field. Highlight low-confidence items (< 90%) in yellow/red in the review interface.
- **FR-1.4**: Interactive Review & Confirmation Modal: Allow user to review, edit, tag, and approve parsed receipt data before committing to SQLite database.
- **FR-1.5**: Post-Confirmation Cleanup: Automatically archive or purge raw receipt images upon user confirmation to avoid workspace clutter.
- **FR-1.6**: Automatic Statement Reconciliation: Match confirmed receipts with imported credit card line items by date window ($\pm 3$ days) and amount.

### Module 2: Bank & Credit Card Statement Consolidation
- **FR-2.1**: Import statements from bank accounts and credit cards via CSV, Excel, or PDF.
- **FR-2.2**: Categorize expenses into hierarchical clusters (Groceries, Utilities, Housing, Subscriptions, Entertainment, Kids, Insurance, Income).
- **FR-2.3**: Interactive Visualizations: Expense cuts, monthly trend charts, category breakdown pie/donut graphs, income vs. expense cashflow.

### Module 3: Savings, Kids Accounts & Multi-Currency XIRR Engine
- **FR-3.1**: Multi-Account Portfolio Management: Track liquid cash, savings accounts (4+ accounts), kids' savings funds.
- **FR-3.2**: USD/ILS Historical FX Rate Integration: Automatically fetch daily historical exchange rates to normalize foreign currency transactions.
- **FR-3.3**: Dynamic XIRR Calculation: Calculate exact dynamic Extended Internal Rate of Return (XIRR) per account and consolidated portfolio.
- **FR-3.4**: Guided Wizards: Step-by-step instructions for exporting data from specific financial providers.

### Module 4: Pension & Insurance Audit (Non-Expert Friendly)
- **FR-4.1**: Document Scanner: Parse Israeli annual pension reports (`דוח תקופתי שנה`) and insurance policy PDFs.
- **FR-4.2**: Key Metric Extraction: Extract policy name, management fee from deposit (%), management fee from accumulation (%), covered amount, and monthly premium.
- **FR-4.3**: Duplicate Coverage Detector: Identify overlapping insurance coverages across private policies and workplace benefits.

### Module 5: Real Estate & Mortgage Intelligence
- **FR-5.1**: Mortgage Schedule Tracker: Track track types (CPI-linked, Fixed non-linked, Prime), remaining balance, interest rates, and monthly payments.
- **FR-5.2**: Net Rental Yield vs Stock Tax Sandbox: Compare real estate net rental yield against stock market returns (adjusted for 25% Israeli real capital gains tax).

### Module 6: Reminders & Notification System
- **FR-6.1**: Upload Heatmap & Cadence Monitoring: Track last upload date per account and flag missing months/statements.
- **FR-6.2**: Multi-Channel Reminders: Send upload reminders via Email (SMTP) and Telegram Bot.

### Module 7: Scenario & Life Event Simulator
- **FR-7.1**: Model financial impact of mortgage interest rate changes (+/- 0.5%, 1%, CPI adjustments).
- **FR-7.2**: Model re-allocation of monthly savings into different investment vehicles.
- **FR-7.3**: Life Event & Separation Simulator: Model asset and liability division (50/50 or custom split) across cash, pensions, real estate equity, and savings.

### Module 8: Settings & NotebookLM Connection
- **FR-8.1**: Chromium Profile Isolation: Launch Chromium with a dedicated user data profile for NotebookLM authentication, independent of default system Chrome.
- **FR-8.2**: Connection Status Indicator: Check and display NotebookLM connection status, active notebook ID, and credentials status.

---

## 4. Non-Functional Requirements
- **NFR-1 (Privacy & Local First)**: All financial records stored locally in SQLite (`data/homefinance.db`).
- **NFR-2 (Performance)**: Dashboard load time < 1 second; receipt parsing & OCR < 5 seconds per image.
- **NFR-3 (Responsiveness)**: Modern, glassmorphic dark-mode web interface optimized for desktop and tablet screens.
