import React, { useState, useEffect } from 'react';
import './DeliveryFormModal.css';

const getLocalDateString = (date = new Date()) => {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
};

const DEFAULT_FORM_STATE = {
  id: null,
  date: getLocalDateString(),
  timeWindow: '08:00 AM - 10:00 AM',
  source: 'Caravana store',
  scheduledBy: '',
  clientName: '',
  contactName: '',
  address: '',
  phone: '',
  contactStatus: 'Scheduled',
  invoiceNumber: '',
  packingList: [{ id: Date.now(), text: '' }], 
  status: 'Scheduled',
  notes: ''
};

const SOURCES = ['Caravana store', 'Caravana Web', 'LAHSA', 'HACLB', 'Synergy', 'Other'];
const STATUSES = ['Scheduled', 'Reschedule', 'Contacted', 'Delivered'];
const HOUR_OPTIONS = [
  '08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM',
  '04:00 PM','05:00 PM','06:00 PM'
];

export default function DeliveryFormModal({ isOpen, onClose, onSave, onDelete, delivery, allDeliveries = [] }) {
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);

  const TIME_WINDOWS = [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 02:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    'Full Day (08:00 AM - 06:00 PM)',
    'Custom'
  ];

  useEffect(() => {
    if (delivery) {
      setFormData({ 
        ...delivery, 
        packingList: delivery.packingList && delivery.packingList.length > 0 
          ? delivery.packingList 
          : [{ id: Date.now(), text: '' }]
      });
      if (!TIME_WINDOWS.includes(delivery.timeWindow)) {
        setFormData(prev => ({ ...prev, timeWindow: 'Custom' }));
        const parts = delivery.timeWindow.split(' - ');
        setCustomStart(parts[0] || null);
        setCustomEnd(parts[1] || null);
      } else {
        setCustomStart(null);
        setCustomEnd(null);
      }
    } else {
      setFormData({ ...DEFAULT_FORM_STATE, date: getLocalDateString(), packingList: [{ id: Date.now(), text: '' }] });
      setCustomStart(null);
      setCustomEnd(null);
    }
  }, [delivery, isOpen]);

  if (!isOpen) return null;

  // Conflict prevention: Get busy times for the selected date (excluding current editing delivery)
  const busyTimes = allDeliveries
    .filter(d => d.date === formData.date && d.id !== formData.id)
    .map(d => d.timeWindow);

  const isTimeOverlap = (time) => {
    return busyTimes.some(bt => bt.includes(time));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePackingChange = (id, text) => {
    setFormData(prev => ({
      ...prev,
      packingList: prev.packingList.map(item => item.id === id ? { ...item, text } : item)
    }));
  };

  const addPackingItem = () => {
    setFormData(prev => ({
      ...prev,
      packingList: [...prev.packingList, { id: Date.now(), text: '' }]
    }));
  };

  const removePackingItem = (id) => {
    setFormData(prev => ({
      ...prev,
      packingList: prev.packingList.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalTimeWindow = formData.timeWindow;
    if (formData.timeWindow === 'Custom') {
      if (customStart && customEnd) finalTimeWindow = `${customStart} - ${customEnd}`;
      else finalTimeWindow = customStart || customEnd || 'Custom';
    }
    onSave({
      ...formData,
      id: formData.id || Date.now().toString(),
      timeWindow: finalTimeWindow,
      packingList: formData.packingList.filter(item => item.text.trim() !== '')
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content fade-in" style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{delivery ? 'Edit Delivery' : 'New Delivery'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="delivery-form">
          <div className="form-sections-wrapper" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            
            {/* LEFT COLUMN: Main Info */}
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
                      {TIME_WINDOWS.map(w => (
                        <option key={w} value={w} disabled={w !== 'Custom' && busyTimes.includes(w)}>
                          {w} {busyTimes.includes(w) ? ' (Already Scheduled)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.timeWindow === 'Custom' && (
                  <div className="custom-hour-picker-group">
                    <label style={{ fontSize: '0.75rem', marginTop: '1rem', display: 'block' }}>Pick Start Hour</label>
                    <div className="hour-pill-grid">
                      {HOUR_OPTIONS.map(h => (
                        <button 
                          key={h} type="button" 
                          className={`hour-pill ${customStart === h ? 'active' : ''}`}
                          disabled={isTimeOverlap(h)}
                          onClick={() => setCustomStart(h)}
                        >{h}</button>
                      ))}
                    </div>
                    <label style={{ fontSize: '0.75rem', marginTop: '0.75rem', display: 'block' }}>Pick End Hour</label>
                    <div className="hour-pill-grid">
                      {HOUR_OPTIONS.filter(h => !customStart || HOUR_OPTIONS.indexOf(h) > HOUR_OPTIONS.indexOf(customStart)).map(h => (
                        <button 
                          key={h} type="button" 
                          className={`hour-pill ${customEnd === h ? 'active' : ''}`}
                          disabled={isTimeOverlap(h)}
                          onClick={() => setCustomEnd(h)}
                        >{h}</button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="form-section" style={{ marginTop: '2rem' }}>
                <h3 className="section-title">2. Client Details</h3>
                <div className="form-group">
                  <label>Client Name</label>
                  <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} placeholder="Full name of client" required />
                </div>
                <div className="form-row" style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(555) 000-0000" required />
                  </div>
                  <div className="form-group">
                    <label>Contact Name (Optional)</label>
                    <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} placeholder="Secondary contact" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Delivery Address</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows="2" placeholder="Full address and unit #" required />
                </div>
              </section>

              <section className="form-section" style={{ marginTop: '2rem' }}>
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
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Additional Notes (Gate code, access instructions, etc.)</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" placeholder="Add any special instructions here..." />
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: Logistics & Packing */}
            <div className="form-right-col">
              <section className="form-section">
                <h3 className="section-title">4. Logistics</h3>
                <div className="form-group">
                  <label>Source</label>
                  <select name="source" value={formData.source} onChange={handleChange}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>Scheduled By</label>
                  <input type="text" name="scheduledBy" value={formData.scheduledBy} onChange={handleChange} placeholder="Your name" />
                </div>
                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>Invoice Number</label>
                  <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} placeholder="e.g. INV-12345" />
                </div>
              </section>

              <section className="form-section" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                   <h3 className="section-title" style={{ margin: 0 }}>5. Packing List</h3>
                   <button type="button" className="btn-secondary btn-sm" onClick={addPackingItem}>+ Add Item</button>
                </div>
                <div className="packing-list-container">
                  {formData.packingList.map((item, idx) => (
                    <div key={item.id} className="packing-item-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={item.text} 
                        onChange={(e) => handlePackingChange(item.id, e.target.value)} 
                        placeholder={`Item ${idx + 1}...`}
                        style={{ flex: 1 }}
                      />
                      {formData.packingList.length > 1 && (
                        <button type="button" className="btn-icon" onClick={() => removePackingItem(item.id)} style={{ color: 'red' }}>&times;</button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>

          </div>

          <div className="modal-footer" style={{ justifyContent: delivery ? 'space-between' : 'flex-end' }}>
            {delivery && (
              <button type="button" className="btn-secondary" style={{ color: 'red', borderColor: 'red' }} onClick={() => onDelete(delivery.id)}>
                Delete Delivery
              </button>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">Save Delivery</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
