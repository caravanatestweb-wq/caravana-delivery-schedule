import React, { useState, useRef } from 'react';
import { getStatusColor } from '../lib/constants';
import './WeeklyCalendar.css';
import './DailyCalendar.css';

const TIME_SLOTS = [
  '08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM',
  '04:00 PM','05:00 PM','06:00 PM','07:00 PM','08:00 PM'
];

const SLOT_HEIGHT = 80;

const getTimeWindowIndices = (timeWindow) => {
  if (!timeWindow) return null;
  const match = timeWindow.match(/(\d{2}:\d{2} [AP]M) - (\d{2}:\d{2} [AP]M)/);
  if (!match) {
    if (timeWindow === 'Full Day (08:00 AM - 08:00 PM)') return { start: 0, end: 12 };
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

export default function DailyCalendar({ deliveries, repairEvents = [], pickupEvents = [], currentDate, onEditDelivery, onSwitchTab, onNewFromSlot, onPrev, onNext }) {
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const isMouseDownRef = useRef(false);
  const touchStartX = useRef(null);

  const dayStr = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + String(currentDate.getDate()).padStart(2, '0');
  const dayDeliveries = deliveries.filter(d => d.date === dayStr);
  const dayRepairs = repairEvents.filter(r => r.returnDate === dayStr);
  const dayPickups = pickupEvents.filter(p => p.date === dayStr);
  
  const allEvents = [
    ...dayDeliveries.map(d => ({ ...d, _type: 'delivery' })),
    ...dayRepairs.map(r => ({ ...r, _type: 'repair' })),
    ...dayPickups.map(p => ({ ...p, _type: 'pickup' })),
  ];

  // Touch swipe for day navigation
  const handleTouchStart = e => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = e => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && onNext) onNext();
      else if (diff < 0 && onPrev) onPrev();
    }
    touchStartX.current = null;
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

  const isInDragRange = (slot) => {
    if (!dragStart || !dragEnd) return false;
    const si = TIME_SLOTS.indexOf(dragStart);
    const ei = TIME_SLOTS.indexOf(dragEnd);
    const ci = TIME_SLOTS.indexOf(slot);
    return ci >= Math.min(si, ei) && ci <= Math.max(si, ei);
  };

  return (
    <div className="calendar-container" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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

          {allEvents.map(ev => {
            const timeStr = ev._type === 'repair' ? ev.returnTimeWindow : ev.timeWindow;
            const indices = getTimeWindowIndices(timeStr);
            if (!indices) return null;
            
            if (ev._type === 'repair') {
               return (
                 <div key={`r-${ev.id}`} className="delivery-block" onClick={() => onSwitchTab && onSwitchTab('repairs')}
                      style={{ top: `${indices.start * SLOT_HEIGHT}px`, height: `${(indices.end - indices.start) * SLOT_HEIGHT}px`, zIndex: 5, background: '#fef2f2', borderLeft: '4px solid #c53030' }}>
                   <div className="delivery-block-content">
                     <div className="delivery-block-time" style={{ color: '#c53030' }}>🔧 {timeStr}</div>
                     <div className="delivery-block-client" style={{ color: '#c53030' }}>{ev.clientName}</div>
                   </div>
                 </div>
               );
            }
            if (ev._type === 'pickup') {
               return (
                 <div key={`p-${ev.id}`} className="delivery-block" onClick={() => onSwitchTab && onSwitchTab('active')}
                      style={{ top: `${indices.start * SLOT_HEIGHT}px`, height: `${(indices.end - indices.start) * SLOT_HEIGHT}px`, zIndex: 5, background: '#eff6ff', borderLeft: '4px solid #2563eb' }}>
                   <div className="delivery-block-content">
                     <div className="delivery-block-time" style={{ color: '#1e3a8a' }}>🏭 {timeStr}</div>
                     <div className="delivery-block-client" style={{ color: '#1e3a8a' }}>{ev.vendor_name}</div>
                   </div>
                 </div>
               );
            }

            const chips = getItemChips(ev);
            return (
              <div
                key={ev.id}
                className={`delivery-block status-${(ev.status || 'scheduled').toLowerCase()}`}
                style={{ 
                  top: `${indices.start * SLOT_HEIGHT}px`, height: `${(indices.end - indices.start) * SLOT_HEIGHT}px`, zIndex: 5,
                  ...(ev.flagged === 'repair' || ['Repair on site', 'Schedule'].includes(ev.status) ? { background: '#fef2f2', borderLeft: '4px solid #c53030' } : {})
                }}
                onClick={() => onEditDelivery(ev)}
              >
                <div className="delivery-block-content">
                  <div className="delivery-block-time">{ev.timeWindow}</div>
                  <div className="delivery-block-client">{ev.clientName}</div>

                  {/* Status & Flag Badges */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    <span style={{ 
                      fontSize: 10, fontWeight: 700, padding: '1px 4px', 
                      borderRadius: 4, background: getStatusColor(ev.status) + '20', 
                      color: getStatusColor(ev.status), border: `1px solid ${getStatusColor(ev.status)}40`,
                      textTransform: 'uppercase'
                    }}>
                      {ev.status}
                    </span>
                    {ev.flagged && (
                      <span style={{ 
                        fontSize: 10, fontWeight: 700, padding: '1px 4px', 
                        borderRadius: 4, 
                        background: ev.flagged === 'repair' ? '#fef2f2' : '#f5f3ff', 
                        color: ev.flagged === 'repair' ? '#c53030' : '#7c3aed', 
                        border: `1px solid ${ev.flagged === 'repair' ? '#fca5a5' : '#c4b5fd'}`,
                        textTransform: 'uppercase'
                      }}>
                        {ev.flagged === 'repair' ? '🔧 ' : '🔄 '}{ev.flagged}
                      </span>
                    )}
                    {ev.orderSource === 'online' && (
                      <span style={{ 
                        fontSize: 10, fontWeight: 700, padding: '1px 4px', 
                        borderRadius: 4, background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe',
                        textTransform: 'uppercase'
                      }}>
                        🌐 ONLINE
                      </span>
                    )}
                  </div>
                  {chips.length > 0 && (
                    <div className="item-chips" style={{ marginTop: 4 }}>
                      {chips.slice(0, 4).map((it, i) => (
                        <span key={i} className="item-chip" title={it.description}>
                          {getCategoryIcon(it.description)} {it.description.split(' - ')[0].substring(0, 20)}
                          {it.qty && it.qty !== '1' ? ` ×${it.qty}` : ''}
                        </span>
                      ))}
                      {chips.length > 4 && <span className="item-chip">+{chips.length - 4}</span>}
                    </div>
                  )}
                  <div className="delivery-block-meta">
                    {ev.source}{ev.deliveryTeam ? ` • 👥 ${ev.deliveryTeam}` : ''} • {ev.address?.split(',')[0]}
                  </div>
                  <div className="delivery-block-bottom">
                    📞 {ev.phone}
                    {ev.orderSource === 'online' && <span className="online-badge" style={{ marginLeft: 6 }}>WEB</span>}
                    {ev.notes && <span className="notes-tag">📝 notes</span>}
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
