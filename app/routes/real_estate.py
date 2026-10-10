from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import MortgageTrack
from app.schemas import MortgageTrackBase, MortgageTrackResponse

router = APIRouter(prefix="/api/real-estate", tags=["Real Estate"])

@router.get("/mortgages", response_model=List[MortgageTrackResponse])
async def list_mortgages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MortgageTrack))
    return result.scalars().all()

@router.post("/mortgages", response_model=MortgageTrackResponse)
async def create_mortgage_track(track: MortgageTrackBase, db: AsyncSession = Depends(get_db)):
    db_track = MortgageTrack(**track.model_dump())
    db.add(db_track)
    await db.commit()
    await db.refresh(db_track)
    return db_track

@router.get("/compare-yield")
async def compare_rental_vs_stock(
    property_value: float = 2000000.0,
    monthly_rent: float = 6500.0,
    annual_maintenance: float = 10000.0,
    stock_annual_return: float = 8.0, # %
    stock_capital_gains_tax: float = 25.0 # % in ILS
):
    gross_annual_rent = monthly_rent * 12.0
    net_annual_rent = gross_annual_rent - annual_maintenance
    net_rental_yield_pct = (net_annual_rent / property_value) * 100.0

    # Stock net yield after 25% tax
    stock_net_yield_pct = stock_annual_return * (1.0 - (stock_capital_gains_tax / 100.0))

    return {
        "property_value": property_value,
        "net_annual_rent": net_annual_rent,
        "net_rental_yield_pct": round(net_rental_yield_pct, 2),
        "stock_gross_return_pct": stock_annual_return,
        "stock_net_return_after_tax_pct": round(stock_net_yield_pct, 2),
        "recommendation": "Stocks offer higher net yield after tax" if stock_net_yield_pct > net_rental_yield_pct else "Real Estate offers higher net rental yield"
    }
