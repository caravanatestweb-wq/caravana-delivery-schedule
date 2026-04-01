import { useState, useEffect } from 'react';

export default function GlobalNotificationModal({ deliveries = [], repairs = [], teamAlerts = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingRepairs, setPendingRepairs] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);
  const [unseenTeamAlerts, setUnseenTeamAlerts] = useState([]);

  useEffect(() => {
    // 1. Calculate pending system issues
    const pRepairs = repairs.filter(r => r.status !== 'Returned' && !r.returnDate);
    const pReturns = deliveries.filter(d => 
      ['return', 'exchange'].includes(d.flagged) && 
      !['Delivered', 'Completed', 'Archived'].includes(d.status)
    );
    const pLegacyRepairs = deliveries.filter(d => 
      d.flagged === 'repair' && 
      !['Delivered', 'Completed', 'Archived'].includes(d.status) && 
      !d.date
    );

    setPendingRepairs([...pRepairs, ...pLegacyRepairs]);
    setPendingReturns(pReturns);

    // 2. Compute Unseen Team Alerts
    const seenAlertIds = JSON.parse(localStorage.getItem('seen_team_alerts') || '[]');
    const unseen = teamAlerts.filter(a => !seenAlertIds.includes(a.id));
    setUnseenTeamAlerts(unseen);

    const systemIssuesCount = pRepairs.length + pLegacyRepairs.length + pReturns.length;

    // 3. Auto-Trigger Logic
    if (unseen.length > 0) {
      // DYNAMIC BYPASS: If there are unseen team alerts, force open immediately
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    } else if (systemIssuesCount > 0) {
      // STANDARD THROTTLE: check local storage 6H snooze
      const lastSeenStr = localStorage.getItem('notification_last_seen');
      const now = Date.now();
      if (!lastSeenStr || (now - parseInt(lastSeenStr, 10) > 21600000)) {
        const timer = setTimeout(() => setIsOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [deliveries, repairs, teamAlerts]);

  const handleAcknowledge = () => {
    // Snooze standard system alerts
    localStorage.setItem('notification_last_seen', Date.now().toString());
    
    // Silence current active Team Alerts
    if (unseenTeamAlerts.length > 0) {
      const previouslySeen = JSON.parse(localStorage.getItem('seen_team_alerts') || '[]');
      const newSeen = [...previouslySeen, ...unseenTeamAlerts.map(a => a.id)];
      localStorage.setItem('seen_team_alerts', JSON.stringify(newSeen));
      setUnseenTeamAlerts([]);
    }

    setIsOpen(false);
  };

  const activeTeamAlerts = teamAlerts; // Total active (for manual viewing)
  const totalIssues = pendingRepairs.length + pendingReturns.length + unseenTeamAlerts.length;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="no-print fade-in"
        title="Pending Actions Feed"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9000, 
          background: totalIssues > 0 ? '#c53030' : '#475569', color: '#fff', 
          border: 'none', borderRadius: '50%', width: 50, height: 50, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          transition: 'transform 0.2s'
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {totalIssues > 0 ? '🚨' : '✅'}
        {totalIssues > 0 && (
          <span style={{ 
            position: 'absolute', top: -5, right: -2, background: '#fff', color: '#c53030', 
            borderRadius: '50%', width: 22, height: 22, fontSize: 13, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            {totalIssues}
          </span>
        )}
      </button>

      {isOpen && (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999, padding: 20
      }}
    >
      <div 
        className="fade-in"
        style={{
          background: 'var(--surface, #fff)',
          borderRadius: 16,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          width: '100%', maxWidth: 450,
          maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ background: totalIssues > 0 ? '#fef2f2' : '#f0fdf4', padding: '16px 20px', borderBottom: `1px solid ${totalIssues > 0 ? '#fecaca' : '#bbf7d0'}`, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{totalIssues > 0 ? '🚨' : '🌴'}</span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: totalIssues > 0 ? '#c53030' : '#15803d', margin: 0 }}>
                {totalIssues > 0 ? 'Action Required' : 'All Caught Up!'}
              </h2>
              <div style={{ fontSize: 12, color: totalIssues > 0 ? '#991b1b' : '#166534', marginTop: 2 }}>
                {totalIssues > 0 ? 'You have pending tasks that need scheduling.' : 'Zero pending repairs or returns detected.'}
              </div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text-light)' }}>&times;</button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto' }}>
          
          {/* TEAM ALERTS (Highest Priority) */}
          {activeTeamAlerts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                📣 Urgent Team Alerts ({activeTeamAlerts.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeTeamAlerts.map(alert => {
                  const isUnseen = unseenTeamAlerts.some(u => u.id === alert.id);
                  return (
                    <div key={alert.id} style={{ 
                      background: '#fffbeb', border: `1px solid ${isUnseen ? '#f59e0b' : '#fde68a'}`, 
                      padding: 12, borderRadius: 8, position: 'relative',
                      borderLeft: isUnseen ? '4px solid #f59e0b' : '1px solid #fde68a'
                    }}>
                      {isUnseen && <span style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 12 }}>NEW</span>}
                      <p style={{ margin: '0 0 6px 0', fontSize: 14, color: '#92400e', fontWeight: 600 }}>{alert.message}</p>
                      <div style={{ fontSize: 11, color: '#b45309', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Sent by: <strong>{alert.created_by}</strong></span>
                        <span>Exp: {new Date(alert.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pendingRepairs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#c53030', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                🔧 Pending Repairs ({pendingRepairs.length})
              </h3>
              <div style={{ fontSize: 13, color: 'var(--text-main)', background: '#fafafa', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                These repairs <strong>do not have a Return Calendar Appointment</strong> set yet.
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, color: 'var(--text-light)' }}>
                  {pendingRepairs.slice(0, 3).map(r => (
                    <li key={r.id}><strong>{r.clientName}</strong> - {r.status}</li>
                  ))}
                  {pendingRepairs.length > 3 && <li>...and {pendingRepairs.length - 3} more</li>}
                </ul>
              </div>
            </div>
          )}

          {pendingReturns.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                🔄 Active Returns ({pendingReturns.length})
              </h3>
              <div style={{ fontSize: 13, color: 'var(--text-main)', background: '#fafafa', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                These returns & exchanges need to be finalized or routed.
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, color: 'var(--text-light)' }}>
                  {pendingReturns.slice(0, 3).map(d => (
                    <li key={d.id}><strong>{d.clientName}</strong> - {d.status}</li>
                  ))}
                  {pendingReturns.length > 3 && <li>...and {pendingReturns.length - 3} more</li>}
                </ul>
              </div>
            </div>
          )}

          {(activeTeamAlerts.length === 0 && pendingRepairs.length === 0 && pendingReturns.length === 0) && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 50, marginBottom: 16 }}>✨</div>
              <h3 style={{ fontSize: 18, color: 'var(--text-main)', margin: 0 }}>Your queue is totally clear!</h3>
              <p style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 8 }}>Any newly logged isolated repairs or un-routed returns will automatically surface here so they never fall through the cracks.</p>
            </div>
          )}

        </div>

        <div style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button 
            onClick={handleAcknowledge}
            style={{
              padding: '10px 24px', background: '#c53030', color: '#fff', 
              border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, 
              cursor: 'pointer', boxShadow: '0 4px 6px rgba(197, 48, 48, 0.2)',
              transition: 'transform 0.1s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {unseenTeamAlerts.length > 0 ? 'Acknowledge Alerts' : 'Acknowledge (Snooze 6h)'}
          </button>
        </div>

      </div>
    </div>
    )}
  </>
  );
}
