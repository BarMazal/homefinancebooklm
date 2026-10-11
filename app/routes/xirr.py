from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from datetime import date, timedelta

from app.database import get_db
from app.models import Account, Transaction
from app.schemas import XirrCalculationRequest
from app.services.xirr_service import calculate_portfolio_xirr, fetch_usd_ils_rate, calculate_savings_projection

router = APIRouter(prefix="/api/xirr", tags=["XIRR & Savings"])

@router.post("/calculate")
async def calculate_xirr(req: XirrCalculationRequest):
    xirr_val = calculate_portfolio_xirr(req.dates, req.amounts)
    return {"xirr_annual_percentage": xirr_val}

@router.get("/fx-rate")
async def get_fx_rate():
    rate = await fetch_usd_ils_rate()
    return {"pair": "USD/ILS", "rate": rate}

@router.get("/portfolio-summary")
async def get_portfolio_summary(db: AsyncSession = Depends(get_db)):
    fx_rate = await fetch_usd_ils_rate()
    result = await db.execute(select(Account).where(Account.type.in_(["savings", "investment", "brokerage"])))
    accounts = result.scalars().all()

    if not accounts:
        return {
            "total_valuation": 0.0,
            "cumulative_gains": 0.0,
            "xirr_annual_percentage": 0.0,
            "history": []
        }

    total_val = 0.0
    account_ids = [a.id for a in accounts]
    for acc in accounts:
        rate = fx_rate if acc.currency == "USD" else 1.0
        total_val += acc.current_balance * rate

    tx_res = await db.execute(select(Transaction).where(Transaction.account_id.in_(account_ids)).order_by(Transaction.date.asc()))
    txs = tx_res.scalars().all()

    if txs and total_val > 0:
        xirr_dates = [t.date for t in txs] + [date.today()]
        xirr_amounts = [-abs(t.amount) for t in txs] + [total_val]
        xirr_pct = calculate_portfolio_xirr(xirr_dates, xirr_amounts)
    else:
        xirr_pct = 0.0

    # Build historical yearly points dynamically from DB transactions if present
    yearly_map: Dict[str, Dict[str, float]] = {}
    running_balance = 0.0
    running_deposited = 0.0

    for t in txs:
        yr = str(t.date.year)
        if yr not in yearly_map:
            yearly_map[yr] = {"Balance": 0.0, "Deposited": 0.0}
        
        if t.amount > 0:
            running_deposited += t.amount
        running_balance += t.amount

        yearly_map[yr]["Balance"] = round(running_balance, 2)
        yearly_map[yr]["Deposited"] = round(running_deposited, 2)

    history = [{"year": yr, "Balance": data["Balance"], "Deposited": data["Deposited"]} for yr, data in yearly_map.items()]

    total_deposited = running_deposited
    gains = total_val - total_deposited if total_val > total_deposited else 0.0

    return {
        "total_valuation": round(total_val, 2),
        "cumulative_gains": round(gains, 2),
        "xirr_annual_percentage": round(xirr_pct, 2),
        "history": history
    }

@router.get("/savings-projection")
async def get_savings_projection(
    initial_amount: float = 10000.0,
    monthly_deposit: float = 1000.0,
    annual_return: float = 7.0,
    years: int = 18
):
    projections = calculate_savings_projection(initial_amount, monthly_deposit, annual_return, years)
    return {"projections": projections}
