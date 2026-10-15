# Actions Log (Claude Code)

This file records each action Claude Code takes on this repository: when it happened and what changed.
The project is mainly developed in AntiGravity. Claude Code changes nothing in the application without first agreeing it with the owner.

---

## 2026-10-15 07:30 UTC — Initial review (no application code changed)

**Branch:** `claude/friendly-hypatia-s7u2ox`

### What was done
1. Read the repository from end to end: backend (`app/`), frontend (`frontend/src/`), docs (`requirements.md`, `design.md`, `DATA_SCHEMA_SPEC.md`, `TODO.md`) and the scripts (`install.*`, `run.*`, `inspect_db.py`).
2. Set up a local Python virtual environment (`venv/`, which git ignores) in the cloud container.
   - Installed everything in `requirements.txt` except `easyocr` and `opencv-python-headless`, which are heavy and only needed for receipt OCR.
3. Started the backend (`uvicorn app.main:app --port 8910`) to check that it runs here. It did:
   - `/api/health` returned OK.
   - `/api/profiles` returned only the 2 default profiles: "Demo Profile" and "Personal Household (Clean Slate)".
   - The Demo Profile dashboard loaded with its seeded sample data.
   - The live USD/ILS FX rate fetch got `403` because of the container's network policy, so the app used its built-in default of 3.65.
4. Stopped the backend.

### Files changed
- `Actions.md`: created (this file).
- No application source files were changed.

### Findings about the "Ingestion try" profile
- `data/` (`profiles.json`, the per-profile SQLite DBs, `storage_state.json`) and `.chromium_profile_*/` are listed in `.gitignore`. The "Ingestion try" profile and its database therefore exist only on the owner's local Windows machine and are not part of the clone.
  - `inspect_db.py` hard-codes `data/profile_4/homefinance.db`, so "Ingestion try" is probably profile #4 locally.
- Re-running the ingestion (Settings → NotebookLM retro scan, `/api/notebooklm/scan-retro-stream`) requires:
  1. An authenticated Google NotebookLM session (`data/profile_<id>/storage_state.json`). That session is created by `auth_launcher.py`, which opens a visible (headed) browser for an interactive Google login. That login cannot be done in this headless cloud container.
  2. The NotebookLM notebook ID linked to the profile (`settings.json` → `notebooklm_notebook_id`).
- The ingestion itself is deterministic. `statement_parser.parse_statement_text` parses each notebook source and note (Leumi CSV, credit-card CSV, Otsar HaHayal CSV, receipt transcripts, vertical text). After the user approves the preview, `/commit-retro` writes the transactions and creates any missing accounts.
