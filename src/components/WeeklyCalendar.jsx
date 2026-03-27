import React from 'react';
import './WeeklyCalendar.css';

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

const isSameDay = (date1, date2) => {
  // date1 is a Date object, date2 is a Date object
  // Compare using their ISO string parts (YYYY-MM-DD)
  const d1 = date1.toLocaleDateString('en-CA');
  const d2 = date2.toLocaleDateString('en-CA');
  return d1 === d2;
};

export default function WeeklyCalendar({ deliveries, currentDate, onEditDelivery, onNewFromSlot }) {
  const weekStart = getStartOfWeek(currentDate);
  const days = getDaysOfWeek(weekStart);

  return (
    <div className="calendar-container">
      <div className="calendar-grid">
        {days.map((day, index) => {
          const dayStr = day.toLocaleDateString('en-CA');
          const dayDeliveries = deliveries.filter(d => d.date === dayStr);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={index} className={`calendar-day ${isToday ? 'is-today' : ''}`}>
              <div className="day-header">
                <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                <span className="day-number">{day.getDate()}</span>
              </div>
              <div
                className="deliveries-list"
                onClick={() => onNewFromSlot && onNewFromSlot(day)}
                style={{ cursor: 'pointer' }}
                title="Click to add delivery"
              >
                {dayDeliveries.length === 0 ? (
                  <div className="no-deliveries">+ tap to add</div>
                ) : (
                  dayDeliveries.map(delivery => (
                    <div
                      key={delivery.id}
                      className={`delivery-card status-${(delivery.status || 'scheduled').toLowerCase()}`}
                      onClick={(e) => { e.stopPropagation(); onEditDelivery(delivery); }}
                      title="Click to edit delivery"
                    >
                      <div className="delivery-time">{delivery.timeWindow}</div>
                      <div className="delivery-client">{delivery.clientName}</div>
                      <div className="delivery-source">
                        {delivery.source}
                        {delivery.scheduledBy && <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: '0.4rem' }}>• by {delivery.scheduledBy}</span>}
                      </div>
                      {delivery.notes && (
                        <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>
                          📝 has notes
                        </div>
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
