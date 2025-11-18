import React, { useState } from 'react'
import api, { setAuthToken } from './services/api'
import { initSocket } from './services/socket'
import { API_BASE } from './services/config'

export default function Login({ onLogin }){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const login = async () => {
    setLoading(true)
    setError(null)
    
    try{
      const res = await api.post('/users/login', { email, password })
      const token = res.data?.token
      if(!token) throw new Error('No token')
      setAuthToken(token)
      initSocket(token)
      setRetryCount(0) // Reset retry count on success
      onLogin(token)
    }catch(err){
      console.error('login error', err)
      
      // Get retry count from API client if available
      const apiRetryCount = err.config?.retryCount || 0
      setRetryCount(apiRetryCount)
      
      // Enhanced error handling for database connection issues
      let errorMessage = 'Login failed. Please try again.'
      
      if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Cannot reach the backend server. Please check your internet connection.'
      } else if (err?.response) {
        const status = err.response.status
        const serverError = err.response.data?.error || ''
        
        if (status >= 500) {
          if (serverError.includes('database') || serverError.includes('connection')) {
            errorMessage = 'Database connection issue. The system is retrying automatically. Please wait a moment and try again.'
          } else {
            errorMessage = 'Server error. Please try again in a few moments.'
          }
        } else if (status === 401) {
          errorMessage = 'Invalid email or password. Please check your credentials.'
        } else if (status === 429) {
          errorMessage = 'Too many login attempts. Please wait a moment before trying again.'
        } else if (serverError) {
          errorMessage = serverError
        }
      } else if (err?.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The server may be experiencing high load. Please try again.'
      }
      
      setError(errorMessage)
    }finally{ 
      setLoading(false) 
    }
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
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <div className="text-sm text-red-600">{error}</div>
            {retryCount > 0 && (
              <div className="text-xs text-red-500 mt-1">
                Retried {retryCount} time{retryCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
        
        {loading && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm text-blue-600 flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {retryCount > 0 ? `Retrying connection... (${retryCount}/3)` : 'Signing in...'}
            </div>
          </div>
        )}
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {API_BASE ? `Server: ${API_BASE}` : 'Backend URL not configured'}
          </div>
          <div className="space-x-2">
            {error && !loading && (
              <button 
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200" 
                onClick={login}
              >
                Retry
              </button>
            )}
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={login} 
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
