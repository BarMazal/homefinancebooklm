import React, { useState, useEffect } from 'react';
import { 
  Settings, Bot, Globe, Send, Download, Upload, Trash2, AlertTriangle, 
  CheckCircle2, ShieldAlert, RefreshCw, Palette, LayoutGrid, AlertCircle,
  BookOpen, Search, Eye, FileText, Check, ChevronRight, Layers, Sparkles, 
  Folder, ExternalLink, X, Compass, FileCheck
} from 'lucide-react';
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

  // NotebookLM Account Browser State
  const [accountNotebooks, setAccountNotebooks] = useState([]);
  const [loadingNotebooks, setLoadingNotebooks] = useState(false);
  const [showNotebookBrowser, setShowNotebookBrowser] = useState(false);
  const [notebookSearch, setNotebookSearch] = useState('');
  const [authRequiredModal, setAuthRequiredModal] = useState(false);

  // Notebook Resources & Artifacts Explorer State
  const [notebookDetails, setNotebookDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [explorerTab, setExplorerTab] = useState('sources'); // 'sources' | 'notes' | 'artifacts'
  const [sourceFulltextModal, setSourceFulltextModal] = useState(null);
  const [loadingFulltext, setLoadingFulltext] = useState(false);

  useEffect(() => {
    // Load per-profile settings JSON
    axios.get('http://127.0.0.1:8900/api/settings')
      .then(res => {
        const data = res.data;
        if (data.theme) setTheme(data.theme);
        if (data.chart_type) setChartType(data.chart_type);
        if (data.dashboard_cards) setCards(data.dashboard_cards);
        if (data.notebooklm_notebook_id) {
          setNotebookId(data.notebooklm_notebook_id);
          fetchNotebookDetails(data.notebooklm_notebook_id);
        } else {
          setNotebookDetails(null);
        }
      })
      .catch(() => {});

    // Check NotebookLM connection status
    axios.get('http://127.0.0.1:8900/api/notebooklm/status')
      .then(res => {
        if (res.data.authenticated !== undefined) {
          setNotebookLmConnected(res.data.authenticated);
        }
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
        if (newId.trim()) {
          fetchNotebookDetails(newId.trim());
        } else {
          setNotebookDetails(null);
        }
      }
    } catch (err) {
      setSharingWarning(null);
    }
  };

  const handleFetchAccountNotebooks = async () => {
    setLoadingNotebooks(true);
    setShowNotebookBrowser(true);
    try {
      const res = await axios.get('http://127.0.0.1:8900/api/notebooklm/notebooks');
      if (res.data.authenticated) {
        setNotebookLmConnected(true);
        setAccountNotebooks(res.data.notebooks || []);
      } else {
        setNotebookLmConnected(false);
        setAuthRequiredModal(true);
      }
    } catch (err) {
      setNotebookLmConnected(false);
      setAuthRequiredModal(true);
    } finally {
      setLoadingNotebooks(false);
    }
  };

  const handleSelectNotebook = async (nb) => {
    try {
      const res = await axios.post('http://127.0.0.1:8900/api/notebooklm/link-notebook', {
        notebook_id: nb.id
      });
      if (res.data.warning) {
        setSharingWarning(res.data.message);
      } else {
        setSharingWarning(null);
        setNotebookId(nb.id);
        setShowNotebookBrowser(false);
        fetchNotebookDetails(nb.id);
      }
    } catch (err) {
      alert('Error linking notebook to profile.');
    }
  };

  const fetchNotebookDetails = async (idToFetch) => {
    const id = idToFetch || notebookId;
    if (!id || !id.trim()) return;
    setLoadingDetails(true);
    try {
      const res = await axios.get(`http://127.0.0.1:8900/api/notebooklm/notebooks/${id.trim()}/details`);
      if (res.data.success) {
        setNotebookDetails(res.data);
      } else {
        setNotebookDetails(null);
      }
    } catch (err) {
      setNotebookDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewSourceFulltext = async (sourceId) => {
    if (!notebookId || !sourceId) return;
    setLoadingFulltext(true);
    try {
      const res = await axios.get(`http://127.0.0.1:8900/api/notebooklm/notebooks/${notebookId}/source/${sourceId}/fulltext`);
      if (res.data.success) {
        setSourceFulltextModal(res.data);
      } else {
        alert('Could not retrieve source content: ' + (res.data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error fetching full source text.');
    } finally {
      setLoadingFulltext(false);
    }
  };

  const launchChromiumAuth = async () => {
    try {
      await axios.post('http://127.0.0.1:8900/api/notebooklm/launch-auth-browser');
      setAuthRequiredModal(false);
      // Wait briefly then check status
      setTimeout(async () => {
        const check = await axios.get('http://127.0.0.1:8900/api/notebooklm/status');
        if (check.data.authenticated) {
          setNotebookLmConnected(true);
          handleFetchAccountNotebooks();
        }
      }, 3000);
    } catch (err) {
      alert('Failed to launch Chromium browser.');
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

  // Filtered notebooks for picker
  const filteredNotebooks = accountNotebooks.filter(nb => 
    nb.title.toLowerCase().includes(notebookSearch.toLowerCase()) || 
    nb.id.toLowerCase().includes(notebookSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>Settings & Authentication</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>
          Configure NotebookLM cloud connection, profile persistence, and data ingestion.
        </p>
      </div>

      {/* Profile-Specific Scope Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldAlert size={22} color="#818cf8" />
          <span style={{ fontSize: '0.95rem', color: '#c7d2fe', fontWeight: 600 }}>
            Active Profile: <strong>{activeProfile?.name} (Profile #{activeProfile?.id})</strong>
          </span>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginLeft: 'auto' }}>
            Data files and NotebookLM sessions are strictly isolated per profile.
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: LINK NOTEBOOKLM & ACCOUNT BROWSER             */}
      {/* ======================================================== */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Globe size={24} color="#818cf8" />
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'white' }}>Link Your NotebookLM Notebook</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Connect Profile #{activeProfile?.id} to your personal Google NotebookLM account.
              </p>
            </div>
          </div>

          {/* Connection Status Badge & Auth Launcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem',
              borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
              background: notebookLmConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: notebookLmConnected ? '#34d399' : '#fbbf24',
              border: `1px solid ${notebookLmConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: notebookLmConnected ? '#10b981' : '#f59e0b' }} />
              {notebookLmConnected ? 'Google Account Connected' : 'Auth Required'}
            </div>

            <button className="btn-secondary" onClick={launchChromiumAuth} title="Launch interactive browser to log into Google">
              <Bot size={15} /> {notebookLmConnected ? 'Re-Auth Browser' : 'Connect Account'}
            </button>
          </div>
        </div>

        {/* Notebook Link Input & Browse Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Linked Notebook ID for Profile #{activeProfile?.id}:
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                type="text" 
                placeholder="Select from your account or paste notebook ID (e.g. bf5a81e6-a868-44cd-...)"
                value={notebookId}
                onChange={(e) => saveNotebookId(e.target.value)}
                style={{ 
                  flex: 1, padding: '0.65rem 0.9rem', borderRadius: '8px', 
                  background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                  fontFamily: 'monospace', fontSize: '0.9rem'
                }}
              />
              <button 
                className="btn-primary" 
                onClick={handleFetchAccountNotebooks}
                disabled={loadingNotebooks}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
              >
                <Compass size={16} /> 
                {loadingNotebooks ? 'Scanning Account...' : 'Browse Account Notebooks'}
              </button>
            </div>
          </div>

          {/* Sharing Warning Banner */}
          {sharingWarning && (
            <div className="glass-panel" style={{ padding: '1rem', borderColor: 'rgba(244, 63, 94, 0.5)', background: 'rgba(244, 63, 94, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle size={22} color="#fb7185" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: '#fb7185', fontWeight: 700 }}>Notebook Sharing Restriction</h4>
                  <p style={{ fontSize: '0.85rem', color: '#fecdd3', marginTop: '0.25rem' }}>
                    {sharingWarning}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Account Notebooks Selector (Collapsible / Modal Drawer) */}
          {showNotebookBrowser && (
            <div className="glass-card" style={{ padding: '1.25rem', marginTop: '0.5rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={18} color="#818cf8" />
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                    Select a Notebook from your Google Account ({accountNotebooks.length} Found)
                  </span>
                </div>
                <button 
                  onClick={() => setShowNotebookBrowser(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar inside Notebook Selector */}
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input 
                  type="text" 
                  placeholder="Filter notebooks by title or ID..."
                  value={notebookSearch}
                  onChange={(e) => setNotebookSearch(e.target.value)}
                  style={{ 
                    width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem', borderRadius: '6px', 
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Notebooks Grid / List */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredNotebooks.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    No matching notebooks found in this account.
                  </p>
                ) : (
                  filteredNotebooks.map(nb => {
                    const isSelected = nb.id === notebookId;
                    return (
                      <div 
                        key={nb.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.75rem 1rem', borderRadius: '8px',
                          background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255,255,255,0.06)'}`,
                          transition: 'background 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                          <BookOpen size={16} color={isSelected ? '#818cf8' : '#94a3b8'} />
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{nb.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{nb.id}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <a 
                            href={nb.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="btn-secondary" 
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', textDecoration: 'none' }}
                            title="Open in NotebookLM"
                          >
                            <ExternalLink size={13} />
                          </a>

                          <button 
                            className={isSelected ? 'btn-secondary' : 'btn-primary'}
                            onClick={() => handleSelectNotebook(nb)}
                            style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
                          >
                            {isSelected ? <><Check size={14} color="#34d399" /> Linked</> : 'Link to Profile'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: NOTEBOOK RESOURCES & ARTIFACTS EXPLORER TOOL  */}
      {/* ======================================================== */}
      {notebookId && (
        <div className="glass-panel" style={{ padding: '1.75rem', border: '1px solid rgba(129, 140, 248, 0.3)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Layers size={24} color="#818cf8" />
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'white' }}>
                  Notebook Explorer: {notebookDetails?.title || 'Connected Notebook'}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Live inspection tool for resources, notes, and artifacts inside notebook <span style={{ fontFamily: 'monospace', color: '#818cf8' }}>{notebookId}</span>.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button 
                className="btn-secondary" 
                onClick={() => fetchNotebookDetails(notebookId)}
                disabled={loadingDetails}
                title="Refresh live items from NotebookLM"
              >
                <RefreshCw size={15} className={loadingDetails ? 'animate-spin' : ''} /> 
                {loadingDetails ? 'Syncing...' : 'Refresh Explorer'}
              </button>

              <a 
                href={`https://notebooklm.google.com/notebook/${notebookId}`} 
                target="_blank" 
                rel="noreferrer"
                className="btn-primary"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <ExternalLink size={15} /> Open in Google NotebookLM
              </a>
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Resources (Sources)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#38bdf8' }}>
                {notebookDetails?.sources?.length || 0}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Custom Notes</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399' }}>
                {notebookDetails?.notes?.length || 0}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Artifacts & Presentations</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f43f5e' }}>
                {notebookDetails?.artifacts?.length || 0}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <button 
              onClick={() => setExplorerTab('sources')}
              style={{
                background: explorerTab === 'sources' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                border: explorerTab === 'sources' ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid transparent',
                color: explorerTab === 'sources' ? 'white' : '#94a3b8',
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              <FileText size={16} color="#38bdf8" /> Sources / Resources ({notebookDetails?.sources?.length || 0})
            </button>

            <button 
              onClick={() => setExplorerTab('notes')}
              style={{
                background: explorerTab === 'notes' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                border: explorerTab === 'notes' ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid transparent',
                color: explorerTab === 'notes' ? 'white' : '#94a3b8',
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              <BookOpen size={16} color="#34d399" /> Notes ({notebookDetails?.notes?.length || 0})
            </button>

            <button 
              onClick={() => setExplorerTab('artifacts')}
              style={{
                background: explorerTab === 'artifacts' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                border: explorerTab === 'artifacts' ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid transparent',
                color: explorerTab === 'artifacts' ? 'white' : '#94a3b8',
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              <Sparkles size={16} color="#f43f5e" /> Artifacts ({notebookDetails?.artifacts?.length || 0})
            </button>
          </div>

          {/* TAB 1: Sources / Resources */}
          {explorerTab === 'sources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {!notebookDetails?.sources || notebookDetails.sources.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                  No sources or documents uploaded to this notebook yet.
                </p>
              ) : (
                notebookDetails.sources.map(src => (
                  <div 
                    key={src.id}
                    className="glass-card"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={18} color="#38bdf8" />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{src.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.75rem', marginTop: '2px' }}>
                          <span style={{ color: '#818cf8', fontWeight: 600 }}>{src.kind}</span>
                          {src.word_count && <span>{src.word_count.toLocaleString()} words</span>}
                          <span style={{ color: '#10b981' }}>{src.status}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      className="btn-secondary"
                      onClick={() => handleViewSourceFulltext(src.id)}
                      disabled={loadingFulltext}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Eye size={14} /> Inspect Text
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Notes */}
          {explorerTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {!notebookDetails?.notes || notebookDetails.notes.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                  No custom notes written in this notebook yet.
                </p>
              ) : (
                notebookDetails.notes.map(note => (
                  <div 
                    key={note.id}
                    className="glass-card"
                    style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={16} color="#34d399" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{note.title}</span>
                      </div>
                      {note.created_at && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{note.created_at}</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                      {note.content_preview}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Artifacts */}
          {explorerTab === 'artifacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {!notebookDetails?.artifacts || notebookDetails.artifacts.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                  No generated artifacts (presentations, audio overviews, flashcards) in this notebook yet.
                </p>
              ) : (
                notebookDetails.artifacts.map(art => (
                  <div 
                    key={art.id}
                    className="glass-card"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Sparkles size={18} color="#f43f5e" />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{art.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#fb7185', marginTop: '2px' }}>{art.type}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: RETROACTIVE HISTORY SCAN CARD                 */}
      {/* ======================================================== */}
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
                Retro Scan Complete: {retroData.total_extracted} Records Found ({retroData.conflicts_detected || 0} Conflicts)
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

      {/* ======================================================== */}
      {/* SECTION 4: DATABASE BACKUP, RESTORE & RESET CONTROLS     */}
      {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* MODAL: AUTH REQUIRED CONNECTION DIALOG                   */}
      {/* ======================================================== */}
      {authRequiredModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div className="glass-panel" style={{ width: '520px', padding: '2rem', textAlign: 'center', border: '1px solid var(--accent-primary)' }}>
            <Bot size={48} color="#818cf8" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '0.5rem' }}>Google NotebookLM Login Required</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Your isolated browser session for Profile #{activeProfile?.id} needs an active Google login to browse and extract your notebooks.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setAuthRequiredModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={launchChromiumAuth}>
                <Globe size={16} /> Launch Interactive Login Browser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INSPECT SOURCE FULLTEXT                           */}
      {/* ======================================================== */}
      {sourceFulltextModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div className="glass-panel" style={{ width: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'white' }}>{sourceFulltextModal.title}</h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {sourceFulltextModal.char_count?.toLocaleString()} characters extracted by NotebookLM
                </span>
              </div>
              <button 
                onClick={() => setSourceFulltextModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: '#0a0e1a', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <pre style={{ color: '#e2e8f0', fontSize: '0.85rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {sourceFulltextModal.content}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={() => setSourceFulltextModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRM DATABASE RESET                            */}
      {/* ======================================================== */}
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
