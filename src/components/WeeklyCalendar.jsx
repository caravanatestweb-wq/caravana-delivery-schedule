import React, { useRef } from 'react';
import './WeeklyCalendar.css';

const getLocalDateString = (date = new Date()) =>
  date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDaysOfWeek = (startDate) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }
  return days;
};

const isSameDay = (d1, d2) => getLocalDateString(d1) === getLocalDateString(d2);

const timeToMinutes = (tw = '') => {
  const m = (tw || '').match(/(\d{1,2}):(\d{2}) ([AP]M)/);
  if (!m) return 0;
  let h = parseInt(m[1]), min = parseInt(m[2]);
  if (m[3] === 'PM' && h < 12) h += 12;
  if (m[3] === 'AM' && h === 12) h = 0;
  return h * 60 + min;
};

const sortByTime = (arr, keyFn) =>
  [...arr].sort((a, b) => {
    const ta = keyFn ? keyFn(a) : timeToMinutes(a.timeWindow);
    const tb = keyFn ? keyFn(b) : timeToMinutes(b.timeWindow);
    return ta - tb;
  });

const STATUS_COLORS = {
  delivered:    '#0b7a4a',
  'in progress':'#2563eb',
  scheduled:    'var(--primary)',
  pending:      '#c89b0a',
  sourcing:     '#c89b0a',
  ready:        '#059669',
  reschedule:   '#c53030',
  contacted:    '#7c3aed',
};
const getStatusColor = (s) => STATUS_COLORS[(s||'').toLowerCase()] || 'var(--primary)';

const getCategoryIcon = (desc = '') => {
  const d = desc.toLowerCase();
  if (d.includes('sectional') || d.includes('sofa') || d.includes('couch') || d.includes('loveseat')) return '🛋️';
  if (d.includes('dining') || d.includes('table') || d.includes('buffet') || d.includes('sideboard')) return '🍽️';
  if (d.includes('bed') || d.includes('nightstand') || d.includes('dresser') || d.includes('mattress')) return '🛏️';
  if (d.includes('recliner') || d.includes('chair') || d.includes('accent')) return '💺';
  if (d.includes('ottoman') || d.includes('bench') || d.includes('pillow') || d.includes('rug')) return '🪑';
  return '📦';
};

const getItemChips = (delivery) => {
  if (delivery.items?.length) return delivery.items.filter(it => it.description);
  if (delivery.packingList?.length) return delivery.packingList.map(it => ({ description: it.text || it }));
  return [];
};

export default function WeeklyCalendar({ deliveries, repairEvents = [], currentDate, onEditDelivery, onNewFromSlot, onPrev, onNext }) {
  const weekStart = getStartOfWeek(currentDate);
  const days = getDaysOfWeek(weekStart);

  // Touch swipe
  const touchStart = useRef(null);
  const handleTouchStart = e => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = e => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && onNext) onNext();
      else if (diff < 0 && onPrev) onPrev();
    }
    touchStart.current = null;
  };

  return (
    <div className="calendar-container" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="calendar-grid">
        {days.map((day, index) => {
          const dayStr = getLocalDateString(day);
          const dayDeliveries = sortByTime(deliveries.filter(d => d.date === dayStr));
          const dayRepairs = sortByTime(
            (repairEvents || []).filter(r => r.returnDate === dayStr),
            r => timeToMinutes(r.returnTimeWindow)
          );
          // Merge and sort all events by time
          const allEvents = [
            ...dayDeliveries.map(d => ({ ...d, _type: 'delivery' })),
            ...dayRepairs.map(r => ({ ...r, _type: 'repair' })),
          ].sort((a, b) => {
            const tA = a._type === 'repair' ? timeToMinutes(a.returnTimeWindow) : timeToMinutes(a.timeWindow);
            const tB = b._type === 'repair' ? timeToMinutes(b.returnTimeWindow) : timeToMinutes(b.timeWindow);
            return tA - tB;
          });
          const isToday = isSameDay(day, new Date());
          return (
            <div key={index} className={`calendar-day ${isToday ? 'is-today' : ''}`}>
              <div className="day-header">
                <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="day-number">{day.getDate()}</span>
              </div>
              <div
                className="deliveries-list"
                onClick={() => onNewFromSlot && onNewFromSlot(day)}
                style={{ cursor: 'pointer' }}
                title="Click to add delivery"
              >
                {allEvents.length === 0 ? (
                  <div className="no-deliveries">+ tap to add</div>
                ) : (
                  allEvents.map(ev => ev._type === 'repair' ? (
                    <div
                      key={'r-' + ev.id}
                      className="delivery-card"
                      onClick={e => { e.stopPropagation(); onSwitchTab('repairs'); }}
                      style={{ borderLeftColor: '#7c3aed', background: '#f5f3ff', cursor: 'pointer' }}
                      title="Repair return"
                    >
                      <div className="delivery-time" style={{ color: '#7c3aed' }}>
                        🔧 {ev.returnTimeWindow?.split(' - ')[0]}
                      </div>
                      <div className="delivery-client">{ev.clientName}</div>
                      <div className="delivery-meta" style={{ color: '#7c3aed' }}>
                        <span>Return</span>
                        {ev.status === 'Ready for Return' && <span style={{ fontWeight: 700 }}>✅ Ready</span>}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={ev.id}
                      className={`delivery-card status-${(ev.status || 'scheduled').toLowerCase().replace(/\s/g,'-')}`}
                      onClick={(e) => { e.stopPropagation(); onEditDelivery(ev); }}
                      style={{ borderLeftColor: getStatusColor(ev.status) }}
                      title="Click to edit"
                    >
                      <div className="delivery-time">{ev.timeWindow?.split(' - ')[0] || ev.timeWindow}</div>
                      <div className="delivery-client">{ev.clientName}</div>
                      
                      {/* Status Badge */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        <span style={{ 
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', 
                          borderRadius: 4, background: getStatusColor(ev.status) + '15', 
                          color: getStatusColor(ev.status), border: `1px solid ${getStatusColor(ev.status)}30`,
                          textTransform: 'uppercase'
                        }}>
                          {ev.status}
                        </span>
                        {ev.flagged && (
                          <span style={{ 
                            fontSize: 10, fontWeight: 700, padding: '2px 6px', 
                            borderRadius: 4, background: '#fee2e2', color: '#c53030', border: '1px solid #fecaca',
                            textTransform: 'uppercase'
                          }}>
                            🔄 {ev.flagged}
                          </span>
                        )}
                        {ev.orderSource === 'online' && (
                          <span style={{ 
                            fontSize: 10, fontWeight: 700, padding: '2px 6px', 
                            borderRadius: 4, background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe',
                            textTransform: 'uppercase'
                          }}>
                            🌐 Online
                          </span>
                        )}
                      </div>
                      
                      {/* Item chips */}
                      {(() => {
                        const chips = getItemChips(ev).slice(0, 3);
                        return chips.length > 0 ? (
                          <div className="item-chips">
                            {chips.map((it, i) => (
                              <span key={i} className="item-chip" title={it.description}>
                                <span className="item-chip-icon">{getCategoryIcon(it.description)}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {it.qty && it.qty !== '1' ? `×${it.qty} ` : ''}{it.description.split(' - ')[0]}
                                </span>
                              </span>
                            ))}
                            {getItemChips(ev).length > 3 && (
                              <span className="item-chip">+{getItemChips(ev).length - 3} more</span>
                            )}
                          </div>
                        ) : null;
                      })()}
                      <div className="delivery-meta">
                        {ev.deliveryTeam && <span>👥 {ev.deliveryTeam}</span>}
                        {ev.orderSource === 'online' && <span className="online-badge">WEB</span>}
                        {ev.flagged && <span className="flag-badge">{ev.flagged === 'return' ? '🔴' : ev.flagged === 'exchange' ? '🟡' : '🟣'}</span>}
                      </div>
                      {ev.notes && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600 }}>📝 notes</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
