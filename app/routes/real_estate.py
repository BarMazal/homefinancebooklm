from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import date

from app.database import get_db
from app.models import MortgageTrack, RealEstateProperty

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
    prop_res = await db.execute(select(RealEstateProperty))
    db_properties = prop_res.scalars().all()

    if not db_properties:
        return []

    track_res = await db.execute(select(MortgageTrack))
    tracks = track_res.scalars().all()

    properties_list = []
    for p in db_properties:
        p_tracks = [
            {
                "id": t.id,
                "track_name": t.track_name,
                "original_amount": t.original_amount,
                "remaining_balance": t.remaining_balance,
                "interest_rate": t.interest_rate,
                "monthly_payment": t.monthly_payment,
                "end_date": str(t.end_date)
            }
            for t in tracks if t.property_name == p.name or (p.id == 1 and t.property_name in ["Main Apartment", p.name])
        ]

        properties_list.append({
            "id": p.id,
            "name": p.name,
            "estimated_value": p.estimated_value,
            "monthly_rent": p.monthly_rent,
            "annual_maintenance": p.annual_maintenance,
            "tracks": p_tracks
        })

    return properties_list

@router.post("/properties")
async def create_property(prop: PropertyBase, db: AsyncSession = Depends(get_db)):
    db_prop = RealEstateProperty(**prop.model_dump())
    db.add(db_prop)
    await db.commit()
    await db.refresh(db_prop)
    return db_prop

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
    net_rental_yield_pct = (net_annual_rent / property_value) * 100.0 if property_value else 0.0
    stock_net_yield_pct = stock_annual_return * (1.0 - (stock_capital_gains_tax / 100.0))

    return {
        "property_value": property_value,
        "net_annual_rent": net_annual_rent,
        "net_rental_yield_pct": round(net_rental_yield_pct, 2),
        "stock_gross_return_pct": stock_annual_return,
        "stock_net_return_after_tax_pct": round(stock_net_yield_pct, 2),
        "recommendation": "Stocks offer higher net yield after tax" if stock_net_yield_pct > net_rental_yield_pct else "Real Estate offers higher net rental yield"
    }
