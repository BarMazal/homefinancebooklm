from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import date

from app.database import get_db
from app.models import MortgageTrack

router = APIRouter(prefix="/api/real-estate", tags=["Real Estate"])

class PropertyBase(BaseModel):
    name: str
    estimated_value: float
    monthly_rent: float
    annual_maintenance: float

class TrackBase(BaseModel):
    property_name: str
    track_name: str
    original_amount: float
    remaining_balance: float
    interest_rate: float
    monthly_payment: float
    end_date: date

@router.get("/properties")
async def list_properties_summary(db: AsyncSession = Depends(get_db)):
    """
    Returns multi-property real estate portfolio with per-property mortgage tracks from active profile DB.
    """
    result = await db.execute(select(MortgageTrack))
    tracks = result.scalars().all()

    if not tracks:
        return []

    properties_map = {
        "Main Apartment": {
            "id": 1,
            "name": "Main Family Apartment (Tel Aviv)",
            "estimated_value": 3500000.0,
            "monthly_rent": 0.0, # Owner-occupied
            "annual_maintenance": 12000.0,
            "tracks": []
        },
        "Rental Apartment 1": {
            "id": 2,
            "name": "Rental Investment Apartment (Haifa)",
            "estimated_value": 1800000.0,
            "monthly_rent": 5200.0,
            "annual_maintenance": 8000.0,
            "tracks": []
        }
    }

    for t in tracks:
        p_key = t.property_name if t.property_name in properties_map else "Main Apartment"
        properties_map[p_key]["tracks"].append({
            "id": t.id,
            "track_name": t.track_name,
            "original_amount": t.original_amount,
            "remaining_balance": t.remaining_balance,
            "interest_rate": t.interest_rate,
            "monthly_payment": t.monthly_payment,
            "end_date": str(t.end_date)
        })

    return [p for p in properties_map.values() if len(p["tracks"]) > 0]

@router.post("/mortgages")
async def create_mortgage_track(track: TrackBase, db: AsyncSession = Depends(get_db)):
    db_track = MortgageTrack(
        property_name=track.property_name,
        track_name=track.track_name,
        original_amount=track.original_amount,
        remaining_balance=track.remaining_balance,
        interest_rate=track.interest_rate,
        monthly_payment=track.monthly_payment,
        end_date=track.end_date
    )
    db.add(db_track)
    await db.commit()
    await db.refresh(db_track)
    return db_track

@router.get("/compare-yield")
async def compare_rental_vs_stock(
    property_value: float = 1800000.0,
    monthly_rent: float = 5200.0,
    annual_maintenance: float = 8000.0,
    stock_annual_return: float = 8.0,
    stock_capital_gains_tax: float = 25.0
):
    gross_annual_rent = monthly_rent * 12.0
    net_annual_rent = gross_annual_rent - annual_maintenance
    net_rental_yield_pct = (net_annual_rent / property_value) * 100.0
    stock_net_yield_pct = stock_annual_return * (1.0 - (stock_capital_gains_tax / 100.0))

    return {
        "property_value": property_value,
        "net_annual_rent": net_annual_rent,
        "net_rental_yield_pct": round(net_rental_yield_pct, 2),
        "stock_gross_return_pct": stock_annual_return,
        "stock_net_return_after_tax_pct": round(stock_net_yield_pct, 2),
        "recommendation": "Stocks offer higher net yield after tax" if stock_net_yield_pct > net_rental_yield_pct else "Real Estate offers higher net rental yield"
    }
