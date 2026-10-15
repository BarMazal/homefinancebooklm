import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  RefreshCw, FolderPlus, CreditCard, Wallet, TrendingUp, 
  Calendar, Sliders, RotateCcw, ArrowUpRight, BarChart2 
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8910';

export default function DashboardView({ fxRate, activeProfileId, activeProfileName, setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter Toolbar State
  const [granularity, setGranularity] = useState('monthly'); // 'monthly' | 'yearly'
  const [preset, setPreset] = useState('all'); // 'all' | 'last_year' | 'last_month' | 'last_6_months' | 'ytd' | '3_years' | '5_years' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      // 1st of prior month to last day of prior month
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
    setGranularity('monthly');
    setPreset('all');
    setStartDate('');
    setEndDate('');
  };

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);

    const params = { granularity };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    axios.get(`${API_BASE}/api/dashboard/overview`, {
      headers: { 'X-Profile-Id': activeProfileId },
      params
    })
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [activeProfileId, granularity, startDate, endDate]);

  const expenseCuts = data?.expense_cuts || [];
  const monthlyCashFlow = data?.monthly_cashflow || [];
  const totalExpenseSum = expenseCuts.reduce((acc, curr) => acc + curr.value, 0);

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      const pct = totalExpenseSum ? ((pData.value / totalExpenseSum) * 100).toFixed(1) : 0;
      return (
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', padding: '0.6rem 0.85rem', borderRadius: '8px', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem', color: '#f8fafc' }}>{pData.name}</p>
          <p style={{ margin: '0.2rem 0 0', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
            ₪ {pData.value.toLocaleString()} ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomCashflowTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const inc = payload.find(p => p.dataKey === 'Income')?.value || 0;
      const exp = payload.find(p => p.dataKey === 'Expense')?.value || 0;
      const net = inc - exp;
      return (
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
          <p style={{ fontWeight: 700, margin: '0 0 0.4rem', fontSize: '0.95rem', color: '#f8fafc', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.3rem' }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ color: '#94a3b8' }}>Inflow (Income):</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>₪ {inc.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ color: '#94a3b8' }}>Outflow (Expenses):</span>
              <span style={{ color: '#f43f5e', fontWeight: 600 }}>₪ {exp.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.3rem', paddingTop: '0.3rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <span style={{ color: '#cbd5e1' }}>Net Savings:</span>
              <span style={{ color: net >= 0 ? '#34d399' : '#fb7185', fontWeight: 700 }}>
                {net >= 0 ? '+' : ''}₪ {net.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const isCleanSlate = (!loading && data && data.total_net_worth === 0 && expenseCuts.length === 0);
  const isFiltersDirty = (granularity !== 'monthly' || preset !== 'all' || startDate !== '' || endDate !== '');

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Financial Control Tower</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Overview of active profile ({activeProfileName || 'Default'}) cashflow & database</p>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem' }}>
          <RefreshCw size={16} color="#34d399" />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>USD / ILS FX:</span>
          <span style={{ fontWeight: 700, color: '#34d399', fontSize: '1.05rem' }}>
            ₪ {fxRate ? fxRate.toFixed(2) : (data?.fx_rate ? data.fx_rate.toFixed(2) : '3.65')}
          </span>
        </div>
      </div>

      {/* Interactive Filter Toolbar */}
      <div className="glass-panel" style={{ 
        padding: '0.85rem 1.25rem', 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: '1rem',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Left: Granularity Toggle Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <BarChart2 size={15} color="#818cf8" /> View:
          </span>
          <div style={{ display: 'inline-flex', background: 'rgba(0, 0, 0, 0.35)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setGranularity('monthly')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: granularity === 'monthly' ? 700 : 500,
                color: granularity === 'monthly' ? '#ffffff' : '#94a3b8',
                background: granularity === 'monthly' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: granularity === 'monthly' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none'
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setGranularity('yearly')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: granularity === 'yearly' ? 700 : 500,
                color: granularity === 'yearly' ? '#ffffff' : '#94a3b8',
                background: granularity === 'yearly' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: granularity === 'yearly' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none'
              }}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Right: Period Preset Combobox & Date Pickers */}
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
                gap: '0.3rem',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#94a3b8',
                padding: '0.4rem 0.7rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}

          {/* Active Period Label Badge */}
          {data?.target_month_label && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '6px',
              padding: '0.35rem 0.65rem',
              color: '#a5b4fc',
              fontSize: '0.78rem',
              fontWeight: 600
            }}>
              {data.target_month_label}
            </div>
          )}
        </div>
      </div>

      {isCleanSlate && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderColor: '#6366f1', background: 'rgba(99, 102, 241, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FolderPlus size={24} color="#818cf8" />
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'white', fontWeight: 600 }}>Active Database Empty</h3>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Profile database <strong>{activeProfileName}</strong> has no items yet. Use <strong>Expenses Hub</strong> to upload statements/receipts or <strong>Settings & Auth</strong> to scan NotebookLM!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards with Option A (Monthly Run-Rate & Total Period Burn) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
        {/* Net Worth */}
        <div className="glass-panel" style={{ padding: '1.25rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Net Worth</span>
            {setActiveTab && (
              <button 
                onClick={() => setActiveTab('accounts')}
                style={{ 
                  background: 'rgba(99, 102, 241, 0.15)', 
                  border: '1px solid rgba(99, 102, 241, 0.3)', 
                  color: '#818cf8', 
                  fontSize: '0.72rem', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}
              >
                Set Real Balances ↗
              </button>
            )}
          </div>
          <h2 style={{ fontSize: '1.8rem', color: (data?.total_net_worth || 0) >= 0 ? 'white' : '#fb7185', marginTop: '0.25rem', fontWeight: 700 }}>
            ₪ {data ? Math.round(data.total_net_worth).toLocaleString() : '0'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Consolidated Assets & Debt (Real-time)
          </span>
        </div>

        {/* Monthly Net Savings (Option A) */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly Net Savings</span>
            {data?.is_multi_month && (
              <span style={{ fontSize: '0.7rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                Run-Rate
              </span>
            )}
          </div>
          <h2 style={{ 
            fontSize: '1.8rem', 
            color: (data?.monthly_net_savings_avg || 0) >= 0 ? '#34d399' : '#fb7185', 
            marginTop: '0.25rem',
            fontWeight: 700
          }}>
            ₪ {data ? Math.round(data.monthly_net_savings_avg).toLocaleString() : '0'}
            {data?.is_multi_month && <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#94a3b8', marginLeft: '0.25rem' }}>/mo avg</span>}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '0.1rem' }}>
            {data?.is_multi_month 
              ? `₪ ${Math.round(data.total_net_savings_period || 0).toLocaleString()} total net savings (${data.months_count} mos)`
              : (data?.target_month_label ? `Period: ${data.target_month_label}` : 'Active Savings Rate')
            }
          </span>
        </div>

        {/* Monthly Total Expenses (Option A) */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly Total Expenses</span>
            {data?.is_multi_month && (
              <span style={{ fontSize: '0.7rem', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.15)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                Run-Rate
              </span>
            )}
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#fb7185', marginTop: '0.25rem', fontWeight: 700 }}>
            ₪ {data ? Math.round(data.monthly_expenses_avg).toLocaleString() : '0'}
            {data?.is_multi_month && <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#94a3b8', marginLeft: '0.25rem' }}>/mo avg</span>}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '0.1rem' }}>
            {data?.is_multi_month 
              ? `₪ ${Math.round(data.total_expenses_period || 0).toLocaleString()} total burn (${data.months_count} mos)`
              : (data?.target_month_label ? `Period: ${data.target_month_label} (Excl. Transfers)` : 'Living Expenses')
            }
          </span>
        </div>

        {/* Portfolios XIRR */}
        <div className="glass-panel" style={{ padding: '1.25rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Portfolios XIRR (Annual)</span>
            {setActiveTab && (
              <button 
                onClick={() => setActiveTab('investments')}
                style={{ 
                  background: 'rgba(99, 102, 241, 0.15)', 
                  border: '1px solid rgba(99, 102, 241, 0.3)', 
                  color: '#818cf8', 
                  fontSize: '0.72rem', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}
              >
                View Portfolios ↗
              </button>
            )}
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#818cf8', marginTop: '0.25rem', fontWeight: 700 }}>
            {data ? data.portfolio_xirr.toFixed(2) : '0.00'} %
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {data?.portfolio_xirr ? 'Annualized Internal Rate of Return' : 'Requires Investment Account'}
          </span>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Donut Chart: Expense Cuts */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'white', margin: 0, fontWeight: 600 }}>Expense Cuts by Category</h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
                Total: ₪ {Math.round(totalExpenseSum).toLocaleString()} {data?.target_month_label ? `(${data.target_month_label})` : ''}
              </p>
            </div>
          </div>
          {expenseCuts.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              No expenses recorded in the selected period.
            </div>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={expenseCuts}
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {expenseCuts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar Chart: Cash Flow */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'white', margin: 0, fontWeight: 600 }}>
                {granularity === 'yearly' ? 'Annual Cash Flow (Yearly Inflows vs Outflows)' : 'Monthly Cash Flow (Inflows vs Outflows)'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
                Showing {monthlyCashFlow.length} {granularity === 'yearly' ? 'years' : 'months'} in period
              </p>
            </div>
          </div>
          {monthlyCashFlow.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              No cash flow logged in the selected period.
            </div>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={monthlyCashFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="period" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip content={<CustomCashflowTooltip />} />
                  <Bar dataKey="Income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
