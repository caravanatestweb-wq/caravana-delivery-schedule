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
  
  // Fill 12 rows for the table
  const rows = [...Array(12)].map((_, i) => items[i] || {});

  return (
    <div id="receipt-pdf-template" style={styles.page}>
      <div style={styles.header}>
        <img src="/logo.png" style={styles.logo} alt="Caravana Furniture" />
      </div>
      
      <div style={styles.title}>RECEIPT OF GOODS ACKNOWLEDGEMENT</div>

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
        <div style={{ fontSize: 15, marginTop: 15 }}>List of goods delivered.</div>
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
        The undersigned hereby acknowledges receipt and delivery of the goods described on the annexed list or invoice and further acknowledges that said goods have been inspected and are delivered without damage. Any concealed damages or manufacturing defects must be reported within 24 hours. The customer acknowledges that outside of the approved 7-Day trial items, there are absolutely no cash refunds or exchanges after the merchandise has been received, assembled, or removed from original packaging. 
        <br /><br />
        <strong>Clearance Item</strong><br />
        All clearance items are final sale. Floor models are sold as-is. No returns, exchanges, or additional discounts apply. Same as floor samples.<br />
        In this web address we have more information about our 7 day trial <a href="https://www.caravanafurniture.com/pages/return-policy" style={{ color: '#000', textDecoration: 'underline' }}>https://www.caravanafurniture.com/pages/return-policy</a> please review.
      </div>

      <div style={styles.sigArea}>
        <div style={styles.sigLine}>
          <div style={styles.sigImgWrap}>
            {delivery.signatureUrl ? (
              <img src={delivery.signatureUrl} style={styles.sigImg} alt="Signature" />
            ) : (
              <span style={{ color: '#aaa', paddingBottom: 5 }}>No signature provided</span>
            )}
          </div>
          <span style={{ marginRight: 10 }}>Date</span>
          <div style={styles.dateLine2}>{signDate}</div>
        </div>
        <div style={{ fontSize: 14, marginBottom: 25 }}>Signature of Person receiving the goods :</div>
        
        <div style={styles.printWrap}>
          <span style={styles.printInput}>{delivery.printName}</span>
          <span style={{ fontSize: 14, marginTop: 4 }}>Print Name</span>
        </div>
      </div>

      <div style={styles.footer}>
        CARAVANA FURNITURE  |  975 LONG BEACH BLVD. LONG BEACH, CA 90813  |  562.432.0562
      </div>
    </div>
  );
}
