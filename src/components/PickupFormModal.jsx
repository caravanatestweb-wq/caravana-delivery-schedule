import React, { useState, useEffect } from 'react';
import './DeliveryFormModal.css';

export default function PickupFormModal({ isOpen, onClose, onSave, onDelete, pickup, teamMembers = [] }) {
  const getInitialState = () => ({
    id: null,
    date: new Date().toISOString().split('T')[0],
    time_window: '08:00 AM - 10:00 AM',
    vendor_name: 'Various Vendors',
    warehouse_name: '',
    order_number: 'MULTIPLE',
    items_list: '',
    address: '',
    notes: '',
    status: 'Scheduled',
    team_id: 'Team 1'
  });

  const [formData, setFormData] = useState(getInitialState());
  const [isSaving, setIsSaving] = useState(false);
  
  // State for dynamic TimeBlock -> Vendor -> Order -> Items hierarchy
  const newId = () => Date.now() + Math.random();
  const [vendors, setVendors] = useState([{
    id: newId(),
    name: '',
    orders: [{ id: newId(), po: '', items: [{ id: newId(), desc: '', isShowroom: false }] }]
  }]);

  useEffect(() => {
    if (pickup) {
      setFormData({ ...getInitialState(), ...pickup });
      if (pickup.items_list && pickup.items_list.trim().startsWith('[')) {
        try {
          setVendors(JSON.parse(pickup.items_list));
        } catch(e) {}
      } else {
        // Legacy support
        setVendors([{
          id: newId(),
          name: pickup.vendor_name || '',
          orders: [{ id: newId(), po: pickup.order_number || '', items: [{ id: newId(), desc: pickup.items_list || '', isShowroom: false }] }]
        }]);
      }
    } else {
      setFormData(getInitialState());
      setVendors([{
        id: newId(),
        name: '',
        orders: [{ id: newId(), po: '', items: [{ id: newId(), desc: '', isShowroom: false }] }]
      }]);
    }
  }, [pickup, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e, keepOpen = false) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = {
      ...formData,
      vendor_name: vendors.map(v => v.name).filter(Boolean).join(', ') || 'Various Vendors',
      items_list: JSON.stringify(vendors)
    };

    const success = await onSave(payload, keepOpen);
    setIsSaving(false);
    
    if (success && keepOpen) {
      // Clear specific fields for next entry
      setFormData(prev => ({
        ...prev,
        id: null,
        notes: ''
      }));
      setVendors([{
        id: newId(),
        name: '',
        orders: [{ id: newId(), po: '', items: [{ id: newId(), desc: '', isShowroom: false }] }]
      }]);
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

          {/* Vendors & Teams */}
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
             <div className="form-group">
               <label>Assigned Team</label>
               <select value={formData.team_id || 'Team 1'} onChange={e => setFormData({ ...formData, team_id: e.target.value })}>
                 <option value="Team 1">Team 1</option>
                 <option value="Team 2">Team 2</option>
                 {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
               </select>
             </div>
             <div className="form-group">
               <label>Warehouse Name / ID</label>
               <input type="text" placeholder="e.g. Fontana Depot 1" value={formData.warehouse_name || ''} onChange={e => setFormData({ ...formData, warehouse_name: e.target.value })} />
             </div>
          </div>

          <div className="form-group">
            <label>Master Loading Dock Address (if same for all)</label>
            <input type="text" placeholder="Loading dock details or full address..." value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          </div>

          {/* DYNAMIC VENDORS / ORDERS / ITEMS */}
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>Box/Items Hierarchy</label>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {vendors.map((vendor, vIndex) => (
                <div key={vendor.id} style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  
                  {/* VENDOR LEVEL */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>VENDOR {vIndex + 1}</div>
                    <input type="text" placeholder="Vendor Name (e.g. Ashley)" value={vendor.name} 
                      onChange={e => {
                        const newV = [...vendors];
                        newV[vIndex].name = e.target.value;
                        setVendors(newV);
                      }}
                      style={{ flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                    <button type="button" onClick={() => setVendors(vendors.filter((_, i) => i !== vIndex))} style={{ color: '#c53030', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>

                  {/* ORDERS LEVEL */}
                  <div style={{ paddingLeft: 16, borderLeft: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {vendor.orders.map((order, oIndex) => (
                      <div key={order.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Order/PO #</span>
                          <input type="text" placeholder="PO-12345" value={order.po}
                            onChange={e => {
                              const newV = [...vendors];
                              newV[vIndex].orders[oIndex].po = e.target.value;
                              setVendors(newV);
                            }}
                            style={{ width: 140, padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #cbd5e1' }} />
                          <button type="button" onClick={() => {
                            const newV = [...vendors];
                            newV[vIndex].orders = newV[vIndex].orders.filter((_, i) => i !== oIndex);
                            setVendors(newV);
                          }} style={{ color: '#c53030', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Remove PO</button>
                        </div>
                        
                        {/* ITEMS LEVEL */}
                        <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {order.items.map((item, iIndex) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, color: '#94a3b8' }}>↳</span>
                              <input type="text" placeholder="Item description" value={item.desc}
                                onChange={e => {
                                  const newV = [...vendors];
                                  newV[vIndex].orders[oIndex].items[iIndex].desc = e.target.value;
                                  setVendors(newV);
                                }} style={{ flex: 1, padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #e2e8f0' }} />
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: 4 }}>
                                <input type="checkbox" checked={item.isShowroom} 
                                  onChange={e => {
                                    const newV = [...vendors];
                                    newV[vIndex].orders[oIndex].items[iIndex].isShowroom = e.target.checked;
                                    setVendors(newV);
                                  }} /> Showroom Stock
                              </label>
                              <button type="button" onClick={() => {
                                const newV = [...vendors];
                                newV[vIndex].orders[oIndex].items = newV[vIndex].orders[oIndex].items.filter((_, i) => i !== iIndex);
                                setVendors(newV);
                              }} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>×</button>
                            </div>
                          ))}
                          <button type="button" 
                            onClick={() => {
                              const newV = [...vendors];
                              newV[vIndex].orders[oIndex].items.push({ id: newId(), desc: '', isShowroom: false });
                              setVendors(newV);
                            }}
                            style={{ width: 'max-content', padding: '2px 8px', fontSize: 11, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, cursor: 'pointer' }}>+ Add Item</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" 
                      onClick={() => {
                        const newV = [...vendors];
                        newV[vIndex].orders.push({ id: newId(), po: '', items: [{ id: newId(), desc: '', isShowroom: false }] });
                        setVendors(newV);
                      }}
                      style={{ width: 'max-content', padding: '4px 12px', fontSize: 11, color: '#0f766e', background: '#ccfbf1', border: '1px solid #99f6e4', borderRadius: 4, cursor: 'pointer', alignSelf: 'flex-start' }}>+ Add PO/Order</button>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" 
              onClick={() => {
                setVendors([...vendors, { id: newId(), name: '', orders: [{ id: newId(), po: '', items: [{ id: newId(), desc: '', isShowroom: false }] }] }]);
              }}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#1e40af', border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 16 }}>
              + Add New Vendor
            </button>
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
