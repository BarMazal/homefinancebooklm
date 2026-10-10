import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from './components/Navigation';
import DashboardView from './components/DashboardView';
import ReceiptsView from './components/ReceiptsView';
import AccountsView from './components/AccountsView';
import SavingsXirrView from './components/SavingsXirrView';
import PensionsInsuranceView from './components/PensionsInsuranceView';
import RealEstateSimulatorView from './components/RealEstateSimulatorView';
import SettingsView from './components/SettingsView';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notebookLmConnected, setNotebookLmConnected] = useState(true);
  const [fxRate, setFxRate] = useState(3.65);
  const [retroPreviewActive, setRetroPreviewActive] = useState(false);
  const [retroData, setRetroData] = useState(null);

  // Profiles State
  const [profiles, setProfiles] = useState([
    { id: 1, name: 'Demo Profile (Sample Data)', is_active: true },
    { id: 2, name: 'Personal Household (Clean Slate)', is_active: false }
  ]);
  const [activeProfile, setActiveProfile] = useState({ id: 1, name: 'Demo Profile (Sample Data)' });

  useEffect(() => {
    // Fetch live USD/ILS rate from FastAPI backend
    axios.get('http://127.0.0.1:8000/api/xirr/fx-rate')
      .then(res => setFxRate(res.data.rate))
      .catch(() => setFxRate(3.65));

    // Check NotebookLM chromium status
    axios.get('http://127.0.0.1:8000/api/notebooklm/status')
      .then(res => setNotebookLmConnected(res.data.authenticated))
      .catch(() => setNotebookLmConnected(true));

    // Fetch Profiles
    axios.get('http://127.0.0.1:8000/api/profiles')
      .then(res => {
        setProfiles(res.data);
        const active = res.data.find(p => p.is_active) || res.data[0];
        setActiveProfile(active);
      })
      .catch(() => {});
  }, []);

  const handleSwitchProfile = (profileId) => {
    const target = profiles.find(p => p.id === profileId);
    if (!target) return;
    setActiveProfile(target);

    // Call API activate profile
    axios.post(`http://127.0.0.1:8000/api/profiles/${profileId}/activate`)
      .catch(() => {});
  };

  const handleCreateProfile = (name) => {
    axios.post('http://127.0.0.1:8000/api/profiles', { name })
      .then(res => {
        setProfiles(prev => [...prev, res.data]);
        handleSwitchProfile(res.data.id);
      })
      .catch(() => {});
  };

  const isCleanProfile = activeProfile?.id === 2;

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView fxRate={fxRate} retroPreviewActive={retroPreviewActive} retroData={retroData} isCleanProfile={isCleanProfile} />;
      case 'receipts':
        return <ReceiptsView isCleanProfile={isCleanProfile} />;
      case 'accounts':
        return <AccountsView isCleanProfile={isCleanProfile} />;
      case 'savings':
        return <SavingsXirrView fxRate={fxRate} isCleanProfile={isCleanProfile} />;
      case 'pensions':
        return <PensionsInsuranceView isCleanProfile={isCleanProfile} />;
      case 'realestate':
      case 'simulator':
        return <RealEstateSimulatorView isCleanProfile={isCleanProfile} />;
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
        return <DashboardView fxRate={fxRate} retroPreviewActive={retroPreviewActive} retroData={retroData} isCleanProfile={isCleanProfile} />;
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
