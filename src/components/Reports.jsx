import React, { useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

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
      const res = await api.get(`/reports/summary?${qs.join('&')}`)
      if (format === 'csv' || format === 'pdf') {
        const url = res.data?.url
        if (url) window.open(url, '_blank')
        else toast.notify({ type: 'success', message: `${format.toUpperCase()} ready` })
      } else {
        setResult(res.data)
      }
    }catch(e){ console.error(e); toast.notify({ type: 'error', message: 'Failed to fetch report' }) }
    finally{ setLoading(false) }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Reports</h3>
      <div className="flex gap-2 items-center mb-3">
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
      </div>
      {result && (
        <pre className="text-xs bg-slate-50 p-2 rounded max-h-96 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  )
}
