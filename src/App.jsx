import React, { useEffect, useState } from 'react'
import api, { setAuthToken } from './services/api'
import { initSocket, getSocket } from './services/socket'
import { handleApiError } from './utils/errorHandler'
import Login from './Login'
import ConnectionStatus from './components/ConnectionStatus'
import NotificationBell from './components/NotificationBell'
import MapView from './components/MapView'
import UsersList from './components/UsersList'
import AssignModal from './components/AssignModal'
import EvacCenters from './components/EvacCenters'
import Dashboard from './components/Dashboard'
import EmergencyHistoryModal from './components/EmergencyHistoryModal'
import WeatherAlertPanel from './components/WeatherAlertPanel'
import Reports from './components/Reports'
import Vehicles from './components/Vehicles'
import Inventory from './components/Inventory'
import MediaViewer from './components/MediaViewer'
import ResponderManagement from './components/ResponderManagement'
// ArticlePanel removed per request
import BarangaysPanel from './components/BarangaysPanel'
import AllEmergenciesHistory from './components/AllEmergenciesHistory'
import ToastContainer from './components/Toast'
import ConfirmModal from './components/ConfirmModal'
import { showConfirm } from './services/confirm'
import FraudList from './components/FraudList'

export default function App(){
  const [token, setToken] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [emergencies, setEmergencies] = useState([])
  const [users, setUsers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [evacCenters, setEvacCenters] = useState([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedEmergency, setSelectedEmergency] = useState(null)
  const [historyOpenId, setHistoryOpenId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const fetchData = async () => {
    try{
      const [e, u, ev, vs] = await Promise.all([ api.get('/emergencies'), api.get('/users'), api.get('/evacuation-centers'), api.get('/vehicles') ])
      setEmergencies(e.data || [])
      setUsers(u.data || [])
      setEvacCenters(ev.data || [])
      setVehicles(vs.data || [])
    }catch(err){
      const errorInfo = handleApiError(err, 'Data fetch')
      console.error('fetchData failed:', errorInfo.message)
      // You could show a toast notification here if needed
    }
  }

  useEffect(()=>{
    if(!token) return
    setAuthToken(token)
    initSocket(token)
    fetchData()
    const s = getSocket()
    if(!s) return
    const onRefresh = () => fetchData()
    s.on('emergency:new', onRefresh)
    s.on('emergency:updated', onRefresh)
    s.on('responder:status', onRefresh)
    const onOpenHistory = (e) => setHistoryOpenId(e.detail?.id)
    window.addEventListener('openHistory', onOpenHistory)
    return () => {
      s.off('emergency:new', onRefresh)
      s.off('emergency:updated', onRefresh)
      s.off('responder:status', onRefresh)
      window.removeEventListener('openHistory', onOpenHistory)
    }
  }, [token])

  // On app start try to restore token from localStorage
  useEffect(()=>{
    try{
      const saved = localStorage.getItem('authToken')
      if(saved) setToken(saved)
    }catch(e){
      // ignore localStorage errors
    }
  }, [])

  if(!token) return <div className="container"><Login onLogin={(t)=>setToken(t)} /><ToastContainer /></div>

  const openAssign = (em) => { setSelectedEmergency(em); setAssignOpen(true) }
  const closeAssign = () => { setAssignOpen(false); setSelectedEmergency(null) }
  const createEvac = async (payload) => {
    try{ await api.post('/evacuation-centers', payload); fetchData(); toast.notify({ type: 'success', message: 'Evacuation center created' }) }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to create evac center' }) }
  }
      return (
        <div className="flex h-screen light-theme">
          {/* Sidebar */}
          <aside className={`bg-white border-r transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <button className="text-slate-700 font-semibold text-lg" onClick={()=>setSidebarOpen(v=>!v)}>
                  {sidebarOpen ? '☰' : '☰'}
                </button>
                {sidebarOpen && (
                  <div>
                    <h1 className="text-lg font-semibold">Sagipero Admin</h1>
                    <p className="text-xs text-slate-500">Manage emergencies</p>
                  </div>
                )}
              </div>
            </div>

            <nav className="mt-4 px-2">
              <ul className="space-y-1">
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='dashboard'?'bg-slate-100':''}`} onClick={()=>setPage('dashboard')}
                    aria-label="Dashboard">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Dashboard</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='users'?'bg-slate-100':''}`} onClick={()=>setPage('users')} aria-label="Users">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M12 12a5 5 0 100-10 5 5 0 000 10z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Users</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='responders'?'bg-slate-100':''}`} onClick={()=>setPage('responders')} aria-label="Responders">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 21H4a2 2 0 01-2-2v-3a6 6 0 0112 0v3M16 7a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Responders</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='vehicles'?'bg-slate-100':''}`} onClick={()=>setPage('vehicles')} aria-label="Vehicles">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 13h14l2 3v3H3v-6zM7 13V8h4v5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Vehicles</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='barangays'?'bg-slate-100':''}`} onClick={()=>setPage('barangays')} aria-label="Barangays">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Barangays</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='allhistory'?'bg-slate-100':''}`} onClick={()=>setPage('allhistory')} aria-label="All history">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v4l3 3M21 12A9 9 0 1112 3v1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>All History</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='evac'?'bg-slate-100':''}`} onClick={()=>setPage('evac')} aria-label="Evacuation centers">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 11l9-7 9 7v7a2 2 0 01-2 2h-4v-5H9v5H5a2 2 0 01-2-2v-7z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Evacuation Centers</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='fraud'?'bg-slate-100':''}`} onClick={()=>setPage('fraud')} aria-label="Fraud">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2L3 6v5c0 5 3 9 9 11 6-2 9-6 9-11V6l-9-4z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Fraud</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='weather'?'bg-slate-100':''}`} onClick={()=>setPage('weather')} aria-label="Weather">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 16h-1v-4H8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 16.58A5 5 0 0018 7H6a4 4 0 000 8h1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Weather Alerts</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='inventory'?'bg-slate-100':''}`} onClick={()=>setPage('inventory')} aria-label="Inventory">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Inventory</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='media'?'bg-slate-100':''}`} onClick={()=>setPage('media')} aria-label="Media">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Media Submissions</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='reports'?'bg-slate-100':''}`} onClick={()=>setPage('reports')} aria-label="Reports">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Reports</span>}
                    </div>
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='media'?'bg-slate-100':''}`} onClick={()=>setPage('media')} aria-label="Citizen Media">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {sidebarOpen && <span>Citizen Media</span>}
                    </div>
                  </button>
                </li>
                <li className="mt-4">
                  <button className="w-full text-left px-3 py-2 rounded bg-red-50 text-red-700" onClick={async ()=>{ 
                      const ok = await showConfirm({ title: 'Logout', message: 'Are you sure you want to logout?', confirmText: 'Logout', cancelText: 'Cancel' })
                      if(ok) {
                        try{ localStorage.removeItem('authToken') }catch(e){}
                        setToken(null); setAuthToken(null); window.location.reload()
                      }
                    }}>{sidebarOpen ? 'Logout' : 'L'}</button>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{page === 'dashboard' ? 'Dashboard' : page.charAt(0).toUpperCase() + page.slice(1)}</h2>
                <ConnectionStatus />
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
              </div>
            </div>

            <main className="space-y-6">
              {page === 'dashboard' && <Dashboard emergencies={emergencies} users={users} vehicles={vehicles} evacCenters={evacCenters} onOpenAssign={openAssign} />}

              {page === 'dashboard' && (
                <div className="grid lg:grid-cols-[2fr,420px] gap-6">
                  <section>
                    {!assignOpen ? (
                      <MapView emergencies={emergencies} evacCenters={evacCenters} onAssign={openAssign} onCreateEvac={createEvac} />
                    ) : (
                      <div className="bg-white rounded-xl shadow p-6 text-center text-slate-500">Map hidden while assigning</div>
                    )}
                  </section>
                  <aside>
                    <div className="mt-4">
                      {/* ArticlePanel removed */}
                    </div>
                  </aside>
                </div>
              )}

              {page === 'users' && (
                <div>
                  <UsersList users={users} onRefresh={fetchData} />
                </div>
              )}

              {page === 'vehicles' && (
                <div>
                  <Vehicles />
                </div>
              )}

              {page === 'barangays' && (
                <div>
                  <BarangaysPanel onRefreshGlobal={fetchData} />
                </div>
              )}

              {page === 'allhistory' && (
                <div>
                  <AllEmergenciesHistory />
                </div>
              )}

              {page === 'evac' && (
                <div>
                  <EvacCenters onCreated={fetchData} />
                </div>
              )}

              {page === 'fraud' && (
                <div>
                  <FraudList />
                </div>
              )}

              {page === 'weather' && (
                <div>
                  <WeatherAlertPanel />
                </div>
              )}

              {page === 'inventory' && (
                <div>
                  <Inventory />
                </div>
              )}

              {page === 'responders' && (
                <div>
                  <ResponderManagement />
                </div>
              )}

              {page === 'media' && (
                <div>
                  <MediaViewer />
                </div>
              )}

              {page === 'reports' && (
                <div>
                  <Reports />
                </div>
              )}

              {page === 'media' && (
                <div>
                  <MediaViewer />
                </div>
              )}
            </main>

            <AssignModal open={assignOpen} emergency={selectedEmergency} onClose={closeAssign} onAssigned={fetchData} />
            {historyOpenId && <EmergencyHistoryModal emergencyId={historyOpenId} onClose={()=>setHistoryOpenId(null)} />}
            <ToastContainer />
            <ConfirmModal />
          </div>
        </div>
      )
    }
