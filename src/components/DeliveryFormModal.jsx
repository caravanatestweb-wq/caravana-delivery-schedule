import React, { useState, useEffect } from 'react';
import './DeliveryFormModal.css';

const DEFAULT_FORM_STATE = {
  id: null,
  date: new Date().toISOString().split('T')[0],
  timeWindow: '08:00 AM - 10:00 AM',
  source: 'Caravana store',
  clientName: '',
  contactName: '',
  address: '',
  phone: '',
  contactStatus: 'Scheduled',
  invoiceNumber: '',
  packingList: [], // Array of { id, text, checked }
  status: 'Scheduled'
};


const SOURCES = [
  'Caravana store',
  'Caravana Web',
  'LAHSA',
  'HACLB',
  'Synergy',
  'Other'
];

const STATUSES = [
  'Scheduled',
  'Reschedule',
  'Contacted',
  'Delivered'
];

export default function DeliveryFormModal({ isOpen, onClose, onSave, onDelete, delivery, timeWindows: externalWindows }) {
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [customTimeWindow, setCustomTimeWindow] = useState('');

  const TIME_WINDOWS = externalWindows && externalWindows.length > 0 ? externalWindows : [
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
      let parsedPackingList = delivery.packingList || [];
      // Handle legacy records where packingList was a string
      if (typeof parsedPackingList === 'string') {
        parsedPackingList = parsedPackingList.split('\n').filter(s => s.trim() !== '').map((text, i) => ({
          id: Date.now() + i,
          text: text.replace(/^\[[ x]\]\s*/i, ''),
          checked: text.toLowerCase().startsWith('[x]')
        }));
      }

      setFormData({
        ...delivery,
        packingList: parsedPackingList
      });

      if (!TIME_WINDOWS.includes(delivery.timeWindow)) {
        setFormData(prev => ({ ...prev, timeWindow: 'Custom' }));
        setCustomTimeWindow(delivery.timeWindow);
      }
    } else {
      setFormData(DEFAULT_FORM_STATE);
      setCustomTimeWindow('');
    }
  }, [delivery, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      packingList: [...prev.packingList, { id: Date.now(), text: '', checked: false }]
    }));
  };

  const updateItem = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      packingList: prev.packingList.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeItem = (id) => {
    setFormData(prev => ({
      ...prev,
      packingList: prev.packingList.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      id: formData.id || Date.now().toString(),
      timeWindow: formData.timeWindow === 'Custom' ? customTimeWindow : formData.timeWindow
    };
    onSave(finalData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content fade-in">
        <div className="modal-header">
          <h2 className="modal-title">{delivery ? 'Edit Delivery' : 'New Delivery'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="delivery-form">
          <div className="form-grid">
            
            {/* Row 1: Date and Time Window */}
            <div className="form-group">
              <label>Delivery Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label>Time Window</label>
              <select name="timeWindow" value={formData.timeWindow} onChange={handleChange}>
                {TIME_WINDOWS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {formData.timeWindow === 'Custom' && (
                <input 
                  type="text" 
                  placeholder="e.g. 09:00 AM - 10:00 AM" 
                  value={customTimeWindow} 
                  onChange={(e) => setCustomTimeWindow(e.target.value)} 
                  className="mt-2"
                  required
                />
              )}
            </div>

            {/* Row 2: Source and Invoice */}
            <div className="form-group">
              <label>Source</label>
              <select name="source" value={formData.source} onChange={handleChange}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Invoice Number</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  name="invoiceNumber" 
                  value={formData.invoiceNumber} 
                  onChange={handleChange} 
                  placeholder="INV-12345" 
                  style={{ flex: 1 }}
                />
                <button 
                  type="button" 
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    if (!formData.invoiceNumber) return;
                    setFormData(prev => ({
                      ...prev,
                      packingList: [
                        { id: Date.now() + 1, text: '1x Sofa (sku: SF-001)', checked: false },
                        { id: Date.now() + 2, text: '2x Accent Chairs (sku: AC-102)', checked: false },
                        { id: Date.now() + 3, text: '1x Coffee Table (sku: CT-050)', checked: false },
                        { id: Date.now() + 4, text: 'Client Acknowledged Receipt', checked: false }
                      ]
                    }));
                  }}
                  title="Auto-fetch line items from invoice"
                >
                  Fetch Items
                </button>
              </div>
            </div>

            {/* Row 3: Client Info */}
            <div className="form-group">
              <label>Client Name</label>
              <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} placeholder="John Doe" required />
            </div>

            <div className="form-group">
              <label>Contact Name (If different)</label>
              <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} placeholder="Jane Doe" />
            </div>

            {/* Row 4: Phone and Contact Status */}
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(555) 123-4567" required />
            </div>

            <div className="form-group">
              <label>Contact Status</label>
              <select name="contactStatus" value={formData.contactStatus} onChange={handleChange}>
                <option value="Contacted Client">Contacted Client</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Reschedule">Reschedule</option>
              </select>
            </div>

            {/* Row 5: Address (Full Width) */}
            <div className="form-group full-width">
              <label>Delivery Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows="2" placeholder="123 Main St, City, State ZIP" required></textarea>
            </div>

            {/* Row 6: Overal Status and Packing List */}
            <div className="form-group">
              <label>Overall Delivery Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ margin: 0 }}>Packing List / Items</label>
                <button type="button" className="btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
              </div>
              
              {formData.packingList.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                  No items added yet. Click "+ Add Item" or fetch from an invoice.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {formData.packingList.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={item.checked} 
                        onChange={(e) => updateItem(item.id, 'checked', e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <input 
                        type="text" 
                        value={item.text} 
                        onChange={(e) => updateItem(item.id, 'text', e.target.value)} 
                        placeholder="Item description..." 
                        style={{ flex: 1, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'var(--text-light)' : 'inherit' }}
                      />
                      <button 
                        type="button" 
                        className="btn-icon" 
                        onClick={() => removeItem(item.id)}
                        style={{ color: 'red', width: '32px', height: '32px' }}
                        title="Remove item"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
