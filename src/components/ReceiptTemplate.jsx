import React from 'react';
import { fmtDate } from '../lib/constants';

const styles = {
  page: { width: 800, minHeight: 1040, background: '#fff', padding: '60px 40px', boxSizing: 'border-box', position: 'relative', fontFamily: 'Arial, sans-serif', color: '#000' },
  header: { textAlign: 'center', marginBottom: 25 },
  logo: { maxHeight: 80 },
  title: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5, margin: '10px 0 35px' },
  dateWrap: { textAlign: 'right', fontSize: 15, fontWeight: 'bold', marginBottom: 15, paddingRight: 10 },
  dateVal: { borderBottom: '1px solid #000', padding: '0 40px 2px 10px' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 15 },
  halfLeft: { display: 'flex', width: '48%' },
  halfRight: { display: 'flex', width: '48%' },
  label: { minWidth: 130 },
  labelRight: { minWidth: 100 },
  input: { flex: 1, borderBottom: '1px solid #000', paddingLeft: 5, paddingBottom: 2 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 35, fontSize: 15 },
  th: { borderBottom: '1px solid #000', textAlign: 'left', fontWeight: 'normal', paddingBottom: 6 },
  td: { border: '1px solid #000', height: 24, padding: '2px 5px' },
  colDesc: { width: '55%' },
  colItem: { width: '30%' },
  colQty: { width: '15%' },
  terms: { marginTop: 35, fontSize: 12, lineHeight: 1.4, textAlign: 'justify' },
  sigArea: { marginTop: 60, position: 'relative' },
  sigLine: { display: 'flex', alignItems: 'flex-end', marginBottom: 6 },
  sigImgWrap: { height: 50, borderBottom: '1px solid #000', width: 450, display: 'flex', alignItems: 'flex-end' },
  sigImg: { height: 48, maxWidth: '100%', objectFit: 'contain' },
  dateLine2: { borderBottom: '1px solid #000', width: 200, marginLeft: 10, paddingLeft: 5 },
  printWrap: { display: 'flex', flexDirection: 'column' },
  printInput: { borderBottom: '1px solid #000', width: 450, paddingLeft: 5, height: 20 },
  footer: { position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', fontSize: 11, letterSpacing: 0.5, color: '#555' }
};

export default function ReceiptTemplate({ delivery }) {
  // Extract info
  const dateStr = fmtDate(delivery.date) || '';
  const signDate = fmtDate(delivery.signDate) || dateStr;
  const items = delivery.items || [];
  const isReturn = !!delivery.flagged;
  
  // Fill 12 rows for the table
  const rows = [...Array(12)].map((_, i) => items[i] || {});

  return (
    <div id="receipt-pdf-template" style={styles.page}>
      <div style={styles.header}>
        <img src="/logo.png" style={styles.logo} alt="Caravana Furniture" />
      </div>
      
      <div style={styles.title}>
        {isReturn ? 'RECEIPT OF PICKUP ACKNOWLEDGEMENT' : 'RECEIPT OF GOODS ACKNOWLEDGEMENT'}
      </div>

      <div style={styles.dateWrap}>
        Date: <span style={styles.dateVal}>{dateStr}</span>
      </div>

      <div style={styles.row}>
        <div style={styles.halfLeft}>
          <span style={styles.label}>Client Name:</span>
          <span style={styles.input}>{delivery.clientName}</span>
        </div>
        <div style={styles.halfRight}>
          <span style={styles.labelRight}>Order Source:</span>
          <span style={styles.input}>{delivery.source}</span>
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.halfLeft}>
          <span style={styles.label}>Client Address:</span>
          <span style={styles.input}>{delivery.address}</span>
        </div>
        <div style={styles.halfRight}>
          <span style={styles.labelRight}>Phone:</span>
          <span style={styles.input}>{delivery.phone}</span>
        </div>
      </div>
      <div style={styles.row}>
        <div style={styles.halfLeft}>
          <span style={styles.label}>Email:</span>
          <span style={styles.input}>{delivery.email || ''}</span>
        </div>
        <div style={styles.halfRight}>
          <span style={styles.labelRight}>Reference#:</span>
          <span style={styles.input}>{delivery.orderNumber || delivery.invoiceNumber}</span>
        </div>
      </div>
      
      <div style={{ ...styles.row, marginTop: 25 }}>
        <div style={{ display: 'flex', width: '60%' }}>
          <span style={styles.label}>Deliver Date:</span>
          <span style={styles.input}>{dateStr}</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 15, marginTop: 15 }}>
          {isReturn ? 'List of goods picked up.' : 'List of goods delivered.'}
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, ...styles.colDesc }}>Description</th>
              <th style={{ ...styles.th, ...styles.colItem }}>Item</th>
              <th style={{ ...styles.th, ...styles.colQty }}>Qty.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const borderStyles = i === 0 ? { borderTop: '2px solid #000' } : i === 11 ? { borderBottom: '2px solid #000' } : {};
              return (
                <tr key={i}>
                  <td style={{ ...styles.td, ...styles.colDesc, ...borderStyles }}>{row.description || ''}</td>
                  <td style={{ ...styles.td, ...styles.colItem, ...borderStyles }}>{row.itemNumber || ''}</td>
                  <td style={{ ...styles.td, ...styles.colQty, ...borderStyles }}>{row.qty || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={styles.terms}>
        {delivery.trialEnabled !== false ? (
          "The undersigned hereby acknowledges receipt and delivery of the goods described on the annexed invoice and confirms that all items have been inspected and received in satisfactory condition. Caravana's 7-Day Home Comfort Trial applies from the date of delivery. Exchanges are welcome within that window and are subject to a discounted service fee. Returns are subject to a 15% restocking fee plus a service fee based on item size; refunds are issued to the original payment method or as store credit. Clearance, custom, made-to-order, and mattress items are final sale and not eligible for the trial. Floor samples are sold as-is and are final sale."
        ) : (
          "The undersigned hereby acknowledges receipt and delivery of the goods described on the annexed invoice and confirms that all items have been inspected and received in satisfactory condition. All sales are final at the time of delivery. No cash refunds or exchanges will be issued once merchandise has been received. Exchanges may be considered within 48 hours of delivery on a case-by-case basis and are subject to item condition, availability, and applicable service fees. Floor samples are sold as-is and are final sale."
        )}
      </div>

      <div style={styles.sigArea}>
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 5 }}>
          <div style={{ ...styles.sigImgWrap, width: 450, position: 'relative' }}>
            {delivery.signatureUrl && (
              <img src={delivery.signatureUrl} style={{ height: 48, position: 'absolute', bottom: 0, left: 10 }} alt="Signature" />
            )}
          </div>
          <span style={{ fontSize: 16, margin: '0 15px' }}>Date</span>
          <div style={{ borderBottom: '1px solid #000', width: 120, textAlign: 'center', paddingBottom: 2, fontSize: 15 }}>
            {signDate}
          </div>
        </div>
        
        <div style={{ fontSize: 14, marginBottom: 35 }}>Signature of Person Receiving Goods</div>
        
        <div style={styles.printWrap}>
          <div style={{ borderBottom: '1px solid #000', width: 450, height: 25, fontSize: 16, paddingLeft: 10 }}>
            {delivery.printName}
          </div>
          <span style={{ fontSize: 14, marginTop: 4 }}>Print Name</span>
        </div>
      </div>

      <div style={{ ...styles.footer, fontSize: 11, letterSpacing: 0.5, color: '#333', fontWeight: 'bold' }}>
        CARAVANA FURNITURE | 975 Long Beach Blvd, Long Beach, CA 90813 | 562.432.0562
      </div>
    </div>
  );
}
