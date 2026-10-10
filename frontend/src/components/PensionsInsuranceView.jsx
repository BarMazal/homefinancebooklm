import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, FileText, CheckCircle2, Upload, AlertCircle } from 'lucide-react';

export default function PensionsInsuranceView() {
  const [policies, setPolicies] = useState([
    { id: 1, name: 'Main Pension Fund', provider: 'Altshuler Shaham', type: 'Pension', feeDeposit: 1.2, feeAccum: 0.15, premium: 1850, balance: 420000, coverage: 1500000 },
    { id: 2, name: 'Executive Life Insurance', provider: 'Clal Insurance', type: 'Life Insurance', feeDeposit: 0.0, feeAccum: 0.0, premium: 240, balance: 0, coverage: 1000000 },
    { id: 3, name: 'Workplace Life Policy', provider: 'Harel Insurance', type: 'Life Insurance', feeDeposit: 0.0, feeAccum: 0.0, premium: 180, balance: 0, coverage: 800000 },
    { id: 4, name: 'Private Health Policy', provider: 'Menora Mivtachim', type: 'Health Insurance', feeDeposit: 0.0, feeAccum: 0.0, premium: 320, balance: 0, coverage: 500000 }
  ]);

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Pension & Insurance Audit Vault</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Automated policy metric extraction, fee analysis, and duplicate coverage detector for non-experts</p>
      </div>

      {/* Duplicate Coverage Warning Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={24} color="#fbbf24" />
          <div>
            <h3 style={{ fontSize: '1.05rem', color: '#fbbf24', fontWeight: 600 }}>Duplicate Insurance Coverage Detected</h3>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              You have 2 active <strong>Life Insurance</strong> policies (Clal + Harel). Review combined premiums (₪420/mo) to eliminate redundant double coverage.
            </p>
          </div>
        </div>
      </div>

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {policies.map((p) => (
          <div key={p.id} className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, color: 'white', fontSize: '1.05rem' }}>{p.name}</span>
              <span className="badge badge-indigo">{p.type}</span>
            </div>

            <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>Provider: {p.provider}</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', margin: '0.75rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Monthly Premium:</span>
                <span style={{ fontWeight: 600, color: '#fb7185' }}>₪ {p.premium.toLocaleString()}</span>
              </div>

              {p.type === 'Pension' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                    <span>Fee from Deposit:</span>
                    <span style={{ fontWeight: 600, color: '#fbbf24' }}>{p.feeDeposit}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                    <span>Fee from Accumulation:</span>
                    <span style={{ fontWeight: 600, color: '#fbbf24' }}>{p.feeAccum}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                    <span>Accumulated Balance:</span>
                    <span style={{ fontWeight: 700, color: '#34d399' }}>₪ {p.balance.toLocaleString()}</span>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Covered Amount:</span>
                <span style={{ fontWeight: 600, color: '#818cf8' }}>₪ {p.coverage.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
