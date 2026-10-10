import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Wallet, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, FolderPlus, Upload } from 'lucide-react';

const demoExpenseCuts = [
  { name: 'Groceries & Supermarket', value: 4200, color: '#10b981' },
  { name: 'Housing & Utilities', value: 5800, color: '#6366f1' },
  { name: 'Kids & Education', value: 3100, color: '#f59e0b' },
  { name: 'Car & Transport', value: 2400, color: '#06b6d4' },
  { name: 'Pensions & Insurance', value: 3900, color: '#8b5cf6' },
  { name: 'Dining & Entertainment', value: 1800, color: '#f43f5e' }
];

const demoMonthlyCashFlow = [
  { month: 'May', Income: 32000, Expense: 21200 },
  { month: 'Jun', Income: 32000, Expense: 22800 },
  { month: 'Jul', Income: 34500, Expense: 20500 },
  { month: 'Aug', Income: 32000, Expense: 23100 },
  { month: 'Sep', Income: 32000, Expense: 21900 },
  { month: 'Oct', Income: 35000, Expense: 21200 }
];

const demoUploadStatus = [
  { name: 'Bank Leumi Main', status: 'ok', lastUpload: '2 days ago' },
  { name: 'Isracard Credit', status: 'warning', lastUpload: '18 days ago' },
  { name: 'Max Executive Card', status: 'missing', lastUpload: '34 days ago (Sep Missing)' },
  { name: 'Altshuler Pension', status: 'ok', lastUpload: 'Weekly' },
  { name: 'Receipts Vault', status: 'warning', lastUpload: '12 days ago' },
];

export default function DashboardView({ fxRate, isCleanProfile }) {
  const expenseCuts = isCleanProfile ? [] : demoExpenseCuts;
  const monthlyCashFlow = isCleanProfile ? [] : demoMonthlyCashFlow;
  const uploadStatus = isCleanProfile ? [] : demoUploadStatus;

  const totalExpenseSum = expenseCuts.reduce((acc, curr) => acc + curr.value, 0);

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalExpenseSum ? ((data.value / totalExpenseSum) * 100).toFixed(1) : 0;
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
  };

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

      {isCleanProfile && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderColor: '#6366f1', background: 'rgba(99, 102, 241, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FolderPlus size={24} color="#818cf8" />
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'white', fontWeight: 600 }}>Clean Slate Profile Active</h3>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                This profile has no transactions yet. Go to <strong>Settings & Auth</strong> to run <strong>"Scan NotebookLM History"</strong>, or use <strong>Expenses Hub</strong> to upload receipts/statements!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Net Worth</span>
          <h2 style={{ fontSize: '1.8rem', color: 'white', marginTop: '0.25rem' }}>
            {isCleanProfile ? '₪ 0' : '₪ 1,450,000'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isCleanProfile ? 'Awaiting Data Import' : 'Consolidated Assets'}</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly Net Savings</span>
          <h2 style={{ fontSize: '1.8rem', color: '#34d399', marginTop: '0.25rem' }}>
            {isCleanProfile ? '₪ 0' : '₪ 13,800'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#34d399' }}>{isCleanProfile ? '0% savings rate' : '39.4% savings rate'}</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly Total Expenses</span>
          <h2 style={{ fontSize: '1.8rem', color: '#fb7185', marginTop: '0.25rem' }}>
            {isCleanProfile ? '₪ 0' : '₪ 21,200'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isCleanProfile ? '0 items logged' : '-3.1% vs last month'}</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Portfolios XIRR (Annual)</span>
          <h2 style={{ fontSize: '1.8rem', color: '#818cf8', marginTop: '0.25rem' }}>
            {isCleanProfile ? '0.00 %' : '8.65 %'}
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isCleanProfile ? 'No active cashflows' : 'Weighted Savings + Stocks'}</span>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Donut Chart: Expense Cuts */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1rem' }}>Expense Cuts by Category</h3>
          {expenseCuts.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              No expenses recorded in active profile.
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
                  <Legend formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar Chart: Monthly Income vs Expenses */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1rem' }}>Monthly Cash Flow (Income vs Expenses)</h3>
          {monthlyCashFlow.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              No monthly cash flow logged in active profile.
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
