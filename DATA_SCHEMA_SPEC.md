# Home Finance BookLM — Complete Data Architecture & Schema Specification

This document defines the comprehensive data structure for **Home Finance BookLM**. It details every entity, every attribute, the architectural justification (**the WHY**), and the exact role each element plays across the application's hubs, calculations, analytical reports, and NotebookLM integration.

---

## 1. Architectural Philosophy: Local-First Intelligent AI & Advisor Ecosystem

The architecture is built around five core principles:

1. **Per-Profile Physical Isolation**: Each household, user, or scenario has its own SQLite database (`data/profile_<id>/homefinance.db`), uploaded asset folder (`data/profile_<id>/uploads/`), and isolated browser session (`.chromium_profile_<id>/`).
2. **Determinism vs. Reasoning Separation**:
   - **Local DB**: Stores deterministic, audit-proof financial numbers, exact dates, tax identifiers, foreign exchange execution rates, and amortization schedules.
   - **NotebookLM Cloud**: Serves as the reasoning engine — parsing unstructured documents (receipts, salary slips, policy letters), performing semantic reconciliation, and generating strategic insights.
3. **Dual Notebook Roles: Profile Management vs. Domain Advisor Experts**:
   - **`profile_management_notebook` (1:1 per Profile)**: Holds the user's actual personal financial records, receipts, bank statements, and family notes. Private and strictly bound to the profile.
   - **`advisor_notebook` (Domain Experts, 1:N Shared Across Profiles)**:
     - Contains **global, theoretical, and regulatory knowledge** (e.g., *Israeli Tax Law*, *Mortgage Optimization Strategist*, *Pension & Insurance Fee Benchmark Advisor*, *Index Fund Portfolio Allocation*).
     - Contains **NO permanent user data**.
     - When the user consults an advisor, the local app injects a **temporary, bounded scenario slice** (e.g., current mortgage tranches) as a case study for advice. The expert analyzes the case, answers queries, and general insights can be saved back into the user's private notebook.
4. **Generalized Financial Events & Cost Bundling**:
   - Like a receipt wraps a list of line items, real-world financial lifecycle events (e.g. buying a property, opening an account, remodeling) wrap a bundle of auxiliary fees, taxes, and service charges.
   - The data model supports bundling these costs into unified **Financial Events** to compute true Total Cost of Ownership (TCO) and Capital Cost Basis.
5. **Resilience to Partial & Incremental Data**:
   - Financial tracking is often done in stages (e.g. entering pension names today, adding policy fees weeks later).
   - All models and analytics are **null-safe**: calculations never crash or hide records because a field is missing.
   - The UI surfaces "Data Completeness" indicators to guide the user on what is missing without blocking analysis.

---

## 2. High-Level Entity Relationship Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                                Profile                                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 1:N
        ┌───────────────────────────┼───────────────────────────────────┐
        ▼                           ▼                                   ▼
   ┌─────────┐               ┌─────────────┐                     ┌─────────────┐
   │ Account │               │   Receipt   │                     │   Pension   │
   └────┬────┘               └──────┬──────┘                     │   Policy    │
        │ 1:N                       │ 1:1 (Evidentiary)          └─────────────┘
        ▼                           ▼
 ┌─────────────┐             ┌─────────────┐
 │ Transaction │◄────────────┤Receipt Item │ (Itemized breakdown)
 └──────┬──────┘             │  (Split)    │
        │                    └─────────────┘
        ├───────────────────────────┬───────────────────────────────────┐
        ▼                           ▼                                   ▼
┌──────────────┐            ┌──────────────┐                     ┌──────────────┐
│ Category     │            │ Transaction  │                     │  Financial   │
│ (Hierarchical│            │ Tags         │                     │  Lifecycle   │
│ Tree $1 = $1)│            │ (Orthogonal) │                     │    Event     │
└──────────────┘            └──────────────┘                     └──────┬───────┘
                                                                        │
┌───────────────────────┐            ┌───────────────────────┐          │
│ Real Estate Property  │◄── M : N ──►│    Mortgage Track     │          ▼
│ (with Buy/Sell Taxes) │            │ (Tranche Amortization)│  ┌──────────────┐
└───────────────────────┘            └───────────────────────┘  │Event Expenses│
                                                                │  (Cost Pack) │
                                                                └──────────────┘
```

---

## 3. Entity Specifications & Field-by-Field "WHY" Analysis

---

### Table 1: `profiles`
Represents an isolated financial household or experimental portfolio.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique profile identifier (maps to folder `profile_<id>`). |
| `name` | String(100) | Unique, Not Null | Profile display name (e.g., "Personal Household", "Family Demo"). |
| `is_active` | Boolean | Default False | Flags which profile is currently loaded in the user session. |
| `created_at` | DateTime | Default UTC | Initialization timestamp. |

#### **The WHY & Application Usage**:
- **Why this table is needed**: Allows managing distinct legal or personal financial spaces (e.g. family household vs. rental business vs. testing clean slate) without data leaks.
- **Used in**: Navigation profile switcher, database backup/restore, file directory routing.

---

### Table 2: `accounts`
Financial holding containers: checking accounts, credit cards, brokerage accounts, and dedicated savings pots.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique account identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `name` | String(100) | Not Null | Account name (e.g., "Leumi Checking", "IBKR Brokerage", "Kids Fund"). |
| `type` | String(50) | Not Null | `bank`, `credit_card`, `savings`, `brokerage`, `kids_savings`. |
| `institution` | String(100) | Nullable | Institution name (e.g., "Bank Leumi", "Interactive Brokers", "Max"). |
| `currency` | String(3) | Default "ILS" | Native account currency (`ILS`, `USD`, `EUR`). |
| `current_balance` | Float | Default 0.0 | Latest known balance/valuation. |
| `last_uploaded_at` | DateTime | Nullable | Most recent statement sync timestamp. |

#### **The WHY & Application Usage**:
- **Why this table is needed**: Cashflows must be anchored to liquidity or liability sources to track actual liquid net worth vs. revolving credit debt.
- **Used in**: Executive Overview (Net Worth), Expenses Hub (account filters), Savings & Investments (XIRR portfolio balance).

---

### Table 3: `transactions`
The core cashflow ledger. Handles multi-currency conversions, commissions, and timestamps.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique transaction identifier. |
| `account_id` | Integer | FK(accounts.id) | Account used for the charge/deposit. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `date` | DateTime | Not Null, Index | Effective transaction timestamp (with time if available, or 00:00:00). |
| `amount` | Float | Not Null | Effective amount in **profile base currency (ILS)**. Negative for expenses, positive for income. |
| `original_amount` | Float | Nullable | Amount in foreign currency before conversion (e.g., `120.00` for $120). |
| `original_currency`| String(3) | Default "ILS" | Currency at point of sale (`USD`, `EUR`, `GBP`). |
| `exchange_rate` | Float | Default 1.0 | Actual conversion rate applied by the specific card/bank at execution (e.g., `3.65`). |
| `fee_amount` | Float | Default 0.0 | Bank/card conversion fee or commission (in ILS). |
| `merchant` | String(150) | Not Null, Index | Payee or merchant name. |
| `category_id` | Integer | FK(categories.id) | Primary hierarchical category leaf (e.g., `Car > Fuel`). |
| `event_id` | Integer | FK(financial_events.id), Nullable | Linked lifecycle event (if part of an event cost bundle). |
| `notes` | Text | Nullable | Statement description, OCR notes, or user remarks. |
| `receipt_id` | Integer | FK(receipts.id), Nullable | Linked evidentiary receipt (if scanned/uploaded). |

#### **The WHY & Application Usage**:
- **Why `DateTime` instead of just `Date`?**: Preserves intra-day ordering and allows exact timestamp matching against digital receipts.
- **Why per-transaction `exchange_rate` and `fee_amount`?**: Foreign currency transactions include specific markups and fees. Storing the exact conversion rate and fee ensures the ledger reconciles to the cent with actual bank statements.
- **Why `amount` is in base currency (ILS)**: Allows fast, exact aggregations (`SUM(amount)`) without runtime FX lookups for past dates.
- **Used in**: Cashflow charts, monthly burn rate curves, Expenses Hub ledger, Scenario Simulator.

---

### Table 4: `receipts` (Evidentiary Document)
Stores digital receipt artifacts (images/PDFs) and document-level metadata.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique receipt identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `file_path` | String(255) | Not Null | Local path under `data/profile_<id>/uploads/`. |
| `merchant` | String(150) | Nullable | Merchant name detected on the header. |
| `total_amount` | Float | Nullable | Total bill amount stamped on the receipt. |
| `date` | DateTime | Nullable | Transaction date & time printed on the receipt. |
| `invoice_number` | String(100) | Nullable | Official invoice/tax receipt number (מספר חשבונית / קבלה). |
| `status` | String(30) | Default "pending_review" | `pending_review`, `confirmed`, `archived`. |
| `created_at` | DateTime | Default UTC | Upload timestamp. |

#### **The WHY & Relationship to Transactions**:
- **Evidentiary Role**: A `Receipt` is proof, not a separate cashflow charge. The bank statement records the macro cashflow line (`Transaction` of -₪ 450), while the `Receipt` holds the legal invoice and image.
- **Zero Double-Counting**: Cashflow aggregations sum *only* `transactions`.

---

### Table 5: `receipt_items` (Split Itemization)
Stores itemized SKU-level line items extracted from a receipt.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique item identifier. |
| `receipt_id` | Integer | FK(receipts.id) | Parent receipt. |
| `name` | String(150) | Not Null | Item name (e.g., "Tnuva 3% Milk 1L", "Finish Dishwasher Tablets"). |
| `price` | Float | Not Null | Item total price (₪). |
| `quantity` | Float | Default 1.0 | Quantity purchased. |
| `category_id` | Integer | FK(categories.id) | Specific item category (e.g., `Groceries > Dairy` vs `Household > Cleaning`). |
| `confidence` | Float | Default 1.0 | OCR / LLM extraction confidence (0.0 to 1.0). |

#### **The WHY & Application Usage**:
- Allows breaking down a supermarket visit into precise sub-categories without cluttering the bank ledger with 25 separate entries.
- Used in the Receipt Vault, price tracking over time for identical items, and itemized category reports.

---

### Table 6: `categories` & `transaction_tags` (Hierarchy & Multi-Classification)

#### **1. Category Hierarchy (Strict Tree: $1 = $1 Additive Rule)**
Every transaction or receipt item belongs to **exactly one leaf node** in a strict tree:

```
├── Housing
│   ├── Rent
│   ├── Maintenance & Vaad Bayit
│   └── Insurance (Home)
├── Car & Transport
│   ├── Fuel
│   ├── Maintenance & Repairs
│   └── Insurance (Car)
├── Groceries & Food
│   ├── Supermarket
│   ├── Restaurants & Cafes
│   └── Sweets & Snacks
└── Insurance (Personal)
    ├── Health Insurance
    └── Life Insurance
```

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique category identifier. |
| `parent_id` | Integer | FK(categories.id), Nullable | Parent category (null for root categories). |
| `name` | String(100) | Not Null | Category name (e.g., "Fuel", "Car", "Insurance"). |
| `full_path` | String(255) | Index | Materialized path (e.g., `Car/Insurance`, `Housing/Insurance`). |

#### **2. Orthogonal Tags & Hybrid Auto-Tagging Engine**
Tags represent cross-cutting dimensions (`#vacation`, `#kids`, `#work_reimbursable`, `#renovation`).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `transaction_id` | Integer | FK(transactions.id), PK | Linked transaction. |
| `tag` | String(50) | PK, Index | Orthogonal tag string (e.g., `vacation`, `kids`, `reimbursable`). |
| `source` | String(20) | Default "auto" | `auto` (system/rule assigned) or `manual` (user added). |

#### **How Auto-Tagging Works**:
1. **Deterministic Rule Engine (Local & Instant)**:
   - Matches merchant keywords (e.g. `El Al`, `Booking.com`, `Airbnb` → `#vacation`).
   - Matches account types (e.g. transactions on `kids_savings` account → `#kids`).
   - Time & Geography windows (e.g. user defines a trip date range "Aug 10–20 in Greece" → all transactions in that window auto-tagged `#vacation-greece-2026`).
2. **NotebookLM Semantic Classification**:
   - During receipt/document parsing, the LLM detects context (e.g. medical clinics, school supplies) and suggests appropriate tags.
3. **Manual Control & Suppression Memory**:
   - Tags display as removable chips in the UI with a quick `+ Add Tag` input.
   - If a user deletes an auto-assigned tag, the system marks it as `suppressed` for that transaction, preventing auto-rules from re-applying it.

---

### Table 7: `financial_events` & `event_expenses` (Lifecycle Cost Bundles)

Real-world financial events wrap a bundle of auxiliary fees, taxes, and service charges.

```
┌────────────────────────────────────────────────────────┐
│           Financial Event: "Haifa Apt Purchase"         │
├────────────────────────────────────────────────────────┤
│ • Purchase Tax (Mas Rechisha):          ₪ 140,000      │
│ • Real Estate Advocate / Lawyer:        ₪  18,500      │
│ • Property Appraiser (Shamai):          ₪   2,800      │
│ • Land Registry (Tabu / Registration):  ₪     380      │
│ • Building Engineer Inspection:         ₪   1,750      │
│ • Mortgage File Opening Bank Fee:       ₪     360      │
│ • Mortgage Consultant Fee:              ₪   6,000      │
├────────────────────────────────────────────────────────┤
│ Total Event Ancillary Cost Pack:        ₪ 169,790      │
└────────────────────────────────────────────────────────┘
```

#### **Table: `financial_events`**
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique event identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `title` | String(150) | Not Null | Event title (e.g., "Haifa Apt Acquisition", "Opening IBKR Brokerage", "2026 Home Renovation"). |
| `type` | String(50) | Not Null | `real_estate_buy`, `real_estate_sell`, `account_setup`, `renovation`, `life_event`, `tax_filing`. |
| `asset_id` | Integer | Nullable | Linked asset (e.g., `real_estate_properties.id` or `accounts.id`). |
| `date` | Date | Not Null | Event initiation / settlement date. |
| `notes` | Text | Nullable | Contracts, official receipt references, or accountant remarks. |

#### **Table: `event_expenses`**
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique expense identifier. |
| `event_id` | Integer | FK(financial_events.id) | Parent financial event. |
| `name` | String(150) | Not Null | Expense item (e.g., "Lawyer Legal Fees", "Mortgage Opening Fee", "Property Appraiser"). |
| `recipient` | String(150) | Nullable | Payee (e.g., "Adv. David Cohen", "Land Registry / Tabu", "Shamai Milstein"). |
| `amount` | Float | Not Null | Fee amount (₪). |
| `category` | String(50) | Default "Legal & Fees"| Classification (`tax`, `legal`, `appraisal`, `registration`, `consulting`). |
| `transaction_id`| Integer | FK(transactions.id), Nullable | Linked bank transaction if paid via active account. |
| `is_capitalized`| Boolean | Default True | Whether this fee is added to the asset's tax cost basis. |

#### **The WHY & Application Usage**:
- Real estate, investments, and mortgages have significant hidden startup costs (lawyers, appraisers, notary, Tabu, mortgage consultant, file fees).
- Tying them to an event provides true **Total Cost of Ownership (TCO)** and calculates exact **Adjusted Capital Cost Basis** for future capital gains tax minimization (Mas Shevach).

---

### Table 8: `pension_policies`
Retirement funds, study funds (Keren Hishtalmut), and insurance policies.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique policy identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `policy_name` | String(150) | Not Null | Plan label (e.g., "Menora Comprehensive Pension"). |
| `provider` | String(100) | Nullable | Underwriter (e.g., "Menora", "Altshuler", "Harel"). |
| `type` | String(50) | Nullable | `pension`, `keren_hishtalmut`, `insurance_health`, `insurance_life`. |
| `monthly_premium` | Float | Default 0.0 | Ongoing monthly deposit or insurance premium (₪). |
| `management_fee_deposit` | Float | Default 0.0 | Fee on monthly deposits (% from contribution). |
| `management_fee_accumulation` | Float | Default 0.0 | Fee on total accumulated balance (% from AUM). |
| `accumulated_balance`| Float | Default 0.0 | Current portfolio valuation (₪). |
| `covered_amount` | Float | Default 0.0 | Insured payout sum (in case of life/disability/health). |
| `completeness_score` | Float | Default 0.0 | Percentage of fields completed (0% - 100%). |
| `notes` | Text | Nullable | Policy numbers, missing documents, agent remarks. |

#### **The WHY & Handling Partial Data**:
- Financial data entry is incremental. Numeric fields default to `0.0`, and policies display immediately with completeness indicators (e.g., `⚠️ Missing Deposit Fee %`). Analytics operate safely without crashing.

---

### Table 9: `real_estate_properties`
Real estate holdings with acquisition costs, ongoing yield, and tax basis.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique property identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `name` | String(150) | Not Null | Asset identifier (e.g., "Tel Aviv 4-Room Apt", "Haifa Rental"). |
| `estimated_value` | Float | Default 0.0 | Current fair market value (₪). |
| `monthly_rent` | Float | Default 0.0 | Gross monthly rental income (₪/month). |
| `annual_maintenance` | Float | Default 0.0 | Upkeep, Arnona, insurance (₪/year). |
| `purchase_price` | Float | Default 0.0 | Original purchase price (₪). |
| `purchase_tax` | Float | Default 0.0 | Purchase tax paid (Mas Rechisha - מס רכישה). |
| `acquisition_fees` | Float | Default 0.0 | Advocate/legal fees, agent broker fees paid at purchase. |
| `renovation_cost` | Float | Default 0.0 | Capital improvements invested (added to cost basis). |
| `estimated_exit_tax` | Float | Default 0.0 | Estimated capital gains / betterment tax on sale (Mas Shevach / Hetel Hashbacha). |

---

### Table 10: `mortgage_tracks` & `property_mortgage_links` (Many-to-Many Linking)

#### **Table: `mortgage_tracks`**
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique mortgage tranche identifier. |
| `profile_id` | Integer | FK(profiles.id) | Owning profile. |
| `bank_name` | String(100) | Not Null | Lending bank (e.g., "Bank Mizrahi Tefahot", "Bank Leumi"). |
| `track_name` | String(100) | Not Null | Mechanism: `Prime`, `Kalatz (Fixed Non-Linked)`, `CPI-Linked Variable`. |
| `original_amount` | Float | Not Null | Principal borrowed (₪). |
| `remaining_balance` | Float | Not Null | Outstanding debt balance (₪). |
| `interest_rate` | Float | Not Null | Annual interest rate (% e.g., `4.85`). |
| `monthly_payment` | Float | Not Null | Monthly debt service (₪/month). |
| `end_date` | Date | Not Null | Maturity date. |

#### **Table: `property_mortgage_links` (Junction Table)**
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `property_id` | Integer | FK(real_estate_properties.id), PK | Property asset. |
| `mortgage_track_id`| Integer | FK(mortgage_tracks.id), PK | Mortgage tranche. |
| `collateral_share` | Float | Default 1.0 | Percentage of this mortgage secured by this property (0.0 to 1.0). |

---

### Table 11: `advisor_notebooks` (Domain Experts Catalog)

Registers specialized advisor notebooks available across profiles.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique advisor identifier. |
| `notebook_id` | String(100) | Unique, Not Null | Google NotebookLM Notebook ID. |
| `title` | String(150) | Not Null | Display name (e.g., "Israeli Mortgage Strategist"). |
| `domain` | String(50) | Not Null | Domain classification (`mortgage`, `tax`, `pensions`, `investments`, `insurance`, `budget`, `life_events`). |
| `description` | Text | Nullable | Advisor scope and theoretical reference resources. |
| `is_shared` | Boolean | Default True | Accessible by all profiles. |

#### **Specialized Advisor Domains Catalog**:
1. **Mortgage & Refinancing Strategist**:
   - Optimizes track mix (Prime vs. Kalatz vs. CPI-linked), calculates early repayment penalties (עמלת פרעון מוקדם), models Bank of Israel interest rate cycles.
2. **Israeli Tax & Capital Gains Specialist (מומחה מיסוי ונדל״ן)**:
   - Calculates purchase tax brackets (מדרגות מס רכישה), capital gains tax (מס שבח ורווחי הון), tax-loss harvesting (קיזוז הפסדים), study fund exemption limits.
3. **Pensions & Retirement Optimization Advisor**:
   - Benchmarks management fees vs. national caps, simulates pension capital at retirement, projects tax-free annuity withdrawals.
4. **Insurances & Redundancy Auditor (ביטוחים וכפל ביטוחי)**:
   - Identifies duplicate coverage across life, health, critical illness, and mortgage insurance; flags overpriced or unnecessary riders.
5. **Investment & Portfolio Allocation Advisor**:
   - Evaluates asset allocation, global index exposure, currency hedging (USD/ILS), and broker commission drag.
6. **Household Budget & Cashflow Coach**:
   - Detects subscription creep, analyzes seasonal expense swings, models emergency fund runways.
7. **Major Life Events & Relocation Planner**:
   - Models financing for home purchases, child education trusts, relocation tax rules, and estate planning.

---

## 4. Handling Incomplete & Partial Ingestion Workflows

In real personal finance, users input data incrementally. The application handles this through four concrete mechanisms:

1. **Null-Safe Default Aggregations**:
   - Every analytical formula provides fallbacks: `remaining_balance || 0.0`, `interest_rate || 0.0`.
   - The UI never renders blank error screens; missing values display as `—` with an edit pencil.
2. **Entity Completeness Badges**:
   - Each entity displays an amber badge if required financial attributes are missing:
     - `⚠️ Missing: Management Fees (0/2 filled)`
     - `⚠️ Missing: Amortization End Date`
3. **NotebookLM Incremental Gap-Filling**:
   - When the user uploads a new document later (e.g. a new pension letter), the system prompts NotebookLM:
     > *"We currently have a pension record for Menora with balance ₪ 450,000, but missing management fees. From this new document, can you find and extract the missing deposit fee and accumulation fee?"*
   - NotebookLM returns the missing fields to patch the existing record without duplicating it.

---

## 5. Summary Table: Application Views vs. Schema Entities

| Application Hub | Primary Entities | Calculated KPIs & Analytics | Partial Data Behavior |
| :--- | :--- | :--- | :--- |
| **Executive Overview** | `accounts`, `transactions`, `pension_policies`, `real_estate_properties`, `mortgage_tracks` | Total Net Worth, Monthly Net Cashflow, Liquid vs Illiquid assets. | Omits missing balances gracefully, displays net worth based on known assets. |
| **Expenses Hub** | `accounts`, `transactions`, `receipts`, `receipt_items`, `categories`, `transaction_tags` | Monthly burn rate, Category tree drilldown, Multi-currency FX fees, Tagged expenses. | Uncategorized items fall into "Uncategorized" bucket; multi-currency items show both native and converted ILS. |
| **Savings & Investments**| `accounts` (brokerage & kids), `transactions` | Time-weighted deposits, Dynamic XIRR yield, 18-Year Compound Simulator. | XIRR computes over known cashflow dates; missing valuations prompt user. |
| **Pensions & Insurances**| `pension_policies` | Total Retirement Equity, Fee Benchmarks vs Israeli Caps, Coverage Audit. | Displays known policies; flags missing fee percentages without crashing. |
| **Real Estate & Mortgages**| `real_estate_properties`, `mortgage_tracks`, `property_mortgage_links`, `financial_events`, `event_expenses` | Net Equity, Net Rental Yield, LTV Ratios, Adjusted Cost Basis (with taxes & fees). | Calculates yield if rent and value exist; shows mortgage debt per linked tranche. |
| **Receipt Vault** | `receipts`, `receipt_items`, `transactions` | Official invoice archive, Line-item SKU extraction, Confidence scoring. | Unreviewed receipts remain in "Pending Review" without affecting the master ledger. |
| **Scenario Simulator** | `transactions`, `mortgage_tracks`, `pension_policies`, `financial_events` | Inflation sensitivity, Bank of Israel Prime rate shocks, Emergency runway. | Simulates shocks on populated tranches; ignores tracks with missing rates. |
| **Settings & Advisors** | `profiles`, `settings`, `advisor_notebooks` | Active Profile ID, Linked Personal Notebook, Advisor Expert consultations. | Allows switching advisors and inspecting resources/artifacts dynamically. |
