import React, { useState } from 'react';
import './WeeklyCalendar.css';

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
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
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const formatWeekLabel = (start) => {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
};

// Build a dropdown list of weeks: 8 weeks back, current, 12 weeks ahead
const buildWeekOptions = (currentWeekStart) => {
  const options = [];
  for (let i = -8; i <= 12; i++) {
    const s = new Date(currentWeekStart);
    s.setDate(currentWeekStart.getDate() + i * 7);
    const weekStart = getStartOfWeek(s);
    options.push(weekStart);
  }
  // dedupe
  const seen = new Set();
  return options.filter(w => {
    const k = w.toISOString();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export default function WeeklyCalendar({ deliveries, onEditDelivery, onNewFromSlot }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));

  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(getStartOfWeek(d));
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(getStartOfWeek(d));
  };

  const days = getDaysOfWeek(currentWeekStart);
  const weekOptions = buildWeekOptions(currentWeekStart);
  const currentKey = currentWeekStart.toISOString();

  const handleWeekSelect = (e) => {
    setCurrentWeekStart(new Date(e.target.value));
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn-icon" onClick={handlePrevWeek}>&larr;</button>
          <button className="btn-icon" onClick={handleNextWeek}>&rarr;</button>
        </div>
        <select
          className="btn-secondary"
          value={currentKey}
          onChange={handleWeekSelect}
          style={{ padding: '0.5rem 1rem', fontWeight: 600, fontSize: '1rem' }}
        >
          {weekOptions.map(w => (
            <option key={w.toISOString()} value={w.toISOString()}>
              {formatWeekLabel(w)}
            </option>
          ))}
        </select>
      </div>

      <div className="calendar-grid">
        {days.map((day, index) => {
          const dayDeliveries = deliveries.filter(d => isSameDay(new Date(d.date), day));
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
                    >
                      <div className="delivery-time">{delivery.timeWindow}</div>
                      <div className="delivery-client">{delivery.clientName}</div>
                      <div className="delivery-source">{delivery.source}</div>
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
