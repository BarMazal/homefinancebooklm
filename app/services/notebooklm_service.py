import os
import subprocess
import asyncio
from playwright.async_api import async_playwright

CHROMIUM_PROFILE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".chromium_profile")

class NotebookLMService:
    def __init__(self):
        self.profile_dir = CHROMIUM_PROFILE_DIR
        os.makedirs(self.profile_dir, exist_ok=True)

    async def launch_auth_browser(self):
        """
        Launches an isolated Chromium browser window using Playwright persistent context
        pointing to https://notebooklm.google.com/
        Allows the user to authenticate their preferred Google account separately from system Chrome.
        """
        print(f"[NotebookLM] Launching Chromium Auth Window in {self.profile_dir}...")
        playwright = await async_playwright().start()
        browser_context = await playwright.chromium.launch_persistent_context(
            user_data_dir=self.profile_dir,
            headless=False, # Interactive mode so user can log in
            args=["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,800"]
        )
        page = await browser_context.new_page()
        await page.goto("https://notebooklm.google.com/")
        print("[NotebookLM] Browser window opened. Please complete authentication in the browser window.")
        return {"status": "success", "message": "Chromium window launched. Log in and close when finished."}

    async def check_connection_status(self):
        """
        Checks if the saved chromium profile has active cookies/authentication for NotebookLM.
        """
        if not os.path.exists(self.profile_dir):
            return {"authenticated": False, "notebooks_count": 0, "message": "No chromium profile found."}

        try:
            playwright = await async_playwright().start()
            browser_context = await playwright.chromium.launch_persistent_context(
                user_data_dir=self.profile_dir,
                headless=True
            )
            page = await browser_context.new_page()
            await page.goto("https://notebooklm.google.com/", wait_until="domcontentloaded")
            content = await page.content()
            await browser_context.close()
            await playwright.stop()

            # Check if redirected to login page or signed in
            if "accounts.google.com" in page.url or "Sign in" in content:
                return {"authenticated": False, "notebooks_count": 0, "message": "User not logged in."}

            return {"authenticated": True, "notebooks_count": 1, "message": "Authenticated successfully!"}
        except Exception as err:
            return {"authenticated": False, "notebooks_count": 0, "error": str(err)}

notebooklm_service = NotebookLMService()
