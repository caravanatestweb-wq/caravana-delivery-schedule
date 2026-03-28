/* VERSION: 1.0.6-MOBILE-FIX */
import { useState, useEffect } from 'react';
import WeeklyCalendar from './components/WeeklyCalendar';
import MonthlyCalendar from './components/MonthlyCalendar';
import DailyCalendar from './components/DailyCalendar';
import DeliveryFormModal from './components/DeliveryFormModal';
import { supabase } from './lib/supabaseClient';
import './App.css';

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatNavLabel = (currentDate, viewMode) => {
  if (viewMode === 'daily') {
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (viewMode === 'weekly') {
    const start = getStartOfWeek(currentDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const navigate = (currentDate, viewMode, dir) => {
  const d = new Date(currentDate);
  if (viewMode === 'daily') d.setDate(d.getDate() + dir);
  else if (viewMode === 'weekly') d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  return d;
};

// Build a list of date options for the dropdown based on view mode
const buildDateOptions = (currentDate, viewMode) => {
  const options = [];
  if (viewMode === 'daily') {
    for (let i = -30; i <= 60; i++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      options.push({ label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), value: d.toISOString() });
    }
  } else if (viewMode === 'weekly') {
    const base = getStartOfWeek(currentDate);
    for (let i = -8; i <= 12; i++) {
      const s = new Date(base);
      s.setDate(base.getDate() + i * 7);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      options.push({
        label: `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        value: s.toISOString()
      });
    }
  } else {
    for (let i = -6; i <= 12; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      options.push({ label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), value: d.toISOString() });
    }
  }
  return options;
};

const isToday = (date, viewMode) => {
  const today = new Date();
  if (viewMode === 'daily') return date.toDateString() === today.toDateString();
  if (viewMode === 'weekly') return getStartOfWeek(date).toDateString() === getStartOfWeek(today).toDateString();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

const getLocalDateString = (date = new Date()) => {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [deliveries, setDeliveries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [viewMode, setViewMode] = useState('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());

  // 1. Initial Load from Supabase
  useEffect(() => {
    const fetchDeliveries = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('deliveries')
        .select('*');
      
      if (error) {
        console.error('Error fetching deliveries:', error);
      } else {
        // 🔍 Aggressive Migration Logic
        const localSaved = localStorage.getItem('furniture_deliveries');
        const isMigrated = localStorage.getItem('supabase_migrated');

        if (localSaved && !isMigrated) {
          try {
            const localData = JSON.parse(localSaved);
            if (localData.length > 0) {
              console.log('Merging local data to Supabase...');
              const transformed = localData.map(d => ({
                id: (d.id && d.id.toString().length > 20) ? d.id : crypto.randomUUID(),
                date: d.date,
                timeWindow: d.timeWindow,
                source: d.source || 'Caravana store',
                scheduledBy: d.scheduledBy || '',
                clientName: d.clientName || '',
                address: d.address || '',
                phone: d.phone || '',
                status: d.status || 'Scheduled',
                notes: d.notes || '',
                packingList: d.packingList || []
              }));
              
              const { error: insErr } = await supabase.from('deliveries').insert(transformed);
              
              if (!insErr) {
                localStorage.setItem('supabase_migrated', 'true');
                console.log('Migration successful!');
                return fetchDeliveries();
              } else {
                console.error('Migration error:', insErr);
              }
            } else {
              localStorage.setItem('supabase_migrated', 'true');
            }
          } catch (e) { 
            console.error('Migration parsing error:', e);
            localStorage.setItem('supabase_migrated', 'true');
          }
        }
        
        const mapped = (data || []).map(d => ({
          id: d.id,
          date: d.date,
          timeWindow: d.timeWindow,
          source: d.source,
          scheduledBy: d.scheduledBy,
          clientName: d.clientName,
          address: d.address,
          phone: d.phone,
          status: d.status,
          notes: d.notes,
          packingList: d.packingList || [],
          photoUrls: d.photoUrls || []
        }));
        setDeliveries(mapped);
      }
      setIsLoading(false);
    };

    fetchDeliveries();

    // 2. Real-time Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, (payload) => {
        fetchDeliveries();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleOpenNewModal = () => { setEditingDelivery(null); setIsModalOpen(true); };
  const handleNewFromSlot = (date, timeWindow) => {
    const dateStr = getLocalDateString(date);
    setEditingDelivery({
      id: null, date: dateStr, timeWindow: timeWindow || '08:00 AM - 10:00 AM',
      source: 'Caravana store', scheduledBy: '', clientName: '', contactName: '', address: '',
      phone: '', contactStatus: 'Scheduled', invoiceNumber: '', packingList: [], status: 'Scheduled', notes: '', photoUrls: []
    });
    setIsModalOpen(true);
  };
  const handleEditDelivery = (delivery) => { setEditingDelivery(delivery); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingDelivery(null); };

  const handleDeleteDelivery = async (id) => {
    const { error } = await supabase.from('deliveries').delete().eq('id', id);
    if (error) alert("Error deleting: " + error.message);
    else handleCloseModal();
  };

  const handleSaveDelivery = async (deliveryData) => {
    const isNew = !deliveryData.id || deliveryData.id.toString().length < 20;
    const finalId = isNew ? crypto.randomUUID() : deliveryData.id;

    const payload = {
      id: finalId,
      date: deliveryData.date,
      timeWindow: deliveryData.timeWindow,
      source: deliveryData.source,
      scheduledBy: deliveryData.scheduledBy,
      clientName: deliveryData.clientName,
      address: deliveryData.address,
      phone: deliveryData.phone,
      status: deliveryData.status,
      notes: deliveryData.notes,
      packingList: deliveryData.packingList || [],
      photoUrls: deliveryData.photoUrls || []
    };

    if (isNew) {
      const { error } = await supabase.from('deliveries').insert([payload]);
      if (error) alert("Error saving: " + error.message);
    } else {
      const { error } = await supabase.from('deliveries').update(payload).eq('id', finalId);
      if (error) alert("Error updating: " + error.message);
    }
    handleCloseModal();
  };

  const handleGoToday = () => setCurrentDate(new Date());
  const handlePrev = () => setCurrentDate(navigate(currentDate, viewMode, -1));
  const handleNext = () => setCurrentDate(navigate(currentDate, viewMode, 1));
  const handleDropdownChange = (e) => setCurrentDate(new Date(e.target.value));

  const dateOptions = buildDateOptions(currentDate, viewMode);
  // Find the closest matching option value for the current selection
  const currentOptionValue = dateOptions.find(o => {
    const od = new Date(o.value);
    if (viewMode === 'daily') return od.toDateString() === currentDate.toDateString();
    if (viewMode === 'weekly') return od.toDateString() === getStartOfWeek(currentDate).toDateString();
    return od.getMonth() === currentDate.getMonth() && od.getFullYear() === currentDate.getFullYear();
  })?.value || dateOptions[0]?.value;

  const atToday = isToday(currentDate, viewMode);

  return (
    <>
      <div className="container fade-in">
        {/* ── Main App Header ── */}
        <header className="app-header">
          <h1 className="app-title">
            <span>◇</span> Caravana Schedule Hub
          </h1>
          <button className="btn-primary" onClick={handleOpenNewModal}>
            + New Delivery
          </button>
        </header>

        {/* ── Unified Calendar Nav Bar ── */}
        <div className="cal-nav-bar">
          {/* LEFT: view tabs */}
          <div className="cal-view-tabs">
            {['daily', 'weekly', 'monthly'].map(v => (
              <button
                key={v}
                className={`cal-tab ${viewMode === v ? 'active' : ''}`}
                onClick={() => setViewMode(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* CENTER: date dropdown */}
          <div className="cal-date-picker">
            <button className="btn-icon cal-nav-arrow" onClick={handlePrev}>‹</button>
            <select
              className="cal-date-select"
              value={currentOptionValue}
              onChange={handleDropdownChange}
            >
              {dateOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button className="btn-icon cal-nav-arrow" onClick={handleNext}>›</button>
          </div>

          {/* RIGHT: Today / This Week / This Month button */}
          <button
            className={`cal-today-btn ${atToday ? 'at-today' : ''}`}
            onClick={handleGoToday}
            disabled={atToday}
          >
            {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month'}
          </button>
        </div>

        {/* ── Calendar Views ── */}
        <main>
          {viewMode === 'daily' && (
            <DailyCalendar
              deliveries={deliveries}
              currentDate={currentDate}
              onEditDelivery={handleEditDelivery}
              onNewFromSlot={handleNewFromSlot}
            />
          )}
          {viewMode === 'weekly' && (
            <WeeklyCalendar
              deliveries={deliveries}
              currentDate={currentDate}
              onEditDelivery={handleEditDelivery}
              onNewFromSlot={handleNewFromSlot}
            />
          )}
          {viewMode === 'monthly' && (
            <MonthlyCalendar
              deliveries={deliveries}
              currentDate={currentDate}
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
        allDeliveries={deliveries}
      />
    </>
  );
}

export default App;
