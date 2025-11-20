import React, { useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

export default function Reports(){
  const [loading, setLoading] = useState(false)

  const downloadResponderPDF = async () => {
    setLoading(true)
    try {
      // Request combined PDF (includes responder metrics)
      const res = await api.get(`/reports/summary?format=pdf`, { responseType: 'blob' })
      const blob = res.data
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `report-${new Date().toISOString().slice(0,10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(()=>URL.revokeObjectURL(blobUrl), 60*1000)
    } catch (err) {
      console.error('Failed to download responder PDF', err)
      toast.notify({ type: 'error', message: 'Failed to download report' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Reports</h3>
      <div className="flex gap-2 items-center">
        <button className="px-4 py-2 bg-emerald-600 text-white rounded" onClick={downloadResponderPDF} disabled={loading}>{loading ? 'Preparing…' : 'Download Responder PDF'}</button>
        <div className="text-sm text-slate-500">PDF contains per-responder average response time and totals (resolved / acted / fraud).</div>
      </div>
    </div>
  )
}
