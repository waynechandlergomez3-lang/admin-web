import React, { useEffect, useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'
import { getSocket } from '../services/socket'

export default function FraudList(){
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchList = async () => {
    setLoading(true)
    try{
      const res = await api.get('/emergencies/fraud/list')
      setList(res.data || [])
    }catch(e){
      console.error('Failed to fetch fraud list', e)
      toast.notify({ type: 'error', message: 'Failed to load fraud list' })
    }finally{ setLoading(false) }
  }

  useEffect(()=>{
    fetchList()
    const s = getSocket()
    if(!s) return
    const onMarked = () => fetchList()
    const onCleared = () => fetchList()
    s.on('emergency:fraud', onMarked)
    s.on('emergency:fraud:cleared', onCleared)
    return ()=>{
      s.off('emergency:fraud', onMarked)
      s.off('emergency:fraud:cleared', onCleared)
    }
  }, [])

  const unmark = async (id) => {
    try{
      await api.put(`/emergencies/${id}/unmark-fraud`)
      toast.notify({ type: 'success', message: 'Unmarked fraud' })
      fetchList()
    }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to unmark' }) }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Fraudulent Reports</h3>
        <div className="text-sm text-slate-500">{list.length} total</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Reporter</th>
              <th className="text-left p-2">Created</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(e=> (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="p-2 font-mono text-xs">{String(e.id).slice(0,8)}</td>
                <td className="p-2">{e.type}</td>
                <td className="p-2">{e.userName || e.user_name || '-'}</td>
                <td className="p-2">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={()=>unmark(e.id)}>Unmark Fraud</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-right"><button className="px-3 py-1 bg-slate-100 rounded" onClick={fetchList} disabled={loading}>{loading?'Refreshing...':'Refresh'}</button></div>
    </div>
  )
}
