from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import date, datetime
import pandas as pd
import io

from app.database import get_db
from app.models import Transaction, Account
from app.schemas import TransactionCreate, TransactionResponse

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

CLUSTER_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#06b6d4', '#8b5cf6', '#f43f5e', '#ec4899', '#3b82f6', '#14b8a6', '#f97316']

@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    account_id: Optional[int] = None,
    cluster: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Transaction)
    if account_id:
        query = query.where(Transaction.account_id == account_id)
    if cluster:
        query = query.where(Transaction.cluster == cluster)
    if start_date and start_date.strip():
        try:
            p_start = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
            query = query.where(Transaction.date >= p_start)
        except ValueError:
            pass
    if end_date and end_date.strip():
        try:
            p_end = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
            query = query.where(Transaction.date <= p_end)
        except ValueError:
            pass
    query = query.order_by(Transaction.date.desc())
    if limit:
        query = query.limit(limit)
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
async def get_cluster_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    account_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    # Parse date filters
    parsed_start: Optional[date] = None
    parsed_end: Optional[date] = None
    if isinstance(start_date, str) and start_date.strip():
        try:
            parsed_start = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            pass
    if isinstance(end_date, str) and end_date.strip():
        try:
            parsed_end = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            pass

    # Build query
    tx_query = select(Transaction)
    if account_id:
        tx_query = tx_query.where(Transaction.account_id == account_id)
    if parsed_start:
        tx_query = tx_query.where(Transaction.date >= parsed_start)
    if parsed_end:
        tx_query = tx_query.where(Transaction.date <= parsed_end)
    
    tx_res = await db.execute(tx_query)
    transactions = tx_res.scalars().all()

    # Determine date span and active months
    if transactions:
        tx_dates = [t.date for t in transactions]
        min_date = min(tx_dates)
        max_date = max(tx_dates)
        distinct_yms = sorted(list({t.date.strftime("%Y-%m") for t in transactions}))
    else:
        min_date = parsed_start or date.today()
        max_date = parsed_end or date.today()
        distinct_yms = []

    eff_start = parsed_start or min_date
    eff_end = parsed_end or max_date

    # Accurate months count for Option A (Run-Rate)
    if parsed_start and parsed_end:
        month_diff = (parsed_end.year - parsed_start.year) * 12 + (parsed_end.month - parsed_start.month)
        if parsed_end.day >= parsed_start.day:
            month_diff += 1
        else:
            month_diff += max(0.1, parsed_end.day / 30.0)
        months_count = max(1.0, float(round(month_diff, 1)))
        if (parsed_end - parsed_start).days <= 32:
            months_count = 1.0
    elif distinct_yms:
        months_count = max(1.0, float(len(distinct_yms)))
    else:
        months_count = 1.0

    # Period label
    if months_count <= 1.0 and distinct_yms:
        period_label = datetime.strptime(distinct_yms[-1], "%Y-%m").strftime("%B %Y")
    elif eff_start and eff_end:
        m_int = int(months_count) if months_count.is_integer() else months_count
        period_label = f"{eff_start.strftime('%b %Y')} - {eff_end.strftime('%b %Y')} ({m_int} mos)"
    else:
        period_label = date.today().strftime("%B %Y")

    # Aggregate expenses by cluster (excluding non-expense clusters: Income, Transfers, Credit Card Payoff)
    cluster_stats = {}
    total_expenses = 0.0
    expense_tx_count = 0

    for tx in transactions:
        if tx.amount < 0:
            cluster_name = tx.cluster or "Uncategorized"
            if cluster_name in ["Income", "Transfers", "Credit Card Payoff"]:
                continue
            
            abs_amt = abs(tx.amount)
            total_expenses += abs_amt
            expense_tx_count += 1

            if cluster_name not in cluster_stats:
                cluster_stats[cluster_name] = {"total_amount": 0.0, "count": 0}
            cluster_stats[cluster_name]["total_amount"] += abs_amt
            cluster_stats[cluster_name]["count"] += 1

    sorted_clusters = sorted(cluster_stats.items(), key=lambda x: x[1]["total_amount"], reverse=True)

    clusters_list = []
    for idx, (cluster_name, stat) in enumerate(sorted_clusters):
        c_tot = round(stat["total_amount"], 2)
        c_avg = round(c_tot / months_count, 2)
        pct = round((c_tot / total_expenses * 100), 1) if total_expenses > 0 else 0.0
        clusters_list.append({
            "name": cluster_name,
            "cluster": cluster_name,
            "value": c_tot,
            "total_amount": c_tot,
            "monthly_avg": c_avg,
            "count": stat["count"],
            "percentage": pct,
            "color": CLUSTER_COLORS[idx % len(CLUSTER_COLORS)]
        })

    monthly_expenses_avg = round(total_expenses / months_count, 2)

    return {
        "monthly_expenses_avg": monthly_expenses_avg,
        "total_expenses": round(total_expenses, 2),
        "total_amount": round(total_expenses, 2),
        "months_count": round(months_count, 1),
        "is_multi_month": months_count > 1.2,
        "period_label": period_label,
        "transaction_count": expense_tx_count,
        "clusters": clusters_list,
        "start_date": str(eff_start) if eff_start else None,
        "end_date": str(eff_end) if eff_end else None
    }
