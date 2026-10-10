import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, RefreshCw, HelpCircle, CheckCircle2, Building2 } from 'lucide-react';

const demoXirrData = [
  { year: '2021', Balance: 120000, Deposited: 110000 },
  { year: '2022', Balance: 185000, Deposited: 160000 },
  { year: '2023', Balance: 270000, Deposited: 220000 },
  { year: '2024', Balance: 390000, Deposited: 300000 },
  { year: '2025', Balance: 530000, Deposited: 390000 },
  { year: '2026', Balance: 685000, Deposited: 470000 }
];

export default function InvestmentsView({ fxRate, isCleanProfile }) {
  const [kidsDeposit, setKidsDeposit] = useState(1000);
  const [returnRate, setReturnRate] = useState(7.5);

  const calculateKids18Years = () => {
    let balance = isCleanProfile ? 0 : 5000;
    const rate = returnRate / 100 / 12;
    for (let i = 0; i < 18 * 12; i++) {
      balance = (balance + kidsDeposit) * (1 + rate);
    }
    return Math.round(balance);
  };

  const xirrData = isCleanProfile ? [] : demoXirrData;

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Savings & Investments Hub</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Portfolio growth, dynamic XIRR performance, per-broker conversion rates, and kids account simulator</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Portfolio XIRR (Annual)</span>
          <h2 style={{ fontSize: '1.8rem', color: isCleanProfile ? '#94a3b8' : '#34d399', marginTop: '0.25rem' }}>
            {isCleanProfile ? '0.00 %' : '+ 8.65 %'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {isCleanProfile ? 'No active investment history' : 'Real compounding yield in ILS'}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Per-Broker USD/ILS Rates</span>
          <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>IBKR Brokerage:</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>₪ {fxRate ? fxRate.toFixed(2) : '3.65'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
              <span style={{ color: '#94a3b8' }}>Leumi Foreign Curr:</span>
              <span style={{ fontWeight: 700, color: '#818cf8' }}>₪ {(fxRate ? fxRate + 0.04 : 3.69).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Portfolio Valuation</span>
          <h2 style={{ fontSize: '1.8rem', color: 'white', marginTop: '0.25rem' }}>
            {isCleanProfile ? '₪ 0' : '₪ 685,000'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: isCleanProfile ? '#94a3b8' : '#34d399' }}>
            {isCleanProfile ? '₪ 0 cumulative gains' : '₪ 215,000 cumulative gains'}
          </span>
        </div>
      </div>

      {/* Portfolio Growth Area Chart / Empty State */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1rem' }}>Portfolio Valuation vs Cash Deposited</h3>
        {xirrData.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
            <TrendingUp size={32} color="#6366f1" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.25rem' }}>No Investment Portfolio Logged in Active Profile</h3>
            <p style={{ fontSize: '0.85rem' }}>Use the guided export wizard below to import brokerage CSV files or deposit statements.</p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Kids Savings 18-Year Compound Simulator */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem' }}>Kids' Savings 18-Year Growth Simulator</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Adjust monthly deposit and annual return sliders to project wealth at age 18.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Monthly Deposit (₪): {kidsDeposit}
            </label>
            <input 
              type="range" min="200" max="5000" step="100"
              value={kidsDeposit} onChange={(e) => setKidsDeposit(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Expected Annual Return (%): {returnRate}%
            </label>
            <input 
              type="range" min="3" max="12" step="0.5"
              value={returnRate} onChange={(e) => setReturnRate(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Projected Age 18 Wealth:</span>
            <h2 style={{ fontSize: '1.6rem', color: '#fbbf24', marginTop: '0.25rem' }}>₪ {calculateKids18Years().toLocaleString()}</h2>
          </div>
        </div>
      </div>

      {/* Formatted Export Wizard with Clean Unicode Arrows */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HelpCircle size={18} color="#818cf8" /> Guided Export Wizard for Brokerages & Savings
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="glass-card">
            <span style={{ fontWeight: 600, color: 'white', display: 'block', marginBottom: '0.35rem' }}>Bank Leumi Savings</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>1. Log in → Accounts → Savings & Deposits → Export Activity (CSV).</span>
          </div>

          <div className="glass-card">
            <span style={{ fontWeight: 600, color: 'white', display: 'block', marginBottom: '0.35rem' }}>Interactive Brokers (IBKR)</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>1. Reports → Flex Queries → Performance & Cashflows → Download CSV.</span>
          </div>

          <div className="glass-card">
            <span style={{ fontWeight: 600, color: 'white', display: 'block', marginBottom: '0.35rem' }}>Altshuler Gemel Kids</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>1. Personal Zone → Annual Statement → Download PDF (Upload to Scanner).</span>
          </div>
        </div>
      </div>
    </div>
  );
}
