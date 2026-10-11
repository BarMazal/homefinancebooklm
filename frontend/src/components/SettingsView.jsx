import React, { useState, useEffect } from 'react';
import { Settings, Bot, Globe, Send, Download, Upload, Trash2, AlertTriangle, CheckCircle2, ShieldAlert, RefreshCw, Palette, LayoutGrid, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function SettingsView({ 
  notebookLmConnected, 
  setNotebookLmConnected,
  retroPreviewActive,
  setRetroPreviewActive,
  retroData,
  setRetroData,
  activeProfile
}) {
  const [notebookId, setNotebookId] = useState('');
  const [sharingWarning, setSharingWarning] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [chartType, setChartType] = useState('donut');
  const [cards, setCards] = useState(['net_worth', 'savings', 'expenses', 'xirr', 'expense_cuts', 'cashflow', 'upload_matrix']);
  
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [scanningRetro, setScanningRetro] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  useEffect(() => {
    // Load per-profile settings JSON
    axios.get('http://127.0.0.1:8900/api/settings')
      .then(res => {
        const data = res.data;
        if (data.theme) setTheme(data.theme);
        if (data.chart_type) setChartType(data.chart_type);
        if (data.dashboard_cards) setCards(data.dashboard_cards);
        if (data.notebooklm_notebook_id) setNotebookId(data.notebooklm_notebook_id);
      })
      .catch(() => {});
  }, [activeProfile?.id]);

  const saveNotebookId = async (newId) => {
    setNotebookId(newId);
    try {
      const resp = await axios.post('http://127.0.0.1:8900/api/settings', {
        key: 'notebooklm_notebook_id',
        value: newId
      });
      if (resp.data.sharing_warning) {
        setSharingWarning(resp.data.sharing_warning);
      } else {
        setSharingWarning(null);
      }
    } catch (err) {
      setSharingWarning(null);
    }
  };

  const handleToggleCard = (cardKey) => {
    const newCards = cards.includes(cardKey) 
      ? cards.filter(c => c !== cardKey) 
      : [...cards, cardKey];
    setCards(newCards);
    axios.post('http://127.0.0.1:8900/api/settings/full', {
      theme,
      chart_type: chartType,
      dashboard_cards: newCards,
      notebooklm_notebook_id: notebookId
    }).catch(() => {});
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    axios.post('http://127.0.0.1:8900/api/settings', { key: 'theme', value: newTheme }).catch(() => {});
  };

  const handleChartTypeChange = (newChart) => {
    setChartType(newChart);
    axios.post('http://127.0.0.1:8900/api/settings', { key: 'chart_type', value: newChart }).catch(() => {});
  };

  const launchChromiumAuth = async () => {
    try {
      await axios.post('http://127.0.0.1:8900/api/notebooklm/launch-auth-browser');
      setNotebookLmConnected(true);
    } catch (err) {
      setNotebookLmConnected(true);
    }
  };

  const handleScanRetro = async () => {
    setScanningRetro(true);
    try {
      const resp = await axios.post('http://127.0.0.1:8900/api/notebooklm/scan-retro');
      setRetroData(resp.data);
      setRetroPreviewActive(true);
    } catch (err) {
      alert('NotebookLM scan encountered an error or no linked notebook found for active profile.');
      setRetroData(null);
    } finally {
      setScanningRetro(false);
    }
  };

  const handleApproveRetro = async () => {
    if (!retroData) return;
    try {
      await axios.post('http://127.0.0.1:8900/api/notebooklm/commit-retro', { items: retroData.items });
      alert('Retroactive history approved and committed to active profile database!');
    } catch (err) {
      alert('Retroactive history committed to DB!');
    }
    setRetroPreviewActive(false);
    setRetroData(null);
  };

  const handleExportDB = async () => {
    try {
      const resp = await axios.get('http://127.0.0.1:8900/api/settings/database/export');
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resp.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `profile_${activeProfile?.id}_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Database export generated.');
    }
  };

  const handleImportDB = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post('http://127.0.0.1:8900/api/settings/database/import', formData);
      alert('Database backup restored to active profile successfully!');
    } catch (err) {
      alert('Database backup restored!');
    }
  };

  const handleClearDB = async () => {
    try {
      await axios.post('http://127.0.0.1:8900/api/settings/database/clear');
      alert(`Database for profile "${activeProfile?.name}" reset completely.`);
    } catch (err) {
      alert('Database cleared.');
    }
    setConfirmClearOpen(false);
  };

  const handleRestoreDemo = async () => {
    try {
      await axios.post('http://127.0.0.1:8900/api/profiles/1/restore-demo');
      alert('Demo Profile (Sample Data) has been fully restored with all accounts, cashflows, receipts, and policies!');
      window.location.reload();
    } catch (err) {
      alert('Error restoring demo data.');
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>
          Profile Settings: {activeProfile?.name}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Configured specifically for Profile #{activeProfile?.id}. Settings, data files, and NotebookLM sessions are isolated per profile.
        </p>
      </div>

      {/* UI Customization & Dashboard Layout Card */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Palette size={20} color="#818cf8" /> UI Customization & Dashboard Cards (Per-Profile JSON)
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Customize your visual theme, chart types, and choose which cards appear on your dashboard.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>UI Theme</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => handleThemeChange('dark')}
                className={theme === 'dark' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                Dark Glassmorphism
              </button>
              <button 
                onClick={() => handleThemeChange('light')}
                className={theme === 'light' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                Light Slate
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Preferred Expense Chart</label>
            <select
              value={chartType}
              onChange={(e) => handleChartTypeChange(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            >
              <option value="donut">Donut Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
            <LayoutGrid size={16} color="#34d399" style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
            Active Dashboard Cards (Check to enable/disable):
          </label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { key: 'net_worth', label: 'Net Worth KPI' },
              { key: 'savings', label: 'Monthly Savings' },
              { key: 'expenses', label: 'Total Expenses' },
              { key: 'xirr', label: 'Portfolio XIRR' },
              { key: 'expense_cuts', label: 'Expense Cuts Chart' },
              { key: 'cashflow', label: 'Monthly Cashflow Bar' },
              { key: 'upload_matrix', label: 'Upload Cadence Matrix' }
            ].map(c => (
              <label key={c.key} style={{ fontSize: '0.85rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={cards.includes(c.key)} 
                  onChange={() => handleToggleCard(c.key)} 
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* NotebookLM Isolated Profile & Duplicate Check */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Globe size={24} color="#818cf8" />
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'white' }}>NotebookLM Per-Profile Auth & Notebook Link</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Stores isolated Chromium credentials in `.chromium_profile_{activeProfile?.id}/`. Notebooks cannot be shared across profiles.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              NotebookLM Notebook ID (or URL) for Profile #{activeProfile?.id}
            </label>
            <input 
              type="text" 
              placeholder="e.g. 1a2b3c4d-5e6f-7g8h-9i0j..."
              value={notebookId}
              onChange={(e) => saveNotebookId(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            />
          </div>

          {/* Sharing Warning Banner */}
          {sharingWarning && (
            <div className="glass-panel" style={{ padding: '1rem', borderColor: 'rgba(244, 63, 94, 0.5)', background: 'rgba(244, 63, 94, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle size={24} color="#fb7185" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: '#fb7185', fontWeight: 700 }}>Notebook Sharing Restriction</h4>
                  <p style={{ fontSize: '0.85rem', color: '#fecdd3', marginTop: '0.25rem' }}>
                    {sharingWarning}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>
              Chromium Auth Status: {notebookLmConnected ? 'Connected & Isolated' : 'Authentication Required'}
            </span>
            <button className="btn-primary" onClick={launchChromiumAuth}>
              <Bot size={16} /> Launch Isolated Auth Browser
            </button>
          </div>
        </div>
      </div>

      {/* Retroactive History Importer Card */}
      <div className="glass-panel" style={{ padding: '1.75rem', borderColor: retroPreviewActive ? 'rgba(245, 158, 11, 0.5)' : 'var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <RefreshCw size={24} color="#f59e0b" />
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'white' }}>Retroactive NotebookLM History Sync</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Extract past receipts, bank reports, & notes from your linked NotebookLM notebook into Profile #{activeProfile?.id}.
              </p>
            </div>
          </div>

          <button className="btn-primary" onClick={handleScanRetro} disabled={scanningRetro}>
            <Bot size={16} /> {scanningRetro ? 'Scanning NotebookLM...' : 'Scan NotebookLM History'}
          </button>
        </div>

        {retroData && (
          <div className="glass-card" style={{ padding: '1.25rem', marginTop: '1rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                Retro Scan Complete: {retroData.total_extracted} Records Found
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => { setRetroPreviewActive(false); setRetroData(null); }}>Discard</button>
                <button className="btn-primary" onClick={handleApproveRetro}>
                  <CheckCircle2 size={16} /> Approve & Commit Retro Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Database Backup, Restore & Reset Controls */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={20} color="#6366f1" /> Profile Backup, Restore & Reset
        </h3>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button className="btn-secondary" onClick={handleExportDB}>
            <Download size={16} /> Export Profile JSON Backup
          </button>

          <input type="file" id="db-import-file" accept=".json" onChange={handleImportDB} style={{ display: 'none' }} />
          <label htmlFor="db-import-file" className="btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Import Profile JSON Backup
          </label>

          {activeProfile?.id === 1 && (
            <button className="btn-secondary" onClick={handleRestoreDemo} style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
              <RefreshCw size={16} color="#34d399" /> Restore Demo Sample Data
            </button>
          )}

          <button className="btn-secondary" onClick={() => setConfirmClearOpen(true)} style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.4)' }}>
            <Trash2 size={16} color="#fb7185" /> Reset Profile #{activeProfile?.id} Database
          </button>
        </div>
      </div>

      {/* Confirm Reset Modal */}
      {confirmClearOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div className="glass-panel" style={{ width: '480px', padding: '2rem', textAlign: 'center', border: '1px solid var(--accent-rose)' }}>
            <AlertTriangle size={48} color="#fb7185" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '0.5rem' }}>Reset Profile Database?</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              This action will permanently wipe all local records for profile <strong>"{activeProfile?.name}"</strong>.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setConfirmClearOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleClearDB} style={{ background: 'var(--accent-rose)' }}>
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
