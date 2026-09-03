import { useEffect, useRef, useCallback } from 'react'
import { useThreatsStore } from '../stores/useThreatsStore'
import { useUIStore } from '../stores/useUIStore'
import toast from 'react-hot-toast'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/ws/threats'
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-key'

function buildWsUrl(): string {
  const sep = WS_BASE.includes('?') ? '&' : '?'
  return `${WS_BASE}${sep}api_key=${encodeURIComponent(API_KEY)}`
}

/**
 * useWebSocket — connects to backend WebSocket and auto-updates threat store.
 * Mount only under console routes (not landing).
 */
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number | null>(null)
  const reconnectDelay = useRef(1000)
  const fetchThreats = useThreatsStore(state => state.fetchThreats)
  const bumpUnreadHighRisk = useUIStore(state => state.bumpUnreadHighRisk)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(buildWsUrl())
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected to CyberSentinel live feed')
      reconnectDelay.current = 1000
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'new_threat') {
          const { payload } = msg
          fetchThreats(true)
          if (payload.threat_level === 'High Risk') {
            bumpUnreadHighRisk()
          }
          const icon = payload.threat_level === 'Safe' ? '✅' :
                       payload.threat_level === 'High Risk' ? '🚨' : '⚠️'
          toast(`${icon} ${payload.threat_type}: ${payload.explanation?.substring(0, 80)}...`, {
            style: {
              background: 'rgb(var(--color-card))',
              color: 'rgb(var(--color-text-primary))',
              border: '1px solid rgb(var(--color-border))',
            },
            duration: 5000
          })
        }
      } catch (e) {
        console.warn('[WS] Failed to parse message:', e)
      }
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected. Reconnecting...')
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [fetchThreats, bumpUnreadHighRisk])

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return
    reconnectTimer.current = window.setTimeout(() => {
      reconnectTimer.current = null
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
      connect()
    }, reconnectDelay.current)
  }, [connect])

  useEffect(() => {
    connect()

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping')
      }
    }, 25000)

    return () => {
      clearInterval(pingInterval)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])
}
