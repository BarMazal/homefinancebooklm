"""
Receipt OCR (Hebrew + English).

Pipeline (both steps run in parallel):
  - Local OCR: Tesseract with Hebrew + English traineddata for images and scanned PDFs,
    or the PDF's own text layer when it is usable.
  - NotebookLM: the receipt is uploaded as a source into the active profile's linked
    notebook (so the fiscal advisor can use it). Its full text is preferred when it is
    real text (text-based PDFs/docs). For images and image-only PDFs NotebookLM only
    exposes the image URL - its OCR is not readable through the API without the chat,
    which would pollute the user's NotebookLM conversation - so Tesseract is what reads those.
  Then Hebrew-aware parsing of the text into merchant / date / total / line items.

EasyOCR was removed: it has no Hebrew model (Reader(['en', 'he']) raises
"{'he'} is not supported"), so it never worked for these receipts and cost ~8s of
torch loading at startup.
"""
import os
import re
import asyncio
import shutil
import threading
from datetime import date, datetime
from typing import Optional, Tuple, Dict, Any, List

from PIL import Image, ImageOps

from app.services.statement_parser import guess_category, normalize_date, is_sane_amount, parse_statement_text

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Project-local Tesseract language data (installed by install.ps1): heb + eng traineddata
LOCAL_TESSDATA_DIR = os.path.join(BASE_DIR, "data", "tessdata")

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".gif"}

_TESSERACT_CANDIDATES = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
    os.path.expandvars(r"%LOCALAPPDATA%\Tesseract-OCR\tesseract.exe"),
]

_tess_config: Optional[Dict[str, Any]] = None
_tess_checked = False
_tess_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Tesseract (local fallback)
# ---------------------------------------------------------------------------

def get_tesseract_config(refresh: bool = False) -> Optional[Dict[str, Any]]:
    """
    Locates the Tesseract binary and the best available language set.
    Returns {"cmd", "lang", "config"} or None when Tesseract is not installed.
    Result is cached; pass refresh=True to re-detect (e.g. right after installing).
    """
    global _tess_config, _tess_checked
    if _tess_checked and not refresh:
        return _tess_config
    with _tess_lock:
        if _tess_checked and not refresh:
            return _tess_config
        _tess_config = None
        try:
            import pytesseract

            cmd = shutil.which("tesseract") or next((c for c in _TESSERACT_CANDIDATES if os.path.exists(c)), None)
            if not cmd:
                print("[OCR Service] Tesseract not found - local OCR fallback disabled (run install.ps1).")
            else:
                pytesseract.pytesseract.tesseract_cmd = cmd
                # Prefer the project-local tessdata (has Hebrew); otherwise Tesseract's own.
                # TESSDATA_PREFIX instead of --tessdata-dir: pytesseract passes quoted
                # paths through literally on Windows, which breaks paths with spaces.
                tess_args = ""
                if os.path.exists(os.path.join(LOCAL_TESSDATA_DIR, "heb.traineddata")):
                    os.environ["TESSDATA_PREFIX"] = LOCAL_TESSDATA_DIR
                langs = set(pytesseract.get_languages(config=tess_args))
                wanted = [l for l in ("heb", "eng") if l in langs]
                if not wanted:
                    print(f"[OCR Service] Tesseract at {cmd} has no heb/eng language data.")
                else:
                    _tess_config = {"cmd": cmd, "lang": "+".join(wanted), "config": tess_args}
                    print(f"[OCR Service] Tesseract ready ({_tess_config['lang']}) at {cmd}")
                    if "heb" not in wanted:
                        print("[OCR Service] WARNING: Hebrew traineddata missing - Hebrew receipts will not be read locally.")
        except Exception as e:
            print(f"[OCR Service] Tesseract unavailable: {e}")
        _tess_checked = True
    return _tess_config


_install_proc = None


def get_ocr_status(refresh: bool = False) -> Dict[str, Any]:
    cfg = get_tesseract_config(refresh=refresh)
    installing = _install_proc is not None and _install_proc.poll() is None
    return {
        "ready": bool(cfg),
        "hebrew": bool(cfg and "heb" in cfg["lang"]),
        "lang": cfg["lang"] if cfg else None,
        "tesseract_path": cfg["cmd"] if cfg else None,
        "installing": installing,
    }


def start_ocr_install() -> Dict[str, Any]:
    """Runs install_ocr.ps1 in its own visible console window (progress + Windows UAC prompt)."""
    global _install_proc
    import subprocess
    if _install_proc is not None and _install_proc.poll() is None:
        return {"started": False, "message": "OCR installation is already running."}
    script = os.path.join(BASE_DIR, "install_ocr.ps1")
    flags = getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
    _install_proc = subprocess.Popen(
        ["powershell", "-ExecutionPolicy", "Bypass", "-File", script],
        cwd=BASE_DIR, creationflags=flags,
    )
    return {"started": True, "message": "OCR installer opened in a new window."}


def _prepare_image(img: Image.Image) -> Image.Image:
    """Grayscale, upright, upscaled and contrast-stretched for better OCR on phone photos."""
    img = ImageOps.exif_transpose(img)
    img = img.convert("L")
    if img.width < 1400:
        scale = 1400 / img.width
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    return ImageOps.autocontrast(img, cutoff=1)


def _tesseract_image(img: Image.Image) -> Tuple[str, float]:
    import pytesseract
    cfg = get_tesseract_config()
    if not cfg:
        return "", 0.0
    prepared = _prepare_image(img)
    config = f'{cfg["config"]} --psm 4'.strip()
    text = pytesseract.image_to_string(prepared, lang=cfg["lang"], config=config)
    try:
        data = pytesseract.image_to_data(prepared, lang=cfg["lang"], config=config, output_type=pytesseract.Output.DICT)
        confs = [float(c) for c, w in zip(data["conf"], data["text"]) if w.strip() and float(c) >= 0]
        conf = (sum(confs) / len(confs) / 100.0) if confs else 0.0
    except Exception:
        conf = 0.5
    return text, conf


_HEB_KEYWORDS = ['סה"כ', "סה״כ", "לתשלום", "תאריך", "קבלה", "חשבונית", "מע\"מ", "מזומן", "אשראי"]


def _looks_reversed_hebrew(text: str) -> bool:
    """PDF text layers often store Hebrew in visual (reversed) order."""
    forward = sum(text.count(k) for k in _HEB_KEYWORDS)
    backward = sum(text.count(k[::-1]) for k in _HEB_KEYWORDS)
    return backward > forward


def _local_pdf_text(file_path: str) -> Tuple[str, float, str]:
    """PDF text layer when usable; otherwise render pages and OCR them with Tesseract."""
    try:
        import pypdfium2 as pdfium
    except ImportError:
        print("[OCR Service] pypdfium2 not installed - cannot read PDFs locally.")
        return "", 0.0, "none"

    pdf = pdfium.PdfDocument(file_path)
    try:
        pages = [pdf[i] for i in range(min(len(pdf), 5))]
        layer = "\n".join(p.get_textpage().get_text_range() for p in pages).strip()
        if len(layer) >= 20 and not _looks_reversed_hebrew(layer):
            return layer, 0.9, "pdf-text"
        # Scanned (image-only) PDF, or Hebrew stored in visual order: OCR the rendered pages
        texts, confs = [], []
        for p in pages:
            img = p.render(scale=300 / 72).to_pil()
            t, c = _tesseract_image(img)
            texts.append(t)
            confs.append(c)
        text = "\n".join(texts).strip()
        if text:
            return text, sum(confs) / len(confs), "tesseract"
        return layer, 0.5 if layer else 0.0, "pdf-text" if layer else "none"
    finally:
        pdf.close()


def local_ocr(file_path: str) -> Tuple[str, float, str]:
    """Offline OCR. Returns (text, confidence 0-1, engine name). Blocking - run in a thread."""
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".pdf":
            return _local_pdf_text(file_path)
        if ext in IMAGE_EXTENSIONS:
            with Image.open(file_path) as img:
                text, conf = _tesseract_image(img)
            return text, conf, "tesseract" if text.strip() else "none"
        if ext in (".txt", ".md", ".csv"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read(), 1.0, "text"
    except Exception as err:
        print(f"[OCR Service] Local OCR error: {err}")
    return "", 0.0, "none"


# ---------------------------------------------------------------------------
# Hebrew-aware receipt parsing
# ---------------------------------------------------------------------------

_TOTAL_KEYWORDS = [
    'סה"כ לתשלום', "סה״כ לתשלום", "לתשלום", 'סה"כ', "סה״כ", "סהכ", "סך הכל", "סך הכול",
    "total", "amount due", "grand total",
]
_NOT_TOTAL_KEYWORDS = ['מע"מ', "מע״מ", "מעמ", "vat", "עודף", "change", "הנחה", "discount", "פריטים", "items"]
_GENERIC_HEADER_WORDS = [
    "קבלה", "חשבונית", "מס", "עותק", "מקור", "עוסק", "ח.פ", "ח\"פ", "טלפון", "טל", "תאריך", "שעה",
    "receipt", "invoice", "tax", "copy", "tel", "phone", "date", "www", "http",
]
_AMOUNT_RE = re.compile(r'(?<![\d.,])(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?![\d])')
_DATE_RE = re.compile(r'(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})')
_LETTERS_RE = re.compile(r'[A-Za-z\u0590-\u05FF]')


def _amounts_in(line: str, decimals_only: bool = False) -> List[float]:
    vals = []
    # Remove dates and long ID-like digit runs before looking for money
    clean = _DATE_RE.sub(" ", line)
    for m in _AMOUNT_RE.finditer(clean):
        raw = m.group(1)
        if decimals_only and "." not in raw:
            continue
        try:
            v = float(raw.replace(",", ""))
        except ValueError:
            continue
        if is_sane_amount(v):
            vals.append(v)
    return vals


def parse_receipt_text(text: str, source_title: str = "") -> Dict[str, Any]:
    """Extracts merchant / date / total / category / line items from receipt text (Hebrew or English)."""
    fields: Dict[str, Any] = {
        "merchant": None, "amount": None, "date": None, "category": None, "line_items": [],
        "confidence": {"merchant": 0.3, "amount": 0.3, "date": 0.3},
    }
    if not text or not text.strip():
        return fields

    # 1. AG's statement parser already understands NotebookLM receipt transcripts
    #    ("שם העסק:", 'סה"כ לתשלום:'); trust it when it yields exactly one record.
    try:
        records = parse_statement_text(text, source_title)
        if len(records) == 1:
            r = records[0]
            fields.update({
                "merchant": r.get("merchant"), "amount": abs(float(r["amount"])),
                "date": r.get("date"), "category": r.get("category"),
            })
            fields["confidence"] = {"merchant": 0.85, "amount": 0.9, "date": 0.9}
    except Exception:
        pass

    lines = [re.sub(r"[*_#|]+", " ", l).strip() for l in text.splitlines()]
    lines = [l for l in lines if l]

    # 2. Total: the amount on a "סה"כ / לתשלום / total" line (or the line after it)
    if fields["amount"] is None:
        for kw_group in (_TOTAL_KEYWORDS[:3], _TOTAL_KEYWORDS[3:]):
            for i in range(len(lines) - 1, -1, -1):
                low = lines[i].lower()
                if any(k.lower() in low for k in kw_group) and not any(k in low for k in _NOT_TOTAL_KEYWORDS):
                    vals = _amounts_in(lines[i]) or (_amounts_in(lines[i + 1]) if i + 1 < len(lines) else [])
                    if vals:
                        fields["amount"] = max(vals)
                        fields["confidence"]["amount"] = 0.9
                        break
            if fields["amount"] is not None:
                break
    if fields["amount"] is None:
        vals = [v for l in lines for v in _amounts_in(l, decimals_only=True)]
        if vals:
            fields["amount"] = max(vals)  # the total is usually the largest figure
            fields["confidence"]["amount"] = 0.55

    # 3. Date
    if not fields["date"]:
        for m in _DATE_RE.finditer(text):
            d = normalize_date(m.group(1))
            if d:
                fields["date"] = d
                fields["confidence"]["date"] = 0.9
                break

    # 4. Merchant: first meaningful line near the top that is not a generic header
    if not fields["merchant"]:
        m_line = re.search(r'(?:שם העסק|שם בית העסק|merchant)\s*[:\-]\s*(.+)', text, re.IGNORECASE)
        if m_line:
            fields["merchant"] = m_line.group(1).strip(" *-_:")
            fields["confidence"]["merchant"] = 0.85
        else:
            for l in lines[:8]:
                letters = _LETTERS_RE.findall(l)
                if len(letters) < 2:
                    continue
                low = l.lower()
                if any(w in low for w in _GENERIC_HEADER_WORDS) and len(letters) < 12:
                    continue
                fields["merchant"] = l.strip(" -:")[:80]
                fields["confidence"]["merchant"] = 0.65
                break

    # 5. Category from merchant (falls back to scanning the top of the receipt)
    if not fields["category"] or fields["category"] == "Other Expenses":
        cat = guess_category(fields["merchant"] or "")
        if cat == "Other Expenses":
            cat = guess_category(" ".join(lines[:10]))
        fields["category"] = cat
        if cat != "Other Expenses":
            fields["confidence"]["merchant"] = max(fields["confidence"]["merchant"], 0.8)

    # 6. Line items: "<name> <price>" or "<price> <name>" (RTL OCR output often puts price first)
    skip_words = _TOTAL_KEYWORDS + _NOT_TOTAL_KEYWORDS + ["אשראי", "מזומן", "כרטיס", "credit", "cash", "card"]
    for l in lines[1:]:
        low = l.lower()
        if any(k.lower() in low for k in skip_words) or _DATE_RE.search(l):
            continue
        m = re.match(r'^(.*?[A-Za-z\u0590-\u05FF].*?)\s+(-?\d+\.\d{2})\s*(?:₪|ש"ח|ש״ח)?$', l) or \
            re.match(r'^(?:₪)?\s*(-?\d+\.\d{2})\s+(.*?[A-Za-z\u0590-\u05FF].*)$', l)
        if not m:
            continue
        a, b = m.group(1), m.group(2)
        name, price_s = (a, b) if re.search(r'[A-Za-z\u0590-\u05FF]', a) else (b, a)
        try:
            price = float(price_s)
        except ValueError:
            continue
        if is_sane_amount(price) and (fields["amount"] is None or price <= fields["amount"]):
            fields["line_items"].append({"item": name.strip(" -:"), "price": price, "confidence": 0.75})

    return fields


def _is_real_text(text: str) -> bool:
    """False for NotebookLM image placeholders (an image URL + id) and empty text."""
    stripped = re.sub(r"https?://\S+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", " ", text or "")
    return len(_LETTERS_RE.findall(stripped)) >= 15


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def process_receipt_ocr(file_path: str, profile_id: Optional[int] = None) -> dict:
    """
    OCRs a receipt (image or PDF; Hebrew or English) and extracts merchant, date, total,
    category and line items with per-field confidence scores.
    Local Tesseract / PDF text layer + NotebookLM upload (archive, and its text when real).
    """
    from app.services.notebooklm_service import notebooklm_service

    raw_text, engine, quality, nb_error = "", "none", 0.0, None
    source_title = re.sub(r"^\d+(?:\.\d+)?_", "", os.path.basename(file_path))

    if os.path.exists(file_path):
        nb, (local_text, local_quality, local_engine) = await asyncio.gather(
            notebooklm_service.upload_document_source(file_path, profile_id, title=f"Receipt - {source_title}"),
            asyncio.to_thread(local_ocr, file_path),
        )
        nb_text = nb.get("text") or ""
        if not nb.get("success"):
            nb_error = nb.get("error")
            print(f"[OCR Service] NotebookLM upload skipped/failed: {nb_error}")
        if _is_real_text(nb_text):
            raw_text, engine, quality = nb_text, "notebooklm", 0.9
        else:
            raw_text, quality, engine = local_text, local_quality, local_engine

    fields = parse_receipt_text(raw_text, source_title)
    conf = fields["confidence"]
    if engine == "tesseract":
        # Scale field confidence by how sure Tesseract was about the characters themselves
        conf = {k: round(v * max(0.5, quality), 2) for k, v in conf.items()}
    if engine == "none":
        conf = {"merchant": 0.0, "amount": 0.0, "date": 0.0}

    try:
        extracted_date = datetime.strptime(fields["date"], "%Y-%m-%d").date() if fields["date"] else date.today()
    except Exception:
        extracted_date = date.today()

    return {
        "merchant": fields["merchant"] or "Unknown Merchant",
        "amount": fields["amount"] or 0.0,
        "date": extracted_date,
        "category": fields["category"] or "Other Expenses",
        "line_items": fields["line_items"],
        "confidence_scores": conf,
        "overall_confidence": sum(conf.values()) / 3.0,
        "raw_text": raw_text,
        "ocr_engine": engine,
        "notebooklm_error": nb_error,
    }
