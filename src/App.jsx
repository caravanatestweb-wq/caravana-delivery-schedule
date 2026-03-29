/* VERSION: 1.0.9-DUAL-LIST */
import { useState, useEffect } from 'react';
import WeeklyCalendar from './components/WeeklyCalendar';
import MonthlyCalendar from './components/MonthlyCalendar';
import DailyCalendar from './components/DailyCalendar';
import DeliveryFormModal from './components/DeliveryFormModal';
import RepairFormModal from './components/RepairFormModal';
import RepairsScheduleTab from './components/RepairsScheduleTab';
import StatsBar from './components/StatsBar';
import TeamView from './components/TeamView';
import FollowUpsTab from './components/FollowUpsTab';
import ReturnsTab from './components/ReturnsTab';
import TeamSettings from './components/TeamSettings';
import PackingList from './components/PackingList';
import { supabase } from './lib/supabaseClient';
import { localDate, getFollowUpType } from './lib/constants';
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
  const [repairs, setRepairs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [viewMode, setViewMode] = useState('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showArchive, setShowArchive] = useState(false);
  const [viewRole, setViewRole] = useState('office');
  const [activeTab, setActiveTab] = useState('calendar');
  const [showSettings, setShowSettings] = useState(false);
  const [printingDelivery, setPrintingDelivery] = useState(null);
  const [printMode, setPrintMode] = useState('warehouse');
  const [publicPreviewId, setPublicPreviewId] = useState(null);

  // ── Print Packing List Event ────────────────────────────────
  useEffect(() => {
    const handlePrint = (e) => {
      setPrintingDelivery(e.detail.delivery);
      setPrintMode(e.detail.mode || 'warehouse');
    };
    window.addEventListener('print-packing-list', handlePrint);
    return () => window.removeEventListener('print-packing-list', handlePrint);
  }, []);

  // ── Navigation & History Sync ────────────────────────────────
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      const params = new URLSearchParams(hash);
      
      if (params.has('role')) setViewRole(params.get('role'));
      if (params.has('tab')) setActiveTab(params.get('tab'));
      if (params.has('view')) setViewMode(params.get('view'));
      if (params.has('date')) {
        const d = new Date(params.get('date') + 'T12:00:00');
        if (!isNaN(d.getTime())) setCurrentDate(d);
      }
      if (params.has('archive')) setShowArchive(params.get('archive') === 'true');
      if (params.get('view') === 'preview') {
        setPublicPreviewId(params.get('id'));
      } else {
        setPublicPreviewId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    // Initial sync
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update hash when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('role', viewRole);
    params.set('tab', activeTab);
    params.set('view', viewMode);
    params.set('date', getLocalDateString(currentDate));
    if (showArchive) params.set('archive', 'true');
    
    const newHash = '#' + params.toString();
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  }, [viewRole, activeTab, viewMode, currentDate, showArchive]);

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
        
        setDeliveries(data || []);
      }
      setIsLoading(false);
    };
    fetchDeliveries();

    // Also load repairs and team members
    const loadRepairs = async () => {
      const { data } = await supabase.from('repairs').select('*');
      if (data) setRepairs(data);
    };
    const loadTeam = async () => {
      const { data } = await supabase.from('team_members').select('name').order('name');
      if (data) setTeamMembers(data.map(m => m.name));
    };
    loadRepairs();
    loadTeam();

    // 2. Real-time Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        fetchDeliveries();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'repairs' }, () => {
        loadRepairs();
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
    else { setDeliveries(prev => prev.filter(d => d.id !== id)); handleCloseModal(); }
  };

  // Repair handlers
  const handleOpenNewRepair = () => { setEditingRepair(null); setIsRepairModalOpen(true); };
  const handleEditRepair = (r) => { setEditingRepair(r); setIsRepairModalOpen(true); };
  const handleCloseRepairModal = () => { setIsRepairModalOpen(false); setEditingRepair(null); };
  const handleSaveRepair = async (repairData) => {
    const isNew = !repairData.id;
    const finalId = isNew ? crypto.randomUUID() : repairData.id;
    const payload = { ...repairData, id: finalId };
    if (isNew) {
      const { error } = await supabase.from('repairs').insert([payload]);
      if (error) { alert('Error saving repair: ' + error.message); return; }
      setRepairs(prev => [...prev, payload]);
    } else {
      const { error } = await supabase.from('repairs').update(payload).eq('id', finalId);
      if (error) { alert('Error updating repair: ' + error.message); return; }
      setRepairs(prev => prev.map(r => r.id === finalId ? payload : r));
    }
    handleCloseRepairModal();
  };
  const handleDeleteRepair = async (id) => {
    const { error } = await supabase.from('repairs').delete().eq('id', id);
    if (error) alert('Error deleting repair: ' + error.message);
    else { setRepairs(prev => prev.filter(r => r.id !== id)); handleCloseRepairModal(); }
  };

  const handleSaveDelivery = async (deliveryData) => {
    const isNew = !deliveryData.id;
    const finalId = isNew ? crypto.randomUUID() : deliveryData.id.toString();

    const payload = {
      id: finalId,
      date: deliveryData.date,
      timeWindow: deliveryData.timeWindow,
      source: deliveryData.source,
      orderSource: deliveryData.orderSource || 'in_store',
      scheduledBy: deliveryData.scheduledBy || '',
      deliveryTeam: deliveryData.deliveryTeam || '',
      clientName: deliveryData.clientName,
      contactName: deliveryData.contactName || '',
      address: deliveryData.address,
      phone: deliveryData.phone,
      email: deliveryData.email || '',
      status: deliveryData.status,
      contactStatus: deliveryData.contactStatus || 'Scheduled',
      notes: deliveryData.notes || '',
      orderNumber: deliveryData.orderNumber || '',
      invoiceNumber: deliveryData.invoiceNumber || '',
      items: deliveryData.items || [],
      packingList: deliveryData.packingList || [],
      trialEnabled: deliveryData.trialEnabled !== false,
      trialExpires: deliveryData.trialExpires || null,
      flagged: deliveryData.flagged || null,
      flagReason: deliveryData.flagReason || '',
      flagDate: deliveryData.flagDate || null,
      photoUrls: deliveryData.photoUrls || [],
      locked: deliveryData.locked || false,
    };

    if (isNew) {
      const { error } = await supabase.from('deliveries').insert([payload]);
      if (error) { alert('Error saving: ' + error.message); return; }
      setDeliveries(prev => [...prev, payload]);
    } else {
      const { error } = await supabase.from('deliveries').update(payload).eq('id', finalId);
      if (error) { alert('Error updating: ' + error.message); return; }
      setDeliveries(prev => prev.map(d => d.id === finalId ? payload : d));
    }
    handleCloseModal();
  };

  const handleGoToday = () => setCurrentDate(new Date());
  const handlePrev = () => setCurrentDate(navigate(currentDate, viewMode, -1));
  const handleNext = () => setCurrentDate(navigate(currentDate, viewMode, 1));
  const handleDropdownChange = (e) => setCurrentDate(new Date(e.target.value));

  const handleArchiveDelivery = async (id) => {
    const { error } = await supabase.from('deliveries').update({ status: 'Archived' }).eq('id', id);
    if (error) alert('Error archiving: ' + error.message);
    else handleCloseModal();
  };

  const handleExportCSV = () => {
    const rows = deliveries.filter(d => d.status === 'Archived');
    if (rows.length === 0) { alert('No archived deliveries to export yet.'); return; }
    const headers = ['Date','Time Window','Client Name','Phone','Address','Source','Scheduled By','Status','Notes','Photos'];
    const csvRows = rows.map(d => [
      d.date, d.timeWindow, d.clientName, d.phone, `"${(d.address||'').replace(/"/g,'""')}"`,
      d.source, d.scheduledBy, d.status, `"${(d.notes||'').replace(/"/g,'""')}"`,
      (d.photoUrls||[]).join(' | ')
    ].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `caravana-archive-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const updateDelivery = (id, updates) => {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const liveDeliveries = deliveries.filter(d => d.status !== 'Archived');
  const archivedDeliveries = deliveries.filter(d => d.status === 'Archived');
  const followupCount = liveDeliveries.filter(d => getFollowUpType(d, localDate())).length;
  const returnsCount = liveDeliveries.filter(d => ['return', 'exchange', 'repair'].includes(d.flagged)).length;

  const dateOptions = buildDateOptions(currentDate, viewMode);
  // Find the closest matching option value for the current selection
  const currentOptionValue = dateOptions.find(o => {
    const od = new Date(o.value);
    if (viewMode === 'daily') return od.toDateString() === currentDate.toDateString();
    if (viewMode === 'weekly') return od.toDateString() === getStartOfWeek(currentDate).toDateString();
    return od.getMonth() === currentDate.getMonth() && od.getFullYear() === currentDate.getFullYear();
  })?.value || dateOptions[0]?.value;

  const atToday = isToday(currentDate, viewMode);

  // ── Public Preview Rendering ──
  if (publicPreviewId) {
    const delivery = deliveries.find(d => d.id === publicPreviewId);
    if (isLoading) return <div style={{ padding: 100, textAlign: 'center' }}>Loading your delivery preview...</div>;
    if (!delivery) return <div style={{ padding: 100, textAlign: 'center' }}>Delivery details not found. Please contact Caravana Furniture.</div>;
    return (
      <PackingList 
        delivery={delivery} 
        mode="client" 
        onClose={() => {
          setPublicPreviewId(null);
          window.location.hash = window.location.hash.replace('view=preview', 'view=weekly');
        }} 
      />
    );
  }

  return (
    <>
      <div className="container fade-in">
        {/* ── Main App Header ── */}
        <header className="app-header">
          <h1 className="app-title">
            <span>◇</span> Caravana Operations Guide v2
          </h1>
          <div className="version-badge" style={{ fontSize: 10, background: '#eee', padding: '2px 6px', borderRadius: 4, opacity: 0.6 }}>v1.0.9</div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Role Toggle */}
            <div className="role-toggle">
              <button
                className={`role-tab ${viewRole === 'office' ? 'active' : ''}`}
                onClick={() => { setViewRole('office'); setActiveTab('calendar'); }}
              >
                🖥️ Office
              </button>
              <button
                className={`role-tab ${viewRole === 'team' ? 'active' : ''}`}
                onClick={() => setViewRole('team')}
              >
                🚛 Team
              </button>
            </div>
            {/* Settings gear */}
            <button
              title="Team Settings"
              onClick={() => setShowSettings(true)}
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >⚙️</button>
            {viewRole === 'office' && !showArchive && (
              <>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem' }}
                  onClick={() => setShowArchive(v => !v)}
                >
                  📦 Archive ({archivedDeliveries.length})
                </button>
                <button className="btn-primary" onClick={handleOpenNewModal}>+ New Delivery</button>
              </>
            )}
            {viewRole === 'office' && showArchive && (
              <>
                <button className="btn-secondary" style={{ fontSize: '0.82rem' }} onClick={() => setShowArchive(false)}>← Live Schedule</button>
                <button className="btn-secondary" style={{ fontSize: '0.82rem' }} onClick={handleExportCSV}>⬇ Export CSV</button>
              </>
            )}
          </div>
        </header>

        {showSettings && <TeamSettings onClose={() => setShowSettings(false)} />}

        {/* ── TEAM MODE ── */}
        {viewRole === 'team' && (
          <TeamView deliveries={liveDeliveries} updateDelivery={updateDelivery} />
        )}

        {/* ── OFFICE MODE ── */}
        {viewRole === 'office' && (
          <>
            {/* Archive view */}
            {showArchive && (
              <div className="archive-view">
                <h2 style={{ marginBottom: '1rem', color: 'var(--text-light)', fontSize: '1rem', fontWeight: 600 }}>
                  📦 {archivedDeliveries.length} Archived Deliveries
                </h2>
                {archivedDeliveries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>No archived deliveries yet.</div>
                ) : (
                  <div className="archive-list">
                    {archivedDeliveries.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(d => (
                      <div key={d.id} className="archive-card" onClick={() => handleEditDelivery(d)}>
                        <div className="archive-card-date">{d.date}</div>
                        <div className="archive-card-name">{d.clientName}</div>
                        <div className="archive-card-meta">{d.timeWindow} · {d.source}</div>
                        {d.scheduledBy && <div className="archive-card-by">by {d.scheduledBy}</div>}
                        {(d.photoUrls || []).length > 0 && (
                          <div className="archive-card-photos">
                            {d.photoUrls.map((url, i) => (
                              <img key={i} src={url} alt="delivery" className="archive-thumb" onClick={e => { e.stopPropagation(); window.open(url, '_blank'); }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Office tabs + calendar */}
            {!showArchive && (
              <>
                {/* Stats Bar */}
                <StatsBar
                  deliveries={liveDeliveries}
                  repairs={repairs}
                  followupCount={followupCount}
                  returnsCount={returnsCount}
                  activeTab={activeTab}
                  onTabClick={(key) => {
                    if (key === 'followups') setActiveTab('followups');
                    else if (key === 'returns') setActiveTab('returns');
                    else if (key === 'repairs') setActiveTab('repairs');
                    else if (key === 'today') {
                      setActiveTab('calendar');
                      setViewMode('daily');
                      setCurrentDate(new Date());
                    }
                    else if (key === 'active') {
                      setActiveTab('calendar');
                      // Potentially filter for active? For now just go to calendar.
                    }
                    else setActiveTab('calendar');
                  }}
                />

                {/* Office Tab Bar */}
                <div className="office-tabs">
                  <button className={`office-tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
                    📅 Calendar
                  </button>
                  <button className={`office-tab ${activeTab === 'followups' ? 'active' : ''}`} onClick={() => setActiveTab('followups')}>
                    💬 Follow-ups
                    {followupCount > 0 && <span className="office-tab-badge">{followupCount}</span>}
                  </button>
                  <button className={`office-tab ${activeTab === 'returns' ? 'active' : ''}`} onClick={() => setActiveTab('returns')}>
                    🔄 Returns
                    {returnsCount > 0 && <span className="office-tab-badge">{returnsCount}</span>}
                  </button>
                  <button className={`office-tab ${activeTab === 'repairs' ? 'active' : ''}`} onClick={() => setActiveTab('repairs')}>
                    🔧 Repairs
                    {repairs.filter(r => r.status !== 'Returned').length > 0 && (
                      <span className="office-tab-badge" style={{ background: '#7c3aed' }}>
                        {repairs.filter(r => r.status !== 'Returned').length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Calendar View */}
                {activeTab === 'calendar' && (
                  <>
                    {/* ── Unified Calendar Nav Bar ── */}
                    <div className="cal-nav-bar">
                      <div className="cal-view-tabs">
                        {['daily', 'weekly', 'monthly'].map(v => (
                          <button key={v} className={`cal-tab ${viewMode === v ? 'active' : ''}`} onClick={() => setViewMode(v)}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                      </div>
                      <div className="cal-date-picker">
                        <button className="btn-icon cal-nav-arrow" onClick={handlePrev} title="Previous">‹</button>
                        <select className="cal-date-select" value={currentOptionValue} onChange={handleDropdownChange}>
                          {dateOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                        </select>
                        <button className="btn-icon cal-nav-arrow" onClick={handleNext} title="Next">›</button>
                        {/* Jump to date — direct input for speed */}
                        <input
                          type="date"
                          className="cal-jump-date"
                          value={viewMode === 'daily' ? currentOptionValue : ''}
                          onChange={e => e.target.value && setCurrentDate(new Date(e.target.value + 'T12:00:00'))}
                          title="Jump to date"
                        />
                      </div>
                      <button className={`cal-today-btn ${atToday ? 'at-today' : ''}`} onClick={handleGoToday} disabled={atToday}>
                        {viewMode === 'daily' ? 'Today' : viewMode === 'weekly' ? 'This Week' : 'This Month'}
                      </button>
                    </div>
                    <main>
                      {viewMode === 'daily' && <DailyCalendar deliveries={liveDeliveries} repairEvents={repairs.filter(r => r.returnDate)} currentDate={currentDate} onEditDelivery={handleEditDelivery} onNewFromSlot={handleNewFromSlot} onPrev={handlePrev} onNext={handleNext} onSwitchTab={setActiveTab} />}
                      {viewMode === 'weekly' && <WeeklyCalendar deliveries={liveDeliveries} repairEvents={repairs.filter(r => r.returnDate)} currentDate={currentDate} onEditDelivery={handleEditDelivery} onNewFromSlot={handleNewFromSlot} onPrev={handlePrev} onNext={handleNext} onSwitchTab={setActiveTab} />}
                      {viewMode === 'monthly' && <MonthlyCalendar deliveries={liveDeliveries} repairEvents={repairs.filter(r => r.returnDate)} currentDate={currentDate} onEditDelivery={handleEditDelivery} onNewFromSlot={handleNewFromSlot} onPrev={handlePrev} onNext={handleNext} onSwitchTab={setActiveTab} />}
                    </main>
                  </>
                )}

                {activeTab === 'followups' && (
                  <FollowUpsTab deliveries={liveDeliveries} updateDelivery={updateDelivery} />
                )}

                {activeTab === 'returns' && (
                  <ReturnsTab
                    deliveries={liveDeliveries}
                    updateDelivery={updateDelivery}
                    onEditDelivery={handleEditDelivery}
                  />
                )}

                {activeTab === 'repairs' && (
                  <RepairsScheduleTab
                    repairs={repairs}
                    onNew={handleOpenNewRepair}
                    onEdit={handleEditRepair}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      <DeliveryFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDelivery}
        onDelete={handleDeleteDelivery}
        onArchive={handleArchiveDelivery}
        delivery={editingDelivery}
        allDeliveries={deliveries}
      />
      <RepairFormModal
        isOpen={isRepairModalOpen}
        onClose={handleCloseRepairModal}
        onSave={handleSaveRepair}
        onDelete={handleDeleteRepair}
        repair={editingRepair}
        teamMembers={teamMembers}
      />

      {printingDelivery && (
        <PackingList
          delivery={printingDelivery}
          mode={printMode}
          onClose={() => setPrintingDelivery(null)}
        />
      )}
    </>
  );
}

export default App;
