from fastapi import APIRouter
from app.services.notebooklm_service import notebooklm_service

router = APIRouter(prefix="/api/notebooklm", tags=["NotebookLM"])

@router.post("/launch-auth-browser")
async def launch_auth_browser():
    """
    Launch isolated Chromium browser context for NotebookLM user login.
    """
    result = await notebooklm_service.launch_auth_browser()
    return result

@router.get("/status")
async def get_notebooklm_status():
    status = await notebooklm_service.check_connection_status()
    return status
