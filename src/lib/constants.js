// ── Inspection Checkpoints ──────────────────────────────────────
export const BASELINE_CHECKS = [
  { id: 'structure',    label: 'Structure & Frame',       desc: 'Sturdy, no wobble, joints tight',                    optional: false },
  { id: 'surface',      label: 'Surface Condition',       desc: 'No scratches, dents, chips, or marks',               optional: false },
  { id: 'asm_hardware', label: 'Assembly & Hardware',     desc: 'All connections tight, knobs/hinges secure',         optional: false },
  { id: 'finish_color', label: 'Finish & Color',          desc: 'Matches order, no inconsistent fading',              optional: false },
  { id: 'cleanliness',  label: 'Cleanliness',             desc: 'No dust, debris, or odors',                          optional: false },
  { id: 'leveling',     label: 'Leveling',                desc: 'Level on floor, glides/levelers adjusted',           optional: true  },
];

export const CATEGORY_CHECKS = {
  sofa: [
    { id: 'upholstery', label: 'Upholstery & Seams',   desc: 'No tears, pulls, or loose stitching',                optional: false },
    { id: 'cushions',   label: 'Cushion & Comfort',    desc: 'Evenly filled, no lumps, zippers work',              optional: false },
    { id: 'recliner',   label: 'Mechanism/Recliner',   desc: 'Smooth operation, cords/power functioning',          optional: true  },
  ],
  sectional: [
    { id: 'connection', label: 'Sectional Connectors', desc: 'Securely clipped, properly aligned gaps',            optional: false },
    { id: 'upholstery', label: 'Upholstery & Seams',   desc: 'No tears, pulls, or loose stitching',                optional: false },
    { id: 'cushions',   label: 'Cushion & Comfort',    desc: 'Evenly filled, no lumps, zippers work',              optional: false },
  ],
  dining: [
    { id: 'table_top',  label: 'Table Top Surface',    desc: 'No heat marks, ring stains, or grain flaws',         optional: false },
    { id: 'chair_stbl', label: 'Chair Stability',      desc: 'No wobbling on any chair',                           optional: false },
    { id: 'extensn',    label: 'Leaf / Extension',     desc: 'Inserts/slides smoothly, leaf stored properly',      optional: true  },
  ],
  bedroom: [
    { id: 'bed_slats',  label: 'Slat Support System',  desc: 'Slats correctly spaced, center legs adjusted',       optional: false },
    { id: 'drwr_glid',  label: 'Drawer Glide Action',  desc: 'Smooth, level, soft-cllosing functioning',           optional: true  },
    { id: 'hdbrd_conn', label: 'Headboard Connection', desc: 'Firmly attached to frame, no wobble',                optional: false },
  ],
  accent: [
    { id: 'accent_det', label: 'Accent Detailing',     desc: 'Intricate carving/metalwork/glass intact',           optional: false },
  ],
};

// Helper: Get final dynamic checklist based on delivery items
export const getInspectionList = (items = []) => {
  const categories = [...new Set(items.map(it => detectCategory(it.description)).filter(Boolean))];
  const dynamic = categories.flatMap(cat => CATEGORY_CHECKS[cat] || []);
  
  // Merge and ensure unique IDs (baseline + dynamic)
  const all = [...BASELINE_CHECKS, ...dynamic];
  const unique = [];
  const seen = new Set();
  for (const pt of all) {
    if (!seen.has(pt.id)) {
      unique.push(pt);
      seen.add(pt.id);
    }
  }
  return unique;
};

// ── Styling Tips ────────────────────────────────────────────────
export const STYLING_TIPS = {
  sofa: [
    'Suggest a textured throw blanket draped over one arm — cream or neutral tones work with everything',
    'Recommend 2–3 accent pillows in complementary colors to tie the room together',
    'If near a window, mention how the natural light brings out the fabric\'s true color',
    'Suggest a small side table or floor lamp to complete the seating area',
  ],
  sectional: [
    'Recommend a large area rug to anchor the sectional — should extend at least 6" past each side',
    'Suggest a coffee table or ottoman proportional to the L-shape',
    'Mention that a tall plant or floor lamp in the corner fills the space beautifully',
    'If there\'s a chaise end, suggest a cozy throw for movie nights',
  ],
  dining: [
    'Suggest a simple centerpiece — a bowl, candles, or small greenery arrangement',
    'Recommend a rug under the table (extend 24" past chairs on all sides)',
    'Mention that a pendant light or chandelier above would complete the space',
    'If there\'s a buffet/sideboard nearby, suggest coordinating decor',
  ],
  bedroom: [
    'Suggest matching nightstands to complete the look',
    'Recommend quality bedding in complementary colors',
    'Mention that matching lamps on nightstands add warmth and symmetry',
    'If it\'s a platform bed, suggest under-bed storage solutions',
  ],
  accent: [
    'Suggest pairing with a small side table for drinks or books',
    'Recommend a throw pillow that picks up a color from somewhere else in the room',
    'Mention that a reading lamp nearby creates a perfect cozy corner',
    'If near a window, suggest sheer curtains to soften the light',
  ],
  general: [
    'Ask the customer: "What do you think? How does it look in your space?"',
    'If they seem unsure, reassure them it often takes a day to "settle in" visually',
    'Mention the 7-Day Trial — "Live with it for a week and see how you feel"',
    'Offer: "We also carry accent pieces that would pair beautifully with this"',
  ],
};

// ── Item Size Tiers ─────────────────────────────────────────────
export const ITEM_TIERS = {
  small:  { label: 'Small',  examples: 'Accent chairs, nightstands, end tables',  exchangeFee: 49,  returnFee: 79  },
  medium: { label: 'Medium', examples: 'Dining tables, dressers, bed frames',       exchangeFee: 79,  returnFee: 129 },
  large:  { label: 'Large',  examples: 'Sectionals, sofas, recliners',              exchangeFee: 129, returnFee: 179 },
};

// ── Delivery Team Pairs (default, editable via Settings) ────────
export const DEFAULT_TEAM_MEMBERS = ['Juan', 'Erik', 'Ulises', 'Moises'];

// ── Status Options ──────────────────────────────────────────────
export const LIFECYCLE_STATUSES = [
  { value: 'Pending',     label: 'Pending',      color: '#c89b0a', bg: '#fef9ee' },
  { value: 'Sourcing',    label: 'Sourcing',      color: '#c89b0a', bg: '#fef9ee' },
  { value: 'Ready',       label: 'Ready',         color: '#0b7a4a', bg: '#eef7f0' },
  { value: 'Scheduled',   label: 'Scheduled',     color: '#2563eb', bg: '#eef0f7' },
  { value: 'In Progress', label: 'In Progress',   color: '#2563eb', bg: '#eef0f7' },
  { value: 'Delivered',   label: 'Delivered',     color: '#666',    bg: '#f0f0f0' },
  { value: 'Reschedule',  label: 'Reschedule',    color: '#c53030', bg: '#fef2f2' },
  { value: 'Contacted',   label: 'Contacted',     color: '#0b7a4a', bg: '#eef7f0' },
];

// ── Helpers ─────────────────────────────────────────────────────
export const addDays = (dateStr, n) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

export const daysBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.floor((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / (1000 * 60 * 60 * 24));
};

export const fmtDate = (d) => {
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return `${parseInt(m)}/${parseInt(dd)}/${y}`;
};

export const localDate = (date = new Date()) => {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
};

// Centralized logic for follow-ups to keep counts and tabs in sync
export const getFollowUpType = (d, today) => {
  if (!d || !d.date) return null;
  if (d.status !== 'Delivered' && d.status !== 'Completed') return null;
  
  const days = daysBetween(d.date, today);
  if (days === 0) return 'day0';
  if (days === 1 && !d.day1Sent) return 'day1';
  if (days >= 3 && days <= 5 && !d.day3Sent) return 'day3';
  if (days >= 8 && !d.reviewRequested && !d.flagged) return 'review';
  
  return null;
};

// Detect furniture category from item description for styling tips
export const detectCategory = (description = '') => {
  const d = description.toLowerCase();
  if (d.includes('sectional')) return 'sectional';
  if (d.includes('sofa') || d.includes('couch') || d.includes('loveseat')) return 'sofa';
  if (d.includes('dining') || d.includes('table') || d.includes('buffet') || d.includes('sideboard')) return 'dining';
  if (d.includes('bed') || d.includes('nightstand') || d.includes('dresser') || d.includes('mattress')) return 'bedroom';
  if (d.includes('chair') || d.includes('recliner') || d.includes('accent')) return 'accent';
  return null;
};
