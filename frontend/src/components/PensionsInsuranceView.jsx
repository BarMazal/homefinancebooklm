import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Upload, CheckCircle2, ExternalLink, 
  Plus, Search, Compass, Landmark, FileText, X 
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8900';

const STATUTORY_PORTALS = [
  {
    id: 'har_hakef',
    name: 'Har HaKesef (הר הכסף)',
    subtitle: 'Ministry of Finance Portal',
    description: 'Locate dormant bank accounts, forgotten pension pots, provident funds (קופות גמל), and deceased relative accounts.',
    url: 'https://itur.mof.gov.il/',
    color: '#38bdf8'
  },
  {
    id: 'har_habituach',
    name: 'Har HaBituach (הר הביטוח)',
    subtitle: 'Capital Market Authority',
    description: 'Centralized registry of every active and inactive insurance policy (health, life, disability, car, home) registered under your ID.',
    url: 'https://harb.cma.gov.il/',
    color: '#10b981'
  },
  {
    id: 'mislaka',
    name: 'Pension Clearinghouse (המסלקה)',
    subtitle: 'Central Pension Registry',
    description: 'Query all pension funds, managers, accumulation balances, and exact ongoing management fees across Israel.',
    url: 'https://www.swiftness.co.il/',
    color: '#818cf8'
  },
  {
    id: 'credit_data',
    name: 'Bank of Israel Credit Data (נתוני אשראי)',
    subtitle: 'Central Bank Registry',
    description: 'Download your official Credit Report (דוח ריכוז נתונים) listing all open bank loans, credit lines, and mortgages.',
    url: 'https://www.creditdata.org.il/',
    color: '#f59e0b'
  }
];

export default function PensionsInsuranceView({ activeProfileId }) {
  const [policies, setPolicies] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual entry modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    policy_name: '',
    provider: 'Menora',
    type: 'Pension',
    accumulated_balance: '',
    monthly_premium: '',
    management_fee_deposit: '',
    management_fee_accumulation: '',
    covered_amount: '',
    notes: ''
  });

  const fetchPolicies = () => {
    setLoading(true);
    axios.get(`${API_BASE}/api/pensions`)
      .then(res => setPolicies(res.data || []))
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));

    axios.get(`${API_BASE}/api/pensions/audit/duplicates`)
      .then(res => setDuplicates(res.data?.duplicates || []))
      .catch(() => setDuplicates([]));
  };

  useEffect(() => {
    fetchPolicies();
  }, [activeProfileId]);

  const handleSubmitPolicy = async (e) => {
    e.preventDefault();
    if (!formData.policy_name.trim()) {
      alert('Please enter a policy name.');
      return;
    }

    const payload = {
      policy_name: formData.policy_name.trim(),
      provider: formData.provider || 'Other',
      type: formData.type || 'Pension',
      monthly_premium: parseFloat(formData.monthly_premium) || 0.0,
      management_fee_deposit: parseFloat(formData.management_fee_deposit) || 0.0,
      management_fee_accumulation: parseFloat(formData.management_fee_accumulation) || 0.0,
      covered_amount: parseFloat(formData.covered_amount) || 0.0,
      accumulated_balance: parseFloat(formData.accumulated_balance) || 0.0,
      notes: formData.notes.trim() ? formData.notes.trim() : null
    };

    try {
      await axios.post(`${API_BASE}/api/pensions`, payload);
      setAddModalOpen(false);
      setFormData({
        policy_name: '',
        provider: 'Menora',
        type: 'Pension',
        accumulated_balance: '',
        monthly_premium: '',
        management_fee_deposit: '',
        management_fee_accumulation: '',
        covered_amount: '',
        notes: ''
      });
      fetchPolicies();
    } catch (err) {
      alert('Error saving policy.');
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header with Quick Add Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Pension & Insurance Audit Vault</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Policy metric tracking, statutory discovery links, fee benchmarking, and duplicate coverage auditing.
          </p>
        </div>

        <button 
          className="btn-primary" 
          onClick={() => setAddModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <Plus size={16} /> Log Discovered Policy
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: STATUTORY DISCOVERY PORTALS (הר הכסף / ביטוח)  */}
      {/* ======================================================== */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <Compass size={20} color="#818cf8" />
          <h3 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 600 }}>
            Official Statutory Discovery Portals (שירותי איתור ממשלתיים)
          </h3>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Locate forgotten pension pots, dormant bank accounts, and active insurance policies registered under your Israeli ID. Click to open the official portal, and log uncovered assets using the button above.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {STATUTORY_PORTALS.map(portal => (
            <div 
              key={portal.id} 
              className="glass-card" 
              style={{ 
                padding: '1.15rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                borderLeft: `4px solid ${portal.color}`, background: 'rgba(255,255,255,0.02)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{portal.name}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: portal.color, fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  {portal.subtitle}
                </span>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>
                  {portal.description}
                </p>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <a 
                  href={portal.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', 
                    fontSize: '0.8rem', textDecoration: 'none', padding: '0.45rem'
                  }}
                >
                  Open Portal <ExternalLink size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Duplicate Coverage Warning Banner */}
      {duplicates.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem', borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={24} color="#fbbf24" />
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#fbbf24', fontWeight: 600 }}>Duplicate Insurance Coverage Detected</h3>
              {duplicates.map((d, i) => (
                <p key={i} style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                  {d.message} ({d.policies.join(', ')})
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Policy Ingestion Scanner */}
      <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '0.5rem' }}>Drop Israeli Annual Report (`דוח תקופתי שנה`) or Policy PDF</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
          NotebookLM will automatically extract management fees, insured amounts, and policy terms without requiring manual form entry.
        </p>
        <button className="btn-secondary">
          <Upload size={16} /> Select Policy PDF File
        </button>
      </div>

      {/* Policies List */}
      {policies.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <ShieldCheck size={32} color="#6366f1" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.25rem' }}>No Pension or Insurance Policies Logged</h3>
          <p style={{ fontSize: '0.85rem' }}>
            Click <strong>"Log Discovered Policy"</strong> above or upload an annual report PDF to index your policies.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {policies.map((p) => {
            const hasMissingFees = p.type === 'Pension' && (!p.management_fee_deposit || !p.management_fee_accumulation);
            return (
              <div key={p.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'white', fontSize: '1.05rem' }}>{p.policy_name}</span>
                  <span className="badge badge-indigo">{p.type}</span>
                </div>

                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
                  Provider: <strong>{p.provider}</strong>
                </span>

                {hasMissingFees && (
                  <div style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '0.6rem', fontSize: '0.75rem', color: '#fbbf24' }}>
                    ⚠️ Partial Data: Missing management fees
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', margin: '0.75rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                    <span>Monthly Premium:</span>
                    <span style={{ fontWeight: 600, color: '#fb7185' }}>₪ {p.monthly_premium ? p.monthly_premium.toLocaleString() : '0'}</span>
                  </div>

                  {p.type === 'Pension' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Fee from Deposit:</span>
                        <span style={{ fontWeight: 600, color: '#fbbf24' }}>{p.management_fee_deposit || 0}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Fee from Accumulation:</span>
                        <span style={{ fontWeight: 600, color: '#fbbf24' }}>{p.management_fee_accumulation || 0}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>Accumulated Balance:</span>
                        <span style={{ fontWeight: 700, color: '#34d399' }}>₪ {p.accumulated_balance ? p.accumulated_balance.toLocaleString() : '0'}</span>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                    <span>Covered Amount:</span>
                    <span style={{ fontWeight: 600, color: '#818cf8' }}>₪ {p.covered_amount ? p.covered_amount.toLocaleString() : '0'}</span>
                  </div>

                  {p.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
                      {p.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: QUICK LOG DISCOVERED POLICY                       */}
      {/* ======================================================== */}
      {addModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div className="glass-panel" style={{ width: '560px', padding: '2rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="#818cf8" />
                <h3 style={{ fontSize: '1.2rem', color: 'white', fontWeight: 700 }}>Log Discovered Policy</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPolicy} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Policy Name * (e.g. "Menora Comprehensive Pension", "Harel Health Gold")
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.policy_name}
                  onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Provider</label>
                  <select 
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  >
                    <option value="Menora">Menora Mivtachim</option>
                    <option value="Harel">Harel</option>
                    <option value="Migdal">Migdal</option>
                    <option value="Clal">Clal Insurance</option>
                    <option value="Phoenix">The Phoenix</option>
                    <option value="Altshuler Shaham">Altshuler Shaham</option>
                    <option value="Meitav">Meitav Dash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>Policy Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  >
                    <option value="Pension">Pension</option>
                    <option value="Keren Hishtalmut">Keren Hishtalmut</option>
                    <option value="Kupat Gemel">Kupat Gemel</option>
                    <option value="Health Insurance">Health Insurance</option>
                    <option value="Life Insurance">Life Insurance</option>
                    <option value="Disability Insurance">Disability / Loss of Income</option>
                    <option value="Home Insurance">Home / Structure Insurance</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                    Accumulated Balance (₪)
                  </label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={formData.accumulated_balance}
                    onChange={(e) => setFormData({ ...formData, accumulated_balance: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                    Monthly Premium / Deposit (₪)
                  </label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={formData.monthly_premium}
                    onChange={(e) => setFormData({ ...formData, monthly_premium: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  />
                </div>
              </div>

              {formData.type === 'Pension' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                      Deposit Fee % (דמי ניהול מהפקדה)
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g. 1.5"
                      value={formData.management_fee_deposit}
                      onChange={(e) => setFormData({ ...formData, management_fee_deposit: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                      Accumulation Fee % (דמי ניהול מצבירה)
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g. 0.2"
                      value={formData.management_fee_accumulation}
                      onChange={(e) => setFormData({ ...formData, management_fee_accumulation: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Covered Amount / Insured Sum (₪)
                </label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={formData.covered_amount}
                  onChange={(e) => setFormData({ ...formData, covered_amount: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Notes / Source (e.g. "Found via Har HaBituach, policy #12345")
                </label>
                <input 
                  type="text" 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Policy to Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
