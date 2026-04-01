import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function CommandCenterModal({ onClose, teamMembers = [], teamAlerts = [] }) {
  const [message, setMessage] = useState('');
  const [expiresIn, setExpiresIn] = useState(2);
  const [createdBy, setCreatedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [editingAlertId, setEditingAlertId] = useState(null);

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
    
    if (editingAlertId) {
      const { error } = await supabase.from('team_alerts').update({
        message: message.trim(),
        created_by: createdBy,
        expires_at: expiresAt
      }).eq('id', editingAlertId);

      setIsSubmitting(false);
      
      if (error) {
        alert('Error updating alert: ' + error.message);
      } else {
        alert('✅ Alert Updated!');
        handleCancelEdit();
      }
    } else {
      const { error } = await supabase.from('team_alerts').insert([{
        message: message.trim(),
        created_by: createdBy,
        expires_at: expiresAt,
        team_id: 'Global' // default or can be a dropdown later
      }]);

      setIsSubmitting(false);

      if (error) {
        alert('Error dispatching alert: ' + error.message);
      } else {
        setMessage('');
        alert('✅ Alert Dispatched!');
      }
    }
  };

  const handleEdit = (alert) => {
    setEditingAlertId(alert.id);
    setMessage(alert.message);
    setCreatedBy(alert.created_by);
    const diffMs = new Date(alert.expires_at) - new Date();
    const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    if (diffHours <= 2) setExpiresIn(2);
    else if (diffHours <= 6) setExpiresIn(6);
    else setExpiresIn(12);
  };
  
  const handleCancelEdit = () => {
    setEditingAlertId(null);
    setMessage('');
    setCreatedBy('');
    setExpiresIn(2);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this alert? It will immediately disappear from all team devices.")) return;
    setIsDeleting(id);
    const { error } = await supabase.from('team_alerts').delete().eq('id', id);
    setIsDeleting(null);
    if (error) {
      alert('Failed to delete alert: ' + error.message);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: 900, width: '90vw', padding: 0, height: '80vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ background: '#1e293b', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🕹️</span> Dispatch Command Center
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
        </div>

        {/* Content Body: Split into 2 columns */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT: Dispatch Form */}
          <div style={{ flex: 1, borderRight: '1px solid var(--border)', padding: '24px', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: 20, color: 'var(--text-main)', fontSize: 16 }}>
              {editingAlertId ? '✏️ Edit Broadcast' : '🚀 Broadcast New Alert'}
            </h3>
            
            <form onSubmit={handleDispatch}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 13, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                  Alert Message <span style={{ color: '#c53030' }}>*</span>
                </label>
                <textarea
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g., Warehouse gates are closed, use the side entrance..."
                  rows={4}
                  style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 13, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                    Sender <span style={{ color: '#c53030' }}>*</span>
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
                    Expiration Time
                  </label>
                  <select
                    value={expiresIn}
                    onChange={e => setExpiresIn(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--surface)' }}
                  >
                    <option value={2}>2 Hours</option>
                    <option value={6}>6 Hours</option>
                    <option value={12}>12 Hours</option>
                  </select>
                </div>
              </div>

              <div style={{ background: '#fffbeb', padding: 12, borderRadius: 8, border: '1px solid #fde68a', marginBottom: 24, fontSize: 13, color: '#92400e' }}>
                <strong>Note:</strong> Dispatching this alert will bypass iPad snooze timers and instantly ping all active delivery teams.
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                {editingAlertId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    style={{ flex: 1, background: '#e2e8f0', color: '#475569', border: 'none', padding: '12px 24px', fontWeight: 700, borderRadius: 8, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim() || !createdBy}
                  style={{ flex: 2, background: editingAlertId ? '#2563eb' : '#c53030', color: '#fff', border: 'none', padding: '12px 24px', fontWeight: 700, borderRadius: 8, cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Saving...' : editingAlertId ? '💾 Save Changes' : 'Dispatch Alert Now 📣'}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: Active Alerts */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#f8fafc' }}>
             <h3 style={{ marginTop: 0, marginBottom: 20, color: 'var(--text-main)', fontSize: 16 }}>📡 Active Terminal Broadcasts</h3>
             
             {teamAlerts.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                 No active team broadcasts.
               </div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 {teamAlerts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(alert => (
                   <div key={alert.id} style={{
                     background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
                     boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative'
                   }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                       <span style={{ fontSize: 12, fontWeight: 700, color: '#c53030', background: '#fef2f2', padding: '2px 8px', borderRadius: 12 }}>
                         {alert.team_id || 'Global Broadcast'}
                       </span>
                       <div style={{ display: 'flex', gap: 8 }}>
                         <button 
                           onClick={() => handleEdit(alert)}
                           style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 16 }}
                           title="Edit Alert"
                         >
                           ✏️
                         </button>
                         <button 
                           onClick={() => handleDelete(alert.id)}
                           disabled={isDeleting === alert.id}
                           style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}
                           title="Revoke Alert"
                         >
                           {isDeleting === alert.id ? '⏳' : '🗑️'}
                         </button>
                       </div>
                     </div>
                     <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#334155', fontWeight: 500 }}>
                       {alert.message}
                     </p>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                       <span>By: <strong>{alert.created_by}</strong></span>
                       <span>Exp: {new Date(alert.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}
