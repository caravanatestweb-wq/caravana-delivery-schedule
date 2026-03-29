import { localDate } from '../lib/constants';

const STAT_CARDS = [
  { key: 'active',   label: 'ACTIVE',      color: '#0b7a4a', bg: '#eef7f0', border: '#a7f0d4' },
  { key: 'today',    label: 'TODAY',       color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'followups',label: 'FOLLOW-UPS',  color: '#c89b0a', bg: '#fef9ee', border: '#fde68a' },
  { key: 'returns',  label: 'RETURNS',     color: '#c53030', bg: '#fef2f2', border: '#fca5a5' },
  { key: 'repairs',  label: 'REPAIRS',     color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
];

export default function StatsBar({ deliveries, repairs = [], followupCount, returnsCount, activeTab, onTabClick }) {
  const today = localDate();

  const stats = {
    active:    deliveries.filter(d => !['Delivered','Archived','Completed'].includes(d.status)).length,
    today:     deliveries.filter(d => d.date === today && d.status !== 'Archived').length,
    followups: followupCount,
    returns:   returnsCount,
    repairs:   repairs.filter(r => r.status !== 'Returned').length,
  };

  return (
    <div className="stats-bar">
        {STAT_CARDS.map(({ key, label, color, bg, border }) => {
          const isActive = (key === 'active' || key === 'today') ? activeTab === 'calendar' : activeTab === key;
          return (
            <button
              key={key}
              className={`stat-card ${isActive ? 'active' : ''}`}
              onClick={() => onTabClick && onTabClick(key)}
              style={{ 
                '--stat-color': color, 
                '--stat-bg': bg, 
                '--stat-border': border,
                borderColor: isActive ? color : border,
                boxShadow: isActive ? `0 4px 12px ${color}20` : 'none',
                transform: isActive ? 'translateY(-2px)' : 'none',
              }}
            >
              <span className="stat-number">{stats[key]}</span>
              <span className="stat-label">{label}</span>
            </button>
          );
        })}
    </div>
  );
}
