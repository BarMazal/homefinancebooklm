import os
import json
import shutil
import asyncio
from typing import Dict, Any, List, Optional
from playwright.async_api import async_playwright
from notebooklm import NotebookLMClient
from app.services.profile_manager import profile_manager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class NotebookLMService:
    def __init__(self):
        self._active_processes = {}

    def _extract_email_from_file(self, path: str) -> Optional[str]:
        """
        Attempts to read stored email from storage_state.json.
        """
        if not path or not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                email = data.get("notebooklm", {}).get("account", {}).get("email")
                if email:
                    return str(email).strip()
        except Exception:
            pass
        return None

    def get_nb_profile_name(self, profile_id: Optional[int] = None) -> str:
        """
        Determines the internal dedicated NotebookLM profile name per user profile:
        1. Checks profile-specific internal setting in data/profile_<id>/settings.json ('nb_profile')
        2. Defaults to dedicated internal per-profile name: 'homefinance_p{profile_id}'
        
        Completely isolated per user profile. Maintained internally by the application.
        Never reads or relies on external environment variables.
        Guaranteed to NEVER return 'default'!
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        candidate = None

        # Priority 1: Custom internal setting saved specifically for this active profile
        try:
            settings = profile_manager.load_profile_settings(profile_id)
            custom_p = settings.get("nb_profile")
            if custom_p and custom_p.strip() and custom_p.strip().lower() != "default":
                candidate = custom_p.strip()
        except Exception:
            pass

        # Priority 2: Dedicated per-user-profile internal name default (e.g. homefinance_p1, homefinance_p2)
        if not candidate or candidate.lower() == "default":
            candidate = f"homefinance_p{profile_id}"

        return candidate

    def set_nb_profile_name(self, profile_name: str, profile_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Sets a custom internal NotebookLM profile name for this specific user profile.
        Strictly forbids 'default' to protect cross-application and cross-profile isolation.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        clean_name = profile_name.strip()
        if not clean_name or clean_name.lower() == "default":
            return {
                "success": False,
                "message": "The 'default' profile name is strictly prohibited to prevent cross-app collision."
            }

        settings = profile_manager.load_profile_settings(profile_id)
        settings["nb_profile"] = clean_name
        profile_manager.save_profile_settings(profile_id, settings)

        return {
            "success": True,
            "nb_profile": clean_name,
            "message": f"Internal NotebookLM profile configured as '{clean_name}' for Profile #{profile_id}."
        }

    def _get_storage_path(self, profile_id: Optional[int] = None) -> Optional[str]:
        """
        Returns profile-specific storage_state.json if it exists.
        Strictly isolated per profile - DOES NOT leak default or external accounts.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        # 1. Check local project profile directory first
        local_path = os.path.join(profile_manager.get_profile_dir(profile_id), "storage_state.json")
        if os.path.exists(local_path):
            return local_path

        # 2. Check ~/.notebooklm/profiles/<nb_profile>/storage_state.json
        nb_profile = self.get_nb_profile_name(profile_id)
        if nb_profile and nb_profile != "default":
            system_path = os.path.expanduser(f"~/.notebooklm/profiles/{nb_profile}/storage_state.json")
            if os.path.exists(system_path):
                return system_path

        return None

    def _cleanup_profile_chromium(self, profile_id: int):
        """
        Terminates the specific auth launcher subprocess for this profile if running
        and removes stale lock files cleanly from this profile's directory only.
        """
        c_dir = profile_manager.get_profile_chromium_dir(profile_id)
        
        # Terminate any recorded subprocess for this profile
        proc = self._active_processes.pop(profile_id, None)
        if proc:
            try:
                proc.kill()
            except Exception:
                pass

        # Remove stale lock files only in this profile's Chromium directory
        for lock_name in ["lockfile", "SingletonLock", "SingletonCookie", "SingletonSocket"]:
            lock_path = os.path.join(c_dir, lock_name)
            if os.path.exists(lock_path):
                try:
                    os.remove(lock_path)
                except Exception:
                    pass

    async def disconnect_account(self, profile_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Disconnects Google NotebookLM from this profile strictly:
        - Terminating any running auth browser for this profile
        - Deleting this profile's local storage_state.json
        - NEVER deleting external or shared profiles from other applications
        - Only removes ~/.notebooklm/profiles/<nb_profile> if it is exclusively an internal homefinance_* profile
        - Clearing this profile's .chromium_profile_<id>
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        nb_profile = self.get_nb_profile_name(profile_id)

        # 1. Clean up active browser for this profile
        self._cleanup_profile_chromium(profile_id)
        await asyncio.sleep(0.3)

        # 2. Remove local profile storage_state.json
        local_dest = os.path.join(profile_manager.get_profile_dir(profile_id), "storage_state.json")
        if os.path.exists(local_dest):
            try:
                os.remove(local_dest)
            except Exception as e:
                return {"success": False, "message": f"Failed to disconnect: {str(e)}"}

        # 3. Only delete ~/.notebooklm/profiles/<nb_profile> if it is an internal homefinance_* profile
        # NEVER touch external or user-managed custom profiles!
        if nb_profile and nb_profile.startswith("homefinance_") and nb_profile.lower() != "default":
            system_dir = os.path.expanduser(f"~/.notebooklm/profiles/{nb_profile}")
            if os.path.exists(system_dir):
                try:
                    shutil.rmtree(system_dir, ignore_errors=True)
                except Exception:
                    pass

        # 4. Clean up the isolated Chromium directory for this profile
        c_dir = profile_manager.get_profile_chromium_dir(profile_id)
        if os.path.exists(c_dir):
            try:
                shutil.rmtree(c_dir, ignore_errors=True)
            except Exception:
                pass
        os.makedirs(c_dir, exist_ok=True)

        return {
            "success": True, 
            "profile": nb_profile,
            "message": f"Successfully disconnected Google account from profile '{nb_profile}'. Other applications are unaffected."
        }

    async def launch_auth_browser(self, profile_id: Optional[int] = None):
        """
        Launches an isolated Google sign-in browser for this profile targeting
        its internal dedicated NotebookLM profile ('homefinance_p<id>').
        """
        import sys
        import subprocess

        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        nb_profile = self.get_nb_profile_name(profile_id)

        # Check if already running for this profile
        existing_proc = self._active_processes.get(profile_id)
        if existing_proc and existing_proc.poll() is None:
            return {
                "status": "success", 
                "profile": nb_profile,
                "message": f"Browser login is already active for profile '{nb_profile}'. Please complete Google sign-in."
            }

        # Clean locks for this profile
        self._cleanup_profile_chromium(profile_id)
        await asyncio.sleep(0.3)

        cmd = [sys.executable, "-m", "app.services.auth_launcher", str(profile_id), nb_profile]
        print(f"[NotebookLM] Spawning auth subprocess for Profile {profile_id} (NB Profile: '{nb_profile}'): {cmd}")

        # Explicitly isolate and sanitize subprocess environment:
        sub_env = os.environ.copy()
        sub_env.pop("DND_NB_PROFILE", None)
        sub_env["NOTEBOOKLM_PROFILE"] = nb_profile

        proc = subprocess.Popen(cmd, cwd=BASE_DIR, env=sub_env)
        self._active_processes[profile_id] = proc

        return {
            "status": "success", 
            "profile": nb_profile,
            "message": f"Sign-in browser launched for isolated profile '{nb_profile}'. Please sign in with your desired Google account."
        }

    async def check_connection_status(self, profile_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Checks if this profile has valid Google NotebookLM credentials.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        nb_profile = self.get_nb_profile_name(profile_id)
        proc = self._active_processes.get(profile_id)
        browser_active = (proc is not None and proc.poll() is None)

        storage_path = self._get_storage_path(profile_id)

        if not storage_path:
            return {
                "authenticated": False,
                "profile_id": profile_id,
                "nb_profile": nb_profile,
                "account_email": None,
                "notebooks_count": 0,
                "browser_active": browser_active,
                "message": f"Profile '{nb_profile}' is not connected to any Google account."
            }

        try:
            async with NotebookLMClient.from_storage(storage_path, profile=nb_profile) as client:
                notebooks = await client.notebooks.list()
                email = None
                try:
                    email = await client.get_account_email()
                except Exception:
                    pass
                if not email:
                    email = self._extract_email_from_file(storage_path)

                return {
                    "authenticated": True,
                    "profile_id": profile_id,
                    "nb_profile": nb_profile,
                    "account_email": email or "Connected Account",
                    "notebooks_count": len(notebooks),
                    "browser_active": browser_active,
                    "message": f"Connected to {email or 'Google Account'} ({len(notebooks)} notebooks available)"
                }
        except Exception as err:
            return {
                "authenticated": False,
                "profile_id": profile_id,
                "nb_profile": nb_profile,
                "account_email": None,
                "notebooks_count": 0,
                "browser_active": browser_active,
                "error": str(err),
                "message": f"Session invalid or expired for Profile '{nb_profile}'. Please re-authenticate."
            }

    async def list_notebooks(self, profile_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Scans the user's Google NotebookLM account and lists all notebooks.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        nb_profile = self.get_nb_profile_name(profile_id)
        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return {
                "authenticated": False,
                "notebooks": [],
                "message": "Authentication required to browse notebooks."
            }

        try:
            async with NotebookLMClient.from_storage(storage_path, profile=nb_profile) as client:
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

        nb_profile = self.get_nb_profile_name(profile_id)
        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return {
                "success": False,
                "error": "Authentication required."
            }

        try:
            async with NotebookLMClient.from_storage(storage_path, profile=nb_profile) as client:
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

        nb_profile = self.get_nb_profile_name(profile_id)
        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return {"success": False, "error": "Authentication required."}

        try:
            async with NotebookLMClient.from_storage(storage_path, profile=nb_profile) as client:
                try:
                    ft = await client.sources.get_fulltext(notebook_id, source_id)
                    return {
                        "success": True,
                        "source_id": source_id,
                        "title": getattr(ft, "title", "Source Document"),
                        "content": getattr(ft, "content", ""),
                        "char_count": getattr(ft, "char_count", 0)
                    }
                except Exception:
                    # Fallback 1: check if it is a Note
                    try:
                        notes = await client.notes.list(notebook_id)
                        for n in notes:
                            if n.id == source_id:
                                content = getattr(n, "content", "")
                                return {
                                    "success": True,
                                    "source_id": source_id,
                                    "title": getattr(n, "title", "Note"),
                                    "content": content,
                                    "char_count": len(content)
                                }
                    except Exception:
                        pass

                    # Fallback 2: check if it is an Artifact
                    try:
                        artifacts = await client.artifacts.list(notebook_id)
                        for a in artifacts:
                            if a.id == source_id:
                                content = getattr(a, "content", "") or getattr(a, "title", "")
                                return {
                                    "success": True,
                                    "source_id": source_id,
                                    "title": getattr(a, "title", "Artifact"),
                                    "content": content,
                                    "char_count": len(content)
                                }
                    except Exception:
                        pass
                    raise
        except Exception as err:
            return {"success": False, "error": str(err)}

    async def extract_financial_records(self, notebook_id: str, profile_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Queries NotebookLM to extract financial transactions, receipts, and deposits.
        Uses client.chat.ask with a structured extraction prompt.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        nb_profile = self.get_nb_profile_name(profile_id)
        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return []

        prompt = (
            "You are a financial record extraction assistant. Examine the sources and notes in this notebook. "
            "Extract all financial transactions, receipts, expenses, bank movements, and pension/salary deposits. "
            "Return strictly a JSON array without markdown formatting or code blocks: "
            "[{\"date\": \"YYYY-MM-DD\", \"merchant\": \"Merchant Name\", \"amount\": -123.45, \"category\": \"Groceries\", \"source_note\": \"Source reference\"}] "
            "Expenses must have negative amounts (e.g. -250.0) and income/deposits must have positive amounts (e.g. 5000.0). "
            "If no financial records exist, return []."
        )

        try:
            async with NotebookLMClient.from_storage(storage_path, profile=nb_profile) as client:
                res = await client.chat.ask(notebook_id, prompt)
                raw_text = getattr(res, "answer", str(res))
                
                import json
                import re

                # Extract JSON array even if NotebookLM surrounds it with introductory/concluding commentary
                match = re.search(r'\[\s*\{.*\}\s*\]', raw_text, re.DOTALL)
                if match:
                    cleaned = match.group(0).strip()
                else:
                    # Clean up any markdown code fencing
                    cleaned = raw_text.strip()
                    if cleaned.startswith("```json"):
                        cleaned = cleaned[7:]
                    elif cleaned.startswith("```"):
                        cleaned = cleaned[3:]
                    if cleaned.endswith("```"):
                        cleaned = cleaned[:-3]
                    cleaned = cleaned.strip()

                parsed = json.loads(cleaned)
                if isinstance(parsed, list):
                    return parsed
        except Exception as err:
            print(f"[NotebookLM] Extraction prompt error: {err}")
        
        return []

notebooklm_service = NotebookLMService()

