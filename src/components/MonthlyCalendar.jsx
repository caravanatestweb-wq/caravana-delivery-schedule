import React from 'react';
import './WeeklyCalendar.css';

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const getLocalDateString = (date = new Date()) => {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
};

const isSameDay = (date1, date2) => {
  return getLocalDateString(date1) === getLocalDateString(date2);
};

export default function MonthlyCalendar({ deliveries, repairEvents = [], pickupEvents = [], currentDate, onEditDelivery, onSwitchTab, onNewFromSlot }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  const totalSlots = [...blanks, ...days];

  return (
    <div className="calendar-container">
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', padding: '0.5rem 0', color: 'var(--text-light)' }}>
            {day}
          </div>
        ))}

        {totalSlots.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="calendar-day" style={{ visibility: 'hidden', minHeight: '120px' }} />;
          const dayStr = getLocalDateString(day);
          const dayDeliveries = deliveries.filter(d => d.date === dayStr);
          const dayRepairs = (repairEvents || []).filter(r => r.returnDate === dayStr);
          const dayPickups = (pickupEvents || []).filter(p => p.date === dayStr);
          const allEvents = [
            ...dayDeliveries.map(d => ({ ...d, _type: 'delivery' })),
            ...dayRepairs.map(r => ({ ...r, _type: 'repair' })),
            ...dayPickups.map(p => ({ ...p, _type: 'pickup' })),
          ];
          const isToday = isSameDay(day, new Date());
          return (
            <div key={index} className={`calendar-day ${isToday ? 'is-today' : ''}`} style={{ minHeight: '130px' }}>
              <div className="day-header" style={{ padding: '0.25rem 0.5rem' }}>
                <span className="day-number" style={{ fontSize: '1rem' }}>{day.getDate()}</span>
              </div>
              <div
                className="deliveries-list"
                style={{ padding: '0.25rem', cursor: 'pointer', minHeight: '60px' }}
                onClick={() => onNewFromSlot && onNewFromSlot(day)}
                title="Click to add delivery"
              >
                {allEvents.map(ev => {
                  if (ev._type === 'repair') {
                    return (
                      <div key={'r-' + ev.id} className="delivery-card" onClick={e => { e.stopPropagation(); if (onSwitchTab) onSwitchTab('repairs'); }}
                           style={{ padding: '0.25rem 0.5rem', marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.7rem', background: '#fef2f2', borderLeft: '3px solid #c53030' }}>
                        <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#c53030' }}>
                           🔧 {ev.clientName}
                        </div>
                      </div>
                    );
                  }
                  if (ev._type === 'pickup') {
                    return (
                      <div key={'p-' + ev.id} className="delivery-card" onClick={e => { e.stopPropagation(); if (onSwitchTab) onSwitchTab('active'); }}
                           style={{ padding: '0.25rem 0.5rem', marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.7rem', background: '#eff6ff', borderLeft: '3px solid #2563eb' }}>
                        <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e3a8a' }}>
                           🏭 {ev.vendor_name}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={ev.id}
                      className={`delivery-card status-${(ev.status || 'scheduled').toLowerCase()}`}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (ev.flagged === 'repair') onSwitchTab && onSwitchTab('repairs');
                        else if (ev.flagged) onSwitchTab && onSwitchTab('returns');
                        else onEditDelivery(ev); 
                      }}
                      style={{ 
                        padding: '0.25rem 0.5rem', marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.7rem',
                        ...(ev.flagged === 'repair' || ['Repair on site', 'Schedule'].includes(ev.status) ? { background: '#fef2f2', borderLeft: '3px solid #c53030' } : {})
                      }}
                    >
                      <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.clientName}</span>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {ev.status === 'Delivered' && <span title="Delivered" style={{ fontSize: 10 }}>✅</span>}
                          {ev.status === 'In Progress' && <span title="In Progress" style={{ fontSize: 10 }}>🚛</span>}
                          {ev.flagged && <span title={ev.flagged} style={{ fontSize: 10 }}>{ev.flagged === 'repair' ? '🔧' : '🔄'}</span>}
                          {ev.orderSource === 'online' && <span title="Online Order" style={{ fontSize: 10 }}>🌐</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
