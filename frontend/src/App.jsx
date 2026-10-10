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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notebookLmConnected, setNotebookLmConnected] = useState(true);
  const [fxRate, setFxRate] = useState(3.65);

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
        return <DashboardView fxRate={fxRate} />;
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
               />;
      default:
        return <DashboardView fxRate={fxRate} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        notebookLmConnected={notebookLmConnected} 
      />
      <main style={{ flex: 1, overflowY: 'auto', maxHeight: '100vh' }}>
        {renderActiveView()}
      </main>
    </div>
  );
}
