import React, { useState, useEffect } from 'react'
import api from '../services/api'

export default function EvacCenters({ onCreated = ()=>{} }){
  const [centers, setCenters] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async ()=>{
    setLoading(true)
    try{ const res = await api.get('/evacuation-centers'); setCenters(res.data || []) }catch(e){ console.error(e) }
    setLoading(false)
  }

  useEffect(()=>{ load() }, [])

  const create = async (payload)=>{
    try{ await api.post('/evacuation-centers', payload); await load(); onCreated(); alert('Evac center created') }catch(e){ console.error(e); alert('Failed to create') }
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
            </div>
            <button className="px-3 py-1 rounded bg-slate-100" onClick={()=>navigator.clipboard.writeText(`${c.location?.lat},${c.location?.lng}`)}>Copy</button>
          </div>
        ))}
      </div>
      <div className="mt-3 text-sm text-slate-500">Tip: click the map to create an evac center.</div>
    </div>
  )
}
