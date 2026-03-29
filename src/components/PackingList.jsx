import React from 'react';
import { fmtDate } from '../lib/constants';

export default function PackingList({ delivery, onClose }) {
  const [zoomUrl, setZoomUrl] = React.useState(null);
  
  if (!delivery) return null;

  const handlePrint = () => { window.print(); };

  return (
    <div className="packing-list-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 3000, background: '#fff', overflowY: 'auto', padding: '40px 20px'
    }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .packing-list-overlay { position: static !important; padding: 0 !important; }
        }
        .packing-list-container {
          max-width: 800px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, sans-serif;
          color: #000;
        }
        .pl-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .pl-title { font-size: 28px; font-weight: 800; text-transform: uppercase; margin: 0; }
        .pl-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .pl-meta-item { margin-bottom: 8px; font-size: 14px; }
        .pl-meta-label { font-weight: 700; text-transform: uppercase; font-size: 11px; color: #666; display: block; }
        .pl-items-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        .pl-item-card {
          border: 1px solid #ddd;
          padding: 15px;
          page-break-inside: avoid;
          display: flex;
          flex-direction: column;
        }
        .pl-item-image {
          width: 100%;
          aspect-ratio: 1/1;
          background: #f9f9f9;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          cursor: zoom-in;
        }
        .pl-item-image img { width: 100%; height: 100%; object-fit: contain; }
        .pl-item-name { font-size: 16px; font-weight: 700; margin-bottom: 5px; min-height: 40px; }
        .pl-item-num { font-family: monospace; color: #666; font-size: 12px; }
        .pl-item-qty { font-size: 14px; font-weight: 800; color: #0b7a4a; margin-top: auto; padding-top: 10px; border-top: 1px solid #eee; }
        .zoom-overlay {
          position: fixed; inset: 0; z-index: 4000; background: rgba(0,0,0,0.9);
          display: flex; alignItems: center; justifyContent: center; cursor: zoom-out;
        }
        .zoom-overlay img { max-width: 95%; max-height: 95%; box-shadow: 0 0 30px rgba(0,0,0,0.5); }
      `}</style>

      {/* Zoom Modal */}
      {zoomUrl && (
        <div className="zoom-overlay no-print" onClick={() => setZoomUrl(null)}>
          <img src={zoomUrl} alt="zoom" />
          <div style={{ position: 'absolute', top: 20, right: 20, color: '#fff', fontSize: 30 }}>×</div>
        </div>
      )}

      <div className="no-print" style={{ position: 'sticky', top: 0, background: '#fff', padding: '10px 0', borderBottom: '1px solid #eee', marginBottom: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={handlePrint} style={{ padding: '10px 24px', background: '#0b7a4a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>🖨️ Print Now</button>
        <button onClick={onClose} style={{ padding: '10px 24px', background: '#eee', color: '#333', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Close</button>
      </div>

      <div className="packing-list-container">
        <header className="pl-header">
          <div>
            <h1 className="pl-title">Warehouse Packing List</h1>
            <div style={{ fontSize: 14, marginTop: 4 }}>Caravana Furniture | Operations Hub</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{delivery.orderNumber || delivery.invoiceNumber || 'NEW ORDER'}</div>
            <div style={{ fontSize: 14 }}>Scheduled: {fmtDate(delivery.date)}</div>
          </div>
        </header>

        <div className="pl-meta-grid">
          <div>
            <div className="pl-meta-item">
              <span className="pl-meta-label">Customer</span>
              <strong>{delivery.clientName}</strong>
            </div>
            <div className="pl-meta-item">
              <span className="pl-meta-label">Address</span>
              {delivery.address}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="pl-meta-item">
              <span className="pl-meta-label">Pull Team</span>
              <strong>{delivery.deliveryTeam || 'Unassigned'}</strong>
            </div>
            <div className="pl-meta-item">
              <span className="pl-meta-label">Window</span>
              {delivery.timeWindow}
            </div>
          </div>
        </div>

        <div style={{ background: '#000', color: '#fff', padding: '8px 15px', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, marginBottom: 20 }}>
          Furniture Pull List — {delivery.items?.length || 0} Total Items
        </div>

        <div className="pl-items-grid">
          {delivery.items?.map((item, idx) => (
            <div key={idx} className="pl-item-card">
              <div className="pl-item-image" onClick={() => item.imageUrl && setZoomUrl(item.imageUrl)}>
                {item.imageUrl ? <img src={item.imageUrl} alt={item.description} /> : <span style={{ color: '#ccc' }}>No Photo Provided</span>}
              </div>
              <div className="pl-item-name">{item.description}</div>
              <div className="pl-item-num">Ref: {item.itemNumber || 'None'}</div>
              <div className="pl-item-qty">Quantity: {item.qty || 1}</div>
            </div>
          ))}
        </div>

        <footer style={{ marginTop: 50, paddingTop: 20, borderTop: '1px solid #000', fontSize: 11, color: '#999', textAlign: 'center' }}>
          Verify all items match photos before staging for delivery. 
          <br />
          Printed on {new Date().toLocaleString()}
          <br />
          Contact office at (562) 432-0562 if any items are missing from warehouse.
        </footer>
      </div>
    </div>
  );
}
