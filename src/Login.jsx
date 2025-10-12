import React, { useState } from 'react'
import api, { setAuthToken } from './services/api'
import { initSocket } from './services/socket'

export default function Login({ onLogin }){
  const [email, setEmail] = useState('admin@sagipero.local')
  const [password, setPassword] = useState('adminpassword')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = async () => {
    setLoading(true)
    setError(null)
    try{
      const res = await api.post('/users/login', { email, password })
      const token = res.data?.token
      if(!token) throw new Error('No token')
      setAuthToken(token)
      initSocket(token)
      onLogin(token)
    }catch(err){
      console.error('login error', err)
      // Friendly message for the UI; keep detailed error in console
      if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK') {
        setError('Network error: cannot reach the API. Is the backend running?')
      } else if (err?.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error)
      } else {
        setError('Login failed. Please check your credentials and try again.')
      }
    }finally{ setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Admin Login</h2>
        <div className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="email" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="password" />
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        <div className="mt-4 text-right">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={login} disabled={loading}>{loading? 'Signing in...' : 'Sign in'}</button>
        </div>
      </div>
    </div>
  )
}
