import React, { useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

export default function Reports(){
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('daily')
  const [date, setDate] = useState('')

  const downloadCombinedPDF = async () => {
    setLoading(true)
    try {
      const qs = []
      if (period && period !== 'all') qs.push(`period=${encodeURIComponent(period)}`)
      if (date) qs.push(`date=${encodeURIComponent(date)}`)
      qs.push('format=pdf')
      const url = `/reports/summary?${qs.join('&')}`
      const res = await api.get(url, { responseType: 'blob' })
      const blob = res.data
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `report-${(date || new Date().toISOString().slice(0,10))}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(()=>URL.revokeObjectURL(blobUrl), 60*1000)
    } catch (err) {
      console.error('Failed to download report PDF', err)
      toast.notify({ type: 'error', message: 'Failed to download report' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Reports</h3>
      <div className="flex gap-3 items-center mb-3 flex-wrap">
        <select value={period} onChange={(e)=>setPeriod(e.target.value)} className="px-2 py-1 border rounded">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Yearly</option>
          <option value="all">All time</option>
        </select>
        <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="px-2 py-1 border rounded" />
        <button className="px-4 py-2 bg-emerald-600 text-white rounded" onClick={downloadCombinedPDF} disabled={loading}>{loading ? 'Preparing…' : 'Download Report PDF'}</button>
        <div className="text-sm text-slate-500">PDF contains overall metrics and per-responder stats.</div>
      </div>
    </div>
  )
}
