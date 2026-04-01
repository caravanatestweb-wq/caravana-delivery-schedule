import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { addDays, fmtDate, localDate, getInspectionList } from '../lib/constants';
import SignaturePad from './SignaturePad';
import ETAPanel from './ETAPanel';
import StylingTipsPanel from './StylingTipsPanel';
import { getTMCredentials, sendTextMagicSMS } from '../lib/sms';
import ReceiptTemplate from './ReceiptTemplate';
import ImagePreviewModal from './ImagePreviewModal';

const LEGAL_TEXT = `The undersigned hereby acknowledges receipt and delivery of the goods described on the annexed list or invoice and further acknowledges that said goods have been inspected and are delivered without damage. Any concealed damages or manufacturing defects must be reported within 24 hours. The customer acknowledges that outside of the approved 7-Day trial items, there are absolutely no cash refunds or exchanges after the merchandise has been received, assembled, or removed from original packaging.

Clearance Item
All clearance items are final sale. Floor models are sold as-is. No returns, exchanges, or additional discounts apply. Same as floor samples.

Policies:
7-Day Trial: https://www.caravanafurniture.com/pages/return-policy
Warranty: https://www.caravanafurniture.com/pages/warranty`;

const PICKUP_TEXT = `By signing below, I acknowledge that the above items have been picked up by Caravana Furniture and the condition has been documented. I understand the applicable fees as communicated.

Policies:
7-Day Trial: https://www.caravanafurniture.com/pages/return-policy
Warranty: https://www.caravanafurniture.com/pages/warranty`;

export default function TeamDeliveryForm({ delivery, onBack, updateDelivery }) {
  const isReturn = !!delivery.flagged;
  const today = localDate();

  // Normalize items (new format or legacy packing list)
  const initItems = () => {
    if (delivery.items?.length) return delivery.items;
    return (delivery.packingList || []).map((it, i) => ({
      id: i, description: it.text || it, itemNumber: '', qty: '1',
      source: 'warehouse', sourceStatus: 'ready', tier: 'medium',
      delivered: false, notes: '',
    }));
  };

  const [items, setItems] = useState(initItems);
  const [inspection, setInspection] = useState(delivery.inspection || {});
  const [inspectionNotes, setInspectionNotes] = useState(delivery.inspectionNotes || {});
  const [condition, setCondition] = useState(delivery.condition || '');
  const [damageNotes, setDamageNotes] = useState(delivery.damageNotes || '');
  const [deliveryNotes, setDeliveryNotes] = useState(delivery.deliveryNotes || '');
  const [printName, setPrintName] = useState(delivery.printName || '');
  const [signDate, setSignDate] = useState(delivery.signDate || today);
  const [sigBlob, setSigBlob] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState(delivery.signatureUrl || null);
  const [photos, setPhotos] = useState([]);
  const [showETA, setShowETA] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [completeMode, setCompleteMode] = useState('Delivered');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const firstName = (delivery.clientName || '').split(' ')[0] || 'there';
  const defaultSmsMsg = isReturn 
    ? `Hi ${firstName}, this is Caravana Furniture. Your pickup/return has been processed! 🔄\n\nYou can view and download your signed Acknowledgement here:\n{{RECEIPT_LINK}}\n\nAny questions? 📞 (562) 432-0562`
    : `Hi ${firstName}, this is Caravana Furniture. Your delivery is complete! 🎉\n\nYou can securely view and download your signed Delivery Acknowledgement here:\n{{RECEIPT_LINK}}\n\nAny questions? 📞 (562) 432-0562`;
  const [smsMsg, setSmsMsg] = useState(defaultSmsMsg);

  // Auto-mark as in-progress when opened
  useEffect(() => {
    if (delivery.status === 'Scheduled' || delivery.status === 'Contacted' || delivery.status === 'Ready') {
      supabase.from('deliveries').update({ status: 'In Progress' }).eq('id', delivery.id).then(({ error }) => {
        if (!error) updateDelivery(delivery.id, { status: 'In Progress' });
      });
    }
  }, []);

  // Auto-save every 3 seconds
  const autoSave = useCallback(async () => {
    await supabase.from('deliveries').update({
      items, inspection, inspectionNotes, condition, damageNotes, deliveryNotes,
      printName, signDate, signatureUrl,
    }).eq('id', delivery.id);
  }, [items, inspection, inspectionNotes, condition, damageNotes, deliveryNotes, printName, signDate, signatureUrl]);

  useEffect(() => {
    const t = setTimeout(autoSave, 3000);
    return () => clearTimeout(t);
  }, [autoSave]);

  // Item helpers
  const toggleItem = (idx) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, delivered: !it.delivered } : it));
  const updateItemNote = (idx, note) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, notes: note } : it));
  // Inspection helpers
  const setInspectionPoint = (id, val) => setInspection(prev => ({ ...prev, [id]: val }));
  const updateInspectionNote = (id, note) => setInspectionNotes(prev => ({ ...prev, [id]: note }));
  const inspectionPoints = getInspectionList(items);

  // Data Persistence Fix: Find any old inspection data from before the checklist update
  const legacyPoints = Object.entries(inspection)
    .filter(([id]) => !inspectionPoints.find(p => p.id === id))
    .map(([id, val]) => ({ id, label: id.replace(/_/g, ' '), val, desc: 'Legacy data from previous system' }));

  const filledItems = items.filter(it => it.description);
  const checkedItems = filledItems.filter(it => it.delivered);
  const allDelivered = filledItems.length > 0 && filledItems.every(it => it.delivered);
  const hasSignature = !!sigBlob || !!signatureUrl;
  const canComplete = allDelivered && condition && hasSignature && printName.trim();

  // Signature upload
  const handleSignatureSave = async (blob) => {
    setSigBlob(blob);
    if (!blob) { setSignatureUrl(null); return; }
    const path = `signatures/${delivery.id}-${Date.now()}.png`;
    const { error } = await supabase.storage.from('delivery-photos').upload(path, blob, { contentType: 'image/png', upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('delivery-photos').getPublicUrl(path);
      setSignatureUrl(publicUrl);
    }
  };

  // Complete delivery
  const handleComplete = async () => {
    setSaving(true);
    const trialExpires = !isReturn ? addDays(delivery.date || today, 7) : delivery.trialExpires;
    const updates = {
      status: completeMode === 'Delivered' ? 'Delivered' : 'Completed',
      flagged: completeMode === 'Delivered' ? (delivery.flagged || null) : completeMode.toLowerCase(),
      completedAt: new Date().toISOString(),
      items, inspection, inspectionNotes, condition, damageNotes, deliveryNotes,
      printName, signDate, signatureUrl, trialExpires,
    };
    const { error } = await supabase.from('deliveries').update(updates).eq('id', delivery.id);
    setSaving(false);
    if (!error) {
      updateDelivery(delivery.id, updates);
      setDone(true);
    } else {
      alert('Error saving delivery: ' + error.message);
    }
  };

  if (done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: '#0b7a4a',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, color: '#fff', marginBottom: 20,
          }}>✓</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 24, color: 'var(--text-main)' }}>
            {isReturn ? 'Pickup Complete!' : completeMode !== 'Delivered' ? `${completeMode} Logged!` : 'Delivery Completed!'}
          </h2>
          <p style={{ color: 'var(--text-light)', marginBottom: 6 }}>{delivery.clientName}</p>
          {!isReturn && completeMode === 'Delivered' && (
            <p style={{ color: '#0b7a4a', fontSize: 14, fontWeight: 600 }}>
              7-Day Trial expires: {fmtDate(addDays(delivery.date || today, 7))}
            </p>
          )}

          {/* Acknowledgement PDF Option */}
          {delivery.phone && (
            <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8, display: 'block' }}>Customize SMS Message:</label>
              <textarea
                value={smsMsg}
                onChange={e => setSmsMsg(e.target.value)}
                rows={6}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, fontFamily: 'inherit', marginBottom: 14, resize: 'none', background: 'var(--surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
              />
              <button
                onClick={async () => {
                  if (generatingPdf) return;
                  if (!delivery.phone) {
                    alert('No phone number attached to this delivery.');
                    return;
                  }
                  
                  setGeneratingPdf(true);
                  try {
                    const element = document.getElementById('receipt-pdf-template');
                    if (!element) throw new Error("Template not found");
                    
                    const opt = {
                      margin:       0, // Use zero margin so our custom CSS margins stick perfectly
                      filename:     `receipt-${delivery.orderNumber || delivery.id}.pdf`,
                      image:        { type: 'jpeg', quality: 0.98 },
                      html2canvas:  { scale: 2, useCORS: true },
                      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                    };

                    const pdfBlob = await window.html2pdf().from(element).set(opt).output('blob');

                    // Note: ensure 'receipts' folder works or just place in root of 'delivery-photos'
                    const path = `receipts/${delivery.id}-${Date.now()}.pdf`;
                    const { error } = await supabase.storage.from('delivery-photos').upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });
                    if (error) throw error;
                    
                    const { data: { publicUrl } } = supabase.storage.from('delivery-photos').getPublicUrl(path);

                    const finalMsg = smsMsg.replace('{{RECEIPT_LINK}}', publicUrl);

                    await sendTextMagicSMS(delivery.phone, finalMsg);
                    
                    alert('✅ Acknowledgement PDF generated and texted successfully!');
                  } catch (err) {
                    console.error(err);
                    alert('❌ Error: ' + err.message);
                  }
                  setGeneratingPdf(false);
                }}
                className="btn-primary"
                disabled={generatingPdf}
                style={{ width: '100%', padding: '13px 40px', fontSize: 16, borderRadius: 12, border: 'none', cursor: generatingPdf ? 'not-allowed' : 'pointer', background: generatingPdf ? '#999' : '#0b7a4a', color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}
              >
                {generatingPdf ? '⏳ Generating PDF & Sending...' : '📄 Send PDF Acknowledgement'}
              </button>
            </div>
          )}

          <button onClick={onBack} className="btn-secondary" style={{ width: '100%', padding: '13px 40px', fontSize: 16, borderRadius: 12, cursor: 'pointer', background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-main)', fontWeight: 600 }}>
            Back to Stops
          </button>
        </div>
        
        {/* Hidden area to render the HTML template cleanly off-screen */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none' }}>
           <ReceiptTemplate delivery={{...delivery, items, printName, signDate, signatureUrl}} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 120 }}>
      {showETA && <ETAPanel delivery={delivery} onClose={() => setShowETA(false)} />}
      {showTips && <StylingTipsPanel items={items} onClose={() => setShowTips(false)} />}

      {/* Back button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Stops
        </button>
        <button
          className="btn-secondary"
          style={{ fontSize: 13, padding: '7px 12px', borderRadius: 8, color: '#666', borderColor: '#ddd' }}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('print-packing-list', { detail: { delivery, mode: 'warehouse' } }));
          }}
        >
          🖨️ Warehouse Pull List
        </button>
      </div>

      {/* Client summary */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>{delivery.clientName}</div>
        <div style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.7 }}>
          📍 {delivery.address}<br />
          {delivery.phone && <>📱 {delivery.phone} · </>}
          {delivery.timeWindow && <>🕐 {delivery.timeWindow} · </>}
          {(delivery.deliveryTeam || delivery.scheduledBy) && <>👥 {delivery.deliveryTeam || delivery.scheduledBy}</>}
        </div>
        {isReturn && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#c53030', fontWeight: 600 }}>
            🔄 {delivery.flagged.charAt(0).toUpperCase() + delivery.flagged.slice(1)} Pickup{delivery.flagReason && ` — ${delivery.flagReason}`}
          </div>
        )}
        {delivery.notes && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#fef9ee', borderRadius: 8, fontSize: 13, color: 'var(--text-main)', borderLeft: '3px solid #d4960a' }}>
            📝 {delivery.notes}
          </div>
        )}
      </div>

      {/* Items checklist */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
          📦 Items ({checkedItems.length}/{filledItems.length})
        </h3>
        {filledItems.map((it, i) => (
          <div key={i} style={{
            background: it.delivered ? '#eef7f0' : 'var(--bg-color)',
            border: `1.5px solid ${it.delivered ? '#0b7a4a40' : 'var(--border)'}`,
            borderRadius: 10, padding: '12px 14px', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={() => toggleItem(i)}
                style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  border: `2px solid ${it.delivered ? '#0b7a4a' : 'var(--border)'}`,
                  background: it.delivered ? '#0b7a4a' : 'var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: '#fff', cursor: 'pointer',
                }}
              >
                {it.delivered ? '✓' : ''}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-main)' }}>{it.description}</div>
                {it.itemNumber && <div style={{ fontSize: 12, color: 'var(--text-light)' }}>#{it.itemNumber}{it.qty && it.qty !== '1' ? ` · Qty: ${it.qty}` : ''}</div>}
              </div>
            </div>
            <div style={{ marginTop: 8, marginLeft: 48 }}>
              <input
                value={it.notes}
                onChange={e => updateItemNote(i, e.target.value)}
                placeholder="Note for this item..."
                style={{
                  width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text-main)', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        ))}

        {/* Progress bar */}
        {filledItems.length > 0 && (
          <div style={{ marginTop: 8, padding: '10px 12px', background: allDelivered ? '#eef7f0' : '#fef9ee', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 5, color: allDelivered ? '#0b7a4a' : '#c89b0a' }}>
              <span>{allDelivered ? '✅ All confirmed' : `${checkedItems.length} of ${filledItems.length} confirmed`}</span>
              <span>{Math.round(checkedItems.length / filledItems.length * 100)}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'var(--border)' }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${(checkedItems.length / filledItems.length) * 100}%`, background: allDelivered ? '#0b7a4a' : '#c89b0a', transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Furniture-Aware Inspection */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
          🔍 {inspectionPoints.length}-Point {isReturn ? 'Return' : 'Delivery'} Inspection
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 14 }}>
          {isReturn ? 'Compare against delivery baseline — document any changes.' : 'Complete with customer present to establish baseline.'}
        </p>
        {inspectionPoints.map(pt => (
          <div key={pt.id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{pt.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{pt.desc}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['pass', 'fail'].map(v => (
                  <button
                    key={v}
                    onClick={() => setInspectionPoint(pt.id, v)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${inspection[pt.id] === v ? (v === 'pass' ? '#0b7a4a' : '#c53030') : 'var(--border)'}`,
                      background: inspection[pt.id] === v ? (v === 'pass' ? '#eef7f0' : '#fef2f2') : 'var(--surface)',
                      color: inspection[pt.id] === v ? (v === 'pass' ? '#0b7a4a' : '#c53030') : 'var(--text-light)',
                    }}
                  >
                    {v === 'pass' ? '✓ Pass' : '✕ Fail'}
                  </button>
                ))}
                {pt.optional && (
                  <button
                    onClick={() => setInspectionPoint(pt.id, 'na')}
                    style={{
                      padding: '5px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                      border: `1.5px solid ${inspection[pt.id] === 'na' ? 'var(--text-light)' : 'var(--border)'}`,
                      background: inspection[pt.id] === 'na' ? 'var(--bg-color)' : 'var(--surface)',
                      color: 'var(--text-light)',
                    }}
                  >N/A</button>
                )}
              </div>
            </div>
            {inspection[pt.id] === 'fail' && (
              <div style={{ marginTop: 8 }}>
                <input
                  value={inspectionNotes[pt.id] || ''}
                  onChange={e => updateInspectionNote(pt.id, e.target.value)}
                  placeholder="Describe damage / reason for failure..."
                  style={{
                    width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8,
                    border: '1px solid #fecaca', background: '#fef2f2',
                    color: '#c53030', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>
        ))}

        {/* Legacy Data persistence (only shown if old data exists) */}
        {legacyPoints.length > 0 && (
          <div style={{ marginTop: 24, padding: 12, background: 'var(--bg-color)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>📜</span> Legacy Records (Previous System)
            </div>
            {legacyPoints.map(lp => (
              <div key={lp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-main)', textTransform: 'capitalize' }}>{lp.label}</div>
                <div style={{ 
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, 
                  background: lp.val === 'pass' ? '#eef7f0' : (lp.val === 'fail' ? '#fef2f2' : '#f0f0f0'),
                  color: lp.val === 'pass' ? '#0b7a4a' : (lp.val === 'fail' ? '#c53030' : '#666'),
                  border: `1px solid ${lp.val === 'pass' ? '#0b7a4a' : (lp.val === 'fail' ? '#c53030' : 'var(--border)')}40`,
                }}>
                  {lp.val === 'pass' ? '✓ Passed' : (lp.val === 'fail' ? '✕ Failed' : 'N/A')}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 4, fontStyle: 'italic' }}>
              * These points were recorded before the furniture-specific update.
            </div>
          </div>
        )}
      </div>

      {/* Photos */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>📷 Delivery Photos</h3>
        <PhotoCapture
          deliveryId={delivery.id}
          existingUrls={delivery.photoUrls || []}
          onUpdate={(urls) => {
            supabase.from('deliveries').update({ photoUrls: urls }).eq('id', delivery.id);
            updateDelivery(delivery.id, { photoUrls: urls });
          }}
        />
      </div>

      {/* Condition */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>Condition & Notes</h3>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Overall Condition *</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { v: 'excellent', label: '✅ Excellent', color: '#0b7a4a', bg: '#eef7f0' },
            { v: 'good',      label: '🟡 Good',      color: '#c89b0a', bg: '#fef9ee' },
            { v: 'damaged',   label: '🔴 Damaged',   color: '#c53030', bg: '#fef2f2' },
          ].map(c => (
            <button
              key={c.v}
              onClick={() => setCondition(c.v)}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${condition === c.v ? c.color : 'var(--border)'}`,
                background: condition === c.v ? c.bg : 'var(--surface)',
                fontSize: 14, fontWeight: 600, color: condition === c.v ? c.color : 'var(--text-light)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        {condition === 'damaged' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#c53030', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Damage Description</label>
            <textarea
              value={damageNotes}
              onChange={e => setDamageNotes(e.target.value)}
              placeholder="Describe the damage..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e88', background: 'var(--surface)', color: 'var(--text-main)', fontSize: 14, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        )}
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Delivery Notes</label>
        <textarea
          value={deliveryNotes}
          onChange={e => setDeliveryNotes(e.target.value)}
          placeholder="Placement, access notes, customer comments..."
          rows={3}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: 14, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      {/* Signature */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
          ✍️ Customer Signature
        </h3>
        <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-light)', background: 'var(--bg-color)', padding: 12, borderRadius: 8, borderLeft: '3px solid #d4960a', marginBottom: 14 }}>
          {isReturn ? PICKUP_TEXT : LEGAL_TEXT}
        </div>
        {!isReturn && delivery.date && (
          <div style={{ padding: '8px 14px', background: '#eef7f0', borderRadius: 8, fontSize: 13, color: '#0b7a4a', fontWeight: 600, marginBottom: 14 }}>
            📋 7-Day Home Comfort Trial expires: {fmtDate(addDays(delivery.date, 7))}
          </div>
        )}
        <SignaturePad onSave={handleSignatureSave} existingUrl={signatureUrl} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Print Name *</label>
            <input
              value={printName}
              onChange={e => setPrintName(e.target.value)}
              placeholder="Customer full name"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Date</label>
            <input
              type="date"
              value={signDate}
              onChange={e => setSignDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, var(--bg-color) 30%)',
        padding: '20px 16px 20px',
        maxWidth: 760, margin: '0 auto',
      }}>
        {!isReturn && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {['Delivered', 'Return', 'Exchange', 'Repair'].map(m => (
              <button
                key={m}
                onClick={() => setCompleteMode(m)}
                style={{
                  flex: 1, padding: '10px 4px', fontSize: 13, fontWeight: 700, borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${completeMode === m ? '#0b7a4a' : 'var(--border)'}`,
                  background: completeMode === m ? '#eef7f0' : 'var(--surface)',
                  color: completeMode === m ? '#0b7a4a' : 'var(--text-light)',
                  transition: 'var(--transition)'
                }}
              >
                {m === 'Delivered' ? '✅ Delivered' : m}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowETA(true)} style={{ padding: '13px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 20, cursor: 'pointer' }}>🚛</button>
          <button onClick={() => setShowTips(true)} style={{ padding: '13px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 18, cursor: 'pointer' }}>💡</button>
          <button
            onClick={handleComplete}
            disabled={!canComplete || saving}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', cursor: canComplete ? 'pointer' : 'not-allowed',
              background: canComplete ? '#0b7a4a' : 'var(--border)',
              color: canComplete ? '#fff' : 'var(--text-light)',
              fontWeight: 700, fontSize: 16,
              boxShadow: canComplete ? '0 4px 16px rgba(11,122,74,0.3)' : 'none',
              transition: 'var(--transition)',
            }}
          >
            {saving ? 'Saving...' : isReturn ? 'Complete Pickup ✓' : completeMode === 'Delivered' ? 'Delivery Completed ✓' : `Mark as ${completeMode} ✓`}
          </button>
        </div>
        {!canComplete && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#c89b0a', marginTop: 8 }}>
            {!allDelivered && filledItems.length > 0 ? '⚠️ Confirm all items first' :
             !condition ? '⚠️ Select condition' :
             !hasSignature ? '⚠️ Capture signature' :
             !printName.trim() ? '⚠️ Enter customer print name' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// Photo capture sub-component (uploads directly to Supabase)
function PhotoCapture({ deliveryId, existingUrls, onUpdate }) {
  const [urls, setUrls] = useState(existingUrls || []);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const handleAdd = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    const newUrls = [...urls];
    for (const file of files) {
      const path = `deliveries/${deliveryId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('delivery-photos').upload(path, file, { upsert: true });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('delivery-photos').getPublicUrl(path);
        newUrls.push(publicUrl);
      }
    }
    setUrls(newUrls);
    onUpdate(newUrls);
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {urls.map((url, i) => (
          <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <img src={url} alt="delivery" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setPreviewImage(url)} />
            <button
              onClick={() => { const u = urls.filter((_, j) => j !== i); setUrls(u); onUpdate(u); }}
              style={{ position: 'absolute', top: 1, right: 1, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >×</button>
          </div>
        ))}
        <label style={{
          width: 72, height: 72, borderRadius: 8, border: '2px dashed var(--border)',
          background: 'var(--bg-color)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 2,
        }}>
          <input type="file" accept="image/*" capture="environment" multiple onChange={handleAdd} style={{ display: 'none' }} />
          <span style={{ fontSize: 22, color: 'var(--text-light)' }}>{uploading ? '⏳' : '📷'}</span>
          <span style={{ fontSize: 10, color: 'var(--text-light)' }}>{uploading ? 'Uploading' : 'Add'}</span>
        </label>
      </div>
      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
