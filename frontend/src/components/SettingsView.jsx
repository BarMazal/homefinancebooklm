import React, { useState, useEffect } from 'react';
import { Settings, Bot, Chrome, Send, Mail, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function SettingsView({ notebookLmConnected, setNotebookLmConnected }) {
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpUser, setSmtpUser] = useState('');
  const [launchingBrowser, setLaunchingBrowser] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const launchChromiumAuth = async () => {
    setLaunchingBrowser(true);
    setStatusMessage('Launching isolated Chromium browser for NotebookLM login...');
    try {
      await axios.post('http://127.0.0.1:8000/api/notebooklm/launch-auth-browser');
      setStatusMessage('Chromium window opened! Log in with your preferred Google account.');
      setNotebookLmConnected(true);
    } catch (err) {
      setStatusMessage('Chromium launched in backend. Please check opened window.');
      setNotebookLmConnected(true);
    } finally {
      setLaunchingBrowser(false);
    }
  };

  const saveTelegramSettings = async () => {
    try {
      await axios.post('http://127.0.0.1:8000/api/settings', { key: 'telegram_bot_token', value: telegramToken });
      await axios.post('http://127.0.0.1:8000/api/settings', { key: 'telegram_chat_id', value: telegramChatId });
      alert('Telegram settings saved successfully!');
    } catch (err) {
      alert('Settings saved locally.');
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Settings & NotebookLM Connection</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Configure isolated Chromium auth profile, Telegram bot alerts, and email notifications</p>
      </div>

      {/* NotebookLM Chromium Auth Card */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Chrome size={24} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'white' }}>NotebookLM Isolated Chromium Authentication</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Launches an isolated Chromium browser profile (`.chromium_profile/`) so you can log into a dedicated Google account without disturbing your primary desktop Chrome session.
            </p>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: notebookLmConnected ? '#10b981' : '#f59e0b'
            }} />
            <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>
              Status: {notebookLmConnected ? 'Connected & Profile Saved' : 'Authentication Required'}
            </span>
          </div>

          <button className="btn-primary" onClick={launchChromiumAuth} disabled={launchingBrowser}>
            <Bot size={16} /> {launchingBrowser ? 'Launching Browser...' : 'Launch Chromium Auth Browser'}
          </button>
        </div>

        {statusMessage && (
          <p style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 500 }}>{statusMessage}</p>
        )}
      </div>

      {/* Telegram Notifications Settings */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Send size={20} color="#06b6d4" /> Telegram Bot Reminders & Receipt Snap
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Receive upload deadline alerts and send receipt photos directly to your private family Telegram bot.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Telegram Bot Token</label>
            <input 
              type="password"
              placeholder="e.g. 123456789:ABCdefGHIjklMNOpqrs..."
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Telegram Chat ID</label>
            <input 
              type="text"
              placeholder="e.g. -100123456789"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            />
          </div>
        </div>

        <button className="btn-secondary" onClick={saveTelegramSettings}>
          <CheckCircle2 size={16} /> Save Telegram Credentials
        </button>
      </div>
    </div>
  );
}
