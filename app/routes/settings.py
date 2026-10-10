from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Dict, Any
import json

from app.database import get_db
from app.models import Setting, Transaction, Account, Receipt, PensionPolicy, MortgageTrack
from app.schemas import SettingUpdate

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("", response_model=Dict[str, str])
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting))
    rows = result.scalars().all()
    return {s.key: s.value for s in rows}

@router.post("")
async def update_setting(setting: SettingUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting).where(Setting.key == setting.key))
    existing = result.scalar_one_or_none()
    if existing:
        existing.value = setting.value
    else:
        new_setting = Setting(key=setting.key, value=setting.value)
        db.add(new_setting)
    await db.commit()
    return {"status": "success", "key": setting.key, "value": setting.value}

@router.get("/database/export")
async def export_database(db: AsyncSession = Depends(get_db)):
    """
    Exports full local database records (Accounts, Transactions, Receipts, Pensions, Mortgages) as JSON.
    """
    accounts = (await db.execute(select(Account))).scalars().all()
    transactions = (await db.execute(select(Transaction))).scalars().all()
    receipts = (await db.execute(select(Receipt))).scalars().all()
    pensions = (await db.execute(select(PensionPolicy))).scalars().all()
    mortgages = (await db.execute(select(MortgageTrack))).scalars().all()

    export_data = {
        "export_date": str(json.dumps(str(json.dumps("")))),
        "accounts": [{"id": a.id, "name": a.name, "type": a.type, "currency": a.currency, "current_balance": a.current_balance} for a in accounts],
        "transactions": [{"id": t.id, "account_id": t.account_id, "date": str(t.date), "amount": t.amount, "merchant": t.merchant, "cluster": t.cluster} for t in transactions],
        "receipts": [{"id": r.id, "merchant": r.merchant, "amount": r.amount, "date": str(r.date), "category": r.category, "status": r.status} for r in receipts],
        "pensions": [{"id": p.id, "policy_name": p.policy_name, "provider": p.provider, "type": p.type, "premium": p.monthly_premium, "balance": p.accumulated_balance} for p in pensions],
        "mortgages": [{"id": m.id, "property_name": m.property_name, "track_name": m.track_name, "remaining_balance": m.remaining_balance} for m in mortgages]
    }
    return export_data

@router.post("/database/import")
async def import_database(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Restores local database state from an exported JSON file.
    """
    contents = await file.read()
    try:
        data = json.loads(contents)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON file format.")

    # Restore accounts
    for a in data.get("accounts", []):
        acc = Account(name=a["name"], type=a["type"], currency=a.get("currency", "ILS"), current_balance=a.get("current_balance", 0.0))
        db.add(acc)
    
    # Restore transactions
    for t in data.get("transactions", []):
        tx = Transaction(account_id=t.get("account_id", 1), date=t["date"], amount=t["amount"], merchant=t["merchant"], cluster=t.get("cluster", "Uncategorized"))
        db.add(tx)

    await db.commit()
    return {"status": "success", "message": "Database backup restored successfully."}

@router.post("/database/clear")
async def clear_database(db: AsyncSession = Depends(get_db)):
    """
    Emergency Reset: Clears all records from SQLite database.
    """
    await db.execute(delete(Transaction))
    await db.execute(delete(Receipt))
    await db.execute(delete(Account))
    await db.execute(delete(PensionPolicy))
    await db.execute(delete(MortgageTrack))
    await db.commit()
    return {"status": "success", "message": "Database completely reset and cleared."}
