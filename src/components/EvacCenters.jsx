import React, { useState, useEffect } from 'react'
import api from '../services/api'

export default function EvacCenters({ onCreated = ()=>{} }){
  const [centers, setCenters] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCenter, setEditingCenter] = useState(null)
  const [editCount, setEditCount] = useState(0)
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '', capacity: 0, contactNumber: '', facilities: '' })

  const load = async ()=>{
    setLoading(true)
    try{ const res = await api.get('/evacuation-centers'); setCenters(res.data || []) }catch(e){ console.error(e) }
    setLoading(false)
  }

  useEffect(()=>{ load() }, [])

  const create = async (payload)=>{
    try{ await api.post('/evacuation-centers', payload); await load(); onCreated(); alert('Evac center created') }catch(e){ console.error(e); alert('Failed to create') }
  }

  const submitForm = async (e) => {
    e && e.preventDefault && e.preventDefault()
    const payload = {
      name: form.name,
      address: form.address,
      capacity: Number(form.capacity) || 0,
      contactNumber: form.contactNumber || null,
      facilities: form.facilities ? JSON.parse(form.facilities) : null,
      location: { lat: Number(form.lat), lng: Number(form.lng) }
    }
    try{
      await create(payload)
      setForm({ name: '', address: '', lat: '', lng: '', capacity: 0, contactNumber: '', facilities: '' })
      setShowForm(false)
    }catch(e){ console.error(e); alert('Failed to create evac center') }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Evacuation Centers</h3>
        <div className="text-sm text-slate-500">{centers.length} total</div>
      </div>
      <div className="divide-y max-h-64 overflow-auto">
        {loading && <div className="p-3 text-sm text-slate-500">Loading...</div>}
        {!loading && centers.map(c=> (
          <div key={c.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-slate-500">{c.location?.lat?.toFixed(4)}, {c.location?.lng?.toFixed(4)}</div>
              {(() => {
                const cap = c.capacity || 0
                const occ = c.currentCount || 0
                const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0
                let status = 'Available'
                if (pct === 100) status = 'Full'
                else if (pct >= 76) status = 'High'
                else if (pct >= 50) status = 'Limited'
                else status = 'Available'
                return (
                  <div className="text-xs text-slate-500">Capacity: {cap} • Occupied: {occ} • Available: {Math.max(0, cap - occ)} • {c.isActive ? 'Open' : 'Closed'} • {pct}% ({status})</div>
                )
              })()}
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded bg-slate-100" onClick={()=>navigator.clipboard.writeText(`${c.location?.lat},${c.location?.lng}`)}>Copy</button>
              <button className="px-3 py-1 rounded bg-yellow-200" onClick={() => { setEditingCenter(c); setEditCount(c.currentCount || 0) }}>Edit</button>
              <button className="px-3 py-1 rounded bg-red-200" onClick={async ()=>{
                const confirm = window.confirm(`Set ${c.name} to ${c.isActive? 'Closed' : 'Open'}?`)
                if(!confirm) return
                try{ await api.patch(`/evacuation-centers/${c.id}`, { isActive: !c.isActive }); await load(); alert('Updated') }catch(e){ console.error(e); alert('Failed') }
              }}>{c.isActive ? 'Close' : 'Open'}</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>setShowForm(s=>!s)}>{showForm ? 'Cancel' : 'Create Evacuation Center'}</button>
      </div>

      {showForm && (
        <form className="mt-3 p-3 border rounded bg-slate-50" onSubmit={submitForm}>
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="Name" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="p-2 border rounded" />
            <input required placeholder="Address" value={form.address} onChange={(e)=>setForm({...form, address: e.target.value})} className="p-2 border rounded" />
            <input required placeholder="Latitude" value={form.lat} onChange={(e)=>setForm({...form, lat: e.target.value})} className="p-2 border rounded" />
            <input required placeholder="Longitude" value={form.lng} onChange={(e)=>setForm({...form, lng: e.target.value})} className="p-2 border rounded" />
            <input required type="number" placeholder="Capacity" value={form.capacity} onChange={(e)=>setForm({...form, capacity: e.target.value})} className="p-2 border rounded" />
            <input placeholder="Contact number" value={form.contactNumber} onChange={(e)=>setForm({...form, contactNumber: e.target.value})} className="p-2 border rounded" />
            <textarea placeholder='Facilities as JSON (e.g. {"toilets": true})' value={form.facilities} onChange={(e)=>setForm({...form, facilities: e.target.value})} className="col-span-2 p-2 border rounded" />
          </div>
          <div className="mt-2">
            <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">Create</button>
          </div>
        </form>
      )}

      {/* Edit modal for updating occupied count */}
      {editingCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-4 w-96">
            <h4 className="text-lg font-semibold mb-2">Edit {editingCenter.name}</h4>
            <div className="text-sm text-slate-600 mb-2">Capacity: {editingCenter.capacity || 0}</div>
            <div className="mb-3">
              <label className="block text-xs text-slate-600">Occupied</label>
              <input type="number" value={editCount} onChange={(e)=>setEditCount(Number(e.target.value))} className="w-full p-2 border rounded" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded bg-slate-100" onClick={()=>setEditingCenter(null)}>Cancel</button>
              <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={async ()=>{
                try{
                  await api.patch(`/evacuation-centers/${editingCenter.id}`, { currentCount: Number(editCount) })
                  await load()
                  setEditingCenter(null)
                  alert('Updated')
                }catch(e){ console.error(e); alert('Failed to update') }
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
      <div className="mt-3 text-sm text-slate-500">Tip: click the map to create an evac center.</div>
    </div>
  )
}
