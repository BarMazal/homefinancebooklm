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
    await init_db(profile_id)

    data = profile_manager.get_profiles_data()
    for p_item in data.get("profiles", []):
        if p_item["id"] == profile_id:
            return p_item

    raise HTTPException(status_code=404, detail="Profile not found")
