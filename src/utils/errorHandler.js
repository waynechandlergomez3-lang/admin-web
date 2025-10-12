// Global error handler for API calls
// Provides consistent error handling across the admin-web application

export const handleApiError = (error, context = 'API call') => {
  console.error(`${context} failed:`, error)
  
  let userMessage = 'An unexpected error occurred. Please try again.'
  let isRetryable = false
  
  if (!error.response) {
    // Network error
    userMessage = 'Unable to connect to the server. Please check your internet connection and try again.'
    isRetryable = true
  } else {
    const status = error.response.status
    const serverError = error.response.data?.error || error.response.data?.message || ''
    
    switch (status) {
      case 401:
        userMessage = 'Authentication failed. Please log in again.'
        break
      case 403:
        userMessage = 'You do not have permission to perform this action.'
        break
      case 404:
        userMessage = 'The requested resource was not found.'
        break
      case 408:
      case 409:
        userMessage = 'Request timeout. Please try again.'
        isRetryable = true
        break
      case 429:
        userMessage = 'Too many requests. Please wait a moment before trying again.'
        isRetryable = true
        break
      case 500:
      case 502:
      case 503:
      case 504:
        if (serverError.includes('database') || serverError.includes('connection')) {
          userMessage = 'Database connection issue. The system is working to resolve this. Please try again in a moment.'
        } else {
          userMessage = 'Server error. Please try again in a few moments.'
        }
        isRetryable = true
        break
      default:
        if (serverError) {
          userMessage = serverError
        }
    }
  }
  
  return {
    message: userMessage,
    isRetryable,
    originalError: error,
    statusCode: error.response?.status
  }
}

// Hook for showing user-friendly error messages
export const useApiError = () => {
  const showError = (error, context) => {
    const errorInfo = handleApiError(error, context)
    
    // You can customize this to use your preferred notification system
    // For now, we'll just return the error info
    return errorInfo
  }
  
  return { showError }
}

// Helper to check if the backend is healthy
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE || 'https://sagipero-backend-production.up.railway.app'}/health`, {
      method: 'GET',
      timeout: 5000
    })
    return response.ok
  } catch (error) {
    console.warn('Backend health check failed:', error)
    return false
  }
}