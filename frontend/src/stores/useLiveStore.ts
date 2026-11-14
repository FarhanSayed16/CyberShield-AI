import { create } from 'zustand'

export type LiveEvent = { id: string; [key: string]: unknown }
export type LiveAlert = { id: string; severity?: string; title?: string; [key: string]: unknown }

type LiveState = {
  wsOpen: boolean
  setWsOpen: (open: boolean) => void
  revision: number
  events: LiveEvent[]
  alerts: LiveAlert[]
  pushEvent: (event: LiveEvent) => void
  pushAlert: (alert: LiveAlert) => void
}

export const useLiveStore = create<LiveState>((set) => ({
  wsOpen: false,
  setWsOpen: (wsOpen) => set({ wsOpen }),
  revision: 0,
  events: [],
  alerts: [],
  pushEvent: (event) =>
    set((s) => ({
      revision: s.revision + 1,
      events: [event, ...s.events.filter((row) => row.id !== event.id)].slice(0, 50),
    })),
  pushAlert: (alert) =>
    set((s) => ({
      revision: s.revision + 1,
      alerts: [alert, ...s.alerts.filter((row) => row.id !== alert.id)].slice(0, 50),
    })),
}))
