from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
from datetime import datetime, date

from app.database import get_db
from app.models import Account, Transaction, MortgageTrack, PensionPolicy, Receipt, RealEstateProperty
from app.services.xirr_service import fetch_usd_ils_rate, calculate_portfolio_xirr

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

CLUSTER_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#06b6d4', '#8b5cf6', '#f43f5e', '#ec4899', '#3b82f6']

@router.get("/overview")
async def get_dashboard_overview(db: AsyncSession = Depends(get_db)):
    fx_rate = await fetch_usd_ils_rate()

    # 1. Fetch Accounts
    acc_res = await db.execute(select(Account))
    accounts = acc_res.scalars().all()

    total_net_worth = 0.0
    upload_status = []

    for acc in accounts:
        balance_ils = acc.current_balance * (fx_rate if acc.currency == "USD" else 1.0)
        total_net_worth += balance_ils

        status = "ok"
        last_str = "No statements uploaded"
        if acc.last_uploaded_at:
            delta = (datetime.utcnow() - acc.last_uploaded_at).days
            if delta <= 7:
                status = "ok"
                last_str = f"{delta} days ago" if delta > 0 else "Today"
            elif delta <= 30:
                status = "warning"
                last_str = f"{delta} days ago"
            else:
                status = "missing"
                last_str = f"{delta} days ago (Overdue)"

        upload_status.append({
            "name": acc.name,
            "status": status,
            "lastUpload": last_str
        })

    # 2. Fetch Transactions
    tx_res = await db.execute(select(Transaction).order_by(Transaction.date.desc()))
    transactions = tx_res.scalars().all()

    # Group expenses by cluster
    cluster_totals: Dict[str, float] = {}
    monthly_flow: Dict[str, Dict[str, float]] = {}

    monthly_income = 0.0
    monthly_expenses = 0.0

    current_month_str = date.today().strftime("%b")

    for tx in transactions:
        m_str = tx.date.strftime("%b")
        if m_str not in monthly_flow:
            monthly_flow[m_str] = {"Income": 0.0, "Expense": 0.0}

        if tx.amount > 0:
            monthly_flow[m_str]["Income"] += tx.amount
            if m_str == current_month_str:
                monthly_income += tx.amount
        else:
            abs_amt = abs(tx.amount)
            monthly_flow[m_str]["Expense"] += abs_amt
            if m_str == current_month_str:
                monthly_expenses += abs_amt

            if tx.cluster and tx.cluster != "Income":
                cluster_totals[tx.cluster] = cluster_totals.get(tx.cluster, 0.0) + abs_amt

    expense_cuts = []
    for idx, (cluster_name, amt) in enumerate(cluster_totals.items()):
        expense_cuts.append({
            "name": cluster_name,
            "value": round(amt, 2),
            "color": CLUSTER_COLORS[idx % len(CLUSTER_COLORS)]
        })

    cashflow_list = []
    # Reverse to chronological order if months found
    for m_key, flow in list(monthly_flow.items())[::-1]:
        cashflow_list.append({
            "month": m_key,
            "Income": round(flow["Income"], 2),
            "Expense": round(flow["Expense"], 2)
        })

    # 3. Real Estate Equity from DB
    re_res = await db.execute(select(RealEstateProperty))
    properties = re_res.scalars().all()
    if properties:
        total_prop_val = sum(p.estimated_value for p in properties)
        mort_res = await db.execute(select(MortgageTrack))
        mortgages = mort_res.scalars().all()
        total_mortgage_debt = sum(m.remaining_balance for m in mortgages)
        total_net_worth += (total_prop_val - total_mortgage_debt)

    # 4. Dynamic XIRR calculation from active DB transactions
    inv_acc_ids = [a.id for a in accounts if a.type in ["savings", "investment", "brokerage"]]
    inv_txs = [t for t in transactions if t.account_id in inv_acc_ids]
    inv_total_val = sum((a.current_balance * (fx_rate if a.currency == "USD" else 1.0)) for a in accounts if a.id in inv_acc_ids)
    if inv_txs and inv_total_val > 0:
        xirr_dates = [t.date for t in inv_txs] + [date.today()]
        xirr_amounts = [-abs(t.amount) for t in inv_txs] + [inv_total_val]
        portfolio_xirr = calculate_portfolio_xirr(xirr_dates, xirr_amounts)
    else:
        portfolio_xirr = 0.0

    return {
        "total_net_worth": round(total_net_worth, 2),
        "monthly_net_savings": round(monthly_income - monthly_expenses, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "portfolio_xirr": round(portfolio_xirr, 2),
        "expense_cuts": expense_cuts,
        "monthly_cashflow": cashflow_list,
        "upload_status": upload_status,
        "fx_rate": fx_rate
    }
