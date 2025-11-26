import React, { useEffect, useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

export default function AssignModal({ open, emergency, onClose = ()=>{}, onAssigned = ()=>{} }){
  const [responders, setResponders] = useState([])
  const [allResponders, setAllResponders] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedResponder, setSelectedResponder] = useState(null)
  const [selectedVehicles, setSelectedVehicles] = useState([])
  const [typeFilter, setTypeFilter] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Fetch responders and vehicles
  useEffect(()=>{
    if(!open) return
    setLoading(true)
    
    Promise.all([
      api.get('/users?role=RESPONDER'),
      api.get('/vehicles')
    ])
    .then(([respRes, vehRes]) => {
      setAllResponders(respRes.data || [])
      setVehicles(vehRes.data || [])
      
      // Initially filter by emergency type
      if(emergency?.type) {
        const filtered = (respRes.data || []).filter(r => 
          Array.isArray(r.responderTypes) && r.responderTypes.includes(emergency.type)
        )
        setResponders(filtered)
        setTypeFilter(emergency.type)
      } else {
        setResponders(respRes.data || [])
      }
    })
    .catch(err => {
      console.error('Failed to fetch responders/vehicles', err)
      setResponders([])
      setVehicles([])
    })
    .finally(()=>setLoading(false))
  }, [open, emergency])

  // Get available vehicles for selected responder
  const getAvailableVehiclesForResponder = (responderId) => {
    return vehicles.filter(v => v.responderId === responderId && v.active)
  }

  // Switch to different responder type
  const switchResponderType = (type) => {
    setTypeFilter(type)
    const filtered = allResponders.filter(r => 
      Array.isArray(r.responderTypes) && r.responderTypes.includes(type)
    )
    setResponders(filtered)
    setSelectedResponder(null)
    setSelectedVehicles([])
  }

  // Toggle vehicle selection
  const toggleVehicle = (vehicleId) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    )
  }

  // Assign responder and mark vehicles as inactive
  const acceptAssign = async () => {
    if(!selectedResponder || !emergency) return
    
    try {
      // Assign responder
      await api.post('/emergencies/assign', { 
        emergencyId: emergency.id, 
        responderId: selectedResponder.id 
      })
      
      // Mark selected vehicles as inactive
      if(selectedVehicles.length > 0) {
        await Promise.all(
          selectedVehicles.map(vehicleId => 
            api.put(`/vehicles/${vehicleId}`, { active: false })
          )
        )
      }
      
      toast.notify({ type: 'success', message: 'Assigned and vehicles dispatched' })
      setConfirmOpen(false)
      onAssigned()
      onClose()
    } catch(err) { 
      console.error(err)
      toast.notify({ type: 'error', message: 'Failed to assign' }) 
    }
  }

  // Get count of available responders by type
  const getCountByType = (type) => {
    return allResponders.filter(r => 
      Array.isArray(r.responderTypes) && r.responderTypes.includes(type) && r.responderStatus === 'AVAILABLE'
    ).length
  }

  const responderTypes = ['FIRE', 'MEDICAL', 'POLICE', 'RESCUE', 'DISASTER_MANAGEMENT', 'COMMUNITY_RESPONDER', 'FLOOD', 'EARTHQUAKE']
  const availableVehicles = selectedResponder ? getAvailableVehiclesForResponder(selectedResponder.id) : []

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div>
                  <div className="text-lg font-semibold">Assign Emergency Response</div>
                  <div className="text-sm text-slate-600">{emergency?.type} — {emergency?.description}</div>
                </div>
                <button onClick={onClose} className="p-2 rounded hover:bg-slate-200">✕</button>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Responder Type Selection */}
                <div className="lg:col-span-1">
                  <div className="text-sm font-semibold text-slate-700 mb-3">Responder Type</div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {responderTypes.map(type => {
                      const count = getCountByType(type)
                      const isSelected = typeFilter === type
                      return (
                        <button
                          key={type}
                          onClick={() => switchResponderType(type)}
                          className={`w-full p-3 rounded-lg text-left transition-all text-sm font-medium ${
                            isSelected
                              ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          } ${count === 0 ? 'opacity-50' : ''}`}
                          disabled={count === 0}
                        >
                          <div className="flex items-center justify-between">
                            <span>{type.replace(/_/g, ' ')}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              isSelected ? 'bg-white/20' : 'bg-slate-300'
                            }`}>
                              {count}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Responder List */}
                <div className="lg:col-span-1">
                  <div className="text-sm font-semibold text-slate-700 mb-3">Available Responders</div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loading && <div className="p-3 text-sm text-slate-500 text-center">Loading…</div>}
                    {!loading && responders.length === 0 && (
                      <div className="p-3 text-sm text-slate-500 text-center bg-yellow-50 rounded">No responders available</div>
                    )}
                    {!loading && responders.map(r => {
                      const isSelected = selectedResponder?.id === r.id
                      const isAvailable = r.responderStatus === 'AVAILABLE'
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedResponder(r)
                            setSelectedVehicles([])
                          }}
                          disabled={!isAvailable}
                          className={`w-full p-3 rounded-lg text-left transition-all text-sm ${
                            isSelected
                              ? 'bg-green-100 border-2 border-green-500'
                              : 'bg-white border border-slate-200 hover:border-slate-300'
                          } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="font-medium">{r.name || r.email}</div>
                          <div className="text-xs text-slate-500">{r.phone || '-'} • {r.responderStatus || 'UNKNOWN'}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Vehicle Selection */}
                <div className="lg:col-span-1">
                  <div className="text-sm font-semibold text-slate-700 mb-3">
                    Assign Vehicles
                    {selectedResponder && availableVehicles.length === 0 && (
                      <span className="text-xs text-amber-600 block mt-1">No vehicles available</span>
                    )}
                  </div>
                  {!selectedResponder && (
                    <div className="p-3 text-sm text-slate-500 text-center bg-slate-50 rounded">
                      Select a responder first
                    </div>
                  )}
                  {selectedResponder && (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableVehicles.length === 0 && (
                        <div className="p-3 text-sm text-amber-700 bg-amber-50 rounded text-center">
                          ⚠️ No active vehicles
                        </div>
                      )}
                      {availableVehicles.map(v => {
                        const isChecked = selectedVehicles.includes(v.id)
                        return (
                          <label key={v.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleVehicle(v.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{v.id}</div>
                              <div className="text-xs text-slate-500">{v.model} • {v.color} • {v.plateNumber}</div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                <button 
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-white font-medium transition-all ${
                    selectedResponder
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-slate-400 cursor-not-allowed'
                  }`}
                  onClick={() => setConfirmOpen(true)}
                  disabled={!selectedResponder}
                >
                  Confirm & Dispatch
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {confirmOpen && selectedResponder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={()=>setConfirmOpen(false)} />
          <div className="bg-white rounded-lg shadow-lg p-6 z-[70] w-full max-w-md">
            <div className="text-lg font-semibold mb-4">Confirm Dispatch</div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-600">Responder: </span>
                <span className="font-medium">{selectedResponder.name}</span>
              </div>
              <div>
                <span className="text-slate-600">Emergency: </span>
                <span className="font-medium">{emergency?.type}</span>
              </div>
              <div>
                <span className="text-slate-600">Vehicles: </span>
                <span className="font-medium">{selectedVehicles.length > 0 ? `${selectedVehicles.length} vehicle(s)` : 'None'}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button 
                className="px-4 py-2 rounded-lg border border-slate-300"
                onClick={()=>setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
                onClick={acceptAssign}
              >
                Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
