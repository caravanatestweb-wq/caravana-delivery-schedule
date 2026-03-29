import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const TABS = [
  { id: 'team',         label: '👥 Team' },
  { id: 'integrations', label: '🔌 Integrations' },
  { id: 'messages',     label: '💬 Messages' },
];

export default function TeamSettings({ onClose }) {
  const [activeTab, setActiveTab] = useState('team');

  // ── Team Members ──────────────────────────────────────────────
  const [members, setMembers] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('team_members').select('*').order('name');
    if (!error && data) setMembers(data);
    setLoading(false);
  };

  const addMember = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const { error } = await supabase.from('team_members').insert({ name });
    if (!error) { setNewName(''); await loadMembers(); }
    else alert('Error adding member: ' + error.message);
    setSaving(false);
  };

  const removeMember = async (id, name) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (!error) await loadMembers();
    else alert('Error removing member: ' + error.message);
  };

  // ── TextMagic Credentials ─────────────────────────────────────
  const [tmUser, setTmUser] = useState(localStorage.getItem('tm_username') || '');
  const [tmKey, setTmKey]   = useState(localStorage.getItem('tm_apikey')   || '');
  const [tmSaved, setTmSaved] = useState(false);

  const saveTM = async () => {
    localStorage.setItem('tm_username', tmUser.trim());
    localStorage.setItem('tm_apikey',   tmKey.trim());
    
    // Globally sync API keys to Supabase
    await supabase.from('app_settings').upsert({ id: 1, tm_user: tmUser.trim(), tm_key: tmKey.trim() });
    
    setTmSaved(true);
    setTimeout(() => setTmSaved(false), 2500);
  };

  const testTM = async () => {
    if (!tmUser || !tmKey) { alert('Enter credentials first'); return; }
    try {
      const resp = await fetch('https://rest.textmagic.com/api/v2/me', {
        headers: { 'X-TM-Username': tmUser.trim(), 'X-TM-Key': tmKey.trim() },
      });
      if (resp.ok) {
        const data = await resp.json();
        alert(`✅ Connected! Account: ${data.username || tmUser}\nBalance: ${data.balance} credits`);
      } else {
        alert(`❌ Connection failed (${resp.status}) — check your username and API key`);
      }
    } catch {
      alert('❌ Network error — TextMagic API unreachable from browser.\nYou may need a proxy. Contact us if this happens.');
    }
  };

  // ── Custom Message Templates ─────────────────────────────────
  const [phone, setPhone] = useState(localStorage.getItem('biz_phone') || '(562) 432-0562');
  const [bizName, setBizName] = useState(localStorage.getItem('biz_name') || 'Caravana Furniture');
  const [savedBiz, setSavedBiz] = useState(false);

  const saveBiz = () => {
    localStorage.setItem('biz_phone', phone);
    localStorage.setItem('biz_name', bizName);
    setSavedBiz(true);
    setTimeout(() => setSavedBiz(false), 2500);
  };

  const tmConnected = !!(localStorage.getItem('tm_username') && localStorage.getItem('tm_apikey'));

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '14px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 0', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-main)' }}>⚙️ Settings</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--bg-color)', color: 'var(--text-light)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '10px 20px 0', gap: 4, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 14px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                background: activeTab === t.id ? 'var(--surface)' : 'transparent',
                color: activeTab === t.id ? 'var(--primary)' : 'var(--text-light)',
                borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>

          {/* ── TEAM TAB ───────────────────────────────── */}
          {activeTab === 'team' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                  placeholder="Add team member name..."
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: 15, fontFamily: 'inherit' }}
                />
                <button onClick={addMember} disabled={saving || !newName.trim()}
                  style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#0b7a4a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving || !newName.trim() ? 0.5 : 1 }}>
                  + Add
                </button>
              </div>

              {loading ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '20px 0' }}>Loading...</p>
              ) : members.length === 0 ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '20px 0' }}>No team members yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-color)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #0a9a8f, #0b7a4a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-main)' }}>{m.name}</span>
                      </div>
                      <button onClick={() => removeMember(m.id, m.name)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fcc', background: 'var(--surface)', color: '#c53030', fontSize: 12, cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 12 }}>Team members appear in the "Delivery Team" dropdown.</p>
            </>
          )}

          {/* ── INTEGRATIONS TAB ───────────────────────── */}
          {activeTab === 'integrations' && (
            <>
              {/* TextMagic */}
              <div style={{ background: 'var(--bg-color)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 22 }}>🚀</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>Secure SMS Dispatch</div>
                    <div style={{ fontSize: 12, color: '#0b7a4a', fontWeight: 600 }}>
                      ✅ Active via Vercel API
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.6 }}>
                  Text messages are now sent securely through the Caravana server. 
                  <br /><br />
                  Individual device setup is <strong>no longer required</strong>. API keys are managed safely in the Vercel Dashboard.
                </div>
              </div>

              {/* Google Review */}
              <div style={{ background: 'var(--bg-color)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 22 }}>⭐</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>Google Review Link</div>
                    <div style={{ fontSize: 12, color: '#0b7a4a', fontWeight: 600 }}>✅ Configured</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-light)', wordBreak: 'break-all' }}>
                  https://g.page/r/CSv2piRIQrlREBM/review
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 6 }}>
                  Used in the Day 8+ review request message. Yelp link coming soon.
                </div>
              </div>
            </>
          )}

          {/* ── MESSAGES TAB ───────────────────────────── */}
          {activeTab === 'messages' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>
                Business info used in all SMS messages.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>Business Name</label>
                  <input value={bizName} onChange={e => setBizName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-light)', display: 'block', marginBottom: 4 }}>Business Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <button onClick={saveBiz} style={{ padding: '10px', borderRadius: 8, border: 'none', background: '#0b7a4a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {savedBiz ? '✅ Saved!' : 'Save Business Info'}
                </button>
              </div>
              <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-color)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-light)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--text-main)' }}>Message Previews:</strong><br/>
                <strong>Day 1:</strong> "Hi [Name]! This is {bizName}. Just checking in..." {phone}<br/>
                <strong>Day 3:</strong> "Hi [Name]! Your furniture was delivered X days ago..." {phone}<br/>
                <strong>Review:</strong> "Hi [Name]! We're so glad you're loving your furniture..." + Google link<br/>
                <strong>Receipt:</strong> "Hi [Name]! Thank you for choosing {bizName}..." + itemized list
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
