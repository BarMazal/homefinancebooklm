import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db, init_all_profiles
from app.routes import (
    accounts,
    transactions,
    receipts,
    xirr,
    pensions,
    real_estate,
    simulator,
    settings,
    notebooklm,
    profiles,
    dashboard
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables for all profiles
    await init_all_profiles()
    print("[Home Finance BookLM Backend] Database initialized successfully for all profiles.")

    # Connect to NotebookLM and warm up notebook details cache for active profile in background.
    # Nothing here is awaited, so the API starts serving immediately; the UI polls
    # /api/notebooklm/connection-state to show a "connecting" indicator meanwhile.
    try:
        import asyncio
        from app.services.notebooklm_service import notebooklm_service
        from app.services.profile_manager import profile_manager
        from app.services.ocr_service import get_tesseract_config
        active_id = profile_manager.get_active_profile_id()

        async def _startup_warmup():
            # Run the connection check first, then the prefetch, so the two don't
            # open concurrent clients on the same storage_state.json.
            try:
                await notebooklm_service.start_background_connect(active_id)
            except Exception as e:
                print(f"[Startup Connect Error]: {e}")
            await notebooklm_service.prefetch_active_profile_notebook(active_id)

        asyncio.create_task(_startup_warmup())
        # Detect local Tesseract (Hebrew OCR fallback) off the event loop and log its status
        asyncio.create_task(asyncio.to_thread(get_tesseract_config))
    except Exception as e:
        print(f"[Startup Prefetch Error]: {e}")

    yield
    # Shutdown
    print("[Home Finance BookLM Backend] Shutting down cleanly.")

app = FastAPI(
    title="Home Finance BookLM API",
    description="Backend API for personal finance ingestion, OCR, XIRR math, pensions, real estate, and NotebookLM AI integration.",
    version="1.0.1",
    lifespan=lifespan
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(profiles.router)
app.include_router(dashboard.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(receipts.router)
app.include_router(xirr.router)
app.include_router(pensions.router)
app.include_router(real_estate.router)
app.include_router(simulator.router)
app.include_router(settings.router)
app.include_router(notebooklm.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "Home Finance BookLM", "version": "1.0.1"}
