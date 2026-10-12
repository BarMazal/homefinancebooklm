# Home Finance BookLM — Complete Data Architecture & Schema Specification

This document defines the comprehensive data structure for **Home Finance BookLM**. It details every entity, every attribute, the architectural justification (**the WHY**), and the exact role each element plays across the application's hubs, calculations, analytical reports, and NotebookLM integration.

---

## 1. Architectural Philosophy: Local-First Intelligent AI & Advisor Ecosystem

The architecture is built around four core principles:

1. **Per-Profile Physical Isolation**: Each household, user, or scenario has its own SQLite database (`data/profile_<id>/homefinance.db`), uploaded asset folder (`data/profile_<id>/uploads/`), and isolated browser session (`.chromium_profile_<id>/`).
2. **Determinism vs. Reasoning Separation**:
   - **Local DB**: Stores deterministic, audit-proof financial numbers, exact dates, tax identifiers, foreign exchange execution rates, and amortization schedules.
   - **NotebookLM Cloud**: Serves as the reasoning engine — parsing unstructured documents (receipts, salary slips, policy letters), performing semantic reconciliation, and generating strategic insights.
3. **Dual Notebook Roles: Profile Management vs. Domain Advisor Experts**:
   - **`profile_management_notebook` (1:1 per Profile)**: Holds the user's actual personal financial records, receipts, bank statements, and family notes. Private and strictly bound to the profile.
   - **`advisor_notebook` (Domain Experts, 1:N Shared Across Profiles)**:
     - Contains **global, theoretical, and regulatory knowledge** (e.g., *Israeli Tax Law & Capital Gains*, *Mortgage Optimization Strategist*, *Pension & Insurance Fee Benchmark Advisor*, *Index Fund Portfolio Allocation*).
     - Contains **NO permanent user data**.
     - When the user consults an advisor, the local app injects a **temporary, bounded scenario slice** (e.g., current mortgage tranches) as a case study for advice. The expert analyzes the case, answers queries, and general insights can be saved back into the user's private notebook.
4. **Resilience to Partial & Incremental Data**:
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
 └─────────────┘             │  (Split)    │
                             └─────────────┘
        │
        ├───────────────────────────┐
        ▼                           ▼
┌──────────────┐            ┌──────────────┐
│ Category     │            │ Transaction  │
│ (Hierarchical│            │ Tags         │
│ Tree $1 = $1)│            │ (Orthogonal) │
└──────────────┘            └──────────────┘

┌───────────────────────┐            ┌───────────────────────┐
│ Real Estate Property  │◄── M : N ──►│    Mortgage Track     │
│ (with Buy/Sell Taxes) │            │ (Tranche Amortization)│
└───────────────────────┘            └───────────────────────┘
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
| `notes` | Text | Nullable | Statement description, OCR notes, or user remarks. |
| `receipt_id` | Integer | FK(receipts.id), Nullable | Linked evidentiary receipt (if scanned/uploaded). |

#### **The WHY & Application Usage**:
- **Why `DateTime` instead of just `Date`?**: Preserves the chronological order of transactions that occur on the same day (e.g., morning coffee, afternoon supermarket, evening restaurant) and enables exact timestamp matching against digital receipts.
- **Why per-transaction `exchange_rate` and `fee_amount`?**: Foreign currency transactions do not use official mid-market rates; each card company and broker adds their own markup (e.g., 2.5% FX fee or specific broker conversion rate). Storing the exact conversion rate and fee ensures the local ledger reconciles to the penny with the actual bank statement.
- **Why `amount` is in base currency (ILS)**: Allows fast, exact aggregations (`SUM(amount)`) without doing runtime FX lookups for past dates.
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
- **How to avoid duplication between Receipts and Transactions**:
  - A `Receipt` is **evidence**, not a duplicate cash outflow.
  - The bank/credit card statement has 1 line: `-₪ 450.00 at Shufersal` (`Transaction`).
  - The `Receipt` confirms this transaction with the physical image, tax invoice number, and cashier timestamp.
  - The relationship is 1:1 between the macro `Transaction` and the `Receipt`. Total cashflow counts ONLY the `Transaction.amount` to prevent double counting.

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
- **Why this table is needed**: A ₪ 500 supermarket trip contains groceries, baby diapers, and household cleaning supplies. `receipt_items` allows breaking down the macro transaction into precise sub-categories without creating 30 separate bank transactions.
- **Used in**: Receipt Vault inspection, inflation/price tracking over time for identical items, granular category analytics.

---

### Table 6: `categories` & `transaction_tags` (Hierarchy & Multi-Classification)

#### **1. Category Hierarchy (Strict Tree: $1 = $1)**
To prevent double-counting in budgets, every transaction or receipt item belongs to **exactly one leaf node** in a hierarchical category tree:

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

#### **2. Orthogonal Tags (Multi-Label Facets)**
Items often have cross-cutting dimensions that should not break the category tree:
- A trip to the supermarket for vacation supplies: Category = `Groceries > Supermarket`, Tag = `#vacation`.
- A doctor visit for a child: Category = `Health > Specialist`, Tag = `#kids`.
- A business lunch: Category = `Food > Restaurants`, Tag = `#work_reimbursable`.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `transaction_id` | Integer | FK(transactions.id), PK | Linked transaction. |
| `tag` | String(50) | PK, Index | Orthogonal tag (e.g., `vacation`, `kids`, `reimbursable`). |

#### **The WHY & Solving Double-Counting**:
- When calculating monthly spending or budget totals, the system groups strictly by the **Category Tree**. Because every expense has exactly one leaf category, mathematical summation is 100% additive ($1 is counted once).
- When the user wants to see "How much did our trip to Eilat cost?", the app queries `WHERE tag = 'vacation'`, aggregating across Hotels, Fuel, Restaurants, and Attractions without interfering with the standard monthly budget.

---

### Table 7: `pension_policies`
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

#### **The WHY & Resilience to Partial Data**:
- **Why this structure is needed**: Users rarely have their full pension details on day 1. They might only know their provider and that they have a pension.
- **Handling Partial Data**: All numeric fields default to 0.0. The policy is displayed immediately in the Pensions Hub with a "Missing Management Fees" badge. Net worth calculations use the known `accumulated_balance`, and the app does not fail if fee percentages are unknown.
- **Used in**: Pensions & Insurances Hub, Fee Optimization Benchmark, Retirement Runway projection.

---

### Table 8: `real_estate_properties`
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

#### **The WHY & Tax Integration**:
- Real estate returns are heavily distorted if purchase taxes (Mas Rechisha), legal fees, and renovations are ignored.
- Storing acquisition costs calculates true **Adjusted Cost Basis**:
  $$\text{Cost Basis} = \text{purchase\_price} + \text{purchase\_tax} + \text{acquisition\_fees} + \text{renovation\_cost}$$
- Net equity considers outstanding mortgage debt and potential exit tax (Mas Shevach) upon sale.
- **Used in**: Real Estate & Mortgages Hub (Net Rental Yield, LTV equity bar, liquidation scenario simulator).

---

### Table 9: `mortgage_tracks` & `property_mortgage_links` (Many-to-Many Linking)

A mortgage can be secured against multiple properties, and a property can have multiple mortgages (e.g. Bank Leumi 1st lien + Mezzanine loan).

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

#### **The WHY & Bidirectional Awareness**:
- The property knows its exact mortgage liabilities (aggregating all linked mortgage tracks).
- The mortgage knows which physical collateral properties back it.
- **Used in**: Property LTV calculation, Refinancing Simulator, Bank of Israel Prime shock stress-testing.

---

### Table 10: `advisor_notebooks` (Domain Experts)
Registers global advisor notebooks accessible across profiles.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-Inc | Unique advisor identifier. |
| `notebook_id` | String(100) | Unique, Not Null | Google NotebookLM Notebook ID. |
| `title` | String(150) | Not Null | Display name (e.g., "Israeli Real Estate Tax Specialist", "Mortgage Strategist"). |
| `domain` | String(50) | Not Null | Domain classification (`tax`, `mortgages`, `pensions`, `investments`). |
| `description` | Text | Nullable | Overview of the advisor's theoretical knowledge and resources. |
| `is_shared` | Boolean | Default True | Accessible by all profiles. |

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
| **Expenses Hub** | `accounts`, `transactions`, `receipts`, `receipt_items`, `categories` | Monthly burn rate, Category tree drilldown, Multi-currency FX fees, Tagged expenses. | Uncategorized items fall into "Uncategorized" bucket; multi-currency items show both native and converted ILS. |
| **Savings & Investments**| `accounts` (brokerage & kids), `transactions` | Time-weighted deposits, Dynamic XIRR yield, 18-Year Compound Simulator. | XIRR computes over known cashflow dates; missing valuations prompt user. |
| **Pensions & Insurances**| `pension_policies` | Total Retirement Equity, Fee Benchmarks vs Israeli Caps, Coverage Audit. | Displays known policies; flags missing fee percentages without crashing. |
| **Real Estate & Mortgages**| `real_estate_properties`, `mortgage_tracks`, `property_mortgage_links` | Net Equity, Net Rental Yield, LTV Ratios, Adjusted Cost Basis (with taxes). | Calculates yield if rent and value exist; shows mortgage debt per linked tranche. |
| **Receipt Vault** | `receipts`, `receipt_items`, `transactions` | Official invoice archive, Line-item SKU extraction, Confidence scoring. | Unreviewed receipts remain in "Pending Review" without affecting the master ledger. |
| **Scenario Simulator** | `transactions`, `mortgage_tracks`, `pension_policies` | Inflation sensitivity, Bank of Israel Prime rate shocks, Emergency runway. | Simulates shocks on populated tranches; ignores tracks with missing rates. |
| **Settings & Advisors** | `profiles`, `settings`, `advisor_notebooks` | Active Profile ID, Linked Personal Notebook, Advisor Expert consultations. | Allows switching advisors and inspecting resources/artifacts dynamically. |
