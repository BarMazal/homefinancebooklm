import os
import sys
import json
import time
import shutil
import asyncio
from pathlib import Path
from playwright.sync_api import sync_playwright

from notebooklm._browser.browser_capture import (
    filter_storage_state_cookies_by_domain_policy,
    heal_captured_state,
    replace_captured_profile
)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

def launch_auth(profile_id: int, nb_profile: str):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    c_dir = os.path.join(base_dir, f".chromium_profile_{profile_id}")
    profile_dir = os.path.join(base_dir, "data", f"profile_{profile_id}")
    os.makedirs(c_dir, exist_ok=True)
    os.makedirs(profile_dir, exist_ok=True)
    
    local_storage_dest = os.path.join(profile_dir, "storage_state.json")
    
    # Also resolve ~/.notebooklm/profiles/<nb_profile>/storage_state.json
    # Ensuring we NEVER write to "default" profile!
    system_profile_dest = None
    if nb_profile and nb_profile.strip().lower() != "default":
        sys_p_dir = os.path.expanduser(f"~/.notebooklm/profiles/{nb_profile}")
        os.makedirs(sys_p_dir, exist_ok=True)
        system_profile_dest = os.path.join(sys_p_dir, "storage_state.json")

    # Clean stale Chromium lockfiles for THIS profile directory only
    for lock in ["lockfile", "SingletonLock", "SingletonCookie", "SingletonSocket"]:
        lp = os.path.join(c_dir, lock)
        if os.path.exists(lp):
            try:
                os.remove(lp)
            except Exception:
                pass

    print(f"[AuthLauncher] Starting isolated browser for Profile #{profile_id} (NotebookLM profile: '{nb_profile}')...")
    print(f"[AuthLauncher] User Data Dir: {c_dir}")
    print(f"[AuthLauncher] Local Storage: {local_storage_dest}")
    if system_profile_dest:
        print(f"[AuthLauncher] System Profile Storage: {system_profile_dest}")

    with sync_playwright() as p:
        # Determine if Google Chrome channel is available to provide maximum Google SSO compatibility
        chosen_channel = None
        try:
            test_b = p.chromium.launch(channel="chrome", headless=True)
            test_b.close()
            chosen_channel = "chrome"
            print("[AuthLauncher] Using system Google Chrome channel for seamless SSO.")
        except Exception:
            chosen_channel = None
            print("[AuthLauncher] Using bundled Chromium.")

        launch_kwargs = {
            "user_data_dir": c_dir,
            "headless": False,
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--password-store=basic",
                "--window-size=1280,850",
                "--no-default-browser-check"
            ],
            "ignore_default_args": ["--enable-automation"]
        }
        if chosen_channel:
            launch_kwargs["channel"] = chosen_channel

        browser_context = None
        for attempt in range(3):
            try:
                browser_context = p.chromium.launch_persistent_context(**launch_kwargs)
                break
            except Exception as e:
                print(f"[AuthLauncher] Launch attempt {attempt+1} failed: {e}")
                time.sleep(1)

        if not browser_context:
            print("[AuthLauncher] ERROR: Could not launch browser context.")
            sys.exit(1)

        # Inject stealth anti-detection script to bypass Google bot protections
        browser_context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)

        pages = browser_context.pages
        page = pages[0] if pages else browser_context.new_page()

        try:
            page.goto("https://notebooklm.google.com/", wait_until="commit", timeout=45000)
        except Exception as e:
            print(f"[AuthLauncher] Initial navigation note: {e}")

        print("[AuthLauncher] Browser opened. Monitoring Google sign-in...")
        print("[AuthLauncher] Waiting for user to complete login on https://notebooklm.google.com/ ...")

        auth_saved = False
        max_duration_seconds = 360
        poll_interval = 2.0
        start_time = time.time()

        while (time.time() - start_time) < max_duration_seconds:
            time.sleep(poll_interval)
            try:
                if not browser_context.pages:
                    print("[AuthLauncher] Browser was closed by user.")
                    break

                urls = [p.url or "" for p in browser_context.pages]
                cookies = browser_context.cookies()
                has_google_sid = any(c.get("name") in ("SID", "__Secure-1PSID") for c in cookies)
                has_notebooklm_cookie = any(c.get("name") in ("OSID", "__Secure-1PSIDTS") for c in cookies)
                url_is_notebooklm = any("notebooklm.google.com" in u for u in urls)

                if has_google_sid and (has_notebooklm_cookie or url_is_notebooklm):
                    print(f"[AuthLauncher] Login detected! Current URLs: {urls}")
                    time.sleep(2.5)

                    raw_state = browser_context.storage_state()
                    filtered = filter_storage_state_cookies_by_domain_policy(dict(raw_state))
                    healed, heal_err = heal_captured_state(filtered)
                    
                    # 1. Save to local profile directory
                    replace_captured_profile(
                        Path(local_storage_dest),
                        healed,
                        carry_account=False,
                        include_domains=None
                    )
                    print(f"[AuthLauncher] Saved local storage state to {local_storage_dest}")

                    # 2. Save to ~/.notebooklm/profiles/<nb_profile>/
                    if system_profile_dest:
                        replace_captured_profile(
                            Path(system_profile_dest),
                            healed,
                            carry_account=False,
                            include_domains=None
                        )
                        print(f"[AuthLauncher] Saved system profile storage state to {system_profile_dest}")

                    # 3. Resolve email
                    email = None
                    try:
                        nb_page = next((p for p in browser_context.pages if "notebooklm.google.com" in (p.url or "")), browser_context.pages[0])
                        page_html = nb_page.content()
                        from notebooklm._app.profile import repair_playwright_account, ProfileRepairRequest
                        req = ProfileRepairRequest(storage_path=Path(local_storage_dest), page_html=page_html)
                        outcome = asyncio.run(repair_playwright_account(req))
                        if outcome and outcome.email:
                            email = outcome.email
                    except Exception as rep_err:
                        print(f"[AuthLauncher] Account repair note: {rep_err}")

                    if not email:
                        try:
                            from notebooklm import NotebookLMClient
                            async def fetch_email():
                                async with NotebookLMClient.from_storage(local_storage_dest, profile=nb_profile) as client:
                                    return await client.get_account_email()
                            email = asyncio.run(fetch_email())
                        except Exception as email_err:
                            print(f"[AuthLauncher] Note resolving email: {email_err}")

                    if email:
                        for target_dest in [local_storage_dest, system_profile_dest]:
                            if target_dest and os.path.exists(target_dest):
                                try:
                                    with open(target_dest, "r", encoding="utf-8") as rf:
                                        s_data = json.load(rf)
                                    ns = s_data.get("notebooklm") or {}
                                    ns["version"] = 1
                                    ns["account"] = {"authuser": 0, "email": email}
                                    s_data["notebooklm"] = ns
                                    with open(target_dest, "w", encoding="utf-8") as wf:
                                        json.dump(s_data, wf, indent=2)
                                except Exception:
                                    pass
                        print(f"[AuthLauncher] Verified and saved session for: {email}")

                    auth_saved = True
                    break

            except Exception as loop_err:
                if "Target closed" in str(loop_err) or "browser has been closed" in str(loop_err):
                    print("[AuthLauncher] Browser closed.")
                    break
                print(f"[AuthLauncher] Monitoring loop warning: {loop_err}")

        try:
            browser_context.close()
        except Exception:
            pass

        if auth_saved:
            print("[AuthLauncher] Authentication completed successfully.")
            sys.exit(0)
        else:
            print("[AuthLauncher] Authentication timed out or closed before completion.")
            sys.exit(1)

if __name__ == "__main__":
    p_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    p_name = sys.argv[2] if len(sys.argv) > 2 else f"homefinance_p{p_id}"
    launch_auth(p_id, p_name)
