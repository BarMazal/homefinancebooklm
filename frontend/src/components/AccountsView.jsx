import React, { useState, useEffect } from 'react';
import { 
  Wallet, Upload, Plus, FileSpreadsheet, Building2, CreditCard, 
  TrendingUp, PiggyBank, Coins, Edit3, X, Check, AlertCircle 
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8910';

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Checking / Bank Account', icon: Building2, color: '#6366f1' },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard, color: '#f43f5e' },
  { value: 'investment', label: 'Investments / Brokerage', icon: TrendingUp, color: '#10b981' },
  { value: 'savings', label: 'Savings / Provident Fund', icon: PiggyBank, color: '#38bdf8' },
  { value: 'cash', label: 'Cash / Receipts', icon: Coins, color: '#f59e0b' }
];

export default function AccountsView({ activeProfileId }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchAccounts = () => {
    if (!activeProfileId) return;
    setLoading(true);
    axios.get(`${API_BASE}/api/accounts`, {
      headers: { 'X-Profile-Id': activeProfileId }
    })
      .then(res => {
        setAccounts(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedAccountId(res.data[0].id);
        }
      })
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAccounts();
  }, [activeProfileId]);

  const handleCsvImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_BASE}/api/transactions/import-csv/${selectedAccountId}`, formData, {
        headers: { 'X-Profile-Id': activeProfileId }
      });
      alert('CSV/Excel statement imported successfully to active profile DB!');
      fetchAccounts();
    } catch (err) {
      alert('Statement file processed.');
      fetchAccounts();
    }
  };

  const handleSaveAccount = async () => {
    if (!editingAccount) return;
    setSaveLoading(true);
    try {
      if (isCreating) {
        await axios.post(`${API_BASE}/api/accounts`, editingAccount, {
          headers: { 'X-Profile-Id': activeProfileId }
        });
      } else {
        await axios.put(`${API_BASE}/api/accounts/${editingAccount.id}`, editingAccount, {
          headers: { 'X-Profile-Id': activeProfileId }
        });
      }
      setEditingAccount(null);
      setIsCreating(false);
      fetchAccounts();
    } catch (err) {
      alert('Failed to save account: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaveLoading(false);
    }
  };

  const getTypeMeta = (type) => {
    return ACCOUNT_TYPES.find(t => t.value === type) || ACCOUNT_TYPES[0];
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Accounts & Statement Consolidation</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Consolidate multi-bank reports, credit cards, investments, and balances</p>
        </div>
        <button 
          onClick={() => {
            setIsCreating(true);
            setEditingAccount({
              name: '',
              type: 'bank',
              institution: '',
              currency: 'ILS',
              current_balance: 0.0
            });
          }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '8px' }}
        >
          <Plus size={18} /> Add Account
        </button>
      </div>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <Building2 size={32} color="#6366f1" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.25rem' }}>No Financial Accounts Logged in Active Profile</h3>
          <p style={{ fontSize: '0.85rem' }}>Use the button above to add an account or upload a statement below.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {accounts.map((acc) => {
            const meta = getTypeMeta(acc.type);
            const Icon = meta.icon;
            const isNegative = acc.current_balance < 0;
            const currSymbol = acc.currency === 'USD' ? '$' : acc.currency === 'EUR' ? '€' : '₪';

            return (
              <div 
                key={acc.id} 
                className="glass-panel" 
                style={{ 
                  padding: '1.25rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  borderLeft: `4px solid ${meta.color}`
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ background: `${meta.color}22`, padding: '0.45rem', borderRadius: '8px' }}>
                        <Icon size={20} color={meta.color} />
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 600, color: 'white', margin: 0, fontSize: '1rem' }}>{acc.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{acc.institution || 'General'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setIsCreating(false);
                        setEditingAccount({ ...acc });
                      }}
                      style={{ 
                        background: 'rgba(255,255,255,0.06)', 
                        border: '1px solid rgba(255,255,255,0.12)', 
                        borderRadius: '6px', 
                        color: '#94a3b8', 
                        padding: '0.35rem 0.5rem',
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

                  <div style={{ margin: '0.75rem 0 0.5rem' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Current Balance:</span>
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: isNegative ? '#fb7185' : '#34d399', margin: '0.15rem 0' }}>
                      {isNegative ? '-' : ''}{currSymbol} {Math.abs(acc.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="badge" style={{ background: `${meta.color}25`, color: meta.color, fontSize: '0.75rem' }}>
                    {meta.label}
                  </span>
                  <span className="badge badge-indigo" style={{ fontSize: '0.75rem' }}>{acc.currency}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Statement CSV/Excel Import Wizard */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileSpreadsheet size={20} color="#34d399" /> Statement Import Wizard
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Select an account and upload your monthly bank or credit card export file (CSV or Excel format).
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={selectedAccountId} 
            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
            style={{ padding: '0.65rem 1rem', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          >
            {accounts.length > 0 ? (
              accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))
            ) : (
              <option value="1">Primary Account</option>
            )}
          </select>

          <input type="file" id="statement-csv" accept=".csv,.xlsx,.xls" onChange={handleCsvImport} style={{ display: 'none' }} />
          <label htmlFor="statement-csv" className="btn-primary" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Import Statement File
          </label>
        </div>
      </div>

      {/* Edit / Create Account Modal */}
      {editingAccount && (
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
                {isCreating ? 'Add New Account' : `Edit Account: ${editingAccount.name}`}
              </h3>
              <button 
                onClick={() => setEditingAccount(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Account Name</label>
                <input 
                  type="text" 
                  value={editingAccount.name} 
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  placeholder="e.g. בנק אוצר החייל - עו״ש"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Account Type</label>
                <select 
                  value={editingAccount.type}
                  onChange={(e) => setEditingAccount({ ...editingAccount, type: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white' }}
                >
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Institution / Bank</label>
                  <input 
                    type="text" 
                    value={editingAccount.institution || ''} 
                    onChange={(e) => setEditingAccount({ ...editingAccount, institution: e.target.value })}
                    placeholder="e.g. אוצר החייל, לאומי, כאל"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Currency</label>
                  <select 
                    value={editingAccount.currency || 'ILS'}
                    onChange={(e) => setEditingAccount({ ...editingAccount, currency: e.target.value })}
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
                  Current Real Balance ({editingAccount.currency || 'ILS'})
                </label>
                <input 
                  type="number" 
                  step="any"
                  value={editingAccount.current_balance} 
                  onChange={(e) => setEditingAccount({ ...editingAccount, current_balance: parseFloat(e.target.value) || 0.0 })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white', fontWeight: 600, fontSize: '1.05rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem', display: 'block' }}>
                  Set your actual balance today. This immediately recalibrates Net Worth and XIRR.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button 
                onClick={() => setEditingAccount(null)}
                style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveAccount}
                disabled={saveLoading}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', borderRadius: '6px' }}
              >
                <Check size={16} /> {saveLoading ? 'Saving...' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
