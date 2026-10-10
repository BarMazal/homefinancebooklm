from fastapi import APIRouter
from app.schemas import SimulatorRequest

router = APIRouter(prefix="/api/simulator", tags=["Simulator"])

@router.post("/run")
async def run_simulation(req: SimulatorRequest):
    total_months = req.years * 12
    monthly_rate = (req.interest_rate_stock / 100.0) / 12.0
    
    # Portfolio growth forecast
    future_value = 0.0
    for _ in range(total_months):
        future_value = (future_value + req.monthly_savings) * (1.0 + monthly_rate)
        
    total_contributions = req.monthly_savings * total_months
    total_gain = future_value - total_contributions

    # Asset Division Simulation (50/50 or custom split)
    split_ratio = req.divorce_split_ratio
    party_a_share = future_value * split_ratio
    party_b_share = future_value * (1.0 - split_ratio)

    return {
        "projection_years": req.years,
        "monthly_savings": req.monthly_savings,
        "total_contributions": round(total_contributions, 2),
        "future_value_projected": round(future_value, 2),
        "total_gain": round(total_gain, 2),
        "asset_division_simulation": {
            "split_ratio_a": split_ratio,
            "party_a_share": round(party_a_share, 2),
            "party_b_share": round(party_b_share, 2),
            "notes": "Simulated division of accumulated wealth across two parties."
        }
    }
