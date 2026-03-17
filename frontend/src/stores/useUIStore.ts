import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getStats } from '../api/endpoints'
import type { ThreatLevel } from '../api/types'

interface UIState {
  currentGlobalRiskLevel: ThreatLevel
  unreadHighRiskCount: number
  isAssistantExpanded: boolean
  latestThreatId: string | null
  themeMode: 'light' | 'dark'
  
  toggleAssistant: () => void
  toggleTheme: () => void
  markAllRead: () => void
  checkSystemStatus: () => Promise<void>
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentGlobalRiskLevel: 'Safe',
      unreadHighRiskCount: 0,
      isAssistantExpanded: false,
      latestThreatId: null,
      themeMode: 'dark', // Default to dark
      
      toggleAssistant: () => set(state => ({ isAssistantExpanded: !state.isAssistantExpanded })),
      
      toggleTheme: () => {
        set(state => {
          const newMode = state.themeMode === 'light' ? 'dark' : 'light'
          if (newMode === 'dark') document.documentElement.classList.add('dark')
          else document.documentElement.classList.remove('dark')
          return { themeMode: newMode }
        })
      },

      markAllRead: () => set({ unreadHighRiskCount: 0 }),
      
      checkSystemStatus: async () => {
        try {
          const stats = await getStats()
          let newLevel: ThreatLevel = 'Safe'
          if ((stats.by_level['High Risk'] || 0) > 10) newLevel = 'High Risk'
          else if ((stats.by_level['Suspicious'] || 0) > 20) newLevel = 'Suspicious'
          set({ currentGlobalRiskLevel: newLevel })
        } catch (err) {
          console.error('Failed to poll system status', err)
        }
      }
    }),
    {
      name: 'cybersentinel-ui-storage',
      partialize: (state) => ({ themeMode: state.themeMode }), // Only persist theme mode
      onRehydrateStorage: () => (state) => {
        // Apply theme immediately after loading persisted state
        if (state?.themeMode === 'dark') document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      }
    }
  )
)
