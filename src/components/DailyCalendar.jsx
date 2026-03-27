import React, { useState, useRef } from 'react';
import './WeeklyCalendar.css';
import './DailyCalendar.css';

const TIME_SLOTS = [
  '08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM',
  '04:00 PM','05:00 PM','06:00 PM'
];

const SLOT_HEIGHT = 80;

const getTimeWindowIndices = (timeWindow) => {
  if (!timeWindow) return null;
  const match = timeWindow.match(/(\d{2}:\d{2} [AP]M) - (\d{2}:\d{2} [AP]M)/);
  if (!match) {
    if (timeWindow === 'Full Day (08:00 AM - 06:00 PM)') return { start: 0, end: 10 };
    return null;
  }
  const startStr = match[1];
  const endStr = match[2];
  const startIdx = TIME_SLOTS.indexOf(startStr);
  let endIdx = TIME_SLOTS.indexOf(endStr);
  if (startIdx === -1) return null;
  if (endIdx === -1) endIdx = TIME_SLOTS.length - 1; 
  return { start: startIdx, end: endIdx };
};

export default function DailyCalendar({ deliveries, currentDate, onEditDelivery, onNewFromSlot }) {
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const isMouseDownRef = useRef(false);

  const dayStr = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + String(currentDate.getDate()).padStart(2, '0');
  const dayDeliveries = deliveries.filter(d => d.date === dayStr);

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

  const isInDragRange = (slot) => {
    if (!dragStart || !dragEnd) return false;
    const si = TIME_SLOTS.indexOf(dragStart);
    const ei = TIME_SLOTS.indexOf(dragEnd);
    const ci = TIME_SLOTS.indexOf(slot);
    return ci >= Math.min(si, ei) && ci <= Math.max(si, ei);
  };

  return (
    <div className="calendar-container">
      {isDragging && (
        <div className="drag-notification">
          Drag to select a time block — release to create delivery
        </div>
      )}

      <div className="daily-calendar-wrapper">
        <div className="daily-time-column">
          {TIME_SLOTS.map(slot => (
            <div key={slot} className="daily-time-label-slot">{slot}</div>
          ))}
        </div>

        <div className="daily-grid-content">
          {TIME_SLOTS.map(slot => (
            <div 
              key={slot} 
              className={`daily-grid-slot ${isInDragRange(slot) ? 'highlighted' : ''}`}
              onMouseDown={() => handleMouseDown(slot)}
              onMouseEnter={() => handleMouseEnter(slot)}
              onMouseUp={() => handleMouseUp(slot)}
            >
              {!isDragging && <div className="slot-hint">drag to select</div>}
            </div>
          ))}

          {dayDeliveries.map(delivery => {
            const indices = getTimeWindowIndices(delivery.timeWindow);
            if (!indices) return null;
            
            const top = indices.start * SLOT_HEIGHT;
            const height = (indices.end - indices.start) * SLOT_HEIGHT;
            
            return (
              <div 
                key={delivery.id} 
                className={`delivery-block status-${(delivery.status || 'scheduled').toLowerCase()}`}
                style={{ 
                  top: `${top}px`,
                  height: `${height}px`,
                  zIndex: 5
                }}
                onClick={() => onEditDelivery(delivery)}
              >
                <div className="delivery-block-content">
                  <div className="delivery-block-time">{delivery.timeWindow}</div>
                  <div className="delivery-block-client">{delivery.clientName}</div>
                  <div className="delivery-block-meta">
                    {delivery.source} • {delivery.address}
                  </div>
                  <div className="delivery-block-bottom">
                    📞 {delivery.phone}
                    {delivery.scheduledBy && <span className="scheduled-by-tag">by {delivery.scheduledBy}</span>}
                    {delivery.notes && <span className="notes-tag">📝 notes</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
