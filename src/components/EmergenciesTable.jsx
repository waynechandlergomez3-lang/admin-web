import React, { useState } from 'react'
import api from '../services/api'
import EmergencyHistoryModal from './EmergencyHistoryModal'

export default function EmergenciesTable({ emergencies = [], onOpenAssign = ()=>{}, onRefresh = ()=>{} }){
  const [loading, setLoading] = useState(false)
  const [historyId, setHistoryId] = useState(null)

  const refresh = async () => { setLoading(true); try { await onRefresh() } finally { setLoading(false) } }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Emergencies</h3>
        <div className="text-sm text-slate-500">{emergencies.length} total</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Priority</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {emergencies.map(e=> (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="p-2 font-mono text-xs">{String(e.id).slice(0,8)}</td>
                <td className="p-2">{e.type}</td>
                <td className="p-2"><span className={`px-2 py-1 rounded text-xs ${e.priority==='high'?'bg-red-600 text-white':e.priority==='medium'?'bg-yellow-400 text-white':'bg-blue-600 text-white'}`}>{e.priority||'-'}</span></td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>onOpenAssign(e)}>Assign</button>
                    <button className="px-3 py-1 bg-slate-100 rounded" onClick={()=>setHistoryId(e.id)}>History</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-right"><button className="px-3 py-1 bg-slate-100 rounded" onClick={refresh} disabled={loading}>{loading?'Refreshing...':'Refresh'}</button></div>
      {historyId && <EmergencyHistoryModal emergencyId={historyId} onClose={()=>setHistoryId(null)} />}
    </div>
  )
}
