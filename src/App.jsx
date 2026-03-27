import { useState, useEffect } from 'react';
import WeeklyCalendar from './components/WeeklyCalendar';
import MonthlyCalendar from './components/MonthlyCalendar';
import DailyCalendar from './components/DailyCalendar';
import DeliveryFormModal from './components/DeliveryFormModal';
import './App.css';

function App() {
  const [deliveries, setDeliveries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [viewMode, setViewMode] = useState('weekly');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('furniture_deliveries');
    if (saved) {
      try { setDeliveries(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('furniture_deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  // Open blank new delivery form
  const handleOpenNewModal = () => { setEditingDelivery(null); setIsModalOpen(true); };

  // Open form pre-filled with a specific date and optional time window
  const handleNewFromSlot = (date, timeWindow) => {
    const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    setEditingDelivery({
      id: null,
      date: dateStr,
      timeWindow: timeWindow || '08:00 AM - 10:00 AM',
      source: 'Caravana store',
      clientName: '',
      contactName: '',
      address: '',
      phone: '',
      contactStatus: 'Scheduled',
      invoiceNumber: '',
      packingList: [],
      status: 'Scheduled'
    });
    setIsModalOpen(true);
  };

  const handleEditDelivery = (delivery) => { setEditingDelivery(delivery); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingDelivery(null); };
  const handleDeleteDelivery = (id) => { setDeliveries(prev => prev.filter(d => d.id !== id)); handleCloseModal(); };
  const handleSaveDelivery = (deliveryData) => {
    if (editingDelivery && editingDelivery.id) {
      setDeliveries(prev => prev.map(d => d.id === deliveryData.id ? deliveryData : d));
    } else {
      setDeliveries(prev => [...prev, { ...deliveryData, id: Date.now().toString() }]);
    }
    handleCloseModal();
  };

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

        <main>
          {viewMode === 'daily' && (
            <DailyCalendar
              deliveries={deliveries}
              onEditDelivery={handleEditDelivery}
              onNewFromSlot={handleNewFromSlot}
            />
          )}
          {viewMode === 'weekly' && (
            <WeeklyCalendar
              deliveries={deliveries}
              onEditDelivery={handleEditDelivery}
              onNewFromSlot={handleNewFromSlot}
            />
          )}
          {viewMode === 'monthly' && (
            <MonthlyCalendar
              deliveries={deliveries}
              onEditDelivery={handleEditDelivery}
              onNewFromSlot={handleNewFromSlot}
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
      />
    </>
  );
}

export default App;
