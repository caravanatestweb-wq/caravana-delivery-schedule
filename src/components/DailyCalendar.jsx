import React, { useState, useRef } from 'react';
import './WeeklyCalendar.css';
import './DailyCalendar.css';

const TIME_SLOTS = [
  '08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM',
  '04:00 PM','05:00 PM','06:00 PM'
];

// Helper to calculate grid-row indices based on timeWindow
const getTimeWindowRange = (timeWindow) => {
  if (!timeWindow) return null;
  const match = timeWindow.match(/(\d{2}:\d{2} [AP]M) - (\d{2}:\d{2} [AP]M)/);
  if (!match) return null;
  const startStr = match[1];
  const endStr = match[2];
  
  const startIdx = TIME_SLOTS.indexOf(startStr);
  let endIdx = TIME_SLOTS.indexOf(endStr);
  
  // If end time is not exactly in our 1-hour slot markers, we try to find its position
  // for simplicity in this grid, if it's "12:00 PM", it marks the *start* of that slot hour.
  // So a 10:00 AM - 12:00 PM spans 10:00 and 11:00 slots. It stops BEFORE the 12:00 label.
  
  if (startIdx === -1) return null;
  // If endIdx is -1 (e.g. 06:30 PM) or after 06:00 PM, we use the end of the grid (13)
  if (endIdx === -1) endIdx = TIME_SLOTS.length; 
  
  return { start: startIdx + 1, end: endIdx + 1 };
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

  const handleGridMouseLeave = () => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
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
        <div style={{ textAlign: 'center', padding: '0.35rem', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
          Drag to select a time block — release to create delivery
        </div>
      )}

      <div className="daily-calendar-wrapper" style={{ position: 'relative' }}>
        {/* Time Labels Column */}
        <div className="daily-time-column">
          {TIME_SLOTS.map(slot => (
            <div key={slot} className="daily-time-label-slot">{slot}</div>
          ))}
        </div>

        {/* The Grid / Content Area */}
        <div 
          className="daily-grid-content" 
          onMouseLeave={handleGridMouseLeave}
          style={{ 
            display: 'grid', 
            gridTemplateRows: `repeat(${TIME_SLOTS.length}, 80px)`,
            position: 'relative' 
          }}
        >
          {/* Background Drop Zones (for drag-to-select) */}
          {TIME_SLOTS.map((slot, idx) => {
             const highlighted = isInDragRange(slot);
             return (
               <div 
                 key={slot} 
                 className={`daily-grid-slot ${highlighted ? 'highlighted' : ''}`}
                 onMouseDown={() => handleMouseDown(slot)}
                 onMouseEnter={() => handleMouseEnter(slot)}
                 onMouseUp={() => handleMouseUp(slot)}
               >
                 {!isDragging && <div className="slot-hint">drag to select</div>}
               </div>
             );
          })}

          {/* Actual Deliveries (positioned blocks) */}
          {dayDeliveries.map(delivery => {
            const range = getTimeWindowRange(delivery.timeWindow);
            if (!range) return null;
            
            // To prevent overlap issues in this simple view, we can use grid-column if multiple exist,
            // but for now let's just render them as blocks.
            return (
              <div 
                key={delivery.id} 
                className={`delivery-block status-${(delivery.status || 'scheduled').toLowerCase()}`}
                style={{ 
                  gridRowStart: range.start,
                  gridRowEnd: range.end,
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
