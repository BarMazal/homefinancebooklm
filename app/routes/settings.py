from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict

from app.database import get_db
from app.models import Setting
from app.schemas import SettingUpdate

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("", response_model=Dict[str, str])
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting))
    rows = result.scalars().all()
    return {s.key: s.value for s in rows}

@router.post("")
async def update_setting(setting: SettingUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Setting).where(Setting.key == setting.key))
    existing = result.scalar_one_or_none()
    if existing:
        existing.value = setting.value
    else:
        new_setting = Setting(key=setting.key, value=setting.value)
        db.add(new_setting)
    await db.commit()
    return {"status": "success", "key": setting.key, "value": setting.value}
