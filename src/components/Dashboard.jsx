import React, { useMemo, useState, useEffect } from 'react'
import ArticlePanel from './ArticlePanel'
import api from '../services/api'

export default function Dashboard({ emergencies = [], users = [], vehicles = [], evacCenters = [], onOpenAssign = ()=>{} }) {
  const [inventorySummary, setInventorySummary] = useState({ totalItems: 0, totalQuantity: 0 })
  const [inventoryItems, setInventoryItems] = useState([])
  const [invFilterResponder, setInvFilterResponder] = useState('')
  const [invFilterAvailability, setInvFilterAvailability] = useState('all')
  const [dashboardTypeFilter, setDashboardTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [barangayFilter, setBarangayFilter] = useState('ALL')

  // derive barangays from users
  const barangays = useMemo(() => {
    const set = new Set();
    (users || []).forEach(u => { if (u.barangay) set.add(u.barangay) })
    return Array.from(set).sort()
  }, [users])

  const filteredEmergencies = useMemo(() => {
    return (emergencies || []).filter(e => {
      if (priorityFilter !== 'ALL') {
        const p = e.priority
        if (String(p).toLowerCase() !== String(priorityFilter).toLowerCase()) return false
      }
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false
      if (barangayFilter !== 'ALL') {
        const userBarangay = e.user?.barangay || null
        if (userBarangay !== barangayFilter) return false
      }
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [emergencies, priorityFilter, statusFilter, barangayFilter])

  // Analytics-oriented metrics
  const totalEmergencies = emergencies.length
  const activeEmergencies = emergencies.filter(e => e.status !== 'RESOLVED').length
  const inProgress = emergencies.filter(e => e.status === 'IN_PROGRESS').length
  const highPriority = emergencies.filter(e => e.priority === 'high' || e.priority === 1).length
  // respect dashboard type filter: include responders who have no responderTypes (treated as unrestricted) or include the selected type
  const respondersFilteredByType = (users||[]).filter(u => u.role === 'RESPONDER' && (dashboardTypeFilter === '' || !Array.isArray(u.responderTypes) || u.responderTypes.length === 0 || (Array.isArray(u.responderTypes) && (u.responderTypes||[]).map(t=>String(t).toUpperCase()).includes(String(dashboardTypeFilter).toUpperCase()))))
  const totalResponders = respondersFilteredByType.length
  const availableResponders = respondersFilteredByType.filter(u => u.responderStatus === 'AVAILABLE').length
  const vehicleUnavailable = respondersFilteredByType.filter(u => u.responderStatus === 'VEHICLE_UNAVAILABLE').length
  const unassignedEmergencies = Math.max(0, activeEmergencies - inProgress)

  const IconPlaceholder = ({ children }) => (
    <div className="p-3 rounded-md bg-slate-700 text-white w-11 h-11 flex items-center justify-center">{children}</div>
  )

  const card = (title, value, subtitle, IconElem, accent = 'bg-slate-700') => (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 hover:border-white/20 hover:bg-white/10 transition-all shadow-2xl">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-3 rounded-xl ${accent} text-white flex-shrink-0`}>{IconElem}</div>
        <div>
          <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider">{title}</div>
          <div className="text-3xl font-bold text-white">{value}</div>
          {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
        </div>
      </div>
    </div>
  )

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await api.get('/inventory/summary')
        if (!mounted) return
        setInventorySummary(res.data || { totalItems: 0, totalQuantity: 0 })
      } catch (e) {
        console.error('Failed to load inventory summary', e)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // load inventory list for dashboard snapshot
  const loadInventoryItems = async (responderId = '', availability = 'all') => {
    try {
      const params = {}
      if (responderId) params.responderId = responderId
      if (availability === 'available') params.available = true
      if (availability === 'unavailable') params.available = false
      const r = await api.get('/inventory', { params })
      setInventoryItems(r.data || [])
    } catch (e) {
      console.error('Failed to load inventory for dashboard', e)
    }
  }

  const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12l3 3 6-6 3 3" />
    </svg>
  )

  const MapIconSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )

  const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M12 12a5 5 0 100-10 5 5 0 000 10z" />
    </svg>
  )

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-xl">🚨</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Emergency Dashboard</h1>
            <p className="text-slate-400">Real-time monitoring & response coordination</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {card('Active Emergencies', activeEmergencies, `${totalEmergencies} total`, <ChartIcon />, 'bg-gradient-to-br from-red-600 to-red-700')}
        {card('In Progress', inProgress, 'Being handled', <MapIconSvg />, 'bg-gradient-to-br from-orange-600 to-orange-700')}
        {card('Unassigned', unassignedEmergencies, 'Need assignment', <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v9M6 12h12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>, 'bg-gradient-to-br from-amber-600 to-amber-700')}
        {card('Available Responders', availableResponders, `${totalResponders} total`, <UsersIcon />, 'bg-gradient-to-br from-emerald-600 to-emerald-700')}
        {card('Fleet Status', (vehicles || []).filter(v => v.active).length, `${(vehicles || []).length} total`, <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 13h14l2 3v3H3v-6zM7 13V8h4v5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, 'bg-gradient-to-br from-sky-600 to-sky-700')}
        {card('Inventory', inventorySummary.totalItems, `${inventorySummary.totalQuantity} units`, <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, 'bg-gradient-to-br from-violet-600 to-violet-700')}
      </div>

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Emergencies List - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-lg">📋</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Active Emergencies</h3>
                  <p className="text-sm text-slate-400">{filteredEmergencies.length} incidents</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">TYPE</label>
                <select value={dashboardTypeFilter} onChange={(e)=>setDashboardTypeFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm hover:border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition">
                  <option value="">All Types</option>
                  {(() => {
                    const s = new Set(); (users||[]).forEach(u => { if(Array.isArray(u.responderTypes)) u.responderTypes.forEach(t=> t && s.add(String(t).toUpperCase())) }); return Array.from(s).map(t => <option key={t} value={t}>{t}</option>)
                  })()}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">PRIORITY</label>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm hover:border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition">
                  <option value="ALL">All Priority</option>
                  <option value="1">🔴 High</option>
                  <option value="2">🟠 Medium</option>
                  <option value="3">🟡 Low</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">STATUS</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm hover:border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition">
                  <option value="ALL">All Status</option>
                  <option value="PENDING">⏳ Pending</option>
                  <option value="IN_PROGRESS">⚡ In Progress</option>
                  <option value="RESOLVED">✓ Resolved</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">BARANGAY</label>
                <select value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-white text-sm hover:border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition">
                  <option value="ALL">All Areas</option>
                  {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-2 flex gap-2">
                <button className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium" onClick={() => { setPriorityFilter('ALL'); setStatusFilter('ALL'); setBarangayFilter('ALL') }}>Reset Filters</button>
              </div>
            </div>

            {/* Emergencies List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900">
              {filteredEmergencies.slice(0, 15).map(e => {
                const priority = String(e.priority).toLowerCase()
                const residentName = users.find(u => u.id === e.userId)?.name || e.user?.name || e.userId
                const responderName = users.find(u => u.id === e.responderId)?.name || e.responder?.name || 'Unassigned'
                const priorityBg = priority === 'high' || priority === '1' ? 'bg-red-900/30 border-red-500/50' : priority === 'medium' || priority === '2' ? 'bg-orange-900/30 border-orange-500/50' : 'bg-yellow-900/30 border-yellow-500/50'
                const priorityBadge = priority === 'high' || priority === '1' ? '🔴' : priority === 'medium' || priority === '2' ? '🟠' : '🟡'
                return (
                  <div key={e.id} className={`p-4 rounded-xl border border-slate-700 ${priorityBg} hover:border-slate-500 hover:bg-slate-900/30 transition-all cursor-pointer`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{priorityBadge}</span>
                          <span className="font-bold text-white">{e.type}</span>
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">{e.status}</span>
                        </div>
                        <p className="text-sm text-slate-300">{e.description || 'No description'}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleTimeString()}</div>
                        <div className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div>
                        <span className="text-slate-300 font-medium">{residentName}</span>
                        <span className="text-slate-500"> → </span>
                        <span className={`font-medium ${e.responderId ? 'text-emerald-400' : 'text-amber-400'}`}>{responderName}</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition" onClick={() => { window.dispatchEvent(new CustomEvent('openHistory', { detail: { id: e.id } })) }}>View</button>
                        {!e.responderId && <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition font-medium" onClick={() => onOpenAssign(e)}>Assign</button>}
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredEmergencies.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">✓ No emergencies matching filters</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Inventory snapshot panel */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-violet-600/20 rounded-lg flex items-center justify-center">
                <span className="text-lg">📦</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Inventory</h3>
                <p className="text-xs text-slate-400">{inventorySummary.totalItems} items • {inventorySummary.totalQuantity} units</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <select
                value={invFilterResponder}
                onChange={(e) => setInvFilterResponder(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm hover:border-violet-500 focus:border-violet-500 transition"
              >
                <option value="">All Responders</option>
                { (users||[]).filter(u => u.role === 'RESPONDER' && (dashboardTypeFilter === '' || !Array.isArray(u.responderTypes) || u.responderTypes.length === 0 || (Array.isArray(u.responderTypes) && (u.responderTypes||[]).map(t=>String(t).toUpperCase()).includes(String(dashboardTypeFilter).toUpperCase())))).map((r) => (
                  <option key={r.id} value={r.id}>{r.name || r.email}</option>
                ))}
              </select>

              <select
                value={invFilterAvailability}
                onChange={(e) => setInvFilterAvailability(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm hover:border-violet-500 focus:border-violet-500 transition"
              >
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            <button
              className="w-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition mb-4"
              onClick={() => loadInventoryItems(invFilterResponder, invFilterAvailability)}
            >
              Refresh Inventory
            </button>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-slate-400 py-2">Responder</th>
                    <th className="text-left text-slate-400 py-2">Item</th>
                    <th className="text-left text-slate-400 py-2">Qty</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {inventoryItems.slice(0, 8).map((it) => (
                    <tr key={it.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2">{it.responder?.name || '—'}</td>
                      <td className="py-2">{it.name}</td>
                      <td className="py-2">{it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evacuation Centers */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center">
                <span className="text-lg">🏢</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Evacuation Centers</h3>
                <p className="text-xs text-slate-400">{evacCenters.length} locations</p>
              </div>
            </div>

            <ul className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900">
              {evacCenters.slice(0, 6).map(c => {
                const cap = c.capacity || 0
                const occ = c.currentCount || 0
                const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0
                const available = Math.max(0, cap - occ)
                const statusOpen = Boolean(c.isActive)
                return (
                  <li key={c.id} className="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 border border-slate-700 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.address || `${c.location?.lat?.toFixed(4)}, ${c.location?.lng?.toFixed(4)}`}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${statusOpen ? 'bg-emerald-600/20 text-emerald-300' : 'bg-slate-600/20 text-slate-300'}`}>{statusOpen ? '✓ Open' : 'Closed'}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded overflow-hidden mb-2">
                      <div className="h-2 bg-gradient-to-r from-emerald-600 to-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{occ}/{cap} occupants</span>
                      <span>{available} available</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Vehicles Snapshot */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-sky-600/20 rounded-lg flex items-center justify-center">
                <span className="text-lg">🚗</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Fleet Status</h3>
                <p className="text-xs text-slate-400">{(vehicles||[]).length} vehicles</p>
              </div>
            </div>

            <ul className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900">
              {(vehicles||[]).slice(0,8).map(v => (
                <li key={v.id} className="p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 border border-slate-700 transition flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-600/20 flex items-center justify-center text-sky-300 text-sm font-bold">
                      🚗
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">{v.plateNumber || 'Unknown'}</div>
                      <div className="text-xs text-slate-400">{v.responder?.name || 'Unassigned'}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${v.active ? 'bg-emerald-600/20 text-emerald-300' : 'bg-slate-600/20 text-slate-300'}`}>{v.active ? 'Active' : 'Inactive'}</span>
                </li>
              ))}
            </ul>
          </div>

          <ArticlePanel />
        </div>
      </div>
    </div>
  )
}
