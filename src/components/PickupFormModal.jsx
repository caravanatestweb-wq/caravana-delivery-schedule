import React, { useState, useEffect } from 'react';
import './DeliveryFormModal.css';

export default function PickupFormModal({ isOpen, onClose, onSave, onDelete, pickup, teamMembers = [] }) {
  const getInitialState = () => ({
    id: null,
    date: new Date().toISOString().split('T')[0],
    time_window: '08:00 AM - 10:00 AM',
    vendor_name: '',
    warehouse_name: '',
    order_number: '',
    items_list: '',
    address: '',
    notes: '',
    status: 'Scheduled',
    team_id: 'Team 1'
  });

  const [formData, setFormData] = useState(getInitialState());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (pickup) {
      setFormData({ ...getInitialState(), ...pickup });
    } else {
      setFormData(getInitialState());
    }
  }, [pickup, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e, keepOpen = false) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await onSave(formData, keepOpen);
    setIsSaving(false);
    
    if (success && keepOpen) {
      // Clear specific fields for next entry
      setFormData(prev => ({
        ...prev,
        id: null,
        vendor_name: '',
        warehouse_name: '',
        order_number: '',
        items_list: '',
        notes: ''
      }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ borderTop: '6px solid #2563eb', maxWidth: 650 }}>
        <div className="modal-header">
          <h2 style={{ color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏭</span> {pickup ? 'Edit Warehouse Pickup' : 'Schedule Warehouse Pickup'}
          </h2>
          <button className="close-btn" onClick={onClose} style={{ color: '#2563eb' }}>&times;</button>
        </div>

        <form className="modal-form">
          {/* Row 1 */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Date</label>
              <input type="date" required value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>ETA Window</label>
              <input type="text" placeholder="e.g. 09:00 AM - 11:00 AM" required value={formData.time_window || ''} onChange={e => setFormData({ ...formData, time_window: e.target.value })} />
            </div>
          </div>

          {/* Row 2: Vendors & Teams */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
             <div className="form-group">
               <label>Vendor Name <span style={{ color: '#c53030' }}>*</span></label>
               <input type="text" required placeholder="e.g. Ashley Furniture" value={formData.vendor_name || ''} onChange={e => setFormData({ ...formData, vendor_name: e.target.value })} />
             </div>
             <div className="form-group">
               <label>Warehouse Name / ID</label>
               <input type="text" placeholder="e.g. Fontana Depot 1" value={formData.warehouse_name || ''} onChange={e => setFormData({ ...formData, warehouse_name: e.target.value })} />
             </div>
             <div className="form-group">
               <label>Assigned Team</label>
               <select value={formData.team_id || 'Team 1'} onChange={e => setFormData({ ...formData, team_id: e.target.value })}>
                 <option value="Team 1">Team 1</option>
                 <option value="Team 2">Team 2</option>
                 {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
               </select>
             </div>
          </div>

          <div className="form-group">
            <label>Vendor Address</label>
            <input type="text" placeholder="Loading dock details or full address..." value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          </div>

          {/* Row 3: Orders */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <div className="form-group">
              <label>Order Number (PO #)</label>
              <input type="text" placeholder="e.g. PO-987654" value={formData.order_number || ''} onChange={e => setFormData({ ...formData, order_number: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Items List</label>
              <textarea rows="2" placeholder="e.g. 2x Sectional Sofas, 1x Dining Set" value={formData.items_list || ''} onChange={e => setFormData({ ...formData, items_list: e.target.value })}></textarea>
            </div>
          </div>

          <div className="form-group">
            <label>Logistics Notes (Gate Code / Reference)</label>
            <textarea rows="2" placeholder="Ask for Mark in shipping..." value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
          </div>

          {pickup && (
            <div className="form-group">
              <label>Status</label>
              <select value={formData.status || 'Scheduled'} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                <option value="Scheduled">Scheduled</option>
                <option value="En Route">En Route</option>
                <option value="Completed">Completed</option>
                <option value="Canceled">Canceled</option>
              </select>
            </div>
          )}

          <div className="form-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              {pickup && (
                <button type="button" className="btn btn-secondary" style={{ color: '#c53030', borderColor: '#fca5a5' }} onClick={() => onDelete(pickup.id)}>
                  🗑️ Delete
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
              {!pickup && (
                <button type="button" className="btn btn-secondary" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e3a8a' }} onClick={(e) => handleSubmit(e, true)} disabled={isSaving}>
                  ➕ Save & Add Another
                </button>
              )}
              <button type="button" className="btn" style={{ background: '#2563eb', color: '#fff' }} onClick={(e) => handleSubmit(e, false)} disabled={isSaving}>
                {isSaving ? 'Saving...' : (pickup ? '💾 Save Changes' : '💾 Save & Close')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
