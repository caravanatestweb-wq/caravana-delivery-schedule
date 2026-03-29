import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const getLocalDateString = (date = new Date()) =>
  date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

const STATUSES = ['Picked Up', 'In Repair', 'Ready for Return', 'Returned'];
const TIME_WINDOWS = [
  '08:00 AM - 10:00 AM','10:00 AM - 12:00 PM',
  '12:00 PM - 02:00 PM','02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM','Full Day (08:00 AM - 06:00 PM)'
];

const EMPTY = {
  clientName: '', phone: '', email: '', address: '',
  description: '', pickupDate: getLocalDateString(),
  estimatedCompletion: '', returnDate: '', returnTimeWindow: '10:00 AM - 12:00 PM',
  status: 'Picked Up', team: '', techNotes: '', clientNotes: '',
  repairCost: '', warranty: false, photoUrls: [],
};

export default function RepairFormModal({ isOpen, onClose, onSave, onDelete, repair, teamMembers = [] }) {
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(repair ? { ...EMPTY, ...repair } : { ...EMPTY, pickupDate: getLocalDateString() });
  }, [repair, isOpen]);

  if (!isOpen) return null;

  const handle = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const path = `repairs/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const { error } = await supabase.storage.from('delivery-photos').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('delivery-photos').getPublicUrl(path);
      setForm(p => ({ ...p, photoUrls: [...(p.photoUrls || []), publicUrl] }));
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSubmit = e => {
    e.preventDefault();
    onSave({ ...form, id: repair?.id || undefined });
  };

  const statusColor = {
    'Picked Up': '#c89b0a',
    'In Repair': '#2563eb',
    'Ready for Return': '#059669',
    'Returned': '#6b7280',
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content fade-in" style={{ maxWidth: 780 }}>
        <div className="modal-header">
          <h2 className="modal-title">🔧 {repair ? 'Edit Repair' : 'New Repair Job'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="delivery-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2rem' }} className="form-sections-wrapper">

            {/* LEFT */}
            <div>
              <section className="form-section">
                <h3 className="section-title">1. Client Info</h3>
                <div className="form-group">
                  <label>Client Name *</label>
                  <input name="clientName" value={form.clientName} onChange={handle} required placeholder="Full name" />
                </div>
                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label>Phone</label>
                    <input name="phone" value={form.phone} onChange={handle} placeholder="(555) 000-0000" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input name="email" value={form.email} onChange={handle} placeholder="client@email.com" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Address</label>
                  <textarea name="address" value={form.address} onChange={handle} rows={2} placeholder="Client address" />
                </div>
              </section>

              <section className="form-section" style={{ marginTop: '1.5rem' }}>
                <h3 className="section-title">2. Repair Description *</h3>
                <div className="form-group">
                  <label>What needs to be repaired?</label>
                  <textarea name="description" value={form.description} onChange={handle} rows={4}
                    required placeholder="e.g. Sofa leg broken, cushion torn, recliner mechanism stuck..." />
                </div>

                {/* Warranty checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  <input type="checkbox" name="warranty" checked={form.warranty} onChange={handle} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                  <span>Under Warranty (no charge to client)</span>
                </label>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Repair Cost Estimate</label>
                  <input name="repairCost" value={form.repairCost} onChange={handle} placeholder="$0.00 or 'TBD'" />
                </div>
              </section>

              <section className="form-section" style={{ marginTop: '1.5rem' }}>
                <h3 className="section-title">3. Internal Notes</h3>
                <div className="form-group">
                  <label>Technician Notes</label>
                  <textarea name="techNotes" value={form.techNotes} onChange={handle} rows={3}
                    placeholder="Details for the repair team — parts needed, technique, photos referenced..." />
                </div>
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Client-Facing Notes</label>
                  <textarea name="clientNotes" value={form.clientNotes} onChange={handle} rows={2}
                    placeholder="What the client has been told..." />
                </div>
              </section>
            </div>

            {/* RIGHT */}
            <div>
              <section className="form-section">
                <h3 className="section-title">4. Timeline</h3>

                <div className="form-group">
                  <label>📥 Pickup Date (item from client)</label>
                  <input type="date" name="pickupDate" value={form.pickupDate} onChange={handle} />
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>🔧 Estimated Completion</label>
                  <input type="date" name="estimatedCompletion" value={form.estimatedCompletion} onChange={handle} />
                </div>

                {/* Return delivery — shows on calendar */}
                <div style={{ marginTop: '1rem', padding: '12px 14px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: 10, border: '1.5px solid #c4b5fd' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    📅 Return to Client — Shows on Calendar
                  </div>
                  <div className="form-group">
                    <label>Return Date *</label>
                    <input type="date" name="returnDate" value={form.returnDate} onChange={handle} required />
                  </div>
                  <div className="form-group" style={{ marginTop: '0.6rem' }}>
                    <label>Return Time Window</label>
                    <select name="returnTimeWindow" value={form.returnTimeWindow} onChange={handle}>
                      {TIME_WINDOWS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              <section className="form-section" style={{ marginTop: '1.5rem' }}>
                <h3 className="section-title">5. Assignment & Status</h3>

                <div className="form-group">
                  <label>Status</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {STATUSES.map(s => (
                      <button key={s} type="button"
                        onClick={() => setForm(p => ({ ...p, status: s }))}
                        style={{
                          padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                          border: `1.5px solid ${form.status === s ? statusColor[s] : 'var(--border)'}`,
                          background: form.status === s ? statusColor[s] + '18' : 'var(--surface)',
                          color: form.status === s ? statusColor[s] : 'var(--text-light)',
                        }}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Assigned Team</label>
                  <select name="team" value={form.team} onChange={handle}>
                    <option value="">— Unassigned —</option>
                    {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
                    {teamMembers.length > 1 && teamMembers.flatMap((a, i) =>
                      teamMembers.slice(i + 1).map(b => (
                        <option key={`${a}&${b}`} value={`${a} & ${b}`}>{a} & {b}</option>
                      ))
                    )}
                  </select>
                </div>
              </section>

              {/* Photos */}
              <section className="form-section" style={{ marginTop: '1.5rem' }}>
                <h3 className="section-title">6. Damage Photos</h3>
                <div className="photo-preview-grid">
                  {(form.photoUrls || []).map((url, i) => (
                    <div key={i} className="photo-preview-item">
                      <img src={url} alt="repair" />
                      <button type="button" className="photo-remove-btn"
                        onClick={() => setForm(p => ({ ...p, photoUrls: p.photoUrls.filter((_, j) => j !== i) }))}>
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="photo-upload-btn">
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
                    <span style={{ fontSize: '1.4rem' }}>{uploading ? '⏳' : '📷'}</span>
                    <span>{uploading ? 'Uploading' : 'Add Photo'}</span>
                  </label>
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {repair && (
              <button type="button" className="btn-secondary"
                style={{ color: '#c53030', borderColor: '#c53030', marginRight: 'auto' }}
                onClick={() => { if (confirm('Delete this repair record?')) onDelete(repair.id); }}>
                Delete
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {repair ? 'Save Changes' : '🔧 Create Repair Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
