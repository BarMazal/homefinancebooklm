# Home Finance BookLM — Backlog & Roadmap (TODO)

## 1. Advisor Notebooks Layer (Domain Expert Consulting)
- [ ] **Dual-Role Notebook Architecture**:
  - **`profile_management_notebook` (1:1 per Profile)**: Holds the user's actual personal ledger, uploaded financial statements, receipts, and household notes.
  - **`advisor_notebook` (Domain Experts, 1:N Shared Across Profiles)**:
    - Built with global industry knowledge, academic theory, and statutory regulations (e.g., *Israeli Real Estate & Capital Gains Tax Expert*, *Mortgage Refinancing Strategist*, *Pension & Insurance Fee Benchmark Advisor*, *Index Portfolio Allocation Specialist*).
    - Contains NO personal data in its permanent sources/notes.
- [ ] **Ephemeral Scenario Consultation Workflow**:
  - The local application extracts a structured, anonymized snapshot of a relevant financial scenario (e.g. "Household current mortgage tranches with Prime 5.75% and Kalatz 4.2%").
  - Sends the snapshot to the Advisor Notebook via `client.chat.ask` as a temporary case study.
  - Receives expert recommendations, sensitivity analysis, and regulatory guidance.
  - User can choose whether to save the advisor's recommendations as a note in their personal profile notebook.
- [ ] **Generalization / Continuous Improvement**:
  - Allow the Advisor LLM to extract generalizable lessons or common edge cases into its own research notes without storing raw user identity or private account details.

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

## 4. Financial Schema & Accounting Enhancements
- [ ] **Transaction Multi-Currency & Commission Breakdown**:
  - Support `original_amount`, `original_currency`, `exchange_rate`, and `fee_amount` on transactions.
- [ ] **Receipt Itemization (Split Ledger Breakdown)**:
  - Link 1 macro `Transaction` to 1 official `Receipt`, with `ReceiptItem` child rows for SKU-level category breakdown without duplicating the macro cashflow line.
- [ ] **Hierarchical Taxonomy & Orthogonal Tags**:
  - Strict tree category hierarchy (e.g., `Car > Fuel`, `Car > Insurance`, `Housing > Insurance`) to ensure $1 = $1 in budget totals.
  - Orthogonal multi-tags (`#vacation`, `#kids`, `#reimbursable`) for flexible cross-category slicing.
- [ ] **Many-to-Many Property <-> Mortgage Collateral Links**:
  - Allow multiple mortgages on one property and multi-property collateral allocations.
- [ ] **Real Estate Acquisition & Disposal Cost Basis**:
  - Track purchase tax (Mas Rechisha), legal & broker fees, renovation capital, and capital gains / betterment taxes (Mas Shevach / Hetel Hashbacha).

## 5. Partial Data Resilience & Completeness Health Engine
- [ ] **Graceful Null-Safe Views**:
  - Ensure all dashboards, charts, and math routines render safely with partial records (e.g. pension with known balance but missing management fee).
- [ ] **Data Completeness Indicators**:
  - Visual badges highlighting missing fields with one-click completion prompts.
