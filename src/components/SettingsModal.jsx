import React, { useState } from 'react'
import { getApiBase, saveApiBase, DEFAULT_API_BASE } from '../services/config'
import { updateApiBase } from '../services/api'

export default function SettingsModal({ open, onClose, onSaved }) {
  const current = typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_API_BASE') || DEFAULT_API_BASE) : DEFAULT_API_BASE
  const [apiBase, setApiBase] = useState(current)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  if (!open) return null

  const save = () => {
    try {
      updateApiBase(apiBase, true)
      setTestResult({ ok: true, message: 'Saved' })
      if (onSaved) onSaved(apiBase)
      if (onClose) onClose()
    } catch (e) {
      setTestResult({ ok: false, message: String(e) })
    }
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const healthUrl = apiBase.replace(/\/$/, '') + '/health'
      const resp = await fetch(healthUrl, { method: 'GET' })
      if (resp.ok) setTestResult({ ok: true, message: `OK ${resp.status}` })
      else setTestResult({ ok: false, message: `HTTP ${resp.status}` })
    } catch (e) {
      setTestResult({ ok: false, message: e.message || String(e) })
    }
    setTesting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-6 z-50">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-lg">
        <h2 className="text-lg font-semibold">Admin Web Settings</h2>
        <div className="mt-4">
          <label className="block text-sm text-slate-600">API Base URL</label>
          <input className="mt-1 w-full border rounded px-3 py-2" value={apiBase} onChange={(e)=>setApiBase(e.target.value)} />
          <p className="text-xs text-slate-500 mt-2">Example: https://your-backend.example.com or https://your-backend.example.com/api</p>
        </div>

        <div className="flex gap-2 mt-4">
          <button className="px-3 py-1 bg-slate-100 rounded" onClick={test} disabled={testing}>{testing ? 'Testing...' : 'Test /health'}</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={save}>Save</button>
          <button className="px-3 py-1 rounded" onClick={()=>{ if (onClose) onClose() }}>Cancel</button>
        </div>

        {testResult && (
          <div className={`mt-4 p-2 rounded ${testResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  )
}
