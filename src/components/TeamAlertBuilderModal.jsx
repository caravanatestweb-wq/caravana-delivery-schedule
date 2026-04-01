import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function TeamAlertBuilderModal({ onClose, teamMembers = [] }) {
  const [message, setMessage] = useState('');
  const [expiresIn, setExpiresIn] = useState(2);
  const [createdBy, setCreatedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time window math
  const getExpirationDate = (hours) => {
    const d = new Date();
    d.setHours(d.getHours() + parseInt(hours, 10));
    return d.toISOString();
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!message.trim() || !createdBy) return;

    setIsSubmitting(true);
    const expiresAt = getExpirationDate(expiresIn);
    
    const { error } = await supabase.from('team_alerts').insert([{
      message: message.trim(),
      created_by: createdBy,
      expires_at: expiresAt
    }]);

    setIsSubmitting(false);

    if (error) {
      alert('Error dispatching alert: ' + error.message);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 500, padding: 0 }}>
        <div style={{ background: '#fef2f2', padding: '16px 20px', borderBottom: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#c53030', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📣</span> Dispatch Team Alert
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: '#c53030' }}>&times;</button>
        </div>

        <form onSubmit={handleDispatch} style={{ padding: '24px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 13, color: 'var(--text-main)', textTransform: 'uppercase' }}>
              Alert Message <span style={{ color: '#c53030' }}>*</span>
            </label>
            <textarea
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g., Warehouse gates are closed, use the side entrance. / Urgent re-route requested by logistics."
              rows={4}
              style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 13, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                Sender (Office Hub) <span style={{ color: '#c53030' }}>*</span>
              </label>
              <select
                required
                value={createdBy}
                onChange={e => setCreatedBy(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--surface)' }}
              >
                <option value="">Select dispatcher...</option>
                {teamMembers.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 13, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                Expiration Length
              </label>
              <select
                value={expiresIn}
                onChange={e => setExpiresIn(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--surface)' }}
              >
                <option value={2}>2 Hours</option>
                <option value={6}>6 Hours (Standard Shift)</option>
                <option value={12}>12 Hours (Full Day)</option>
              </select>
            </div>
          </div>

          <div style={{ background: '#fffbeb', padding: 12, borderRadius: 8, border: '1px solid #fde68a', marginBottom: 24, fontSize: 13, color: '#92400e' }}>
            <strong>Note:</strong> Dispatching this alert will instantly force a pop-up on all active Delivery Team screens, bypassing their snooze timers until they acknowledge it.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !message.trim() || !createdBy}
              className="btn"
              style={{ background: '#c53030', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 700 }}
            >
              {isSubmitting ? 'Dispatching...' : 'Dispatch Alert 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
