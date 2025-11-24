import React, { useEffect, useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [responders, setResponders] = useState([])
  const [filterResponder, setFilterResponder] = useState('')
  const [loading, setLoading] = useState(false)
  const [newItem, setNewItem] = useState({ responderId: '', name: '', sku: '', quantity: 1, unit: '', notes: '' })

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

  const fetchItems = async (responderId) => {
    setLoading(true)
    try {
      const res = await api.get('/inventory', { params: responderId ? { responderId } : {} })
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
      fetchItems()
    })()
  }, [])

  const applyFilter = () => fetchItems(filterResponder || null)

  const createItem = async () => {
    if (!newItem.name) return toast.notify({ type: 'error', message: 'Name required' })
    try {
      await api.post('/inventory', newItem)
      toast.notify({ type: 'success', message: 'Item created' })
      setNewItem({ responderId: newItem.responderId, name: '', sku: '', quantity: 1, unit: '', notes: '' })
      fetchItems(filterResponder || newItem.responderId || null)
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
      fetchItems(filterResponder || null)
    } catch (e) {
      console.error('Failed to delete inventory', e)
      toast.notify({ type: 'error', message: 'Failed to delete' })
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Inventory</h3>
          <div className="text-xs text-slate-400">Manage inventory items by responder</div>
        </div>
        <div className="flex items-center gap-2">
          <select className="p-2 border rounded" value={filterResponder} onChange={(e)=>setFilterResponder(e.target.value)}>
            <option value="">All responders</option>
            {responders.map(r=> <option key={r.id} value={r.id}>{r.name || r.email}</option>)}
          </select>
          <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={applyFilter}>Filter</button>
        </div>
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="p-2">Responder</th><th className="p-2">Name</th><th className="p-2">Qty</th><th className="p-2">Unit</th><th className="p-2">SKU</th><th className="p-2">Notes</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="hover:bg-slate-50">
                <td className="p-2">{(responders.find(r=>r.id===it.responderId)?.name) || it.responderId}</td>
                <td className="p-2">{it.name}</td>
                <td className="p-2">{it.quantity}</td>
                <td className="p-2">{it.unit}</td>
                <td className="p-2">{it.sku}</td>
                <td className="p-2">{it.notes}</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded bg-red-100" onClick={()=>removeItem(it.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-4 text-center text-slate-500">No items</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-2">Add item</h4>
        <div className="grid grid-cols-4 gap-2 mb-3">
          <select className="p-2 border rounded col-span-1" value={newItem.responderId} onChange={(e)=>setNewItem(s=>({ ...s, responderId: e.target.value }))}>
            {responders.map(r=> <option key={r.id} value={r.id}>{r.name || r.email}</option>)}
          </select>
          <input className="p-2 border rounded col-span-1" placeholder="Name" value={newItem.name} onChange={(e)=>setNewItem(s=>({ ...s, name: e.target.value }))} />
          <input className="p-2 border rounded col-span-1" placeholder="Quantity" type="number" value={newItem.quantity} onChange={(e)=>setNewItem(s=>({ ...s, quantity: Number(e.target.value) }))} />
          <input className="p-2 border rounded col-span-1" placeholder="Unit" value={newItem.unit} onChange={(e)=>setNewItem(s=>({ ...s, unit: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input className="p-2 border rounded" placeholder="SKU" value={newItem.sku} onChange={(e)=>setNewItem(s=>({ ...s, sku: e.target.value }))} />
          <input className="p-2 border rounded" placeholder="Notes" value={newItem.notes} onChange={(e)=>setNewItem(s=>({ ...s, notes: e.target.value }))} />
        </div>
        <div className="flex justify-end">
          <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={createItem}>Create</button>
        </div>
      </div>
    </div>
  )
}
