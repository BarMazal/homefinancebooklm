import React, { useState } from 'react';
import { Building, Building2, Plus, Percent, ShieldCheck, ChevronRight } from 'lucide-react';
import axios from 'axios';

export default function RealEstateView({ isCleanProfile }) {
  const [properties, setProperties] = useState(isCleanProfile ? [] : [
    {
      id: 1,
      name: 'Main Family Apartment (Tel Aviv)',
      estimated_value: 3500000.0,
      monthly_rent: 0.0,
      annual_maintenance: 12000.0,
      tracks: [
        { id: 1, track_name: 'Prime (-0.6%)', original_amount: 400000, remaining_balance: 320000, interest_rate: 5.4, monthly_payment: 2450 },
        { id: 2, track_name: 'Fixed Non-Linked', original_amount: 550000, remaining_balance: 450000, interest_rate: 4.2, monthly_payment: 3120 }
      ]
    },
    {
      id: 2,
      name: 'Rental Investment Apartment (Haifa)',
      estimated_value: 1800000.0,
      monthly_rent: 5200.0,
      annual_maintenance: 8000.0,
      tracks: [
        { id: 3, track_name: 'CPI-Linked (5 Yr)', original_amount: 350000, remaining_balance: 280000, interest_rate: 2.8, monthly_payment: 1890 }
      ]
    }
  ]);

  const [selectedPropertyId, setSelectedPropertyId] = useState(1);
  const activeProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];

  const totalPortfolioValue = properties.reduce((acc, p) => acc + p.estimated_value, 0);
  const totalPortfolioDebt = properties.reduce((acc, p) => acc + p.tracks.reduce((tAcc, t) => tAcc + t.remaining_balance, 0), 0);
  const netPortfolioEquity = totalPortfolioValue - totalPortfolioDebt;

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Real Estate & Mortgages Hub</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Manage multiple real estate assets, per-property mortgage portfolios, and net rental yield</p>
      </div>

      {/* Portfolio Overview KPI Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Real Estate Portfolio Value</span>
          <h2 style={{ fontSize: '1.8rem', color: 'white', marginTop: '0.25rem' }}>₪ {totalPortfolioValue.toLocaleString()}</h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{properties.length} Active Properties</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Mortgage Debt</span>
          <h2 style={{ fontSize: '1.8rem', color: '#fb7185', marginTop: '0.25rem' }}>₪ {totalPortfolioDebt.toLocaleString()}</h2>
          <span style={{ fontSize: '0.75rem', color: '#fb7185' }}>Across all properties</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Net Real Estate Equity</span>
          <h2 style={{ fontSize: '1.8rem', color: '#34d399', marginTop: '0.25rem' }}>₪ {netPortfolioEquity.toLocaleString()}</h2>
          <span style={{ fontSize: '0.75rem', color: '#34d399' }}>{((netPortfolioEquity / (totalPortfolioValue || 1)) * 100).toFixed(1)}% LTV Equity</span>
        </div>
      </div>

      {/* Multi-Property Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {properties.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPropertyId(p.id)}
            className={selectedPropertyId === p.id ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.65rem 1.25rem', whiteSpace: 'nowrap' }}
          >
            <Building2 size={16} /> {p.name}
          </button>
        ))}
      </div>

      {/* Selected Property Details & Dedicated Mortgage Portfolio */}
      {activeProperty ? (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'white', fontWeight: 700 }}>{activeProperty.name}</h2>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Valuation: ₪ {activeProperty.estimated_value.toLocaleString()} | Monthly Rent: ₪ {activeProperty.monthly_rent.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Dedicated Mortgage Tracks Portfolio Table */}
          <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '0.75rem' }}>Property Mortgage Track Portfolio</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {activeProperty.tracks.length === 0 ? (
              <div className="glass-card" style={{ color: '#94a3b8' }}>No mortgage tracks attached to this property.</div>
            ) : (
              activeProperty.tracks.map(t => (
                <div key={t.id} className="glass-card">
                  <span style={{ fontWeight: 700, color: 'white', display: 'block', marginBottom: '0.35rem' }}>{t.track_name}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Remaining Balance:</span>
                      <span style={{ fontWeight: 600, color: '#fb7185' }}>₪ {t.remaining_balance.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Interest Rate:</span>
                      <span style={{ fontWeight: 600, color: '#fbbf24' }}>{t.interest_rate}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Monthly Payment:</span>
                      <span style={{ fontWeight: 700, color: 'white' }}>₪ {t.monthly_payment.toLocaleString()} / mo</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
          No properties registered in active profile. Click button above to add property.
        </div>
      )}
    </div>
  );
}
