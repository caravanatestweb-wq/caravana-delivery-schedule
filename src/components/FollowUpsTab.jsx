import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { daysBetween, fmtDate, localDate, getFollowUpType } from '../lib/constants';
import { getTMCredentials, sendTextMagicSMS } from '../lib/sms';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CSv2piRIQrlREBM/review';
// Yelp link will go here when ready:
// const YELP_REVIEW_URL = 'https://www.yelp.com/biz/caravana-furniture';

const DAY0_MSG = (firstName) =>
  `Hi ${firstName}! This is Caravana Furniture. Your delivery has been completed! We hope you love your new furniture. We'll check in again tomorrow to make sure everything is perfect. 📞 (562) 432-0562`;

const DAY1_MSG = (firstName) =>
  `Hi ${firstName}! This is Caravana Furniture. Just checking in — how's your new furniture looking in your space? If you need anything at all, we're here for you. 📞 (562) 432-0562`;

const DAY3_MSG = (firstName, days, trialExpires) =>
  `Hi ${firstName}! Your furniture was delivered ${days} days ago. We want to make sure you're loving it! Your 7-Day Home Comfort Trial expires on ${fmtDate(trialExpires)}. Any questions? Call us at (562) 432-0562`;

const REVIEW_MSG = (firstName) =>
  `Hi ${firstName}! We're so glad you're loving your new furniture from Caravana! 🎉 It would mean the world to us if you could leave a quick review:\n\n⭐ Google: ${GOOGLE_REVIEW_URL}\n\nThank you! — The Caravana Family`;

const RECEIPT_MSG = (firstName, items = [], orderNumber = '') =>
  `Hi ${firstName}! Thank you for choosing Caravana Furniture${orderNumber ? ` (Order ${orderNumber})` : ''}. Your delivery has been completed. Here's a summary of what was delivered:\n\n${items.map((it, i) => `${i + 1}. ${it}`).join('\n')}\n\nIf you have any questions about your purchase, please call (562) 432-0562. Thank you! — The Caravana Family`;

const PREP_MSG = (firstName, date, shareUrl) =>
  `Hi ${firstName}, We're so excited for your delivery — it's almost time! Your new furniture is scheduled to arrive on ${fmtDate(date)}. We want to make sure the experience is smooth and enjoyable.\n\nView Your Visual Delivery Guide & Preparation Tips here:\n${shareUrl}\n\nSee you soon! — The Caravana Family`;

export default function FollowUpsTab({ deliveries, updateDelivery }) {
  const today = localDate();
  const [sending, setSending] = useState(null);
  const [sendStatus, setSendStatus] = useState({});

  // TextMagic credentials come from localStorage (set via ⚙️ Settings gear)
  const hasCredentials = !!(localStorage.getItem('tm_username') && localStorage.getItem('tm_apikey'));

  const typeConfig = {
    prep:   { label: 'Prep Guide', color: '#7c3aed', bg: '#f5f3ff', badgeLabel: '📱 Prep Invitation' },
    day1:   { label: 'Day 1',    color: '#0b7a4a', bg: '#eef7f0', badgeLabel: '😊 Day 1 Check-in' },
    day3:   { label: 'Day 3–5',  color: '#2563eb', bg: '#eef0f7', badgeLabel: '📋 Trial Reminder' },
    review: { label: 'Review',   color: '#c89b0a', bg: '#fef9ee', badgeLabel: '⭐ Review Request' },
  };

  const followupItems = deliveries
    .map(d => {
      const type = getFollowUpType(d, today);
      if (!type) return null;
      return { delivery: d, type, days: daysBetween(d.date, today) };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);

  const upcomingPrepItems = deliveries
    .filter(d => {
      const days = daysBetween(today, d.date);
      return days >= 0 && days <= 2 && d.status !== 'Delivered' && d.status !== 'Completed' && !d.prepSent;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const reviewedItems = deliveries.filter(d => d.reviewRequested);

  const getFollowUpKey = (type) =>
    type === 'prep' ? { prepSent: true } :
    type === 'day0' ? { day0Sent: true } :
    type === 'day1' ? { day1Sent: true } :
    type === 'day3' ? { day3Sent: true } :
    { reviewRequested: true };

  const handleSend = async (delivery, type, message, useSMS = true) => {
    const key = delivery.id + type;
    setSending(key);
    setSendStatus(p => ({ ...p, [key]: null }));

    try {
      if (useSMS) {
        if (!delivery.phone) throw new Error('No phone number on this delivery');
        await sendTextMagicSMS(delivery.phone, message);
      }

      // Mark as sent in Supabase
      const updates = getFollowUpKey(type);
      const { error } = await supabase.from('deliveries').update(updates).eq('id', delivery.id);
      if (!error) {
        updateDelivery(delivery.id, updates);
        setSendStatus(p => ({ ...p, [key]: 'sent' }));
      }

      if (!useSMS) {
        navigator.clipboard?.writeText(message);
        setSendStatus(p => ({ ...p, [key]: 'copied' }));
      }
    } catch (err) {
      setSendStatus(p => ({ ...p, [key]: 'error:' + err.message }));
    }
    setSending(null);
  };

  if (followupItems.length === 0 && upcomingPrepItems.length === 0 && reviewedItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 16, color: 'var(--text-light)' }}>All tasks and follow-ups are current!</div>
      </div>
    );
  }

  return (
    <div>
      {/* TextMagic status — settings are in ⚙️ gear → Integrations */}
      <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 14 }}>
        📱 SMS via TextMagic:{' '}
        {hasCredentials
          ? <span style={{ color: '#0b7a4a', fontWeight: 700 }}>✅ Connected — use ⚙️ Settings to manage</span>
          : <span style={{ color: '#c53030', fontWeight: 700 }}>⚠️ Not configured — tap ⚙️ → Integrations to set up</span>}
      </div>

      {/* Upcoming Prep Guides Section */}
      {upcomingPrepItems.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            🚀 Upcoming Prep Guides ({upcomingPrepItems.length})
          </h3>
          {upcomingPrepItems.map(d => {
            const firstName = (d.clientName || '').split(' ')[0] || 'there';
            const shareUrl = `${window.location.origin}${window.location.pathname}#view=preview&id=${d.id}`;
            const message = PREP_MSG(firstName, d.date, shareUrl);
            const key = d.id + 'prep';
            const status = sendStatus[key];
            const isSending = sending === key;
            const cfg = typeConfig.prep;
            const days = daysBetween(today, d.date);

            return (
              <div key={key} style={{
                background: 'var(--surface)', borderRadius: 12,
                borderLeft: `4px solid ${cfg.color}`,
                padding: '16px 18px', marginBottom: 14,
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)' }}>{d.clientName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      Scheduled {fmtDate(d.date)} · {days === 0 ? 'Today' : `In ${days} day${days > 1 ? 's' : ''}`}
                      {d.phone && <span style={{ marginLeft: 8 }}>📞 {d.phone}</span>}
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                    {cfg.badgeLabel}
                  </span>
                </div>

                <div style={{
                  background: 'var(--bg-color)', borderRadius: 8, padding: 12,
                  fontSize: 12, lineHeight: 1.6, marginBottom: 12,
                  whiteSpace: 'pre-wrap', color: 'var(--text-main)',
                  border: '1px solid var(--border)', fontStyle: 'italic',
                }}>
                  {message}
                </div>

                {/* Status feedback */}
                {status && (
                  <div style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 8,
                    background: status === 'sent' ? '#eef7f0' : status === 'copied' ? '#eef0f7' : '#fef2f2',
                    color: status === 'sent' ? '#0b7a4a' : status === 'copied' ? '#2563eb' : '#c53030',
                  }}>
                    {status === 'sent' ? '✅ Prep Guide sent & marked!' :
                     status === 'copied' ? '📋 Guide Link copied to clipboard!' :
                     `❌ ${status.replace('error:', '')}`}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-primary" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13 }}
                    onClick={() => handleSend(d, 'prep', message, true)} disabled={isSending}>
                    {isSending ? '⏳ Sending...' : '📱 Send Guide SMS'}
                  </button>
                  <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13 }}
                    onClick={() => handleSend(d, 'prep', message, false)}>
                    📋 Copy Link & Mark
                  </button>
                  <a href={`sms:${d.phone}?body=${encodeURIComponent(message)}`} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                    💬 SMS App
                  </a>
                </div>
              </div>
            );
          })}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '32px 0 16px' }} />
        </div>
      )}

      {/* Follow-up Cards Header */}
      {followupItems.length > 0 && (
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
          🤝 Post-Delivery Follow-ups ({followupItems.length})
        </h3>
      )}
      {followupItems.map(({ delivery: d, type, days }) => {
        const firstName = (d.clientName || '').split(' ')[0] || 'there';
        const cfg = typeConfig[type];
        const message =
          type === 'day0' ? DAY0_MSG(firstName) :
          type === 'day1' ? DAY1_MSG(firstName) :
          type === 'day3' ? DAY3_MSG(firstName, days, d.trialExpires) :
          REVIEW_MSG(firstName);
        const key = d.id + type;
        const status = sendStatus[key];
        const isSending = sending === key;

        return (
          <div key={key} style={{
            background: 'var(--surface)', borderRadius: 12,
            borderLeft: `4px solid ${cfg.color}`,
            padding: '16px 18px', marginBottom: 14,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)' }}>{d.clientName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  Delivered {fmtDate(d.date)} · Day {days}
                  {d.phone && <span style={{ marginLeft: 8 }}>📞 {d.phone}</span>}
                </div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                {cfg.badgeLabel}
              </span>
            </div>

            {/* Message preview */}
            <div style={{
              background: 'var(--bg-color)', borderRadius: 8, padding: 12,
              fontSize: 13, lineHeight: 1.7, marginBottom: 12,
              whiteSpace: 'pre-wrap', color: 'var(--text-main)',
              border: '1px solid var(--border)',
            }}>
              {message}
            </div>

            {/* Status feedback */}
            {status && (
              <div style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 8,
                background: status === 'sent' ? '#eef7f0' : status === 'copied' ? '#eef0f7' : '#fef2f2',
                color: status === 'sent' ? '#0b7a4a' : status === 'copied' ? '#2563eb' : '#c53030',
              }}>
                {status === 'sent' ? '✅ SMS sent & marked!' :
                 status === 'copied' ? '📋 Message copied to clipboard!' :
                 `❌ ${status.replace('error:', '')}`}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/* SMS via TextMagic */}
              <button
                className="btn-primary"
                style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: isSending ? 'wait' : 'pointer', opacity: isSending ? 0.7 : 1 }}
                onClick={() => handleSend(d, type, message, true)}
                disabled={isSending}
              >
                {isSending ? '⏳ Sending...' : '📱 Send SMS'}
              </button>

              {/* Open SMS app fallback */}
              {d.phone && (
                <a
                  href={`sms:${d.phone}?body=${encodeURIComponent(message)}`}
                  style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  💬 Open SMS App
                </a>
              )}

              {/* Copy only */}
              <button
                style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-light)', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => handleSend(d, type, message, false)}
              >
                📋 Copy & Mark Sent
              </button>

              {/* Email link */}
              {d.email && (
                <a
                  href={`mailto:${d.email}?subject=Your Caravana Furniture Delivery&body=${encodeURIComponent(message)}`}
                  style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  ✉️ Email
                </a>
              )}
            </div>
          </div>
        );
      })}

      {/* Reviews Requested */}
      {reviewedItems.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            ✅ Reviews Requested ({reviewedItems.length})
          </h4>
          {reviewedItems.slice(0, 10).map(d => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--surface)', borderRadius: 8, marginBottom: 6, fontSize: 13, color: 'var(--text-light)', border: '1px solid var(--border)' }}>
              <span>{d.clientName}</span>
              <span>{fmtDate(d.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
