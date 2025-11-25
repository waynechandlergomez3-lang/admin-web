import React, { useEffect, useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [responders, setResponders] = useState([])
  const [filterResponder, setFilterResponder] = useState('')
  const [filterAvailability, setFilterAvailability] = useState('all') // all | available | unavailable
  const [loading, setLoading] = useState(false)
  const [newItem, setNewItem] = useState({ responderId: '', name: '', sku: '', quantity: 1, unit: '', notes: '', available: true })
  const [modalOpen, setModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUnit, setFilterUnit] = useState('')

  const fetchResponders = async () => {
    try {
      const res = await api.get('/users', { params: { role: 'RESPONDER' } })
      setResponders(res.data || [])
      return res.data || []
    } catch (e) {
      console.error('Failed to load responders', e)
      toast.notify({ type: 'error', message: 'Failed to load responders' })
      return []
    }
  }

  const fetchItems = async (responderId, availability) => {
    setLoading(true)
    try {
    const params = {}
      if (responderId) params.responderId = responderId
      if (availability === 'available') params.available = true
      if (availability === 'unavailable') params.available = false
      const res = await api.get('/inventory', { params })
      setItems(res.data || [])
    } catch (e) {
      console.error('Failed to load inventory', e)
      toast.notify({ type: 'error', message: 'Failed to load inventory' })
    }
    setLoading(false)
  }

  useEffect(() => {
    (async () => {
      const rs = await fetchResponders()
      setNewItem(s => ({ ...s, responderId: rs[0]?.id || '' }))
      fetchItems('', filterAvailability)
    })()
  }, [])

  // Apply filters and search
  useEffect(() => {
    let filtered = items

    // Filter by responder
    if (filterResponder) {
      filtered = filtered.filter(i => i.responderId === filterResponder)
    }

    // Filter by availability
    if (filterAvailability === 'available') {
      filtered = filtered.filter(i => i.available)
    } else if (filterAvailability === 'unavailable') {
      filtered = filtered.filter(i => !i.available)
    }

    // Filter by unit
    if (filterUnit) {
      filtered = filtered.filter(i => i.unit?.toLowerCase() === filterUnit.toLowerCase())
    }

    // Search by name, sku, notes
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(i => {
        const responderName = responders.find(r => r.id === i.responderId)?.name?.toLowerCase() || ''
        return i.name?.toLowerCase().includes(query) ||
               i.sku?.toLowerCase().includes(query) ||
               i.notes?.toLowerCase().includes(query) ||
               responderName.includes(query)
      })
    }

    setFilteredItems(filtered)
  }, [items, searchQuery, filterResponder, filterAvailability, filterUnit, responders])

  const createItem = async () => {
    if (!newItem.name) return toast.notify({ type: 'error', message: 'Name required' })
    try {
      await api.post('/inventory', newItem)
      toast.notify({ type: 'success', message: 'Item created' })
      setNewItem({ responderId: newItem.responderId, name: '', sku: '', quantity: 1, unit: '', notes: '', available: true })
      fetchItems(filterResponder || newItem.responderId || null, filterAvailability)
    } catch (e) {
      console.error('Failed to create inventory', e)
      toast.notify({ type: 'error', message: 'Failed to create inventory' })
    }
  }

  const removeItem = async (id) => {
    if (!confirm('Delete item?')) return
    try {
      await api.delete(`/inventory/${id}`)
      toast.notify({ type: 'success', message: 'Deleted' })
      fetchItems(filterResponder || null, filterAvailability)
    } catch (e) {
      console.error('Failed to delete inventory', e)
      toast.notify({ type: 'error', message: 'Failed to delete' })
    }
  }

  const toggleAvailability = async (item) => {
    try {
      await api.put(`/inventory/${item.id}`, { available: !item.available })
      toast.notify({ type: 'success', message: item.available ? 'Marked unavailable' : 'Marked available' })
      fetchItems(filterResponder || null, filterAvailability)
    } catch (e) {
      console.error('Failed to toggle availability', e)
      toast.notify({ type: 'error', message: 'Failed to update availability' })
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Inventory</h3>
          <div className="text-xs text-slate-400">Manage inventory items by responder</div>
        </div>
        <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={()=>setModalOpen(true)}>Add Item</button>
      </div>

      {/* Comprehensive Search and Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-slate-50 p-3 rounded-lg mb-4">
        <input
          type="text"
          placeholder="Search name, SKU, notes, responder..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="col-span-2 p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={filterResponder}
          onChange={(e) => setFilterResponder(e.target.value)}
          className="p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Responders</option>
          {responders.map(r => <option key={r.id} value={r.id}>{r.name || r.email}</option>)}
        </select>
        <select
          value={filterAvailability}
          onChange={(e) => setFilterAvailability(e.target.value)}
          className="p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <select
          value={filterUnit}
          onChange={(e) => setFilterUnit(e.target.value)}
          className="p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Units</option>
          <option value="pcs">pcs</option>
          <option value="box">box</option>
          <option value="roll">roll</option>
          <option value="kg">kg</option>
          <option value="liter">liter</option>
          <option value="meter">meter</option>
          <option value="pack">pack</option>
          <option value="set">set</option>
        </select>
        <button
          onClick={() => {
            setSearchQuery('')
            setFilterResponder('')
            setFilterAvailability('all')
            setFilterUnit('')
          }}
          className="p-2 border rounded text-sm hover:bg-slate-100"
        >
          Clear Filters
        </button>
      </div>
      <div className="text-xs text-slate-500 mb-4">Showing {filteredItems.length} of {items.length} items</div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="p-2">Responder</th><th className="p-2">Name</th><th className="p-2">Qty</th><th className="p-2">Unit</th><th className="p-2">SKU</th><th className="p-2">Available</th><th className="p-2">Notes</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {filteredItems.map(it => (
              <tr key={it.id} className="hover:bg-slate-50">
                <td className="p-2">{(responders.find(r=>r.id===it.responderId)?.name) || it.responderId}</td>
                <td className="p-2">{it.name}</td>
                <td className="p-2">{it.quantity}</td>
                <td className="p-2">{it.unit}</td>
                <td className="p-2 font-mono text-xs">{it.sku}</td>
                <td className="p-2"><span className={`px-2 py-1 rounded text-xs font-medium ${it.available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{it.available ? 'Yes' : 'No'}</span></td>
                <td className="p-2 text-xs text-gray-600">{it.notes}</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded bg-amber-100" onClick={()=>toggleAvailability(it)}>{it.available ? 'Mark Unavailable' : 'Mark Available'}</button>
                    <button className="px-3 py-1 rounded bg-red-100" onClick={()=>removeItem(it.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && !loading && (
              <tr><td colSpan={8} className="p-4 text-center text-slate-500">No items found matching criteria</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40" onClick={()=>setModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold">Add Inventory Item</h4>
                <button className="p-2 rounded text-slate-500 hover:bg-slate-100" onClick={()=>setModalOpen(false)}>✕</button>
              </div>
              <div className="grid grid-cols-5 gap-2 mb-3">
                <select className="p-2 border rounded col-span-1" value={newItem.responderId} onChange={(e)=>setNewItem(s=>({ ...s, responderId: e.target.value }))}>
                  {responders.map(r=> <option key={r.id} value={r.id}>{r.name || r.email}</option>)}
                </select>
                <input className="p-2 border rounded col-span-1" placeholder="Name" value={newItem.name} onChange={(e)=>setNewItem(s=>({ ...s, name: e.target.value }))} />
                <input className="p-2 border rounded col-span-1" placeholder="Quantity" type="number" value={newItem.quantity} onChange={(e)=>setNewItem(s=>({ ...s, quantity: Number(e.target.value) }))} />
                <input className="p-2 border rounded col-span-1" placeholder="Unit" value={newItem.unit} onChange={(e)=>setNewItem(s=>({ ...s, unit: e.target.value }))} />
                <select className="p-2 border rounded col-span-1" value={newItem.available ? 'available' : 'unavailable'} onChange={(e)=>setNewItem(s=>({ ...s, available: e.target.value === 'available' }))}>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input className="p-2 border rounded" placeholder="SKU" value={newItem.sku} onChange={(e)=>setNewItem(s=>({ ...s, sku: e.target.value }))} />
                <input className="p-2 border rounded" placeholder="Notes" value={newItem.notes} onChange={(e)=>setNewItem(s=>({ ...s, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1 bg-slate-100 rounded" onClick={()=>setModalOpen(false)}>Cancel</button>
                <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={async ()=>{ await createItem(); setModalOpen(false) }}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
