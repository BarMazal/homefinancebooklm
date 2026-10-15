import re
import csv
import io
from datetime import datetime
from typing import List, Dict, Any, Optional

CATEGORY_KEYWORDS = {
    "Groceries": [
        "שופרסל", "רמי לוי", "יוחננוף", "מגה", "סופר", "טיב טעם", "ויקטורי", "am:pm", 
        "אושר עד", "מכולת", "קארפור", "carrefour", "מינימרקט", "יינות ביתן", "פרשמרקט",
        "סופר דוש", "מרקזים", "קצבייה", "ירקות", "פירות", "מאפיה", "סל מצרכים"
    ],
    "Housing & Utilities": [
        "חברת חשמל", "ארנונה", "מי אביבים", "גיחון", "מי ", "פזגז", "סופרגז", "אמישראגז", 
        "ועד בית", "שכר דירה", "חשמל", "מים", "גז", "מיסי מקרקעין"
    ],
    "Insurance & Pension": [
        "הראל", "מגדל", "כלל", "מנורה", "הפניקס", "אלטשולר", "מיטב", "ביטוח", "פנסיה", 
        "גמל", "השתלמות", "איילון", "פסגות", "אנליסט", "ילין לפידות", "כללביט"
    ],
    "Car & Transport": [
        "דלק", "פז", "סונול", "דור אלון", "טן", "רב קו", "רכבת", "חניון", "אחוזות החוף", 
        "כביש 6", "מוסך", "ספרינט", "מוטורס", "אוטובוס", "מונית", "gett", "yango"
    ],
    "Transfers": [
        "העברה מהחשבון", "העברה לחשבון", "העברה לבנק", "העברות", "כרטיסי אשראי לי", 
        "חיוב כרטיס אשראי", "פרעון כרטיס", "העברה לצד ג", "מקס איט", "הרשאה כאל", "כרטיסי אשראי", "פרעון אשראי"
    ],
    "Investments": [
        "קנית ני\"ע", "מכירת ני\"ע", "הק בורסה", "securities purchase", "ניירות ערך", 
        "קרן נאמנות", "אינטראקטיב", "מיטב טרייד", "פסגות טרייד", "קניה בורסה", "בי טי בי"
    ],
    "Dining & Entertainment": [
        "מסעדה", "קפה", "פיצה", "וולט", "wolt", "תן ביס", "10bis", "בורגר", "קונדיטוריה", 
        "פאב", "בר משקאות", "סינמה", "יס פלאנט", "קולנוע", "הוט סינמה", "מקדונלדס", "בורגרים", "ג'ירף", "giraffe"
    ],
    "Subscriptions & Telecom": [
        "פרטנר", "סלקום", "פלאפון", "הוט", "בזק", "yes", "hot", "012", "019", "נטפליקס", 
        "netflix", "ספוטיפיי", "spotify", "apple", "google", "גוגל", "אפל", "פרטנר תקש", "טלזר"
    ],
    "Health & Pharma": [
        "סופר פארם", "סופר-פארם", "ניו פארם", "be", "בי פארם", "מכבי", "כללית", 
        "מאוחדת", "לאומית", "בית מרקחת", "אופטיקה", "רופא", "מרפאה", "דנטל", "סמייל"
    ],
    "Kids & Education": [
        "גן", "צהרון", "חוג", "בית ספר", "מעון", "צעצועים", "פיראט האדום", "כפר השעשועים", 
        "טויס אר אס", "toys r us", "חינוך", "אבירם היכל"
    ],
    "Income": [
        "משכורת", "שכר", "זיכוי", "העברה מבנק", "הפקדה", "ביטוח לאומי", "מעסיק", "דיבידנד", "הפקדת שיק", "קצבת ילדים"
    ]
}

def guess_category(merchant: str) -> str:
    if not merchant:
        return "Other Expenses"
    m_lower = merchant.lower()
    # Longest matching keyword wins, so e.g. "סופר-פארם" (Health) beats the generic "סופר" (Groceries)
    best_cat, best_len = "Other Expenses", 0
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in m_lower and len(kw) > best_len:
                best_cat, best_len = cat, len(kw)
    return best_cat

def normalize_date(d_str: str) -> Optional[str]:
    if not d_str:
        return None
    d_clean = d_str.strip().replace(".", "/").replace("-", "/")
    parts = d_clean.split("/")
    if len(parts) != 3:
        return None
    try:
        if len(parts[0]) == 4:
            y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
        else:
            d, m = int(parts[0]), int(parts[1])
            y = int(parts[2])
            if y < 100:
                y += 2000
        if 1 <= m <= 12 and 1 <= d <= 31 and 2000 <= y <= 2040:
            dt = datetime(y, m, d)
            return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    return None

def is_sane_amount(amt: float) -> bool:
    """
    Sanity guard: rejects bank confirmation codes, check IDs, timestamps, or phone numbers.
    Personal transactions are strictly between 0.05 and 500,000 NIS.
    Rejects bare large integers >= 100,000 without decimal points.
    """
    if amt is None:
        return False
    abs_val = abs(amt)
    if abs_val < 0.05:
        return False
    if abs_val > 500000:
        return False
    if abs_val >= 100000 and abs_val == int(abs_val):
        return False
    return True

def detect_account_info(text: str = "", source_title: str = "") -> Dict[str, str]:
    """
    Determines account name, institution, and type from document title and text contents.
    """
    t_lower = (source_title or "").lower()
    content_sample = text[:1500] if text else ""

    # 1. Bank Leumi
    if "leumi" in t_lower or "לאומי" in t_lower or "בנק לאומי" in content_sample:
        return {
            "name": "בנק לאומי (940-39293/40)",
            "institution": "בנק לאומי",
            "type": "bank"
        }

    # 2. Credit Cards by card number
    if "1495" in t_lower or "1495" in content_sample:
        return {
            "name": "מאסטרקארד 1495",
            "institution": "כאל (CAL)",
            "type": "credit_card"
        }
    if "5665" in t_lower or "5665" in content_sample:
        return {
            "name": "ויזה 5665",
            "institution": "כאל (CAL)",
            "type": "credit_card"
        }
    if "5101" in t_lower or "5101" in content_sample:
        return {
            "name": "כרטיס 5101",
            "institution": "כרטיסי אשראי",
            "type": "credit_card"
        }
    if "כרטיס 1" in t_lower or "כרטיס1" in t_lower:
        return {
            "name": "כרטיס אשראי 1",
            "institution": "כרטיסי אשראי",
            "type": "credit_card"
        }
    if "כרטיס 2" in t_lower or "כרטיס2" in t_lower:
        return {
            "name": "כרטיס אשראי 2",
            "institution": "כרטיסי אשראי",
            "type": "credit_card"
        }

    # 3. Bank Otsar HaHayal / FIBI Checking
    if any(k in t_lower for k in ["report__", "fibisave", "otsar", "תנועות בחשבון"]) or "אוצר החייל" in content_sample or "סוג חשבון: 105" in content_sample:
        return {
            "name": "אוצר החייל (305-10557)",
            "institution": "בנק אוצר החייל",
            "type": "bank"
        }

    # 4. Receipts & Cash
    if any(k in t_lower for k in ["receipt", "קבלות", "הוצאות מזומן", "super dosh", "סופר דוש", "purim", "passover", "dining", "קניות"]) or "סה\"כ לתשלום" in content_sample:
        return {
            "name": "קבלות ומזומן",
            "institution": "קבלות",
            "type": "cash"
        }

    return {
        "name": (source_title[:28] if source_title else "חשבון כללי"),
        "institution": "כללי",
        "type": "bank"
    }

def generate_auto_tags(merchant: str = "", category: str = "", account_name: str = "", amount: float = 0.0, source_title: str = "") -> List[str]:
    """
    Intelligently generates orthogonal categorization and workflow tags for each transaction.
    """
    tags = []
    merch = (merchant or "").lower()
    cat = category or ""
    acc = account_name or ""
    amt = float(amount or 0.0)

    # 1. Category / Purpose tags
    cat_map = {
        "Groceries": ["#groceries", "#supermarket"],
        "Housing & Utilities": ["#housing", "#utilities"],
        "Insurance & Pension": ["#insurance", "#fixed_expense"],
        "Car & Transport": ["#car", "#transport"],
        "Dining & Entertainment": ["#dining", "#food"],
        "Subscriptions & Telecom": ["#subscription", "#recurring"],
        "Health & Pharma": ["#health", "#pharmacy"],
        "Kids & Education": ["#kids", "#education"],
        "Income": ["#income", "#salary"],
    }
    tags.extend(cat_map.get(cat, []))

    # 2. Account & Payment Instrument tags
    if "לאומי" in acc or "leumi" in acc.lower():
        tags.extend(["#bank_leumi", "#checking"])
    elif "אוצר החייל" in acc or "fibi" in acc.lower():
        tags.extend(["#bank_otsar", "#checking"])
    elif "1495" in acc:
        tags.extend(["#mc_1495", "#credit_card"])
    elif "5665" in acc:
        tags.extend(["#visa_5665", "#credit_card"])
    elif "5101" in acc:
        tags.extend(["#card_5101", "#credit_card"])
    elif "כרטיס אשראי 1" in acc:
        tags.extend(["#card_1", "#credit_card"])
    elif "כרטיס אשראי 2" in acc:
        tags.extend(["#card_2", "#credit_card"])
    elif "קבלות" in acc or "מזומן" in acc:
        tags.extend(["#receipt", "#cash"])

    # 3. Contextual Keyword tags
    if any(k in merch for k in ["שיק", "צ'ק", "check"]):
        tags.append("#check")
    if "העברה" in merch:
        tags.append("#bank_transfer")
    if any(k in merch for k in ["הוראת קבע", "הוראת-קבע"]):
        tags.extend(["#standing_order", "#recurring"])
    if any(k in merch for k in ["ארנונה", "עירייה", "מיסי מקרקעין", "מס רכישה"]):
        tags.extend(["#taxes", "#government"])
    if "ביטוח לאומי" in merch:
        tags.extend(["#social_security", "#government"])
    if "חשמל" in merch:
        tags.append("#electricity")
    if "מים" in merch:
        tags.append("#water")
    if any(k in merch for k in ["דלק", "פז", "סונול", "טן"]):
        tags.append("#fuel")
    if any(k in merch for k in ["וולט", "wolt", "10bis", "תן ביס"]):
        tags.append("#food_delivery")
    if any(k in merch for k in ["סופר פארם", "be", "פארם"]):
        tags.append("#pharmacy")
    if "סופר דוש" in merch:
        tags.append("#super_dosh")
    if "אושר עד" in merch:
        tags.append("#osher_ad")
    if "שופרסל" in merch:
        tags.append("#shufersal")
    if "משכורת" in merch or "שכר" in merch:
        tags.extend(["#salary", "#fixed_income"])
    if "דיבידנד" in merch:
        tags.extend(["#dividend", "#investments"])
    if "קצבת ילדים" in merch:
        tags.extend(["#kids_allowance", "#government"])

    # 4. Cashflow Direction tags
    if amt > 0:
        tags.append("#inflow")
        if any(r in merch for r in ["זיכוי", "temu", "החזר", "refund"]):
            tags.append("#refund")
    elif amt < 0:
        tags.append("#outflow")

    return list(dict.fromkeys(tags))

def parse_statement_text(text: str, source_title: str = "") -> List[Dict[str, Any]]:
    """
    Deterministically parses financial records from OCR text, PDF extracts, CSVs, or receipt notes.
    Accurately maps Date, Merchant, Amount, Category, Account Name, Institution, and Auto Tags.
    """
    if not text or not text.strip():
        return []

    acc_info = detect_account_info(text, source_title)
    results = []
    seen = set()

    # -------------------------------------------------------------
    # 1. SPECIAL CASE: Receipt Note Transcripts (Markdown format)
    # -------------------------------------------------------------
    if "סה\"כ לתשלום" in text or "שם העסק:" in text or "תמלול" in text:
        merch_m = re.search(r'שם העסק:\s*[*_]*([^\n*]+)', text)
        date_m = re.search(r'(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})', text)
        total_m = re.search(r'סה"כ לתשלום:\s*[*_]*([0-9,]+(?:\.[0-9]+)?)\s*ש"?ח', text)
        if total_m and date_m:
            try:
                amt_val = -abs(float(total_m.group(1).replace(",", "")))
                norm_d = normalize_date(date_m.group(1))
                merch_val = merch_m.group(1).strip(" *-_:") if merch_m else source_title
                if is_sane_amount(amt_val) and norm_d:
                    cat_val = guess_category(merch_val)
                    results.append({
                        "date": norm_d,
                        "merchant": merch_val,
                        "amount": amt_val,
                        "category": cat_val,
                        "account_name": acc_info["name"],
                        "institution": acc_info["institution"],
                        "account_type": acc_info["type"],
                        "tags": generate_auto_tags(merch_val, cat_val, acc_info["name"], amt_val, source_title),
                        "source_note": source_title or "Receipt Note"
                    })
                    return results
            except Exception:
                pass

    # -------------------------------------------------------------
    # 2. Bank Leumi CSV format
    # Header: תאריך,תיאור,בחובה,בזכות,"היתרה בש""ח"
    # -------------------------------------------------------------
    if "," in text and ("בנק לאומי" in text or "בחובה" in text or "בזכות" in text):
        reader = csv.reader(io.StringIO(text))
        for row in reader:
            if len(row) >= 4 and normalize_date(row[0]):
                norm_d = normalize_date(row[0])
                desc = row[1].strip()
                debit_raw = row[2].replace(",", "").strip()
                credit_raw = row[3].replace(",", "").strip()
                try:
                    amt = None
                    if credit_raw and float(credit_raw) > 0:
                        amt = float(credit_raw)
                    elif debit_raw and float(debit_raw) > 0:
                        amt = -float(debit_raw)
                    if amt is not None and is_sane_amount(amt) and desc:
                        sig = f"{norm_d}_{desc}_{amt}"
                        if sig not in seen:
                            seen.add(sig)
                            cat_val = guess_category(desc)
                            results.append({
                                "date": norm_d,
                                "merchant": desc,
                                "amount": amt,
                                "category": cat_val,
                                "account_name": acc_info["name"],
                                "institution": acc_info["institution"],
                                "account_type": acc_info["type"],
                                "tags": generate_auto_tags(desc, cat_val, acc_info["name"], amt, source_title),
                                "source_note": source_title or "Bank Leumi"
                            })
                except Exception:
                    pass
        if results:
            return results

    # -------------------------------------------------------------
    # 3. Credit Card Horizontal CSV (MC1495, Visa5665, Card 1, Card 2, etc.)
    # Header has תאריך, שם בית עסק/שם העסק, סכום חיוב/סכום עסקה
    # -------------------------------------------------------------
    if "," in text and any(k in text for k in ["שם בית עסק", "שם  העסק", "סכום חיוב", "סכום עסקה", "פירוט עסקאות"]):
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        date_col = -1
        merch_col = -1
        amt_col = -1
        cat_col = -1
        header_idx = -1
        
        for idx, r in enumerate(rows):
            joined = " ".join(r)
            if "תאריך" in joined and ("עסק" in joined or "סכום" in joined):
                header_idx = idx
                for c_idx, cell in enumerate(r):
                    c_clean = cell.replace("\n", " ").strip()
                    if "תאריך" in c_clean:
                        date_col = c_idx
                    elif ("שם" in c_clean or "עסק" in c_clean) and "סוג" not in c_clean:
                        merch_col = c_idx
                    elif "סכום חיוב" in c_clean:
                        amt_col = c_idx
                    elif "סכום" in c_clean and amt_col == -1:
                        amt_col = c_idx
                    elif "ענף" in c_clean:
                        cat_col = c_idx
                break
        
        if date_col != -1 and merch_col != -1 and amt_col != -1:
            for r in rows[header_idx + 1:]:
                if len(r) <= max(date_col, merch_col, amt_col):
                    continue
                norm_d = normalize_date(r[date_col].strip())
                merch = r[merch_col].strip()
                if not norm_d or not merch or any(s in merch for s in ["עסקאות לחיוב", "סך הכל", "סה\"כ"]):
                    continue
                raw_amt = r[amt_col].replace("₪", "").replace(",", "").strip()
                try:
                    val = float(raw_amt)
                    is_credit = any("זיכוי" in cell for cell in r) or val < 0
                    final_amt = abs(val) if is_credit else -abs(val)
                    if is_sane_amount(final_amt):
                        category = guess_category(merch)
                        if cat_col != -1 and len(r) > cat_col and r[cat_col].strip():
                            rc = r[cat_col].strip()
                            if "ביטוח" in rc: category = "Insurance & Pension"
                            elif "מזון" in rc: category = "Groceries"
                            elif "חינוך" in rc: category = "Kids & Education"
                            elif "תקשורת" in rc: category = "Subscriptions & Telecom"
                            elif "דלק" in rc or "רכב" in rc: category = "Car & Transport"
                            
                        sig = f"{norm_d}_{merch}_{final_amt}"
                        if sig not in seen:
                            seen.add(sig)
                            results.append({
                                "date": norm_d,
                                "merchant": merch,
                                "amount": final_amt,
                                "category": category,
                                "account_name": acc_info["name"],
                                "institution": acc_info["institution"],
                                "account_type": acc_info["type"],
                                "tags": generate_auto_tags(merch, category, acc_info["name"], final_amt, source_title),
                                "source_note": source_title or "Credit Card Statement"
                            })
                except Exception:
                    pass
            if results:
                return results

    # -------------------------------------------------------------
    # 4. Otsar HaHayal / FIBI Bank Checking CSV
    # Headers: [יתרה, תאריך ערך, זכות, חובה, תיאור, אסמכתא, סוג פעולה, תאריך]
    # -------------------------------------------------------------
    if "," in text and ("זכות" in text or "חובה" in text or "יתרה" in text):
        reader = csv.reader(io.StringIO(text))
        for row in reader:
            if not row or len(row) < 5 or any(h in row for h in ["זכות", "חובה", "תיאור", "סוג חשבון"]):
                continue
            if len(row) >= 6:
                try:
                    credit_raw = row[3].replace(",", "").strip() if len(row) > 3 else ""
                    debit_raw = row[4].replace(",", "").strip() if len(row) > 4 else ""
                    desc = row[5].strip(" \"'") if len(row) > 5 else ""
                    raw_date = row[8].strip() if len(row) > 8 and row[8].strip() else (row[2].strip() if len(row) > 2 else "")
                    norm_d = normalize_date(raw_date)
                    amt = None
                    if credit_raw: amt = float(credit_raw)
                    elif debit_raw: amt = -float(debit_raw)
                    if amt is not None and is_sane_amount(amt) and norm_d and desc and len(desc) > 1:
                        sig = f"{norm_d}_{desc}_{amt}"
                        if sig not in seen:
                            seen.add(sig)
                            cat_val = guess_category(desc)
                            results.append({
                                "date": norm_d,
                                "merchant": desc,
                                "amount": amt,
                                "category": cat_val,
                                "account_name": acc_info["name"],
                                "institution": acc_info["institution"],
                                "account_type": acc_info["type"],
                                "tags": generate_auto_tags(desc, cat_val, acc_info["name"], amt, source_title),
                                "source_note": source_title or "Bank CSV"
                            })
                except Exception:
                    pass
        if results:
            return results

    # -------------------------------------------------------------
    # 5. Multi-line Vertical Text & Patterns (e.g. 5665 Sep vertical, PDF OCR)
    # -------------------------------------------------------------
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    date_regex = re.compile(r'^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$')
    num_regex = re.compile(r'^-?[0-9,]+(?:\.[0-9]+)?$')
    
    i = 0
    while i < len(lines):
        line = lines[i]
        if date_regex.match(line):
            norm_d = normalize_date(line)
            if norm_d and i + 1 < len(lines):
                merch = lines[i + 1].strip()
                amt = None
                jump = 2
                for k in range(i + 2, min(i + 6, len(lines))):
                    cand = lines[k].replace("₪", "").replace(",", "").strip()
                    if num_regex.match(cand):
                        try:
                            val = float(cand)
                            if is_sane_amount(val):
                                amt = -abs(val)
                                jump = (k - i) + 1
                                break
                        except Exception:
                            pass
                    elif date_regex.match(lines[k]):
                        break
                if amt is not None and is_sane_amount(amt) and merch and not date_regex.match(merch) and not num_regex.match(merch.replace(",", "")):
                    if not any(skip in merch for skip in ["תאריך", "סכום", "שם העסק", "עסקאות"]):
                        clean_merch = re.sub(r'^(הנחה סך|ברוטו|עמלה).*?(\b[A-Za-z0-9א-ת\s\*\.]+)', r'\2', merch).strip()
                        sig = f"{norm_d}_{clean_merch}_{amt}"
                        if sig not in seen:
                            seen.add(sig)
                            cat_val = guess_category(clean_merch or merch)
                            results.append({
                                "date": norm_d,
                                "merchant": clean_merch or merch,
                                "amount": amt,
                                "category": cat_val,
                                "account_name": acc_info["name"],
                                "institution": acc_info["institution"],
                                "account_type": acc_info["type"],
                                "tags": generate_auto_tags(clean_merch or merch, cat_val, acc_info["name"], amt, source_title),
                                "source_note": source_title or "NotebookLM Statement"
                            })
                i += jump
                continue
        i += 1

    return results
