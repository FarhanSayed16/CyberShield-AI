import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getHealth, getStats } from '../api/endpoints'
import type { ThreatLevel } from '../api/types'

export type SystemHealthStatus = 'active' | 'degraded' | 'down' | 'unknown'

interface UIState {
  currentGlobalRiskLevel: ThreatLevel
  unreadHighRiskCount: number
  isAssistantExpanded: boolean
  latestThreatId: string | null
  themeMode: 'light' | 'dark'
  systemStatus: SystemHealthStatus
  systemStatusDetail: string
  
  toggleAssistant: () => void
  toggleTheme: () => void
  markAllRead: () => void
  bumpUnreadHighRisk: () => void
  checkSystemStatus: () => Promise<void>
  pollHealth: () => Promise<void>
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentGlobalRiskLevel: 'Safe',
      unreadHighRiskCount: 0,
      isAssistantExpanded: false,
      latestThreatId: null,
      themeMode: 'dark',
      systemStatus: 'unknown',
      systemStatusDetail: 'Checking services…',
      
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
      bumpUnreadHighRisk: () => set(state => ({ unreadHighRiskCount: state.unreadHighRiskCount + 1 })),
      
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
      },

      pollHealth: async () => {
        try {
          const health = await getHealth()
          if (health.status === 'ok') {
            set({
              systemStatus: 'active',
              systemStatusDetail: `DB ${health.db} · agents ${health.agents}`,
            })
          } else {
            set({
              systemStatus: 'degraded',
              systemStatusDetail: `DB ${health.db} · agents ${health.agents}`,
            })
          }
        } catch {
          set({
            systemStatus: 'down',
            systemStatusDetail: 'Backend unreachable',
          })
        }
      },
    }),
    {
      name: 'cybersentinel-ui-storage',
      partialize: (state) => ({ themeMode: state.themeMode }),
      onRehydrateStorage: () => (state) => {
        if (state?.themeMode === 'dark') document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      }
    }
  )
)
