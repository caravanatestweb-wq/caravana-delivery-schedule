import { useState } from 'react';
import TeamDeliveryForm from './TeamDeliveryForm';
import WeeklyCalendar from './WeeklyCalendar';
import { localDate, fmtDate, sortDeliveriesByTime } from '../lib/constants';

export default function TeamView({ deliveries, repairs = [], updateDelivery }) {
  const [activeId, setActiveId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = localDate();

  const active = deliveries.find(d => d.id === activeId);

  if (active) {
    return (
      <TeamDeliveryForm
        delivery={active}
        onBack={() => setActiveId(null)}
        updateDelivery={updateDelivery}
      />
    );
  }

  // Deliveries visible to the team: scheduled or in-progress (not pending/sourcing/ready)
  const teamVisible = deliveries.filter(d =>
    ['Scheduled', 'In Progress', 'Contacted', 'Ready'].includes(d.status) ||
    d.flagged
  );

  const todayStops = sortDeliveriesByTime(teamVisible.filter(d => d.date === today));
  const otherStops = teamVisible.filter(d => d.date !== today);

  // Group other stops by date
  const otherByDate = otherStops.reduce((acc, d) => {
    const key = d.date || 'No Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    acc[key] = sortDeliveriesByTime(acc[key]);
    return acc;
  }, {});
  const sortedOtherDates = Object.keys(otherByDate).sort();

  const fmtHeader = (dateStr) => {
    if (!dateStr || dateStr === 'No Date') return 'No Date';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="team-center-container" style={{ paddingBottom: 40 }}>
      {/* Placement Cards */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[
          { key: 'active', label: 'ACTIVE', color: '#0b7a4a', bg: '#eef7f0', border: '#a7f0d4' },
          { key: 'today', label: 'TODAY', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { key: 'returns', label: 'RETURNS', color: '#c53030', bg: '#fef2f2', border: '#fca5a5' },
          { key: 'repairs', label: 'REPAIRS', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
        ].map(c => {
          const count = c.key === 'active' ? deliveries.filter(d => !['Delivered','Archived','Completed'].includes(d.status)).length :
                        c.key === 'today' ? deliveries.filter(d => d.date === today && d.status !== 'Archived').length :
                        c.key === 'returns' ? deliveries.filter(d => ['return', 'exchange', 'repair'].includes(d.flagged) && !['Delivered','Archived','Completed'].includes(d.status)).length :
                        repairs.filter(r => r.status !== 'Returned').length;
          return (
            <div key={c.key} style={{ 
              flex: 1, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 2px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: c.color, lineHeight: 1 }}>{count}</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: c.color, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</span>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--surface)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 20 }}>
        <button 
          onClick={() => setViewMode('list')}
          style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--text-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >List</button>
        <button 
          onClick={() => setViewMode('calendar')}
          style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', background: viewMode === 'calendar' ? 'var(--primary)' : 'transparent', color: viewMode === 'calendar' ? '#fff' : 'var(--text-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >Calendar</button>
      </div>

      {viewMode === 'calendar' ? (
        <div style={{ background: 'var(--surface)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <WeeklyCalendar 
            deliveries={teamVisible}
            repairEvents={repairs.filter(r => r.returnDate)}
            currentDate={currentDate}
            onEditDelivery={(d) => setActiveId(d.id)}
            onPrev={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }}
            onNext={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }}
          />
        </div>
      ) : teamVisible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚛</div>
          <div style={{ fontSize: 16, color: 'var(--text-light)' }}>No deliveries assigned</div>
        </div>
      ) : (
        <>
          {/* Today */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0b7a4a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              📅 Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {todayStops.length === 0 ? (
              <div style={{ padding: '14px 16px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text-light)', fontSize: 14 }}>
                No deliveries scheduled for today
              </div>
            ) : (
              todayStops.map((d, i) => (
                <StopCard key={d.id} delivery={d} stopNum={i + 1} onSelect={() => setActiveId(d.id)} />
              ))
            )}
          </div>

          {/* Upcoming — grouped by date */}
          {sortedOtherDates.map(dateKey => (
            <div key={dateKey} style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                📋 {fmtHeader(dateKey)}
              </h3>
              {otherByDate[dateKey].map((d, i) => (
                <StopCard key={d.id} delivery={d} stopNum={i + 1} onSelect={() => setActiveId(d.id)} />
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function StopCard({ delivery: d, stopNum, onSelect, showDate }) {
  // Items from new format or legacy packing list
  const items = d.items?.filter(it => it.description) ||
    (d.packingList || []).map(it => ({ description: it.text || it, delivered: false }));
  const checkedCount = items.filter(it => it.delivered).length;
  const isInProgress = d.status === 'In Progress';
  const isReturn = !!d.flagged;

  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--surface)',
        border: `2px solid ${isInProgress ? '#2563eb' : isReturn ? '#c53030' : 'var(--border)'}`,
        borderRadius: 14, padding: '16px 18px', marginBottom: 10,
        boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
        transition: 'var(--transition)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: isReturn ? '#c53030' : '#0b7a4a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {isReturn ? `🔄 ${d.flagged.charAt(0).toUpperCase() + d.flagged.slice(1)} Pickup` : `Stop #${stopNum}`}
        </span>
        {isInProgress && (
          <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#eef0f7', color: '#2563eb' }}>
            IN PROGRESS
          </span>
        )}
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>{d.clientName}</div>
      <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 10 }}>{d.address}</div>

      <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--text-light)', flexWrap: 'wrap' }}>
        {showDate && d.date && <span>📅 {fmtDate(d.date)}</span>}
        {d.timeWindow && <span>🕐 {d.timeWindow}</span>}
        <span>📦 {items.length} item{items.length !== 1 ? 's' : ''}</span>
        {d.deliveryTeam && <span>👥 {d.deliveryTeam}</span>}
        {checkedCount > 0 && <span style={{ color: '#0b7a4a', fontWeight: 600 }}>✓ {checkedCount}/{items.length}</span>}
        {d.source === 'Caravana Web' || d.orderSource === 'online'
          ? <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: '#eef0f7', color: '#2563eb', fontWeight: 600 }}>ONLINE</span>
          : null
        }
      </div>
    </button>
  );
}
