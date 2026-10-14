import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, RefreshCw, HelpCircle, CheckCircle2, Building2, Plus, Edit3, X, Check, Wallet 
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8910';

export default function InvestmentsView({ fxRate, activeProfileId }) {
  const [kidsDeposit, setKidsDeposit] = useState(1000);
  const [returnRate, setReturnRate] = useState(7.5);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchSummary = () => {
    if (!activeProfileId) return;
    setLoading(true);
    axios.get(`${API_BASE}/api/xirr/portfolio-summary`, {
      headers: { 'X-Profile-Id': activeProfileId }
    })
      .then(res => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [activeProfileId]);

  const totalValuation = summary?.total_valuation || 0;
  const cumulativeGains = summary?.cumulative_gains || 0;
  const xirrAnnual = summary?.xirr_annual_percentage || 0;
  const xirrData = summary?.history || [];
  const portfolios = summary?.portfolios || [];

  const handleSavePortfolio = async () => {
    if (!editingPortfolio) return;
    setSaveLoading(true);
    try {
      if (isCreating) {
        await axios.post(`${API_BASE}/api/accounts`, {
          ...editingPortfolio,
          type: 'investment'
        }, {
          headers: { 'X-Profile-Id': activeProfileId }
        });
      } else {
        await axios.put(`${API_BASE}/api/accounts/${editingPortfolio.id}`, editingPortfolio, {
          headers: { 'X-Profile-Id': activeProfileId }
        });
      }
      setEditingPortfolio(null);
      setIsCreating(false);
      fetchSummary();
    } catch (err) {
      alert('Failed to save portfolio: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaveLoading(false);
    }
  };

  const calculateKids18Years = () => {
    let balance = totalValuation > 0 ? 5000 : 0;
    const rate = returnRate / 100 / 12;
    for (let i = 0; i < 18 * 12; i++) {
      balance = (balance + kidsDeposit) * (1 + rate);
    }
    return Math.round(balance);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Savings & Investments Hub</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Consolidated brokerages, dynamic XIRR performance, and portfolio balance allocation
          </p>
        </div>
        <button 
          onClick={() => {
            setIsCreating(true);
            setEditingPortfolio({
              name: '',
              institution: '',
              type: 'investment',
              currency: 'ILS',
              current_balance: 0.0
            });
          }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '8px' }}
        >
          <Plus size={18} /> Add Portfolio / Broker
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Portfolio Valuation</span>
          <h2 style={{ fontSize: '1.8rem', color: '#34d399', marginTop: '0.25rem' }}>
            ₪ {totalValuation.toLocaleString()}
          </h2>
          <span style={{ fontSize: '0.75rem', color: cumulativeGains > 0 ? '#34d399' : '#94a3b8' }}>
            {cumulativeGains > 0 ? `₪ ${cumulativeGains.toLocaleString()} cumulative gains` : `${portfolios.length} active brokerage accounts`}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Portfolio XIRR (Annual)</span>
          <h2 style={{ fontSize: '1.8rem', color: xirrAnnual !== 0 ? '#818cf8' : '#94a3b8', marginTop: '0.25rem' }}>
            {xirrAnnual > 0 ? `+${xirrAnnual.toFixed(2)} %` : `${xirrAnnual.toFixed(2)} %`}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {xirrAnnual !== 0 ? 'Internal Rate of Return (Cashflows)' : 'Computed from cashflows & valuations'}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Active Brokerages & Portfolios</span>
          <h2 style={{ fontSize: '1.8rem', color: 'white', marginTop: '0.25rem' }}>
            {portfolios.length} Accounts
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
            Psagot, IBKR, Colmex, Leumi Securities
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Per-Broker USD/ILS Rates</span>
          <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>IBKR / US Assets:</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>₪ {fxRate ? fxRate.toFixed(2) : '3.65'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
              <span style={{ color: '#94a3b8' }}>Bank FX Spread:</span>
              <span style={{ fontWeight: 700, color: '#818cf8' }}>₪ {(fxRate ? fxRate + 0.04 : 3.69).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Portfolios Grid */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={20} color="#10b981" /> Active Investment & Brokerage Portfolios
        </h3>
        {portfolios.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
            No investment portfolios found. Click "+ Add Portfolio / Broker" above to configure your accounts.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {portfolios.map((p) => {
              const isUsd = p.currency === 'USD';
              const currSymbol = isUsd ? '$' : '₪';

              return (
                <div 
                  key={p.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '1.25rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    borderLeft: '4px solid #10b981'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h4 style={{ fontWeight: 600, color: 'white', margin: 0, fontSize: '1.05rem' }}>{p.name}</h4>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.institution}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setIsCreating(false);
                          setEditingPortfolio({ ...p, current_balance: p.balance });
                        }}
                        style={{ 
                          background: 'rgba(255,255,255,0.06)', 
                          border: '1px solid rgba(255,255,255,0.12)', 
                          borderRadius: '6px', 
                          color: '#94a3b8', 
                          padding: '0.3rem 0.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem'
                        }}
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                    </div>

                    <div style={{ margin: '0.75rem 0' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Valuation (Origin):</span>
                      <h2 style={{ fontSize: '1.4rem', color: '#34d399', margin: '0.15rem 0' }}>
                        {currSymbol} {p.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h2>
                      {isUsd && (
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                          ≈ ₪ {p.balance_ils.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.75rem' }}>
                      Active Portfolio
                    </span>
                    <span className="badge badge-indigo" style={{ fontSize: '0.75rem' }}>{p.currency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Portfolio Growth Area Chart */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1rem' }}>Portfolio Valuation vs Cash Deposited</h3>
        {xirrData.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
            <TrendingUp size={32} color="#6366f1" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.25rem' }}>No Investment Cashflow Logged</h3>
            <p style={{ fontSize: '0.85rem' }}>Upload brokerage statements or use the wizard below to log investments.</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={xirrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="Balance" stroke="#34d399" fill="rgba(16, 185, 129, 0.2)" name="Portfolio Valuation" />
                <Area type="monotone" dataKey="Deposited" stroke="#6366f1" fill="rgba(99, 102, 241, 0.1)" name="Cash Invested" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Kids Savings 18-Year Compound Simulator */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem' }}>Kids' Savings 18-Year Growth Simulator</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Adjust monthly deposit and annual return sliders to project wealth at age 18.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Monthly Deposit (₪): {kidsDeposit}
            </label>
            <input 
              type="range" min="200" max="5000" step="100"
              value={kidsDeposit} onChange={(e) => setKidsDeposit(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Expected Annual Return (%): {returnRate}%
            </label>
            <input 
              type="range" min="3" max="12" step="0.5"
              value={returnRate} onChange={(e) => setReturnRate(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Projected Age 18 Wealth:</span>
            <h2 style={{ fontSize: '1.6rem', color: '#fbbf24', marginTop: '0.25rem' }}>₪ {calculateKids18Years().toLocaleString()}</h2>
          </div>
        </div>
      </div>

      {/* Edit / Create Portfolio Modal */}
      {editingPortfolio && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                {isCreating ? 'Add Investment Portfolio' : `Edit: ${editingPortfolio.name}`}
              </h3>
              <button 
                onClick={() => setEditingPortfolio(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Portfolio / Broker Name</label>
                <input 
                  type="text" 
                  value={editingPortfolio.name} 
                  onChange={(e) => setEditingPortfolio({ ...editingPortfolio, name: e.target.value })}
                  placeholder="e.g. פסגות, אינטראקטיב ברוקרס, קולמקס"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Institution</label>
                  <input 
                    type="text" 
                    value={editingPortfolio.institution || ''} 
                    onChange={(e) => setEditingPortfolio({ ...editingPortfolio, institution: e.target.value })}
                    placeholder="e.g. Psagot, IBKR"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Currency</label>
                  <select 
                    value={editingPortfolio.currency || 'ILS'}
                    onChange={(e) => setEditingPortfolio({ ...editingPortfolio, currency: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white' }}
                  >
                    <option value="ILS">₪ ILS</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                  Current Portfolio Valuation ({editingPortfolio.currency || 'ILS'})
                </label>
                <input 
                  type="number" 
                  step="any"
                  value={editingPortfolio.current_balance} 
                  onChange={(e) => setEditingPortfolio({ ...editingPortfolio, current_balance: parseFloat(e.target.value) || 0.0 })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white', fontWeight: 600, fontSize: '1.05rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button 
                onClick={() => setEditingPortfolio(null)}
                style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePortfolio}
                disabled={saveLoading}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', borderRadius: '6px' }}
              >
                <Check size={16} /> {saveLoading ? 'Saving...' : 'Save Portfolio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
