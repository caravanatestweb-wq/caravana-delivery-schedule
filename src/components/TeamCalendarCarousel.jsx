import React, { useRef, useMemo, useEffect } from 'react';
import './TeamCalendarCarousel.css';

const getLocalDateString = (date = new Date()) =>
  date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

const isSameDay = (d1, d2) => getLocalDateString(d1) === getLocalDateString(d2);

const timeToMinutes = (tw = '') => {
  const m = (tw || '').match(/(\d{1,2}):(\d{2}) ([AP]M)/);
  if (!m) return 0;
  let h = parseInt(m[1]), min = parseInt(m[2]);
  if (m[3] === 'PM' && h < 12) h += 12;
  if (m[3] === 'AM' && h === 12) h = 0;
  return h * 60 + min;
};

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

export default function TeamCalendarCarousel({ deliveries, onEditDelivery }) {
  const scrollContainerRef = useRef(null);
  const todayRef = useRef(null);

  // Generate 120 days: -30 days to +90 days
  const days = useMemo(() => {
    const list = [];
    const base = new Date();
    base.setHours(12, 0, 0, 0); // avoid DST shift issues
    for (let i = -30; i <= 90; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  // Initial scroll to today on mount
  useEffect(() => {
    if (todayRef.current && scrollContainerRef.current) {
      setTimeout(() => {
        if (todayRef.current) {
          todayRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
        }
      }, 0);
    }
  }, []);

  const handleGoToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  return (
    <div className="team-carousel-wrapper">
      <div className="team-carousel-container" ref={scrollContainerRef}>
        {days.map((day, index) => {
          const dayStr = getLocalDateString(day);
          const isToday = isSameDay(day, new Date());

          // Gather deliveries and repairs for this day
          const allEvents = deliveries
            .filter(d => d.date === dayStr)
            .sort((a, b) => {
              const tA = timeToMinutes(a.timeWindow);
              const tB = timeToMinutes(b.timeWindow);
              return tA - tB;
            });

          return (
            <div 
              key={index} 
              ref={isToday ? todayRef : null}
              className={`carousel-day-column ${isToday ? 'is-today' : ''}`}
            >
              <div className="carousel-day-header">
                <span className="carousel-day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="carousel-day-number">{day.getDate()}</span>
                {day.getDate() === 1 && (
                  <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-light)', marginTop: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                    {day.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                )}
              </div>
              <div className="carousel-deliveries-list">
                {allEvents.length === 0 ? (
                  <div className="carousel-empty-state">No deliveries</div>
                ) : (
                  allEvents.map(ev => {
                    const isRepair = ev._type === 'repair';
                    const isPickup = ev._type === 'pickup';
                    // REPAIR styling check
                    if (isRepair) {
                      return (
                        <div
                          key={'r-' + ev.id}
                          className="delivery-card"
                          onClick={() => onEditDelivery && onEditDelivery(ev)}
                          style={{ borderLeftColor: '#c53030', border: '2px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', marginBottom: 8 }}
                        >
                          <div className="delivery-time" style={{ color: '#c53030' }}>
                            🔧 {ev.timeWindow?.split(' - ')[0]}
                          </div>
                          <div className="delivery-client">{ev.clientName}</div>
                          <div className="delivery-meta" style={{ display: 'flex', gap: 6 }}>
                             <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#c53030', color: '#fff', letterSpacing: 0.5 }}>REPAIR</span>
                             {ev.status === 'Ready for Return' && <span style={{ fontSize: 10, fontWeight: 700, color: '#0b7a4a' }}>✅ Ready</span>}
                          </div>
                        </div>
                      );
                    }

                    // PICKUP styling check
                    if (isPickup) {
                      return (
                        <div
                          key={'p-' + ev.id}
                          className="delivery-card"
                          onClick={() => onEditDelivery && onEditDelivery(ev)}
                          style={{ borderLeftColor: '#2563eb', border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer', marginBottom: 8 }}
                        >
                          <div className="delivery-time" style={{ color: '#1e3a8a' }}>
                            🏭 {ev.timeWindow?.split(' - ')[0]}
                          </div>
                          <div className="delivery-client" style={{ color: '#1e3a8a' }}>{ev.clientName}</div>
                          <div className="delivery-meta" style={{ display: 'flex', gap: 6 }}>
                             <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#2563eb', color: '#fff', letterSpacing: 0.5 }}>PICKUP</span>
                          </div>
                        </div>
                      );
                    }

                    // NORMAL DELIVERY styling check
                    return (
                      <div
                        key={ev.id}
                        className={`delivery-card status-${(ev.status || 'scheduled').toLowerCase().replace(/\s/g,'-')}`}
                        onClick={() => onEditDelivery && onEditDelivery(ev)}
                        style={{ borderLeftColor: getStatusColor(ev.status), marginBottom: 8 }}
                      >
                        <div className="delivery-time">{ev.timeWindow?.split(' - ')[0] || ev.timeWindow}</div>
                        <div className="delivery-client">{ev.clientName}</div>
                        
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: getStatusColor(ev.status) + '15', color: getStatusColor(ev.status), border: `1px solid ${getStatusColor(ev.status)}30`, textTransform: 'uppercase' }}>
                            {ev.status}
                          </span>
                          {ev.flagged && (
                            <span style={{ 
                              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, 
                              background: ev.flagged === 'repair' ? '#fef2f2' : '#f5f3ff', 
                              color: ev.flagged === 'repair' ? '#c53030' : '#7c3aed', 
                              border: `1px solid ${ev.flagged === 'repair' ? '#fca5a5' : '#c4b5fd'}`, 
                              textTransform: 'uppercase' 
                            }}>
                              {ev.flagged === 'repair' ? '🔧 ' : '🔄 '}{ev.flagged}
                            </span>
                          )}
                        </div>
                        
                        {/* Item chips */}
                        {(() => {
                          const chips = getItemChips(ev).slice(0, 3);
                          return chips.length > 0 ? (
                            <div className="item-chips" style={{ marginTop: 8 }}>
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
                        
                        <div className="delivery-meta" style={{ marginTop: 6 }}>
                          {ev.deliveryTeam && <span>👥 {ev.deliveryTeam}</span>}
                          {ev.orderSource === 'online' && <span className="online-badge">WEB</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="btn-go-today" onClick={handleGoToToday}>
        <span>📅 Today</span>
      </button>
    </div>
  );
}
