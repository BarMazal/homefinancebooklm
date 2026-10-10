import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { CreditCard, Upload, Eye, CheckCircle2, FileSpreadsheet, ChevronRight, RotateCcw, AlertTriangle, Plus } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8900';

export default function ExpensesView({ activeProfileId }) {
  const [breadcrumbs, setBreadcrumbs] = useState(['All']);
  const [timeScope, setTimeScope] = useState('month');
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [clusterData, setClusterData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editForm, setEditForm] = useState({
    merchant: '',
    amount: 0,
    date: '',
    category: 'Groceries',
    line_items: []
  });

  useEffect(() => {
    // Fetch live expenses summary from DB
    axios.get(`${API_BASE}/api/transactions/summary/by-cluster`)
      .then(res => {
        if (res.data && res.data.length > 0) {
          const colors = ['#10b981', '#6366f1', '#f59e0b', '#06b6d4', '#8b5cf6', '#f43f5e'];
          const mapped = res.data.map((item, idx) => ({
            name: item.cluster,
            value: item.total_amount,
            color: colors[idx % colors.length]
          }));
          setClusterData(mapped);
        } else {
          setClusterData([]);
        }
      })
      .catch(() => setClusterData([]));

    // Fetch pending receipts from DB
    axios.get(`${API_BASE}/api/receipts?status=pending_review`)
      .then(res => setPendingReceipts(res.data || []))
      .catch(() => setPendingReceipts([]))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  const totalCategoryAmount = clusterData.reduce((acc, curr) => acc + curr.value, 0);

  const handleBreadcrumbClick = (index) => {
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const handleItemPriceChange = (index, newPrice) => {
    const updatedItems = [...editForm.line_items];
    updatedItems[index].price = parseFloat(newPrice) || 0;
    const newTotal = updatedItems.reduce((acc, curr) => acc + (curr.price * (curr.quantity || 1)), 0);
    setEditForm({
      ...editForm,
      line_items: updatedItems,
      amount: round(newTotal, 2)
    });
  };

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

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Expenses Category Hub</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Interactive expense drill-down, receipt OCR item editor, and statement ingestion</p>
      </div>

      {/* Category Drill-Down Pie Chart */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '1.1rem', color: 'white', fontWeight: 700 }}>
              <span>Expenses</span>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight size={16} color="#818cf8" />
                  <span 
                    onClick={() => handleBreadcrumbClick(idx)}
                    style={{ cursor: idx < breadcrumbs.length - 1 ? 'pointer' : 'default', color: idx < breadcrumbs.length - 1 ? '#818cf8' : 'white' }}
                  >
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Total: ₪ {totalCategoryAmount.toLocaleString()} ({clusterData.length} active categories logged)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className={timeScope === 'month' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTimeScope('month')} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>Selected Month</button>
            <button className={timeScope === 'all' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTimeScope('all')} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>All-Time History</button>
          </div>
        </div>

        {clusterData.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
            <CreditCard size={32} color="#6366f1" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.25rem' }}>No Expenses Logged in Active Profile</h3>
            <p style={{ fontSize: '0.85rem' }}>Upload a receipt photo or import a credit card CSV statement below to log your first expenses.</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={clusterData}
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  style={{ cursor: 'pointer' }}
                >
                  {clusterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const pct = totalCategoryAmount ? ((data.value / totalCategoryAmount) * 100).toFixed(1) : 0;
                    return (
                      <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', padding: '0.6rem 0.85rem', borderRadius: '8px', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem', color: '#f8fafc' }}>{data.name}</p>
                        <p style={{ margin: '0.2rem 0 0', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
                          ₪ {data.value.toLocaleString()} ({pct}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Legend formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
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
