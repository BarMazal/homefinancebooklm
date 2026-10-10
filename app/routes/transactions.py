from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import date
import pandas as pd
import io

from app.database import get_db
from app.models import Transaction, Account
from app.schemas import TransactionCreate, TransactionResponse

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    account_id: Optional[int] = None,
    cluster: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Transaction)
    if account_id:
        query = query.where(Transaction.account_id == account_id)
    if cluster:
        query = query.where(Transaction.cluster == cluster)
    query = query.order_by(Transaction.date.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=TransactionResponse)
async def create_transaction(tx: TransactionCreate, db: AsyncSession = Depends(get_db)):
    db_tx = Transaction(**tx.model_dump())
    db.add(db_tx)
    await db.commit()
    await db.refresh(db_tx)
    return db_tx

@router.post("/import-csv/{account_id}")
async def import_transactions_csv(
    account_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        df = pd.read_excel(io.BytesIO(contents))

    imported_count = 0
    for _, row in df.iterrows():
        try:
            # Flexible column detection
            tx_date = pd.to_datetime(row.get('date', row.get('Date', date.today()))).date()
            amount = float(row.get('amount', row.get('Amount', 0.0)))
            merchant = str(row.get('merchant', row.get('Merchant', row.get('description', 'Statement Item'))))
            cluster = str(row.get('cluster', row.get('Category', 'Uncategorized')))

            db_tx = Transaction(
                account_id=account_id,
                date=tx_date,
                amount=amount,
                merchant=merchant,
                cluster=cluster
            )
            db.add(db_tx)
            imported_count += 1
        except Exception:
            continue

    await db.commit()
    return {"status": "success", "imported_count": imported_count}

@router.get("/summary/by-cluster")
async def get_cluster_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transaction.cluster, func.sum(Transaction.amount).label("total_amount"))
        .group_by(Transaction.cluster)
    )
    rows = result.all()
    return [{"cluster": row[0], "total_amount": abs(row[1])} for row in rows]
