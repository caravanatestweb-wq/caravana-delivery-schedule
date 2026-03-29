import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { addDays, fmtDate } from '../lib/constants';
import './DeliveryFormModal.css';

const getLocalDateString = (date = new Date()) =>
  date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{2}):(\d{2}) ([AP]M)/);
  if (!match) return 0;
  let [_, hours, minutes, ampm] = match;
  hours = parseInt(hours); minutes = parseInt(minutes);
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const newItem = () => ({ id: Date.now() + Math.random(), itemNumber: '', description: '', qty: '1' });

// Sources where 7-Day Trial does NOT apply by default
const NO_TRIAL_SOURCES = ['Caravana Outlet', 'LAHSA', 'HACLB'];

const DEFAULT_FORM_STATE = {
  id: null,
  date: getLocalDateString(),
  timeWindow: '08:00 AM - 10:00 AM',
  source: 'Caravana store',
  orderSource: 'in_store',
  scheduledBy: '',
  deliveryTeam: '',
  clientName: '',
  contactName: '',
  address: '',
  phone: '',
  email: '',
  contactStatus: 'Scheduled',
  invoiceNumber: '',
  orderNumber: '',
  packingList: [],
  items: [newItem()],
  status: 'Scheduled',
  notes: '',
  flagged: null,
  flagReason: '',
  trialEnabled: true,
};

const SOURCES = ['Caravana store', 'Caravana Outlet', 'Caravana Web', 'LAHSA', 'HACLB', 'Synergy', 'Other'];
const STATUSES = ['Pending', 'Sourcing', 'Ready', 'Scheduled', 'In Progress', 'Delivered', 'Reschedule', 'Contacted'];
const HOUR_OPTIONS = [
  '08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM',
  '04:00 PM','05:00 PM','06:00 PM'
];

export default function DeliveryFormModal({ isOpen, onClose, onSave, onDelete, onArchive, delivery, allDeliveries = [] }) {
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [otherSource, setOtherSource] = useState('');

  const TIME_WINDOWS = [
    '08:00 AM - 10:00 AM','10:00 AM - 12:00 PM',
    '12:00 PM - 02:00 PM','02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM','Full Day (08:00 AM - 06:00 PM)','Custom'
  ];

  useEffect(() => {
    supabase.from('team_members').select('name').order('name').then(({ data }) => {
      if (data) setTeamMembers(data.map(m => m.name));
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (delivery) {
      // Migrate legacy packingList to items if needed
      let items = delivery.items?.length ? delivery.items : [];
      if (!items.length && delivery.packingList?.length) {
        items = delivery.packingList.map(it => ({ ...newItem(), description: it.text || it }));
      }
      if (!items.length) items = [newItem()];

      const trialEnabled = delivery.trialEnabled !== undefined
        ? delivery.trialEnabled
        : !NO_TRIAL_SOURCES.includes(delivery.source);

      setFormData({ ...DEFAULT_FORM_STATE, ...delivery, items, trialEnabled });

      if (!TIME_WINDOWS.includes(delivery.timeWindow)) {
        const parts = delivery.timeWindow?.split(' - ') || [];
        setCustomStart(parts[0] || null);
        setCustomEnd(parts[1] || null);
        setFormData(prev => ({ ...prev, timeWindow: 'Custom' }));
      } else {
        setCustomStart(null); setCustomEnd(null);
      }
    } else {
      setFormData({ ...DEFAULT_FORM_STATE, date: getLocalDateString(), items: [newItem()] });
      setCustomStart(null); setCustomEnd(null);
    }
  }, [delivery, isOpen]);

  // Auto-toggle trial is handled inside handleChange (not useEffect)
  // so it only fires on user-initiated source changes, not on load

  if (!isOpen) return null;

  const busyRanges = allDeliveries
    .filter(d => d.date === formData.date && d.id !== formData.id)
    .map(d => {
      const p = d.timeWindow?.split(' - ') || [];
      return { start: timeToMinutes(p[0]), end: timeToMinutes(p[1] || p[0]) };
    });
  const isTimeBusy = t => busyRanges.some(r => timeToMinutes(t) >= r.start && timeToMinutes(t) < r.end);
  const isWindowBusy = w => w === 'Custom' ? false : (() => {
    const p = w.split(' - ');
    const s = timeToMinutes(p[0]), e = timeToMinutes(p[1] || p[0]);
    return busyRanges.some(r => s < r.end && e > r.start);
  })();

  const handleChange = e => {
    const { name, value } = e.target;
    // When source changes, auto-set trial based on final-sale sources
    if (name === 'source') {
      const isFinalSale = NO_TRIAL_SOURCES.includes(value);
      setFormData(prev => ({ ...prev, source: value, trialEnabled: !isFinalSale }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Items handlers
  const updateItem = (id, field, value) =>
    setFormData(prev => ({ ...prev, items: prev.items.map(it => it.id === id ? { ...it, [field]: value } : it) }));
  const addItem = () =>
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem()] }));
  const removeItem = id =>
    setFormData(prev => ({ ...prev, items: prev.items.filter(it => it.id !== id) }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const { data, error } = await supabase.storage.from('delivery-photos').upload(fileName, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('delivery-photos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, photoUrls: [...(prev.photoUrls || []), publicUrl] }));
    } else alert('Upload error: ' + error.message);
    setIsUploading(false);
  };

  const removePhoto = url =>
    setFormData(prev => ({ ...prev, photoUrls: (prev.photoUrls || []).filter(u => u !== url) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalTimeWindow = formData.timeWindow;
    if (formData.timeWindow === 'Custom') {
      finalTimeWindow = customStart && customEnd ? `${customStart} - ${customEnd}` : customStart || customEnd || 'Custom';
    }
    const finalSource = formData.source === 'Other' && otherSource.trim() ? otherSource.trim() : formData.source;
    onSave({
      ...formData,
      source: finalSource,
      id: formData.id || null, // Allow App.jsx to handle final ID generation (isNew vs update)
      timeWindow: finalTimeWindow,
      items: formData.items.filter(it => it.description.trim() || it.itemNumber.trim()),
      trialExpires: formData.trialEnabled && formData.date ? addDays(formData.date, 7) : null,
    });
  };

  const trialDate = formData.date ? fmtDate(addDays(formData.date, 7)) : '';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content fade-in">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 className="modal-title">{delivery ? 'Edit Delivery' : 'New Delivery'}</h2>
            {delivery && (
              <button type="button" 
                onClick={() => setFormData(p => ({ ...p, locked: !p.locked }))}
                style={{ background: 'transparent', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', background: formData.locked ? '#fef2f2' : '#f0fdf4', color: formData.locked ? '#c53030' : '#15803d', fontWeight: 600 }}>
                {formData.locked ? '🔒 Locked' : '🔓 Unlocked'}
              </button>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="delivery-form">
          <div className="form-sections-wrapper">

            {/* LEFT COLUMN */}
            <div className="form-left-col">
              <section className="form-section">
                <h3 className="section-title">1. Delivery Schedule</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Delivery Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Time Window</label>
                    <select name="timeWindow" value={formData.timeWindow} onChange={handleChange}>
                      {TIME_WINDOWS.map(w => {
                        const busy = isWindowBusy(w);
                        return (
                          <option key={w} value={w} disabled={w !== 'Custom' && busy}>
                            {w}{busy ? ' (BUSY)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {formData.timeWindow === 'Custom' && (
                  <div className="custom-hour-picker-group">
                    <label style={{ fontSize: '0.75rem', marginTop: '1rem', display: 'block' }}>Pick Start Hour</label>
                    <div className="hour-pill-grid">
                      {HOUR_OPTIONS.map(h => (
                        <button key={h} type="button"
                          className={`hour-pill ${customStart === h ? 'active' : ''}`}
                          disabled={isTimeBusy(h)} onClick={() => setCustomStart(h)}>{h}</button>
                      ))}
                    </div>
                    <label style={{ fontSize: '0.75rem', marginTop: '0.75rem', display: 'block' }}>Pick End Hour</label>
                    <div className="hour-pill-grid">
                      {HOUR_OPTIONS.filter(h => !customStart || HOUR_OPTIONS.indexOf(h) > HOUR_OPTIONS.indexOf(customStart)).map(h => (
                        <button key={h} type="button"
                          className={`hour-pill ${customEnd === h ? 'active' : ''}`}
                          disabled={isTimeBusy(h) && !busyRanges.some(r => timeToMinutes(h) === r.start)}
                          onClick={() => setCustomEnd(h)}>{h}</button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="form-section" style={{ marginTop: '1.5rem' }}>
                <h3 className="section-title">2. Client Details</h3>
                <div className="form-group">
                  <label>Client Name</label>
                  <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} placeholder="Full name" required />
                </div>
                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(555) 000-0000" required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="customer@email.com" />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label>Contact Name (Optional)</label>
                    <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} placeholder="Secondary contact" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Delivery Address</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows="3" placeholder="Full address and unit #" required />
                </div>
              </section>

              <section className="form-section" style={{ marginTop: '1.5rem' }}>
                <h3 className="section-title">3. Status & Notes</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Overall Status</label>
                    <select name="status" value={formData.status} onChange={handleChange}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Contact Status</label>
                    <select name="contactStatus" value={formData.contactStatus} onChange={handleChange}>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Contacted Client">Contacted Client</option>
                      <option value="Reschedule">Reschedule</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Access & Placement Notes (gate codes, stairs, room preferences...)</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows="4" placeholder="Add any special instructions here..." />
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="form-right-col">
              <section className="form-section">
                <h3 className="section-title">4. Logistics</h3>

                {/* Order Source */}
                <div className="form-group">
                  <label>Order Source</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['in_store', '🏬 In-Store'], ['online', '🌐 Online']].map(([v, lbl]) => (
                      <button key={v} type="button"
                        onClick={() => setFormData(p => ({ ...p, orderSource: v }))}
                        className={`source-toggle-btn ${formData.orderSource === v ? 'active' : ''}`}
                      >{lbl}</button>
                    ))}
                  </div>
                </div>

                {/* Organization */}
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Source / Organization</label>
                  <select name="source" value={formData.source} onChange={handleChange}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {formData.source === 'Other' && (
                    <input type="text" value={otherSource} onChange={e => setOtherSource(e.target.value)}
                      placeholder="Describe source..."
                      style={{ marginTop: 6, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', fontFamily: 'inherit', width: '100%' }}
                    />
                  )}
                </div>

                {/* Team + Scheduled By */}
                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label>Delivery Team</label>
                    <select name="deliveryTeam" value={formData.deliveryTeam} onChange={handleChange}>
                      <option value="">— Unassigned —</option>
                      {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
                      {teamMembers.length > 1 && teamMembers.flatMap((a, i) =>
                        teamMembers.slice(i + 1).map(b => (
                          <option key={`${a}&${b}`} value={`${a} & ${b}`}>{a} & {b}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Scheduled By</label>
                    <input type="text" name="scheduledBy" value={formData.scheduledBy} onChange={handleChange} placeholder="Your name" />
                  </div>
                </div>

                {/* Order # + Invoice */}
                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label>Order #</label>
                    <input type="text" name="orderNumber" value={formData.orderNumber || ''} onChange={handleChange} placeholder="CAR-2026-0089" />
                  </div>
                  <div className="form-group">
                    <label>Invoice #</label>
                    <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} placeholder="INV-####" />
                  </div>
                </div>

                {/* 7-Day Trial toggle */}
                <div className="trial-toggle-row" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)' }}>7-DAY TRIAL</div>
                      {formData.trialEnabled && formData.date ? (
                        <div style={{ fontSize: '0.85rem', color: '#0b7a4a', fontWeight: 600 }}>
                          Expires: {trialDate}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                          {NO_TRIAL_SOURCES.includes(formData.source) ? 'Final sale — no trial' : 'Trial disabled'}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, trialEnabled: !p.trialEnabled }))}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: formData.trialEnabled ? '#0b7a4a' : 'var(--border)',
                        position: 'relative', transition: 'var(--transition)',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3, transition: 'var(--transition)',
                        left: formData.trialEnabled ? 22 : 3,
                      }} />
                    </button>
                  </div>
                </div>

                {/* Flag buttons — completed deliveries only */}
                {delivery && (delivery.status === 'Delivered' || delivery.completedAt) && (
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Post-Delivery Flag</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['return', '🔴 Return', '#c53030'], ['exchange', '🟡 Exchange', '#c89b0a'], ['repair', '🟣 Repair', '#9333ea']].map(([v, lbl, col]) => (
                        <button key={v} type="button"
                          onClick={() => setFormData(p => ({ ...p, flagged: p.flagged === v ? null : v, flagDate: getLocalDateString() }))}
                          style={{
                            flex: 1, padding: '7px 6px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            border: `1.5px solid ${formData.flagged === v ? col : 'var(--border)'}`,
                            background: formData.flagged === v ? col + '18' : 'var(--surface)',
                            color: formData.flagged === v ? col : 'var(--text-light)',
                          }}
                        >{lbl}</button>
                      ))}
                    </div>
                    {formData.flagged && (
                      <textarea name="flagReason" value={formData.flagReason || ''} onChange={handleChange}
                        placeholder="Reason for flag..."
                        rows={2}
                        style={{ width: '100%', marginTop: 8, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: 13, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    )}
                  </div>
                )}
              </section>

              {/* Items Section */}
              <section className="form-section" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 className="section-title" style={{ margin: 0 }}>5. Items</h3>
                  <button type="button" className="btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
                </div>

                {/* Header row */}
                <div className="items-header">
                  <span style={{ flex: '0 0 90px' }}>Item #</span>
                  <span style={{ flex: 1 }}>Description</span>
                  <span style={{ flex: '0 0 55px', textAlign: 'center' }}>Qty</span>
                  <span style={{ flex: '0 0 28px' }}></span>
                </div>

                <div className="items-list">
                  {formData.items.map((item, idx) => (
                    <div key={item.id} className="item-row">
                      <input
                        type="text"
                        value={item.itemNumber}
                        onChange={e => updateItem(item.id, 'itemNumber', e.target.value)}
                        placeholder={`#${idx + 1}`}
                        className="item-input item-num"
                      />
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description..."
                        className="item-input item-desc"
                      />
                      <input
                        type="text"
                        value={item.qty}
                        onChange={e => updateItem(item.id, 'qty', e.target.value)}
                        placeholder="1"
                        className="item-input item-qty"
                      />
                      <button type="button" onClick={() => removeItem(item.id)}
                        style={{ background: 'none', border: 'none', color: '#c53030', cursor: 'pointer', fontSize: 18, flexShrink: 0, padding: '0 4px' }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Photos */}
              <section className="form-section" style={{ marginTop: '1.5rem' }}>
                <h3 className="section-title">6. Photos</h3>
                <div className="photo-preview-grid">
                  {(formData.photoUrls || []).map((url, i) => (
                    <div key={i} className="photo-preview-item">
                      <img src={url} alt="delivery" />
                      <button type="button" className="photo-remove-btn" onClick={() => removePhoto(url)}>×</button>
                    </div>
                  ))}
                  <label className="photo-upload-btn">
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    {isUploading ? '⏳' : '📷'}
                    <span>{isUploading ? 'Uploading...' : 'Add Photo'}</span>
                  </label>
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {delivery && (
              <>
                {formData.locked ? (
                  <span style={{ color: '#c53030', fontSize: '0.8rem', marginRight: 'auto', fontWeight: 600 }}>🔒 Locked (Cannot Delete)</span>
                ) : (
                  <>
                    <button type="button" className="btn-secondary" style={{ color: '#c53030', borderColor: '#c53030', marginRight: 8 }}
                      onClick={() => { if (confirm('Delete this delivery?')) onDelete(delivery.id); }}>
                      Delete
                    </button>
                    <button type="button" className="btn-secondary" style={{ color: '#c89b0a', borderColor: '#c89b0a', marginRight: 'auto' }}
                      onClick={() => { setFormData(prev => ({ ...prev, status: 'Reschedule' })); alert('Status set to Reschedule. Please pick a NEW DATE above and click Save.'); }}>
                      🔄 Reschedule
                    </button>
                  </>
                )}
                {onArchive && (
                  <button type="button" className="btn-secondary"
                    onClick={() => { if (confirm('Archive this delivery?')) { onArchive(delivery.id); onClose(); } }}>
                    📦 Archive
                  </button>
                )}
              </>
            )}


            {/* Receipt / Acknowledgment — for delivered orders with contact info */}
            {(formData.status === 'Delivered' || formData.completedAt) && (formData.phone || formData.email) && (
              <button type="button" className="btn-secondary"
                style={{ color: '#7c3aed', borderColor: '#7c3aed' }}
                onClick={() => {
                  const firstName = (formData.clientName || '').split(' ')[0] || 'there';
                  const itemList = (formData.items || []).filter(it => it.description).map(it =>
                    `${it.itemNumber ? it.itemNumber + ' — ' : ''}${it.description}${it.qty && it.qty !== '1' ? ` (×${it.qty})` : ''}`
                  );
                  const msg = `Hi ${firstName}! Thank you for choosing Caravana Furniture${formData.orderNumber ? ` (Order ${formData.orderNumber})` : ''}. Your delivery is complete!\n\n📦 Items Delivered:\n${itemList.map((it,i) => `${i+1}. ${it}`).join('\n')}${formData.trialEnabled && formData.trialExpires ? `\n\n⏰ 7-Day Trial expires: ${fmtDate(formData.trialExpires)}` : ''}\n\nThank you! — The Caravana Family 📞 (562) 432-0562`;
                  if (formData.phone) {
                    const { username, apiKey } = { username: localStorage.getItem('tm_username'), apiKey: localStorage.getItem('tm_apikey') };
                    if (username && apiKey) {
                      const clean = formData.phone.replace(/\D/g,'');
                      const e164 = clean.startsWith('1') ? `+${clean}` : `+1${clean}`;
                      fetch('https://rest.textmagic.com/api/v2/messages', {
                        method: 'POST',
                        headers: { 'X-TM-Username': username, 'X-TM-Key': apiKey, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: msg, phones: e164 }),
                      }).then(() => alert('✅ Receipt SMS sent!')).catch(() => alert('SMS failed — check TextMagic settings'));
                    } else {
                      navigator.clipboard?.writeText(msg);
                      alert('📋 Receipt copied! (TextMagic not configured — go to Follow-ups tab → ⚙️ to set up)');
                    }
                  }
                  if (formData.email) {
                    window.open(`mailto:${formData.email}?subject=Your Caravana Furniture Delivery Receipt&body=${encodeURIComponent(msg)}`, '_blank');
                  }
                }}
              >
                📧 Send Receipt
              </button>
            )}

            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {delivery ? 'Save Changes' : 'Create Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
