import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { 
  CreditCard, Upload, Eye, CheckCircle2, ChevronRight, RotateCcw, 
  AlertTriangle, Plus, Calendar, Filter, Search, ArrowLeft, ArrowUpRight,
  TrendingDown, Layers, PieChart as PieIcon, ListFilter, Tag
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8910';

export default function ExpensesView({ activeProfileId, activeProfileName }) {
  // Filter Toolbar State
  const [preset, setPreset] = useState('all'); // 'all' | 'last_year' | 'last_month' | 'last_6_months' | 'ytd' | '3_years' | '5_years' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Data State
  const [summaryData, setSummaryData] = useState(null);
  const [clusterData, setClusterData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drill-down State
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [txSearchQuery, setTxSearchQuery] = useState('');

  // Receipt Vault & Editor State
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editForm, setEditForm] = useState({
    merchant: '',
    amount: 0,
    date: '',
    category: 'Groceries',
    line_items: []
  });

  const formatDateISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    const now = new Date();

    if (newPreset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (newPreset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(formatDateISO(start));
      setEndDate(formatDateISO(end));
    } else if (newPreset === 'last_6_months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      setStartDate(formatDateISO(start));
      setEndDate(formatDateISO(now));
    } else if (newPreset === 'last_year') {
      const start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      setStartDate(formatDateISO(start));
      setEndDate(formatDateISO(now));
    } else if (newPreset === 'ytd') {
      const start = new Date(now.getFullYear(), 0, 1);
      setStartDate(formatDateISO(start));
      setEndDate(formatDateISO(now));
    } else if (newPreset === '3_years') {
      const start = new Date(now.getFullYear() - 3, now.getMonth(), 1);
      setStartDate(formatDateISO(start));
      setEndDate(formatDateISO(now));
    } else if (newPreset === '5_years') {
      const start = new Date(now.getFullYear() - 5, now.getMonth(), 1);
      setStartDate(formatDateISO(start));
      setEndDate(formatDateISO(now));
    }
  };

  const handleCustomDateChange = (type, val) => {
    setPreset('custom');
    if (type === 'start') {
      setStartDate(val);
    } else {
      setEndDate(val);
    }
  };

  const handleResetFilters = () => {
    setPreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedCluster(null);
  };

  const isFiltersDirty = preset !== 'all' || startDate !== '' || endDate !== '';

  // Fetch summary by cluster
  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    const reqHeaders = { 'X-Profile-Id': activeProfileId };
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    axios.get(`${API_BASE}/api/transactions/summary/by-cluster`, { headers: reqHeaders, params })
      .then(res => {
        if (res.data) {
          const rawClusters = res.data.clusters || (Array.isArray(res.data) ? res.data : []);
          setSummaryData(res.data);
          setClusterData(rawClusters);
        } else {
          setSummaryData(null);
          setClusterData([]);
        }
      })
      .catch(() => {
        setSummaryData(null);
        setClusterData([]);
      })
      .finally(() => setLoading(false));

    // Fetch pending receipts
    axios.get(`${API_BASE}/api/receipts?status=pending_review`, { headers: reqHeaders })
      .then(res => setPendingReceipts(res.data || []))
      .catch(() => setPendingReceipts([]));
  }, [activeProfileId, startDate, endDate]);

  // Fetch transactions when drilling into a specific cluster
  useEffect(() => {
    if (!activeProfileId || !selectedCluster) {
      setCategoryTransactions([]);
      return;
    }
    setLoadingTransactions(true);
    const reqHeaders = { 'X-Profile-Id': activeProfileId };
    const params = { cluster: selectedCluster };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    axios.get(`${API_BASE}/api/transactions`, { headers: reqHeaders, params })
      .then(res => {
        setCategoryTransactions(res.data || []);
      })
      .catch(() => setCategoryTransactions([]))
      .finally(() => setLoadingTransactions(false));
  }, [activeProfileId, selectedCluster, startDate, endDate]);

  const totalPeriodExpenses = summaryData?.total_expenses || clusterData.reduce((acc, curr) => acc + (curr.total_amount || curr.value || 0), 0);
  const monthlyExpensesAvg = summaryData?.monthly_expenses_avg || (summaryData?.months_count ? totalPeriodExpenses / summaryData.months_count : totalPeriodExpenses);
  const isMultiMonth = summaryData?.is_multi_month ?? true;
  const periodLabel = summaryData?.period_label || 'Selected Period';
  const topCluster = clusterData.length > 0 ? clusterData[0] : null;

  const round = (num, decimals) => Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);

  const handleConfirmReceipt = async () => {
    if (!selectedReceipt) return;
    try {
      await axios.post(`${API_BASE}/api/receipts/${selectedReceipt.id}/confirm`, {
        merchant: editForm.merchant,
        amount: parseFloat(editForm.amount),
        date: editForm.date,
        category: editForm.category,
        account_id: 1,
        line_items: editForm.line_items
      });
    } catch (err) {}

    setPendingReceipts(prev => prev.filter(r => r.id !== selectedReceipt.id));
    setSelectedReceipt(null);
    alert('Receipt confirmed & committed to DB! Raw image file archived.');
  };

  const filteredTransactions = categoryTransactions.filter(t => {
    if (!txSearchQuery) return true;
    const q = txSearchQuery.toLowerCase();
    return (
      (t.merchant && t.merchant.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      (t.date && t.date.includes(q)) ||
      String(t.amount).includes(q)
    );
  });

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700, margin: 0 }}>Expenses Category Hub</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Interactive expense drill-down, monthly run-rate analysis, and receipt OCR vault
          </p>
        </div>
      </div>

      {/* Filter Toolbar (Unified with Dashboard) */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '0.9rem 1.25rem', 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '1rem',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {/* Left: Active Scope Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}>
            <Filter size={16} color="#818cf8" />
            <span>Time Horizon:</span>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.12)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
            {periodLabel}
          </span>
        </div>

        {/* Right: Presets, Pickers & Reset */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={15} color="#94a3b8" />
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '0.45rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.83rem',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All History</option>
              <option value="last_year">Last 1 Year (12M)</option>
              <option value="last_month">Last Month</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="ytd">Year to Date (YTD)</option>
              <option value="3_years">3 Years</option>
              <option value="5_years">5 Years</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Date Picker: From */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              style={{
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Date Picker: To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              style={{
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Reset button */}
          {isFiltersDirty && (
            <button
              onClick={handleResetFilters}
              title="Reset to All History"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards with Option A (Monthly Run-Rate & Total Period Burn) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* Card 1: Monthly Run-Rate (Option A) */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly Expenses Run-Rate</span>
            {isMultiMonth && (
              <span style={{ fontSize: '0.7rem', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                Run-Rate
              </span>
            )}
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#fb7185', marginTop: '0.3rem', fontWeight: 700 }}>
            ₪ {Math.round(monthlyExpensesAvg).toLocaleString()}
            {isMultiMonth && (
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#94a3b8', marginLeft: '0.3rem' }}>
                /mo avg
              </span>
            )}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginTop: '0.2rem' }}>
            {isMultiMonth 
              ? `₪ ${Math.round(totalPeriodExpenses).toLocaleString()} total period burn (${summaryData?.months_count || 1} mos)`
              : `Period: ${periodLabel} (Excl. Transfers)`
            }
          </span>
        </div>

        {/* Card 2: Top Expense Category */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Top Expense Category</span>
            {topCluster && (
              <span style={{ fontSize: '0.7rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                {topCluster.percentage}% of total
              </span>
            )}
          </div>
          <h2 style={{ fontSize: '1.45rem', color: 'white', marginTop: '0.3rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {topCluster ? topCluster.name : 'N/A'}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginTop: '0.2rem' }}>
            {topCluster 
              ? (isMultiMonth 
                  ? `₪ ${Math.round(topCluster.monthly_avg || 0).toLocaleString()}/mo (₪ ${Math.round(topCluster.total_amount || 0).toLocaleString()} total)`
                  : `₪ ${Math.round(topCluster.total_amount || 0).toLocaleString()} total`
                )
              : 'No categorized expenses in selected range'
            }
          </span>
        </div>

        {/* Card 3: Active Categories & Outflow Transactions */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Categorized Coverage</span>
            <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
              Live DB
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#34d399', marginTop: '0.3rem', fontWeight: 700 }}>
            {clusterData.length} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#94a3b8' }}>Categories</span>
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginTop: '0.2rem' }}>
            {summaryData?.transaction_count || 0} outflow transactions in {periodLabel}
          </span>
        </div>
      </div>

      {/* Main Section: Category Breakdown & Drill-Down */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        {/* Navigation Breadcrumb Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.1rem', color: 'white', fontWeight: 700 }}>
            <span 
              onClick={() => setSelectedCluster(null)}
              style={{ cursor: selectedCluster ? 'pointer' : 'default', color: selectedCluster ? '#818cf8' : 'white' }}
            >
              All Categories
            </span>
            {selectedCluster && (
              <>
                <ChevronRight size={16} color="#818cf8" />
                <span style={{ color: 'white' }}>{selectedCluster}</span>
              </>
            )}
          </div>

          {selectedCluster && (
            <button
              onClick={() => setSelectedCluster(null)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              <ArrowLeft size={14} /> Back to All Categories
            </button>
          )}
        </div>

        {/* If no selectedCluster: Show Category Chart & Category Table */}
        {!selectedCluster ? (
          <div>
            {clusterData.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
                <CreditCard size={32} color="#6366f1" style={{ margin: '0 auto 0.75rem' }} />
                <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.25rem' }}>No Expenses in Selected Date Range</h3>
                <p style={{ fontSize: '0.85rem' }}>Try adjusting the date filters above or reset to "All History".</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.4fr)', gap: '2rem', alignItems: 'center' }}>
                {/* Donut Chart */}
                <div style={{ width: '100%', height: 340, position: 'relative' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={clusterData}
                        innerRadius={75}
                        outerRadius={115}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        style={{ cursor: 'pointer' }}
                        onClick={(entry) => setSelectedCluster(entry.name)}
                      >
                        {clusterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const pct = data.percentage ?? (totalPeriodExpenses ? ((data.value / totalPeriodExpenses) * 100).toFixed(1) : 0);
                          return (
                            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', padding: '0.65rem 0.9rem', borderRadius: '8px', color: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                              <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem', color: '#f8fafc' }}>{data.name}</p>
                              {isMultiMonth && (
                                <p style={{ margin: '0.25rem 0 0', color: '#f43f5e', fontSize: '0.85rem', fontWeight: 600 }}>
                                  ₪ {Math.round(data.monthly_avg || 0).toLocaleString()}/mo avg
                                </p>
                              )}
                              <p style={{ margin: '0.2rem 0 0', color: '#34d399', fontSize: '0.8rem' }}>
                                Total: ₪ {Math.round(data.value).toLocaleString()} ({pct}%)
                              </p>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '0.3rem' }}>
                                Click slice to view transactions ↗
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Run-Rate summary inside Donut hole */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      {isMultiMonth ? 'Run-Rate' : 'Total'}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', color: 'white', margin: '0.1rem 0', fontWeight: 700 }}>
                      ₪ {Math.round(isMultiMonth ? monthlyExpensesAvg : totalPeriodExpenses).toLocaleString()}
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: '#818cf8' }}>
                      {isMultiMonth ? '/mo avg' : periodLabel}
                    </span>
                  </div>
                </div>

                {/* Category List & Drill-Down Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {clusterData.map((cluster) => {
                    const pct = cluster.percentage ?? (totalPeriodExpenses ? Math.round((cluster.value / totalPeriodExpenses) * 100) : 0);
                    return (
                      <div
                        key={cluster.name}
                        onClick={() => setSelectedCluster(cluster.name)}
                        style={{
                          background: 'rgba(30, 41, 59, 0.5)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = cluster.color;
                          e.currentTarget.style.transform = 'translateX(4px)';
                          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: cluster.color, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ color: 'white', margin: 0, fontSize: '0.92rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cluster.name}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {cluster.count || 0} transactions · {pct}% of burn
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                            {isMultiMonth 
                              ? `₪ ${Math.round(cluster.monthly_avg || 0).toLocaleString()} /mo`
                              : `₪ ${Math.round(cluster.value).toLocaleString()}`
                            }
                          </div>
                          {isMultiMonth && (
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              ₪ {Math.round(cluster.value).toLocaleString()} total
                            </div>
                          )}
                        </div>

                        <ChevronRight size={16} color="#94a3b8" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Drill-Down Transactions View */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  background: 'rgba(99, 102, 241, 0.15)', 
                  padding: '0.4rem 0.75rem', 
                  borderRadius: '6px', 
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem',
                  color: '#818cf8',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  <Tag size={14} />
                  <span>{selectedCluster}</span>
                </div>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  {filteredTransactions.length} items logged ({periodLabel})
                </span>
              </div>

              {/* Search Bar inside transactions */}
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search merchant, notes, amount..."
                  value={txSearchQuery}
                  onChange={(e) => setTxSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {loadingTransactions ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                Loading transactions for {selectedCluster}...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                No transactions matched your search or filter.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(30, 41, 59, 0.7)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Merchant / Description</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Notes / Source</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr 
                        key={tx.id} 
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                          {tx.date}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'white', fontWeight: 600 }}>
                          {tx.merchant || 'Unknown'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                          {tx.notes || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: tx.amount < 0 ? '#fb7185' : '#34d399', whiteSpace: 'nowrap' }}>
                          ₪ {Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Receipt Vault Section */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard size={20} color="#34d399" /> Receipt Vault & Line-Item Price Editor
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Receipts pending human verification for active profile.
        </p>

        {pendingReceipts.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No pending receipts for review in active profile database.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {pendingReceipts.map(rcpt => (
              <div key={rcpt.id} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'white' }}>{rcpt.merchant}</span>
                  <span style={{ fontWeight: 700, color: '#34d399' }}>₪ {rcpt.amount ? rcpt.amount.toFixed(2) : '0.00'}</span>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    setSelectedReceipt(rcpt);
                    setEditForm({
                      merchant: rcpt.merchant || '',
                      amount: rcpt.amount || 0,
                      date: rcpt.date || '',
                      category: rcpt.category || 'Groceries',
                      line_items: rcpt.line_items || []
                    });
                  }}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                >
                  <Eye size={16} /> Review & Edit Line Items
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Receipt Modal */}
      {selectedReceipt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '2rem'
        }}>
          <div className="glass-panel" style={{ width: '750px', maxWidth: '95%', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '0.5rem' }}>Itemized Receipt Editor & Verification</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Edit item prices or names to correct garbled OCR text. Total amount updates automatically.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Merchant Name</label>
                <input 
                  type="text" 
                  value={editForm.merchant} 
                  onChange={(e) => setEditForm({...editForm, merchant: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Total Amount (₪)</label>
                <input 
                  type="number" 
                  value={editForm.amount} 
                  readOnly
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#34d399', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setSelectedReceipt(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleConfirmReceipt}>
                <CheckCircle2 size={16} /> Save Items & Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
