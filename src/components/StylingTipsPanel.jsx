import { STYLING_TIPS, detectCategory } from '../lib/constants';

const CATEGORY_META = {
  sofa:      { icon: '🛋️', label: 'Sofa / Loveseat' },
  sectional: { icon: '🛋️', label: 'Sectional' },
  dining:    { icon: '🍽️', label: 'Dining' },
  bedroom:   { icon: '🛏️', label: 'Bedroom' },
  accent:    { icon: '💺', label: 'Accent Chair / Recliner' },
  general:   { icon: '🏠', label: 'General Tips' },
};

export default function StylingTipsPanel({ items = [], onClose }) {
  // Detect categories from item descriptions
  const raw = items.map(it => detectCategory(it.description || it.text || '')).filter(Boolean);
  const categories = [...new Set(raw)];
  if (categories.length === 0) categories.push('general');

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', padding: '20px 20px 32px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 18px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-main)' }}>💡 Styling Suggestions</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-light)' }}>Quick tips to share with the customer</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--bg-color)', color: 'var(--text-light)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>

        <div style={{ background: '#fef9ee', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, lineHeight: 1.6, borderLeft: '3px solid #d4960a' }}>
          <strong>Pro tip:</strong> After placing the furniture, pause and say: <em>"Here's a quick styling idea that would really make this pop in your space..."</em> Then share one tip. It creates a premium experience and opens the door for add-on sales.
        </div>

        {categories.map(cat => {
          const meta = CATEGORY_META[cat] || CATEGORY_META.general;
          const tips = STYLING_TIPS[cat] || STYLING_TIPS.general;
          return (
            <div key={cat} style={{ marginBottom: 18 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0b7a4a', marginBottom: 8 }}>
                {meta.icon} {meta.label}
              </h4>
              {tips.map((tip, i) => (
                <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-color)', borderRadius: 8, marginBottom: 6, fontSize: 13, lineHeight: 1.6, borderLeft: '3px solid #d4960a', color: 'var(--text-main)' }}>
                  {tip}
                </div>
              ))}
            </div>
          );
        })}

        <div style={{ marginTop: 4 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0b7a4a', marginBottom: 8 }}>🏠 Always Say</h4>
          {STYLING_TIPS.general.map((tip, i) => (
            <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-color)', borderRadius: 8, marginBottom: 6, fontSize: 13, lineHeight: 1.6, borderLeft: '3px solid #0b7a4a', color: 'var(--text-main)' }}>
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
