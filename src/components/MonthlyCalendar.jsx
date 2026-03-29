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

export default function MonthlyCalendar({ deliveries, currentDate, onEditDelivery, onNewFromSlot }) {
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
                {dayDeliveries.map(delivery => (
                  <div
                    key={delivery.id}
                    className={`delivery-card status-${(delivery.status || 'scheduled').toLowerCase()}`}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (delivery.flagged) onSwitchTab && onSwitchTab('returns');
                      else onEditDelivery(delivery); 
                    }}
                    style={{ padding: '0.25rem 0.5rem', marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.7rem' }}
                  >
                    <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{delivery.clientName}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {delivery.status === 'Delivered' && <span title="Delivered" style={{ fontSize: 10 }}>✅</span>}
                        {delivery.status === 'In Progress' && <span title="In Progress" style={{ fontSize: 10 }}>🚛</span>}
                        {delivery.flagged && <span title={delivery.flagged} style={{ fontSize: 10 }}>🔄</span>}
                        {delivery.orderSource === 'online' && <span title="Online Order" style={{ fontSize: 10 }}>🌐</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
