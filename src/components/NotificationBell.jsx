import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { getSocket } from '../services/socket'
import toast from '../services/toast'

export default function NotificationBell(){
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  // composeRole fixed to RESPONDER per admin request
  const [composeRole, setComposeRole] = useState('RESPONDER')
  const [composeTitle, setComposeTitle] = useState('')
  const [composeMessage, setComposeMessage] = useState('')

  const fetchNotifications = async () => {
    try{
      const res = await api.get('/notifications')
      const list = res.data || []
      setNotifications(list)
      setUnread(list.filter(n => !n.isRead).length)
    }catch(e){ console.warn('Failed to fetch notifications', e) }
  }

  useEffect(()=>{
    fetchNotifications()
    const socket = getSocket()
    if(!socket) return
    const onNew = (payload) => {
      setNotifications(prev => [payload, ...prev])
      setUnread(c => c + 1)
      try{ toast.notify({ type: 'info', title: payload.title || 'Notification', message: payload.message || '' }) }catch(e){}
    }
    socket.on('notification:new', onNew)
    return () => { try{ socket.off('notification:new', onNew) }catch(e){} }
  }, [])

  const markRead = async (id) => {
    try{
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
    }catch(e){ console.warn('markRead failed', e) }
  }

  const sendTestToAll = async () => {
    try{
      await api.post('/notifications/test-push', { title: 'Admin test', message: 'Test push from admin web', all: true })
      toast.notify({ type: 'success', message: 'Test push sent to all registered tokens' })
    }catch(e){ console.error('sendTestToAll failed', e); toast.notify({ type: 'error', message: 'Failed to send test push' }) }
  }

  const submitCompose = async () => {
    try{
      if(!composeTitle || !composeMessage){ toast.notify({ type: 'error', message: 'Title and message required' }); return }
      if (composeRole && composeRole !== 'ALL') {
        await api.post('/notifications/send', { role: composeRole, title: composeTitle, message: composeMessage })
        toast.notify({ type: 'success', message: `Notification sent to role ${composeRole}` })
      } else {
        // broadcast
        await api.post('/notifications/test-push', { title: composeTitle, message: composeMessage, all: true })
        toast.notify({ type: 'success', message: 'Broadcast notification sent' })
      }
      setComposeOpen(false)
      setComposeTitle('')
      setComposeMessage('')
      setComposeRole('')
    }catch(e){ console.error('compose failed', e); toast.notify({ type: 'error', message: 'Failed to send notification' }) }
  }

  return (
    <div className="relative">
      <button aria-label="Notifications" className="relative p-2 rounded hover:bg-slate-100" onClick={()=>{ setOpen(v=>!v); if(!open) setUnread(0) }}>
        <span className="text-xl">🔔</span>
        {unread>0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">{unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-40">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="font-semibold">Notifications</div>
            <div className="text-xs text-slate-500">{notifications.length} total</div>
          </div>
          <div className="max-h-64 overflow-auto">
            {notifications.length===0 && <div className="p-3 text-sm text-slate-500">No notifications</div>}
            {notifications.map(n=> (
              <div key={n.id || Math.random()} className={`p-3 border-b ${n.isRead ? 'bg-white' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{n.title}</div>
                  {!n.isRead && <button className="text-xs text-blue-600" onClick={()=>markRead(n.id)}>Mark read</button>}
                </div>
                <div className="text-xs text-slate-600 mt-1">{n.message}</div>
                <div className="text-xs text-slate-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t flex gap-2">
            <button className="flex-1 px-3 py-2 bg-slate-100 rounded" onClick={fetchNotifications}>Refresh</button>
            <button className="px-3 py-2 bg-slate-200 rounded" onClick={()=>setComposeOpen(true)}>Compose</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={sendTestToAll}>Send test</button>
          </div>
        </div>
      )}

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={()=>setComposeOpen(false)} />
          <div className="relative bg-white rounded-lg shadow p-4 w-full max-w-lg">
            <h3 className="font-semibold mb-2">Compose Notification</h3>
            <div className="space-y-2">
              <div className="w-full border rounded px-2 py-2 text-sm text-slate-700">Send to: <strong>Responders</strong></div>
              <input placeholder="Title" value={composeTitle} onChange={e=>setComposeTitle(e.target.value)} className="w-full border rounded px-2 py-1" />
              <textarea placeholder="Message" value={composeMessage} onChange={e=>setComposeMessage(e.target.value)} className="w-full border rounded px-2 py-1" rows={4} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="px-3 py-2 bg-slate-100 rounded" onClick={()=>setComposeOpen(false)}>Cancel</button>
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={submitCompose}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
