import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Upload, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8900';

export default function PensionsInsuranceView({ activeProfileId }) {
  const [policies, setPolicies] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/api/pensions`)
      .then(res => setPolicies(res.data || []))
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));

    axios.get(`${API_BASE}/api/pensions/audit/duplicates`)
      .then(res => setDuplicates(res.data?.duplicates || []))
      .catch(() => setDuplicates([]));
  }, [activeProfileId]);

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Pension & Insurance Audit Vault</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Automated policy metric extraction, fee analysis, and duplicate coverage detector for non-experts</p>
      </div>

      {/* Duplicate Coverage Warning Banner */}
      {duplicates.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem', borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={24} color="#fbbf24" />
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#fbbf24', fontWeight: 600 }}>Duplicate Insurance Coverage Detected</h3>
              {duplicates.map((d, i) => (
                <p key={i} style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
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
          <p style={{ fontSize: '0.85rem' }}>Upload an annual report PDF above to scan and index your policy metrics into active profile.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {policies.map((p) => (
            <div key={p.id} className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: 'white', fontSize: '1.05rem' }}>{p.policy_name}</span>
                <span className="badge badge-indigo">{p.type}</span>
              </div>

              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>Provider: {p.provider}</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', margin: '0.75rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span>Monthly Premium:</span>
                  <span style={{ fontWeight: 600, color: '#fb7185' }}>₪ {p.monthly_premium ? p.monthly_premium.toLocaleString() : '0'}</span>
                </div>

                {p.type === 'Pension' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>Fee from Deposit:</span>
                      <span style={{ fontWeight: 600, color: '#fbbf24' }}>{p.management_fee_deposit}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>Fee from Accumulation:</span>
                      <span style={{ fontWeight: 600, color: '#fbbf24' }}>{p.management_fee_accumulation}%</span>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
