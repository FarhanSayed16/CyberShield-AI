import axios from 'axios'
import toast from 'react-hot-toast'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'X-API-Key': import.meta.env.VITE_API_KEY || 'dev-key',
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (!error?.response) {
      toastOnce('Network error — check that the API is reachable.')
    } else if (status === 429) {
      toastOnce('Too many requests — please wait a moment and try again.')
    } else if (status === 401 || status === 403) {
      toastOnce('Invalid or missing API key. Check VITE_API_KEY.')
    } else {
      console.error('API Error:', error)
    }
    return Promise.reject(error)
  }
)

export default apiClient
