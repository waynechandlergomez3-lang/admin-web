import React, { useMemo, useState } from 'react'
import ArticlePanel from './ArticlePanel'
import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Dashboard({ emergencies = [], users = [], vehicles = [], evacCenters = [], onOpenAssign = ()=>{} }) {
  const [inventorySummary, setInventorySummary] = useState({ totalItems: 0, totalQuantity: 0 })
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
  const totalResponders = users.filter(u => u.role === 'RESPONDER').length
  const availableResponders = users.filter(u => u.role === 'RESPONDER' && u.responderStatus === 'AVAILABLE').length
  const vehicleUnavailable = users.filter(u => u.role === 'RESPONDER' && u.responderStatus === 'VEHICLE_UNAVAILABLE').length
  const unassignedEmergencies = Math.max(0, activeEmergencies - inProgress)

  const IconPlaceholder = ({ children }) => (
    <div className="p-3 rounded-md bg-slate-700 text-white w-11 h-11 flex items-center justify-center">{children}</div>
  )

  const card = (title, value, subtitle, IconElem, accent = 'bg-slate-100') => (
    <div className="flex-1 bg-white rounded-xl shadow p-4 flex items-center gap-4 border border-slate-200 hover:bg-slate-50 hover:shadow-md transition-all">
      <div className={`p-3 rounded-md ${accent} text-white`}>{IconElem}</div>
      <div>
        <div className="text-sm text-slate-500">{title}</div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
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
  <div className="space-y-6 bg-slate-950 min-h-screen p-4 dark-theme">
      {/* Emergencies shown on top */}
      <div className="bg-slate-900 rounded-xl shadow-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Emergencies (top priority)</h3>
          <div className="text-sm text-slate-400">{filteredEmergencies.length} shown</div>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm text-slate-300">Priority:</label>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-2 py-1 border border-slate-600 rounded bg-slate-800 text-slate-200 hover:border-slate-500 focus:border-slate-400">
            <option value="ALL">All</option>
            <option value="1">High (1)</option>
            <option value="2">Medium (2)</option>
            <option value="3">Low (3)</option>
          </select>
          <label className="text-sm text-slate-300">Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1 border border-slate-600 rounded bg-slate-800 text-slate-200 hover:border-slate-500 focus:border-slate-400">
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <label className="text-sm text-slate-300">Barangay:</label>
          <select value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)} className="px-2 py-1 border border-slate-600 rounded bg-slate-800 text-slate-200 hover:border-slate-500 focus:border-slate-400">
            <option value="ALL">All</option>
            {barangays.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 transition-colors text-slate-200" onClick={() => { setPriorityFilter('ALL'); setStatusFilter('ALL'); setBarangayFilter('ALL') }}>Clear</button>
        </div>
        <ul className="divide-y divide-slate-700 max-h-80 overflow-auto">
          {filteredEmergencies.slice(0, 10).map(e => {
            const priority = String(e.priority).toLowerCase()
            const residentName = users.find(u => u.id === e.userId)?.name || e.user?.name || e.userId
            const responderName = users.find(u => u.id === e.responderId)?.name || e.responder?.name || '—'
            return (
              <li key={e.id} className="py-3 flex items-start justify-between hover:bg-slate-800 p-2 rounded transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-white">{e.type}</div>
                    <div className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-slate-400 mt-1">{e.description || '—'}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    Resident: <span className="font-medium text-slate-300">{residentName}</span> • Responder: <span className="font-medium text-slate-300">{responderName}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`text-sm font-semibold ${priority === 'high' || priority === '1' ? 'text-rose-400' : priority === 'medium' || priority === '2' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {String(e.priority || '-').toUpperCase()}
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-slate-700 rounded text-slate-200 hover:bg-slate-600 transition-colors" onClick={() => { window.dispatchEvent(new CustomEvent('openHistory', { detail: { id: e.id } })) }}>History</button>
                    <button className="px-3 py-1 rounded text-white" style={{ backgroundColor: e.responderId ? '#7f1d1d' : '#991b1b' }} disabled={!!e.responderId} onClick={() => onOpenAssign(e)}>
                      Assign
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {card('Active Emergencies', activeEmergencies, `${totalEmergencies} total`, <ChartIcon />, 'bg-red-900')}
        {card('In Progress', inProgress, 'Being handled by responders', <MapIconSvg />, 'bg-orange-900')}
        {card('Unassigned', unassignedEmergencies, 'Awaiting assignment', <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v9M6 12h12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>, 'bg-yellow-900')}

        {/* Vehicle summary card */}
        {(() => {
          const totalVehicles = (vehicles || []).length
          const activeVehicles = (vehicles || []).filter(v => v.active).length
          const assignedVehicles = (vehicles || []).filter(v => v.responderId).length
          const availableVehicles = (vehicles || []).filter(v => v.active && !v.responderId).length
          return card('Fleet', totalVehicles, `${activeVehicles} active • ${assignedVehicles} assigned • ${availableVehicles} available`, <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 13h14l2 3v3H3v-6zM7 13V8h4v5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, 'bg-sky-800')
        })()}

        {card('Available Responders', availableResponders, `${totalResponders} total • ${vehicleUnavailable} vehicle unavailable`, <UsersIcon />, 'bg-emerald-900')}
        {card('Inventory', inventorySummary.totalItems, `${inventorySummary.totalQuantity} total units`, <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, 'bg-violet-900')}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-slate-200 hover:bg-slate-50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Evacuation Centers</h3>
            <div className="text-sm text-slate-500">{evacCenters.length} total</div>
          </div>

          <ul className="space-y-3 max-h-72 overflow-auto">
            {evacCenters.slice(0, 6).map(c => {
              const cap = c.capacity || 0
              const occ = c.currentCount || 0
              const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0
              const available = Math.max(0, cap - occ)
              const statusOpen = Boolean(c.isActive)
              return (
                <li key={c.id} className="p-3 bg-white rounded-lg hover:bg-slate-50 transition-colors border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-rose-50 text-rose-600 w-12 h-12 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" strokeWidth="1.5" />
                      </svg>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.address || `${c.location?.lat?.toFixed(4)}, ${c.location?.lng?.toFixed(4)}`}</div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`text-xs font-semibold px-2 py-1 rounded ${statusOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{statusOpen ? 'Open' : 'Closed'}</div>
                          <div className="text-xs text-slate-500 mt-2">{available} avail • {pct}%</div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="h-2 bg-slate-100 rounded overflow-hidden">
                          <div className="h-2 bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2z"/></svg> {c.contactNumber || 'No contact'}</div>
                          <div className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18"/></svg> {c.facilities ? (Array.isArray(c.facilities) ? c.facilities.join(', ') : String(c.facilities)) : 'Facilities unknown'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button className="px-3 py-1 rounded bg-slate-50 text-sm border" onClick={()=>navigator.clipboard.writeText(`${c.location?.lat},${c.location?.lng}`)}>Copy coords</button>
                    <button className="px-3 py-1 rounded bg-yellow-50 text-sm border" onClick={()=>{ window.location.hash = '#/evac'; window.dispatchEvent(new CustomEvent('openEvacEdit', { detail: { id: c.id } })) }}>Manage</button>
                    <button className="px-3 py-1 rounded bg-red-50 text-sm border" onClick={async ()=>{
                      const confirmClose = window.confirm(`${c.name}: set to ${c.isActive ? 'Closed' : 'Open'}?`)
                      if(!confirmClose) return
                      try{
                        await fetch(`/api/evacuation-centers/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !c.isActive }) })
                        // best-effort local update; global refresh occurs via ws or parent
                        alert('Updated')
                      }catch(e){ console.error(e); alert('Failed to update') }
                    }}>Toggle</button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="space-y-4">
          {/* Fleet snapshot panel inside right column */}
          <div className="bg-white rounded-xl shadow p-4 border border-slate-200 hover:bg-slate-50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-800">Vehicles snapshot</h4>
              <div className="text-sm text-slate-500">{(vehicles||[]).length} vehicles</div>
            </div>
            <ul className="space-y-2 max-h-48 overflow-auto">
              {(vehicles||[]).slice(0,6).map(v => (
                <li key={v.id} className="p-2 bg-white rounded flex items-center justify-between border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                      {/* small icon */}
                      {(() => {
                        const t = (v.model || '').toLowerCase()
                        if(t.includes('ambul')) return <svg className="w-4 h-4 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 13v-4h2l2-3h8l2 3h2v4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        if(t.includes('fire')) return <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 13h14l2 3v3H3v-6z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        if(t.includes('motor')) return <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12h3l2-3h6l2 3h3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        return <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      })()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{v.plateNumber || '—'} <span className="text-xs text-slate-400">{v.model || 'Unknown'}</span></div>
                      <div className="text-xs text-slate-500">{v.responder?.name || v.responderId || 'Unassigned'}</div>
                    </div>
                  </div>
                  <div className="text-xs">
                    <div className={`px-2 py-1 rounded text-xs ${v.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{v.active ? 'Active' : 'Inactive'}</div>
                  </div>
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
