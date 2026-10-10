import React, { useState, useEffect } from 'react';
import { Building, Building2, Plus, Percent, ShieldCheck, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8900';

export default function RealEstateView({ activeProfileId }) {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProp, setNewProp] = useState({
    name: '',
    estimated_value: 0,
    monthly_rent: 0,
    annual_maintenance: 0
  });

  const fetchProperties = () => {
    setLoading(true);
    axios.get(`${API_BASE}/api/real-estate/properties`)
      .then(res => {
        setProperties(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedPropertyId(res.data[0].id);
        } else {
          setSelectedPropertyId(null);
        }
      })
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProperties();
  }, [activeProfileId]);

  const activeProperty = properties.find(p => p.id === selectedPropertyId) || properties[0];

  const totalPortfolioValue = properties.reduce((acc, p) => acc + (p.estimated_value || 0), 0);
  const totalPortfolioDebt = properties.reduce((acc, p) => acc + (p.tracks || []).reduce((tAcc, t) => tAcc + (t.remaining_balance || 0), 0), 0);
  const netPortfolioEquity = totalPortfolioValue - totalPortfolioDebt;

  const handleCreateProperty = async () => {
    if (!newProp.name.trim()) return;
    try {
      await axios.post(`${API_BASE}/api/real-estate/properties`, {
        name: newProp.name.trim(),
        estimated_value: parseFloat(newProp.estimated_value) || 0,
        monthly_rent: parseFloat(newProp.monthly_rent) || 0,
        annual_maintenance: parseFloat(newProp.annual_maintenance) || 0
      });
      setShowAddModal(false);
      setNewProp({ name: '', estimated_value: 0, monthly_rent: 0, annual_maintenance: 0 });
      fetchProperties();
    } catch (err) {
      alert('Error saving property.');
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Real Estate & Mortgages Hub</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Manage multiple real estate assets, per-property mortgage portfolios, and net rental yield</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Property
        </button>
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
          <span style={{ fontSize: '0.75rem', color: '#34d399' }}>{totalPortfolioValue ? ((netPortfolioEquity / totalPortfolioValue) * 100).toFixed(1) : '0'}% LTV Equity</span>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <Building size={32} color="#6366f1" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.25rem' }}>No Real Estate Properties Registered in Active Profile</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Click "+ Add Property" above to register property valuations and mortgage tracks into this profile's database.</p>
          <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ margin: '0 auto' }}>
            <Plus size={16} /> Register First Property
          </button>
        </div>
      ) : (
        <>
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
          {activeProperty && (
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', color: 'white', fontWeight: 700 }}>{activeProperty.name}</h2>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    Valuation: ₪ {(activeProperty.estimated_value || 0).toLocaleString()} | Monthly Rent: ₪ {(activeProperty.monthly_rent || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Dedicated Mortgage Tracks Portfolio Table */}
              <h3 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '0.75rem' }}>Property Mortgage Track Portfolio</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {(activeProperty.tracks || []).length === 0 ? (
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
          )}
        </>
      )}

      {/* Add Property Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '2rem'
        }}>
          <div className="glass-panel" style={{ width: '500px', maxWidth: '95%', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '0.5rem' }}>Add Real Estate Property</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Register property valuation and rental metrics into active profile database.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Property Name / Address</label>
                <input 
                  type="text" 
                  placeholder="e.g. Tel Aviv Family Apartment"
                  value={newProp.name} 
                  onChange={(e) => setNewProp({...newProp, name: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Estimated Value (₪)</label>
                <input 
                  type="number" 
                  value={newProp.estimated_value} 
                  onChange={(e) => setNewProp({...newProp, estimated_value: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Monthly Rent (₪)</label>
                  <input 
                    type="number" 
                    value={newProp.monthly_rent} 
                    onChange={(e) => setNewProp({...newProp, monthly_rent: e.target.value})}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Annual Maintenance (₪)</label>
                  <input 
                    type="number" 
                    value={newProp.annual_maintenance} 
                    onChange={(e) => setNewProp({...newProp, annual_maintenance: e.target.value})}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateProperty}>
                <CheckCircle2 size={16} /> Save Property to DB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
