import React, { useState } from 'react';
import { Clock, AlertTriangle, Upload, CheckCircle2, Send, Building2, CreditCard } from 'lucide-react';
import axios from 'axios';

const uploadStatusList = [
  { id: 1, name: 'Bank Leumi Main', type: 'Bank', status: 'ok', lastUpload: '2 days ago', targetDate: 'Oct 2026' },
  { id: 2, name: 'Isracard Executive', type: 'Credit Card', status: 'warning', lastUpload: '18 days ago', targetDate: 'Sep 2026' },
  { id: 3, name: 'Max Platinum Card', type: 'Credit Card', status: 'missing', lastUpload: '34 days ago (Sep Missing)', targetDate: 'Sep 2026' },
  { id: 4, name: 'Altshuler Pension', type: 'Pension', status: 'ok', lastUpload: 'Weekly Sync', targetDate: 'Oct 2026' },
  { id: 5, name: 'Receipts Vault', type: 'Receipts', status: 'warning', lastUpload: '12 days ago', targetDate: 'Oct 2026' },
];

export default function RemindersView() {
  const [selectedAccountId, setSelectedAccountId] = useState(3); // default to missing card
  const selectedAccount = uploadStatusList.find(a => a.id === selectedAccountId) || uploadStatusList[0];

  const handleUpdateStatement = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    alert(`Statement uploaded and processed for ${selectedAccount.name}!`);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Reminders & Upload Cadence Hub</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Monitor statement freshness per account and trigger updates when review is due</p>
      </div>

      {/* Account Status Tabs / Bubbles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {uploadStatusList.map((item) => {
          const isSelected = item.id === selectedAccountId;
          return (
            <div 
              key={item.id} 
              onClick={() => setSelectedAccountId(item.id)}
              className="glass-card" 
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-glass)',
                background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.5)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{item.name}</span>
                <span className={
                  item.status === 'ok' ? 'badge badge-emerald' :
                  item.status === 'warning' ? 'badge badge-amber' : 'badge badge-rose'
                }>
                  {item.status === 'ok' ? 'OK' : item.status === 'warning' ? 'Review Due' : 'Missing'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.lastUpload}</span>
            </div>
          );
        })}
      </div>

      {/* Active Account Update Canvas Widget */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: 'white', fontWeight: 700 }}>
              Update Statement: {selectedAccount.name}
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Target Period: {selectedAccount.targetDate} | Account Type: {selectedAccount.type}
            </span>
          </div>
          <span className={
            selectedAccount.status === 'ok' ? 'badge badge-emerald' : 'badge badge-rose'
          }>
            {selectedAccount.status === 'ok' ? 'Up to date' : 'Statement Upload Overdue'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px' }}>
          <input type="file" id="cadence-upload" accept=".csv,.pdf,.png,.jpg" onChange={handleUpdateStatement} style={{ display: 'none' }} />
          <label htmlFor="cadence-upload" style={{ cursor: 'pointer' }}>
            <Upload size={32} color="#818cf8" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.35rem' }}>
              Upload {selectedAccount.targetDate} Statement for {selectedAccount.name}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Accepts CSV, Excel, PDF statements or receipt photos. Automatically updates account balance & transactions.
            </p>
          </label>
        </div>
      </div>
    </div>
  );
}
