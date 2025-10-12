import axios from 'axios'
import { API_BASE } from './config'

const client = axios.create({ baseURL: API_BASE, timeout: 10000 })

export const setAuthToken = (token) => {
  if (token) client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete client.defaults.headers.common['Authorization']
}

export default client
