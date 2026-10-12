# Home Finance BookLM — Backlog & Roadmap (TODO)

## 1. Advisor Notebooks Layer (Domain Expert Consulting)
- [ ] **Dual-Role Notebook Architecture**:
  - **`profile_management_notebook` (1:1 per Profile)**: Holds the user's actual personal ledger, uploaded financial statements, receipts, and household notes.
  - **`advisor_notebook` (Domain Experts, 1:N Shared Across Profiles)**:
    - Built with global industry knowledge, academic theory, and statutory regulations.
    - Contains NO personal data in its permanent sources/notes.
- [ ] **Advisor Catalog Specializations**:
  - **Mortgage & Refinancing Strategist**: Track mix (Prime vs. Kalatz vs. CPI), early repayment penalty calculations (עמלת פרעון מוקדם), BOI cycle stress tests.
  - **Israeli Tax & Capital Gains Specialist (מומחה מיסוי ונדל״ן)**: Purchase tax brackets (מדרגות מס רכישה), capital gains (מס שבח ורווחי הון), tax loss harvesting.
  - **Pensions & Retirement Optimization Advisor**: Management fee ceiling benchmarking, retirement capital projections, tax-free annuity optimization.
  - **Insurances & Redundancy Auditor**: Double coverage detection (כפל ביטוחי), rider audit.
  - **Investment & Portfolio Allocation Advisor**: Asset allocation, S&P 500 / global index drag, currency hedging (USD/ILS), broker fee auditing.
  - **Household Budget & Cashflow Coach**: Subscription creep detection, seasonal variance smoothing, emergency runway math.
  - **Major Life Events & Relocation Planner**: Real estate purchase financing, education trusts, relocation tax rules.
- [ ] **Ephemeral Scenario Consultation Workflow**:
  - Extract a structured, anonymized snapshot of a relevant financial scenario from local DB.
  - Send the snapshot to the Advisor Notebook via `client.chat.ask` as a temporary case study.
  - Receive expert recommendations, sensitivity analysis, and regulatory guidance.
  - Optional generalization feedback loop to improve advisor notes without storing private user identity.

## 2. NotebookLM Bi-Directional Synchronization (Local DB → NotebookLM)
- [ ] **Sync Local DB to NotebookLM (Local-to-Cloud)**:
  - When new transactions, bank statements, or receipts are approved in the local application, format them into structured ledger notes or Markdown summary tables.
  - Use `notebooklm-py` (`client.sources.add_text` or `client.notes.create`) to upload or append the structured financial ledger directly to the active profile's connected NotebookLM notebook.
  - Maintain synchronization status flags (`synced_to_notebooklm: bool`, `synced_at: timestamp`) on local `Transaction`, `Receipt`, and `PensionPolicy` records.
  - Enable NotebookLM's cloud Gemini model to have the up-to-date household ledger for conversational queries, podcast/audio generation, and AI insights.

## 3. Granular LLM-Driven Resource Extraction
- [ ] **Resource-by-Resource Data Extraction**:
  - Iterate through connected notebook sources one-by-one.
  - Prompt NotebookLM via `client.chat.ask` using our structured JSON schema specifications.
  - Parse responses into validated local records with confidence scores.
- [ ] **Artifact Ingestion as RAG Sources**:
  - Download relevant artifacts (data tables, custom reports) and add them as queryable sources in the notebook if deeper retrieval is needed.
- [ ] **Conflict Resolution UI for Pre-Existing Profiles**:
  - Display side-by-side diff table for conflicting records when running retro-scan on a profile with existing records.

## 4. Financial Lifecycle Events & Cost Bundling (`financial_events`)
- [ ] **Generalized Event Expense Bundles**:
  - Group auxiliary fees, official taxes, and professional payments into a single Event:
    - *Real Estate Purchase/Sale*: Lawyer fee, Land Registry (Tabu), Appraiser (Shamai), Mortgage opening fee, Consultant, Mas Rechisha / Mas Shevach.
    - *Account Setup*: Brokerage opening fee, notary, apostille, custody fees.
    - *Home Remodeling*: Architect, materials, contractor payments, city permits.
  - Compute true Total Cost of Ownership (TCO) and Capital Cost Basis.

## 5. Orthogonal Tags & Hybrid Auto-Tagging Engine
- [ ] **3-Tier Auto-Tagging System**:
  - *Tier 1: Deterministic Rules*: Merchant keywords (El Al -> `#vacation`), account types (`kids_savings` -> `#kids`), and trip date windows.
  - *Tier 2: NotebookLM Ingestion*: LLM assigns contextual tags during receipt/statement parsing.
  - *Tier 3: User Overrides & Memory*: Interactive tag chips with add/remove controls; remembers suppressed tags to prevent auto-reapplication.

## 6. Financial Schema & Accounting Enhancements
- [ ] **Transaction Multi-Currency & Commission Breakdown**:
  - Support `original_amount`, `original_currency`, `exchange_rate`, and `fee_amount` on transactions.
- [ ] **Receipt Itemization (Split Ledger Breakdown)**:
  - Link 1 macro `Transaction` to 1 official `Receipt`, with `ReceiptItem` child rows for SKU-level category breakdown without duplicating the macro cashflow line.
- [ ] **Hierarchical Taxonomy ($1 = $1)**:
  - Strict tree category hierarchy (e.g., `Car > Fuel`, `Car > Insurance`, `Housing > Insurance`) ensuring non-duplicative budget totals.
- [ ] **Many-to-Many Property <-> Mortgage Collateral Links**:
  - Allow multiple mortgages on one property and multi-property collateral allocations.

## 7. Partial Data Resilience & Completeness Health Engine
- [ ] **Graceful Null-Safe Views**:
  - Ensure all dashboards, charts, and math routines render safely with partial records (e.g. pension with known balance but missing management fee).
- [ ] **Data Completeness Indicators**:
  - Visual badges highlighting missing fields with one-click completion prompts.
