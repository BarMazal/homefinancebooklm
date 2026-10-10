from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import PensionPolicy
from app.schemas import PensionPolicyBase, PensionPolicyResponse

router = APIRouter(prefix="/api/pensions", tags=["Pensions & Insurance"])

@router.get("", response_model=List[PensionPolicyResponse])
async def list_pension_policies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PensionPolicy))
    return result.scalars().all()

@router.post("", response_model=PensionPolicyResponse)
async def create_pension_policy(policy: PensionPolicyBase, db: AsyncSession = Depends(get_db)):
    db_policy = PensionPolicy(**policy.model_dump())
    db.add(db_policy)
    await db.commit()
    await db.refresh(db_policy)
    return db_policy

@router.get("/audit/duplicates")
async def audit_duplicate_coverages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PensionPolicy))
    policies = result.scalars().all()

    duplicates = []
    type_counts = {}
    for p in policies:
        type_counts[p.type] = type_counts.get(p.type, []) + [p]

    for p_type, p_list in type_counts.items():
        if len(p_list) > 1 and "insurance" in p_type:
            duplicates.append({
                "type": p_type,
                "count": len(p_list),
                "policies": [p.policy_name for p in p_list],
                "message": f"Multiple policies detected for {p_type}. Check for overlapping double coverage."
            })

    return {"duplicates": duplicates}
