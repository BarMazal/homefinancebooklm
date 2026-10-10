from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
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

@router.get("/savings-projection")
async def get_savings_projection(
    initial_amount: float = 10000.0,
    monthly_deposit: float = 1000.0,
    annual_return: float = 7.0,
    years: int = 18
):
    projections = calculate_savings_projection(initial_amount, monthly_deposit, annual_return, years)
    return {"projections": projections}
