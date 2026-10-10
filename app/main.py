import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.routes import (
    accounts,
    transactions,
    receipts,
    xirr,
    pensions,
    real_estate,
    simulator,
    settings,
    notebooklm
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    await init_db()
    print("[Home Finance BookLM Backend] Database initialized successfully.")
    yield
    # Shutdown
    print("[Home Finance BookLM Backend] Shutting down cleanly.")

app = FastAPI(
    title="Home Finance BookLM API",
    description="Backend API for personal finance ingestion, OCR, XIRR math, pensions, real estate, and NotebookLM AI integration.",
    version="1.0.0",
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
    return {"status": "ok", "app": "Home Finance BookLM", "version": "1.0.0"}
