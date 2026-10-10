from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Dict, Any
import json
import os

from app.database import get_db
from app.models import Setting, Transaction, Account, Receipt, PensionPolicy, MortgageTrack
from app.schemas import SettingUpdate
from app.services.profile_manager import profile_manager

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("", response_model=Dict[str, Any])
async def get_settings():
    """
    Returns the per-profile settings configuration (UI theme, chart type, dashboard cards, NotebookLM settings).
    """
    active_profile_id = profile_manager.get_active_profile_id()
    settings = profile_manager.load_profile_settings(active_profile_id)
    return settings

@router.post("")
async def update_setting(setting: SettingUpdate):
    """
    Updates a key-value setting for the active profile, including NotebookLM notebook ID validation.
    """
    active_profile_id = profile_manager.get_active_profile_id()
    settings = profile_manager.load_profile_settings(active_profile_id)

    # Check NotebookLM Notebook ID sharing across profiles
    sharing_check = {"is_shared": False}
    if setting.key == "notebooklm_notebook_id":
        sharing_check = profile_manager.check_notebook_id_sharing(active_profile_id, setting.value)

    settings[setting.key] = setting.value
    profile_manager.save_profile_settings(active_profile_id, settings)

    return {
        "status": "success",
        "key": setting.key,
        "value": setting.value,
        "sharing_warning": sharing_check.get("message") if sharing_check.get("is_shared") else None
    }

@router.post("/full")
async def update_full_profile_settings(new_settings: Dict[str, Any]):
    """
    Saves full JSON configuration object for the active profile (UI theme, cards, etc.).
    """
    active_profile_id = profile_manager.get_active_profile_id()
    
    # Check notebook sharing if provided
    sharing_warning = None
    if "notebooklm_notebook_id" in new_settings:
        check = profile_manager.check_notebook_id_sharing(active_profile_id, new_settings["notebooklm_notebook_id"])
        if check.get("is_shared"):
            sharing_warning = check.get("message")

    profile_manager.save_profile_settings(active_profile_id, new_settings)
    return {"status": "success", "settings": new_settings, "sharing_warning": sharing_warning}

@router.get("/database/export")
async def export_database(db: AsyncSession = Depends(get_db)):
    active_profile_id = profile_manager.get_active_profile_id()
    accounts = (await db.execute(select(Account))).scalars().all()
    transactions = (await db.execute(select(Transaction))).scalars().all()
    receipts = (await db.execute(select(Receipt))).scalars().all()
    pensions = (await db.execute(select(PensionPolicy))).scalars().all()
    mortgages = (await db.execute(select(MortgageTrack))).scalars().all()
    settings = profile_manager.load_profile_settings(active_profile_id)

    export_data = {
        "profile_id": active_profile_id,
        "settings": settings,
        "accounts": [{"id": a.id, "name": a.name, "type": a.type, "currency": a.currency, "current_balance": a.current_balance} for a in accounts],
        "transactions": [{"id": t.id, "account_id": t.account_id, "date": str(t.date), "amount": t.amount, "merchant": t.merchant, "cluster": t.cluster} for t in transactions],
        "receipts": [{"id": r.id, "merchant": r.merchant, "amount": r.amount, "date": str(r.date), "category": r.category, "status": r.status} for r in receipts],
        "pensions": [{"id": p.id, "policy_name": p.policy_name, "provider": p.provider, "type": p.type, "premium": p.monthly_premium, "balance": p.accumulated_balance} for p in pensions],
        "mortgages": [{"id": m.id, "property_name": m.property_name, "track_name": m.track_name, "remaining_balance": m.remaining_balance} for m in mortgages]
    }
    return export_data

@router.post("/database/import")
async def import_database(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    contents = await file.read()
    try:
        data = json.loads(contents)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON file format.")

    active_profile_id = profile_manager.get_active_profile_id()

    if "settings" in data:
        profile_manager.save_profile_settings(active_profile_id, data["settings"])

    for a in data.get("accounts", []):
        acc = Account(name=a["name"], type=a["type"], currency=a.get("currency", "ILS"), current_balance=a.get("current_balance", 0.0))
        db.add(acc)
    
    for t in data.get("transactions", []):
        tx = Transaction(account_id=t.get("account_id", 1), date=t["date"], amount=t["amount"], merchant=t["merchant"], cluster=t.get("cluster", "Uncategorized"))
        db.add(tx)

    await db.commit()
    return {"status": "success", "message": "Database backup restored to active profile successfully."}

@router.post("/database/clear")
async def clear_database(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Transaction))
    await db.execute(delete(Receipt))
    await db.execute(delete(Account))
    await db.execute(delete(PensionPolicy))
    await db.execute(delete(MortgageTrack))
    await db.commit()
    return {"status": "success", "message": "Active profile database completely reset."}
