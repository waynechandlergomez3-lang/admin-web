import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'

const HAGONOY = { lat: 14.834, lng: 120.732 }

const weatherCodeMap = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Depositing rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Moderate drizzle', icon: '🌧️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌧️' },
  63: { label: 'Moderate rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Moderate rain showers', icon: '🌧️' },
  82: { label: 'Violent rain showers', icon: '⛈️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️' },
  99: { label: 'Severe thunderstorm', icon: '🌩️' }
}

function prettyHourLabel(iso) {
  try{ return new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: true }) }catch(e){ return iso }
}

export default function WeatherAlertPanel(){
  const mapRef = useRef(null)
  const weatherMarkerRef = useRef(null)
  const [areaBounds, setAreaBounds] = useState(null)
  const [hourly, setHourly] = useState([])
  const [selectedHours, setSelectedHours] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [severity, setSeverity] = useState('MEDIUM')
  const [broadcastAll, setBroadcastAll] = useState(true)
  const [targetRoles, setTargetRoles] = useState(new Set())
  const [customMessage, setCustomMessage] = useState('')

  useEffect(()=>{
    if(!mapRef.current){
      mapRef.current = L.map('weather-map').setView([HAGONOY.lat, HAGONOY.lng], 10)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(mapRef.current)

      // rectangle drawing (simple)
      let startLatLng = null
      let rect = null
      function onDown(e){ startLatLng = e.latlng }
      function onMove(e){ if(!startLatLng) return; if(rect) mapRef.current.removeLayer(rect); rect = L.rectangle([startLatLng, e.latlng], { color: '#ff0000', weight: 1 }).addTo(mapRef.current) }
      function onUp(e){ if(!startLatLng) return; const b = L.latLngBounds(startLatLng, e.latlng); setAreaBounds(b); startLatLng = null }

      mapRef.current.on('mousedown', onDown)
      mapRef.current.on('mousemove', onMove)
      mapRef.current.on('mouseup', onUp)
    }

  // autoload Hagonoy forecast on mount
  loadHourlyForCenter(HAGONOY.lat, HAGONOY.lng)
    fetchAlerts()
  }, [])

  const fetchAlerts = async ()=>{
    try{ const res = await api.get('/weather-alerts'); setAlerts(res.data || []) }catch(err){ console.error('fetchAlerts', err) }
  }

  const loadHourlyForCenter = async (lat, lng) => {
    setLoading(true)
    try{
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weathercode,windspeed_10m,winddirection_10m&current_weather=true&timezone=Asia/Manila`)
      const data = await res.json()
      const list = (data.hourly.time || []).map((t, i)=>({ time: t, temp: data.hourly.temperature_2m[i], code: data.hourly.weathercode[i], wind: data.hourly.windspeed_10m[i], dir: data.hourly.winddirection_10m[i], index: i }))
      setHourly(list)
      setSelectedHours(new Set())

      // show current weather marker on map
      try{
        const cur = data.current_weather
        if(cur && mapRef.current){
          const latlng = [lat, lng]
          if(weatherMarkerRef.current) mapRef.current.removeLayer(weatherMarkerRef.current)
          const wc = weatherCodeMap[cur.weathercode] || { label: 'Unknown', icon: '❓' }
          const markerHtml = `<div style="padding:6px 8px;border-radius:8px;background:rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(0,0,0,0.15);font-weight:600;">${wc.icon} ${Math.round(cur.temperature)}°C<br/><span style="font-size:11px;color:#444">${wc.label}</span></div>`
          weatherMarkerRef.current = L.marker(latlng, { icon: L.divIcon({ className: 'weather-marker', html: markerHtml }) }).addTo(mapRef.current)
          mapRef.current.setView(latlng, 11)
        }
      }catch(e){ console.warn('marker fail', e) }

    }catch(err){ console.error('loadHourly', err) }
    setLoading(false)
  }

  const loadHourly = async ()=>{
    const lat = (areaBounds ? (areaBounds.getCenter().lat) : HAGONOY.lat)
    const lng = (areaBounds ? (areaBounds.getCenter().lng) : HAGONOY.lng)
    await loadHourlyForCenter(lat, lng)
  }

  // Weather overlay support
  const owmKey = import.meta.env.VITE_OPENWEATHERMAP_KEY || null
  const overlayState = useRef({ owmLayer: null, windyEl: null })

  const toggleWeatherOverlay = () => {
    try{
      if(!mapRef.current) return
      // If OWM key provided, toggle OWM precipitation layer
      if(owmKey){
        if(!overlayState.current.owmLayer){
          const url = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${owmKey}`
          overlayState.current.owmLayer = L.tileLayer(url, { attribution: 'Weather tiles © OpenWeatherMap' }).addTo(mapRef.current)
        }else{
          mapRef.current.removeLayer(overlayState.current.owmLayer)
          overlayState.current.owmLayer = null
        }
        return
      }

      // Fallback: embed Windy widget iframe inside the map container
      const container = document.getElementById('weather-map')
      if(!overlayState.current.windyEl){
        const iframe = document.createElement('iframe')
        iframe.src = `https://embed.windy.com/embed2.html?lat=${HAGONOY.lat}&lon=${HAGONOY.lng}&zoom=8&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&detailLat=${HAGONOY.lat}&detailLon=${HAGONOY.lng}`
        iframe.style.position = 'absolute'
        iframe.style.top = '0'
        iframe.style.left = '0'
        iframe.style.width = '100%'
        iframe.style.height = '100%'
        iframe.style.border = 'none'
        iframe.style.pointerEvents = 'none' // keep map interactions
        container.appendChild(iframe)
        overlayState.current.windyEl = iframe
      }else{
        overlayState.current.windyEl.remove()
        overlayState.current.windyEl = null
      }
    }catch(e){ console.warn('toggle overlay', e) }
  }

  // Compute PH-local day/week range (start/end ISO strings)
  const computeRange = (scope) => {
    const now = new Date()
    // convert to Asia/Manila by building a locale string then new Date
    const tz = 'Asia/Manila'
    const local = new Date(now.toLocaleString('en-US', { timeZone: tz }))
    if(scope === 'today'){
      const start = new Date(local)
      start.setHours(0,0,0,0)
      const end = new Date(local)
      end.setHours(23,59,59,999)
      return { start: start.toISOString(), end: end.toISOString() }
    }
    if(scope === 'week'){
      const start = new Date(local)
      // start of week (Monday) - adjust if you prefer Sunday
      const day = start.getDay() || 7 // Sunday -> 7
      start.setDate(start.getDate() - (day - 1))
      start.setHours(0,0,0,0)
      const end = new Date(start)
      end.setDate(start.getDate() + 7)
      end.setHours(23,59,59,999)
      return { start: start.toISOString(), end: end.toISOString() }
    }
    return null
  }

  const toggleHour = (idx)=>{
    const s = new Set(selectedHours)
    if(s.has(idx)) s.delete(idx)
    else s.add(idx)
    setSelectedHours(s)
  }

  const sendAlert = async ({ title = 'Weather Alert', daily = false, scope = null, startAt = null, endAt = null } = {})=>{
    try{
      const payload = {
        title,
        message: daily ? 'Daily forecast alert' : 'Hourly forecast alert',
        area: areaBounds ? { nw: areaBounds.getNorthWest(), se: areaBounds.getSouthEast() } : null,
        hourlyIndexes: daily ? null : Array.from(selectedHours),
        daily: !!daily,
        scope: scope,
        startAt: startAt,
        endAt: endAt
      }
      // attach severity and targeting info from UI
      payload.severity = severity
      payload.broadcastAll = broadcastAll
      if(!broadcastAll){ payload.targetRoles = Array.from(targetRoles) }

      await api.post('/weather-alerts', payload)
      alert('Weather alert sent')
      fetchAlerts()
    }catch(err){ console.error('sendAlert', err); alert('Failed to send') }
  }

  const removeAlert = async (id)=>{
    try{ await api.delete(`/weather-alerts/${id}`); fetchAlerts() }catch(e){ console.error(e) }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-4">
      <h2 className="text-lg font-semibold">Weather Alerts — Hagonoy</h2>
      <div className="grid lg:grid-cols-[1fr,360px] gap-4">
        <div>
          <div id="weather-map" style={{ width: '100%', height: 420, borderRadius: 8 }} />
          <div className="mt-2 text-sm text-slate-500">Drag on the map to select an area (simple rectangle). Forecast auto-loads for Hagonoy on page open.</div>
          <div className="flex flex-col gap-3 mt-3">
            <div className="flex flex-wrap items-center gap-3">
              <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={loadHourly} disabled={loading}>{loading ? 'Loading...' : 'Reload Forecast'}</button>
              <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={()=>{
                const r = computeRange('today')
                sendAlert({ title: 'Weather alert — Today', scope: 'today', startAt: r.start, endAt: r.end })
              }}>Send Today</button>
              <button className="px-3 py-1 bg-fuchsia-600 text-white rounded" onClick={()=>{
                const r = computeRange('week')
                sendAlert({ title: 'Weather alert — Week', scope: 'week', startAt: r.start, endAt: r.end })
              }}>Send Week</button>
              <button className="px-3 py-1 bg-gray-600 text-white rounded" onClick={toggleWeatherOverlay}>Toggle Weather Overlay</button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-sm">Severity</span>
                <select value={severity} onChange={(e)=>setSeverity(e.target.value)} className="ml-2 px-2 py-1 border rounded">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="SEVERE">SEVERE</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={broadcastAll} onChange={(e)=>setBroadcastAll(e.target.checked)} />
                <span className="text-sm">Broadcast to all users</span>
              </label>

              <div className="flex items-center gap-3">
                <span className="text-sm">Target Roles:</span>
                {['ADMIN','RESPONDER','RESIDENT'].map(r => (
                  <label key={r} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={targetRoles.has(r)} onChange={()=>{
                      const s = new Set(targetRoles)
                      if(s.has(r)) s.delete(r); else s.add(r)
                      setTargetRoles(s)
                      if(s.size > 0) setBroadcastAll(false)
                    }} />
                    <span className="px-1">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs text-slate-500">Note: Urgent alerts (HIGH/SEVERE) will be prefixed with an urgent marker and sent as high-priority pushes. iOS Critical Alerts require special Apple entitlements.</div>
              <label className="flex flex-col">
                <span className="text-sm">Custom message (optional)</span>
                <textarea value={customMessage} onChange={(e)=>setCustomMessage(e.target.value)} className="mt-1 p-2 border rounded" rows={3} />
              </label>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-red-700 text-white rounded" onClick={()=>{
                  // send an urgent severe broadcast using the custom message if provided
                  const title = 'SEVERE WEATHER ALERT'
                  const msg = customMessage || 'Immediate threat: seek shelter and follow evacuation orders.'
                  setSeverity('SEVERE')
                  setBroadcastAll(true)
                  sendAlert({ title, daily: false, scope: 'now', startAt: new Date().toISOString(), endAt: null })
                }}>Send URGENT (SEVERE)</button>

                <button className="px-3 py-1 bg-orange-600 text-white rounded" onClick={()=>{
                  // send a high-priority broadcast
                  setSeverity('HIGH')
                  setBroadcastAll(true)
                  sendAlert({ title: 'HIGH WEATHER ALERT', daily: false })
                }}>Send HIGH</button>
              </div>
            </div>
          </div>
        </div>

        <aside>
          <div className="overflow-auto" style={{ maxHeight: 420 }}>
            <h3 className="font-medium">Hourly Forecast (Hagonoy)</h3>
            {hourly.length === 0 && <div className="text-sm text-slate-500 mt-2">Loading forecast…</div>}
            <ul className="space-y-2 mt-2">
              {hourly.slice(0,24).map(h => {
                const wc = weatherCodeMap[h.code] || { label: 'Unknown', icon: '❓' }
                return (
                <li key={h.index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{prettyHourLabel(h.time)} — {wc.icon} {wc.label}</div>
                    <div className="text-sm text-slate-500">Feels like {Math.round(h.temp)}°C • Wind {Math.round(h.wind)} km/h</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedHours.has(h.index)} onChange={()=>toggleHour(h.index)} />
                    <button className="px-2 py-1 bg-green-600 text-white rounded text-sm" onClick={()=>{ setSelectedHours(new Set([h.index])); sendAlert({ title: `Weather alert ${prettyHourLabel(h.time)}`, daily: false }) }}>Send</button>
                  </div>
                </li>
              )})}
            </ul>

            <div className="mt-4">
              <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={()=>sendAlert({ daily: false })} disabled={selectedHours.size===0}>Send Selected Hours</button>
            </div>

            <hr className="my-3" />
            <h3 className="font-medium">Active Alerts</h3>
            <ul className="space-y-2 mt-2">
              {alerts.map(a => (
                <li key={a.id} className="p-2 border rounded flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-red-700">{a.title}</div>
                    <div className="text-sm text-slate-600">{a.message}</div>
                    <div className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="px-2 py-1 bg-yellow-500 rounded" onClick={()=>alert('Edit not implemented in admin UI yet')}>Edit</button>
                    <button className="px-2 py-1 bg-red-500 text-white rounded" onClick={()=>removeAlert(a.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
