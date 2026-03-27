import React, { useState } from 'react';
import './WeeklyCalendar.css';
import { getFilteredDayIndices } from './CalendarFilters';

// Helper functions for dates
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
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

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export default function WeeklyCalendar({ deliveries, onEditDelivery, filters }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const handleToday = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  const allDays = getDaysOfWeek(currentWeekStart);
  const allowedDayIndices = filters ? getFilteredDayIndices(filters) : [0,1,2,3,4,5,6];
  const days = allDays.filter(d => allowedDayIndices.includes(d.getDay()));

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="week-navigation">
          <button className="btn-icon" onClick={handlePrevWeek}>&larr;</button>
          <button className="btn-secondary btn-sm" onClick={handleToday}>Current Week</button>
          <button className="btn-icon" onClick={handleNextWeek}>&rarr;</button>
        </div>
        <h2 className="week-title">
          {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </h2>
      </div>

      <div className="calendar-grid">
        {days.map((day, index) => {
          // Filter deliveries for this specific day
          const dayDeliveries = deliveries.filter(d => {
            const deliveryDate = new Date(d.date);
            return isSameDay(deliveryDate, day);
          });

          const isToday = isSameDay(day, new Date());

          return (
            <div key={index} className={`calendar-day ${isToday ? 'is-today' : ''}`}>
              <div className="day-header">
                <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                <span className="day-number">{day.getDate()}</span>
              </div>
              
              <div className="deliveries-list">
                {dayDeliveries.length === 0 ? (
                  <div className="no-deliveries">No deliveries</div>
                ) : (
                  dayDeliveries.map(delivery => (
                    <div 
                      key={delivery.id} 
                      className={`delivery-card status-${delivery.status.toLowerCase()}`}
                      onClick={() => onEditDelivery(delivery)}
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
