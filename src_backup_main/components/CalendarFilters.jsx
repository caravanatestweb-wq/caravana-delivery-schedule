import React from 'react';
import './CalendarFilters.css';

const ALL_HOURS = [
  '06:00 AM','07:00 AM','08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM',
  '06:00 PM','07:00 PM','08:00 PM'
];

const ALL_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export const DEFAULT_FILTERS = {
  startHour: '08:00 AM',
  endHour: '06:00 PM',
  activeDays: ['Mon','Tue','Wed','Thu','Fri','Sat'] // exclude Sunday by default
};

export function getFilteredHours(filters) {
  const start = ALL_HOURS.indexOf(filters.startHour);
  const end = ALL_HOURS.indexOf(filters.endHour);
  return ALL_HOURS.slice(start, end + 1);
}

export function getFilteredDayIndices(filters) {
  return ALL_DAYS.map((d, i) => ({ day: d, index: i }))
    .filter(({ day }) => filters.activeDays.includes(day))
    .map(({ index }) => index);
}

export function buildTimeWindows(filters) {
  const hours = getFilteredHours(filters);
  const windows = [];
  for (let i = 0; i < hours.length - 1; i++) {
    windows.push(`${hours[i]} - ${hours[i + 1]}`);
  }
  if (hours.length > 1) {
    windows.push(`Full Day (${hours[0]} - ${hours[hours.length - 1]})`);
  }
  windows.push('Custom');
  return windows;
}

export default function CalendarFilters({ filters, onChange }) {
  const handleStartHour = (e) => {
    const newStart = e.target.value;
    const startIdx = ALL_HOURS.indexOf(newStart);
    const endIdx = ALL_HOURS.indexOf(filters.endHour);
    onChange({
      ...filters,
      startHour: newStart,
      endHour: endIdx > startIdx ? filters.endHour : ALL_HOURS[Math.min(startIdx + 2, ALL_HOURS.length - 1)]
    });
  };

  const handleEndHour = (e) => onChange({ ...filters, endHour: e.target.value });

  const toggleDay = (day) => {
    const active = filters.activeDays.includes(day)
      ? filters.activeDays.filter(d => d !== day)
      : [...filters.activeDays, day];
    onChange({ ...filters, activeDays: active });
  };

  return (
    <div className="calendar-filters">
      <div className="filter-group">
        <span className="filter-label">Hours</span>
        <select className="filter-select" value={filters.startHour} onChange={handleStartHour}>
          {ALL_HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="filter-sep">→</span>
        <select className="filter-select" value={filters.endHour} onChange={handleEndHour}>
          {ALL_HOURS.filter(h => ALL_HOURS.indexOf(h) > ALL_HOURS.indexOf(filters.startHour))
            .map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <span className="filter-label">Days</span>
        <div className="filter-days">
          {ALL_DAYS.map(day => (
            <button
              key={day}
              type="button"
              className={`day-toggle ${filters.activeDays.includes(day) ? 'active' : ''}`}
              onClick={() => toggleDay(day)}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
