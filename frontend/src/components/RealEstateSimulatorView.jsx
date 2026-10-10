import React, { useState } from 'react';
import { Building2, Sliders, ArrowRight, ShieldAlert, Percent, Scale } from 'lucide-react';

export default function RealEstateSimulatorView() {
  const [propertyValue, setPropertyValue] = useState(2200000);
  const [monthlyRent, setMonthlyRent] = useState(6800);
  const [divorceSplit, setDivorceSplit] = useState(50);
  const [totalAssetValue, setTotalAssetValue] = useState(2500000);

  const calculateNetRentalYield = () => {
    const annualRent = monthlyRent * 12 - 12000; // minus maintenance
    return ((annualRent / propertyValue) * 100).toFixed(2);
  };

  const calculateStockNetReturn = () => {
    // 8% gross return minus 25% Israeli capital gains tax = 6% net return
    return (8.0 * (1 - 0.25)).toFixed(2);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Real Estate & Scenario Simulator</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Mortgage track tracking, net rental yield vs 25% tax stock benchmark, and asset division modeling</p>
      </div>

      {/* Mortgage Tracks Schedule */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={20} color="#6366f1" /> Active Mortgage Track Schedule
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="glass-card">
            <span style={{ fontWeight: 700, color: 'white', display: 'block' }}>Track 1: Prime (-0.6%)</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Interest Rate: 5.4% | Balance: ₪320,000</span>
            <span style={{ fontSize: '0.9rem', color: '#fb7185', fontWeight: 600, display: 'block', marginTop: '0.35rem' }}>₪ 2,450 / mo</span>
          </div>

          <div className="glass-card">
            <span style={{ fontWeight: 700, color: 'white', display: 'block' }}>Track 2: Fixed Non-Linked</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Interest Rate: 4.2% | Balance: ₪450,000</span>
            <span style={{ fontSize: '0.9rem', color: '#fb7185', fontWeight: 600, display: 'block', marginTop: '0.35rem' }}>₪ 3,120 / mo</span>
          </div>

          <div className="glass-card">
            <span style={{ fontWeight: 700, color: 'white', display: 'block' }}>Track 3: CPI-Linked (5 Yr)</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Interest Rate: 2.8% + CPI | Balance: ₪280,000</span>
            <span style={{ fontSize: '0.9rem', color: '#fb7185', fontWeight: 600, display: 'block', marginTop: '0.35rem' }}>₪ 1,890 / mo</span>
          </div>
        </div>
      </div>

      {/* Real Estate Yield vs Stock 25% Tax Comparison */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Percent size={20} color="#34d399" /> Net Rental Yield vs Stock Market (After 25% Tax)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="glass-card">
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Property Value: ₪ {propertyValue.toLocaleString()}</span>
            <h2 style={{ fontSize: '1.5rem', color: '#34d399', marginTop: '0.25rem' }}>{calculateNetRentalYield()} % Net Rental Yield</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Factoring maintenance, vacancy, and Israeli tax brackets</span>
          </div>

          <div className="glass-card">
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>S&P 500 Benchmark (8% Gross)</span>
            <h2 style={{ fontSize: '1.5rem', color: '#818cf8', marginTop: '0.25rem' }}>{calculateStockNetReturn()} % Net After 25% Tax</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Factoring 25% Israeli real capital gains tax in ILS</span>
          </div>
        </div>
      </div>

      {/* Asset Division & Separation Life Scenario Simulator */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Scale size={20} color="#fbbf24" /> Life Event & Asset Division Simulator
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Model clean 50/50 or custom asset splitting (real estate equity + liquid savings + pension balance).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Total Family Net Wealth (₪): {totalAssetValue.toLocaleString()}
            </label>
            <input 
              type="range" 
              min="500000" 
              max="10000000" 
              step="100000"
              value={totalAssetValue} 
              onChange={(e) => setTotalAssetValue(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
              Split Ratio: {divorceSplit} / {100 - divorceSplit}
            </label>
            <input 
              type="range" 
              min="10" 
              max="90" 
              step="5"
              value={divorceSplit} 
              onChange={(e) => setDivorceSplit(Number(e.target.value))}
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
    </div>
  );
}
