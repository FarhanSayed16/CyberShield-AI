import { useCallback, useEffect, useState } from 'react'
import { getStats } from '../../api/endpoints'
import type { StatsResponse } from '../../api/types'
import SecurityIcon from '@mui/icons-material/Security'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ShieldIcon from '@mui/icons-material/Shield'
import TimelineIcon from '@mui/icons-material/Timeline'

export default function KpiCards() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(() => {
    getStats()
      .then((data) => {
        setStats(data)
        setError(null)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load stats', err)
        setError('Could not load KPI metrics.')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchStats()
    const id = setInterval(fetchStats, 15000)
    return () => clearInterval(id)
  }, [fetchStats])

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-2xl skeleton border border-theme-border" />)}
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-theme-border">
        <div>
          <p className="text-sm font-bold text-theme-text">KPIs unavailable</p>
          <p className="text-sm text-theme-text-secondary mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            fetchStats()
          }}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-theme-border bg-theme-surface hover:bg-theme-border text-theme-text transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats) return null

  const kpis = [
    {
      label: 'Total Scans',
      value: stats.total_threats,
      icon: <TimelineIcon sx={{ color: '#3B82F6' }} />,
      border: 'border-primary',
      trend: stats.total_threats === 0 ? 'No scans yet' : 'All-time total'
    },
    {
      label: 'High Risk Blocked',
      value: stats.by_level['High Risk'] || 0,
      icon: <WarningAmberIcon sx={{ color: '#EF4444' }} />,
      border: 'border-high-risk',
      trend: 'Threats intercepted'
    },
    {
      label: 'Phishing Attacks',
      value: stats.by_type['phishing'] || 0,
      icon: <SecurityIcon sx={{ color: '#F59E0B' }} />,
      border: 'border-suspicious',
      trend: 'Detected by AI engine'
    },
    {
      label: 'Safe Content',
      value: stats.by_level['Safe'] || 0,
      icon: <ShieldIcon sx={{ color: '#10B981' }} />,
      border: 'border-safe',
      trend: 'Verified safe'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
      {error && (
        <div className="sm:col-span-2 lg:col-span-4 text-xs text-suspicious font-medium">
          Live refresh failed — showing last successful metrics.{' '}
          <button type="button" className="underline" onClick={fetchStats}>Retry</button>
        </div>
      )}
      {kpis.map((kpi, i) => (
        <div 
          key={i} 
          className={`glass-card p-5 border-t-[3px] ${kpi.border} hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group shadow-sm`}
        >
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-2.5 rounded-xl bg-theme-surface/50 border border-theme-border shadow-sm`}>
              {kpi.icon}
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-4xl font-display font-bold text-theme-text mb-1 drop-shadow-sm tracking-tight">
              {kpi.value.toLocaleString()}
            </h3>
            <p className="text-sm text-theme-text-secondary font-bold uppercase tracking-wider">{kpi.label}</p>
            <div className="mt-4 text-[10px] text-theme-text-secondary font-bold uppercase tracking-[0.2em] bg-theme-surface inline-block px-2 py-1 rounded border border-theme-border">
              {kpi.trend}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
