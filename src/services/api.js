import axios from 'axios'
import { API_BASE } from './config'

const client = axios.create({ 
  baseURL: API_BASE, 
  timeout: 15000 // Increased timeout for database connection issues
})

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 seconds

// Helper function to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Check if error is retryable (database connection issues)
const isRetryableError = (error) => {
  if (!error.response) return true // Network errors are retryable
  
  const status = error.response.status
  const message = error.response.data?.error || error.message || ''
  
  // Retry on server errors and database connection issues
  return status >= 500 || 
         message.includes('database') ||
         message.includes('connection') ||
         message.includes('timeout') ||
         message.includes('Can\'t reach database server')
}

// Add request interceptor for retries
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    
    // If no retry attempts yet, initialize
    if (!config.retryCount) config.retryCount = 0
    
    // Check if we should retry
    if (config.retryCount < MAX_RETRIES && isRetryableError(error)) {
      config.retryCount += 1
      
      console.log(`API request failed, retrying... (${config.retryCount}/${MAX_RETRIES})`)
      console.log('Error:', error.message)
      
      // Wait before retrying (exponential backoff)
      await delay(RETRY_DELAY * config.retryCount)
      
      return client.request(config)
    }
    
    return Promise.reject(error)
  }
)

export const setAuthToken = (token) => {
  if (token) client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete client.defaults.headers.common['Authorization']
}

export default client
