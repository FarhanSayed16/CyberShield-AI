import { create } from 'zustand'
import { getThreats, getThreatById } from '../api/endpoints'
import type { AnalyzeResponse } from '../api/types'
import toast from 'react-hot-toast'

interface ThreatsState {
  threats: AnalyzeResponse[]
  total: number
  isLoading: boolean
  error: string | null
  lastRefreshedAt: Date | null
  pollingInterval: number | null
  pollingRefs: number
  
  // Pagination & Filters
  page: number
  pageSize: number
  filterType: string
  filterLevel: string
  
  // Detail View
  selectedThreatId: string | null
  selectedThreatDetail: AnalyzeResponse | null
  isDetailLoading: boolean
  
  // Actions
  setFilters: (type: string, level: string) => void
  setPage: (page: number) => void
  fetchThreats: (isPolling?: boolean) => Promise<void>
  selectThreat: (id: string | null) => Promise<void>
  startPolling: () => void
  stopPolling: () => void
}

export const useThreatsStore = create<ThreatsState>((set, get) => ({
  threats: [],
  total: 0,
  isLoading: false,
  error: null,
  lastRefreshedAt: null,
  pollingInterval: null,
  pollingRefs: 0,
  
  page: 1,
  pageSize: 20,
  filterType: 'All',
  filterLevel: 'All',
  
  selectedThreatId: null,
  selectedThreatDetail: null,
  isDetailLoading: false,
  
  setFilters: (type, level) => {
    set({ filterType: type, filterLevel: level, page: 1 })
    get().fetchThreats()
  },
  
  setPage: (page) => {
    set({ page })
    get().fetchThreats()
  },
  
  startPolling: () => {
    const refs = get().pollingRefs + 1
    set({ pollingRefs: refs })
    if (get().pollingInterval) return
    
    const id = window.setInterval(() => {
      get().fetchThreats(true)
    }, 10000)
    set({ pollingInterval: id })
  },
  
  stopPolling: () => {
    const refs = Math.max(0, get().pollingRefs - 1)
    set({ pollingRefs: refs })
    if (refs === 0) {
      const { pollingInterval } = get()
      if (pollingInterval) {
        window.clearInterval(pollingInterval)
        set({ pollingInterval: null })
      }
    }
  },
  
  fetchThreats: async (isPolling = false) => {
    const { page, pageSize, filterLevel, filterType, total } = get()
    if (!isPolling) set({ isLoading: true, error: null })
    
    try {
      const response = await getThreats(page, pageSize, filterLevel, filterType)
      
      // Notify if new threats arrived during polling AND we are on page 1
      if (isPolling && response.total > total && page === 1) {
        const newCount = response.total - total
        toast(`🚨 ${newCount} new threat${newCount > 1 ? 's' : ''} detected`, { 
          icon: '🛡️',
          style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' }
        })
      }
      
      set({ 
        threats: response.items, 
        total: response.total, 
        isLoading: false,
        error: null,
        lastRefreshedAt: new Date()
      })
    } catch (err: any) {
      if (!isPolling) set({ error: err.message || 'Failed to list threats', isLoading: false })
      else console.error('Polling fetch threats failed:', err)
    }
  },
  
  selectThreat: async (id) => {
    if (!id) {
      set({ selectedThreatId: null, selectedThreatDetail: null })
      return
    }
    
    set({ selectedThreatId: id, isDetailLoading: true })
    
    try {
      // First check if we have it in the list
      const cached = get().threats.find(t => t.id === id)
      if (cached) {
        set({ selectedThreatDetail: cached, isDetailLoading: false })
        return
      }
      
      // Otherwise fetch it
      const detail = await getThreatById(id)
      set({ selectedThreatDetail: detail, isDetailLoading: false })
    } catch (err: any) {
      set({ selectedThreatDetail: null, isDetailLoading: false, error: err.message || 'Failed to load threat details' })
    }
  }
}))
