import { useState, useEffect } from 'react';
import WeeklyCalendar from './components/WeeklyCalendar';
import MonthlyCalendar from './components/MonthlyCalendar';
import DailyCalendar from './components/DailyCalendar';
import DeliveryFormModal from './components/DeliveryFormModal';
import CalendarFilters, { DEFAULT_FILTERS, buildTimeWindows } from './components/CalendarFilters';
import './App.css';

function App() {
  const [deliveries, setDeliveries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [viewMode, setViewMode] = useState('weekly');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('furniture_deliveries');
    if (saved) {
      try { setDeliveries(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
    const savedFilters = localStorage.getItem('schedule_filters');
    if (savedFilters) {
      try { setFilters(JSON.parse(savedFilters)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('furniture_deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem('schedule_filters', JSON.stringify(filters));
  }, [filters]);

  const handleOpenNewModal = () => { setEditingDelivery(null); setIsModalOpen(true); };
  const handleEditDelivery = (delivery) => { setEditingDelivery(delivery); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingDelivery(null); };
  const handleDeleteDelivery = (id) => { setDeliveries(prev => prev.filter(d => d.id !== id)); handleCloseModal(); };
  const handleSaveDelivery = (deliveryData) => {
    if (editingDelivery) {
      setDeliveries(prev => prev.map(d => d.id === deliveryData.id ? deliveryData : d));
    } else {
      setDeliveries(prev => [...prev, deliveryData]);
    }
    handleCloseModal();
  };

  const timeWindows = buildTimeWindows(filters);

  return (
    <>
      <div className="container fade-in">
        <header className="app-header">
          <h1 className="app-title">
            <span>◇</span> Caravana Schedule Hub
          </h1>
          <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              className="btn-secondary"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              style={{ padding: '0.65rem 1rem' }}
            >
              <option value="daily">Daily View</option>
              <option value="weekly">Weekly View</option>
              <option value="monthly">Monthly View</option>
            </select>
            <button className="btn-primary" onClick={handleOpenNewModal}>
              + New Delivery
            </button>
          </div>
        </header>

        <CalendarFilters filters={filters} onChange={setFilters} />

        <main>
          {viewMode === 'daily' && (
            <DailyCalendar
              deliveries={deliveries}
              onEditDelivery={handleEditDelivery}
              filters={filters}
            />
          )}
          {viewMode === 'weekly' && (
            <WeeklyCalendar
              deliveries={deliveries}
              onEditDelivery={handleEditDelivery}
              filters={filters}
            />
          )}
          {viewMode === 'monthly' && (
            <MonthlyCalendar
              deliveries={deliveries}
              onEditDelivery={handleEditDelivery}
              filters={filters}
            />
          )}
        </main>
      </div>

      <DeliveryFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDelivery}
        onDelete={handleDeleteDelivery}
        delivery={editingDelivery}
        timeWindows={timeWindows}
      />
    </>
  );
}

export default App;
