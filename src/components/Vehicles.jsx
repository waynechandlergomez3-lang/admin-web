import React, { useEffect, useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

export default function Vehicles(){
  const [vehicles, setVehicles] = useState([])
  const [filteredVehicles, setFilteredVehicles] = useState([])
  const [responders, setResponders] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState({ id: null, responderId: '', plateNumber: '', model: '', color: '', active: true })
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterResponder, setFilterResponder] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  

  const fetchResponders = async () => {
    try {
      const rRes = await api.get('/users', { params: { role: 'RESPONDER' } })
      setResponders(rRes.data || [])
      return rRes.data || []
    } catch (e) {
      console.error('Failed to load responders', e)
      toast.notify({ type: 'error', message: 'Failed to load responders' })
      return []
    }
  }

  const fetchVehicles = async () => {
    try {
      const vRes = await api.get('/vehicles')
      setVehicles(vRes.data || [])
    } catch (e) {
      console.error('Failed to load vehicles', e)
      toast.notify({ type: 'error', message: 'Failed to load vehicles' })
    }
  }

  const fetchAll = async () => {
    setLoading(true)
    try{
      await Promise.all([ fetchVehicles(), fetchResponders() ])
    }catch(e){ console.error(e); /* errors already handled in helpers */ }
    setLoading(false)
  }

  useEffect(()=>{ fetchAll() }, [])

  // Apply filters whenever vehicles, search, or filter criteria change
  useEffect(() => {
    let filtered = vehicles
    
    // Filter by responder
    if (filterResponder) {
      filtered = filtered.filter(v => v.responderId === filterResponder)
    }
    
    // Filter by vehicle type
    if (filterType) {
      filtered = filtered.filter(v => v.model?.toLowerCase() === filterType.toLowerCase())
    }
    
    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(v => v.active)
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(v => !v.active)
    }
    
    // Search by plate, color, responder name
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(v => {
        const responderName = responders.find(r => r.id === v.responderId)?.name?.toLowerCase() || ''
        return v.plateNumber?.toLowerCase().includes(query) ||
               v.color?.toLowerCase().includes(query) ||
               v.model?.toLowerCase().includes(query) ||
               responderName.includes(query)
      })
    }
    
    setFilteredVehicles(filtered)
  }, [vehicles, searchQuery, filterType, filterResponder, filterStatus, responders])

  // vehicle type choices shown in the modal dropdown
  const VEHICLE_TYPES = [
    'Ambulance',
    'Fire Truck',
    'Rescue Boat',
    'Utility Vehicle',
    'Motorcycle',
    'Pickup Truck',
    'Van',
    'Other'
  ]

  const getVehicleIcon = (type, size = 18) => {
    const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' }
    switch((type||'').toLowerCase()){
      case 'ambulance':
        return (
          <svg {...common} className="inline-block mr-2 text-red-600"><path d="M3 13v-4h2l2-3h8l2 3h2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )
      case 'fire truck':
        return (
          <svg {...common} className="inline-block mr-2 text-orange-600"><path d="M3 13h14l2 3v3H3v-6zM7 13V8h4v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )
      case 'rescue boat':
        return (
          <svg {...common} className="inline-block mr-2 text-indigo-600"><path d="M21 15s-3-2-9-2-9 2-9 2 2 3 9 3 9-3 9-3zM5 12V6h14v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )
      case 'motorcycle':
        return (
          <svg {...common} className="inline-block mr-2 text-sky-600"><path d="M3 12h3l2-3h6l2 3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="6" cy="17" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="18" cy="17" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
        )
      case 'pickup truck':
      case 'van':
      case 'utility vehicle':
        return (
          <svg {...common} className="inline-block mr-2 text-emerald-600"><rect x="2" y="7" width="18" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="7" cy="17" r="1" fill="currentColor"/><circle cx="17" cy="17" r="1" fill="currentColor"/></svg>
        )
      default:
        return (
          <svg {...common} className="inline-block mr-2 text-gray-600"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )
    }
  }

  const StatusBadge = ({ active }) => (
    <span className={`inline-flex items-center gap-2 px-2 py-1 text-xs font-medium rounded-full ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
      {active ? (
        <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : (
        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
      {active ? 'Active' : 'Inactive'}
    </span>
  )

  const openCreate = async () => {
    // ensure we have responders before opening the modal so the default responder can be selected
    if((responders||[]).length === 0){
      await fetchResponders()
    }
    setModalData({ id: null, responderId: (responders[0]?.id||''), plateNumber: '', model: VEHICLE_TYPES[0], color: '', active: true })
    setModalOpen(true)
  }
  const openEdit = (v) => { setModalData({ id: v.id, responderId: v.responderId, plateNumber: v.plateNumber||'', model: v.model||'', color: v.color||'', active: !!v.active }); setModalOpen(true) }

  

  const save = async () => {
    setSaving(true)
    try{
      if(modalData.id){
        await api.put(`/vehicles/${modalData.id}`, modalData)
        toast.notify({ type: 'success', message: 'Vehicle updated' })
      } else {
        // Don't send ID for new vehicles - let backend generate meaningful ID
        const { id, ...dataToSend } = modalData
        await api.post('/vehicles', dataToSend)
        toast.notify({ type: 'success', message: 'Vehicle created' })
      }
      setModalOpen(false)
      fetchAll()
    }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to save vehicle' }) }
    setSaving(false)
  }

  const remove = async (id) => {
    if(!confirm('Delete vehicle?')) return
    try{ await api.delete(`/vehicles/${id}`); toast.notify({ type: 'success', message: 'Deleted' }); fetchAll() }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to delete' }) }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-lg font-bold">V</div>
            <div>
              <h3 className="text-lg font-semibold">Vehicles</h3>
              <div className="text-xs text-slate-400">Fleet and responder vehicles</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              const total = (vehicles||[]).length
              const active = (vehicles||[]).filter(v=>v.active).length
              const available = (vehicles||[]).filter(v=>v.active && !v.responderId).length
              return (
                <div className="text-sm text-slate-500">{total} total • {active} active • {available} available</div>
              )
            })()}
            <button className="px-3 py-1 bg-white border border-sky-600 text-sky-600 rounded shadow-sm hover:bg-sky-50 flex items-center gap-2" onClick={openCreate}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Create
            </button>
          </div>
        </div>
        
        {/* Search and Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50 p-3 rounded-lg">
          <input
            type="text"
            placeholder="Search by plate, color, responder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="col-span-2 p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <select
            value={filterResponder}
            onChange={(e) => setFilterResponder(e.target.value)}
            className="p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Responders</option>
            {responders.map(r => <option key={r.id} value={r.id}>{r.name || r.email}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Types</option>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="text-xs text-slate-500 mt-2">Showing {filteredVehicles.length} of {vehicles.length} vehicles</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="p-2">ID</th><th className="p-2">Responder</th><th className="p-2">Plate</th><th className="p-2">Vehicle Type</th><th className="p-2">Color</th><th className="p-2">Active</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {filteredVehicles.map(v => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="p-2 font-mono text-xs">{v.id}</td>
                <td className="p-2">{responders.find(r=>r.id===v.responderId)?.name || v.responderId}</td>
                <td className="p-2">{v.plateNumber}</td>
                <td className="p-2">{getVehicleIcon(v.model)}{v.model}</td>
                <td className="p-2">{v.color}</td>
                <td className="p-2"><StatusBadge active={!!v.active} /></td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded bg-amber-100" onClick={()=>openEdit(v)}>Edit</button>
                    <button className="px-3 py-1 rounded bg-red-100" onClick={()=>remove(v.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredVehicles.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-4 text-center text-slate-500">No vehicles found matching criteria</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40" onClick={()=>setModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 13v-4h2l2-3h8l2 3h2v4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{modalData.id ? 'Edit Vehicle' : 'Create Vehicle'}</div>
                    <div className="text-xs text-slate-400">Assign to responder and provide vehicle details</div>
                  </div>
                </div>
                <button className="p-2 rounded text-slate-500 hover:bg-slate-100" onClick={()=>setModalOpen(false)}>✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs">Responder</label>
                  <select className="w-full p-2 border rounded" value={modalData.responderId} onChange={(e)=>setModalData({...modalData, responderId: e.target.value})}>
                    {responders.map(r=> <option key={r.id} value={r.id}>{r.name || r.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs">Plate number</label>
                  <input className="w-full p-2 border rounded" value={modalData.plateNumber} onChange={(e)=>setModalData({...modalData, plateNumber: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs">Vehicle Type</label>
                    <select className="w-full p-2 border rounded" value={modalData.model} onChange={(e)=>setModalData({...modalData, model: e.target.value})}>
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs">Color</label>
                    <input className="w-full p-2 border rounded" value={modalData.color} onChange={(e)=>setModalData({...modalData, color: e.target.value})} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={!!modalData.active} onChange={(e)=>setModalData({...modalData, active: e.target.checked})} />
                  <label className="text-xs">Active</label>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button className="px-3 py-1 rounded bg-slate-100" onClick={()=>setModalOpen(false)}>Cancel</button>
                  <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  )
}
