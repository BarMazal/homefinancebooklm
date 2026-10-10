from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Account
from app.schemas import AccountCreate, AccountResponse

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])

@router.get("", response_model=List[AccountResponse])
async def list_accounts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account))
    return result.scalars().all()

@router.post("", response_model=AccountResponse)
async def create_account(account: AccountCreate, db: AsyncSession = Depends(get_db)):
    db_account = Account(
        name=account.name,
        type=account.type,
        institution=account.institution,
        currency=account.currency,
        current_balance=account.current_balance,
        last_uploaded_at=datetime.utcnow()
    )
    db.add(db_account)
    await db.commit()
    await db.refresh(db_account)
    return db_account

@router.delete("/{account_id}")
async def delete_account(account_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.delete(account)
    await db.commit()
    return {"status": "deleted", "id": account_id}
