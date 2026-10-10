import React from 'react';
import { 
  BarChart3, 
  CreditCard, 
  TrendingUp, 
  ShieldCheck, 
  Building, 
  Clock, 
  Sliders, 
  Settings,
  Bot,
  User,
  Receipt
} from 'lucide-react';

export default function Navigation({ 
  activeTab, 
  setActiveTab, 
  notebookLmConnected,
  profiles,
  activeProfile,
  onSwitchProfile
}) {
  const categoryHubs = [
    { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
    { id: 'expenses', label: 'Expenses Hub', icon: CreditCard },
    { id: 'investments', label: 'Savings & Investments', icon: TrendingUp },
    { id: 'pensions', label: 'Pensions & Insurances', icon: ShieldCheck },
    { id: 'realestate', label: 'Real Estate & Mortgages', icon: Building },
  ];

  const utilities = [
    { id: 'receipts', label: 'Receipt Vault', icon: Receipt },
    { id: 'reminders', label: 'Reminders & Cadence', icon: Clock },
    { id: 'simulator', label: 'Scenario Simulator', icon: Sliders },
    { id: 'settings', label: 'Settings & Auth', icon: Settings },
  ];

  return (
    <aside style={{
      width: '270px',
      background: 'rgba(15, 23, 42, 0.95)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '1.25rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      justify: 'space-between',
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      <div>
        {/* Header & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingLeft: '0.25rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            color: 'white'
          }}>
            HF
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>Home Finance</h2>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>BookLM Hubs</span>
          </div>
        </div>

        {/* Profile Switcher */}
        <div className="glass-card" style={{ padding: '0.75rem', marginBottom: '1.25rem', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
            <User size={14} color="#818cf8" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>ACTIVE PROFILE:</span>
          </div>
          <select
            value={activeProfile?.id || 1}
            onChange={(e) => onSwitchProfile(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.45rem',
              borderRadius: '6px',
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.id === 2 ? ' (Clean Slate)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Category Hubs Section */}
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.5rem', display: 'block', marginBottom: '0.4rem' }}>
          Financial Hubs
        </span>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.25rem' }}>
          {categoryHubs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.1) 100%)' : 'transparent',
                  color: isActive ? '#818cf8' : '#94a3b8',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent'
                }}
              >
                <Icon size={17} color={isActive ? '#818cf8' : '#94a3b8'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Standalone Utilities */}
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.5rem', display: 'block', marginBottom: '0.4rem' }}>
          Tools & Utilities
        </span>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {utilities.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.1) 100%)' : 'transparent',
                  color: isActive ? '#818cf8' : '#94a3b8',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent'
                }}
              >
                <Icon size={17} color={isActive ? '#818cf8' : '#94a3b8'} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* NotebookLM Status Badge */}
      <div className="glass-card" style={{ padding: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Bot size={15} color="#818cf8" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>NotebookLM AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: notebookLmConnected ? '#10b981' : '#f59e0b'
          }} />
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
            {notebookLmConnected ? 'Chromium Connected' : 'Auth Required'}
          </span>
        </div>
      </div>
    </aside>
  );
}
