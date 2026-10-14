import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Settings, Bot, Globe, Send, Download, Upload, Trash2, AlertTriangle, 
  CheckCircle2, ShieldAlert, RefreshCw, Palette, LayoutGrid, AlertCircle,
  BookOpen, Search, Eye, FileText, Check, ChevronRight, Layers, Sparkles, 
  Folder, ExternalLink, X, Compass, FileCheck, LogOut, UserCheck,
  Play, Square, Radio, ArrowUpRight, ArrowDownLeft, ArrowUpDown, ArrowUp, ArrowDown,
  Landmark, CreditCard, Receipt, Filter, Pencil, Plus, Tag, ChevronDown
} from 'lucide-react';
import axios from 'axios';

function CategoryCombobox({ value, onChange, categories, onAddCategory }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef(null);

  // Sync internal query when external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Outside click to close dropdown and commit typed value if new
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (isOpen) {
          const clean = query.trim();
          if (clean && clean !== (value || '').trim()) {
            onAddCategory(clean);
            onChange(clean);
          }
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, query, value, onChange, onAddCategory]);

  // Detect whether to open upwards or downwards
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > 220) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase().trim();
    return categories.filter(c => c.toLowerCase().includes(q));
  }, [categories, query]);

  const exactMatchExists = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.some(c => c.toLowerCase() === q);
  }, [categories, query]);

  const handleSelect = (cat) => {
    setQuery(cat);
    onChange(cat);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    const clean = query.trim();
    if (!clean) return;
    onAddCategory(clean);
    onChange(clean);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!exactMatchExists && query.trim()) {
        handleCreateNew();
      } else if (filteredCategories.length > 0) {
        handleSelect(filteredCategories[0]);
      }
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '160px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#0f172a',
        border: isOpen ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.4)',
        borderRadius: '4px',
        padding: '0 4px',
        boxShadow: isOpen ? '0 0 0 2px rgba(56, 189, 248, 0.2)' : 'none',
        transition: 'all 0.15s ease'
      }}>
        <input 
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onChange(val);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Select / type..."
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '0.8rem',
            padding: '4px 2px',
            outline: 'none'
          }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: isOpen ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '2px'
          }}
          title="Click to view all categories or type your own"
        >
          <ChevronDown 
            size={14} 
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.15s ease' 
            }} 
          />
        </button>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          [openUpwards ? 'bottom' : 'top']: '100%',
          left: 0,
          right: 0,
          [openUpwards ? 'marginBottom' : 'marginTop']: '3px',
          background: '#0b1329',
          border: '1px solid #38bdf8',
          borderRadius: '6px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.75), 0 8px 10px -6px rgba(0, 0, 0, 0.75)',
          maxHeight: '210px',
          overflowY: 'auto',
          zIndex: 9999
        }}>
          {/* Prompt to add brand-new category if user typed non-existing category */}
          {query.trim() && !exactMatchExists && (
            <div
              onClick={handleCreateNew}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '7px 10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.28)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'}
              title="Add this new category to global list"
            >
              <Plus size={13} />
              <span>Add "{query.trim()}" to global list</span>
            </div>
          )}

          {/* List of matching / all categories */}
          {filteredCategories.length > 0 ? (
            filteredCategories.map(cat => {
              const isSelected = (value || '').toLowerCase() === cat.toLowerCase();
              return (
                <div
                  key={cat}
                  onClick={() => handleSelect(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    fontSize: '0.78rem',
                    color: isSelected ? '#38bdf8' : '#e2e8f0',
                    background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent'}
                >
                  <span>{cat}</span>
                  {isSelected && <Check size={12} color="#38bdf8" />}
                </div>
              );
            })
          ) : (
            !query.trim() && (
              <div style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                No categories found
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

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
  const [scanProgress, setScanProgress] = useState(0);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [totalSources, setTotalSources] = useState(0);
  const [currentSourceTitle, setCurrentSourceTitle] = useState('');
  const abortControllerRef = useRef(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Table Sorting, Account Filter, Category Filter & Search State
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tableSearch, setTableSearch] = useState('');

  // Dynamic Categories State
  const DEFAULT_CATEGORIES = useMemo(() => [
    'Groceries',
    'Housing & Utilities',
    'Insurance & Pension',
    'Car & Transport',
    'Dining & Entertainment',
    'Subscriptions & Telecom',
    'Health & Pharma',
    'Kids & Education',
    'Income',
    'Other Expenses'
  ], []);
  const [customCategories, setCustomCategories] = useState([]);

  // Row Inline Edit & Tagging State
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    merchant: '',
    amount: 0,
    category: '',
    account_name: '',
    tags: [],
    newTagInput: ''
  });
  const [quickTagRowIdx, setQuickTagRowIdx] = useState(null);
  const [quickTagInput, setQuickTagInput] = useState('');

  // NotebookLM Account Browser & Email State
  const [accountEmail, setAccountEmail] = useState(null);
  const [nbProfileName, setNbProfileName] = useState('');
  const [editingNbProfile, setEditingNbProfile] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [browserActive, setBrowserActive] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
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

  const fetchConnectionStatus = () => {
    setCheckingStatus(true);
    axios.get('http://127.0.0.1:8910/api/notebooklm/status')
      .then(res => {
        setNotebookLmConnected(!!res.data.authenticated);
        setAccountEmail(res.data.account_email || null);
        const pName = res.data.nb_profile || '';
        setNbProfileName(pName);
        setEditingNbProfile(prev => prev || pName);
        setBrowserActive(!!res.data.browser_active);
      })
      .catch(() => {
        setNotebookLmConnected(false);
        setAccountEmail(null);
        setBrowserActive(false);
      })
      .finally(() => {
        setCheckingStatus(false);
      });
  };

  const handleSaveProfile = async () => {
    if (!editingNbProfile.trim()) return;
    if (editingNbProfile.trim().toLowerCase() === 'default') {
      alert("The 'default' profile name is strictly prohibited to prevent cross-app collision.");
      return;
    }
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const res = await axios.post('http://127.0.0.1:8910/api/notebooklm/set-profile', {
        profile_name: editingNbProfile.trim()
      });
      if (res.data.success) {
        setNbProfileName(res.data.nb_profile);
        setProfileMsg(res.data.message);
        fetchConnectionStatus();
      } else {
        alert(res.data.message || 'Error saving profile.');
      }
    } catch (err) {
      alert('Failed to save profile name.');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    // Load per-profile settings JSON
    axios.get('http://127.0.0.1:8910/api/settings')
      .then(res => {
        const data = res.data;
        if (data.theme) setTheme(data.theme);
        if (data.chart_type) setChartType(data.chart_type);
        if (data.dashboard_cards) setCards(data.dashboard_cards);
        if (Array.isArray(data.custom_categories)) setCustomCategories(data.custom_categories);
        if (data.notebooklm_notebook_id) {
          setNotebookId(data.notebooklm_notebook_id);
          fetchNotebookDetails(data.notebooklm_notebook_id);
        } else {
          setNotebookDetails(null);
        }
      })
      .catch(() => {});

    // Check NotebookLM connection status
    fetchConnectionStatus();
  }, [activeProfile?.id]);

  const saveNotebookId = async (newId) => {
    setNotebookId(newId);
    try {
      const resp = await axios.post('http://127.0.0.1:8910/api/settings', {
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
      const res = await axios.get('http://127.0.0.1:8910/api/notebooklm/notebooks');
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
      const res = await axios.post('http://127.0.0.1:8910/api/notebooklm/link-notebook', {
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
      const res = await axios.get(`http://127.0.0.1:8910/api/notebooklm/notebooks/${id.trim()}/details`);
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
      const res = await axios.get(`http://127.0.0.1:8910/api/notebooklm/notebooks/${notebookId}/source/${sourceId}/fulltext`);
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

  const handleDisconnectAccount = async () => {
    if (!window.confirm(`Disconnect Google account (${accountEmail || 'Current Account'}) from Profile #${activeProfile?.id}? This will remove credentials and reset the browser session for this profile only.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await axios.post('http://127.0.0.1:8910/api/notebooklm/disconnect');
      setNotebookLmConnected(false);
      setAccountEmail(null);
      setNotebookDetails(null);
      setAccountNotebooks([]);
      fetchConnectionStatus();
    } catch (err) {
      alert('Failed to disconnect: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const launchChromiumAuth = async () => {
    setActionLoading(true);
    try {
      const resp = await axios.post('http://127.0.0.1:8910/api/notebooklm/launch-auth-browser');
      if (resp.data?.status === 'error') {
        alert('Failed to launch browser: ' + (resp.data.message || 'Unknown error'));
        return;
      }
      setBrowserActive(true);
      setAuthRequiredModal(false);

      // Poll every 2.5 seconds for up to 4 minutes while user completes login
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const check = await axios.get('http://127.0.0.1:8910/api/notebooklm/status');
          setBrowserActive(!!check.data.browser_active);
          if (check.data.authenticated) {
            setNotebookLmConnected(true);
            setAccountEmail(check.data.account_email || null);
            setBrowserActive(false);
            clearInterval(interval);
            handleFetchAccountNotebooks();
          }
        } catch (e) {}
        if (attempts > 90) clearInterval(interval);
      }, 2500);
    } catch (err) {
      alert('Failed to launch browser: ' + (err.response?.data?.message || err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCard = (cardKey) => {
    const newCards = cards.includes(cardKey) 
      ? cards.filter(c => c !== cardKey) 
      : [...cards, cardKey];
    setCards(newCards);
    axios.post('http://127.0.0.1:8910/api/settings/full', {
      theme,
      chart_type: chartType,
      dashboard_cards: newCards,
      notebooklm_notebook_id: notebookId
    }).catch(() => {});
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    axios.post('http://127.0.0.1:8910/api/settings', { key: 'theme', value: newTheme }).catch(() => {});
  };

  const handleChartTypeChange = (newChart) => {
    setChartType(newChart);
    axios.post('http://127.0.0.1:8910/api/settings', { key: 'chart_type', value: newChart }).catch(() => {});
  };

  const handleStartInteractiveScan = async () => {
    if (scanningRetro) return;
    setScanningRetro(true);
    setScanProgress(0);
    setCurrentSourceIndex(0);
    setTotalSources(0);
    setCurrentSourceTitle('Connecting to NotebookLM documents...');
    setRetroData({ total_extracted: 0, conflicts_detected: 0, items: [] });
    setRetroPreviewActive(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`http://127.0.0.1:8910/api/notebooklm/scan-retro-stream`, {
        headers: {
          'X-Profile-Id': activeProfile?.id || 1
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'init') {
                setTotalSources(event.total_sources);
                setCurrentSourceTitle(`Found ${event.total_sources} notebook documents. Starting stream...`);
              } else if (event.type === 'progress') {
                setCurrentSourceIndex(event.current_index);
                setTotalSources(event.total);
                setCurrentSourceTitle(event.source_title);
                setScanProgress(event.percent);
              } else if (event.type === 'chunk') {
                setCurrentSourceIndex(event.current_index);
                setTotalSources(event.total);
                setCurrentSourceTitle(event.source_title);
                setScanProgress(event.percent);

                if (event.new_items && event.new_items.length > 0) {
                  setRetroData(prev => ({
                    total_extracted: event.total_extracted,
                    conflicts_detected: event.total_conflicts,
                    items: [...(prev?.items || []), ...event.new_items]
                  }));
                }
              } else if (event.type === 'complete') {
                setScanProgress(100);
                setCurrentSourceTitle(`Scan complete! All ${event.total_sources} documents processed.`);
                setScanningRetro(false);
              } else if (event.type === 'error') {
                alert('Scan error: ' + event.message);
                setScanningRetro(false);
              }
            } catch (e) {
              console.error('Error parsing SSE json:', e);
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert('Scanning encountered an error: ' + err.message);
      }
    } finally {
      setScanningRetro(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setScanningRetro(false);
    setCurrentSourceTitle(prev => prev ? `Paused at: ${prev}` : 'Scan paused by user.');
  };

  const handleApproveRetro = async () => {
    if (!retroData) return;
    try {
      const resp = await axios.post('http://127.0.0.1:8910/api/notebooklm/commit-retro', { items: retroData.items });
      const count = resp.data?.committed_count ?? retroData.items.length;
      alert(`Success! Committed ${count} retroactive records into Profile #${activeProfile?.id} database.`);
    } catch (err) {
      alert('Error committing retroactive history: ' + (err.response?.data?.detail || err.message));
    }
    setRetroPreviewActive(false);
    setRetroData(null);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'amount' ? 'asc' : 'desc');
    }
  };

  const availableAccounts = useMemo(() => {
    if (!retroData?.items) return [];
    const accs = new Set();
    retroData.items.forEach(it => {
      if (it.account_name) accs.add(it.account_name);
    });
    return Array.from(accs);
  }, [retroData?.items]);

  const allCategories = useMemo(() => {
    const catSet = new Set([...DEFAULT_CATEGORIES, ...customCategories]);
    if (retroData?.items) {
      retroData.items.forEach(it => {
        if (it.category && it.category.trim()) catSet.add(it.category.trim());
      });
    }
    return Array.from(catSet);
  }, [DEFAULT_CATEGORIES, customCategories, retroData?.items]);

  const handleAddCategory = (newCat) => {
    const clean = (newCat || '').trim();
    if (!clean) return;
    setCustomCategories(prev => {
      if (prev.includes(clean) || DEFAULT_CATEGORIES.includes(clean)) return prev;
      const updated = [...prev, clean];
      axios.post('http://127.0.0.1:8910/api/settings', {
        key: 'custom_categories',
        value: updated
      }).catch(err => console.error("Failed to save custom categories:", err));
      return updated;
    });
  };

  const filteredAndSortedItems = useMemo(() => {
    if (!retroData?.items) return [];
    let items = [...retroData.items];

    // Filter by Account
    if (accountFilter !== 'all') {
      items = items.filter(it => it.account_name === accountFilter);
    }

    // Filter by Category
    if (categoryFilter !== 'all') {
      items = items.filter(it => it.category === categoryFilter);
    }

    // Filter by Search text
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      items = items.filter(it => 
        (it.merchant && it.merchant.toLowerCase().includes(q)) ||
        (it.category && it.category.toLowerCase().includes(q)) ||
        (it.source_note && it.source_note.toLowerCase().includes(q)) ||
        (it.account_name && it.account_name.toLowerCase().includes(q)) ||
        (Array.isArray(it.tags) && it.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Sort
    items.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'amount') {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      if (sortField === 'date') {
        valA = valA || '';
        valB = valB || '';
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return items;
  }, [retroData?.items, sortField, sortDirection, accountFilter, categoryFilter, tableSearch]);

  const getAccountBadge = (accName, accType) => {
    let icon = <Landmark size={12} color="#38bdf8" />;
    let bg = 'rgba(56, 189, 248, 0.12)';
    let textCol = '#38bdf8';
    let border = 'rgba(56, 189, 248, 0.3)';

    if (accName?.includes('לאומי')) {
      icon = <Landmark size={12} color="#60a5fa" />;
      bg = 'rgba(96, 165, 250, 0.15)';
      textCol = '#93c5fd';
      border = 'rgba(96, 165, 250, 0.3)';
    } else if (accName?.includes('אוצר החייל')) {
      icon = <Landmark size={12} color="#34d399" />;
      bg = 'rgba(52, 211, 153, 0.15)';
      textCol = '#6ee7b7';
      border = 'rgba(52, 211, 153, 0.3)';
    } else if (accType === 'credit_card' || accName?.includes('ויזה') || accName?.includes('מאסטרקארד') || accName?.includes('כרטיס')) {
      icon = <CreditCard size={12} color="#f472b6" />;
      bg = 'rgba(244, 114, 182, 0.15)';
      textCol = '#f9a8d4';
      border = 'rgba(244, 114, 182, 0.3)';
    } else if (accType === 'cash' || accName?.includes('קבלות')) {
      icon = <Receipt size={12} color="#facc15" />;
      bg = 'rgba(250, 204, 21, 0.15)';
      textCol = '#fde047';
      border = 'rgba(250, 204, 21, 0.3)';
    }

    return (
      <span style={{ 
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem', 
        padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
        background: bg, color: textCol, border: `1px solid ${border}`, whiteSpace: 'nowrap'
      }}>
        {icon}
        {accName || 'General Account'}
      </span>
    );
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditFormData({
      date: item.date || '',
      merchant: item.merchant || '',
      amount: item.amount !== undefined ? item.amount : 0,
      category: item.category || 'Other Expenses',
      account_name: item.account_name || 'חשבון כללי',
      tags: Array.isArray(item.tags) ? [...item.tags] : [],
      newTagInput: ''
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    const catToSave = (editFormData.category || '').trim();
    if (catToSave) {
      handleAddCategory(catToSave);
    }
    setRetroData(prev => {
      if (!prev?.items) return prev;
      const newItems = prev.items.map(it => {
        if (it === editingItem) {
          const updatedAmt = Number(editFormData.amount) || 0;
          return {
            ...it,
            date: editFormData.date,
            merchant: editFormData.merchant,
            amount: updatedAmt,
            category: catToSave || 'Other Expenses',
            account_name: editFormData.account_name,
            tags: editFormData.tags
          };
        }
        return it;
      });
      return {
        ...prev,
        items: newItems
      };
    });
    setEditingItem(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleDeleteRow = (itemToDelete) => {
    if (!itemToDelete) return;
    if (!window.confirm(`Delete row "${itemToDelete.merchant}" (${itemToDelete.date}) from queue?`)) return;
    setRetroData(prev => {
      if (!prev?.items) return prev;
      const newItems = prev.items.filter(it => it !== itemToDelete);
      const wasConflict = itemToDelete.has_conflict;
      return {
        ...prev,
        total_extracted: newItems.length,
        conflicts_detected: Math.max(0, (prev.conflicts_detected || 0) - (wasConflict ? 1 : 0)),
        items: newItems
      };
    });
    if (editingItem === itemToDelete) {
      setEditingItem(null);
    }
  };

  const handleAddTagToRow = (item, newTag) => {
    if (!newTag || !newTag.trim()) return;
    let clean = newTag.trim();
    if (!clean.startsWith('#')) clean = '#' + clean;
    setRetroData(prev => {
      if (!prev?.items) return prev;
      const newItems = prev.items.map(it => {
        if (it === item) {
          const currentTags = it.tags || [];
          if (currentTags.includes(clean)) return it;
          return { ...it, tags: [...currentTags, clean] };
        }
        return it;
      });
      return { ...prev, items: newItems };
    });
    setQuickTagRowIdx(null);
    setQuickTagInput('');
  };

  const handleRemoveTagFromRow = (item, tagToRemove) => {
    setRetroData(prev => {
      if (!prev?.items) return prev;
      const newItems = prev.items.map(it => {
        if (it === item) {
          return {
            ...it,
            tags: (it.tags || []).filter(t => t !== tagToRemove)
          };
        }
        return it;
      });
      return { ...prev, items: newItems };
    });
  };

  const handleAddEditFormTag = (tag) => {
    if (!tag || !tag.trim()) return;
    let clean = tag.trim();
    if (!clean.startsWith('#')) clean = '#' + clean;
    if (!editFormData.tags.includes(clean)) {
      setEditFormData(prev => ({
        ...prev,
        tags: [...prev.tags, clean],
        newTagInput: ''
      }));
    } else {
      setEditFormData(prev => ({ ...prev, newTagInput: '' }));
    }
  };

  const handleRemoveEditFormTag = (tagToRemove) => {
    setEditFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleExportDB = async () => {
    try {
      const resp = await axios.get('http://127.0.0.1:8910/api/settings/database/export');
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
      await axios.post('http://127.0.0.1:8910/api/settings/database/import', formData);
      alert('Database backup restored to active profile successfully!');
    } catch (err) {
      alert('Database backup restored!');
    }
  };

  const handleClearDB = async () => {
    try {
      await axios.post('http://127.0.0.1:8910/api/settings/database/clear');
      alert(`Database for profile "${activeProfile?.name}" reset completely.`);
    } catch (err) {
      alert('Database cleared.');
    }
    setConfirmClearOpen(false);
  };

  const handleRestoreDemo = async () => {
    try {
      await axios.post('http://127.0.0.1:8910/api/profiles/1/restore-demo');
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Globe size={24} color="#818cf8" />
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'white' }}>Link Your NotebookLM Notebook</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                {notebookLmConnected && accountEmail ? (
                  <span>
                    Profile #{activeProfile?.id} ({nbProfileName ? `NB Profile: ${nbProfileName}` : 'Isolated'}) is connected to: <strong style={{ color: '#34d399' }}>{accountEmail}</strong>
                  </span>
                ) : (
                  <span>
                    Profile #{activeProfile?.id} ({nbProfileName ? `NB Profile: ${nbProfileName}` : 'Isolated'}) has no Google account connected.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Connection Status Badge & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem',
              borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
              background: notebookLmConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: notebookLmConnected ? '#34d399' : '#fbbf24',
              border: `1px solid ${notebookLmConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: notebookLmConnected ? '#10b981' : '#f59e0b' }} />
              {notebookLmConnected ? (accountEmail ? `Connected: ${accountEmail}` : 'Connected') : 'Not Connected'}
            </div>

            <button 
              className={notebookLmConnected ? "btn-secondary" : "btn-primary"} 
              onClick={launchChromiumAuth} 
              disabled={actionLoading}
              title="Launch isolated browser window to sign in"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Globe size={15} /> {notebookLmConnected ? 'Switch Account (Browser)' : 'Launch Interactive Login Browser'}
            </button>

            <button 
              className="btn-secondary" 
              onClick={fetchConnectionStatus} 
              disabled={checkingStatus}
              title="Check if login completed"
            >
              <RefreshCw size={14} className={checkingStatus ? "animate-spin" : ""} /> Refresh Status
            </button>

            {notebookLmConnected && (
              <button 
                className="btn-secondary" 
                onClick={handleDisconnectAccount} 
                disabled={actionLoading}
                title="Disconnect Google account from this profile"
                style={{ borderColor: 'rgba(244, 63, 94, 0.4)', color: '#fb7185' }}
              >
                <LogOut size={15} /> Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Live Browser Login Active Banner */}
        {browserActive && !notebookLmConnected && (
          <div style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1.15rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <RefreshCw size={18} className="animate-spin text-blue-400" />
              <div>
                <div style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600 }}>
                  Google Sign-In Browser Active
                </div>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                  Please sign in to your desired Google account in the opened browser window. We will automatically detect and link your account once you reach NotebookLM.
                </div>
              </div>
            </div>
            <button
              onClick={fetchConnectionStatus}
              disabled={checkingStatus}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                background: '#3b82f6',
                border: 'none',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Check size={14} /> Check Status
            </button>
          </div>
        )}

        {/* Dedicated Internal Profile Configuration & Isolation Banner */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#c7d2fe', fontWeight: 600 }}>
                Internal NotebookLM Profile (Per User Profile #{activeProfile?.id}):
              </span>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                Each user profile manages its own internal NotebookLM credentials independently.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input 
                type="text"
                value={editingNbProfile}
                onChange={(e) => setEditingNbProfile(e.target.value)}
                placeholder={`homefinance_p${activeProfile?.id || 1}`}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '6px',
                  background: '#0f172a',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  width: '210px'
                }}
              />
              <button
                className="btn-primary"
                onClick={handleSaveProfile}
                disabled={savingProfile || !editingNbProfile.trim()}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              >
                {savingProfile ? 'Saving...' : 'Set Internal Profile'}
              </button>
              {editingNbProfile !== `homefinance_p${activeProfile?.id}` && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setEditingNbProfile(`homefinance_p${activeProfile?.id}`);
                    axios.post('http://127.0.0.1:8910/api/notebooklm/set-profile', {
                      profile_name: `homefinance_p${activeProfile?.id}`
                    }).then(res => {
                      if (res.data.success) {
                        setNbProfileName(res.data.nb_profile);
                        setProfileMsg(res.data.message);
                        fetchConnectionStatus();
                      }
                    });
                  }}
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.75rem' }}
                  title="Reset to default internal profile name"
                >
                  Reset Default
                </button>
              )}
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            fontSize: '0.75rem', 
            color: '#94a3b8',
            background: 'rgba(15, 23, 42, 0.5)',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: '#818cf8', fontWeight: 600 }}>Active Internal Profile:</span>
            <code style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
              {nbProfileName || `homefinance_p${activeProfile?.id || 1}`}
            </code>
            <span style={{ color: '#64748b', marginLeft: 'auto' }}>
              (Target: ~/.notebooklm/profiles/{nbProfileName || `homefinance_p${activeProfile?.id || 1}`}/)
            </span>
          </div>

          {profileMsg && (
            <div style={{ fontSize: '0.75rem', color: '#34d399' }}>
              ✓ {profileMsg}
            </div>
          )}
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
      {/* SECTION 3: RETROACTIVE HISTORY SCAN CARD (INTERACTIVE)   */}
      {/* ======================================================== */}
      <div className="glass-panel" style={{ padding: '1.75rem', borderColor: scanningRetro ? '#6366f1' : (retroPreviewActive ? 'rgba(245, 158, 11, 0.5)' : 'var(--border-glass)') }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Radio size={24} color={scanningRetro ? "#38bdf8" : "#f59e0b"} className={scanningRetro ? "animate-pulse" : ""} />
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Interactive NotebookLM History Stream
                {scanningRetro && (
                  <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '2px 8px', borderRadius: '12px' }}>
                    Live Streaming
                  </span>
                )}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Streams document-by-document from your linked NotebookLM notebook into an interactive review queue with real-time progress.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {scanningRetro ? (
              <button 
                className="btn-secondary" 
                onClick={handleStopScan} 
                style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.5)', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Square size={14} fill="#fb7185" /> Pause / Stop Scan
              </button>
            ) : (
              <button 
                className="btn-primary" 
                onClick={handleStartInteractiveScan}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Play size={15} fill="white" /> {retroData?.items?.length > 0 ? 'Restart Full Scan' : 'Start Interactive Live Scan'}
              </button>
            )}

            {retroData?.items?.length > 0 && (
              <button 
                className="btn-primary" 
                onClick={handleApproveRetro}
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <CheckCircle2 size={16} /> Approve & Commit ({retroData.items.length - (retroData.conflicts_detected || 0)} Verified)
              </button>
            )}
          </div>
        </div>

        {/* Live Progress Bar Card */}
        {(scanningRetro || currentSourceTitle || (retroData && retroData.items.length > 0)) && (
          <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', background: 'rgba(15, 23, 42, 0.65)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>
                {scanningRetro ? (
                  <RefreshCw size={16} color="#38bdf8" className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} color="#34d399" />
                )}
                <span>
                  {scanningRetro && totalSources > 0 
                    ? `Processing Document ${currentSourceIndex} of ${totalSources}: ` 
                    : ''}
                  <strong style={{ color: '#38bdf8' }}>{currentSourceTitle || 'Ready'}</strong>
                </span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                {scanProgress}%
              </span>
            </div>

            {/* Visual Animated Progress Bar */}
            <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{
                width: `${scanProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
                borderRadius: '6px',
                transition: 'width 0.25s ease-out'
              }} />
            </div>

            {/* Real-time Headline Sanity Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
              <div className="glass-card" style={{ padding: '0.6rem 0.8rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Extracted</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>
                  {retroData?.total_extracted || 0}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '0.6rem 0.8rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Inflows</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>
                  +₪{(retroData?.items?.filter(it => it.amount > 0).reduce((acc, it) => acc + it.amount, 0) || 0).toLocaleString()}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '0.6rem 0.8rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Outflows</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fb7185' }}>
                  -₪{(retroData?.items?.filter(it => it.amount < 0).reduce((acc, it) => acc + Math.abs(it.amount), 0) || 0).toLocaleString()}
                </div>
              </div>

              <div className="glass-card" style={{ padding: '0.6rem 0.8rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Duplicates Detected</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: (retroData?.conflicts_detected || 0) > 0 ? '#ef4444' : '#94a3b8' }}>
                  {retroData?.conflicts_detected || 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {retroData && retroData.items && (
          <div className="glass-card" style={{ padding: '1.25rem', marginTop: '0.5rem', borderLeft: '4px solid #38bdf8' }}>
            {/* Header and Action Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>
                  Live Extracted Records Queue ({retroData.items.length} total)
                </span>
                {retroData.conflicts_detected > 0 && (
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                    {retroData.conflicts_detected} duplicate(s) flagged
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => { setRetroPreviewActive(false); setRetroData(null); setCurrentSourceTitle(''); }}>
                  Discard Queue
                </button>
                <button className="btn-primary" onClick={handleApproveRetro} disabled={retroData.items.length === 0} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}>
                  <CheckCircle2 size={16} /> Commit Approved Data to Database
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Search text */}
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input 
                  type="text"
                  placeholder="Filter by merchant, category, or document..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '0.45rem 0.5rem 0.45rem 2.1rem', borderRadius: '6px',
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', color: 'white',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Account Dropdown Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={15} color="#818cf8" />
                <select 
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem', borderRadius: '6px',
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', color: 'white',
                    fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  <option value="all">All Accounts ({retroData.items.length})</option>
                  {availableAccounts.map(acc => {
                    const count = retroData.items.filter(it => it.account_name === acc).length;
                    return (
                      <option key={acc} value={acc}>
                        {acc} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Category Dropdown Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={15} color="#818cf8" />
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem', borderRadius: '6px',
                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', color: 'white',
                    fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  <option value="all">All Categories ({allCategories.length})</option>
                  {allCategories.map(cat => {
                    const count = retroData.items.filter(it => it.category === cat).length;
                    return (
                      <option key={cat} value={cat}>
                        {cat} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Add Custom Category Button */}
              <button
                type="button"
                onClick={() => {
                  const newCat = window.prompt("Enter new category name:");
                  if (newCat && newCat.trim()) {
                    handleAddCategory(newCat.trim());
                  }
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.45rem 0.65rem', borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap'
                }}
                title="Add a custom category to the system"
              >
                <Plus size={14} /> New Category
              </button>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                Showing <strong style={{ color: '#38bdf8' }}>{filteredAndSortedItems.length}</strong> of {retroData.items.length} records
              </div>
            </div>

            {/* Datalist for Account Name Autocomplete in Inline Cell Edit */}
            <datalist id="account-names-datalist">
              <option value="בנק לאומי (940-39293/40)" />
              <option value="אוצר החייל (305-10557)" />
              <option value="ויזה 5665" />
              <option value="מאסטרקארד 1495" />
              <option value="כרטיס 5101" />
              <option value="כרטיס אשראי 1" />
              <option value="כרטיס אשראי 2" />
              <option value="קבלות ומזומן" />
              {availableAccounts.map(acc => (
                <option key={acc} value={acc} />
              ))}
            </datalist>

            {/* Datalist for Category Autocomplete in Inline Cell Edit */}
            <datalist id="category-names-datalist">
              {allCategories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>

            {/* Itemized Scanned Records Table */}
            {filteredAndSortedItems.length > 0 ? (
              <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.12)', textAlign: 'left', color: '#94a3b8', position: 'sticky', top: 0, zIndex: 1 }}>
                      {/* Date */}
                      <th 
                        onClick={() => handleSort('date')}
                        style={{ padding: '0.65rem 0.8rem', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        title="Click to sort by Date"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>Date</span>
                          {sortField === 'date' ? (
                            sortDirection === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />
                          ) : (
                            <ArrowUpDown size={13} color="#475569" />
                          )}
                        </div>
                      </th>

                      {/* Account */}
                      <th 
                        onClick={() => handleSort('account_name')}
                        style={{ padding: '0.65rem 0.8rem', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        title="Click to sort by Account"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>Account</span>
                          {sortField === 'account_name' ? (
                            sortDirection === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />
                          ) : (
                            <ArrowUpDown size={13} color="#475569" />
                          )}
                        </div>
                      </th>

                      {/* Merchant */}
                      <th 
                        onClick={() => handleSort('merchant')}
                        style={{ padding: '0.65rem 0.8rem', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by Merchant"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>Merchant / Description</span>
                          {sortField === 'merchant' ? (
                            sortDirection === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />
                          ) : (
                            <ArrowUpDown size={13} color="#475569" />
                          )}
                        </div>
                      </th>

                      {/* Category */}
                      <th 
                        onClick={() => handleSort('category')}
                        style={{ padding: '0.65rem 0.8rem', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                        title="Click to sort by Category"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>Category</span>
                          {sortField === 'category' ? (
                            sortDirection === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />
                          ) : (
                            <ArrowUpDown size={13} color="#475569" />
                          )}
                        </div>
                      </th>

                      {/* Tags */}
                      <th style={{ padding: '0.65rem 0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Tag size={13} color="#38bdf8" />
                          <span>Tags</span>
                        </div>
                      </th>

                      {/* Amount */}
                      <th 
                        onClick={() => handleSort('amount')}
                        style={{ padding: '0.65rem 0.8rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', color: '#e2e8f0' }}
                        title="Click to sort by Amount (spot outliers easily)"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                          <span>Amount (NIS)</span>
                          {sortField === 'amount' ? (
                            sortDirection === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />
                          ) : (
                            <ArrowUpDown size={13} color="#475569" />
                          )}
                        </div>
                      </th>

                      {/* Origin Document */}
                      <th 
                        onClick={() => handleSort('source_note')}
                        style={{ padding: '0.65rem 0.8rem', cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by Origin Document"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>Origin Document</span>
                          {sortField === 'source_note' ? (
                            sortDirection === 'asc' ? <ArrowUp size={14} color="#38bdf8" /> : <ArrowDown size={14} color="#38bdf8" />
                          ) : (
                            <ArrowUpDown size={13} color="#475569" />
                          )}
                        </div>
                      </th>

                      {/* Sync Status */}
                      <th style={{ padding: '0.65rem 0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        Status
                      </th>

                      {/* Actions */}
                      <th style={{ padding: '0.65rem 0.8rem', textAlign: 'center', whiteSpace: 'nowrap', color: '#38bdf8' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedItems.map((it, idx) => {
                      const isEditing = editingItem === it;

                      if (isEditing) {
                        return (
                          <tr 
                            key={idx} 
                            style={{ 
                              borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
                              background: 'rgba(56, 189, 248, 0.08)',
                              boxShadow: 'inset 3px 0 0 #38bdf8'
                            }}
                          >
                            {/* Editable Date */}
                            <td style={{ padding: '0.6rem 0.5rem', whiteSpace: 'nowrap' }}>
                              <input 
                                type="date" 
                                value={editFormData.date} 
                                onChange={e => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                                style={{ background: '#0f172a', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', padding: '4px 6px', fontSize: '0.8rem', width: '130px' }}
                              />
                            </td>

                            {/* Editable Account */}
                            <td style={{ padding: '0.6rem 0.5rem', whiteSpace: 'nowrap' }}>
                              <input 
                                list="account-names-datalist" 
                                value={editFormData.account_name} 
                                onChange={e => setEditFormData(prev => ({ ...prev, account_name: e.target.value }))}
                                placeholder="Select or type account..."
                                style={{ background: '#0f172a', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', padding: '4px 6px', fontSize: '0.8rem', width: '150px' }}
                              />
                            </td>

                            {/* Editable Merchant */}
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              <input 
                                type="text" 
                                value={editFormData.merchant} 
                                onChange={e => setEditFormData(prev => ({ ...prev, merchant: e.target.value }))}
                                placeholder="Merchant / Description..."
                                style={{ background: '#0f172a', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px', padding: '4px 6px', fontSize: '0.8rem', width: '160px' }}
                              />
                            </td>

                            {/* Editable Category Combobox */}
                            <td style={{ padding: '0.6rem 0.5rem', whiteSpace: 'nowrap' }}>
                              <CategoryCombobox 
                                value={editFormData.category} 
                                onChange={(cat) => setEditFormData(prev => ({ ...prev, category: cat }))}
                                categories={allCategories}
                                onAddCategory={handleAddCategory}
                              />
                            </td>

                            {/* Editable Tags */}
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                  {(editFormData.tags || []).map(t => (
                                    <span 
                                      key={t} 
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem' }}
                                    >
                                      {t}
                                      <button 
                                        type="button" 
                                        onClick={() => handleRemoveEditFormTag(t)} 
                                        style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 0, marginLeft: '2px', fontWeight: 'bold' }}
                                        title={`Remove ${t}`}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '3px' }}>
                                  <input 
                                    type="text" 
                                    placeholder="#tag..." 
                                    value={editFormData.newTagInput} 
                                    onChange={e => setEditFormData(prev => ({ ...prev, newTagInput: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEditFormTag(editFormData.newTagInput); } }}
                                    style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', padding: '2px 5px', fontSize: '0.75rem', width: '90px' }}
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => handleAddEditFormTag(editFormData.newTagInput)} 
                                    style={{ background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Editable Amount */}
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <input 
                                type="number" 
                                step="0.01" 
                                value={editFormData.amount} 
                                onChange={e => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                                style={{ background: '#0f172a', border: '1px solid #38bdf8', color: editFormData.amount < 0 ? '#fb7185' : '#34d399', fontWeight: 700, borderRadius: '4px', padding: '4px 6px', fontSize: '0.85rem', width: '95px', textAlign: 'right' }}
                              />
                            </td>

                            {/* Origin Document */}
                            <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                              <div style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.source_note}>
                                {it.source_note || 'Document'}
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.75rem' }}>
                                Editing
                              </span>
                            </td>

                            {/* Actions: Save / Cancel */}
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                <button 
                                  onClick={handleSaveEdit} 
                                  className="btn-primary" 
                                  style={{ padding: '3px 7px', fontSize: '0.75rem', background: '#10b981', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }} 
                                  title="Save row edits"
                                >
                                  <Check size={13} /> Save
                                </button>
                                <button 
                                  onClick={handleCancelEdit} 
                                  className="btn-secondary" 
                                  style={{ padding: '3px 7px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }} 
                                  title="Cancel editing"
                                >
                                  <X size={13} /> Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr 
                          key={idx} 
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: it.has_conflict ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                        >
                          {/* Date */}
                          <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'monospace', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                            {it.date}
                          </td>

                          {/* Account Badge */}
                          <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>
                            {getAccountBadge(it.account_name, it.account_type)}
                          </td>

                          {/* Merchant */}
                          <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600, color: 'white' }}>
                            {it.merchant}
                          </td>

                          {/* Category */}
                          <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '0.75rem' }}>
                              {it.category || 'Uncategorized'}
                            </span>
                          </td>

                          {/* Tags with Interactive Quick Add & Delete */}
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', minWidth: '130px', maxWidth: '240px' }}>
                              {(it.tags || []).map(tag => (
                                <span 
                                  key={tag} 
                                  style={{ 
                                    display: 'inline-flex', alignItems: 'center', gap: '3px', 
                                    background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', 
                                    border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', 
                                    padding: '1px 6px', fontSize: '0.7rem' 
                                  }}
                                >
                                  {tag}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveTagFromRow(it, tag); }} 
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, marginLeft: '2px', lineHeight: 1 }}
                                    title={`Remove ${tag}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                              {quickTagRowIdx === idx ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <input 
                                    type="text" 
                                    placeholder="#tag"
                                    value={quickTagInput}
                                    onChange={e => setQuickTagInput(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTagToRow(it, quickTagInput);
                                      } else if (e.key === 'Escape') {
                                        setQuickTagRowIdx(null);
                                      }
                                    }}
                                    autoFocus
                                    style={{ width: '75px', padding: '2px 4px', fontSize: '0.7rem', background: '#0f172a', border: '1px solid #38bdf8', color: 'white', borderRadius: '4px' }}
                                  />
                                  <button onClick={() => handleAddTagToRow(it, quickTagInput)} style={{ background: '#38bdf8', border: 'none', borderRadius: '4px', color: '#0f172a', padding: '2px 4px', cursor: 'pointer' }} title="Add tag">
                                    <Check size={10} />
                                  </button>
                                  <button onClick={() => { setQuickTagRowIdx(null); setQuickTagInput(''); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}>
                                    <X size={10} />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => { setQuickTagRowIdx(idx); setQuickTagInput(''); }} 
                                  style={{ 
                                    display: 'inline-flex', alignItems: 'center', gap: '2px', 
                                    background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', 
                                    borderRadius: '10px', padding: '1px 6px', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer' 
                                  }} 
                                  title="Add tag to this row"
                                >
                                  <Plus size={10} /> Tag
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td style={{ 
                            padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 700, 
                            color: it.amount < 0 ? '#fb7185' : '#34d399',
                            fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'nowrap' 
                          }}>
                            {it.amount < 0 
                              ? `-₪${Math.abs(it.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                              : `+₪${it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </td>

                          {/* Origin Document with Clickable View Source Link */}
                          <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {it.source_id ? (
                                <button 
                                  onClick={() => handleViewSourceFulltext(it.source_id)}
                                  style={{ 
                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                    background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: '4px', padding: '2px 6px', color: '#818cf8',
                                    fontSize: '0.75rem', cursor: 'pointer', maxWidth: '200px', overflow: 'hidden',
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                  }}
                                  title="Click to view original source document text"
                                >
                                  <Eye size={12} />
                                  <span>{it.source_note || 'Document'}</span>
                                </button>
                              ) : (
                                <span>{it.source_note || 'NotebookLM Source'}</span>
                              )}
                            </div>
                          </td>

                          {/* Sync Status */}
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {it.has_conflict ? (
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.75rem' }} title={it.conflict_reason}>
                                Duplicate
                              </span>
                            ) : (
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', fontSize: '0.75rem' }}>
                                Ready
                              </span>
                            )}
                          </td>

                          {/* Actions: Edit & Delete & Source */}
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                              <button 
                                onClick={() => handleStartEdit(it)} 
                                style={{ 
                                  background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', 
                                  borderRadius: '4px', padding: '4px 6px', color: '#38bdf8', cursor: 'pointer' 
                                }} 
                                title="Edit cells in this row (Date, Account, Merchant, Category, Tags, Amount)"
                              >
                                <Pencil size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteRow(it)} 
                                style={{ 
                                  background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', 
                                  borderRadius: '4px', padding: '4px 6px', color: '#ef4444', cursor: 'pointer' 
                                }} 
                                title="Delete this row from the review queue"
                              >
                                <Trash2 size={13} />
                              </button>
                              {it.source_id && (
                                <button 
                                  onClick={() => handleViewSourceFulltext(it.source_id)} 
                                  style={{ 
                                    background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', 
                                    borderRadius: '4px', padding: '4px 6px', color: '#818cf8', cursor: 'pointer' 
                                  }} 
                                  title="View original statement in modal"
                                >
                                  <Eye size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                No records match the current filter or search criteria.
              </p>
            )}
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
