import React, { useMemo, useState } from 'react'
import ArticlePanel from './ArticlePanel'

export default function Dashboard({ emergencies = [], users = [], evacCenters = [], onOpenAssign = ()=>{} }) {
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

  const card = (title, value, subtitle, IconElem, accent = 'bg-slate-800') => (
    <div className="flex-1 bg-slate-900 rounded-xl shadow-lg p-4 flex items-center gap-4 border border-slate-700 hover:border-slate-600 hover:shadow-xl transition-all">
      <div className={`p-3 rounded-md ${accent} text-white`}>{IconElem}</div>
      <div>
        <div className="text-sm text-slate-400">{title}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
      </div>
    </div>
  )

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
            return (
              <li key={e.id} className="py-3 flex items-start justify-between hover:bg-slate-800 p-2 rounded transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-white">{e.type}</div>
                    <div className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-slate-400 mt-1">{e.description || '—'}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    Resident: <span className="font-medium text-slate-300">{e.user?.name || e.userId}</span> • Responder: <span className="font-medium text-slate-300">{e.responder?.name || '—'}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {card('Active Emergencies', activeEmergencies, `${totalEmergencies} total`, <ChartIcon />, 'bg-red-900')}
        {card('In Progress', inProgress, 'Being handled by responders', <MapIconSvg />, 'bg-orange-900')}
        {card('Unassigned', unassignedEmergencies, 'Awaiting assignment', <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v9M6 12h12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>, 'bg-yellow-900')}
        {card('Available Responders', availableResponders, `${totalResponders} total • ${vehicleUnavailable} vehicle unavailable`, <UsersIcon />, 'bg-emerald-900')}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-xl shadow-lg p-4 border border-slate-700 hover:border-slate-600 transition-all">
          <h3 className="font-semibold mb-2 text-white">Evacuation Centers</h3>
          <ul className="divide-y divide-slate-700 max-h-64 overflow-auto">
            {evacCenters.slice(0, 6).map(c => (
              <li key={c.id} className="py-2 flex items-center justify-between hover:bg-slate-800 px-2 rounded transition-colors">
                <div>
                  <div className="font-medium text-white">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.location?.lat?.toFixed(4)},{c.location?.lng?.toFixed(4)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <ArticlePanel />
        </div>
      </div>
    </div>
  )
}
