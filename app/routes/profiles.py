import os
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel

from app.services.profile_manager import profile_manager
from app.database import init_db

router = APIRouter(prefix="/api/profiles", tags=["Profiles"])

class ProfileBase(BaseModel):
    name: str

class ProfileResponse(BaseModel):
    id: int
    name: str
    is_active: bool

@router.get("", response_model=List[ProfileResponse])
async def list_profiles():
    data = profile_manager.get_profiles_data()
    return data.get("profiles", [])

@router.get("/active", response_model=ProfileResponse)
async def get_active_profile():
    data = profile_manager.get_profiles_data()
    active_id = data.get("active_profile_id", 1)
    profiles = data.get("profiles", [])
    for p_item in profiles:
        if p_item["id"] == active_id:
            return p_item
    return profiles[0] if profiles else {"id": 1, "name": "Demo Profile (Sample Data)", "is_active": True}


@router.post("", response_model=ProfileResponse)
async def create_profile(p: ProfileBase):
    data = profile_manager.get_profiles_data()
    existing_profiles = data.get("profiles", [])
    
    new_id = max([p_item["id"] for p_item in existing_profiles], default=0) + 1
    new_profile = {"id": new_id, "name": p.name, "is_active": False}
    
    existing_profiles.append(new_profile)
    data["profiles"] = existing_profiles
    profile_manager.save_profiles_data(data)

    # Initialize DB schema for new profile
    await init_db(new_id)

    return new_profile

@router.post("/{profile_id}/activate", response_model=ProfileResponse)
async def activate_profile(profile_id: int):
    profile_manager.set_active_profile_id(profile_id)
    db_path = profile_manager.get_profile_db_path(profile_id)
    if not os.path.exists(db_path):
        await init_db(profile_id)

    # Immediately warm up notebook details cache in background for activated profile
    try:
        import asyncio
        from app.services.notebooklm_service import notebooklm_service
        notebooklm_service.start_background_connect(profile_id, force=True)
        asyncio.create_task(notebooklm_service.prefetch_active_profile_notebook(profile_id))
    except Exception as e:
        print(f"[Activate Prefetch Error]: {e}")

    data = profile_manager.get_profiles_data()
    for p_item in data.get("profiles", []):
        if p_item["id"] == profile_id:
            return p_item

    raise HTTPException(status_code=404, detail="Profile not found")

@router.post("/1/restore-demo")
async def restore_demo_profile():
    from app.database import get_engine_for_profile, Base, seed_demo_profile_data
    engine, sessionmaker = get_engine_for_profile(1)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with sessionmaker() as session:
        await seed_demo_profile_data(session)
    return {"status": "success", "message": "Demo profile restored with full sample dataset."}
