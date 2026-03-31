import { useState, useMemo } from 'react';
import { getTMCredentials, sendTextMagicSMS } from '../lib/sms';

const STATUSES = [
  { v: 'loading',  icon: '📦', label: 'Loading',      msg: "We're loading your furniture onto the truck now.",    color: '#6b5c4c' },
  { v: 'en_route', icon: '🚛', label: 'En Route',     msg: "Your furniture is on its way!",                      color: '#0b7a4a' },
  { v: 'nearby',   icon: '📍', label: 'Almost There', msg: "Our delivery team is almost at your location!",      color: '#c89b0a' },
  { v: 'arriving', icon: '🏠', label: 'Arriving Now', msg: "Our delivery team is arriving now!",                 color: '#2563eb' },
  { v: 'custom',   icon: '💬', label: 'Custom Text',  msg: "",                                                   color: '#8b5cf6' },
];

export default function ETAPanel({ delivery, onClose }) {
  const [status, setStatus] = useState('en_route');
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState('');
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState(null);

  const cur = STATUSES.find(s => s.v === status) || STATUSES[1];
  const firstName = (delivery.clientName || 'there').split(' ')[0];
  
  const message = useMemo(() => {
    if (status === 'custom') {
      return customText.trim() ? `Hi ${firstName}, ${customText} — Caravana Furniture` : '';
    }
    return `Hi ${firstName}, ${cur.msg} Estimated arrival: ~${minutes} minutes.${delivery.deliveryTeam ? ` Team: ${delivery.deliveryTeam}.` : ''}${note ? ` Note: ${note}` : ''} — Caravana Furniture`;
  }, [status, firstName, cur.msg, minutes, delivery.deliveryTeam, note, customText]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectSend = async () => {
    if (!delivery.phone) return;
    setSending(true);
    setSentStatus(null);
    try {
      await sendTextMagicSMS(delivery.phone, message);
      setSentStatus('sent');
      setTimeout(onClose, 1500);
    } catch (err) {
      setSentStatus('error: ' + err.message);
    }
    setSending(null);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--surface)', borderRadius: '20px 20px 0 0',
          width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
          padding: '20px 20px 32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 18px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-main)' }}>🚛 ETA Update</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-light)' }}>Notify {delivery.clientName}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--bg-color)', color: 'var(--text-light)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>

        {/* Status selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {STATUSES.map(s => (
            <button
              key={s.v}
              onClick={() => setStatus(s.v)}
              style={{
                gridColumn: s.v === 'custom' ? '1 / -1' : undefined,
                padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${status === s.v ? s.color : 'var(--border)'}`,
                background: status === s.v ? s.color + '15' : 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: s.v === 'custom' ? 'center' : 'flex-start', gap: 8,
              }}
            >
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: status === s.v ? s.color : 'var(--text-light)' }}>{s.label}</span>
            </button>
          ))}
        </div>

        {status !== 'custom' ? (
          <>
            {/* Minute slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <input
                type="range" min="5" max="120" step="5" value={minutes}
                onChange={e => setMinutes(parseInt(e.target.value))}
                style={{ flex: 1, accentColor: cur.color }}
              />
              <div style={{
                background: cur.color, color: '#fff', borderRadius: 8,
                padding: '6px 12px', fontWeight: 700, fontSize: 17, minWidth: 65, textAlign: 'center',
              }}>
                {minutes}<span style={{ fontSize: 11, fontWeight: 400 }}> min</span>
              </div>
            </div>

            {/* Message preview */}
            <div style={{
              background: 'var(--bg-color)', borderRadius: 10, padding: 14,
              fontSize: 13, lineHeight: 1.7, marginBottom: 12, color: 'var(--text-main)',
              border: '1px solid var(--border)',
            }}>
              {message}
            </div>

            {/* Note */}
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note (optional)..."
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text-main)', fontSize: 14,
                resize: 'none', fontFamily: 'inherit', marginBottom: 14, boxSizing: 'border-box',
              }}
            />
          </>
        ) : (
          <>
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              placeholder="Type your custom update (e.g. traffic delay, out of stock...)"
              rows={4}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #8b5cf6',
                background: '#f5f3ff', color: '#4c1d95', fontSize: 14,
                resize: 'none', fontFamily: 'inherit', marginBottom: 14, boxSizing: 'border-box',
              }}
            />
            {customText.trim() && (
              <div style={{
                background: 'var(--bg-color)', borderRadius: 10, padding: 14,
                fontSize: 13, lineHeight: 1.7, marginBottom: 14, color: 'var(--text-main)',
                border: '1px solid var(--border)',
              }}>
                <strong style={{ fontSize: 11, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Preview</strong>
                {message}
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDirectSend}
              disabled={sending || !delivery.phone || !message.trim()}
              style={{
                flex: 1.5, padding: '13px 0', borderRadius: 10, background: '#0b7a4a',
                color: '#fff', fontWeight: 700, fontSize: 15, cursor: sending ? 'not-allowed' : 'pointer',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {sending ? '⏳ Sending...' : sentStatus === 'sent' ? '✅ Sent!' : '🚀 Send Message'}
            </button>
            <button
              onClick={handleCopy}
              disabled={sending}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 10, border: '1.5px solid var(--border)',
                background: 'var(--surface)', fontWeight: 600, fontSize: 14, color: 'var(--text-main)', cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>

          {sentStatus && sentStatus.startsWith('error') && (
            <div style={{ fontSize: 12, color: '#c53030', background: '#fef2f2', padding: '8px 12px', borderRadius: 8, border: '1px solid #fecaca' }}>
              ⚠️ {sentStatus.replace('error: ', '')}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
