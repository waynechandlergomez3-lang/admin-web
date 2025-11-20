import React, { useMemo, useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'
import { showConfirm } from '../services/confirm'

export default function UsersList({ users = [], onRefresh = ()=>{}, onEdit = null, onDelete = null }){
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [barangayFilter, setBarangayFilter] = useState('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [modalLoading, setModalLoading] = useState(false)
  const [modalStep, setModalStep] = useState(1)
  const [modalData, setModalData] = useState({ name: '', email: '', phone: '', barangay: '', role: 'RESIDENT', responderStatus: 'AVAILABLE', bloodType: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '', medicalConditions: [], allergies: [], vehicles: [] })

  const barangays = useMemo(()=>{
    const s = new Set(); (users||[]).forEach(u=>{ if(u.barangay) s.add(u.barangay) }); return Array.from(s).sort()
  }, [users])

  const handleEdit = (user) => {
    // open edit modal and preload data
    if(onEdit) return onEdit(user)
    setModalMode('edit')
    // fetch full user data from server to ensure all fields are retrieved
    api.get(`/users/${user.id}`).then(r => {
      const u = r.data || {};
      // merge with the list item as a fallback for any missing fields
      const merged = { ...user, ...u };
  // normalize array fields
  merged.medicalConditions = Array.isArray(merged.medicalConditions) ? merged.medicalConditions : (merged.medicalConditions ? [merged.medicalConditions] : []);
  merged.allergies = Array.isArray(merged.allergies) ? merged.allergies : (merged.allergies ? [merged.allergies] : []);
  merged.specialCircumstances = Array.isArray(merged.specialCircumstances) ? merged.specialCircumstances : (merged.specialCircumstances ? [merged.specialCircumstances] : []);
  merged.vehicles = Array.isArray(merged.vehicles) ? merged.vehicles : (merged.vehicles ? [merged.vehicles] : []);

      setModalStep(1)
      setModalData({
        id: merged.id,
        name: merged.name || '',
        email: merged.email || '',
        phone: merged.phone || '',
        address: merged.address || '',
        barangay: merged.barangay || '',
        role: merged.role || 'RESIDENT',
        responderStatus: merged.responderStatus || 'AVAILABLE',
        bloodType: merged.bloodType || '',
        emergencyContactName: merged.emergencyContactName || '',
        emergencyContactPhone: merged.emergencyContactPhone || '',
        emergencyContactRelation: merged.emergencyContactRelation || '',
        medicalConditions: merged.medicalConditions || [],
        allergies: merged.allergies || [],
        specialCircumstances: merged.specialCircumstances || [],
        vehicles: merged.vehicles || []
      })
      setModalOpen(true)
    }).catch(err => {
      console.warn('Failed to load full user, falling back to list item', err);
      // fallback: use the list item we already have
      setModalData({
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        barangay: user.barangay || '',
        role: user.role || 'RESIDENT',
        responderStatus: user.responderStatus || 'AVAILABLE',
        bloodType: user.bloodType || '',
        emergencyContactName: user.emergencyContactName || '',
        emergencyContactPhone: user.emergencyContactPhone || '',
        emergencyContactRelation: user.emergencyContactRelation || '',
        medicalConditions: user.medicalConditions || [],
        allergies: user.allergies || [],
        specialCircumstances: user.specialCircumstances || [],
        vehicles: user.vehicles || []
      })
      setModalOpen(true)
    })
  }

  const handleDelete = async (user) => {
    if(onDelete) return onDelete(user)
    const ok = await showConfirm({ title: 'Delete user', message: `Delete user ${(user.name||user.email)}?`, confirmText: 'Delete', cancelText: 'Cancel' })
    if(!ok) return
    try{
      await api.delete(`/users/${user.id}`)
      toast.notify({ type: 'success', message: 'Deleted' })
      onRefresh()
    }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to delete user' }) }
  }

  const openCreate = () => {
    setModalMode('create')
    setModalStep(1)
    setModalData({
      name: '',
      email: '',
      phone: '',
      address: '',
      barangay: '',
      role: 'RESIDENT',
      responderStatus: 'AVAILABLE',
      bloodType: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      medicalConditions: [],
      allergies: [],
      specialCircumstances: [],
      vehicles: []
    })
    setModalOpen(true)
  }

  const submitModal = async () => {
    try{
      setModalLoading(true)
      if(modalMode === 'create'){
            await api.post('/users', modalData)
      }else{
        const id = modalData.id
        await api.put(`/users/${id}`, modalData)
      }
      setModalOpen(false)
      onRefresh()
  }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to save user' }) }
    setModalLoading(false)
  }

  const filtered = users.filter(u=>{
    if(roleFilter !== 'ALL' && u.role !== roleFilter) return false
    if(barangayFilter !== 'ALL' && (u.barangay || '') !== barangayFilter) return false
    return true
  })
  const responders = filtered.filter(u => u.role === 'RESPONDER')
  const residents = filtered.filter(u => u.role === 'RESIDENT')
  const others = filtered.filter(u => u.role !== 'RESPONDER' && u.role !== 'RESIDENT')

  // renderTable optionally shows vehicles column (only for responders list)
  const renderTable = (list, title, showVehicles=false) => (
    <div className="bg-white rounded-xl shadow p-4 w-full mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-sm text-slate-500">{list.length} total</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2">Barangay</th>
              <th className="p-2">Role</th>
              <th className="p-2">Responder</th>
              {showVehicles && <th className="p-2">Vehicles</th>}
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map(u=> (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="p-2 font-mono text-xs">{String(u.id).slice(0,8)}</td>
                <td className="p-2">{u.name||u.email}</td>
                <td className="p-2">{u.barangay || '-'}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">
                  {u.role === 'RESPONDER' ? (
                    (() => {
                      const raw = u.responderStatus
                      const label = raw === 'ON_DUTY' ? 'ASSIGNED' : (raw || 'UNKNOWN')
                      const cls = raw==='ON_DUTY' ? 'bg-red-600 text-white' : raw==='AVAILABLE' ? 'bg-green-600 text-white' : 'bg-gray-300 text-black'
                      return <span className={`px-2 py-1 rounded text-xs ${cls}`}>{label}</span>
                    })()
                  ) : '-' }
                </td>
                {showVehicles && <td className="p-2">{Array.isArray(u.vehicles) ? u.vehicles.length : 0}</td>}
                <td className="p-2">
                  <div className="flex gap-2">
                    {/* Toggle Responder removed */}
                    <button className="px-3 py-1 rounded bg-amber-100" onClick={()=>handleEdit(u)}>Edit</button>
                    <button className="px-3 py-1 rounded bg-red-100" onClick={()=>handleDelete(u)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div>
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex items-center gap-3">
        <label className="text-sm">Role:</label>
        <select value={roleFilter} onChange={(e)=>setRoleFilter(e.target.value)} className="px-2 py-1 border rounded">
          <option value="ALL">All</option>
          <option value="RESPONDER">Responder</option>
          <option value="RESIDENT">Resident</option>
          <option value="ADMIN">Admin</option>
        </select>
        <label className="text-sm">Barangay:</label>
        <select value={barangayFilter} onChange={(e)=>setBarangayFilter(e.target.value)} className="px-2 py-1 border rounded">
          <option value="ALL">All</option>
          {barangays.map(b=> <option key={b} value={b}>{b}</option>)}
        </select>
        <button className="px-3 py-1 bg-slate-100 rounded" onClick={()=>{ setRoleFilter('ALL'); setBarangayFilter('ALL') }}>Clear</button>
        <div className="ml-auto">
          <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={openCreate}>Create User</button>
        </div>
      </div>

      {renderTable(responders, 'Responders')}
      {renderTable(residents, 'Residents')}
      {others.length>0 && renderTable(others, 'Other / Admins')}

      {modalOpen && (
  <div className="fixed inset-0 z-50">
    <div className="fixed inset-0 bg-black/40" onClick={()=>setModalOpen(false)} />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">{modalMode==='create' ? 'Create User' : 'Edit User'}</div>
          <button className="p-2 rounded" onClick={()=>setModalOpen(false)}>✕</button>
        </div>
        <div className="space-y-3">
          {modalStep === 1 ? (
            <>
              <div>
                <label className="text-xs">Name</label>
                <input className="w-full p-2 border rounded" value={modalData.name} onChange={(e)=>setModalData({...modalData, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs">Email</label>
                <input className="w-full p-2 border rounded" value={modalData.email} onChange={(e)=>setModalData({...modalData, email: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs">Phone</label>
                  <input className="w-full p-2 border rounded" value={modalData.phone} onChange={(e)=>setModalData({...modalData, phone: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="text-xs">Barangay</label>
                  <input className="w-full p-2 border rounded" value={modalData.barangay} onChange={(e)=>setModalData({...modalData, barangay: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs">Address</label>
                <input className="w-full p-2 border rounded" value={modalData.address || ''} onChange={(e)=>setModalData({...modalData, address: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs">Role</label>
                  <select className="w-full p-2 border rounded" value={modalData.role} onChange={(e)=>setModalData({...modalData, role: e.target.value})}>
                    <option value="RESIDENT">Resident</option>
                    <option value="RESPONDER">Responder</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                {modalData.role === 'RESPONDER' && (
                <div className="flex-1">
                  <label className="text-xs">Responder Status</label>
                  <select className="w-full p-2 border rounded" value={modalData.responderStatus} onChange={(e)=>setModalData({...modalData, responderStatus: e.target.value})}>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="VEHICLE_UNAVAILABLE">VEHICLE_UNAVAILABLE</option>
                  </select>
                </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-1 rounded bg-slate-100" onClick={()=>setModalOpen(false)}>Cancel</button>
                <button className="px-3 py-1 bg-slate-200 rounded" onClick={() => {
                  // basic validation before moving to medical step
                  if(!modalData.name || !modalData.email){ toast.notify({ type: 'error', message: 'Please provide name and email' }); return }
                  setModalStep(2)
                }}>Next</button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Blood Type</label>
                  <input className="w-full p-2 border rounded" value={modalData.bloodType} onChange={(e)=>setModalData({...modalData, bloodType: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs">Emergency Contact</label>
                  <input className="w-full p-2 border rounded" placeholder="Name" value={modalData.emergencyContactName} onChange={(e)=>setModalData({...modalData, emergencyContactName: e.target.value})} />
                  <input className="w-full p-2 border rounded mt-1" placeholder="Phone" value={modalData.emergencyContactPhone} onChange={(e)=>setModalData({...modalData, emergencyContactPhone: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-xs">Medical Conditions (comma separated)</label>
                <input className="w-full p-2 border rounded" value={(modalData.medicalConditions||[]).join(',')} onChange={(e)=>setModalData({...modalData, medicalConditions: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
              </div>
              <div>
                <label className="text-xs">Allergies (comma separated)</label>
                <input className="w-full p-2 border rounded" value={(modalData.allergies||[]).join(',')} onChange={(e)=>setModalData({...modalData, allergies: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
              </div>

              <div>
                <label className="text-xs">Special Circumstances (comma separated)</label>
                <input className="w-full p-2 border rounded" value={(modalData.specialCircumstances||[]).join(',')} onChange={(e)=>setModalData({...modalData, specialCircumstances: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
              </div>

              {/* Vehicles management for responders */}
              {modalData.role === 'RESPONDER' && (
                <div className="mt-3">
                  <h4 className="text-sm font-semibold mb-2">Vehicles</h4>
                  {(modalData.vehicles||[]).map((v, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2">
                      <input className="col-span-4 p-2 border rounded" placeholder="Plate number" value={v.plateNumber || ''} onChange={(e)=>{
                        const copy = [...(modalData.vehicles||[])]; copy[idx] = {...copy[idx], plateNumber: e.target.value}; setModalData({...modalData, vehicles: copy})
                      }} />
                      <input className="col-span-4 p-2 border rounded" placeholder="Model / Type" value={v.model || ''} onChange={(e)=>{
                        const copy = [...(modalData.vehicles||[])]; copy[idx] = {...copy[idx], model: e.target.value}; setModalData({...modalData, vehicles: copy})
                      }} />
                      <input className="col-span-2 p-2 border rounded" placeholder="Color" value={v.color || ''} onChange={(e)=>{
                        const copy = [...(modalData.vehicles||[])]; copy[idx] = {...copy[idx], color: e.target.value}; setModalData({...modalData, vehicles: copy})
                      }} />
                      <div className="col-span-1 flex items-center gap-1">
                        <label className="text-xs">Active</label>
                        <input type="checkbox" checked={!!v.active} onChange={(e)=>{
                          const copy = [...(modalData.vehicles||[])]; copy[idx] = {...copy[idx], active: e.target.checked}; setModalData({...modalData, vehicles: copy})
                        }} />
                      </div>
                      <div className="col-span-1">
                        <button className="px-2 py-1 bg-red-100 rounded" onClick={()=>{
                          const copy = [...(modalData.vehicles||[])]; copy.splice(idx,1); setModalData({...modalData, vehicles: copy})
                        }}>Remove</button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-slate-100 rounded" onClick={()=>{
                      const copy = [...(modalData.vehicles||[])]; copy.push({ plateNumber: '', model: '', color: '', active: true }); setModalData({...modalData, vehicles: copy})
                    }}>Add Vehicle</button>
                    <div className="text-sm text-slate-500 self-center">Vehicles are stored with responder profile and can be assigned to emergencies later.</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-1 rounded bg-slate-100" onClick={()=>{ setModalStep(1) }}>Back</button>
                <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={submitModal} disabled={modalLoading}>{modalLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  )
}

// Modal markup appended at file bottom (keeps render simple)
