import React, { useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { CreditCard, Upload, Eye, CheckCircle2, FileSpreadsheet, ChevronRight, RotateCcw, AlertTriangle } from 'lucide-react';
import axios from 'axios';

// Hierarchical Category Drill-Down Structure
const categoryData = {
  All: [
    { name: 'Groceries & Supermarket', value: 4200, color: '#10b981', subKey: 'Groceries' },
    { name: 'Housing & Utilities', value: 5800, color: '#6366f1', subKey: 'Housing' },
    { name: 'Kids & Education', value: 3100, color: '#f59e0b', subKey: 'Kids' },
    { name: 'Car & Transport', value: 2400, color: '#06b6d4', subKey: 'Transport' },
    { name: 'Dining & Entertainment', value: 1800, color: '#f43f5e', subKey: 'Entertainment' }
  ],
  Groceries: [
    { name: 'Supermarket Chains (Shufersal/Rami Levy)', value: 2400, color: '#34d399', subKey: 'Supermarket' },
    { name: 'Fresh Produce & Vegetables', value: 1100, color: '#059669', subKey: 'Vegetables' },
    { name: 'Pharm & Beauty (Super-Pharm)', value: 700, color: '#6ee7b7', subKey: 'Pharm' }
  ],
  Vegetables: [
    { name: 'Tomatoes & Cucumbers', value: 420, color: '#10b981' },
    { name: 'Avocado & Salad Greens', value: 380, color: '#047857' },
    { name: 'Organic Fruits', value: 300, color: '#6ee7b7' }
  ],
  Housing: [
    { name: 'Electricity (Chavrat Chashmal)', value: 1400, color: '#818cf8' },
    { name: 'City Tax (Arnona)', value: 2200, color: '#4f46e5' },
    { name: 'Water & Gas (Pazgas)', value: 650, color: '#a5b4fc' },
    { name: 'Internet & Building Mgmt (Vaad)', value: 1550, color: '#312e81' }
  ],
  Kids: [
    { name: 'Daycare & Kindergarten', value: 2200, color: '#fbbf24' },
    { name: 'Extracurricular Chugim', value: 650, color: '#d97706' },
    { name: 'Clothing & Toys', value: 250, color: '#f59e0b' }
  ]
};

export default function ExpensesView({ isCleanProfile }) {
  // Drill-down breadcrumbs
  const [breadcrumbs, setBreadcrumbs] = useState(['All']);
  const [timeScope, setTimeScope] = useState('month'); // month, all, average

  // Receipt Vault State
  const [pendingReceipts, setPendingReceipts] = useState(isCleanProfile ? [] : [
    {
      id: 1,
      file_path: 'temp_shufersal_receipt.jpg',
      merchant: 'Shufersal Deal Tel Aviv',
      amount: 345.80,
      date: '2026-10-08',
      category: 'Groceries',
      confidence_scores: { merchant: 0.95, amount: 0.82, date: 0.98 },
      line_items: [
        { id: 1, item: 'Organic Milk 3%', price: 14.90, quantity: 1 },
        { id: 2, item: 'Whole Grain Bread', price: 18.50, quantity: 1 },
        { id: 3, item: 'Fresh Salmon Fillet', price: 89.00, quantity: 1 }
      ],
      status: 'pending_review'
    }
  ]);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editForm, setEditForm] = useState({
    merchant: '',
    amount: 0,
    date: '',
    category: 'Groceries',
    line_items: []
  });

  const currentLevel = breadcrumbs[breadcrumbs.length - 1];
  const currentChartData = categoryData[currentLevel] || categoryData['All'];
  const totalCategoryAmount = currentChartData.reduce((acc, curr) => acc + curr.value, 0);

  const handlePieClick = (entry) => {
    if (entry && entry.subKey && categoryData[entry.subKey]) {
      setBreadcrumbs([...breadcrumbs, entry.subKey]);
    }
  };

  const handleBreadcrumbClick = (index) => {
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  // Receipt item price edit -> auto updates total amount!
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

  const handleConfirmReceipt = () => {
    if (!selectedReceipt) return;
    setPendingReceipts(prev => prev.filter(r => r.id !== selectedReceipt.id));
    setSelectedReceipt(null);
    alert('Receipt confirmed! Total updated from itemized line items.');
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Expenses Category Hub</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Interactive expense drill-down, receipt OCR item editor, and statement statement ingestion</p>
      </div>

      {/* Interactive Category Drill-Down Pie Chart */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            {/* Dynamic Breadcrumb Header Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '1.1rem', color: 'white', fontWeight: 700 }}>
              <span>Expenses</span>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight size={16} color="#818cf8" />
                  <span 
                    onClick={() => handleBreadcrumbClick(idx)}
                    style={{ cursor: idx < breadcrumbs.length - 1 ? 'pointer' : 'default', color: idx < breadcrumbs.length - 1 ? '#818cf8' : 'white', textDecoration: idx < breadcrumbs.length - 1 ? 'underline' : 'none' }}
                  >
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Total: ₪ {totalCategoryAmount.toLocaleString()} ({currentChartData.length} sub-categories) — Click slice to drill down
            </span>
          </div>

          {/* Time Scope Controls */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className={timeScope === 'month' ? 'btn-primary' : 'btn-secondary'} 
              onClick={() => setTimeScope('month')}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              Selected Month (Oct 2026)
            </button>
            <button 
              className={timeScope === 'all' ? 'btn-primary' : 'btn-secondary'} 
              onClick={() => setTimeScope('all')}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              All-Time History
            </button>
            <button 
              className={timeScope === 'average' ? 'btn-primary' : 'btn-secondary'} 
              onClick={() => setTimeScope('average')}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              Monthly Average
            </button>
            {breadcrumbs.length > 1 && (
              <button className="btn-secondary" onClick={() => setBreadcrumbs(['All'])} style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Donut Chart with Category Name & Percentage Hover Tooltip */}
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={currentChartData}
                innerRadius={70}
                outerRadius={105}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                onClick={handlePieClick}
                style={{ cursor: 'pointer' }}
              >
                {currentChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const pct = ((data.value / (totalCategoryAmount || 1)) * 100).toFixed(1);
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
      </div>

      {/* Receipt Vault & OCR Item Editor */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard size={20} color="#34d399" /> Receipt Vault & Full Line-Item Editor
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Review OCR extractions, edit individual line item names/prices (auto-updates receipt total), and confirm to DB.
        </p>

        {pendingReceipts.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
            No pending receipts for review in active profile! Upload new receipt image or PDF below.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {pendingReceipts.map(rcpt => (
              <div key={rcpt.id} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'white' }}>{rcpt.merchant}</span>
                  <span style={{ fontWeight: 700, color: '#34d399' }}>₪ {rcpt.amount.toFixed(2)}</span>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    setSelectedReceipt(rcpt);
                    setEditForm({
                      merchant: rcpt.merchant,
                      amount: rcpt.amount,
                      date: rcpt.date,
                      category: rcpt.category,
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

      {/* Full Line-Item Editor Modal */}
      {selectedReceipt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '2rem'
        }}>
          <div className="glass-panel" style={{ width: '750px', maxWidth: '95%', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '0.5rem' }}>Itemized Receipt Editor & Verification</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Edit item prices or names to correct garbled OCR text. The total amount updates automatically.
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
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Computed Total Amount (₪)</label>
                <input 
                  type="number" 
                  value={editForm.amount} 
                  readOnly
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#34d399', fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Itemized Table */}
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', display: 'block', marginBottom: '0.5rem' }}>Itemized Line Items Table:</span>
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              {editForm.line_items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={item.item} 
                    onChange={(e) => {
                      const updated = [...editForm.line_items];
                      updated[idx].item = e.target.value;
                      setEditForm({...editForm, line_items: updated});
                    }}
                    style={{ flex: 1, padding: '0.45rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem' }}
                  />
                  <input 
                    type="number" 
                    step="0.10"
                    value={item.price} 
                    onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                    style={{ width: '120px', padding: '0.45rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#34d399', fontWeight: 600, fontSize: '0.85rem' }}
                  />
                </div>
              ))}
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
