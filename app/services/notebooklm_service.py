import os
import json
import shutil
import asyncio
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from playwright.async_api import async_playwright
from notebooklm import NotebookLMClient
from app.services.profile_manager import profile_manager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class NotebookLMService:
    def __init__(self):
        self._active_processes = {}
        self._details_cache = {}
        self._status_cache = {}
        # Background connection checks per profile: {profile_id: asyncio.Task}
        self._connect_tasks: Dict[int, asyncio.Task] = {}
        # Last finished connection check result per profile (no TTL; used for UI state)
        self._last_connection: Dict[int, Dict[str, Any]] = {}

    def _clean_stale_locks(self, profile_id: int):
        """
        Removes any stale .storage_state.json.lock or .rotate.lock files that prevent
        NotebookLMClient from acquiring locks and stall execution.
        """
        try:
            p_dir = profile_manager.get_profile_dir(profile_id)
            if os.path.exists(p_dir):
                for f in os.listdir(p_dir):
                    if f.endswith(".lock"):
                        lock_path = os.path.join(p_dir, f)
                        try:
                            os.remove(lock_path)
                            print(f"[NotebookLMService] Cleared stale lock file: {lock_path}")
                        except Exception:
                            pass
        except Exception:
            pass

    def _get_details_cache_path(self, profile_id: int) -> str:
        return os.path.join(profile_manager.get_profile_dir(profile_id), "notebook_details_cache.json")

    def get_cached_notebook_details(self, profile_id: int) -> Optional[Dict[str, Any]]:
        # 1. In-memory check (valid 30 minutes)
        if profile_id in self._details_cache:
            entry = self._details_cache[profile_id]
            if time.time() - entry.get("timestamp", 0) < 1800:
                return entry.get("data")
        # 2. Disk cache check
        c_path = self._get_details_cache_path(profile_id)
        if os.path.exists(c_path):
            try:
                with open(c_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._details_cache[profile_id] = {"data": data, "timestamp": time.time()}
                    return data
            except Exception:
                pass
        return None

    def save_cached_notebook_details(self, profile_id: int, data: Dict[str, Any]):
        self._details_cache[profile_id] = {"data": data, "timestamp": time.time()}
        c_path = self._get_details_cache_path(profile_id)
        try:
            with open(c_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[NotebookDetailsCache Save Error]: {e}")

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
        self._status_cache.pop(profile_id, None)
        self._last_connection.pop(profile_id, None)

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

        # Forget cached connection results so the UI does not show a stale "connected" state
        self._status_cache.pop(profile_id, None)
        self._last_connection.pop(profile_id, None)

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

    def _is_browser_active(self, profile_id: int) -> bool:
        proc = self._active_processes.get(profile_id)
        return proc is not None and proc.poll() is None

    def start_background_connect(self, profile_id: Optional[int] = None, force: bool = False) -> asyncio.Task:
        """
        Starts (or reuses) a background connection check for this profile so callers
        never have to wait on the Google round-trip. Poll get_connection_state() for progress.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        task = self._connect_tasks.get(profile_id)
        if task and not task.done():
            return task

        async def _run():
            try:
                result = await self._check_connection_now(profile_id, force=force)
            except Exception as e:
                result = {
                    "authenticated": False,
                    "profile_id": profile_id,
                    "nb_profile": self.get_nb_profile_name(profile_id),
                    "account_email": None,
                    "notebooks_count": 0,
                    "error": str(e),
                    "message": f"Connection check failed: {e}"
                }
            self._last_connection[profile_id] = result
            return result

        task = asyncio.create_task(_run())
        self._connect_tasks[profile_id] = task
        return task

    def get_connection_state(self, profile_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Returns the current connection state instantly (never waits on the network):
        - state 'connecting' while a background check is running
        - state 'connected' / 'disconnected' with the last check's details once finished
        Starts a check if none has ever run for this profile.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        task = self._connect_tasks.get(profile_id)
        last = self._last_connection.get(profile_id)
        running = task is not None and not task.done()
        if not running and last is None:
            self.start_background_connect(profile_id)
            running = True

        if running:
            return {
                "state": "connecting",
                "authenticated": bool(last and last.get("authenticated")),
                "profile_id": profile_id,
                "nb_profile": self.get_nb_profile_name(profile_id),
                "account_email": last.get("account_email") if last else None,
                "browser_active": self._is_browser_active(profile_id),
                "message": "Connecting to Google NotebookLM..."
            }

        result = dict(last)
        result["state"] = "connected" if result.get("authenticated") else "disconnected"
        result["browser_active"] = self._is_browser_active(profile_id)
        return result

    async def check_connection_status(self, profile_id: Optional[int] = None, force: bool = False) -> Dict[str, Any]:
        """
        Checks if this profile has valid Google NotebookLM credentials.
        If a background check is already running for this profile, waits for it
        instead of opening a second concurrent client on the same storage file.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        task = self._connect_tasks.get(profile_id)
        if task and not task.done() and not force:
            result = dict(await asyncio.shield(task))
            result["browser_active"] = self._is_browser_active(profile_id)
            return result

        result = await self._check_connection_now(profile_id, force=force)
        self._last_connection[profile_id] = result
        return result

    async def _check_connection_now(self, profile_id: int, force: bool = False) -> Dict[str, Any]:
        """
        Performs the actual connection check.
        Never blocks the event loop: uses stale lock cleanup, local token extraction, and timeout guards.
        """
        if force:
            self._status_cache.pop(profile_id, None)

        self._clean_stale_locks(profile_id)
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

        # Check in-memory status cache if fresh (within 60 seconds)
        if profile_id in self._status_cache:
            entry = self._status_cache[profile_id]
            if time.time() - entry.get("timestamp", 0) < 60:
                cached_stat = dict(entry.get("data", {}))
                cached_stat["browser_active"] = browser_active
                return cached_stat

        # Extract email directly from storage file
        email = self._extract_email_from_file(storage_path)

        # Check if we have cached notebook details
        cached_details = self.get_cached_notebook_details(profile_id)
        nb_count = 1 if cached_details and cached_details.get("success") else 0

        # Try quick verification with 3.5s timeout guard so it NEVER stalls
        try:
            async def _verify_client():
                async with NotebookLMClient.from_storage(storage_path, profile=nb_profile) as client:
                    try:
                        acc_email = await client.get_account_email()
                        return acc_email
                    except Exception:
                        return None

            remote_email = await asyncio.wait_for(_verify_client(), timeout=3.5)
            final_email = remote_email or email or "Google Account"
            result = {
                "authenticated": True,
                "profile_id": profile_id,
                "nb_profile": nb_profile,
                "account_email": final_email,
                "notebooks_count": nb_count,
                "browser_active": browser_active,
                "message": f"Connected to {final_email}"
            }
            self._status_cache[profile_id] = {"data": result, "timestamp": time.time()}
            return result
        except Exception:
            # If storage_path exists and has tokens, treat as authenticated gracefully
            if email:
                result = {
                    "authenticated": True,
                    "profile_id": profile_id,
                    "nb_profile": nb_profile,
                    "account_email": email,
                    "notebooks_count": nb_count,
                    "browser_active": browser_active,
                    "message": f"Connected to {email} (Session ready)"
                }
                self._status_cache[profile_id] = {"data": result, "timestamp": time.time()}
                return result
            return {
                "authenticated": False,
                "profile_id": profile_id,
                "nb_profile": nb_profile,
                "account_email": None,
                "notebooks_count": 0,
                "browser_active": browser_active,
                "message": f"Session invalid for Profile '{nb_profile}'. Please re-authenticate."
            }

    async def list_notebooks(self, profile_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Scans the user's Google NotebookLM account and lists all notebooks.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        self._clean_stale_locks(profile_id)
        nb_profile = self.get_nb_profile_name(profile_id)
        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return {
                "authenticated": False,
                "notebooks": [],
                "message": "Authentication required to browse notebooks."
            }

        try:
            async def _fetch_notebooks():
                async with NotebookLMClient.from_storage(storage_path, profile=nb_profile) as client:
                    return await client.notebooks.list()

            notebooks = await asyncio.wait_for(_fetch_notebooks(), timeout=12.0)
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

    async def get_notebook_details(self, notebook_id: str, profile_id: Optional[int] = None, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Retrieves the sources, notes, and artifacts inside a specific notebook.
        Uses in-memory & disk caching to return instantly on subsequent calls or profile switches.
        Runs remote fetches in parallel via asyncio.gather with timeout guards to prevent blocking.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        clean_nb_id = notebook_id.strip() if notebook_id else ""
        if not clean_nb_id:
            return {"success": False, "error": "No notebook ID provided."}

        # Return cached details immediately if available and fresh
        if not force_refresh:
            cached = self.get_cached_notebook_details(profile_id)
            if cached and cached.get("notebook_id") == clean_nb_id and cached.get("success"):
                cached_copy = dict(cached)
                cached_copy["is_cached"] = True
                return cached_copy

        self._clean_stale_locks(profile_id)
        nb_profile = self.get_nb_profile_name(profile_id)
        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return {
                "success": False,
                "error": "Authentication required."
            }

        try:
            async with NotebookLMClient.from_storage(storage_path, profile=nb_profile) as client:
                async def _fetch_safe(coro, default=None):
                    try:
                        return await asyncio.wait_for(coro, timeout=12.0)
                    except Exception as err:
                        print(f"[NotebookLM RPC Warning]: {err}")
                        return default

                # Parallel fetch: metadata, sources, notes, artifacts all concurrently
                nb, sources_raw, notes_raw, artifacts_raw = await asyncio.gather(
                    _fetch_safe(client.notebooks.get(clean_nb_id)),
                    _fetch_safe(client.sources.list(clean_nb_id), default=[]),
                    _fetch_safe(client.notes.list(clean_nb_id), default=[]),
                    _fetch_safe(client.artifacts.list(clean_nb_id), default=[])
                )

                sources = []
                for s in (sources_raw or []):
                    sources.append({
                        "id": s.id,
                        "title": s.title or "Untitled Source",
                        "kind": str(getattr(s, "kind", "Document")).replace("SourceType.", ""),
                        "word_count": getattr(s, "word_count", None),
                        "status": str(getattr(s, "status", "ready")),
                        "is_ready": getattr(s, "is_ready", True)
                    })

                notes = []
                for n in (notes_raw or []):
                    content_str = str(getattr(n, "content", ""))
                    notes.append({
                        "id": n.id,
                        "title": n.title or "Untitled Note",
                        "content_preview": content_str[:250] + ("..." if len(content_str) > 250 else ""),
                        "full_content": content_str,
                        "created_at": str(getattr(n, "created_at", ""))
                    })

                artifacts = []
                for a in (artifacts_raw or []):
                    artifacts.append({
                        "id": a.id,
                        "title": getattr(a, "title", "Artifact"),
                        "type": str(getattr(a, "type", "artifact")).replace("ArtifactType.", "")
                    })

                result = {
                    "success": True,
                    "notebook_id": clean_nb_id,
                    "title": getattr(nb, "title", "Notebook") if nb else "Notebook",
                    "url": f"https://notebooklm.google.com/notebook/{clean_nb_id}",
                    "sources": sources,
                    "notes": notes,
                    "artifacts": artifacts,
                    "sources_count": len(sources),
                    "notes_count": len(notes),
                    "artifacts_count": len(artifacts),
                    "fetched_at": datetime.utcnow().isoformat(),
                    "is_cached": False
                }
                self.save_cached_notebook_details(profile_id, result)
                return result
        except Exception as err:
            # Fall back to stale cache if available
            cached = self.get_cached_notebook_details(profile_id)
            if cached and cached.get("notebook_id") == clean_nb_id:
                cached_copy = dict(cached)
                cached_copy["stale"] = True
                cached_copy["error"] = str(err)
                return cached_copy
            return {
                "success": False,
                "notebook_id": clean_nb_id,
                "error": str(err)
            }

    async def get_active_notebook_details(self, profile_id: Optional[int] = None, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Retrieves notebook details for the active profile's linked notebook ID.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        settings = profile_manager.load_profile_settings(profile_id)
        notebook_id = settings.get("notebooklm_notebook_id", "").strip()
        if not notebook_id:
            return {
                "success": False,
                "authenticated": self._get_storage_path(profile_id) is not None,
                "notebook_id": None,
                "sources": [],
                "notes": [],
                "artifacts": [],
                "message": "No notebook linked to this profile yet."
            }

        return await self.get_notebook_details(notebook_id, profile_id, force_refresh=force_refresh)

    async def prefetch_active_profile_notebook(self, profile_id: int):
        """
        Background task to warm up notebook details cache on startup or profile change.
        """
        try:
            self._clean_stale_locks(profile_id)
            settings = profile_manager.load_profile_settings(profile_id)
            notebook_id = settings.get("notebooklm_notebook_id", "").strip()
            if notebook_id and self._get_storage_path(profile_id):
                print(f"[Prefetch] Warming notebook details cache for Profile #{profile_id} (Notebook: {notebook_id})...")
                await self.get_notebook_details(notebook_id, profile_id, force_refresh=False)
                print(f"[Prefetch] Done warming cache for Profile #{profile_id}.")
        except Exception as e:
            print(f"[Prefetch Warning for Profile #{profile_id}]: {e}")

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

    async def upload_document_source(self, file_path: str, profile_id: Optional[int] = None, title: Optional[str] = None, timeout: float = 150.0) -> Dict[str, Any]:
        """
        Uploads a receipt/document as a source into the profile's linked notebook (so the
        fiscal advisor can use it), waits until Google has processed it, and returns its
        full text. Note: for image sources and image-only PDFs NotebookLM's full text is just
        the image URL, not the OCR'd text - callers must check the text is real.
        Returns {"success", "text", "source_id"} or {"success": False, "error"}.
        """
        if profile_id is None:
            profile_id = profile_manager.get_active_profile_id()

        notebook_id = profile_manager.load_profile_settings(profile_id).get("notebooklm_notebook_id", "").strip()
        storage_path = self._get_storage_path(profile_id)
        if not storage_path:
            return {"success": False, "error": "NotebookLM is not connected for this profile"}
        if not notebook_id:
            return {"success": False, "error": "No notebook linked to this profile"}

        ext = os.path.splitext(file_path)[1].lower()
        if ext not in {".png", ".jpg", ".jpeg", ".webp", ".pdf", ".txt", ".md", ".csv", ".docx"}:
            return {"success": False, "error": f"Unsupported file type for NotebookLM upload: {ext}"}

        nb_profile = self.get_nb_profile_name(profile_id)
        self._clean_stale_locks(profile_id)

        async def _run():
            async with NotebookLMClient.from_storage(storage_path, profile=nb_profile) as client:
                src = await client.sources.add_file(
                    notebook_id, file_path, title=title, wait=True, wait_timeout=timeout
                )
                ft = await client.sources.get_fulltext(notebook_id, src.id)
                return src.id, getattr(ft, "content", "") or ""

        try:
            source_id, text = await asyncio.wait_for(_run(), timeout=timeout + 30)
        except Exception as err:
            return {"success": False, "error": f"{type(err).__name__}: {err}"}

        # Refresh the notebook explorer cache in the background so the new source shows up
        asyncio.create_task(self.get_notebook_details(notebook_id, profile_id, force_refresh=True))
        return {"success": True, "text": text, "source_id": source_id}

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

