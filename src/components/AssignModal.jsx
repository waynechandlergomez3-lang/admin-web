import React, { useEffect, useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

export default function AssignModal({ open, emergency, onClose = ()=>{}, onAssigned = ()=>{} }){
  const [responders, setResponders] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    if(!open) return
    setLoading(true)
    api.get('/users?role=RESPONDER')
      .then(r=>setResponders(r.data||[]))
      .catch(()=>setResponders([]))
      .finally(()=>setLoading(false))
  }, [open])

  const assign = async (id) => {
    if(!emergency) return
  try{ await api.post('/emergencies/assign', { emergencyId: emergency.id, responderId: id }); toast.notify({ type: 'success', message: 'Assigned' }); onAssigned(); onClose() }catch(err){ console.error(err); toast.notify({ type: 'error', message: 'Failed to assign' }) }
  }

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [candidateResponder, setCandidateResponder] = useState(null)

  const openConfirm = (r) => {
    setCandidateResponder(r)
    setConfirmOpen(true)
  }

  const acceptAssign = async () => {
    if(!candidateResponder) return
    try{
      await api.post('/emergencies/assign', { emergencyId: emergency.id, responderId: candidateResponder.id })
      toast.notify({ type: 'success', message: 'Assigned' })
      setConfirmOpen(false)
      onAssigned()
      onClose()
    }catch(err){ console.error(err); toast.notify({ type: 'error', message: 'Failed to assign' }) }
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <div className="text-lg font-semibold">Assign responder</div>
                  <div className="text-sm text-slate-500">{emergency?.type} — {emergency?.description}</div>
                </div>
                <button onClick={onClose} className="p-2 rounded hover:bg-slate-100">✕</button>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-slate-500 mb-2">Available responders</div>
                  <div className="divide-y max-h-72 overflow-auto">
                    {loading && <div className="p-3 text-sm text-slate-500">Loading…</div>}
                    {!loading && responders.map(r=> (
                      <div key={r.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs">R</div>
                          <div>
                            <div className="font-medium">{r.name||r.email}</div>
                              <div className="text-xs text-slate-500">{r.phone || '-'} • {(r.responderStatus === 'ON_DUTY' ? 'UNAVAILABLE' : (r.responderStatus || 'UNKNOWN'))}</div>
                          </div>
                        </div>
                          {/* Disable assign when responder is not AVAILABLE (e.g., ON_DUTY) */}
                          <div>
                            {r.responderStatus && r.responderStatus !== 'AVAILABLE' && (
                              <div className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">{r.responderStatus === 'ON_DUTY' ? 'ON DUTY' : r.responderStatus === 'VEHICLE_UNAVAILABLE' ? 'VEHICLE UNAVAILABLE' : r.responderStatus}</div>
                            )}
                            <button
                              className={`px-3 py-1 rounded text-white ml-2 ${r.responderStatus === 'AVAILABLE' ? 'bg-sky-600' : 'bg-slate-400'}`}
                              onClick={()=> openConfirm(r)}
                              disabled={r.responderStatus !== 'AVAILABLE'}
                              title={r.responderStatus !== 'AVAILABLE' ? 'Responder not available' : 'Assign responder'}
                            >{r.responderStatus === 'AVAILABLE' ? 'Assign' : (r.responderStatus === 'VEHICLE_UNAVAILABLE' ? 'Vehicle Unavailable' : 'Unavailable')}</button>
                          </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-3">
                  <div className="text-sm text-slate-500 mb-2">Assign details</div>
                  <div className="text-sm text-slate-700">Priority: <span className={`font-semibold ${emergency?.priority==='high'?'text-rose-600':emergency?.priority==='medium'?'text-amber-600':'text-sky-600'}`}>{emergency?.priority || '-'}</span></div>
                  <div className="mt-4 text-sm text-slate-500">When you assign, the map is hidden to focus on selecting the right responder.</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {confirmOpen && candidateResponder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={()=>setConfirmOpen(false)} />
          <div className="bg-white rounded-lg shadow-lg p-4 z-[70] w-full max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Confirm assignment</div>
                <div className="text-sm text-slate-500">Assign {candidateResponder.name} to this emergency?</div>
              </div>
              <button onClick={()=>setConfirmOpen(false)} className="p-2 rounded hover:bg-slate-100">✕</button>
            </div>
            <div className="mt-3">
              <div className="text-sm text-slate-600">Confirm Assignment</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={()=>setConfirmOpen(false)}>Cancel</button>
              <button className="px-3 py-1 rounded bg-sky-600 text-white" onClick={acceptAssign}>Accept</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
