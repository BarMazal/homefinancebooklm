from datetime import date
from typing import List
import pyxirr
import httpx

# Static / fallback FX rate if API fails
DEFAULT_USD_ILS_RATE = 3.65

async def fetch_usd_ils_rate() -> float:
    """
    Fetch live / recent USD to ILS exchange rate from free API or fallback.
    """
    url = "https://open.er-api.com/v6/latest/USD"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                rate = data.get("rates", {}).get("ILS", DEFAULT_USD_ILS_RATE)
                return float(rate)
    except Exception as e:
        print(f"[FX Rate Fetch Error]: {e}")
    return DEFAULT_USD_ILS_RATE

def calculate_portfolio_xirr(dates: List[date], amounts: List[float]) -> float:
    """
    Calculate Extended Internal Rate of Return (XIRR) using pyxirr library.
    `dates`: list of datetime.date objects for each transaction/cashflow
    `amounts`: list of float amounts (deposits negative, current balance positive)
    Returns percentage as float (e.g. 8.5 for 8.5% annual return).
    """
    if len(dates) < 2 or len(amounts) < 2:
        return 0.0

    try:
        # pyxirr.xirr accepts parallel lists of dates and amounts
        rate = pyxirr.xirr(dates, amounts)
        if rate is not None:
            return round(float(rate) * 100.0, 2)
    except Exception as err:
        print(f"[XIRR Calc Error]: {err}")
    
    return 0.0

def calculate_savings_projection(initial_amount: float, monthly_deposit: float, annual_return_pct: float, years: int) -> List[dict]:
    """
    Generate month-by-month compound growth projections for savings & kids accounts.
    """
    projections = []
    current_balance = initial_amount
    monthly_rate = (annual_return_pct / 100.0) / 12.0
    total_months = years * 12
    total_deposited = initial_amount

    for month in range(1, total_months + 1):
        interest = current_balance * monthly_rate
        current_balance += monthly_deposit + interest
        total_deposited += monthly_deposit
        if month % 12 == 0 or month == total_months:
            projections.append({
                "year": month // 12,
                "total_balance": round(current_balance, 2),
                "total_deposited": round(total_deposited, 2),
                "total_gains": round(current_balance - total_deposited, 2)
            })

    return projections
