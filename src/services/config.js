export const API_BASE = import.meta.env.VITE_API_URL || 'https://sagipero-backend-production.up.railway.app/api'
export const WS_BASE = import.meta.env.VITE_API_WS || API_BASE.replace('/api', '')
