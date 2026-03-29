import React from 'react';
import { fmtDate } from '../lib/constants';

export default function PackingList({ delivery, onClose, mode = 'warehouse' }) {
  const [zoomUrl, setZoomUrl] = React.useState(null);
  
  if (!delivery) return null;

  const handlePrint = () => { window.print(); };

  const isClient = mode === 'client';

  return (
    <div className={`packing-list-overlay ${isClient ? 'mode-client' : 'mode-warehouse'}`} style={{
      position: 'fixed', inset: 0, zIndex: 3000, background: isClient ? '#fcfbf9' : '#fff', overflowY: 'auto', padding: isClient ? '0' : '40px 20px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700;800&display=swap');

        @media print {
          .no-print { display: none !important; }
          .packing-list-overlay { position: static !important; padding: 0 !important; background: #fff !important; }
        }

        /* Common Container */
        .pl-container {
          max-width: ${isClient ? '900px' : '800px'};
          margin: 0 auto;
          font-family: 'Inter', system-ui, sans-serif;
          color: #1a1a1a;
          padding: ${isClient ? '60px 40px' : '0'};
        }

        /* Editorial Typography for Client Mode */
        .mode-client .pl-serif { font-family: 'Playfair Display', serif; }
        .mode-client h1 { font-size: 42px; font-weight: 500; margin-bottom: 8px; letter-spacing: -0.02em; }
        .mode-client .subtitle { font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; color: #666; margin-bottom: 40px; }
        
        .mode-client .section-header { 
          display: flex; align-items: center; gap: 15px; 
          font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; 
          margin: 60px 0 30px; color: #888;
        }
        .mode-client .section-header::after { content: ""; flex: 1; height: 1px; background: #eee; }
        
        .mode-client .prep-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 40px; }
        .mode-client .prep-item { margin-bottom: 25px; }
        .mode-client .prep-title { font-size: 18px; font-weight: 600; margin-bottom: 10px; color: #111; }
        .mode-client .prep-text { font-size: 15px; line-height: 1.6; color: #444; }

        /* WAREHOUSE MODE - COMPACT ROWS */
        .mode-warehouse .pl-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;
        }
        .mode-warehouse .pl-title { font-size: 28px; font-weight: 800; text-transform: uppercase; margin: 0; }
        .mode-warehouse .pl-item-row {
          display: flex; gap: 20px; padding: 12px 0; border-bottom: 1px solid #eee; align-items: center;
        }
        .mode-warehouse .pl-item-image {
          width: 80px; height: 80px; background: #f9f9f9; border: 1px solid #eee; display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .mode-warehouse .pl-item-image img { width: 100%; height: 100%; object-fit: contain; }
        .mode-warehouse .pl-item-details { flex: 1; display: flex; justify-content: space-between; align-items: center; }

        /* CLIENT MODE - 2 COLUMN GRID */
        .mode-client .pl-client-items { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .mode-client .pl-client-card { background: #fff; border: 1px solid #f0f0f0; padding: 20px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .mode-client .pl-client-img { width: 100%; aspect-ratio: 1/1; background: #f9f9f9; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .mode-client .pl-client-img img { width: 100%; height: 100%; object-fit: contain; }
        .mode-client .pl-client-name { font-size: 17px; font-weight: 600; margin-bottom: 5px; }

        .zoom-overlay {
          position: fixed; inset: 0; z-index: 4000; background: rgba(0,0,0,0.9);
          display: flex; alignItems: center; justifyContent: center; cursor: zoom-out;
        }
        .zoom-overlay img { max-width: 95%; max-height: 95%; }
      `}</style>

      {zoomUrl && (
        <div className="zoom-overlay no-print" onClick={() => setZoomUrl(null)}>
          <img src={zoomUrl} alt="zoom" />
        </div>
      )}

      <div className="no-print" style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', zIndex: 100, padding: '15px 0', borderBottom: '1px solid #eee', display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={handlePrint} style={{ padding: '10px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>🖨️ Print Document</button>
        <button onClick={onClose} style={{ padding: '10px 24px', background: 'transparent', color: '#666', border: '1px solid #ddd', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>Close</button>
      </div>

      <div className="pl-container">
        {isClient ? (
          /* ── CLIENT EDITORIAL MODE ── */
          <div className="client-view">
            <header style={{ textAlign: 'center', marginBottom: 60 }}>
              <img src="/logo.png" alt="Caravana Furniture" style={{ height: 60, marginBottom: 30 }} />
              <h1 className="pl-serif">Your Delivery Experience</h1>
              <div className="subtitle">Caravana Furniture  ·  Long Beach, CA</div>
              
              <div style={{ marginTop: 40, borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '20px 0', display: 'flex', justifyContent: 'center', gap: 60 }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Scheduled For</div>
                  <div style={{ fontWeight: 600 }}>{fmtDate(delivery.date)}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Arrival Window</div>
                  <div style={{ fontWeight: 600 }}>{delivery.timeWindow}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Reference</div>
                  <div style={{ fontWeight: 600 }}>{delivery.orderNumber || delivery.invoiceNumber || 'Delivery Preview'}</div>
                </div>
              </div>
            </header>

            <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 18, color: '#444', lineHeight: 1.7 }}>
                Hi {(delivery.clientName || '').split(' ')[0]}! We're so excited for your delivery — it's almost time! Your new furniture is scheduled to arrive soon, and we want to make sure the experience is as smooth and enjoyable as possible.
              </p>
            </div>

            <div className="section-header">What's Arriving</div>
            <div className="pl-client-items">
              {delivery.items?.map((item, idx) => (
                <div key={idx} className="pl-client-card" onClick={() => item.imageUrl && setZoomUrl(item.imageUrl)}>
                  <div className="pl-client-img">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.description} /> : <span style={{ color: '#ccc' }}>📷 No Photo Provided</span>}
                  </div>
                  <div className="pl-client-name">{item.description}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>Quantity: {item.qty || 1}</div>
                </div>
              ))}
            </div>

            <div className="section-header">Preparing for Your Delivery</div>
            <div className="prep-grid">
              <div>
                <div className="prep-item">
                  <div className="prep-title">Before Your Delivery</div>
                  <div className="prep-text">
                    • Measure doorways, hallways, and any tight corners along the path to your destination room.<br/>
                    • Decide where you'd like each piece placed — our team will position everything before we leave.<br/>
                    • Clear a walking path from your entrance to the room, including any area rugs or fragile décor.<br/>
                    • Secure your pets in a separate room for the duration of the visit.
                  </div>
                </div>
                {delivery.notes && (
                  <div className="prep-item" style={{ background: '#f9f9f9', padding: 20, borderRadius: 4, border: '1px dashed #ddd' }}>
                    <div className="prep-title" style={{ fontSize: 14, textTransform: 'uppercase' }}>Your Specific Delivery Notes</div>
                    <div className="prep-text" style={{ fontStyle: 'italic' }}>"{delivery.notes}"</div>
                  </div>
                )}
              </div>
              <div>
                <div className="prep-item">
                  <div className="prep-title">On Delivery Day</div>
                  <div className="prep-text">
                    • An adult (18+) must be present for the full appointment — we'll do a walkthrough together at the end.<br/>
                    • Please ensure there's accessible parking or curb space near your entrance for our delivery vehicle.<br/>
                    • Consider moving any artwork or mirrors along narrow hallways to prevent accidental bumps.
                  </div>
                </div>
                <div className="prep-item">
                  <div className="prep-title">White-Glove & Assembly</div>
                  <div className="prep-text">
                    Our team will carry everything directly to your room of choice, complete all assembly on-site, and remove all packaging materials before leaving. We'll do a full walkthrough with you at the end — take your time, test everything. We won't consider the job done until you do.
                  </div>
                </div>
              </div>
            </div>

            <footer style={{ marginTop: 100, borderTop: '2px solid #111', paddingTop: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }} className="pl-serif">Caravana Furniture</div>
              <div style={{ color: '#666', fontSize: 14 }}>
                975 Long Beach Blvd, Long Beach, CA 90813<br/>
                caravanafurniture.com  ·  (562) 432-0562
              </div>
              <div style={{ marginTop: 30, fontSize: 12, color: '#999' }}>✦  We're always happy to help  ✦</div>
            </footer>
          </div>
        ) : (
          /* ── WAREHOUSE MODE ── */
          <div className="warehouse-view">
            <header className="pl-header">
              <div>
                <h1 className="pl-title">Warehouse Pull List</h1>
                <div style={{ fontSize: 14, marginTop: 4 }}>Caravana Operations Hub</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{delivery.orderNumber || 'NEW ORDER'}</div>
                <div style={{ fontSize: 14 }}>Pull Date: {fmtDate(delivery.date)}</div>
              </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30, fontSize: 14 }}>
              <div style={{ background: '#f5f5f5', padding: 15 }}>
                <strong>Customer:</strong> {delivery.clientName}<br/>
                <strong>Team:</strong> {delivery.deliveryTeam || 'Unassigned'}
              </div>
              <div style={{ background: '#f5f5f5', padding: 15 }}>
                <strong>Address:</strong> {delivery.address}<br/>
                <strong>Window:</strong> {delivery.timeWindow}
              </div>
            </div>

            <div style={{ fontWeight: 800, padding: 8, background: '#000', color: '#fff', fontSize: 13, textTransform: 'uppercase', marginBottom: 10 }}>
              Items to Stage ({delivery.items?.length || 0})
            </div>

            <div className="pl-items">
              {delivery.items?.map((item, idx) => (
                <div key={idx} className="pl-item-row" onClick={() => item.imageUrl && setZoomUrl(item.imageUrl)}>
                  <div className="pl-item-image">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.description} /> : <span style={{ color: '#ddd' }}>📷</span>}
                  </div>
                  <div className="pl-item-details">
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{item.description}</div>
                      <div style={{ fontSize: 12, color: '#666', fontFamily: 'monospace' }}>Ref: {item.itemNumber || 'N/A'}</div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>Qty: {item.qty || 1}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <footer style={{ marginTop: 40, borderTop: '1px solid #ddd', paddingTop: 20, fontSize: 11, color: '#999', textAlign: 'center' }}>
              Final Pull Check: ____________________ &nbsp; Stage Area: ____________________
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
