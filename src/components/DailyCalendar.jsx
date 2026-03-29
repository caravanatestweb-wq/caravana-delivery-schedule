import React, { useState, useRef } from 'react';
import { getStatusColor } from '../lib/constants';
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

export default function DailyCalendar({ deliveries, repairEvents = [], currentDate, onEditDelivery, onNewFromSlot, onPrev, onNext }) {
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const isMouseDownRef = useRef(false);
  const touchStartX = useRef(null);

  const dayStr = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + String(currentDate.getDate()).padStart(2, '0');
  const dayDeliveries = deliveries.filter(d => d.date === dayStr);

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

          {dayDeliveries.map(delivery => {
            const indices = getTimeWindowIndices(delivery.timeWindow);
            if (!indices) return null;
            const chips = getItemChips(delivery);
            return (
              <div
                key={delivery.id}
                className={`delivery-block status-${(delivery.status || 'scheduled').toLowerCase()}`}
                style={{ top: `${indices.start * SLOT_HEIGHT}px`, height: `${(indices.end - indices.start) * SLOT_HEIGHT}px`, zIndex: 5 }}
                onClick={() => onEditDelivery(delivery)}
              >
                <div className="delivery-block-content">
                  <div className="delivery-block-time">{delivery.timeWindow}</div>
                  <div className="delivery-block-client">{delivery.clientName}</div>

                  {/* Status & Flag Badges */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    <span style={{ 
                      fontSize: 10, fontWeight: 700, padding: '1px 4px', 
                      borderRadius: 4, background: getStatusColor(delivery.status) + '20', 
                      color: getStatusColor(delivery.status), border: `1px solid ${getStatusColor(delivery.status)}40`,
                      textTransform: 'uppercase'
                    }}>
                      {delivery.status}
                    </span>
                    {delivery.flagged && (
                      <span style={{ 
                        fontSize: 10, fontWeight: 700, padding: '1px 4px', 
                        borderRadius: 4, background: '#fee2e2', color: '#c53030', border: '1px solid #fecaca',
                        textTransform: 'uppercase'
                      }}>
                        🔄 {delivery.flagged}
                      </span>
                    )}
                    {delivery.orderSource === 'online' && (
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
                    {delivery.source}{delivery.deliveryTeam ? ` • 👥 ${delivery.deliveryTeam}` : ''} • {delivery.address?.split(',')[0]}
                  </div>
                  <div className="delivery-block-bottom">
                    📞 {delivery.phone}
                    {delivery.orderSource === 'online' && <span className="online-badge" style={{ marginLeft: 6 }}>WEB</span>}
                    {delivery.notes && <span className="notes-tag">📝 notes</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Repair return events as purple blocks */}
          {(repairEvents || []).filter(r => r.returnDate === dayStr && r.returnTimeWindow).map(repair => {
            const indices = getTimeWindowIndices(repair.returnTimeWindow);
            if (!indices) return null;
            return (
              <div key={'r-' + repair.id}
                className="delivery-block"
                onClick={() => onSwitchTab && onSwitchTab('repairs')}
                style={{ top: `${indices.start * SLOT_HEIGHT}px`, height: `${Math.max((indices.end - indices.start) * SLOT_HEIGHT, 60)}px`, zIndex: 5, background: '#f5f3ff', borderLeft: '4px solid #7c3aed', cursor: 'pointer' }}
              >
                <div className="delivery-block-content">
                  <div className="delivery-block-time" style={{ color: '#7c3aed' }}>🔧 {repair.returnTimeWindow}</div>
                  <div className="delivery-block-client">{repair.clientName}</div>
                  <div className="delivery-block-meta">Repair Return {repair.status === 'Ready for Return' ? '✅' : ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
