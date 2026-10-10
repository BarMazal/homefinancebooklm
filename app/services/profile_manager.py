import os
import json
from typing import Dict, Any, List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
PROFILES_FILE = os.path.join(DATA_DIR, "profiles.json")

os.makedirs(DATA_DIR, exist_ok=True)

DEFAULT_PROFILES = [
    {"id": 1, "name": "Demo Profile (Sample Data)", "is_active": True},
    {"id": 2, "name": "Personal Household (Clean Slate)", "is_active": False}
]

DEFAULT_SETTINGS = {
    "theme": "dark",
    "chart_type": "donut",
    "dashboard_cards": ["net_worth", "savings", "expenses", "xirr", "expense_cuts", "cashflow", "upload_matrix"],
    "notebooklm_notebook_id": "",
    "telegram_bot_token": "",
    "telegram_chat_id": "",
    "smtp_host": "smtp.gmail.com",
    "smtp_user": ""
}

class ProfileManager:
    def __init__(self):
        self._ensure_profiles_json()

    def _ensure_profiles_json(self):
        if not os.path.exists(PROFILES_FILE):
            with open(PROFILES_FILE, "w", encoding="utf-8") as f:
                json.dump({"active_profile_id": 1, "profiles": DEFAULT_PROFILES}, f, indent=2)
            
            # Ensure profile directories exist
            for p in DEFAULT_PROFILES:
                self.get_profile_dir(p["id"])

    def get_profiles_data((self)) -> Dict[str, Any]:
        self._ensure_profiles_json()
        try:
            with open(PROFILES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"active_profile_id": 1, "profiles": DEFAULT_PROFILES}

    def save_profiles_data(self, data: Dict[str, Any]):
        with open(PROFILES_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_active_profile_id(self) -> int:
        data = self.get_profiles_data()
        return data.get("active_profile_id", 1)

    def set_active_profile_id(self, profile_id: int):
        data = self.get_profiles_data()
        data["active_profile_id"] = profile_id
        for p in data.get("profiles", []):
            p["is_active"] = (p["id"] == profile_id)
        self.save_profiles_data(data)
        self.get_profile_dir(profile_id) # ensure dir exists

    def get_profile_dir(self, profile_id: int) -> str:
        p_dir = os.path.join(DATA_DIR, f"profile_{profile_id}")
        os.makedirs(p_dir, exist_ok=True)
        os.makedirs(os.path.join(p_dir, "uploads"), exist_ok=True)
        return p_dir

    def get_profile_db_path(self, profile_id: int) -> str:
        p_dir = self.get_profile_dir(profile_id)
        return os.path.join(p_dir, "homefinance.db")

    def get_profile_chromium_dir(self, profile_id: int) -> str:
        c_dir = os.path.join(BASE_DIR, f".chromium_profile_{profile_id}")
        os.makedirs(c_dir, exist_ok=True)
        return c_dir

    def get_profile_settings_path(self, profile_id: int) -> str:
        p_dir = self.get_profile_dir(profile_id)
        return os.path.join(p_dir, "settings.json")

    def load_profile_settings(self, profile_id: int) -> Dict[str, Any]:
        s_path = self.get_profile_settings_path(profile_id)
        if not os.path.exists(s_path):
            self.save_profile_settings(profile_id, DEFAULT_SETTINGS)
            return DEFAULT_SETTINGS.copy()
        try:
            with open(s_path, "r", encoding="utf-8") as f:
                return {**DEFAULT_SETTINGS, **json.load(f)}
        except Exception:
            return DEFAULT_SETTINGS.copy()

    def save_profile_settings(self, profile_id: int, settings: Dict[str, Any]):
        s_path = self.get_profile_settings_path(profile_id)
        with open(s_path, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)

    def check_notebook_id_sharing(self, profile_id: int, notebook_id: str) -> Dict[str, Any]:
        """
        Verifies if a NotebookLM notebook ID is already linked to another profile.
        Returns warning notification if shared.
        """
        if not notebook_id or not notebook_id.strip():
            return {"is_shared": False}

        notebook_id_clean = notebook_id.strip()
        data = self.get_profiles_data()

        for p in data.get("profiles", []):
            if p["id"] != profile_id:
                other_settings = self.load_profile_settings(p["id"])
                other_nb = other_settings.get("notebooklm_notebook_id", "").strip()
                if other_nb and other_nb == notebook_id_clean:
                    return {
                        "is_shared": True,
                        "conflict_profile_name": p["name"],
                        "message": f"Warning: NotebookLM notebooks cannot be shared between profiles. Notebook '{notebook_id_clean}' is already linked to profile '{p['name']}'. Please duplicate your notebook manually in NotebookLM (https://notebooklm.google.com) for this profile."
                    }

        return {"is_shared": False}

profile_manager = ProfileManager()
