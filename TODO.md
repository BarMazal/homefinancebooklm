# Home Finance BookLM — Backlog & Roadmap (TODO)

## 1. NotebookLM Bi-Directional Synchronization (Local DB → NotebookLM)
- [ ] **Sync Local DB to NotebookLM (Local-to-Cloud)**:
  - When new transactions, bank statements, or receipts are approved in the local application, format them into structured ledger notes or Markdown summary tables.
  - Use `notebooklm-py` (`client.sources.add_text` or `client.notes.create`) to upload or append the structured financial ledger directly to the active profile's connected NotebookLM notebook.
  - Maintain synchronization status flags (`synced_to_notebooklm: bool`, `synced_at: timestamp`) on local `Transaction`, `Receipt`, and `PensionPolicy` records.
  - Enable NotebookLM's cloud Gemini model to have the up-to-date household ledger for conversational queries, podcast/audio generation, and AI insights.

## 2. Granular LLM-Driven Resource Extraction
- [ ] **Resource-by-Resource Data Extraction**:
  - Iterate through connected notebook sources one-by-one.
  - Prompt NotebookLM via `client.chat.ask` using our structured JSON schema specifications.
  - Parse responses into validated local records with confidence scores.
- [ ] **Artifact Ingestion as RAG Sources**:
  - Download relevant artifacts (data tables, custom reports) and add them as queryable sources in the notebook if deeper retrieval is needed.
- [ ] **Conflict Resolution UI for Pre-Existing Profiles**:
  - Display side-by-side diff table for conflicting records when running retro-scan on a profile with existing records.

## 3. OCR & Document Pre-Processing Enhancements
- [ ] Leverage NotebookLM multi-modal processing for blurry or handwritten Hebrew receipts before falling back to local EasyOCR.
