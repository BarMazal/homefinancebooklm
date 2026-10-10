import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Receipt, Transaction, Account
from app.schemas import ReceiptResponse, ReceiptConfirm
from app.services.ocr_service import process_receipt_ocr

from app.services.profile_manager import profile_manager

router = APIRouter(prefix="/api/receipts", tags=["Receipts"])

@router.post("/upload", response_model=ReceiptResponse)
async def upload_receipt(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    active_profile_id = profile_manager.get_active_profile_id()
    profile_dir = profile_manager.get_profile_dir(active_profile_id)
    upload_dir = os.path.join(profile_dir, "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, f"{datetime.now().timestamp()}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run OCR processing engine
    parsed = process_receipt_ocr(file_path)

    db_receipt = Receipt(
        file_path=file_path,
        merchant=parsed["merchant"],
        amount=parsed["amount"],
        date=parsed["date"],
        category=parsed["category"],
        line_items=parsed["line_items"],
        confidence_scores=parsed["confidence_scores"],
        status="pending_review"
    )
    db.add(db_receipt)
    await db.commit()
    await db.refresh(db_receipt)
    return db_receipt

@router.get("", response_model=List[ReceiptResponse])
async def list_receipts(status: str = "pending_review", db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Receipt).where(Receipt.status == status))
    return result.scalars().all()

@router.post("/{receipt_id}/confirm")
async def confirm_receipt(receipt_id: int, confirm_data: ReceiptConfirm, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Receipt).where(Receipt.id == receipt_id))
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    # Create transaction from confirmed receipt
    tx = Transaction(
        account_id=confirm_data.account_id,
        date=confirm_data.date,
        amount=-abs(confirm_data.amount), # expenses are negative
        merchant=confirm_data.merchant,
        cluster=confirm_data.category,
        receipt_id=receipt.id
    )
    db.add(tx)

    receipt.status = "confirmed"
    receipt.merchant = confirm_data.merchant
    receipt.amount = confirm_data.amount
    receipt.date = confirm_data.date
    receipt.category = confirm_data.category
    receipt.line_items = confirm_data.line_items

    # Cleanup raw image file after user confirmation to avoid clutter
    if os.path.exists(receipt.file_path):
        try:
            os.remove(receipt.file_path)
            receipt.file_path = "ARCHIVED"
        except Exception:
            pass

    await db.commit()
    return {"status": "success", "message": "Receipt confirmed and committed to database."}
