import { useState, useEffect } from 'react';
import TeamDeliveryForm from './TeamDeliveryForm';
import TeamCalendarCarousel from './TeamCalendarCarousel';
import DocumentSigner from './DocumentSigner';
import { supabase } from '../lib/supabaseClient';
import { localDate, fmtDate, sortDeliveriesByTime } from '../lib/constants';

export default function TeamView({ deliveries, repairs = [], pickups = [], updateDelivery, onEditRepair, onUpdateRepairStatus, onUpdatePickupStatus }) {
  const [activeId, setActiveId] = useState(null);
  const [signerDelivery, setSignerDelivery] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [filterTab, setFilterTab] = useState('active'); // active, today, returns, repairs, past
  const [searchQuery, setSearchQuery] = useState('');
  const [pastResults, setPastResults] = useState([]);
  const [batchPickups, setBatchPickups] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupByTeam, setGroupByTeam] = useState(false); // Toggle for swimlanes
  
  const today = localDate();

  useEffect(() => {
    const fetchBatchPickups = async () => {
      const { data } = await supabase.from('batch_pickups').select('*').neq('status', 'Completed');
      if (data) setBatchPickups(data);
    };
    fetchBatchPickups();

    const channel = supabase.channel('batch-pickups-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batch_pickups' }, () => {
        fetchBatchPickups();
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, []);

  const activeDelivery = deliveries.find(d => d.id === activeId) || 
                         pastResults.find(d => d.id === activeId);

  const active = activeDelivery;
  if (active) {
    return (
      <TeamDeliveryForm
        delivery={active}
        onBack={() => setActiveId(null)}
        updateDelivery={updateDelivery}
      />
    );
  }

  // Pre-process repairs to join the standard format
  const mappedRepairs = repairs.map(r => ({
      _type: 'repair',
      id: 'r-' + r.id,
      originalRepair: r,
      date: r.returnDate || 'No Date',
      timeWindow: r.returnTimeWindow || '',
      clientName: r.clientName,
      address: r.appointmentType || 'Return / Repair Pickup',
      status: r.status,
      deliveryTeam: r.team_id || '',
      flagged: 'repair pickup'
    }));

  const mappedPickups = pickups.map(p => ({
      _type: 'pickup',
      id: 'p-' + p.id,
      originalPickup: p,
      date: p.date || 'No Date',
      timeWindow: p.timeWindow || '',
      clientName: `🏭 ${p.vendor_name || 'Vendor'}`,
      address: p.address || 'Vendor Warehouse',
      status: p.status,
      deliveryTeam: p.team_id || '',
      flagged: 'pickup'
  }));

  const mappedBatchPickups = batchPickups.map(b => ({
      _type: 'batch_pickup',
      id: 'bp-' + b.id,
      originalBatch: b,
      date: b.date || 'No Date',
      timeWindow: b.timeWindow || '',
      clientName: `📦 Master Batch: ${b.vendors_list?.length || 0} Vendors`,
      address: 'Multiple Warehouse Locations',
      status: b.status,
      deliveryTeam: b.deliveryTeam || '',
      flagged: 'batch'
  }));

  const mergedLive = [...deliveries, ...mappedRepairs, ...mappedPickups, ...mappedBatchPickups];

  // Filtering based on tab
  let teamVisible = [];
  if (filterTab === 'active') {
    teamVisible = mergedLive.filter(d => 
      (!['Delivered','Archived','Completed', 'Returned'].includes(d.status)) &&
      (d._type === 'repair' ? true : d._type === 'pickup' ? true : d._type === 'batch_pickup' ? true : (['Scheduled', 'In Progress', 'Contacted', 'Ready'].includes(d.status) || d.flagged))
    );
  } else if (filterTab === 'today') {
    teamVisible = mergedLive.filter(d => d.date === today && !['Archived', 'Returned'].includes(d.status));
  } else if (filterTab === 'returns') {
    teamVisible = mergedLive.filter(d => ['return', 'exchange'].includes(d.flagged) && !['Delivered','Archived','Completed'].includes(d.status) && d.flagged !== 'repair' && d._type !== 'repair');
  } else if (filterTab === 'repairs') {
    teamVisible = [
      ...mappedRepairs.filter(r => r.status !== 'Returned'),
      ...deliveries.filter(d => (!['Delivered', 'Archived', 'Completed'].includes(d.status)) && (d.flagged === 'repair' || ['Repair on site', 'Schedule'].includes(d.status)))
    ];
  } else if (filterTab === 'past') {
    teamVisible = pastResults;
  }

  // Search function for Past Deliveries
  const handleSearchPast = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .or(`clientName.ilike.%${searchQuery}%,orderNumber.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
      .order('date', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setPastResults(data);
    }
    setIsSearching(false);
  };

  const todayStops = sortDeliveriesByTime(teamVisible.filter(d => d.date === today));
  const otherStops = teamVisible.filter(d => d.date !== today);

  // Group other stops by date
  const otherByDate = otherStops.reduce((acc, d) => {
    const key = d.date || 'No Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    acc[key] = sortDeliveriesByTime(acc[key]);
    return acc;
  }, {});
  const sortedOtherDates = Object.keys(otherByDate).sort((a,b) => {
    if(filterTab === 'past') return new Date(b) - new Date(a); // Descending for past
    return new Date(a) - new Date(b); // Ascending for upcoming
  });

  const fmtHeader = (dateStr) => {
    if (!dateStr || dateStr === 'No Date') return 'No Date';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="team-center-container" style={{ paddingBottom: 40 }}>
      {/* Placement Cards / Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {[
          { key: 'active', label: 'ACTIVE', color: '#0b7a4a', bg: '#eef7f0', border: '#a7f0d4' },
          { key: 'today', label: 'TODAY', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { key: 'returns', label: 'RETURNS', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
          { key: 'repairs', label: 'REPAIRS', color: '#c53030', bg: '#fef2f2', border: '#fca5a5' },
          { key: 'past', label: 'PAST', color: '#475569', bg: '#f8fafc', border: '#cbd5e1' },
        ].map(c => {
          let count = 0;
          if (c.key === 'active') count = deliveries.filter(d => !['Delivered','Archived','Completed'].includes(d.status)).length + repairs.filter(r => r.status !== 'Returned').length + pickups.filter(p => p.status !== 'Completed' && p.status !== 'Canceled').length;
          else if (c.key === 'today') count = mergedLive.filter(d => d.date === today && !['Archived', 'Returned'].includes(d.status)).length;
          else if (c.key === 'returns') count = deliveries.filter(d => ['return', 'exchange'].includes(d.flagged) && !['Delivered','Archived','Completed'].includes(d.status) && d.flagged !== 'repair').length;
          else if (c.key === 'repairs') count = repairs.filter(r => r.status !== 'Returned').length + deliveries.filter(d => (!['Delivered', 'Archived', 'Completed'].includes(d.status)) && (d.flagged === 'repair' || ['Repair on site', 'Schedule'].includes(d.status))).length;
          else count = pastResults.length;

          const isActive = filterTab === c.key;

          return (
            <button key={c.key} onClick={() => setFilterTab(c.key)} style={{ 
              flex: '1 1 calc(20% - 6px)', minWidth: 60, background: c.bg, border: `2px solid ${isActive ? c.color : c.border}`, borderRadius: 12, padding: '12px 2px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
              cursor: 'pointer', opacity: isActive ? 1 : 0.7, transform: isActive ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s'
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.key === 'past' && count === 0 ? '🔍' : count}</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: c.color, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</span>
            </button>
          );
        })}
      </div>

      {filterTab === 'past' && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
          <input 
            type="text" 
            placeholder="Search past by name, address, order #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchPast()}
            style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14 }}
          />
          <button onClick={handleSearchPast} disabled={isSearching} style={{ padding: '0 20px', borderRadius: 10, background: 'var(--primary)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            {isSearching ? '...' : 'Search'}
          </button>
        </div>
      )}

      {/* Tabs */}
      {filterTab !== 'past' && (
        <div style={{ display: 'flex', background: 'var(--surface)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 20 }}>
          <button 
            onClick={() => setViewMode('list')}
            style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--text-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >List</button>
          <button 
            onClick={() => setViewMode('calendar')}
            style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', background: viewMode === 'calendar' ? 'var(--primary)' : 'transparent', color: viewMode === 'calendar' ? '#fff' : 'var(--text-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >Calendar</button>
        </div>
      )}

      {viewMode === 'calendar' && filterTab !== 'past' ? (
        <TeamCalendarCarousel 
          deliveries={teamVisible}
          onEditDelivery={(d) => {
            if (d._type === 'repair') {
              onEditRepair && onEditRepair(d.originalRepair);
            } else {
              setActiveId(d.id);
            }
          }}
        />
      ) : teamVisible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{filterTab === 'past' ? '🔍' : '🚛'}</div>
          <div style={{ fontSize: 16, color: 'var(--text-light)' }}>
            {filterTab === 'past' ? 'Search to find past deliveries' : 'No deliveries assigned'}
          </div>
        </div>
      ) : (
        <>
          {/* Today */}
          {todayStops.length > 0 && filterTab !== 'past' && (() => {
            const todayByTeam = todayStops.reduce((acc, d) => {
              const team = d.deliveryTeam || 'Unassigned';
              if (!acc[team]) acc[team] = [];
              acc[team].push(d);
              return acc;
            }, {});
            const teams = Object.keys(todayByTeam).sort((a,b) => {
              if (a === 'Unassigned') return 1;
              if (b === 'Unassigned') return -1;
              return a.localeCompare(b);
            });
            return (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0b7a4a', textTransform: 'uppercase', letterSpacing: 1 }}>
                    📅 Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-light)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={groupByTeam} onChange={e => setGroupByTeam(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                    Split by Team
                  </label>
                </div>
                
                {groupByTeam ? (
                  <div className="team-swimlanes" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
                    {teams.map((teamName) => (
                      <div key={teamName} className="team-lane" style={{ flex: '1 1 320px', minWidth: 280, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>🚚 {teamName}</span>
                          <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
                            {todayByTeam[teamName].length} stops
                          </span>
                        </div>
                        {todayByTeam[teamName].map((d, i) => (
                            <StopCard key={d.id} delivery={d} stopNum={i + 1} onSelect={() => d._type === 'repair' ? onEditRepair && onEditRepair(d.originalRepair) : (d._type === 'pickup' ? alert("Warehouse Pickups are managed via Command Center") : setActiveId(d.id))} showDate={false} onUpdateRepairStatus={onUpdateRepairStatus} onUpdatePickupStatus={onUpdatePickupStatus} onSign={() => setSignerDelivery(d)} />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {todayStops.map((d, i) => (
                        <StopCard key={d.id} delivery={d} stopNum={i + 1} onSelect={() => d._type === 'repair' ? onEditRepair && onEditRepair(d.originalRepair) : (d._type === 'pickup' ? alert("Warehouse Pickups are managed via Command Center") : setActiveId(d.id))} showDate={false} onUpdateRepairStatus={onUpdateRepairStatus} onUpdatePickupStatus={onUpdatePickupStatus} onSign={() => setSignerDelivery(d)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Upcoming / Past — grouped by date */}
          {sortedOtherDates.filter(dateKey => filterTab !== 'today' || dateKey === today).map(dateKey => (
            <div key={dateKey} style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                📋 {fmtHeader(dateKey)}
              </h3>
              {otherByDate[dateKey].map((d, i) => (
                <StopCard key={d.id} delivery={d} stopNum={i + 1} onSelect={() => d._type === 'repair' ? onEditRepair && onEditRepair(d.originalRepair) : setActiveId(d.id)} onUpdateRepairStatus={onUpdateRepairStatus} onUpdatePickupStatus={onUpdatePickupStatus} onSign={() => setSignerDelivery(d)} />
              ))}
            </div>
          ))}
        </>
      )}

      {signerDelivery && <DocumentSigner delivery={signerDelivery} onClose={() => setSignerDelivery(null)} />}
    </div>
  );
}

function StopCard({ delivery: d, stopNum, onSelect, showDate, onUpdateRepairStatus, onUpdatePickupStatus, onSign }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRepair = d._type === 'repair' || d.flagged === 'repair' || ['Repair on site', 'Schedule'].includes(d.status);
  const isPickup = d._type === 'pickup';
  const isBatchPickup = d._type === 'batch_pickup';

  const handleQuickComplete = async (e) => {
    e.stopPropagation();
    const newStatus = d.status === 'Completed' ? 'Scheduled' : 'Completed';
    if (isPickup && onUpdatePickupStatus) onUpdatePickupStatus(d.originalPickup.id, newStatus);
    if (isBatchPickup) {
      await supabase.from('batch_pickups').update({ status: newStatus }).eq('id', d.originalBatch.id);
      // Let the channel listener or next refresh update the UI
    }
    if (d._type === 'repair' && onUpdateRepairStatus) onUpdateRepairStatus(d.originalRepair.id, newStatus);
  };

  if (isBatchPickup) {
    return (
      <div style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', borderLeftWidth: 6, borderLeftColor: '#1e3a8a', borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer', flex: 1, paddingRight: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              [#{stopNum}] 🚀 MASTER BATCH PICKUP
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{d.clientName}</div>
            <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 6 }}>{d.address}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#374151', flexWrap: 'wrap' }}>
              {showDate && d.date && <span>📅 {fmtDate(d.date)}</span>}
              {d.timeWindow && <span>🕐 {d.timeWindow}</span>}
              {isExpanded ? '🔽 hide items' : '▶️ view items'}
            </div>
          </div>
          <div onClick={handleQuickComplete} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, border: '2px solid #1e3a8a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.status === 'Completed' ? '#1e3a8a' : '#fff' }}>
              {d.status === 'Completed' && <span style={{ color: '#fff', fontSize: 18, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#1e3a8a', marginTop: 4 }}>COMPLETE<br/>BATCH</span>
          </div>
        </div>
        
        {isExpanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #c7d2fe', fontSize: 13, color: '#111827' }}>
            {d.originalBatch?.vendors_list && d.originalBatch.vendors_list.map((ven, idx) => (
              <div key={idx} style={{ marginBottom: 16, background: '#f8fafc', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1e3a8a', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏭 {ven.vendorName}</span>
                  {ven.showroomStock && <span style={{ fontSize: 10, background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: 4 }}>SHOWROOM</span>}
                </div>
                {ven.orders && ven.orders.map((ord, oIdx) => (
                  <div key={oIdx} style={{ marginTop: 8, paddingLeft: 8, borderLeft: '3px solid #cbd5e1' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>PO: {ord.orderNum}</div>
                    <ul style={{ margin: 0, paddingLeft: 16, color: '#334155' }}>
                      {ord.items && ord.items.map((it, iIdx) => (
                        <li key={iIdx}>
                          <strong>{it.qty}x</strong> {it.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isPickup) {
    return (
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeftWidth: 6, borderLeftColor: '#2563eb', borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer', flex: 1, paddingRight: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              [#{stopNum}] 🏭 Warehouse Pickup
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e3a8a', marginBottom: 2 }}>{d.clientName.replace('🏭 ', '')}</div>
            <div style={{ fontSize: 13, color: '#3b82f6', marginBottom: 6 }}>{d.address}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#1e3a8a', flexWrap: 'wrap' }}>
              {showDate && d.date && <span>📅 {fmtDate(d.date)}</span>}
              {d.timeWindow && <span>🕐 {d.timeWindow}</span>}
              {isExpanded ? '🔽 hide' : '▶️ details'}
            </div>
          </div>
          <div onClick={handleQuickComplete} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, border: '2px solid #2563eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.status === 'Completed' ? '#2563eb' : '#fff' }}>
              {d.status === 'Completed' && <span style={{ color: '#fff', fontSize: 18, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>DONE</span>
          </div>
        </div>
        
        {isExpanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #bfdbfe', fontSize: 13, color: '#1e3a8a' }}>
             {d.originalPickup?.warehouse_name && <div style={{ marginBottom: 4 }}><strong>Warehouse ID:</strong> {d.originalPickup.warehouse_name}</div>}
             {d.originalPickup?.order_number && <div style={{ marginBottom: 4 }}><strong>Order #:</strong> {d.originalPickup.order_number}</div>}
             {d.originalPickup?.items_list && <div style={{ marginBottom: 4 }}><strong>Items:</strong> {d.originalPickup.items_list}</div>}
             <div style={{ marginBottom: 4 }}><strong>Notes:</strong> {d.originalPickup?.notes || 'No notes provided.'}</div>
             <button onClick={onSelect} style={{ marginTop: 8, padding: '8px 16px', background: '#dbeafe', color: '#1e3a8a', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📝 Open Editor via Command Center</button>
          </div>
        )}
      </div>
    );
  }
  
  if (isRepair) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderLeftWidth: 6, borderLeftColor: '#c53030', borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer', flex: 1, paddingRight: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#c53030', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              [#{stopNum}] 🔧 Repair Routing
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#c53030', marginBottom: 2 }}>{d.clientName}</div>
            <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 6 }}>{d.address}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#c53030', flexWrap: 'wrap' }}>
              {showDate && d.date && <span>📅 {fmtDate(d.date)}</span>}
              {d.timeWindow && <span>🕐 {d.timeWindow}</span>}
              {isExpanded ? '🔽 hide' : '▶️ details'}
            </div>
          </div>
          {d._type === 'repair' && (
            <div onClick={handleQuickComplete} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, border: '2px solid #c53030', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.status === 'Completed' ? '#c53030' : '#fff' }}>
                {d.status === 'Completed' && <span style={{ color: '#fff', fontSize: 18, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#c53030', marginTop: 4 }}>DONE</span>
            </div>
          )}
        </div>
        {isExpanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #fca5a5', fontSize: 13, color: '#991b1b' }}>
             {d.originalRepair?.notes && <div style={{ marginBottom: 4 }}><strong>Notes:</strong> {d.originalRepair.notes}</div>}
             <button onClick={onSelect} style={{ marginTop: 8, padding: '8px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📝 Open Full Repair Form</button>
          </div>
        )}
      </div>
    );
  }

  // Items from legacy packing list or unified
  const items = d.items?.filter(it => it.description) ||
    (d.packingList || []).map(it => ({ description: it.text || it, delivered: false }));
  const checkedCount = items.filter(it => it.delivered).length;
  const isInProgress = d.status === 'In Progress';
  const isReturn = !!d.flagged && d.flagged !== 'repair';

  return (
    <div
      onClick={onSelect}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--surface)',
        border: `2px solid ${isInProgress ? '#2563eb' : isReturn ? '#7c3aed' : 'var(--border)'}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 10,
        boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
        transition: 'var(--transition)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: isReturn ? '#7c3aed' : '#0b7a4a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          [#{stopNum}] {isReturn ? `🔄 ${d.flagged} Pickup` : `Standard Delivery`}
        </span>
        {isInProgress && (
          <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#eef0f7', color: '#2563eb' }}>
            IN PROGRESS
          </span>
        )}
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>{d.clientName}</div>
      <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>{d.address}</div>

      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-light)', flexWrap: 'wrap', alignItems: 'center' }}>
        {showDate && d.date && <span>📅 {fmtDate(d.date)}</span>}
        {d.timeWindow && <span>🕐 {d.timeWindow}</span>}
        <span>📦 {items.length} item{items.length !== 1 ? 's' : ''}</span>
        {d.deliveryTeam && <span>👥 {d.deliveryTeam}</span>}
        {checkedCount > 0 && <span style={{ color: '#0b7a4a', fontWeight: 700 }}>✓ {checkedCount}/{items.length}</span>}
      </div>

      {d.source === 'LAHSA' && d.base_doc_url && (
        <div 
          onClick={(e) => { e.stopPropagation(); onSign && onSign(); }}
          style={{ 
            marginTop: 12, padding: '12px', background: '#0b7a4a', color: '#fff', 
            borderRadius: 8, fontSize: 14, fontWeight: 700, display: 'flex', 
            alignItems: 'center', justifyContent: 'center', gap: 8, 
            boxShadow: '0 2px 4px rgba(11,122,74,0.2)'
          }}
        >
          📄 Open & Sign MDG Acknowledgment
        </div>
      )}
    </div>
  );
}
