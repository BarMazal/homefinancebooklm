import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Wallet, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

const expenseCuts = [
  { name: 'Groceries & Supermarket', value: 4200, color: '#10b981' },
  { name: 'Housing & Utilities', value: 5800, color: '#6366f1' },
  { name: 'Kids & Education', value: 3100, color: '#f59e0b' },
  { name: 'Car & Transport', value: 2400, color: '#06b6d4' },
  { name: 'Pensions & Insurance', value: 3900, color: '#8b5cf6' },
  { name: 'Dining & Entertainment', value: 1800, color: '#f43f5e' }
];

const monthlyCashFlow = [
  { month: 'May', Income: 32000, Expense: 21200 },
  { month: 'Jun', Income: 32000, Expense: 22800 },
  { month: 'Jul', Income: 34500, Expense: 20500 },
  { month: 'Aug', Income: 32000, Expense: 23100 },
  { month: 'Sep', Income: 32000, Expense: 21900 },
  { month: 'Oct', Income: 35000, Expense: 21200 }
];

const uploadStatus = [
  { name: 'Bank Leumi Main', status: 'ok', lastUpload: '2 days ago' },
  { name: 'Isracard Credit', status: 'warning', lastUpload: '18 days ago' },
  { name: 'Max Executive Card', status: 'missing', lastUpload: '34 days ago (Sep Missing)' },
  { name: 'Altshuler Pension', status: 'ok', lastUpload: 'Weekly' },
  { name: 'Receipts Vault', status: 'warning', lastUpload: '12 days ago' },
];

export default function DashboardView({ fxRate }) {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Financial Control Tower</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Overview of household cashflow, accounts, expense cuts, and upload status</p>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem' }}>
          <RefreshCw size={16} color="#34d399" />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>USD / ILS FX:</span>
          <span style={{ fontWeight: 700, color: '#34d399', fontSize: '1.05rem' }}>₪ {fxRate ? fxRate.toFixed(2) : '3.65'}</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Net Worth</span>
          <h2 style={{ fontSize: '1.8rem', color: 'white', marginTop: '0.25rem' }}>₪ 1,450,000</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#34d399', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            <ArrowUpRight size={14} /> +4.2% this quarter
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly Net Savings</span>
          <h2 style={{ fontSize: '1.8rem', color: '#34d399', marginTop: '0.25rem' }}>₪ 13,800</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#34d399', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            <ArrowUpRight size={14} /> 39.4% savings rate
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly Total Expenses</span>
          <h2 style={{ fontSize: '1.8rem', color: '#fb7185', marginTop: '0.25rem' }}>₪ 21,200</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fb7185', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            <ArrowDownRight size={14} /> -3.1% vs last month
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Portfolios XIRR (Annual)</span>
          <h2 style={{ fontSize: '1.8rem', color: '#818cf8', marginTop: '0.25rem' }}>8.65 %</h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Weighted 4 Savings + Stocks</span>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Donut Chart: Expense Cuts */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1rem' }}>Expense Cuts by Category</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={expenseCuts}
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseCuts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val) => [`₪ ${val.toLocaleString()}`, 'Amount']} 
                  contentStyle={{ background: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Monthly Income vs Expenses */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1rem' }}>Monthly Cash Flow (Income vs Expenses)</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyCashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upload Cadence & Reminders Matrix */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1.1rem', color: 'white' }}>Upload Cadence & Statement Reminders</h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Automated Telegram Alerts Active</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {uploadStatus.map((item, idx) => (
            <div key={idx} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', display: 'block' }}>{item.name}</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.lastUpload}</span>
              </div>
              <span className={
                item.status === 'ok' ? 'badge badge-emerald' :
                item.status === 'warning' ? 'badge badge-amber' : 'badge badge-rose'
              }>
                {item.status === 'ok' ? 'Up to date' : item.status === 'warning' ? 'Review Due' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
