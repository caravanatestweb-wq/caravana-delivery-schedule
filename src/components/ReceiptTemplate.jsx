import React from 'react';
import { fmtDate } from '../lib/constants';

export default function ReceiptTemplate({ delivery }) {
  // Extract info
  const dateStr = fmtDate(delivery.date) || '';
  const signDate = fmtDate(delivery.signDate) || dateStr;
  const items = delivery.items || [];
  const isReturn = !!delivery.flagged;
  
  // Clean empty items out, we no longer need '12 padded rows' since we ditched the table
  const filledItems = items.filter(i => i.description || i.itemNumber);

  return (
    <div id="receipt-pdf-template" className="receipt-pdf-container">
      {/* ── HEADER MAG ── */}
      <div className="receipt-header">
        <div>
          <img src="/logo.png" style={{ maxHeight: 70, objectFit: 'contain' }} alt="Caravana Furniture" />
          <div style={{ marginTop: 12, fontSize: 13, color: '#555', lineHeight: 1.5 }}>
            975 Long Beach Blvd, Long Beach, CA 90813<br/>
            caravanafurniture.com  ·  (562) 432-0562
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }} className="pl-serif">
            {isReturn ? 'Pickup Acknowledgment' : 'Delivery Acknowledgment'}
          </div>
          <div style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
            <strong>Date:</strong> {dateStr}
          </div>
          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            <strong>Ref #:</strong> {delivery.orderNumber || delivery.invoiceNumber || 'N/A'}
          </div>
        </div>
      </div>

      {/* ── METADATA GRID ── */}
      <div className="receipt-meta-grid" style={{ fontSize: 15 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#666', marginBottom: 6, letterSpacing: 0.5 }}>Client Information</div>
          <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 6 }} className="pl-serif">{delivery.clientName}</div>
          <div style={{ color: '#444', lineHeight: 1.5 }}>{delivery.address}</div>
          <div style={{ color: '#444', marginTop: 4 }}>{delivery.phone}</div>
          {delivery.email && <div style={{ color: '#444', marginTop: 4 }}>{delivery.email}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#666', marginBottom: 6, letterSpacing: 0.5 }}>Fulfillment Details</div>
          <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 6 }} className="pl-serif">{delivery.deliveryTeam || 'Team Unassigned'}</div>
          <div style={{ marginTop: 4, color: '#444' }}><strong>Order Source:</strong> {delivery.source}</div>
          <div style={{ marginTop: 4, color: '#444' }}><strong>Time Window:</strong> {delivery.timeWindow}</div>
        </div>
      </div>

      {/* ── EDITORIAL PICTURE LIST ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: 10, marginBottom: 20 }} className="pl-serif">
          {isReturn ? 'Items Picked Up' : 'Items Delivered'} ({filledItems.length})
        </div>
        
        {filledItems.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#888', fontStyle: 'italic', background: '#fafafa', borderRadius: 12, border: '1px dashed #ccc' }}>No items recorded.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {filledItems.map((item, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 24, 
                padding: '16px', 
                background: '#fcfcfc', 
                border: '1px solid #eee', 
                borderRadius: 12,
                pageBreakInside: 'avoid'
              }}>
                <div style={{ width: 80, height: 80, background: '#fff', border: '1px solid #eaeaea', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.description} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 24, color: '#ddd' }}>📦</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 16, color: '#111', lineHeight: 1.4 }}>{item.description || 'Unnamed Item'}</div>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 6, fontWeight: 600 }}>SKU/Item: {item.itemNumber || 'N/A'}</div>
                </div>
                <div style={{ padding: '0 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 }}>Qty</div>
                  <div style={{ fontWeight: 'bold', fontSize: 20, background: '#111', color: '#fff', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.qty || 1}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── LEGAL TERMS ── */}
      <div style={{ 
        background: '#f9f9f9', 
        padding: '24px', 
        borderRadius: 12, 
        borderLeft: '4px solid #111',
        fontSize: 13, 
        lineHeight: 1.6, 
        color: '#444',
        marginBottom: 40,
        pageBreakInside: 'avoid'
      }}>
        {delivery.trialEnabled === true ? (
          "The undersigned hereby acknowledges receipt and delivery of the goods described on the annexed invoice and confirms that all items have been inspected and received in satisfactory condition. Caravana's 7-Day Home Comfort Trial applies from the date of delivery. Exchanges are welcome within that window and are subject to a discounted service fee. Returns are subject to a 15% restocking fee plus a service fee based on item size; refunds are issued to the original payment method or as store credit. Clearance, custom, made-to-order, and mattress items are final sale and not eligible for the trial. Floor samples are sold as-is and are final sale."
        ) : (
          "The undersigned hereby acknowledges receipt and delivery of the goods described on the annexed invoice and confirms that all items have been inspected and received in satisfactory condition. All sales are final at the time of delivery. No cash refunds or exchanges will be issued once merchandise has been received. Exchanges may be considered within 48 hours of delivery on a case-by-case basis and are subject to item condition, availability, and applicable service fees. Floor samples are sold as-is and are final sale."
        )}
      </div>

      {/* ── SIGNATURE CAPTURE ── */}
      <div style={{ pageBreakInside: 'avoid', border: '1px solid #e0e0e0', borderRadius: 12, padding: 35, position: 'relative', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 10 }}>
          <div style={{ borderBottom: '2px solid #111', height: 60, width: 450, position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
            {delivery.signatureUrl ? (
              <img src={delivery.signatureUrl} style={{ height: 55, position: 'absolute', bottom: 0, left: 10, objectFit: 'contain' }} alt="Signature" />
            ) : (
              <span style={{ color: '#ccc', fontStyle: 'italic', paddingBottom: 8, paddingLeft: 10 }}>No signature provided</span>
            )}
          </div>
          <span style={{ fontSize: 16, margin: '0 20px', fontWeight: 'bold' }}>Date:</span>
          <div style={{ borderBottom: '2px solid #111', width: 140, textAlign: 'center', paddingBottom: 6, fontSize: 16, fontWeight: 600 }}>
            {signDate}
          </div>
        </div>
        
        <div style={{ fontSize: 12, color: '#777', marginBottom: 40, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Signature of Person Receiving Goods</div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '2px solid #111', width: 450, height: 30, fontSize: 18, paddingLeft: 10, fontWeight: 'bold' }}>
            {delivery.printName}
          </div>
          <span style={{ fontSize: 12, color: '#777', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Printed Name</span>
        </div>
      </div>

      {/* ── FOOTER & SMS ── */}
      <div style={{ marginTop: 50, textAlign: 'center', pageBreakInside: 'avoid', padding: '0 20px' }}>
        <a href="sms:+18332424197" className="no-print" style={{ 
          display: 'inline-block', 
          background: '#111', 
          color: '#fff', 
          padding: '14px 30px', 
          borderRadius: 50, 
          textDecoration: 'none', 
          fontWeight: 'bold',
          fontSize: 14,
          marginBottom: 25,
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
        }}>
          💬 Questions or Feedback? Tap here to text us at (833) 242-4197
        </a>
        
        <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#888', textTransform: 'uppercase', borderTop: '1px solid #eee', paddingTop: 20 }}>
          CARAVANA FURNITURE  |  975 Central Blvd, Long Beach, CA 90813  |  562.432.0562
        </div>
      </div>

    </div>
  );
}
