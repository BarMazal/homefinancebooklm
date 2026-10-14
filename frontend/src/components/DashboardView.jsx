import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { RefreshCw, FolderPlus, CreditCard, Wallet, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8910';

export default function DashboardView({ fxRate, activeProfileId, activeProfileName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfileId) return;
    setData(null);
    setLoading(true);
    axios.get(`${API_BASE}/api/dashboard/overview`, {
      headers: { 'X-Profile-Id': activeProfileId }
    })
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  const expenseCuts = data?.expense_cuts || [];
  const monthlyCashFlow = data?.monthly_cashflow || [];
  const uploadStatus = data?.upload_status || [];

  const totalExpenseSum = expenseCuts.reduce((acc, curr) => acc + curr.value, 0);

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      const pct = totalExpenseSum ? ((pData.value / totalExpenseSum) * 100).toFixed(1) : 0;
      return (
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', padding: '0.6rem 0.85rem', borderRadius: '8px', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem', color: '#f8fafc' }}>{pData.name}</p>
          <p style={{ margin: '0.2rem 0 0', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
            ₪ {pData.value.toLocaleString()} ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const isCleanSlate = (!loading && data && data.total_net_worth === 0 && expenseCuts.length === 0);

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Financial Control Tower</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Overview of active profile ({activeProfileName || 'Default'}) cashflow & database</p>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem' }}>
          <RefreshCw size={16} color="#34d399" />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>USD / ILS FX:</span>
          <span style={{ fontWeight: 700, color: '#34d399', fontSize: '1.05rem' }}>₪ {fxRate ? fxRate.toFixed(2) : (data?.fx_rate ? data.fx_rate.toFixed(2) : '3.65')}</span>
        </div>
      </div>

      {isCleanSlate && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderColor: '#6366f1', background: 'rgba(99, 102, 241, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FolderPlus size={24} color="#818cf8" />
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'white', fontWeight: 600 }}>Active Database Empty</h3>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Profile database <strong>{activeProfileName}</strong> has no items yet. Use <strong>Expenses Hub</strong> to upload statements/receipts or <strong>Settings & Auth</strong> to scan NotebookLM!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Net Worth</span>
          <h2 style={{ fontSize: '1.8rem', color: (data?.total_net_worth || 0) >= 0 ? 'white' : '#fb7185', marginTop: '0.25rem' }}>
            ₪ {data ? data.total_net_worth.toLocaleString() : '0'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isCleanSlate ? 'Awaiting Data Import' : 'Consolidated Assets & Debt'}</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly Net Savings</span>
          <h2 style={{ fontSize: '1.8rem', color: (data?.monthly_net_savings || 0) >= 0 ? '#34d399' : '#fb7185', marginTop: '0.25rem' }}>
            ₪ {data ? data.monthly_net_savings.toLocaleString() : '0'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
            {data?.target_month_label ? `Period: ${data.target_month_label}` : 'Active Savings Rate'}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly Total Expenses</span>
          <h2 style={{ fontSize: '1.8rem', color: '#fb7185', marginTop: '0.25rem' }}>
            ₪ {data ? data.monthly_expenses.toLocaleString() : '0'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {data?.target_month_label ? `Period: ${data.target_month_label} (Excl. Transfers)` : 'Living Expenses'}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Portfolios XIRR (Annual)</span>
          <h2 style={{ fontSize: '1.8rem', color: '#818cf8', marginTop: '0.25rem' }}>
            {data ? data.portfolio_xirr.toFixed(2) : '0.00'} %
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{data?.portfolio_xirr ? 'Weighted Savings + Stocks' : 'Requires Investment Account'}</span>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Donut Chart: Expense Cuts */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1rem' }}>Expense Cuts by Category</h3>
          {expenseCuts.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              No expenses recorded in active profile database.
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
              No monthly cash flow logged in active profile database.
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
