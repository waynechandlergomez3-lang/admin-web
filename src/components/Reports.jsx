import React, { useMemo, useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

function downloadBlob(data, filename, type='application/json'){
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(()=>URL.revokeObjectURL(url), 60*1000)
}

export default function Reports(){
  const [period, setPeriod] = useState('daily')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const fetchReport = async (format='json') => {
    setLoading(true)
    try{
      const qs = []
      qs.push(`period=${encodeURIComponent(period)}`)
      if (date) qs.push(`date=${encodeURIComponent(date)}`)
      qs.push(`format=${encodeURIComponent(format)}`)
      const options = (format === 'csv' || format === 'pdf') ? { responseType: 'blob' } : undefined
      const res = await api.get(`/reports/summary?${qs.join('&')}`, options)

      if (format === 'csv' || format === 'pdf') {
        const contentType = (res.headers && res.headers['content-type']) || ''
        if (contentType.includes('application/json')) {
          const text = await res.data.text()
          try {
            const parsed = JSON.parse(text)
            const url = parsed?.url
            if (url) window.open(url, '_blank')
            else toast.notify({ type: 'success', message: `${format.toUpperCase()} ready` })
          } catch (err) {
            console.error('Failed to parse JSON blob from report response', err)
            toast.notify({ type: 'error', message: 'Failed to fetch report' })
          }
        } else {
          const blob = res.data
          const blobUrl = URL.createObjectURL(blob)
          window.open(blobUrl, '_blank')
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000)
        }
      } else {
        setResult(res.data)
      }
    }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to fetch report' }) }
    finally{ setLoading(false) }
  }

  const metrics = useMemo(()=>{
    if(!result) return null

    // Support several shapes: { emergencies: [...] } or { data: [...] } or raw summary
    const list = result.emergencies || result.data || result.items || result || []
    if(!Array.isArray(list)) return result

    const total = list.length
    const byPriority = { '1':0, '2':0, '3':0 }
    const byStatus = {}
    const byBarangay = {}
    const byReporter = {}
    const timeline = {}

    list.forEach(e => {
      const p = String(e.priority ?? e.severity ?? e.priority_level ?? '3')
      if(byPriority[p] === undefined) byPriority[p] = 0
      byPriority[p] = (byPriority[p] || 0) + 1

      const st = e.status || e.state || 'unknown'
      byStatus[st] = (byStatus[st] || 0) + 1

      const b = e.barangay || e.location?.barangay || 'Unknown'
      byBarangay[b] = (byBarangay[b] || 0) + 1

      const r = e.reporter_name || e.user?.name || e.reporter || 'Unknown'
      byReporter[r] = (byReporter[r] || 0) + 1

      const day = (e.createdAt || e.created_at || e.date) ? String((new Date(e.createdAt || e.created_at || e.date)).toISOString().slice(0,10)) : 'unknown'
      timeline[day] = (timeline[day] || 0) + 1
    })

    const topBarangays = Object.entries(byBarangay).sort((a,b)=>b[1]-a[1]).slice(0,6)
    const topReporters = Object.entries(byReporter).sort((a,b)=>b[1]-a[1]).slice(0,6)

    return { total, byPriority, byStatus, topBarangays, topReporters, timeline, rawList: list }
  }, [result])

  const exportJSON = () => {
    if(!result) return toast.notify({ type: 'info', message: 'No data to export' })
    downloadBlob(JSON.stringify(result, null, 2), `report-${period}-${date || 'all'}.json`, 'application/json')
  }

  const exportVisibleCSV = () => {
    const rows = metrics?.rawList || []
    if(!rows || rows.length === 0) return toast.notify({ type: 'info', message: 'No data to export' })
    const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
    const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => `"${String(r[k] ?? '')}"`).join(','))).join('\n')
    downloadBlob(csv, `report-${period}-${date || 'all'}.csv`, 'text/csv')
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Reports</h3>
      <div className="flex gap-2 items-center mb-3 flex-wrap">
        <select value={period} onChange={(e)=>setPeriod(e.target.value)} className="px-2 py-1 border rounded">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>
        <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="px-2 py-1 border rounded" />
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>fetchReport('json')} disabled={loading}>{loading?'...':'View JSON'}</button>
        <button className="px-3 py-1 bg-slate-100 rounded" onClick={()=>fetchReport('csv')} disabled={loading}>Download CSV</button>
        <button className="px-3 py-1 bg-slate-100 rounded" onClick={()=>fetchReport('pdf')} disabled={loading}>Download PDF</button>
        <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={exportJSON} disabled={!result}>Export JSON</button>
        <button className="px-3 py-1 bg-amber-500 text-white rounded" onClick={exportVisibleCSV} disabled={!metrics}>Export Visible CSV</button>
      </div>

      {metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2">
            <div className="flex gap-3 mb-3">
              <div className="p-3 bg-slate-50 rounded shadow-sm flex-1">
                <div className="text-sm text-gray-500">Total Emergencies</div>
                <div className="text-2xl font-bold">{metrics.total}</div>
              </div>
              <div className="p-3 bg-red-50 rounded shadow-sm w-36">
                <div className="text-xs text-red-600">High (1)</div>
                <div className="text-xl font-semibold text-red-700">{metrics.byPriority['1'] || 0}</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded shadow-sm w-36">
                <div className="text-xs text-yellow-700">Medium (2)</div>
                <div className="text-xl font-semibold text-yellow-800">{metrics.byPriority['2'] || 0}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded shadow-sm w-36">
                <div className="text-xs text-gray-600">Low (3)</div>
                <div className="text-xl font-semibold">{metrics.byPriority['3'] || 0}</div>
              </div>
            </div>

            <div className="bg-white border rounded p-3">
              <div className="text-sm font-medium mb-2">Top Barangays</div>
              <div className="space-y-2">
                {metrics.topBarangays.map(([b, count], idx) => (
                  <div key={b} className="flex items-center gap-2">
                    <div className="text-xs w-36 truncate">{idx+1}. {b}</div>
                    <div className="h-3 bg-slate-100 w-full rounded overflow-hidden">
                      <div style={{ width: `${Math.round((count / Math.max(1, metrics.total)) * 100)}%` }} className="h-3 bg-blue-500" />
                    </div>
                    <div className="text-sm w-12 text-right">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <div className="bg-white border rounded p-3 mb-3">
              <div className="text-sm font-medium mb-2">Status Breakdown</div>
              {Object.entries(metrics.byStatus).map(([k,v])=> (
                <div key={k} className="flex justify-between text-sm py-1 border-b last:border-b-0"><div>{k}</div><div className="font-medium">{v}</div></div>
              ))}
            </div>

            <div className="bg-white border rounded p-3">
              <div className="text-sm font-medium mb-2">Top Reporters</div>
              <ul className="text-sm space-y-1">
                {metrics.topReporters.map(([r,c])=> (
                  <li key={r} className="flex justify-between"><span className="truncate w-40">{r}</span><span className="font-medium">{c}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">No report loaded. Choose a period and click "View JSON" to fetch details.</div>
      )}

      {result && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Raw data preview</div>
          <pre className="text-xs bg-slate-50 p-2 rounded max-h-96 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
