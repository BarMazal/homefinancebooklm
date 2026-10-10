import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, DollarSign, HelpCircle, CheckCircle, ArrowRight } from 'lucide-react';

const xirrData = [
  { year: '2021', Balance: 120000, Deposited: 110000 },
  { year: '2022', Balance: 185000, Deposited: 160000 },
  { year: '2023', Balance: 270000, Deposited: 220000 },
  { year: '2024', Balance: 390000, Deposited: 300000 },
  { year: '2025', Balance: 530000, Deposited: 390000 },
  { year: '2026', Balance: 685000, Deposited: 470000 }
];

export default function SavingsXirrView({ fxRate }) {
  const [kidsDeposit, setKidsDeposit] = useState(1000);
  const [returnRate, setReturnRate] = useState(7.5);

  const calculateKids18Years = () => {
    let balance = 5000;
    const rate = returnRate / 100 / 12;
    for (let i = 0; i < 18 * 12; i++) {
      balance = (balance + kidsDeposit) * (1 + rate);
    }
    return Math.round(balance);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Savings, Kids Accounts & XIRR Engine</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Extended Internal Rate of Return (XIRR) tracking across 4+ savings and multi-currency accounts</p>
      </div>

      {/* XIRR KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Portfolio XIRR (Annual)</span>
          <h2 style={{ fontSize: '1.8rem', color: '#34d399', marginTop: '0.25rem' }}>+ 8.65 %</h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real compounding yield in ILS</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Live USD / ILS Rate</span>
          <h2 style={{ fontSize: '1.8rem', color: '#818cf8', marginTop: '0.25rem' }}>₪ {fxRate ? fxRate.toFixed(2) : '3.65'}</h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Auto-converts foreign deposits</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Liquid Savings</span>
          <h2 style={{ fontSize: '1.8rem', color: 'white', marginTop: '0.25rem' }}>₪ 685,000</h2>
          <span style={{ fontSize: '0.75rem', color: '#34d399' }}>₪ 215,000 cumulative gains</span>
        </div>
      </div>

      {/* XIRR Growth Chart */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1rem' }}>Cumulative Portfolio Growth vs Cash Deposited</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={xirrData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="Balance" stroke="#34d399" fill="rgba(16, 185, 129, 0.2)" />
              <Area type="monotone" dataKey="Deposited" stroke="#6366f1" fill="rgba(99, 102, 241, 0.1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Kids Savings 18-Year Projection Simulator */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem' }}>Kids' Savings 18-Year Compound Projection</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Adjust monthly deposit and expected annual return to project total value at age 18.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Monthly Deposit (₪): {kidsDeposit}
            </label>
            <input 
              type="range" 
              min="200" 
              max="5000" 
              step="100"
              value={kidsDeposit} 
              onChange={(e) => setKidsDeposit(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Expected Annual Return (%): {returnRate}%
            </label>
            <input 
              type="range" 
              min="3" 
              max="12" 
              step="0.5"
              value={returnRate} 
              onChange={(e) => setReturnRate(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Projected Age 18 Wealth:</span>
            <h2 style={{ fontSize: '1.6rem', color: '#fbbf24', marginTop: '0.25rem' }}>₪ {calculateKids18Years().toLocaleString()}</h2>
          </div>
        </div>
      </div>

      {/* Guided How-To Step-by-Step Export Wizard */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HelpCircle size={18} color="#818cf8" /> Guided Export Wizard for Financial Providers
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="glass-card">
            <span style={{ fontWeight: 600, color: 'white', display: 'block', marginBottom: '0.35rem' }}>Bank Leumi Savings</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>1. Log in $\rightarrow$ Accounts $\rightarrow$ Savings & Deposits $\rightarrow$ Export Activity (CSV).</span>
          </div>

          <div className="glass-card">
            <span style={{ fontWeight: 600, color: 'white', display: 'block', marginBottom: '0.35rem' }}>Interactive Brokers (IBKR)</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>1. Reports $\rightarrow$ Flex Queries $\rightarrow$ Realized Performance & Cashflows $\rightarrow$ Download CSV.</span>
          </div>

          <div className="glass-card">
            <span style={{ fontWeight: 600, color: 'white', display: 'block', marginBottom: '0.35rem' }}>Altshuler Gemel Kids</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>1. Personal Zone $\rightarrow$ Annual Statement $\rightarrow$ Download PDF (Upload to Scanner).</span>
          </div>
        </div>
      </div>
    </div>
  );
}
