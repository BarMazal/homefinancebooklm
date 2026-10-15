# Changes

A log of changes made to this project by Claude (Claude Code), picking up from the work
done by Antigravity (AG). AG designed and built the app — the multi-profile isolation,
the NotebookLM integration (OCR + semantic gap-filling + fiscal advisor), the streaming
ingestion/review queue, dashboards, and everything else. The changes below are small,
targeted additions on top of that foundation. AG's uncommitted work in the tree at the
time (dashboard, transactions, expenses, etc.) was left untouched.

---

## 2026-10-15 — Background NotebookLM connection + faster startup

### The request
On app load the screen took a while to refresh, suspected to be waiting on the NotebookLM
connection. Goal: run the connection in the background, and on the Authentication page show
a visual "connecting" notification with the action buttons disabled until the connection
attempt succeeds or fails.

### What was actually slow (measured)
| Item | Before | After |
|---|---|---|
| Backend startup (process start → first `/api/health`) | ~6–9.6 s | ~2.2 s |
| `GET /api/notebooklm/status` (connected profile) | 1.7 s (up to 3.5 s timeout) | unchanged, but no longer on the UI's critical path |
| `GET /api/notebooklm/connection-state` (new) | — | ~5 ms, always instant |

The largest cost was **not** NotebookLM: `app/services/ocr_service.py` imported torch +
EasyOCR and constructed `easyocr.Reader` at module import time (pulled in by
`app/routes/receipts.py`), so the backend could not accept requests until ~8 s of OCR model
loading finished. NotebookLM's live session verification added another 1.5–3.5 s on top
whenever the Settings page (or the app-level status check) asked for it.

### Backend changes

**`app/services/ocr_service.py`**
- EasyOCR is now loaded lazily via a new thread-safe `get_reader()` instead of at import
  time. `process_receipt_ocr()` calls `get_reader()` on first use. Behavior is otherwise
  identical (falls back to `None` reader if EasyOCR fails to load).

**`app/services/notebooklm_service.py`**
- New per-profile background connection machinery:
  - `self._connect_tasks` (running `asyncio.Task` per profile) and `self._last_connection`
    (last finished result per profile).
  - `start_background_connect(profile_id, force=False)` — starts (or reuses an already
    running) background connection check. Never awaited by request handlers.
  - `get_connection_state(profile_id)` — returns instantly: `state: "connecting"` while the
    check runs, then `"connected"` / `"disconnected"` with the result (email, nb_profile…).
    Starts a check automatically if none ever ran for the profile. `browser_active` is
    always computed live.
  - `_is_browser_active(profile_id)` helper.
- `check_connection_status()` keeps its exact original logic (moved into
  `_check_connection_now()`), plus:
  - new `force` param that bypasses the 60 s status cache;
  - if a background check is already running for the profile, it awaits that task instead
    of opening a second concurrent `NotebookLMClient` on the same `storage_state.json`;
  - records its result in `_last_connection` so the app-level state stays in sync (e.g.
    after the interactive login browser completes).
- `disconnect_account()` and `set_nb_profile_name()` now clear the cached status /
  last connection for that profile so the UI never shows a stale "connected" state.

**`app/routes/notebooklm.py`**
- `GET /api/notebooklm/connection-state` — instant background-connection state.
- `POST /api/notebooklm/connect` — (re)starts a forced background check, returns instantly.
- Existing `GET /api/notebooklm/status` is unchanged for callers (still used by the login
  polling loop).

**`app/main.py`** (lifespan)
- On startup, kicks off a background task that first runs the NotebookLM connection check
  for the active profile and then AG's existing notebook-details prefetch (sequenced so the
  two don't open concurrent clients on the same storage file). Nothing is awaited, so the
  API serves immediately.
- Warms EasyOCR in a worker thread (`asyncio.to_thread(get_reader)`) so the first receipt
  upload doesn't pay the model-load cost.

**`app/routes/profiles.py`**
- Activating a profile also starts a forced background connection check for it (next to
  AG's existing prefetch).

### Frontend changes

**`frontend/src/App.jsx`**
- New app-level state: `notebookLmConnecting` (starts `true`), `connectionInfo`.
- New `checkNotebookConnection(profileId, restart)` poller: calls
  `/connection-state` (or `POST /connect` when `restart`), polls every 1 s while
  `state === "connecting"`, retries every 2 s if the backend isn't up yet, and ignores
  late results after a profile switch. Runs whenever the active profile id changes.
- This poller is now the single source of truth for `notebookLmConnected`;
  `fetchNotebookData()` only loads notebook details (it no longer chains a blocking
  `/status` call).
- Passes `notebookLmConnecting`, `connectionInfo`, `onCheckConnection` to `SettingsView`
  and `notebookLmConnecting` to `Navigation`.

**`frontend/src/components/SettingsView.jsx`** (Settings & Authentication page)
- `checkingStatus` is now derived from the app-level `notebookLmConnecting` prop, so the
  connecting state is visible even if the user navigates to the page mid-check.
- While connecting:
  - status badge shows a spinning **"Connecting..."** pill;
  - header subtitle reads "checking Google NotebookLM connection...";
  - a new **"Connecting to Google NotebookLM..."** banner explains that account actions are
    disabled until the check finishes;
  - disabled: *Launch Login / Switch Account*, *Refresh Status*, *Disconnect*,
    *Set Internal Profile*, *Reset Default*, *Browse Account Notebooks*, and the
    auth-required modal's login button.
  - All re-enable automatically when the check succeeds or fails.
- *Refresh Status* (and the post-disconnect / post-profile-name-change refreshes) now
  trigger a non-blocking background re-check via `onCheckConnection(true)` instead of a
  blocking `/status` request.
- The page no longer fires its own `/status` request on every visit; it mirrors
  `connectionInfo` (email, internal profile name, browser-active) from the app state.
- After a successful interactive browser login, the app-level state is synced
  (`onCheckConnection(false)`, instant).

**`frontend/src/components/Navigation.jsx`**
- Sidebar "NotebookLM AI" badge shows a spinning "Connecting..." (blue dot) while the
  background check runs. Added `RefreshCw` icon import.

**`frontend/src/index.css`**
- Added the `.animate-spin` keyframe utility. The project doesn't use Tailwind, so the
  existing `className="animate-spin"` spinners in `SettingsView` were not actually
  animating before. *(Superseded the same day by the "money counting" loader — see below.)*
- Added `:disabled` styling for `.btn-primary` / `.btn-secondary` (dimmed, `not-allowed`
  cursor) so disabled buttons are visibly disabled.

### Verified
- Backend on a spare port: startup ~2.2 s; `/connection-state` goes `connecting` →
  `connected` (profile #4) and `connecting` → `disconnected` (profile #2, no login);
  `POST /connect` re-runs the check.
- UI in a browser: during a check, the banner + both "Connecting..." badges render and all
  five auth buttons are disabled; after the check, the banner disappears and the buttons
  re-enable. `npm run build` passes.

### Observations
- *(Fixed later the same day — see "Hebrew receipt OCR" below.)* **EasyOCR doesn't support Hebrew.** `easyocr.Reader(['en', 'he'])` raises
  `({'he'}, 'is not supported')`, so the receipt OCR reader has always been `None` and
  `process_receipt_ocr()` silently returns placeholder values. Previously this failure
  was swallowed at import after ~8 s of loading torch. Options: use `['en']` only, or
  switch Hebrew OCR to Tesseract (`heb` traineddata) / NotebookLM.
- *(Fixed later the same day.)* `app/routes/receipts.py` called the synchronous
  `process_receipt_ocr()` directly inside an `async` route, blocking the event loop.
- `run.ps1` starts uvicorn with `--reload`, but a running instance on 8910 didn't pick up
  these changes during testing — restart the app to load them.

---

## 2026-10-15 (later) — Hebrew receipt OCR, "money counting" loader, dummy-proof OCR install

### Hebrew receipt OCR (it had never worked)
EasyOCR has no Hebrew model, so the receipt reader was always `None`, and receipt uploads
also always failed with HTTP 500 because of a schema bug (below). Agreed design with the
user: **NotebookLM + Tesseract**.

What was found while testing against a real NotebookLM account: NotebookLM accepts
images (and image-only PDFs) as sources, but its API only exposes the **image URL** as the
source's full text, plus a vague summary without numbers. The OCR'd text is only reachable
through the chat, which would write into the user's own NotebookLM conversation, so chat
is deliberately **not** used. The resulting pipeline:

- **Tesseract (local, Hebrew + English)** reads images and scanned PDFs. This is what
  actually extracts the text from photos.
- **PDF text layer** (via `pypdfium2`) is used directly when usable; when it is missing or
  stores Hebrew in reversed visual order, pages are rendered and OCR'd with Tesseract.
- **NotebookLM**: every receipt is uploaded as a source (`Receipt - <filename>`) into the
  profile's linked notebook, so the fiscal advisor and the retro scan can use it. Its full
  text is preferred when it is real text (text-based PDFs/docs). The upload runs in
  parallel with local OCR, so the wait is the slower of the two (~10–15 s), not the sum.
- **Hebrew-aware parsing** extracts the merchant, date, total, category and line items.

**`app/services/ocr_service.py`** (rewritten)
- Removed EasyOCR (and its ~8 s torch import).
- `get_tesseract_config(refresh=False)` finds `tesseract.exe` (PATH, Program Files,
  LocalAppData) and prefers the project-local `data/tessdata` (via `TESSDATA_PREFIX`;
  `--tessdata-dir` with a quoted path breaks under pytesseract on Windows). It uses
  `heb+eng` when available.
- `local_ocr()` / `_tesseract_image()`: EXIF-rotate, grayscale, upscale and autocontrast,
  then `--psm 4`. Confidence comes from Tesseract's word confidences.
- `parse_receipt_text()`:
  - reuses AG's `parse_statement_text` receipt branch when it yields one record;
  - otherwise uses Hebrew/English total keywords (`סה"כ לתשלום`, `לתשלום`, `סה"כ`,
    `סך הכל`, `total`…), skipping VAT/change/discount lines;
  - takes the merchant from `שם העסק:` or the first non-generic header line;
  - handles line items in both "name price" and RTL "price name" order;
  - picks the category with AG's `guess_category`.
- `process_receipt_ocr()` is now `async` and runs NotebookLM upload + local OCR concurrently.
  It returns the previous fields plus `raw_text`, `ocr_engine` and `notebooklm_error`
  (`confidence_scores` stays float-only, as the schema expects).
- `get_ocr_status()` / `start_ocr_install()` back the Receipts-page install prompt.

**`app/services/notebooklm_service.py`**
- `upload_document_source()` uploads a file as a source to the linked notebook, waits
  until it is ready, returns its full text, and refreshes the explorer cache in the
  background.

**`app/routes/receipts.py`**
- `upload_receipt` now `await`s the async OCR, so the event loop is no longer blocked, and
  logs the engine used (ASCII-safe: a Hebrew merchant name in `print()` could crash under
  a cp1252 console).
- New `GET /api/receipts/ocr-status?refresh=` and `POST /api/receipts/install-ocr`.

**`app/schemas.py`** — bug fix
- `ReceiptResponse.date: Optional[date] = None` inside the class made the annotation
  resolve to the field's own default (`None`), so **every** receipt upload failed response
  validation with HTTP 500 (the row was saved, but the UI never got it). Fixed with a
  `DateType = date` alias.

**`app/services/statement_parser.py`**
- `guess_category()` now prefers the **longest** matching keyword instead of the first,
  so e.g. `סופר-פארם` → Health & Pharma (it used to hit the generic `סופר` → Groceries).
  This applies to statements too.

**`app/main.py`**
- Startup detects Tesseract in a background thread and logs whether Hebrew OCR is ready
  (replaces the EasyOCR warm-up).

**`requirements.txt`**
- Removed `easyocr` (pulls in torch, and has no Hebrew); added `pypdfium2`. Torch is
  still installed in the existing venv but is no longer imported.

### Dummy-proof OCR installation
- **`install_ocr.ps1`** (new): installs Tesseract via winget (`UB-Mannheim.TesseractOCR`)
  and downloads `heb` + `eng` traineddata (tessdata_best) into `data\tessdata`. It is
  idempotent; `-CheckOnly` exits 0/1.
- **`install.ps1` / `install.bat`** call it.
- **`run.ps1` / `run.bat`** check on every launch; if OCR is missing they ask
  "Install it now? [Y/n]" and run the installer.
- **Receipts page**: if Hebrew OCR isn't available (e.g. the backend was started another
  way), a warning banner with an **Install Hebrew OCR** button appears. The button opens
  the installer in a visible console window (progress + Windows permission prompt),
  re-detects Tesseract every 3 s, and the banner disappears when ready. The upload input
  is disabled while a receipt is processing.

### "Money counting" loader
- **`frontend/src/components/MoneyLoader.jsx`** (new): a little stack of ₪ banknotes
  riffled off the top like a bill-counting machine. `counting` adds a ticking ₪ total.
- CSS in `index.css` (`.money-loader`, `@keyframes bill-riffle`, slowed under
  `prefers-reduced-motion`). It replaces the `.animate-spin` utility.
- Used everywhere the spinners were: sidebar "Connecting...", the Settings connection
  badge, the "Connecting to Google NotebookLM" banner (with counter), the Refresh Status /
  Refresh Explorer buttons, the sign-in browser banner, the retro scan progress, the
  receipt upload (with counter) and the OCR install banner.

### Verified
- Synthetic Hebrew supermarket receipt (PNG and image-only PDF), Tesseract `heb+eng`:
  merchant `שופרסל דיל`, total 52.64, date 2026-10-12, Groceries, all 4 line items.
- Parser unit samples: NotebookLM-style transcript, RTL "price name" Tesseract output,
  English receipt.
- Live NotebookLM (profile #4, with the user's OK): the upload works for PDF and image
  sources (~10–12 s), and the full text is only the image URL (hence the design above).
  All test sources, DB rows and uploaded files were deleted afterwards.
- In the app: the missing-OCR banner, then Install → installing state → banner clears;
  receipt upload shows the money loader, then the parsed Hebrew receipt card. `npm run
  build` passes.

### Notes
- Tesseract 5.4.0 is now installed on this PC (`C:\Program Files\Tesseract-OCR`) and
  the language data is in `data\tessdata` (git-ignored with the rest of `data/`).
- CORS is `allow_origins=["*"]` app-wide (AG's setting), so any web page could call the
  local API, including `POST /api/receipts/install-ocr`. That endpoint only runs the fixed,
  idempotent `install_ocr.ps1`, but restricting CORS to the Vite origin
  (`http://localhost:5190`) would harden the whole app.
- Restart the app (`run.ps1`) to load all of this. The running 8910 instance did not
  auto-reload earlier.
