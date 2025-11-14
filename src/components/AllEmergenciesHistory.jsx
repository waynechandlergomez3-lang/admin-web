import React, { useEffect, useState, useMemo } from 'react'
import api from '../services/api'
import EmergencyHistoryModal from './EmergencyHistoryModal'

function Pill({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

/** small colored dot (no icons) */
function Dot({ className = '' }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${className}`} />
}

/**
 * Safely extract a Date object from a row.
 * Tries several common timestamp field names and falls back to null.
 */
function getDateFromRow(r) {
  if (!r || typeof r !== 'object') return null
  const candidates = [
    'createdAt', 'created_at', 'timestamp', 'time', 'date',
    'last_event_at', 'last_event_time', 'lastEventAt', 'event_time', 'updatedAt', 'updated_at'
  ]
  for (const key of candidates) {
    const val = r[key]
    if (!val) continue
    if (val instanceof Date) return val
    if (typeof val === 'number') {
      if (String(val).length <= 10) return new Date(val * 1000)
      return new Date(val)
    }
    if (typeof val === 'string') {
      const parsed = new Date(val)
      if (!Number.isNaN(parsed.getTime())) return parsed
      const alt = Date.parse(val.replace(/\.\d+Z?$/, ''))
      if (!Number.isNaN(alt)) return new Date(alt)
    }
  }
  try {
    const payload = r.last_event_payload
    if (payload && typeof payload === 'object') {
      if (payload.time) {
        const p = new Date(payload.time)
        if (!Number.isNaN(p.getTime())) return p
      }
      if (payload.timestamp) {
        const t = new Date(payload.timestamp)
        if (!Number.isNaN(t.getTime())) return t
      }
    }
  } catch (e) {/* ignore */}
  return null
}

/** Format date heading in words */
function formatDateHeading(date) {
  if (!date) return 'Unknown date'
  const now = new Date()
  const yearNow = now.getFullYear()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const dMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dMidnight.getTime() === today.getTime()) return 'Today'
  if (dMidnight.getTime() === yesterday.getTime()) return 'Yesterday'
  const diffDays = Math.round((today - dMidnight) / (1000 * 60 * 60 * 24))
  if (diffDays > 0 && diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' })
  }
  const sameYear = date.getFullYear() === yearNow
  return date.toLocaleDateString(undefined, sameYear
    ? { month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'long', day: 'numeric' }
  )
}

/** Format time portion for a date (e.g., 2:34 PM) */
function formatTime(date) {
  if (!date) return '-'
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function AllEmergenciesHistory() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  const [filters, setFilters] = useState({
    date: '',      // new date filter ('' = all)
    status: '',
    type: '',
    priority: '',
    search: '',
  })

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const res = await api.get('/emergencies/history/all')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error('Failed to fetch emergencies', e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // Derived unique filter options
  const uniqueTypes = useMemo(() => Array.from(new Set(rows.map(r => r.type).filter(Boolean))), [rows])
  const uniquePriorities = useMemo(() => Array.from(new Set(rows.map(r => r.priority).filter(Boolean))), [rows])

  // Enrich rows with resolved Date objects to avoid recomputing
  const enriched = useMemo(() => rows.map(r => ({ ...r, _dateObj: getDateFromRow(r) })), [rows])

  // Date options: gather unique date keys (YYYY-MM-DD or 'unknown'), compute a friendly label for each
  const dateOptions = useMemo(() => {
    const map = new Map()
    for (const r of enriched) {
      const d = r._dateObj
      const key = d ? d.toISOString().slice(0, 10) : 'unknown'
      // keep first date object as representative
      if (!map.has(key)) map.set(key, d || null)
    }
    // convert to array and sort descending (newest first), unknown last
    const entries = Array.from(map.entries())
    entries.sort((a, b) => {
      if (a[0] === 'unknown') return 1
      if (b[0] === 'unknown') return -1
      return b[0].localeCompare(a[0]) * -1
    })
    // map to { key, label }
    return entries.map(([key, dateObj]) => ({ key, label: key === 'unknown' ? 'Unknown date' : formatDateHeading(dateObj) }))
  }, [enriched])

  // Apply filters on enriched rows first, then group them into date buckets
  const filteredGrouped = useMemo(() => {
    const keep = r => {
      // date filter: check row's dateKey
      if (filters.date) {
        const key = r._dateObj ? r._dateObj.toISOString().slice(0, 10) : 'unknown'
        if (filters.date !== key) return false
      }
      if (filters.status && filters.status !== r.status) return false
      if (filters.type && filters.type !== r.type) return false
      if (filters.priority && filters.priority !== r.priority) return false
      if (filters.search) {
        const s = filters.search.toLowerCase()
        const idStr = String(r.id || '').toLowerCase()
        const responder = (r.responder_name || '').toLowerCase()
        const type = (r.type || '').toLowerCase()
        if (!idStr.includes(s) && !responder.includes(s) && !type.includes(s)) return false
      }
      return true
    }

    const map = new Map()
    for (const r of enriched) {
      if (!keep(r)) continue
      const key = r._dateObj ? r._dateObj.toISOString().slice(0, 10) : 'unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }

    const entries = Array.from(map.entries()).map(([key, items]) => {
      items.sort((a, b) => (b._dateObj?.getTime() || 0) - (a._dateObj?.getTime() || 0))
      return [key, items]
    })

    entries.sort((a, b) => {
      if (a[0] === 'unknown') return 1
      if (b[0] === 'unknown') return -1
      return b[0].localeCompare(a[0])
    })

    return entries
  }, [enriched, filters])

  const getStatusPill = status => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Pill className="bg-amber-100 text-amber-800"><Dot className="bg-amber-800" />IN PROGRESS</Pill>
      case 'RESOLVED':
        return <Pill className="bg-green-100 text-green-800"><Dot className="bg-green-800" />Resolved</Pill>
        case 'ARRIVED':
        return <Pill className="bg-purple-100 text-green-800"><Dot className="bg-purple-800" />ARRIVED</Pill>
      case 'PENDING':
        return <Pill className="bg-blue-100 text-blue-800"><Dot className="bg-blue-800" />Pending</Pill>
      case 'CANCELLED':
        return <Pill className="bg-red-100 text-red-800"><Dot className="bg-red-800" />Cancelled</Pill>
      default:
        return <Pill className="bg-slate-100 text-slate-600">{status || '-'}</Pill>
    }
  }

  const getPriorityPill = (priority, row) => {
    // If explicit priority present, use it
    let p = priority
    // If not present, try to infer from payload/user medical conditions or special circumstances
    if (!p && row) {
      try {
        const payload = row.payload || row.last_event_payload || {}
        const user = payload.user || row.user || payload.reporter || {}
        const special = user.specialCircumstances || user.specialCircumstance || user.special || []
        const medical = user.medicalConditions || user.medical || []
        const anySpecial = (Array.isArray(special) ? special : (special ? [special] : [])).length > 0
        const anyMedical = (Array.isArray(medical) ? medical : (medical ? [medical] : [])).length > 0
        if (anySpecial || anyMedical) p = 'HIGH'
      } catch(e) { /* ignore inference errors */ }
    }
    if (!p) return <Pill className="bg-slate-100 text-slate-600">-</Pill>
    const map = {
      HIGH: { cls: 'bg-red-100 text-red-800', dot: 'bg-red-800' },
      MEDIUM: { cls: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-800' },
      LOW: { cls: 'bg-green-100 text-green-800', dot: 'bg-green-800' },
    }
    const info = map[p] || { cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-600' }
    return <Pill className={info.cls}><Dot className={info.dot} />{p}</Pill>
  }

  const clearFilters = () => setFilters({ date: '', status: '', type: '', priority: '', search: '' })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">All Emergencies (Recent)</h3>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 bg-sky-600 text-white rounded text-sm"
            onClick={fetchAll}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 bg-slate-50 p-3 rounded-lg flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Search ID / Responder / Type"
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        />

        <select
          value={filters.date}
          onChange={e => setFilters({ ...filters, date: e.target.value })}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        >
          <option value="">All Dates</option>
          {dateOptions.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="RESOLVED">Resolved</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={filters.priority}
          onChange={e => setFilters({ ...filters, priority: e.target.value })}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        >
          <option value="">All Priorities</option>
          {uniquePriorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={filters.type}
          onChange={e => setFilters({ ...filters, type: e.target.value })}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        >
          <option value="">All Types</option>
          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <button
          className="px-3 py-1 bg-slate-200 rounded text-sm hover:bg-slate-300"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {/* Grouped Table — render per date group */}
      <div className="space-y-6">
        {filteredGrouped.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-4 text-center text-slate-500">No records found</div>
        ) : (
          filteredGrouped.map(([dateKey, items]) => {
            const repDate = items.find(it => it._dateObj)?._dateObj || null
            const heading = formatDateHeading(repDate)
            return (
              <div key={dateKey}>
                <div className="text-sm font-semibold mb-2">{heading} {items.length ? `(${items.length})` : ''}</div>
                <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-2 text-left">ID</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Responder</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Priority</th>
                        <th className="p-2">Last Event</th>
                        <th className="p-2">Time</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(r => (
                        <tr key={String(r.id)} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-xs">{String(r.id).slice(0, 8)}</td>
                          <td className="p-2">{r.type || '-'}</td>
                          <td className="p-2">{r.responder_name || '-'}</td>
                          <td className="p-2">{getStatusPill(r.status)}</td>
                          <td className="p-2">{getPriorityPill(r.priority, r)}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{r.last_event_type || '-'}</div>
                              <div className="text-xs text-slate-400">
                                {(() => {
                                  try {
                                    const p = r.last_event_payload || {}
                                    switch((r.last_event_type||'').toUpperCase()){
                                      case 'CREATED': return <div className="text-xs">Reported by <span className="font-medium">{p.user?.name || '-'}</span></div>
                                      case 'ASSIGNED': return <div className="text-xs">Assigned to <span className="font-medium">{p.responderName || '-'}</span></div>
                                      case 'ARRIVED': return <div className="text-xs">Arrived — <span className="font-medium">{p.responderName || '-'}</span></div>
                                      case 'RESPONDER_LOCATION': return <div className="text-xs">Location update — {p.location ? `${p.location.lat?.toFixed(4)}, ${p.location.lng?.toFixed(4)}` : (p.lat ? `${p.lat},${p.lng}` : '-')}</div>
                                      case 'RESOLVED': return <div className="text-xs">Resolved</div>
                                      default: return <div className="text-xs">{typeof p === 'string' ? p : JSON.stringify(p)}</div>
                                    }
                                  }catch(e){ return <div className="text-xs">{JSON.stringify(r.last_event_payload || {})}</div> }
                                })()}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">{formatTime(r._dateObj)}</td>
                          <td className="p-2">
                            <button className="px-3 py-1 bg-slate-100 rounded" onClick={() => setSelected(r.id)}>History</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
        )}
      </div>

      {selected && <EmergencyHistoryModal emergencyId={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
