import os
import re
from datetime import datetime, date
from PIL import Image

try:
    import easyocr
    reader = easyocr.Reader(['en', 'he'], gpu=False)
except Exception as e:
    reader = None

def process_receipt_ocr(file_path: str) -> dict:
    """
    Process a receipt image using local OCR (EasyOCR / PyTesseract)
    Extracts text, merchant name, date, total amount, currency, and line items
    Calculates confidence scores for each extracted field.
    """
    raw_text = ""
    confidence_scores = {"merchant": 0.5, "amount": 0.5, "date": 0.5}
    extracted_merchant = "Unknown Merchant"
    extracted_amount = 0.0
    extracted_date = date.today()
    category = "Groceries"
    line_items = []

    if reader and os.path.exists(file_path):
        try:
            results = reader.readtext(file_path)
            lines = []
            conf_list = []
            for (bbox, text, prob) in results:
                lines.append(text)
                conf_list.append(prob)

            raw_text = "\n".join(lines)
            avg_prob = sum(conf_list) / len(conf_list) if conf_list else 0.5

            if lines:
                extracted_merchant = lines[0].strip()
                confidence_scores["merchant"] = min(1.0, conf_list[0] + 0.1) if conf_list else 0.6

            # Regex search for amount (e.g. 123.45, ₪ 123.45, TOTAL 123)
            amount_matches = re.findall(r'(?:total|sum|₪|\$)?\s*(\d+[\.,]\d{2})', raw_text, re.IGNORECASE)
            if amount_matches:
                try:
                    amounts = [float(a.replace(',', '.')) for a in amount_matches]
                    extracted_amount = max(amounts) # usually total is the largest figure
                    confidence_scores["amount"] = 0.85
                except ValueError:
                    pass

            # Regex search for dates (DD/MM/YYYY or YYYY-MM-DD or DD.MM.YY)
            date_matches = re.findall(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', raw_text)
            if date_matches:
                for d_str in date_matches:
                    try:
                        clean_d = d_str.replace('.', '/').replace('-', '/')
                        parts = clean_d.split('/')
                        if len(parts) == 3:
                            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                            if year < 100:
                                year += 2000
                            extracted_date = date(year, month, day)
                            confidence_scores["date"] = 0.90
                            break
                    except Exception:
                        continue

            # Try parsing line items from text lines containing numbers
            for line in lines[1:]:
                item_match = re.search(r'([A-Za-z\u0590-\u05FF\s]+)\s+(\d+[\.,]\d{2})', line)
                if item_match:
                    name = item_match.group(1).strip()
                    try:
                        price = float(item_match.group(2).replace(',', '.'))
                        line_items.append({"item": name, "price": price, "confidence": 0.80})
                    except ValueError:
                        pass
        except Exception as err:
            print(f"[OCR Service Error]: {err}")

    # Low confidence score fallback calculation
    overall_confidence = (confidence_scores["merchant"] + confidence_scores["amount"] + confidence_scores["date"]) / 3.0

    return {
        "merchant": extracted_merchant,
        "amount": extracted_amount,
        "date": extracted_date,
        "category": category,
        "line_items": line_items,
        "confidence_scores": confidence_scores,
        "overall_confidence": overall_confidence,
        "raw_text": raw_text
    }
