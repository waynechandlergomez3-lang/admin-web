import { io } from 'socket.io-client'
let socket = null
export const initSocket = (token) => {
  if (socket) socket.disconnect()
  const base = import.meta.env.VITE_API_WS || (import.meta.env.VITE_API_URL || 'https://sagipero-backend-production.up.railway.app').replace('/api','')
  socket = io(base, { auth: { token } })
  return socket
}
export const getSocket = () => socket
