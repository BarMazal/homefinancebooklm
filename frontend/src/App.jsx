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

  useEffect(() => {
    // Fetch live USD/ILS rate from FastAPI backend
    axios.get('http://127.0.0.1:8000/api/xirr/fx-rate')
      .then(res => setFxRate(res.data.rate))
      .catch(() => setFxRate(3.65));

    // Check NotebookLM chromium status
    axios.get('http://127.0.0.1:8000/api/notebooklm/status')
      .then(res => setNotebookLmConnected(res.data.authenticated))
      .catch(() => setNotebookLmConnected(true));
  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView fxRate={fxRate} retroPreviewActive={retroPreviewActive} retroData={retroData} />;
      case 'receipts':
        return <ReceiptsView />;
      case 'accounts':
        return <AccountsView />;
      case 'savings':
        return <SavingsXirrView fxRate={fxRate} />;
      case 'pensions':
        return <PensionsInsuranceView />;
      case 'realestate':
      case 'simulator':
        return <RealEstateSimulatorView />;
      case 'settings':
        return <SettingsView 
                 notebookLmConnected={notebookLmConnected} 
                 setNotebookLmConnected={setNotebookLmConnected}
                 retroPreviewActive={retroPreviewActive}
                 setRetroPreviewActive={setRetroPreviewActive}
                 retroData={retroData}
                 setRetroData={setRetroData}
               />;
      default:
        return <DashboardView fxRate={fxRate} retroPreviewActive={retroPreviewActive} retroData={retroData} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        notebookLmConnected={notebookLmConnected} 
      />
      <main style={{ flex: 1, overflowY: 'auto', maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {retroPreviewActive && (
          <div style={{
            background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
            color: 'white',
            padding: '0.65rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={16} />
              <span>RETRO PREVIEW MODE: Viewing Merged NotebookLM History ({retroData?.total_extracted || 5} Extracted Items, {retroData?.conflicts_detected || 1} Conflict Flagged) — Uncommitted</span>
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
