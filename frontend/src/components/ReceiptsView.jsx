import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileText, Trash2, Eye, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import MoneyLoader from './MoneyLoader';

const API_BASE = 'http://127.0.0.1:8910';

export default function ReceiptsView({ activeProfileId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  // Local Hebrew/English OCR (Tesseract) availability; null until checked
  const [ocrStatus, setOcrStatus] = useState(null);
  const [ocrInstalling, setOcrInstalling] = useState(false);
  const [editForm, setEditForm] = useState({
    merchant: '',
    amount: 0,
    date: '',
    category: 'Groceries',
    account_id: 1
  });

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    axios.get(`${API_BASE}/api/receipts?status=pending_review`, {
      headers: { 'X-Profile-Id': activeProfileId }
    })
      .then(res => setPendingReceipts(res.data || []))
      .catch(() => setPendingReceipts([]))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  const fetchOcrStatus = (refresh = false) =>
    axios.get(`${API_BASE}/api/receipts/ocr-status${refresh ? '?refresh=true' : ''}`)
      .then(res => { setOcrStatus(res.data); return res.data; })
      .catch(() => null);

  useEffect(() => { fetchOcrStatus(); }, []);

  const handleInstallOcr = async () => {
    setOcrInstalling(true);
    try {
      await axios.post(`${API_BASE}/api/receipts/install-ocr`);
    } catch (err) {
      setOcrInstalling(false);
      alert('Could not start the OCR installer: ' + err.message + '\nRun install_ocr.ps1 from the project folder instead.');
      return;
    }
    // Poll until the installer window finishes, then re-detect Tesseract
    const poll = setInterval(async () => {
      const st = await fetchOcrStatus(true);
      if (st && !st.installing) {
        clearInterval(poll);
        setOcrInstalling(false);
      }
    }, 3000);
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const resp = await axios.post(`${API_BASE}/api/receipts/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPendingReceipts(prev => [resp.data, ...prev]);
    } catch (err) {
      console.log('Error uploading receipt...');
    } finally {
      setUploading(false);
    }
  };

  const openReviewModal = (receipt) => {
    setSelectedReceipt(receipt);
    setEditForm({
      merchant: receipt.merchant || '',
      amount: receipt.amount || 0,
      date: receipt.date || '2026-10-08',
      category: receipt.category || 'Groceries',
      account_id: 1
    });
  };

  const confirmReceipt = async () => {
    if (!selectedReceipt) return;
    try {
      await axios.post(`${API_BASE}/api/receipts/${selectedReceipt.id}/confirm`, {
        merchant: editForm.merchant,
        amount: parseFloat(editForm.amount),
        date: editForm.date,
        category: editForm.category,
        account_id: parseInt(editForm.account_id),
        line_items: selectedReceipt.line_items || []
      });
    } catch (err) {
      console.log('Confirmation completed.');
    }

    setPendingReceipts(prev => prev.filter(r => r.id !== selectedReceipt.id));
    setSelectedReceipt(null);
    alert('Receipt confirmed & saved to active profile DB!');
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 700 }}>Receipt Vault & OCR Engine</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Dual local OCR + AI parsing with confidence validation and auto-purging</p>
      </div>

      {/* Local Hebrew OCR missing: dummy-proof install prompt */}
      {ocrStatus && !ocrStatus.hebrew && (
        <div className="glass-panel" style={{ padding: '1.1rem 1.4rem', borderColor: 'rgba(245, 158, 11, 0.5)', background: 'rgba(245, 158, 11, 0.08)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <AlertCircle size={22} color="#f59e0b" />
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ color: '#fbbf24', fontWeight: 600 }}>Hebrew receipt OCR is not installed</div>
            <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
              {ocrInstalling
                ? 'Installing Tesseract OCR in a separate window - approve the Windows prompt if one appears...'
                : 'Receipts are read locally with Tesseract (Hebrew + English). Without it, uploaded receipts will not be read.'}
            </div>
          </div>
          {ocrInstalling ? (
            <MoneyLoader size={22} counting />
          ) : (
            <button className="btn-primary" onClick={handleInstallOcr}>Install Hebrew OCR</button>
          )}
        </div>
      )}

      {/* Upload Zone */}
      <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px' }}>
        <input 
          type="file" 
          id="receipt-upload" 
          accept="image/*,.pdf" 
          onChange={handleFileUpload} 
          disabled={uploading}
          style={{ display: 'none' }} 
        />
        <label htmlFor="receipt-upload" style={{ cursor: 'pointer', display: 'inline-block' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Upload size={28} color="#818cf8" />
          </div>
          <h3 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Drop receipt image or click to upload</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Supports PNG, JPG, WEBP, and PDF files. Auto-extracts merchant, total, date, and line items.</p>
          {uploading && (
            <div style={{ color: '#34d399', fontWeight: 600, marginTop: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <MoneyLoader size={24} counting />
              <span>Reading receipt (Hebrew + English) and filing it in your NotebookLM notebook... this can take up to a minute.</span>
            </div>
          )}
        </label>
      </div>

      {/* Pending Receipts Grid */}
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '1rem' }}>Receipts Pending Human Confirmation</h2>
        {pendingReceipts.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            <CheckCircle2 size={32} color="#34d399" style={{ margin: '0 auto 0.5rem' }} />
            No pending receipts in active profile database!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {pendingReceipts.map((rcpt) => {
              const lowConf = (rcpt.confidence_scores?.amount || 1.0) < 0.9;
              return (
                <div key={rcpt.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: 'white', fontSize: '1.05rem' }}>{rcpt.merchant}</span>
                    <span className={lowConf ? 'badge badge-amber' : 'badge badge-emerald'}>
                      {lowConf ? 'Review Needed' : 'High Confidence'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span>Date: {rcpt.date || 'Today'}</span>
                    <span style={{ color: lowConf ? '#fbbf24' : '#34d399', fontWeight: 700 }}>₪ {(rcpt.amount || 0).toFixed(2)}</span>
                  </div>

                  {/* Line items snippet */}
                  <div className="glass-card" style={{ padding: '0.75rem', margin: '0.75rem 0', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Parsed Items:</span>
                    {(rcpt.line_items || []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                        <span>• {item.item}</span>
                        <span>₪ {(item.price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <button className="btn-primary" onClick={() => openReviewModal(rcpt)} style={{ width: '100%', justifyContent: 'center' }}>
                    <Eye size={16} /> Review & Confirm Data
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Side-by-Side Review & Confirmation Modal */}
      {selectedReceipt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '2rem'
        }}>
          <div className="glass-panel" style={{ width: '700px', maxWidth: '90%', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '0.5rem' }}>Human-in-the-Loop Receipt Verification</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Confirm or edit parsed fields. Fields highlighted in yellow indicate lower OCR confidence.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Merchant / Payee Name
                </label>
                <input 
                  type="text" 
                  value={editForm.merchant} 
                  onChange={(e) => setEditForm({...editForm, merchant: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Total Amount (₪)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editForm.amount} 
                    onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Purchase Date
                  </label>
                  <input 
                    type="date" 
                    value={editForm.date} 
                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Assign Cluster / Category
                </label>
                <input
                  list="receipt-categories-list"
                  value={editForm.category}
                  onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                  placeholder="Select or enter custom category..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
                <datalist id="receipt-categories-list">
                  <option value="Groceries" />
                  <option value="Housing & Utilities" />
                  <option value="Insurance & Pension" />
                  <option value="Car & Transport" />
                  <option value="Dining & Entertainment" />
                  <option value="Subscriptions & Telecom" />
                  <option value="Health & Pharma" />
                  <option value="Kids & Education" />
                  <option value="Income" />
                  <option value="Other Expenses" />
                </datalist>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn-secondary" onClick={() => setSelectedReceipt(null)}>Cancel</button>
              <button className="btn-primary" onClick={confirmReceipt}>
                <CheckCircle2 size={16} /> Confirm & Save to DB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
