import React, { useState } from 'react';
import './WeeklyCalendar.css';
import './DailyCalendar.css';
import { getFilteredHours } from './CalendarFilters';

const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
};

export default function DailyCalendar({ deliveries, onEditDelivery, onNewFromSlot }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => setCurrentDate(new Date());

  const dayDeliveries = deliveries.filter(d => isSameDay(new Date(d.date), currentDate));

  const TIME_SLOTS = ['08:00 AM','09:00 AM','10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM','06:00 PM'];

  const getSlotDeliveries = (slot) => {
    return dayDeliveries.filter(d => {
      const window = d.timeWindow || '';
      return window.startsWith(slot) || window.includes(slot);
    });
  };

  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="week-navigation">
          <button className="btn-icon" onClick={handlePrevDay}>&larr;</button>
          <button className="btn-secondary btn-sm" onClick={handleToday}>Today</button>
          <button className="btn-icon" onClick={handleNextDay}>&rarr;</button>
        </div>
        <h2 className="week-title" style={{ fontSize: '1.4rem' }}>
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          {isToday && <span className="today-badge">Today</span>}
        </h2>
      </div>

      <div className="daily-grid">
        {dayDeliveries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-light)' }}>
            No deliveries scheduled for this day.
          </div>
        )}

        {TIME_SLOTS.map((slot) => {
          const slotDeliveries = getSlotDeliveries(slot);
          return (
            <div key={slot} className="daily-row">
              <div className="daily-time-label">{slot}</div>
              <div className="daily-slot-content">
                {slotDeliveries.length === 0 ? (
                  <div 
                    className="daily-empty-slot"
                    onClick={() => onNewFromSlot && onNewFromSlot(currentDate, slot + ' - ' + (TIME_SLOTS[TIME_SLOTS.indexOf(slot) + 1] || slot))}
                    style={{ cursor: 'pointer', borderRadius: '4px', transition: 'background 0.2s' }}
                    title={`Add delivery at ${slot}`}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <span style={{ opacity: 0.3, fontSize: '0.8rem' }}>+ add delivery</span>
                  </div>
                ) : (
                  slotDeliveries.map(delivery => (
                    <div
                      key={delivery.id}
                      className={`delivery-card status-${(delivery.status || 'scheduled').toLowerCase()}`}
                      onClick={() => onEditDelivery(delivery)}
                      style={{ marginBottom: '0.5rem', cursor: 'pointer' }}
                    >
                      <div className="delivery-time">{delivery.timeWindow}</div>
                      <div className="delivery-client" style={{ fontSize: '1rem', fontWeight: 600 }}>{delivery.clientName}</div>
                      <div className="delivery-source">{delivery.source} &bull; {delivery.address}</div>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        📞 {delivery.phone}
                        {delivery.status && (
                          <span className={`status-pill status-pill-${delivery.status.toLowerCase()}`} style={{ marginLeft: '0.5rem' }}>
                            {delivery.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {(() => {
          const unmatched = dayDeliveries.filter(d => {
            const w = d.timeWindow || '';
            return !TIME_SLOTS.some(slot => w.startsWith(slot) || w.includes(slot));
          });
          if (unmatched.length === 0) return null;
          return (
            <div className="daily-row">
              <div className="daily-time-label" style={{ color: 'var(--primary)' }}>All Day / Custom</div>
              <div className="daily-slot-content">
                {unmatched.map(delivery => (
                  <div
                    key={delivery.id}
                    className={`delivery-card status-${(delivery.status || 'scheduled').toLowerCase()}`}
                    onClick={() => onEditDelivery(delivery)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="delivery-time">{delivery.timeWindow}</div>
                    <div className="delivery-client" style={{ fontSize: '1rem', fontWeight: 600 }}>{delivery.clientName}</div>
                    <div className="delivery-source">{delivery.source} &bull; {delivery.address}</div>
                    <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      📞 {delivery.phone}
                      {delivery.status && (
                        <span className={`status-pill status-pill-${delivery.status.toLowerCase()}`} style={{ marginLeft: '0.5rem' }}>
                          {delivery.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
