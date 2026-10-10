import React, { useState } from 'react';
import { Sliders, Scale, Percent, TrendingUp } from 'lucide-react';

export default function SimulatorView() {
  const [totalAssetValue, setTotalAssetValue] = useState(2500000);
  const [divorceSplit, setDivorceSplit] = useState(50);

  const [mortgageBalance, setMortgageBalance] = useState(1000000);
  const [interestRate, setInterestRate] = useState(4.5);

  const calculateMortgagePayment = () => {
    const monthlyRate = (interestRate / 100) / 12;
    const n = 25 * 12; // 25 years
    const pmt = (mortgageBalance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
    return Math.round(pmt);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Scenario Simulator Hub</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Financial scenario modeling, asset division, and interest rate sensitivity sandboxes</p>
      </div>

      {/* Asset Division & Life Event Simulator */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Scale size={20} color="#fbbf24" /> Life Event & Asset Division Simulator
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Model clean 50/50 or custom asset division across real estate equity, liquid cash, and pension balance.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Total Family Net Wealth (₪): {totalAssetValue.toLocaleString()}
            </label>
            <input 
              type="range" min="500000" max="10000000" step="100000"
              value={totalAssetValue} onChange={(e) => setTotalAssetValue(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Split Ratio: {divorceSplit} / {100 - divorceSplit}
            </label>
            <input 
              type="range" min="10" max="90" step="5"
              value={divorceSplit} onChange={(e) => setDivorceSplit(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span>Party A Share ({divorceSplit}%):</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>₪ {Math.round(totalAssetValue * (divorceSplit / 100)).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Party B Share ({100 - divorceSplit}%):</span>
              <span style={{ fontWeight: 700, color: '#818cf8' }}>₪ {Math.round(totalAssetValue * ((100 - divorceSplit) / 100)).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mortgage Interest Rate Sensitivity Sandbox */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Percent size={20} color="#6366f1" /> Mortgage Interest Rate Sensitivity Sandbox
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Model the impact of a 0.5% or 1% interest rate change on monthly mortgage payments.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Mortgage Principal: ₪ {mortgageBalance.toLocaleString()}
            </label>
            <input 
              type="range" min="200000" max="3000000" step="50000"
              value={mortgageBalance} onChange={(e) => setMortgageBalance(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Interest Rate (%): {interestRate}%
            </label>
            <input 
              type="range" min="2" max="9" step="0.25"
              value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Est. Monthly Payment (25 Yrs):</span>
            <h2 style={{ fontSize: '1.6rem', color: '#fb7185', marginTop: '0.25rem' }}>₪ {calculateMortgagePayment().toLocaleString()} / mo</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
