import { supabase } from '../lib/supabaseClient';
import { ITEM_TIERS, daysBetween, fmtDate, localDate } from '../lib/constants';

const FLAG_CONFIG = {
  return:   { label: '🔴 Return',   color: '#c53030', bg: '#fef2f2' },
  exchange: { label: '🟡 Exchange', color: '#c89b0a', bg: '#fef9ee' },
  repair:   { label: '🟣 Repair',   color: '#9333ea', bg: '#f5f0ff' },
};

export default function ReturnsTab({ deliveries, updateDelivery, onEditDelivery }) {
  const today = localDate();
  const flagged = deliveries.filter(d => d.flagged && ['return', 'exchange', 'repair'].includes(d.flagged));

  const handleSchedulePickup = async (delivery) => {
    const { error } = await supabase.from('deliveries').update({ status: 'Scheduled' }).eq('id', delivery.id);
    if (!error) updateDelivery(delivery.id, { status: 'Scheduled' });
    else alert('Error: ' + error.message);
  };

  const handleRemoveFlag = async (delivery) => {
    if (!confirm('Remove this flag? The delivery will remain completed.')) return;
    const { error } = await supabase.from('deliveries').update({ flagged: null, flagReason: '', flagDate: null }).eq('id', delivery.id);
    if (!error) updateDelivery(delivery.id, { flagged: null, flagReason: '', flagDate: null });
    else alert('Error: ' + error.message);
  };

  if (flagged.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 16, color: 'var(--text-light)' }}>No returns or repairs flagged</div>
      </div>
    );
  }

  return (
    <div>
      {flagged.map(d => {
        const cfg = FLAG_CONFIG[d.flagged] || FLAG_CONFIG.return;
        const daysLeft = d.trialExpires ? daysBetween(today, d.trialExpires) : null;
        const trialExpired = daysLeft !== null && daysLeft < 0;

        // Build items array from either items (new) or packingList (legacy)
        const items = d.items?.length
          ? d.items.filter(it => it.description)
          : (d.packingList || []).map(it => ({ description: it.text || it, tier: 'medium' }));

        return (
          <div key={d.id} style={{
            background: 'var(--surface)', borderRadius: 12,
            borderLeft: `4px solid ${cfg.color}`,
            padding: '16px 18px', marginBottom: 14,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)' }}>{d.clientName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{d.address}</div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>

            {/* Reason */}
            {d.flagReason && (
              <div style={{ fontSize: 13, color: 'var(--text-main)', padding: '8px 12px', background: 'var(--bg-color)', borderRadius: 8, marginBottom: 10, lineHeight: 1.5 }}>
                {d.flagReason}
              </div>
            )}

            {/* Trial info */}
            <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 10 }}>
              Delivered: {fmtDate(d.date)}
              {d.trialExpires && (
                <> · Trial expires: {fmtDate(d.trialExpires)}
                  {trialExpired
                    ? <span style={{ color: '#c53030', fontWeight: 700 }}> — EXPIRED</span>
                    : <span style={{ color: '#0b7a4a', fontWeight: 700 }}> — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
                  }
                </>
              )}
            </div>

            {/* Fee estimate */}
            {d.flagged !== 'repair' && items.length > 0 && (
              <div style={{ background: 'var(--bg-color)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12, border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-main)' }}>Estimated Fees:</strong>
                {items.map((it, i) => {
                  const tier = ITEM_TIERS[it.tier] || ITEM_TIERS.medium;
                  const fee = d.flagged === 'exchange' ? tier.exchangeFee : tier.returnFee;
                  const restock = d.flagged === 'return' ? '+ 15% restocking' : 'No restocking fee';
                  return (
                    <div key={i} style={{ marginTop: 4, color: 'var(--text-light)' }}>
                      • {it.description} ({tier.label}): <strong style={{ color: 'var(--text-main)' }}>${fee} service fee</strong> — {restock}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => onEditDelivery(d)}
                style={{ padding: '8px 14px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => handleSchedulePickup(d)}
                style={{ padding: '8px 14px', fontSize: 13, borderRadius: 8, border: 'none', background: '#0b7a4a', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                📅 Schedule Pickup
              </button>
              <button
                onClick={() => handleRemoveFlag(d)}
                style={{ padding: '8px 14px', fontSize: 13, borderRadius: 8, border: '1px solid #fcc', background: 'var(--surface)', color: '#c53030', cursor: 'pointer' }}
              >
                Remove Flag
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
