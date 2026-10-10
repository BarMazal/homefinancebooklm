import os
import asyncio
from playwright.async_api import async_playwright
from app.services.profile_manager import profile_manager

class NotebookLMService:
    async def launch_auth_browser(self, profile_id: int = None):
        """
        Launches an isolated Chromium browser window using Playwright persistent context
        targeting `.chromium_profile_<profile_id>/`
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        c_dir = profile_manager.get_profile_chromium_dir(profile_id)
        print(f"[NotebookLM] Launching Chromium Auth Window for profile {profile_id} in {c_dir}...")
        
        playwright = await async_playwright().start()
        browser_context = await playwright.chromium.launch_persistent_context(
            user_data_dir=c_dir,
            headless=False, # Interactive mode so user can log in
            args=["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,800"]
        )
        page = await browser_context.new_page()
        await page.goto("https://notebooklm.google.com/")
        print(f"[NotebookLM Profile {profile_id}] Browser window opened. Complete authentication in browser.")
        return {"status": "success", "message": f"Chromium auth window launched for Profile {profile_id}."}

    async def check_connection_status(self, profile_id: int = None):
        """
        Checks if the saved chromium profile for the current app profile has active cookies/authentication.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        c_dir = profile_manager.get_profile_chromium_dir(profile_id)
        if not os.path.exists(c_dir):
            return {"authenticated": False, "notebooks_count": 0, "message": "No chromium auth profile found."}

        try:
            playwright = await async_playwright().start()
            browser_context = await playwright.chromium.launch_persistent_context(
                user_data_dir=c_dir,
                headless=True
            )
            page = await browser_context.new_page()
            await page.goto("https://notebooklm.google.com/", wait_until="domcontentloaded")
            content = await page.content()
            await browser_context.close()
            await playwright.stop()

            if "accounts.google.com" in page.url or "Sign in" in content:
                return {"authenticated": False, "notebooks_count": 0, "message": "User not logged in."}

            return {"authenticated": True, "notebooks_count": 1, "message": "Authenticated successfully!"}
        except Exception as err:
            return {"authenticated": False, "notebooks_count": 0, "error": str(err)}

notebooklm_service = NotebookLMService()
