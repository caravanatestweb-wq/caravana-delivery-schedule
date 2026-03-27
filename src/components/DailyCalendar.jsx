import React, { useState, useRef } from 'react';
import './WeeklyCalendar.css';
import './DailyCalendar.css';

const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
};

const TIME_SLOTS = [
  '08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM',
  '04:00 PM','05:00 PM','06:00 PM'
];

export default function DailyCalendar({ deliveries, onEditDelivery, onNewFromSlot }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const isMouseDownRef = useRef(false);

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

  const getSlotDeliveries = (slot) => {
    return dayDeliveries.filter(d => {
      const window = d.timeWindow || '';
      return window.startsWith(slot) || window.includes(slot);
    });
  };

  const isToday = isSameDay(currentDate, new Date());

  // Determine if a slot is in the selected drag range
  const isInDragRange = (slot) => {
    if (!dragStart || !dragEnd) return false;
    const si = TIME_SLOTS.indexOf(dragStart);
    const ei = TIME_SLOTS.indexOf(dragEnd);
    const ci = TIME_SLOTS.indexOf(slot);
    const low = Math.min(si, ei);
    const high = Math.max(si, ei);
    return ci >= low && ci <= high;
  };

  const handleMouseDown = (slot) => {
    isMouseDownRef.current = true;
    setDragStart(slot);
    setDragEnd(slot);
    setIsDragging(true);
  };

  const handleMouseEnter = (slot) => {
    if (isMouseDownRef.current) {
      setDragEnd(slot);
    }
  };

  const handleMouseUp = (slot) => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    setIsDragging(false);

    const finalEnd = slot;
    const si = TIME_SLOTS.indexOf(dragStart);
    const ei = TIME_SLOTS.indexOf(finalEnd);
    const low = Math.min(si, ei);
    const high = Math.max(si, ei);

    const startTime = TIME_SLOTS[low];
    // End time is one slot AFTER the last selected (e.g., select 9AM-10AM = "09:00 AM - 11:00 AM")
    const endTime = TIME_SLOTS[high + 1] || TIME_SLOTS[high];
    const timeWindow = startTime === endTime ? `${startTime} - ${TIME_SLOTS[Math.min(high + 1, TIME_SLOTS.length - 1)]}` : `${startTime} - ${endTime}`;

    setDragStart(null);
    setDragEnd(null);

    if (onNewFromSlot) onNewFromSlot(currentDate, timeWindow);
  };

  // Cancel drag if mouse leaves the grid entirely
  const handleGridMouseLeave = () => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  };

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

      {isDragging && (
        <div style={{ textAlign: 'center', padding: '0.35rem', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
          Drag to select a time block — release to create delivery
        </div>
      )}

      <div className="daily-grid" onMouseLeave={handleGridMouseLeave}>
        {dayDeliveries.length === 0 && !isDragging && (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-light)', fontSize: '0.85rem' }}>
            Click and drag across time slots below to schedule a delivery
          </div>
        )}

        {TIME_SLOTS.map((slot) => {
          const slotDeliveries = getSlotDeliveries(slot);
          const highlighted = isInDragRange(slot);
          return (
            <div
              key={slot}
              className="daily-row"
              style={{
                background: highlighted ? 'var(--primary-light, rgba(var(--primary-rgb, 180,140,80),0.15))' : '',
                transition: 'background 0.1s',
                userSelect: 'none'
              }}
              onMouseDown={() => handleMouseDown(slot)}
              onMouseEnter={() => handleMouseEnter(slot)}
              onMouseUp={() => handleMouseUp(slot)}
            >
              <div className="daily-time-label" style={{ color: highlighted ? 'var(--primary)' : '' }}>
                {slot}
              </div>
              <div className="daily-slot-content">
                {slotDeliveries.length === 0 ? (
                  <div className="daily-empty-slot" style={{ cursor: 'ns-resize' }}>
                    {!isDragging && (
                      <span style={{ opacity: 0.25, fontSize: '0.75rem', pointerEvents: 'none' }}>drag to select</span>
                    )}
                  </div>
                ) : (
                  slotDeliveries.map(delivery => (
                    <div
                      key={delivery.id}
                      className={`delivery-card status-${(delivery.status || 'scheduled').toLowerCase()}`}
                      onMouseDown={(e) => e.stopPropagation()}
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

        {/* All Day / Custom unmatched deliveries */}
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
