import React, { useEffect, useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'
import { showConfirm } from '../services/confirm'
import UsersList from './UsersList'

const BARANGAYS = ['Barangay 1','Barangay 2','Barangay 3','Barangay 4','Barangay 5']

export default function BarangaysPanel({ onRefreshGlobal = ()=>{} }){
  const [selected, setSelected] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')

  const fetchUsers = async (barangay) => {
    setLoading(true)
    try{
      const res = await api.get('/users')
      const all = res.data || []
      setUsers(all.filter(u=>u.barangay === barangay))
    }catch(e){ console.error(e); setUsers([]) }
    setLoading(false)
  }

  useEffect(()=>{ if(selected) fetchUsers(selected) }, [selected])

  const handleEdit = async (user) => {
    const name = prompt('Name', user.name||user.email)
    if(name==null) return
  try{ await api.put(`/users/${user.id}`, { ...user, name }); toast.notify({ type: 'success', message: 'Updated' }); fetchUsers(selected); onRefreshGlobal() }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to update user' }) }
  }

  const handleDelete = async (user) => {
    try{
      const ok = await showConfirm({ title: 'Delete user', message: `Delete user ${(user.name||user.email)}?`, confirmText: 'Delete', cancelText: 'Cancel' })
      if(!ok) return
      await api.delete(`/users/${user.id}`)
      toast.notify({ type: 'success', message: 'Deleted' })
      fetchUsers(selected); onRefreshGlobal()
    }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to delete user' }) }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Barangays</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {BARANGAYS.map(b=> (
          <button key={b} className={`text-left p-3 rounded-lg bg-white shadow ${selected===b?'ring-2 ring-sky-400':''}`} onClick={()=>setSelected(b)}>
            <div className="font-medium">{b}</div>
            <div className="text-xs text-slate-500">View residents</div>
          </button>
        ))}
      </div>

      {selected ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-semibold">Residents in {selected}</h4>
            <div className="flex items-center gap-2">
              <input className="px-2 py-1 border rounded text-sm" placeholder="Search name or email" value={filter} onChange={e=>setFilter(e.target.value)} />
            </div>
            <div>
              <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={()=>onRefreshGlobal()}>Refresh</button>
            </div>
          </div>
          {/* Hide responders and admins from this barangay list (show residents only) */}
          <UsersList users={users.filter(u=> (u.name||u.email).toLowerCase().includes(filter.toLowerCase()) && u.role === 'RESIDENT')} onRefresh={()=>fetchUsers(selected)} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      ) : (
        <div className="text-sm text-slate-500">Select a barangay to view users</div>
      )}
    </div>
  )
}
