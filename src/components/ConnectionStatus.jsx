import React, { useState, useEffect } from 'react'
import { checkBackendHealth } from '../utils/errorHandler'

export default function ConnectionStatus() {
  const [status, setStatus] = useState('checking') // 'online', 'offline', 'checking'
  const [lastCheck, setLastCheck] = useState(null)

  const checkConnection = async () => {
    setStatus('checking')
    const isHealthy = await checkBackendHealth()
    setStatus(isHealthy ? 'online' : 'offline')
    setLastCheck(new Date())
  }

  useEffect(() => {
    // Initial check
    checkConnection()
    
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'offline': return 'bg-red-500'
      case 'checking': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'online': return 'Backend Online'
      case 'offline': return 'Backend Offline'
      case 'checking': return 'Checking...'
      default: return 'Unknown'
    }
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${status === 'checking' ? 'animate-pulse' : ''}`}></div>
      <span className="text-gray-600">{getStatusText()}</span>
      {lastCheck && (
        <span className="text-xs text-gray-400">
          Last check: {lastCheck.toLocaleTimeString()}
        </span>
      )}
      <button 
        onClick={checkConnection}
        className="text-xs text-blue-600 hover:text-blue-800 underline"
        disabled={status === 'checking'}
      >
        {status === 'checking' ? 'Checking...' : 'Refresh'}
      </button>
    </div>
  )
}