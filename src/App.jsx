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
  const [evacCenters, setEvacCenters] = useState([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedEmergency, setSelectedEmergency] = useState(null)
  const [historyOpenId, setHistoryOpenId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const fetchData = async () => {
    try{
      const [e, u, v] = await Promise.all([ api.get('/emergencies'), api.get('/users'), api.get('/evacuation-centers') ])
      setEmergencies(e.data || [])
      setUsers(u.data || [])
      setEvacCenters(v.data || [])
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

  if(!token) return <div className="container"><Login onLogin={(t)=>setToken(t)} /><ToastContainer /></div>

  const openAssign = (em) => { setSelectedEmergency(em); setAssignOpen(true) }
  const closeAssign = () => { setAssignOpen(false); setSelectedEmergency(null) }
  const createEvac = async (payload) => {
    try{ await api.post('/evacuation-centers', payload); fetchData(); toast.notify({ type: 'success', message: 'Evacuation center created' }) }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to create evac center' }) }
  }
      return (
        <div className="flex h-screen">
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
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='dashboard'?'bg-slate-100':''}`} onClick={()=>setPage('dashboard')}>
                    {sidebarOpen ? 'Dashboard' : 'D'}
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='users'?'bg-slate-100':''}`} onClick={()=>setPage('users')}>
                    {sidebarOpen ? 'Users' : 'U'}
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='barangays'?'bg-slate-100':''}`} onClick={()=>setPage('barangays')}>
                    {sidebarOpen ? 'Barangays' : 'B'}
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='allhistory'?'bg-slate-100':''}`} onClick={()=>setPage('allhistory')}>
                    {sidebarOpen ? 'All History' : 'H'}
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='evac'?'bg-slate-100':''}`} onClick={()=>setPage('evac')}>
                    {sidebarOpen ? 'Evacuation Centers' : 'E'}
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='fraud'?'bg-slate-100':''}`} onClick={()=>setPage('fraud')}>
                    {sidebarOpen ? 'Fraud' : 'F'}
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='weather'?'bg-slate-100':''}`} onClick={()=>setPage('weather')}>
                    {sidebarOpen ? 'Weather Alerts' : 'W'}
                  </button>
                </li>
                <li>
                  <button className={`w-full text-left px-3 py-2 rounded ${page==='reports'?'bg-slate-100':''}`} onClick={()=>setPage('reports')}>
                    {sidebarOpen ? 'Reports' : 'R'}
                  </button>
                </li>
                <li className="mt-4">
                  <button className="w-full text-left px-3 py-2 rounded bg-red-50 text-red-700" onClick={async ()=>{ 
                    const ok = await showConfirm({ title: 'Logout', message: 'Are you sure you want to logout?', confirmText: 'Logout', cancelText: 'Cancel' })
                    if(ok) { setToken(null); setAuthToken(null); window.location.reload() }
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
              {page === 'dashboard' && <Dashboard emergencies={emergencies} users={users} evacCenters={evacCenters} onOpenAssign={openAssign} />}

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

              {page === 'reports' && (
                <div>
                  <Reports />
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
