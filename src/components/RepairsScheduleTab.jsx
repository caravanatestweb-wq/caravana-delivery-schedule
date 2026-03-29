import { useState } from 'react';

const STATUS_CONFIG = {
  'Picked Up':       { color: '#c89b0a', bg: '#fef9ee', icon: '📥' },
  'In Repair':       { color: '#2563eb', bg: '#eff6ff', icon: '🔧' },
  'Ready for Return':{ color: '#059669', bg: '#ecfdf5', icon: '✅' },
  'Returned':        { color: '#6b7280', bg: '#f9fafb', icon: '🏠' },
};

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const daysDiff = (from, to) => {
  if (!from || !to) return null;
  return Math.round((new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / 86400000);
};

export default function RepairsScheduleTab({ repairs, onNew, onEdit }) {
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = repairs
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .sort((a, b) => {
      // Sort active repairs by return date, completed ones at bottom
      if (a.status === 'Returned' && b.status !== 'Returned') return 1;
      if (b.status === 'Returned' && a.status !== 'Returned') return -1;
      return (a.returnDate || '').localeCompare(b.returnDate || '');
    });

  const counts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map(s => [s, repairs.filter(r => r.status === s).length])
  );

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = repairs.filter(r =>
    r.returnDate && r.returnDate < today && r.status !== 'Returned'
  ).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>🔧 Repairs</h2>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 2 }}>
            Track furniture repairs — return dates appear on the delivery calendar
          </p>
        </div>
        <button className="btn-primary" onClick={onNew}>+ New Repair</button>
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            border: `1.5px solid ${filterStatus === 'all' ? 'var(--primary)' : 'var(--border)'}`,
            background: filterStatus === 'all' ? 'var(--primary)' : 'var(--surface)',
            color: filterStatus === 'all' ? '#fff' : 'var(--text-light)',
          }}
        >
          All ({repairs.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <button key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              border: `1.5px solid ${filterStatus === s ? cfg.color : 'var(--border)'}`,
              background: filterStatus === s ? cfg.bg : 'var(--surface)',
              color: filterStatus === s ? cfg.color : 'var(--text-light)',
            }}
          >
            {cfg.icon} {s} ({counts[s] || 0})
          </button>
        ))}
        {overdueCount > 0 && (
          <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: '#fef2f2', color: '#c53030', border: '1.5px solid #c53030' }}>
            ⚠️ {overdueCount} Overdue
          </span>
        )}
      </div>

      {/* Repair cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔧</div>
          <div style={{ fontSize: 16, color: 'var(--text-light)', marginBottom: 16 }}>
            {filterStatus === 'all' ? 'No repair jobs yet' : `No repairs with status "${filterStatus}"`}
          </div>
          {filterStatus === 'all' && (
            <button className="btn-primary" onClick={onNew}>+ Create First Repair</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG['Picked Up'];
            const isOverdue = r.returnDate && r.returnDate < today && r.status !== 'Returned';
            const daysUntilReturn = r.returnDate ? daysDiff(today, r.returnDate) : null;
            const repairDays = daysDiff(r.pickupDate, r.estimatedCompletion);

            return (
              <div key={r.id}
                onClick={() => onEdit(r)}
                style={{
                  background: 'var(--surface)',
                  border: `1.5px solid ${isOverdue ? '#c53030' : cfg.color + '60'}`,
                  borderLeft: `4px solid ${isOverdue ? '#c53030' : cfg.color}`,
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    {/* Client + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)' }}>{r.clientName}</span>
                      <span style={{
                        padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: cfg.bg, color: cfg.color,
                      }}>{cfg.icon} {r.status}</span>
                      {r.warranty && <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#2563eb' }}>WARRANTY</span>}
                      {isOverdue && <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#c53030' }}>OVERDUE</span>}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: 14, color: 'var(--text-main)', marginBottom: 8, lineHeight: 1.4 }}>
                      {r.description}
                    </div>

                    {/* Timeline chips */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-light)' }}>
                      {r.pickupDate && <span>📥 Picked up {fmtDate(r.pickupDate)}</span>}
                      {r.estimatedCompletion && <span>🔧 Est. done {fmtDate(r.estimatedCompletion)}{repairDays != null ? ` (${repairDays}d)` : ''}</span>}
                      {r.team && <span>👥 {r.team}</span>}
                      {r.repairCost && <span>💲 {r.repairCost}</span>}
                    </div>
                  </div>

                  {/* Return date badge */}
                  {r.returnDate && (
                    <div style={{
                      textAlign: 'center', minWidth: 90, padding: '10px 14px',
                      background: isOverdue ? '#fef2f2' : '#f5f3ff',
                      border: `1.5px solid ${isOverdue ? '#c53030' : '#c4b5fd'}`,
                      borderRadius: 10, flexShrink: 0,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isOverdue ? '#c53030' : '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {isOverdue ? '⚠️ Overdue' : daysUntilReturn === 0 ? '📅 Today' : daysUntilReturn === 1 ? '📅 Tomorrow' : `📅 ${daysUntilReturn}d`}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                        {fmtDate(r.returnDate)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 1 }}>
                        {r.returnTimeWindow?.split(' - ')[0]}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
