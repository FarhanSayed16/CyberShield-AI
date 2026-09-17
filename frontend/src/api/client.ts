import axios from 'axios'
import toast from 'react-hot-toast'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

let lastToastAt = 0
function toastOnce(message: string, type: 'error' | 'blank' = 'error') {
  const now = Date.now()
  if (now - lastToastAt < 2500) return
  lastToastAt = now
  if (type === 'error') toast.error(message)
  else toast(message)
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else if (import.meta.env.VITE_API_KEY) {
    // Transitional machine/dev fallback until all callers use JWT
    config.headers['X-API-Key'] = import.meta.env.VITE_API_KEY
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (!error?.response) {
      toastOnce('Network error — check that the API is reachable.')
    } else if (status === 429) {
      const detail = error?.response?.data?.detail
      const upgrade =
        detail && typeof detail === 'object' && detail.error?.upgrade_url
          ? detail.error.upgrade_url
          : null
      const message =
        detail && typeof detail === 'object' && detail.error?.message
          ? detail.error.message
          : 'Too many requests — please wait a moment and try again.'
      toastOnce(upgrade ? `${message} Open Billing to upgrade.` : message)
      if (upgrade && typeof window !== 'undefined' && !window.location.pathname.startsWith('/ai/billing')) {
        // Keep user informed; Billing is linked from Sidebar and toast text.
      }
    } else if (status === 401) {
      localStorage.removeItem('access_token')
      const path = window.location.pathname
      if (!path.startsWith('/login') && !path.startsWith('/signup') && path !== '/') {
        toastOnce('Session expired — please sign in again.')
        window.location.href = '/login'
      }
    } else if (status === 403) {
      toastOnce('You do not have permission for that action.')
    } else {
      console.error('API Error:', error)
    }
    return Promise.reject(error)
  }
)

export default apiClient
