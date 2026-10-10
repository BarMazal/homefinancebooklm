import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.services.profile_manager import profile_manager

Base = declarative_base()

_engines = {}
_sessionmakers = {}

def get_engine_for_profile(profile_id: int):
    if profile_id not in _engines:
        db_path = profile_manager.get_profile_db_path(profile_id)
        db_url = f"sqlite+aiosqlite:///{db_path}"
        engine = create_async_engine(db_url, connect_args={"check_same_thread": False}, echo=False)
        sm = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
        _engines[profile_id] = engine
        _sessionmakers[profile_id] = sm
    return _engines[profile_id], _sessionmakers[profile_id]

async def get_db():
    active_profile_id = profile_manager.get_active_profile_id()
    _, sessionmaker = get_engine_for_profile(active_profile_id)
    async with sessionmaker() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db(profile_id: int = None):
    if profile_id is None:
        profile_id = profile_manager.get_active_profile_id()
    engine, _ = get_engine_for_profile(profile_id)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
