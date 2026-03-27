import React, { useState } from 'react';
import './WeeklyCalendar.css'; // We can reuse much of the grid styling

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export default function MonthlyCalendar({ deliveries, onEditDelivery, onNewFromSlot }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month); // 0 corresponds to Sunday, 1 to Monday, etc.

  // Adjust for Monday as the first day of the week if desired, but standard JS is Sunday = 0
  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  
  const totalSlots = [...blanks, ...days];

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="week-navigation">
          <button className="btn-icon" onClick={handlePrevMonth}>&larr;</button>
          <button className="btn-secondary btn-sm" onClick={handleToday}>Current Month</button>
          <button className="btn-icon" onClick={handleNextMonth}>&rarr;</button>
        </div>
        <h2 className="week-title">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', padding: '0.5rem 0', color: 'var(--text-light)' }}>
            {day}
          </div>
        ))}

        {totalSlots.map((day, index) => {
          if (!day) {
            return <div key={`blank-${index}`} className="calendar-day" style={{ visibility: 'hidden', minHeight: '120px' }}></div>;
          }

          const dayDeliveries = deliveries.filter(d => isSameDay(new Date(d.date), day));
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
                    className={`delivery-card status-${delivery.status.toLowerCase()}`}
                    onClick={() => onEditDelivery(delivery)}
                    style={{ padding: '0.25rem 0.5rem', marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{delivery.clientName}</div>
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
