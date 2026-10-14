import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from './components/Navigation';
import DashboardView from './components/DashboardView';
import ExpensesView from './components/ExpensesView';
import InvestmentsView from './components/InvestmentsView';
import PensionsInsuranceView from './components/PensionsInsuranceView';
import RealEstateView from './components/RealEstateView';
import RemindersView from './components/RemindersView';
import SimulatorView from './components/SimulatorView';
import ReceiptsView from './components/ReceiptsView';
import SettingsView from './components/SettingsView';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8910';

const STORAGE_PROFILES_KEY = 'hf_profiles_list';
const STORAGE_ACTIVE_PROFILE_KEY = 'hf_active_profile';

const getStoredProfiles = () => {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [
    { id: 1, name: 'Demo Profile (Sample Data)', is_active: true },
    { id: 2, name: 'Personal Household (Clean Slate)', is_active: false }
  ];
};

const getStoredActiveProfile = (initialProfiles) => {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        const found = initialProfiles.find(p => p.id === parsed.id);
        return found || parsed;
      }
    }
  } catch (e) {}
  return initialProfiles.find(p => p.is_active) || initialProfiles[0];
};

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [notebookLmConnected, setNotebookLmConnected] = useState(true);
  const [fxRate, setFxRate] = useState(3.65);
  const [retroPreviewActive, setRetroPreviewActive] = useState(false);
  const [retroData, setRetroData] = useState(null);

  // Profiles State with LocalStorage Persistence
  const [profiles, setProfiles] = useState(getStoredProfiles);
  const [activeProfile, setActiveProfile] = useState(() => {
    const p = getStoredProfiles();
    return getStoredActiveProfile(p);
  });

  // Ensure default axios header carries active profile immediately on render
  if (activeProfile?.id) {
    axios.defaults.headers.common['X-Profile-Id'] = activeProfile.id;
  }

  useEffect(() => {
    if (activeProfile?.id) {
      axios.defaults.headers.common['X-Profile-Id'] = activeProfile.id;
      localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, JSON.stringify(activeProfile));
    }
  }, [activeProfile]);

  useEffect(() => {
    // 1. Fetch live USD/ILS rate from FastAPI backend
    axios.get(`${API_BASE}/api/xirr/fx-rate`)
      .then(res => setFxRate(res.data.rate))
      .catch(() => setFxRate(3.65));

    // 2. Fetch Profiles from server immediately to align state
    axios.get(`${API_BASE}/api/profiles`)
      .then(res => {
        const serverProfiles = res.data;
        if (serverProfiles && serverProfiles.length > 0) {
          setProfiles(serverProfiles);
          localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(serverProfiles));

          // Resolve active profile:
          let target = null;
          try {
            const savedRaw = localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY);
            if (savedRaw) {
              const savedObj = JSON.parse(savedRaw);
              target = serverProfiles.find(p => p.id === savedObj.id);
            }
          } catch (e) {}

          // Fallback to server active profile if not set or found in list
          if (!target) {
            target = serverProfiles.find(p => p.is_active) || serverProfiles[0];
          }

          setActiveProfile(target);
          localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, JSON.stringify(target));
          axios.defaults.headers.common['X-Profile-Id'] = target.id;

          // If local choice differs from backend active profile, align backend
          if (!target.is_active) {
            axios.post(`${API_BASE}/api/profiles/${target.id}/activate`).catch(() => {});
          }
        }
      })
      .catch(err => console.error('Failed to load profiles:', err));

    // 3. Check NotebookLM status
    axios.get(`${API_BASE}/api/notebooklm/status`)
      .then(res => setNotebookLmConnected(res.data.authenticated))
      .catch(() => setNotebookLmConnected(true));
  }, []);

  const handleSwitchProfile = (profileId) => {
    try {
      const target = profiles.find(p => p.id === profileId) || { id: profileId, name: `Profile #${profileId}` };
      // 1. Instantly update activeProfile, localStorage, and axios header
      setActiveProfile(target);
      localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, JSON.stringify(target));
      axios.defaults.headers.common['X-Profile-Id'] = target.id;

      // 2. Instantly update profiles list with is_active flag in state & localStorage
      const updatedProfiles = profiles.map(p => ({
        ...p,
        is_active: p.id === profileId
      }));
      setProfiles(updatedProfiles);
      localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(updatedProfiles));

      // 3. Fire backend activation in background (non-blocking)
      axios.post(`${API_BASE}/api/profiles/${profileId}/activate`).catch(err => {
        console.error('Failed to activate profile on backend:', err);
      });
    } catch (err) {
      console.error('Failed to switch profile:', err);
    }
  };

  const handleCreateProfile = async (name) => {
    try {
      const res = await axios.post(`${API_BASE}/api/profiles`, { name });
      const newProfile = res.data;
      await axios.post(`${API_BASE}/api/profiles/${newProfile.id}/activate`);
      const listRes = await axios.get(`${API_BASE}/api/profiles`);
      setProfiles(listRes.data);
      localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(listRes.data));
      const active = listRes.data.find(p => p.id === newProfile.id) || newProfile;
      setActiveProfile(active);
      localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, JSON.stringify(active));
      axios.defaults.headers.common['X-Profile-Id'] = active.id;
    } catch (err) {
      console.error('Failed to create profile:', err);
      alert('Failed to create profile: ' + (err.response?.data?.detail || err.message));
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardView fxRate={fxRate} activeProfileId={activeProfile?.id} activeProfileName={activeProfile?.name} />;
      case 'expenses':
        return <ExpensesView activeProfileId={activeProfile?.id} />;
      case 'receipts':
        return <ReceiptsView activeProfileId={activeProfile?.id} />;
      case 'investments':
        return <InvestmentsView fxRate={fxRate} activeProfileId={activeProfile?.id} />;
      case 'pensions':
        return <PensionsInsuranceView activeProfileId={activeProfile?.id} />;
      case 'realestate':
        return <RealEstateView activeProfileId={activeProfile?.id} />;
      case 'reminders':
        return <RemindersView />;
      case 'simulator':
        return <SimulatorView />;
      case 'settings':
        return <SettingsView 
                 notebookLmConnected={notebookLmConnected} 
                 setNotebookLmConnected={setNotebookLmConnected}
                 retroPreviewActive={retroPreviewActive}
                 setRetroPreviewActive={setRetroPreviewActive}
                 retroData={retroData}
                 setRetroData={setRetroData}
                 profiles={profiles}
                 activeProfile={activeProfile}
                 onSwitchProfile={handleSwitchProfile}
                 onCreateProfile={handleCreateProfile}
               />;
      default:
        return <DashboardView fxRate={fxRate} activeProfileId={activeProfile?.id} activeProfileName={activeProfile?.name} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        notebookLmConnected={notebookLmConnected}
        profiles={profiles}
        activeProfile={activeProfile}
        onSwitchProfile={handleSwitchProfile}
        onCreateProfile={handleCreateProfile}
      />
      <main style={{ flex: 1, overflowY: 'auto', maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {retroPreviewActive && (
          <div style={{
            background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
            color: 'white',
            padding: '0.65rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={16} />
              <span>RETRO PREVIEW MODE: Viewing Merged NotebookLM History into "{activeProfile?.name}" ({retroData?.total_extracted || 5} Items) — Uncommitted</span>
            </div>
            <button 
              onClick={() => setActiveTab('settings')}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              Go to Settings to Approve / Discard
            </button>
          </div>
        )}
        {renderActiveView()}
      </main>
    </div>
  );
}
