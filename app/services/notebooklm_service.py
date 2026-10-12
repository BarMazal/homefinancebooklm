import os
import asyncio
from typing import Dict, Any, List, Optional
from playwright.async_api import async_playwright
from notebooklm import NotebookLMClient
from app.services.profile_manager import profile_manager

class NotebookLMService:
    def _get_storage_path(self, profile_id: Optional[int] = None) -> Optional[str]:
        """
        Returns profile-specific storage_state.json if it exists,
        otherwise falls back to default NotebookLM storage path.
        """
        if profile_id is not None:
            profile_storage = os.path.join(profile_manager.get_profile_dir(profile_id), "storage_state.json")
            if os.path.exists(profile_storage):
                return profile_storage
        
        default_storage = os.path.expanduser("~/.notebooklm/profiles/default/storage_state.json")
        if os.path.exists(default_storage):
            return default_storage
        return None

    async def launch_auth_browser(self, profile_id: Optional[int] = None):
        """
        Launches an isolated Chromium browser window using Playwright persistent context
        targeting `.chromium_profile_<profile_id>/`.
        When user finishes login, saves storage_state.json for programmatic access.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        c_dir = profile_manager.get_profile_chromium_dir(profile_id)
        storage_dest = os.path.join(profile_manager.get_profile_dir(profile_id), "storage_state.json")
        default_dest = os.path.expanduser("~/.notebooklm/profiles/default/storage_state.json")

        print(f"[NotebookLM] Launching Chromium Auth Window for profile {profile_id} in {c_dir}...")
        
        playwright = await async_playwright().start()
        browser_context = await playwright.chromium.launch_persistent_context(
            user_data_dir=c_dir,
            headless=False,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,800"]
        )
        page = await browser_context.new_page()
        await page.goto("https://notebooklm.google.com/")
        print(f"[NotebookLM Profile {profile_id}] Interactive browser window opened.")

        # Save cookies/storage state when browser closes or idle
        try:
            # Let it remain open for user authentication
            async def sync_cookies():
                await asyncio.sleep(20)
                try:
                    await browser_context.storage_state(path=storage_dest)
                    os.makedirs(os.path.dirname(default_dest), exist_ok=True)
                    await browser_context.storage_state(path=default_dest)
                except Exception:
                    pass
            asyncio.create_task(sync_cookies())
        except Exception:
            pass

        return {"status": "success", "message": f"Chromium auth window launched for Profile {profile_id}."}

    async def check_connection_status(self, profile_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Checks if the NotebookLM client can connect and list notebooks.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return {
                "authenticated": False,
                "notebooks_count": 0,
                "message": "No NotebookLM authentication credentials found. Please launch the login browser."
            }

        try:
            async with NotebookLMClient.from_storage(storage_path) as client:
                notebooks = await client.notebooks.list()
                email = getattr(client, "get_account_email", lambda: None)()
                return {
                    "authenticated": True,
                    "account_email": email or "Google Account Connected",
                    "notebooks_count": len(notebooks),
                    "message": f"Connected ({len(notebooks)} notebooks available)"
                }
        except Exception as err:
            return {
                "authenticated": False,
                "notebooks_count": 0,
                "error": str(err),
                "message": "Authentication token expired or not present. Please re-authenticate."
            }

    async def list_notebooks(self, profile_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Scans the user's Google NotebookLM account and lists all notebooks.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return {
                "authenticated": False,
                "notebooks": [],
                "message": "Authentication required to browse notebooks."
            }

        try:
            async with NotebookLMClient.from_storage(storage_path) as client:
                notebooks = await client.notebooks.list()
                formatted = []
                for nb in notebooks:
                    formatted.append({
                        "id": nb.id,
                        "title": nb.title or "Untitled Notebook",
                        "url": f"https://notebooklm.google.com/notebook/{nb.id}",
                        "source_count": getattr(nb, "source_count", 0) if hasattr(nb, "source_count") else None
                    })
                return {
                    "authenticated": True,
                    "notebooks": formatted,
                    "total": len(formatted)
                }
        except Exception as err:
            return {
                "authenticated": False,
                "notebooks": [],
                "error": str(err),
                "message": f"Failed to list notebooks: {str(err)}"
            }

    async def get_notebook_details(self, notebook_id: str, profile_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Retrieves the sources, notes, and artifacts inside a specific notebook.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return {
                "success": False,
                "error": "Authentication required."
            }

        try:
            async with NotebookLMClient.from_storage(storage_path) as client:
                # Get notebook metadata
                nb = await client.notebooks.get(notebook_id)

                # Get sources / resources
                sources_raw = await client.sources.list(notebook_id)
                sources = []
                for s in sources_raw:
                    sources.append({
                        "id": s.id,
                        "title": s.title or "Untitled Source",
                        "kind": str(getattr(s, "kind", "Document")).replace("SourceType.", ""),
                        "word_count": getattr(s, "word_count", None),
                        "status": str(getattr(s, "status", "ready")),
                        "is_ready": getattr(s, "is_ready", True)
                    })

                # Get notes
                notes_raw = await client.notes.list(notebook_id)
                notes = []
                for n in notes_raw:
                    content_str = str(getattr(n, "content", ""))
                    notes.append({
                        "id": n.id,
                        "title": n.title or "Untitled Note",
                        "content_preview": content_str[:250] + ("..." if len(content_str) > 250 else ""),
                        "full_content": content_str,
                        "created_at": str(getattr(n, "created_at", ""))
                    })

                # Get artifacts (presentations, study guides, mindmaps, audio, etc.)
                artifacts = []
                try:
                    artifacts_raw = await client.artifacts.list(notebook_id)
                    for a in artifacts_raw:
                        artifacts.append({
                            "id": a.id,
                            "title": getattr(a, "title", "Artifact"),
                            "type": str(getattr(a, "type", "artifact")).replace("ArtifactType.", "")
                        })
                except Exception:
                    pass

                return {
                    "success": True,
                    "notebook_id": notebook_id,
                    "title": nb.title or "Notebook",
                    "url": f"https://notebooklm.google.com/notebook/{notebook_id}",
                    "sources": sources,
                    "notes": notes,
                    "artifacts": artifacts
                }
        except Exception as err:
            return {
                "success": False,
                "notebook_id": notebook_id,
                "error": str(err)
            }

    async def get_source_fulltext(self, notebook_id: str, source_id: str, profile_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Retrieves full text of a source.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return {"success": False, "error": "Authentication required."}

        try:
            async with NotebookLMClient.from_storage(storage_path) as client:
                ft = await client.sources.get_fulltext(notebook_id, source_id)
                return {
                    "success": True,
                    "source_id": source_id,
                    "title": getattr(ft, "title", "Source Text"),
                    "content": getattr(ft, "content", ""),
                    "char_count": getattr(ft, "char_count", 0)
                }
        except Exception as err:
            return {"success": False, "error": str(err)}

notebooklm_service = NotebookLMService()
