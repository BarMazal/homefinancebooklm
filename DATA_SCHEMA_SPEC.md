# Home Finance BookLM — Complete Data Architecture & Schema Specification

This document defines the comprehensive data structure for **Home Finance BookLM**. It details every entity, every attribute, the architectural justification (**the WHY**), and the exact role each element plays across the application's hubs, calculations, and analytical reports.

---

## 1. Architectural Philosophy: Local-First Intelligent AI

The data model is designed around three governing principles:
1. **Per-Profile Physical Isolation**: Each household, user, or experimentation scenario has its own SQLite database (`data/profile_<id>/homefinance.db`), uploaded asset folder (`data/profile_<id>/uploads/`), and isolated browser session (`.chromium_profile_<id>/`). No cross-contamination can occur.
2. **Determinism vs. Reasoning Separation**:
   - **Local DB**: Stores deterministic, audit-proof, double-entry financial numbers, exact dates, tax identifiers, and amortization math.
   - **NotebookLM Cloud**: Operates as the intelligent reasoning engine — parsing unstructured documents (receipts, salary slips, policy letters), performing semantic reconciliation, and generating strategic financial insights.
3. **Multi-Currency & Compounding-Aware**: Built for real-world personal finance (handling ILS, USD, EUR, conversion rates, inflation linking, and compound returns).

---

## 2. Entity Specifications & Field-by-Field "WHY" Analysis

```
┌────────────────────────────────────────────────────────────────────────┐
│                                Profile                                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 1:N
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
   ┌─────────┐               ┌─────────────┐             ┌─────────────┐
   │ Account │               │   Receipt   │             │   Pension   │
   └────┬────┘               └──────┬──────┘             │   Policy    │
        │ 1:N                       │ 1:1                └─────────────┘
        ▼                           ▼
 ┌─────────────┐             ┌─────────────┐
 │ Transaction │◄────────────┤  Line Items │
 └─────────────┘             └─────────────┘
```

---

### Table 1: `profiles`
Represents an isolated financial entity (e.g., "Family Household", "Clean Slate", "Investment Portfolio", or "Rental Business").

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique profile identifier (maps to folder `profile_<id>`). |
| `name` | String(100) | Unique, Not Null | Human-readable label (e.g., "Personal Household", "Family Demo"). |
| `is_active` | Boolean | Default False | Flags which profile is currently loaded in the user session. |
| `created_at` | DateTime | Default UTC | Timestamp when the profile environment was initialized. |

#### **The WHY & Application Usage**:
- **Why this table is needed**: Many families manage separate finances (e.g., joint household vs. private side-business, or parents' finances vs. personal). Profiles provide zero-bleed compartmentalization.
- **Why each field exists**:
  - `id`: Used directly by the dynamic session router in `app/database.py` to route SQLite queries to `data/profile_<id>/homefinance.db`.
  - `is_active`: Allows seamless switching from the top navigation bar without logging in or losing state.
  - `name`: Displayed on the top navigation bar, header badges, and export manifests.
- **Used in**: Top Navbar profile selector, Profile Creation Modal, Database Export/Restore endpoints.

---

### Table 2: `accounts`
Represents financial holding containers: checking accounts, credit card accounts, investment brokerage accounts, and children's savings funds.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique account identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `name` | String(100) | Not Null | Account display name (e.g., "Leumi Checking", "IBKR Brokerage"). |
| `type` | String(50) | Not Null | Account classification (`bank`, `credit_card`, `savings`, `brokerage`, `kids_savings`). |
| `institution` | String(100) | Nullable | Financial institution (e.g., "Bank Leumi", "Interactive Brokers", "Max"). |
| `currency` | String(3) | Default "ILS" | ISO currency code (`ILS`, `USD`, `EUR`). |
| `current_balance` | Float | Default 0.0 | Latest known balance/valuation. |
| `last_uploaded_at` | DateTime | Nullable | Timestamp of the most recent statement upload. |

#### **The WHY & Application Usage**:
- **Why this table is needed**: Financial transactions do not exist in a vacuum; they belong to a liquidity source (bank) or liability source (credit card). Grouping by account allows calculating actual liquid net worth vs. credit debt.
- **Why each field exists**:
  - `type`: Governs how the account is treated in net worth calculation:
    - `bank` & `savings`: Treated as positive liquidity assets.
    - `credit_card`: Treated as current liabilities (subtracted from liquid cash).
    - `kids_savings`: Displayed in dedicated 18-Year Compound Growth simulator.
    - `brokerage`: Feed into the dynamic XIRR and investment performance engine.
  - `currency`: Critical for multi-currency households (e.g., foreign currency holdings in USD vs. domestic ILS).
  - `institution`: Used in the Expenses Hub to display per-institution breakdowns and statement sync freshness.
- **Used in**: Executive Overview (Net Worth breakdown), Expenses Hub (account filter dropdowns), Savings & Investments Hub (Brokerage vs. Kids accounts).

---

### Table 3: `transactions`
The core ledger: records all cash inflows (salary, dividends, transfers) and outflows (expenses, bills, investments).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique transaction identifier. |
| `account_id` | Integer | FK(accounts.id) | Account through which the transaction took place. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `date` | Date | Not Null, Index | Effective date of the charge or deposit. |
| `amount` | Float | Not Null | Signed amount: **Negative** for expenses (`-250.0`), **Positive** for income (`+15000.0`). |
| `currency` | String(3) | Default "ILS" | Currency of transaction. |
| `merchant` | String(150) | Not Null, Index | Merchant name or payee (e.g., "Shufersal", "Israel Electric Corp"). |
| `cluster` | String(50) | Default "Uncategorized" | High-level budget category (`Groceries`, `Housing`, `Utilities`, `Salary`, `Investments`). |
| `notes` | Text | Nullable | User or OCR annotations, bank statement description, or NotebookLM reference. |
| `receipt_id` | Integer | FK(receipts.id), Nullable | Linked scanned receipt (if itemized). |

#### **The WHY & Application Usage**:
- **Why this table is needed**: Accurate cashflow tracking requires a granular, time-series log of all financial events.
- **Why each field exists**:
  - `amount`: Signed convention (`-` for spend, `+` for revenue) enables direct mathematical aggregation (`SUM(amount)` over a month gives net cashflow).
  - `date`: Essential for monthly burn rate curves, year-over-year comparisons, and XIRR cashflow discount discounting.
  - `cluster`: Drives the visual donut charts, expense clustering, and budget alerts.
  - `receipt_id`: Links macro transactions on a credit card statement to their micro line-item receipt breakdown in the Receipt Vault.
- **Used in**:
  - **Executive Overview**: Monthly cashflow chart (Income vs. Burn rate), expense category distribution donut chart.
  - **Expenses Hub**: Searchable transaction ledger, date-range filters, category drilldowns.
  - **Scenario Simulator**: Historical baseline for simulating inflation shocks, mortgage interest rate changes, or income adjustments.

---

### Table 4: `receipts`
Stores digital assets and OCR/LLM-parsed data for physical receipts and invoices.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique receipt record identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `file_path` | String(255) | Not Null | Local file path under `data/profile_<id>/uploads/`. |
| `merchant` | String(150) | Nullable | Detected merchant (e.g., "Super-Pharm", "IKEA"). |
| `amount` | Float | Nullable | Detected total receipt bill amount. |
| `date` | Date | Nullable | Detected date printed on the receipt. |
| `category` | String(50) | Default "Uncategorized" | Inferred category. |
| `line_items` | JSON | Default `[]` | Itemized product list: `[{ item: str, price: float, confidence: float }]`. |
| `confidence_scores` | JSON | Default `{}` | OCR/LLM extraction confidence for each key attribute. |
| `status` | String(30) | Default "pending_review" | Workflow status: `pending_review`, `confirmed`, `archived`. |
| `created_at` | DateTime | Default UTC | Upload timestamp. |

#### **The WHY & Application Usage**:
- **Why this table is needed**: Credit card statements only show lump sums (e.g., "₪ 850 at Shufersal"). They don't reveal how much went to food vs. cleaning supplies vs. alcohol. The receipts table preserves the raw digital artifact and enables line-item visibility.
- **Why each field exists**:
  - `file_path`: Anchors the image securely on local storage for visual inspection.
  - `line_items`: A JSON array storing the parsed receipt breakdown so users can inspect SKU-level price changes over time.
  - `confidence_scores`: Highlights low-confidence extractions in orange/yellow so the user can verify before confirming.
  - `status`: Prevents unverified OCR readings from corrupting the master ledger.
- **Used in**: Receipt Vault (image preview, side-by-side verification editor, line item breakdown).

---

### Table 5: `pension_policies`
Tracks retirement funds, study funds (Keren Hishtalmut), and insurance policies.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique policy identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `policy_name` | String(150) | Not Null | Plan description (e.g., "Menora Comprehensive Pension", "Migdal Keren Hishtalmut"). |
| `provider` | String(100) | Not Null | Underwriter / Institutional manager (e.g., "Menora", "Altshuler Shaham", "Harel"). |
| `type` | String(50) | Not Null | Policy type: `pension`, `keren_hishtalmut`, `insurance_life`, `insurance_health`, `insurance_home`. |
| `monthly_premium` | Float | Default 0.0 | Monthly ongoing deposit or insurance cost (₪). |
| `management_fee_deposit` | Float | Default 0.0 | Management fee charged on ongoing deposits (% from contribution). |
| `management_fee_accumulation` | Float | Default 0.0 | Management fee charged on total accumulated balance (% from AUM). |
| `covered_amount` | Float | Default 0.0 | In case of insurance: total insured payout amount. |
| `accumulated_balance` | Float | Default 0.0 | Current value of the retirement pot (₪). |
| `notes` | Text | Nullable | Policy terms, retirement age projections, beneficiary notes. |

#### **The WHY & Application Usage**:
- **Why this table is needed**: In personal finance, pension and insurance fees erode millions over a career. Tracking deposit fees (דמי ניהול מהפקדה) and accumulation fees (דמי ניהול מצבירה) is essential for fee optimization.
- **Why each field exists**:
  - `management_fee_deposit` & `management_fee_accumulation`: Directly feeds the fee comparison benchmark vs. Israeli national regulatory maximums (0.5% AUM / 4% deposit).
  - `accumulated_balance`: Included in total household Net Worth calculation.
  - `monthly_premium`: Added to the recurring monthly commitments in the Scenario Simulator.
- **Used in**: Pensions & Insurances Hub (fee benchmarks, duplicate coverage detector, total accumulated wealth meter).

---

### Table 6: `real_estate_properties`
Tracks physical real estate assets (primary residence, rental investments, land).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique property identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `name` | String(150) | Not Null | Asset identifier (e.g., "Tel Aviv 4-Room Apt", "Haifa Investment Studio"). |
| `estimated_value` | Float | Default 0.0 | Current estimated fair market value (₪). |
| `monthly_rent` | Float | Default 0.0 | Gross monthly rental income received (₪/month). |
| `annual_maintenance` | Float | Default 0.0 | Annual upkeep costs, municipal taxes (Arnona), insurance (₪/year). |

#### **The WHY & Application Usage**:
- **Why this table is needed**: Real estate often represents the largest portion of household equity and a primary source of passive income.
- **Why each field exists**:
  - `estimated_value`: Forms the asset side of real estate net worth.
  - `monthly_rent` & `annual_maintenance`: Calculates **Net Rental Yield**:
    $$\text{Net Yield} = \frac{(\text{monthly\_rent} \times 12) - \text{annual\_maintenance}}{\text{estimated\_value}} \times 100$$
- **Used in**: Real Estate & Mortgages Hub (Portfolio Value, Net Rental Yield card, LTV equity bar).

---

### Table 7: `mortgage_tracks`
Tracks individual loan tranches within a property's mortgage portfolio.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique mortgage tranche identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `property_name` | String(150) | Not Null, Index | Name of associated property. |
| `track_name` | String(100) | Not Null | Track mechanism: `Prime`, `Fixed Non-Linked (Kalatz)`, `CPI-Linked Variable`. |
| `original_amount` | Float | Not Null | Initial principal borrowed. |
| `remaining_balance` | Float | Not Null | Current outstanding debt balance (₪). |
| `interest_rate` | Float | Not Null | Current annual interest rate (e.g., `4.85` for 4.85%). |
| `monthly_payment` | Float | Not Null | Current monthly repayment tranche (₪/month). |
| `end_date` | Date | Not Null | Scheduled maturity / payoff date. |

#### **The WHY & Application Usage**:
- **Why this table is needed**: Israeli mortgages are split across multiple tranches (e.g., 1/3 Prime, 1/3 Kalatz, 1/3 CPI-Linked), each with its own rate, term, and inflation risk. Treating a mortgage as a single number prevents refinancing analysis.
- **Why each field exists**:
  - `remaining_balance`: Subtracted from `RealEstateProperty.estimated_value` to determine true **Net Real Estate Equity** and **Loan-To-Value (LTV)** percentage.
  - `interest_rate` & `track_name`: Feeds the Scenario Simulator to model what happens if the Bank of Israel raises Prime interest rates by 1.5%.
- **Used in**: Real Estate & Mortgages Hub (Tranche amortization table, Total Debt vs. Equity chart), Scenario Simulator (Interest Rate Shock stress-test).

---

### Table 8: `settings`
Stores profile-specific configuration and integrations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique setting identifier. |
| `key` | String(100) | Unique, Index | Setting key (e.g., `notebooklm_notebook_id`, `preferred_currency`). |
| `value` | Text | Nullable | Setting payload / value string. |

#### **The WHY & Application Usage**:
- **Why this table is needed**: Keeps integration bindings (like the linked NotebookLM notebook ID) cleanly separated from the financial records themselves.
- **Used in**: Settings & Auth View (Notebook link state, app configuration persistence).

---

## 3. How NotebookLM Documents Map to This Schema

When extracting data from documents stored in a connected NotebookLM notebook, the extraction prompts are targeted directly at the schema above:

| NotebookLM Resource / Source Document | Target Application Entity | Extracted Attributes |
| :--- | :--- | :--- |
| **Store Receipts (PDF / JPG)** | `receipts` + `transactions` | Merchant name, Date, Total Amount, Line item prices (`line_items`). |
| **Bank Statements (PDF / CSV)** | `transactions` + `accounts` | Bank name, Account balance, Date, Payee, Signed Amount, Category. |
| **Credit Card Reports (PDF / Excel)**| `transactions` | Card provider, Transaction date, Billing date, Merchant, Amount. |
| **Annual Pension Statements (דוח שנתי)**| `pension_policies` | Provider, Policy name, Accumulated balance, Deposit fee %, Accumulation fee %, Monthly deposit. |
| **Mortgage Schedules (לוח סילוקין)** | `mortgage_tracks` | Track type (Prime/Kalatz), Remaining balance, Interest rate, Monthly payment, End date. |

---

## 4. Summary Table of Application Views vs. Schema Entities

| Application View | Entities Read / Written | Primary Calculated Metrics |
| :--- | :--- | :--- |
| **Executive Overview** | `accounts`, `transactions`, `pension_policies`, `real_estate_properties`, `mortgage_tracks` | Total Net Worth, Monthly Inflow/Outflow, Liquid vs. Illiquid Asset distribution. |
| **Expenses Hub** | `accounts`, `transactions`, `receipts` | Monthly burn rate, Category clustering, Cash vs. Credit split, Merchant frequency. |
| **Savings & Investments**| `accounts` (brokerage & kids), `transactions` | Portfolio Valuation, Time-weighted deposits, Dynamic XIRR, Kids 18-Year compounding projection. |
| **Pensions & Insurances**| `pension_policies` | Total Retirement Pot, Monthly policy commitment, Fee benchmarking vs. national standards. |
| **Real Estate & Mortgages**| `real_estate_properties`, `mortgage_tracks` | Net Real Estate Equity, LTV Ratio, Net Rental Yield, Monthly mortgage liability. |
| **Receipt Vault** | `receipts`, `transactions` | Pending OCR review count, SKU-level itemization, Confidence scoring. |
| **Scenario Simulator** | `transactions`, `mortgage_tracks`, `pension_policies` | Stress-testing cashflow against inflation, interest rate hikes, and emergency fund runways. |
| **Settings & Auth** | `profiles`, `settings` | Active Profile ID, Linked NotebookLM Notebook ID, Local SQLite backup/restore. |
