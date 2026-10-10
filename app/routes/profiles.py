from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models import Profile, Account, Transaction, PensionPolicy

router = APIRouter(prefix="/api/profiles", tags=["Profiles"])

class ProfileBase(BaseModel):
    name: str

class ProfileResponse(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True

@router.get("", response_model=List[ProfileResponse])
async def list_profiles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile))
    profiles = result.scalars().all()
    if not profiles:
        # Seed default profiles
        demo_profile = Profile(name="Demo Profile (Sample Data)", is_active=True)
        personal_profile = Profile(name="Personal Household (Clean)", is_active=False)
        db.add(demo_profile)
        db.add(personal_profile)
        await db.commit()
        await db.refresh(demo_profile)
        await db.refresh(personal_profile)
        profiles = [demo_profile, personal_profile]
    return profiles

@router.post("", response_model=ProfileResponse)
async def create_profile(p: ProfileBase, db: AsyncSession = Depends(get_db)):
    new_profile = Profile(name=p.name, is_active=False)
    db.add(new_profile)
    await db.commit()
    await db.refresh(new_profile)
    return new_profile

@router.post("/{profile_id}/activate", response_model=ProfileResponse)
async def activate_profile(profile_id: int, db: AsyncSession = Depends(get_db)):
    # Deactivate all profiles
    await db.execute(update(Profile).values(is_active=False))
    
    # Activate target profile
    result = await db.execute(select(Profile).where(Profile.id == profile_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    target.is_active = True
    await db.commit()
    await db.refresh(target)
    return target
