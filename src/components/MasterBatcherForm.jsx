import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MasterBatcherForm({ onClose, teamMembers = [] }) {
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    timeWindow: '8am - 12pm',
    deliveryTeam: '',
    vendors: [
      {
        id: crypto.randomUUID(),
        vendorName: '',
        showroomStock: false,
        orders: [
          {
            id: crypto.randomUUID(),
            orderNum: '',
            items: [{ id: crypto.randomUUID(), qty: 1, description: '' }]
          }
        ]
      }
    ]
  });

  const handleCreateVendor = () => {
    setFormData(prev => ({
      ...prev,
      vendors: [
        ...prev.vendors,
        {
          id: crypto.randomUUID(),
          vendorName: '',
          showroomStock: false,
          orders: [
            {
              id: crypto.randomUUID(),
              orderNum: '',
              items: [{ id: crypto.randomUUID(), qty: 1, description: '' }]
            }
          ]
        }
      ]
    }));
  };

  const handleDeleteVendor = (vendorId) => {
    setFormData(prev => ({
      ...prev,
      vendors: prev.vendors.filter(v => v.id !== vendorId)
    }));
  };

  const handleUpdateVendor = (vendorId, field, value) => {
    setFormData(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => v.id === vendorId ? { ...v, [field]: value } : v)
    }));
  };

  const handleAddOrder = (vendorId) => {
    setFormData(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => 
        v.id === vendorId 
          ? { 
              ...v, 
              orders: [
                ...v.orders, 
                { id: crypto.randomUUID(), orderNum: '', items: [{ id: crypto.randomUUID(), qty: 1, description: '' }] }
              ] 
            }
          : v
      )
    }));
  };

  const handleDeleteOrder = (vendorId, orderId) => {
    setFormData(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => 
        v.id === vendorId 
          ? { ...v, orders: v.orders.filter(o => o.id !== orderId) }
          : v
      )
    }));
  };

  const handleUpdateOrderNum = (vendorId, orderId, orderNum) => {
    setFormData(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => 
        v.id === vendorId 
          ? { ...v, orders: v.orders.map(o => o.id === orderId ? { ...o, orderNum } : o) }
          : v
      )
    }));
  };

  const handleAddItem = (vendorId, orderId) => {
    setFormData(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => 
        v.id === vendorId 
          ? { 
              ...v, 
              orders: v.orders.map(o => 
                o.id === orderId 
                  ? { ...o, items: [...o.items, { id: crypto.randomUUID(), qty: 1, description: '' }] }
                  : o
              ) 
            }
          : v
      )
    }));
  };

  const handleDeleteItem = (vendorId, orderId, itemId) => {
    setFormData(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => 
        v.id === vendorId 
          ? { 
              ...v, 
              orders: v.orders.map(o => 
                o.id === orderId 
                  ? { ...o, items: o.items.filter(it => it.id !== itemId) }
                  : o
              ) 
            }
          : v
      )
    }));
  };

  const handleUpdateItem = (vendorId, orderId, itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => 
        v.id === vendorId 
          ? { 
              ...v, 
              orders: v.orders.map(o => 
                o.id === orderId 
                  ? { 
                      ...o, 
                      items: o.items.map(it => 
                        it.id === itemId ? { ...it, [field]: value } : it
                      ) 
                    }
                  : o
              ) 
            }
          : v
      )
    }));
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Validate empty fields
      const cleanedVendors = formData.vendors.map(v => ({
        vendorName: v.vendorName || 'Unnamed Vendor',
        showroomStock: v.showroomStock,
        orders: v.orders.map(o => ({
          orderNum: o.orderNum || '-',
          items: o.items.filter(it => it.description.trim() !== '')
        })).filter(o => o.items.length > 0)
      })).filter(v => v.orders.length > 0);

      const payload = {
        id: crypto.randomUUID(),
        date: formData.date,
        timeWindow: formData.timeWindow,
        deliveryTeam: formData.deliveryTeam || null,
        vendors_list: cleanedVendors,
        status: 'Scheduled',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('batch_pickups').insert([payload]);
      
      if (error) {
        throw error;
      }
      
      alert('✅ Master Batch Pickup created successfully!');
      onClose();
    } catch (err) {
      console.error('Error saving batch pickup:', err);
      alert('Error creating batch: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 850, padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🚀</span> Create Master Batch Pickup
        </h2>

        <form onSubmit={handleSaveBatch} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Top Level: Time & Team */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: '#f8fafc', padding: '1.5rem', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Date</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Time Block</label>
              <input type="text" placeholder="e.g. 8am - 12pm" required value={formData.timeWindow} onChange={e => setFormData({ ...formData, timeWindow: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Delivery Team</label>
              <select value={formData.deliveryTeam} onChange={e => setFormData({ ...formData, deliveryTeam: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <option value="">-- Select Team --</option>
                {teamMembers.map(tm => <option key={tm} value={tm}>{tm}</option>)}
              </select>
            </div>
          </div>

          {/* Vendors Iteration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#334155', margin: 0 }}>📌 Vendors in this Block</h3>
              <button type="button" onClick={handleCreateVendor} style={{ padding: '0.5rem 1rem', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>+ Add Vendor</button>
            </div>

            {formData.vendors.map((vendor, vIndex) => (
              <div key={vendor.id} style={{ background: '#fff', border: '2px solid #bfdbfe', borderRadius: 12, padding: '1.5rem', position: 'relative' }}>
                {formData.vendors.length > 1 && (
                  <button type="button" onClick={() => handleDeleteVendor(vendor.id)} style={{ position: 'absolute', top: 12, right: 12, background: '#fee2e2', color: '#b91c1c', border: 'none', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Vendor Name</label>
                    <input type="text" placeholder="e.g. Acme Corp" required value={vendor.vendorName} onChange={e => handleUpdateVendor(vendor.id, 'vendorName', e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid #cbd5e1' }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginTop: 18, cursor: 'pointer' }}>
                    <input type="checkbox" checked={vendor.showroomStock} onChange={e => handleUpdateVendor(vendor.id, 'showroomStock', e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                    Showroom Stock
                  </label>
                </div>

                {/* Orders Iteration */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #e2e8f0' }}>
                  {vendor.orders.map((order, oIndex) => (
                    <div key={order.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid #e2e8f0', position: 'relative' }}>
                      {vendor.orders.length > 1 && (
                        <button type="button" onClick={() => handleDeleteOrder(vendor.id, order.id)} style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✖</button>
                      )}
                      <div style={{ marginBottom: '1rem', width: '200px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Order / PO Num</label>
                        <input type="text" placeholder="PO-123" value={order.orderNum} onChange={e => handleUpdateOrderNum(vendor.id, order.id, e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #cbd5e1' }} />
                      </div>

                      {/* Items Iteration */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', fontSize: '0.75rem', paddingBottom: 8, color: '#64748b' }}>QTY</th>
                            <th style={{ textAlign: 'left', fontSize: '0.75rem', paddingBottom: 8, color: '#64748b' }}>ITEM DESCRIPTION</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, iIndex) => (
                            <tr key={item.id}>
                              <td style={{ padding: '0 8px 8px 0', width: 60 }}>
                                <input type="number" min="1" value={item.qty} onChange={e => handleUpdateItem(vendor.id, order.id, item.id, 'qty', parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, textAlign: 'center' }} />
                              </td>
                              <td style={{ padding: '0 8px 8px 0' }}>
                                <input type="text" placeholder="e.g. Sofa Brown" value={item.description} onChange={e => handleUpdateItem(vendor.id, order.id, item.id, 'description', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 4 }} />
                              </td>
                              <td style={{ padding: '0 0 8px 0', width: 30, textAlign: 'right' }}>
                                {order.items.length > 1 && (
                                  <button type="button" onClick={() => handleDeleteItem(vendor.id, order.id, item.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <button type="button" onClick={() => handleAddItem(vendor.id, order.id)} style={{ fontSize: '0.8rem', color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}>+ Add Item</button>
                    </div>
                  ))}
                  
                  <div>
                    <button type="button" onClick={() => handleAddOrder(vendor.id)} style={{ padding: '0.4rem 0.8rem', background: '#f1f5f9', color: '#475569', border: '1px dashed #cbd5e1', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>+ Add Another Order for {vendor.vendorName || 'this vendor'}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="modal-actions" style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSaving} style={{ background: '#1e3a8a', color: '#fff', flex: 1, fontSize: '1.1rem', fontWeight: 700 }}>
              {isSaving ? '⏳ Saving...' : '🚀 Dispatch Master Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
