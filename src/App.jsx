/* VERSION: 1.0.9-DUAL-LIST */
import { useState, useEffect, useRef, useCallback } from 'react';
import WeeklyCalendar from './components/WeeklyCalendar';
import MonthlyCalendar from './components/MonthlyCalendar';
import DailyCalendar from './components/DailyCalendar';
import DeliveryFormModal from './components/DeliveryFormModal';
import RepairFormModal from './components/RepairFormModal';
import PickupFormModal from './components/PickupFormModal';
import RepairsScheduleTab from './components/RepairsScheduleTab';
import StatsBar from './components/StatsBar';
import TeamView from './components/TeamView';
import FollowUpsTab from './components/FollowUpsTab';
import ReturnsTab from './components/ReturnsTab';
import TeamSettings from './components/TeamSettings';
import PackingList from './components/PackingList';
import ReceiptTemplate from './components/ReceiptTemplate';
import GlobalNotificationModal from './components/GlobalNotificationModal';
import ImagePreviewModal from './components/ImagePreviewModal';
import CommandCenterModal from './components/CommandCenterModal';
import { supabase } from './lib/supabaseClient';
import { localDate, getFollowUpType, sortDeliveriesByTime, fmtDate, getStatusBg, getStatusColor } from './lib/constants';
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
  const [teamAlerts, setTeamAlerts] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [editingPickup, setEditingPickup] = useState(null);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [viewMode, setViewMode] = useState('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showArchive, setShowArchive] = useState(false);
  const [viewRole, setViewRole] = useState('office');
  const [activeTab, setActiveTab] = useState('calendar');
  const [showSettings, setShowSettings] = useState(false);
  const [printingDelivery, setPrintingDelivery] = useState(null);
  const [printMode, setPrintMode] = useState('warehouse');
  const [publicPreviewId, setPublicPreviewId] = useState(null);
  const [publicReceiptId, setPublicReceiptId] = useState(null);
  const [previewArchiveImg, setPreviewArchiveImg] = useState(null);
  const [activeNavList, setActiveNavList] = useState([]);

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
      
      if (params.get('view') === 'receipt') {
        setPublicReceiptId(params.get('id'));
      } else {
        setPublicReceiptId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    // Initial sync
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const prevTabRef = useRef(activeTab);
  const prevRoleRef = useRef(viewRole);

  // Update hash when state changes
  useEffect(() => {
    if (publicPreviewId || publicReceiptId || window.location.hash.includes('view=preview') || window.location.hash.includes('view=receipt')) return;

    const params = new URLSearchParams();
    params.set('role', viewRole);
    params.set('tab', activeTab);
    params.set('view', viewMode);
    params.set('date', getLocalDateString(currentDate));
    if (showArchive) params.set('archive', 'true');
    
    const newHash = '#' + params.toString();
    if (window.location.hash !== newHash) {
      if (prevTabRef.current !== activeTab || prevRoleRef.current !== viewRole) {
        window.history.pushState(null, '', newHash);
        prevTabRef.current = activeTab;
        prevRoleRef.current = viewRole;
      } else {
        window.history.replaceState(null, '', newHash);
      }
    }
  }, [viewRole, activeTab, viewMode, currentDate, showArchive, publicPreviewId]);

  const loadRepairs = useCallback(async () => {
    const { data } = await supabase.from('repairs').select('*');
    if (data) setRepairs(data);
  }, []);

  const loadPickups = useCallback(async () => {
    const { data } = await supabase.from('vendor_pickups').select('*');
    if (data) setPickups(data);
  }, []);

  const loadTeam = useCallback(async () => {
    const { data } = await supabase.from('team_members').select('name').order('name');
    if (data) setTeamMembers(data.map(m => m.name));
  }, []);

  const loadAlerts = useCallback(async () => {
    const now = new Date().toISOString();
    const { data } = await supabase.from('team_alerts').select('*').gt('expires_at', now);
    if (data) setTeamAlerts(data);
  }, []);

  const fetchDeliveries = useCallback(async () => {
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
  }, []);

  // 1A. Visibility Re-sync (Prevents silent drops/throttling)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab visible: Re-syncing deliveries...');
        fetchDeliveries();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchDeliveries]);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (data) {
      if (data.tm_user) localStorage.setItem('tm_username', data.tm_user);
      if (data.tm_key) localStorage.setItem('tm_apikey', data.tm_key);
    }
  }, []);

  // 1. Initial Load from Supabase
  useEffect(() => {
    loadSettings();
    fetchDeliveries();
    loadRepairs();
    loadTeam();
    loadAlerts();
    loadPickups();


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

    // 2B. Alerts Subscription (Isolated channel to respect Core Logic Lock)
    const alertsChannel = supabase
      .channel('team-alerts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_alerts' }, () => {
        loadAlerts();
      })
      .subscribe();

    // 2C. Pickups Subscription
    const pickupsChannel = supabase
      .channel('pickups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_pickups' }, () => {
        loadPickups();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      supabase.removeChannel(alertsChannel);
    };
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

  const handleUpdateRepairStatus = async (id, status) => {
    const { error } = await supabase.from('repairs').update({ status }).eq('id', id);
    if (error) alert('Error updating repair status: ' + error.message);
    else setRepairs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleResolveRepair = async (id) => {
    const { error } = await supabase.from('repairs').update({ isResolved: true }).eq('id', id);
    if (error) alert('Error resolving repair: ' + error.message);
    else setRepairs(prev => prev.map(r => r.id === id ? { ...r, isResolved: true } : r));
  };

  // Pickup handlers
  const handleOpenNewPickup = () => { setEditingPickup(null); setIsPickupModalOpen(true); };
  const handleEditPickup = (p) => { setEditingPickup(p); setIsPickupModalOpen(true); };
  const handleClosePickupModal = () => setIsPickupModalOpen(false);
  const handleDeletePickup = async (id) => {
    if (!window.confirm("Delete this pickup?")) return;
    const { error } = await supabase.from('vendor_pickups').delete().eq('id', id);
    if (error) alert("Error deleting pickup: " + error.message);
    else setPickups(prev => prev.filter(p => p.id !== id));
    setIsPickupModalOpen(false);
  };
  const handleSavePickup = async (formData, keepOpen = false) => {
    let err;
    if (formData.id) { 
      const { error } = await supabase.from('vendor_pickups').update(formData).eq('id', formData.id); 
      err = error;
      if (!error) setPickups(prev => prev.map(p => p.id === formData.id ? formData : p));
    } 
    else { 
      // Ensure we don't send id=null on insert
      const payload = { ...formData };
      delete payload.id;
      const { error, data } = await supabase.from('vendor_pickups').insert([payload]).select(); 
      err = error;
      if (!error && data) setPickups(prev => [...prev, ...data]);
    }

    if (err) {
      alert("Error saving pickup: " + err.message + "\n\nDetails: " + JSON.stringify(err.details));
      console.error(err);
      return false;
    } else {
      if (!keepOpen) setIsPickupModalOpen(false);
      return true;
    }
  };

  const handleUpdatePickupStatus = async (id, status) => {
    const { error } = await supabase.from('vendor_pickups').update({ status }).eq('id', id);
    if (error) alert('Error updating pickup status: ' + error.message);
    else setPickups(prev => prev.map(p => p.id === id ? { ...p, status } : p));
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
  const handleDropdownChange = (e) => {
    const [y, m, d] = e.target.value.split('-');
    setCurrentDate(new Date(y, m - 1, d));
  };

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

  // ── Public Receipt Rendering ──
  if (publicReceiptId) {
    const delivery = deliveries.find(d => d.id === publicReceiptId);
    if (isLoading) return <div style={{ padding: 100, textAlign: 'center' }}>Loading your delivery receipt...</div>;
    if (!delivery) return <div style={{ padding: 100, textAlign: 'center' }}>Receipt not found. Please contact Caravana Furniture.</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#ccc', minHeight: '100vh', padding: '40px 20px' }}>
        <button className="no-print" style={{ marginBottom: 20, padding: '12px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }} onClick={() => window.print()}>
          🖨️ Print Document
        </button>
        <div style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: '#fff' }}>
          <ReceiptTemplate delivery={delivery} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container fade-in">
        {/* ── Main App Header ── */}
        <header className="app-header">
          <h1 className="app-title" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => {
            setViewRole('office'); setActiveTab('calendar'); setViewMode('weekly'); setCurrentDate(new Date()); setShowArchive(false); window.location.hash = '#role=office&tab=calendar&view=weekly';
          }}>
            <span style={{ fontSize: '1.4rem' }}>🚛</span> Caravana Delivery Hub
          </h1>
          <div className="version-badge" style={{ fontSize: 10, background: '#eee', padding: '2px 6px', borderRadius: 4, opacity: 0.6 }}>v1.0.9</div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Role Toggle */}
            <div className="role-toggle">
              <button
                className={`role-tab ${viewRole === 'office' ? 'active' : ''}`}
                onClick={() => { setViewRole('office'); setActiveTab('calendar'); }}
              >
                🖥️ Office HUB
              </button>
              <button
                className={`role-tab ${viewRole === 'team' ? 'active' : ''}`}
                onClick={() => setViewRole('team')}
              >
                🚛 Delivery Team Center
              </button>
            </div>
            <button
              className="btn btn-secondary"
              title="Dispatch Command Center"
              onClick={() => setIsCommandCenterOpen(true)}
              style={{ fontWeight: 800, color: '#c53030', borderColor: '#fca5a5', background: '#fef2f2', marginLeft: 'auto' }}
            >
              🕹️ Command Center
            </button>
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
                <button className="btn-secondary" onClick={handleOpenNewPickup} style={{ color: '#2563eb', borderColor: '#bfdbfe' }}>🏭 Pickup</button>
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

        {viewRole === 'team' && (
          <TeamView 
            deliveries={liveDeliveries} 
            repairs={repairs} 
            pickups={pickups.filter(p => p.status !== 'Canceled')} 
            updateDelivery={updateDelivery} 
            onEditRepair={handleEditRepair} 
            onUpdateRepairStatus={handleUpdateRepairStatus}
            onUpdatePickupStatus={handleUpdatePickupStatus}
          />
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
                              <img key={i} src={url} alt="delivery" className="archive-thumb" onClick={e => { e.stopPropagation(); setPreviewArchiveImg(url); }} />
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
                      setActiveTab('active');
                    }
                    else setActiveTab('calendar');
                  }}
                />

                {/* Office Tab Bar */}
                <div className="office-tabs">
                  <button className={`office-tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
                    📅 Calendar
                  </button>
                  <button className={`office-tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
                    🚛 Active
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
                    {repairs.filter(r => r.status !== 'Returned' && r.isResolved !== true).length > 0 && (
                      <span className="office-tab-badge" style={{ background: '#c53030' }}>
                        {repairs.filter(r => r.status !== 'Returned' && r.isResolved !== true).length}
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
                      {viewMode === 'daily' && <DailyCalendar deliveries={liveDeliveries} repairEvents={repairs.filter(r => r.returnDate)} pickupEvents={pickups.filter(p => p.status !== 'Canceled')} currentDate={currentDate} onEditDelivery={handleEditDelivery} onNewFromSlot={handleNewFromSlot} onPrev={handlePrev} onNext={handleNext} onSwitchTab={setActiveTab} />}
                      {viewMode === 'weekly' && <WeeklyCalendar deliveries={liveDeliveries} repairEvents={repairs.filter(r => r.returnDate)} pickupEvents={pickups.filter(p => p.status !== 'Canceled')} currentDate={currentDate} onEditDelivery={handleEditDelivery} onNewFromSlot={handleNewFromSlot} onPrev={handlePrev} onNext={handleNext} onSwitchTab={setActiveTab} />}
                      {viewMode === 'monthly' && <MonthlyCalendar deliveries={liveDeliveries} repairEvents={repairs.filter(r => r.returnDate)} pickupEvents={pickups.filter(p => p.status !== 'Canceled')} currentDate={currentDate} onEditDelivery={handleEditDelivery} onNewFromSlot={handleNewFromSlot} onPrev={handlePrev} onNext={handleNext} onSwitchTab={setActiveTab} />}
                    </main>
                  </>
                )}

                {activeTab === 'active' && (() => {
                  const combinedActive = [
                    ...liveDeliveries.filter(d => !['Delivered', 'Completed'].includes(d.status)),
                    ...repairs.filter(r => !['Returned'].includes(r.status) && r.isResolved !== true).map(r => ({
                      ...r, _type: 'repair', id: 'r-' + r.id, originalRepair: r,
                      date: r.returnDate || '9999-12-31', timeWindow: r.appointmentType || ''
                    })),
                    ...pickups.filter(p => !['Completed', 'Canceled'].includes(p.status)).map(p => ({
                      ...p, _type: 'pickup', id: 'p-' + p.id, originalPickup: p,
                      clientName: p.vendor_name, date: p.date || '9999-12-31', timeWindow: p.time_window || ''
                    }))
                  ];
                  return (
                  <div className="active-deliveries-list" style={{ padding: '0 4px' }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                      Active Queue ({combinedActive.length})
                    </h3>
                    {sortDeliveriesByTime(combinedActive).map((d, i, arr) => {
                      const isRepair = d._type === 'repair' || d.flagged === 'repair' || ['Repair on site', 'Schedule'].includes(d.status);
                      const isPickup = d._type === 'pickup';
                      return (
                        <div key={d.id} onClick={() => isPickup ? handleEditPickup(d.originalPickup) : (d._type === 'repair' ? handleEditRepair(d.originalRepair) : handleEditDelivery(d, arr))} style={{ 
                          background: isPickup ? '#eff6ff' : 'var(--surface)', borderRadius: 12, border: `1px solid ${isPickup ? '#bfdbfe' : (isRepair ? '#fca5a5' : 'var(--border)')}`, 
                          borderLeftWidth: isRepair || isPickup ? 6 : 1, borderLeftColor: isPickup ? '#2563eb' : (isRepair ? '#c53030' : 'var(--border)'),
                          padding: '14px 16px', marginBottom: 10, cursor: 'pointer', display: 'flex', 
                          justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)'
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: isPickup ? '#1e3a8a' : 'var(--text-main)' }}>{isPickup && '🏭 '}{d.clientName}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
                              {fmtDate(d.date) === 'NaN/NaN/NaN' ? 'Unscheduled' : fmtDate(d.date)} • {d.timeWindow} • Queue #{i+1}
                            </div>
                          </div>
                          <span style={{ 
                            fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4, 
                            background: isPickup ? '#dbeafe' : (isRepair ? '#fef2f2' : getStatusBg(d.status)), color: isPickup ? '#1e3a8a' : (isRepair ? '#c53030' : getStatusColor(d.status)),
                            border: `1px solid ${isPickup ? '#bfdbfe' : (isRepair ? '#fca5a5' : getStatusColor(d.status))}40`, textTransform: 'uppercase'
                          }}>{isPickup ? '🏭 PICKUP' : (isRepair ? '🔧 REPAIR' : d.status)}</span>
                        </div>
                      );
                    })}
                  </div>
                  );
                })()}

                {activeTab === 'followups' && (
                  <FollowUpsTab deliveries={liveDeliveries} updateDelivery={updateDelivery} onEditDelivery={handleEditDelivery} />
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
                    onResolve={handleResolveRepair}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      <GlobalNotificationModal deliveries={liveDeliveries} repairs={repairs} teamAlerts={teamAlerts} />

      {isCommandCenterOpen && (
        <CommandCenterModal
          onClose={() => setIsCommandCenterOpen(false)}
          teamMembers={teamMembers}
          teamAlerts={teamAlerts}
        />
      )}

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
      <PickupFormModal
        isOpen={isPickupModalOpen}
        onClose={handleClosePickupModal}
        onSave={handleSavePickup}
        onDelete={handleDeletePickup}
        pickup={editingPickup}
        teamMembers={teamMembers}
      />

      {printingDelivery && (
        <PackingList
          delivery={printingDelivery}
          mode={printMode}
          onClose={() => setPrintingDelivery(null)}
        />
      )}
      <ImagePreviewModal imageUrl={previewArchiveImg} onClose={() => setPreviewArchiveImg(null)} />
    </>
  );
}

export default App;
