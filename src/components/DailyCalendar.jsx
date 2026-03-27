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

export default function DailyCalendar({ deliveries, currentDate, onEditDelivery, onNewFromSlot }) {
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const isMouseDownRef = useRef(false);

  const dayDeliveries = deliveries.filter(d => isSameDay(new Date(d.date), currentDate));

  const getSlotDeliveries = (slot) => {
    return dayDeliveries.filter(d => {
      const w = d.timeWindow || '';
      return w.startsWith(slot) || w.includes(slot);
    });
  };

  const isInDragRange = (slot) => {
    if (!dragStart || !dragEnd) return false;
    const si = TIME_SLOTS.indexOf(dragStart);
    const ei = TIME_SLOTS.indexOf(dragEnd);
    const ci = TIME_SLOTS.indexOf(slot);
    return ci >= Math.min(si, ei) && ci <= Math.max(si, ei);
  };

  const handleMouseDown = (slot) => {
    isMouseDownRef.current = true;
    setDragStart(slot);
    setDragEnd(slot);
    setIsDragging(true);
  };

  const handleMouseEnter = (slot) => {
    if (isMouseDownRef.current) setDragEnd(slot);
  };

  const handleMouseUp = (slot) => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    setIsDragging(false);
    const si = TIME_SLOTS.indexOf(dragStart);
    const ei = TIME_SLOTS.indexOf(slot);
    const low = Math.min(si, ei);
    const high = Math.max(si, ei);
    const startTime = TIME_SLOTS[low];
    const endTime = TIME_SLOTS[Math.min(high + 1, TIME_SLOTS.length - 1)];
    const timeWindow = `${startTime} - ${endTime}`;
    setDragStart(null);
    setDragEnd(null);
    if (onNewFromSlot) onNewFromSlot(currentDate, timeWindow);
  };

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
      {isDragging && (
        <div style={{ textAlign: 'center', padding: '0.35rem', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
          Drag to select a time block — release to create delivery
        </div>
      )}

      {dayDeliveries.length === 0 && !isDragging && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-light)', fontSize: '0.85rem' }}>
          Click and drag across time slots below to schedule a delivery
        </div>
      )}

      <div className="daily-grid" onMouseLeave={handleGridMouseLeave}>
        {TIME_SLOTS.map((slot) => {
          const slotDeliveries = getSlotDeliveries(slot);
          const highlighted = isInDragRange(slot);
          return (
            <div
              key={slot}
              className="daily-row"
              style={{ background: highlighted ? 'rgba(180,140,80,0.12)' : '', transition: 'background 0.1s', userSelect: 'none' }}
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
                    {!isDragging && <span style={{ opacity: 0.2, fontSize: '0.75rem', pointerEvents: 'none' }}>drag to select</span>}
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
                          <span className={`status-pill status-pill-${delivery.status.toLowerCase()}`} style={{ marginLeft: '0.5rem' }}>{delivery.status}</span>
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
          const unmatched = dayDeliveries.filter(d => !TIME_SLOTS.some(s => (d.timeWindow || '').startsWith(s) || (d.timeWindow || '').includes(s)));
          if (!unmatched.length) return null;
          return (
            <div className="daily-row">
              <div className="daily-time-label" style={{ color: 'var(--primary)' }}>All Day</div>
              <div className="daily-slot-content">
                {unmatched.map(delivery => (
                  <div key={delivery.id} className={`delivery-card status-${(delivery.status || 'scheduled').toLowerCase()}`} onClick={() => onEditDelivery(delivery)} style={{ cursor: 'pointer' }}>
                    <div className="delivery-time">{delivery.timeWindow}</div>
                    <div className="delivery-client" style={{ fontSize: '1rem', fontWeight: 600 }}>{delivery.clientName}</div>
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
