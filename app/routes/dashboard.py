from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional
from datetime import datetime, date

from app.database import get_db
from app.models import Account, Transaction, MortgageTrack, RealEstateProperty
from app.services.xirr_service import fetch_usd_ils_rate, calculate_portfolio_xirr

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

CLUSTER_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#06b6d4', '#8b5cf6', '#f43f5e', '#ec4899', '#3b82f6', '#14b8a6', '#f97316']

@router.get("/overview")
async def get_dashboard_overview(
    granularity: str = Query("monthly", description="'monthly' or 'yearly'"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db)
):
    fx_rate = await fetch_usd_ils_rate()

    # 1. Fetch Accounts & Net Worth
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

    # Real Estate Equity from DB
    re_res = await db.execute(select(RealEstateProperty))
    properties = re_res.scalars().all()
    if properties:
        total_prop_val = sum(p.estimated_value for p in properties)
        mort_res = await db.execute(select(MortgageTrack))
        mortgages = mort_res.scalars().all()
        total_mortgage_debt = sum(m.remaining_balance for m in mortgages)
        total_net_worth += (total_prop_val - total_mortgage_debt)

    # 2. Parse date filters
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

    # 3. Fetch Transactions with optional date boundary filtering
    tx_query = select(Transaction)
    if parsed_start:
        tx_query = tx_query.where(Transaction.date >= parsed_start)
    if parsed_end:
        tx_query = tx_query.where(Transaction.date <= parsed_end)
    tx_query = tx_query.order_by(Transaction.date.desc())
    
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

    # Group expenses and flow
    cluster_totals: Dict[str, float] = {}
    grouped_flow: Dict[str, Dict[str, float]] = {}

    total_period_income = 0.0
    total_period_expenses = 0.0

    for tx in transactions:
        is_transfer = tx.cluster in ["Transfers", "Credit Card Payoff"]

        if granularity == "yearly":
            grp_key = str(tx.date.year)
        else:
            grp_key = tx.date.strftime("%Y-%m")

        if grp_key not in grouped_flow:
            grouped_flow[grp_key] = {"Income": 0.0, "Expense": 0.0}

        if tx.amount > 0:
            if not is_transfer:
                grouped_flow[grp_key]["Income"] += tx.amount
                total_period_income += tx.amount
        else:
            abs_amt = abs(tx.amount)
            if not is_transfer:
                grouped_flow[grp_key]["Expense"] += abs_amt
                total_period_expenses += abs_amt

            # Exclude transfers and income from living expenses pie chart
            if tx.cluster and tx.cluster not in ["Income", "Transfers", "Credit Card Payoff"]:
                cluster_totals[tx.cluster] = cluster_totals.get(tx.cluster, 0.0) + abs_amt

    # Donut chart items
    sorted_clusters = sorted(cluster_totals.items(), key=lambda x: x[1], reverse=True)
    expense_cuts = [
        {
            "name": cluster_name,
            "value": round(amt, 2),
            "color": CLUSTER_COLORS[idx % len(CLUSTER_COLORS)]
        }
        for idx, (cluster_name, amt) in enumerate(sorted_clusters)
    ]

    # Cashflow chart items
    cashflow_list = []
    for k in sorted(grouped_flow.keys()):
        flow = grouped_flow[k]
        if granularity == "yearly":
            label = k
        else:
            m_dt = datetime.strptime(k, "%Y-%m")
            label = m_dt.strftime("%b %y")

        cashflow_list.append({
            "month": label,
            "period": label,
            "raw_key": k,
            "Income": round(flow["Income"], 2),
            "Expense": round(flow["Expense"], 2),
            "Net": round(flow["Income"] - flow["Expense"], 2)
        })

    # Option A Averages & Totals
    total_period_savings = total_period_income - total_period_expenses
    monthly_expenses_avg = total_period_expenses / months_count
    monthly_income_avg = total_period_income / months_count
    monthly_net_savings_avg = total_period_savings / months_count

    # Dynamic XIRR calculation from active DB transactions
    inv_acc_ids = [a.id for a in accounts if a.type in ["savings", "investment", "brokerage"]]
    inv_txs = [t for t in transactions if (t.account_id in inv_acc_ids or t.cluster == "Investments")]
    inv_total_val = sum((a.current_balance * (fx_rate if a.currency == "USD" else 1.0)) for a in accounts if a.id in inv_acc_ids)
    accounts_with_txs = {t.account_id for t in inv_txs}
    val_of_tx_accounts = sum(a.current_balance * (fx_rate if a.currency == "USD" else 1.0) for a in accounts if a.id in accounts_with_txs)
    
    if inv_txs and (val_of_tx_accounts or inv_total_val) > 0:
        xirr_dates = [t.date for t in inv_txs] + [date.today()]
        xirr_amounts = [-abs(t.amount) for t in inv_txs] + [val_of_tx_accounts or inv_total_val]
        portfolio_xirr = calculate_portfolio_xirr(xirr_dates, xirr_amounts)
    else:
        portfolio_xirr = 0.0

    return {
        "total_net_worth": round(total_net_worth, 2),
        "monthly_expenses_avg": round(monthly_expenses_avg, 2),
        "total_expenses_period": round(total_period_expenses, 2),
        "monthly_net_savings_avg": round(monthly_net_savings_avg, 2),
        "total_net_savings_period": round(total_period_savings, 2),
        "monthly_income_avg": round(monthly_income_avg, 2),
        "total_income_period": round(total_period_income, 2),
        "months_count": round(months_count, 1),
        "is_multi_month": months_count > 1.2,
        # Backward compatibility aliases
        "monthly_expenses": round(monthly_expenses_avg, 2),
        "monthly_net_savings": round(monthly_net_savings_avg, 2),
        "monthly_income": round(monthly_income_avg, 2),
        "target_month_label": period_label,
        "portfolio_xirr": round(portfolio_xirr, 2),
        "expense_cuts": expense_cuts,
        "monthly_cashflow": cashflow_list,
        "upload_status": upload_status,
        "fx_rate": fx_rate,
        "granularity": granularity,
        "start_date": str(eff_start) if eff_start else None,
        "end_date": str(eff_end) if eff_end else None
    }
