import React, { useEffect, useState } from 'react'
import api from '../services/api'

function renderPayload(eventType, payload){
  if(!payload) return '-'
  try{
    switch((eventType||'').toUpperCase()){
      case 'CREATED': {
        const who = payload.user?.name || payload.user?.id || 'Unknown'
        return (
          <div>
            <div className="font-medium">Reported by {who}</div>
            <div className="text-xs text-slate-500">{payload.description || '—'}</div>
            <div className="text-xs text-slate-400 mt-1">Priority: {payload.priority || '-'}</div>
          </div>
        )
      }
      case 'ASSIGNED': {
        const rid = payload.responderName || payload.responderId || payload.responder || 'Unknown'
        const at = payload.assignedAt ? new Date(payload.assignedAt).toLocaleString() : '-'
        return <div>Responder <span className="font-semibold">{rid}</span> assigned at <span title={payload.assignedAt} className="font-mono text-xs">{at}</span></div>
      }
      case 'RESOLVED': {
        const at = payload.resolvedAt ? new Date(payload.resolvedAt).toLocaleString() : (payload.resolvedAt || '-')
        return <div>Resolved at <span className="font-mono text-xs">{at}</span></div>
      }
      case 'RESPONDER_LOCATION': {
        const loc = payload.location || payload
        const lat = loc.lat || loc.latitude || (loc.coords && loc.coords.latitude)
        const lng = loc.lng || loc.longitude || (loc.coords && loc.coords.longitude)
        if(lat && lng){
          const map = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
          return <div><a className="text-sky-600 underline" href={map} target="_blank" rel="noreferrer">Responder at {lat.toFixed(6)},{lng.toFixed(6)}</a> <div className="text-xs text-slate-400">{payload.ts ? new Date(payload.ts).toLocaleString() : ''}</div></div>
        }
        return JSON.stringify(payload)
      }
      case 'ARRIVED': {
        const who = payload.responderName || payload.responderId || 'Responder'
        const at = payload.arrivedAt ? new Date(payload.arrivedAt).toLocaleString() : (payload.ts ? new Date(payload.ts).toLocaleString() : '-')
        return <div>Responder <span className="font-semibold">{who}</span> arrived at <span title={payload.arrivedAt} className="font-mono text-xs">{at}</span></div>
      }
      case 'ACCEPTED': {
        const who = payload.responderName || payload.responderId || 'Responder'
        const at = payload.acceptedAt ? new Date(payload.acceptedAt).toLocaleString() : (payload.ts ? new Date(payload.ts).toLocaleString() : '-')
        return <div>Responder <span className="font-semibold">{who}</span> accepted assignment at <span title={payload.acceptedAt} className="font-mono text-xs">{at}</span></div>
      }
      case 'DISPATCHED': {
        const who = payload.responderName || payload.responderId || 'Unknown'
        const vehCount = payload.vehicleIds ? payload.vehicleIds.length : 0
        const at = payload.dispatchedAt ? new Date(payload.dispatchedAt).toLocaleString() : '-'
        return (
          <div>
            <div>Responder <span className="font-semibold">{who}</span> dispatched with <span className="font-semibold">{vehCount} vehicle(s)</span></div>
            <div className="text-xs text-slate-500 mt-1">Dispatched at <span className="font-mono">{at}</span></div>
            {vehCount > 0 && payload.vehicleIds && (
              <div className="text-xs text-slate-500 mt-1">Vehicles: {payload.vehicleIds.join(', ')}</div>
            )}
          </div>
        )
      }
      default:
        return <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(payload, null, 2)}</pre>
    }
  }catch(e){ return <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(payload, null, 2)}</pre> }
}

export default function EmergencyHistoryModal({ emergencyId, onClose }){
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    if(!emergencyId) return
    setLoading(true)
    api.get(`/emergencies/${emergencyId}/history`).then(r=>{ setRows(r.data) }).catch(e=>{ setRows({ error: e?.response?.data || String(e) }) }).finally(()=>setLoading(false))
  },[emergencyId])

  if(!emergencyId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-2xl p-4 w-full max-w-3xl z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Emergency History</h3>
          <button className="px-2 py-1 bg-slate-100 rounded" onClick={onClose}>Close</button>
        </div>
        {loading && <div>Loading...</div>}
        {!loading && rows && rows.error && <div className="text-red-600">Error: {String(rows.error)}</div>}
        {!loading && rows && Array.isArray(rows) && (
          <div className="overflow-y-auto max-h-[60vh]">
            {/* Response time summary */}
            {(() => {
              try {
                const created = rows.find(r => (r.event_type||'').toUpperCase() === 'CREATED')
                const accepted = rows.find(r => (r.event_type||'').toUpperCase() === 'ACCEPTED')
                const arrived = rows.find(r => (r.event_type||'').toUpperCase() === 'ARRIVED')
                const createdAt = created ? new Date(created.created_at || created.payload?.createdAt || created.payload?.ts || created.payload?.time) : null
                const acceptedAt = accepted ? new Date(accepted.created_at || accepted.payload?.acceptedAt || accepted.payload?.ts || accepted.payload?.time) : null
                const arrivedAt = arrived ? new Date(arrived.created_at || arrived.payload?.arrivedAt || arrived.payload?.ts || arrived.payload?.time) : null
                const toSecs = (d) => d ? Math.round((d.getTime())/1000) : null
                const secs = (a,b) => (a && b) ? Math.max(0, Math.round((b.getTime()-a.getTime())/1000)) : null
                const tRequestToAccept = secs(createdAt, acceptedAt)
                const tAcceptToArrive = secs(acceptedAt, arrivedAt)
                const tRequestToArrive = secs(createdAt, arrivedAt)
                return (
                  <div className="mb-4 p-3 bg-white rounded shadow-sm">
                    <div className="text-sm text-slate-700 font-medium">Response Summary</div>
                    <div className="text-xs text-slate-500 mt-2">{createdAt ? `Requested: ${createdAt.toLocaleString()}` : 'Requested: -'}</div>
                    <div className="text-xs text-slate-500">{acceptedAt ? `Accepted: ${acceptedAt.toLocaleString()}` : 'Accepted: -'}</div>
                    <div className="text-xs text-slate-500">{arrivedAt ? `Arrived: ${arrivedAt.toLocaleString()}` : 'Arrived: -'}</div>
                    <div className="mt-2 text-sm">
                      {tRequestToAccept !== null && <div>Time to accept: <strong>{Math.floor(tRequestToAccept/60)}m {tRequestToAccept%60}s</strong></div>}
                      {tAcceptToArrive !== null && <div>Time from accept to arrive: <strong>{Math.floor(tAcceptToArrive/60)}m {tAcceptToArrive%60}s</strong></div>}
                      {tRequestToArrive !== null && <div>Total response time: <strong>{Math.floor(tRequestToArrive/60)}m {tRequestToArrive%60}s</strong></div>}
                    </div>
                  </div>
                )
              } catch(e){ return null }
            })()}
            <ul className="space-y-3">
              {rows.map(r=> (
                <li key={r.id} className="p-3 bg-slate-50 rounded flex items-start gap-3">
                  <div className="w-40 text-xs text-slate-500 font-mono">{new Date(r.created_at).toLocaleString()}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.event_type}</div>
                      <div className="text-xs text-slate-400" title={JSON.stringify(r.payload || {}, null, 2)}>Details</div>
                    </div>
                    <div className="mt-1 text-sm text-slate-700">{renderPayload(r.event_type, r.payload)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
