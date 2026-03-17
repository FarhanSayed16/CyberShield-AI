import { useEffect, useRef, useCallback } from 'react'
import { useThreatsStore } from '../stores/useThreatsStore'
import toast from 'react-hot-toast'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/ws/threats'

/**
 * useWebSocket — connects to backend WebSocket and auto-updates threat store
 * Handles auto-reconnect with exponential backoff.
 */
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number | null>(null)
  const reconnectDelay = useRef(1000)
  const fetchThreats = useThreatsStore(state => state.fetchThreats)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected to CyberSentinel live feed')
      reconnectDelay.current = 1000 // Reset backoff on successful connect
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'new_threat') {
          const { payload } = msg
          // Refresh the threats store
          fetchThreats(true)
          // Show live toast
          const icon = payload.threat_level === 'Safe' ? '✅' : 
                       payload.threat_level === 'High Risk' ? '🚨' : '⚠️'
          toast(`${icon} ${payload.threat_type}: ${payload.explanation?.substring(0, 80)}...`, {
            style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' },
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
  }, [fetchThreats])

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return
    reconnectTimer.current = window.setTimeout(() => {
      reconnectTimer.current = null
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
      connect()
    }, reconnectDelay.current)
  }, [connect])

  // Send periodic pings to keep connection alive
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
