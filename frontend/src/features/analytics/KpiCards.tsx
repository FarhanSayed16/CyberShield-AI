import { useEffect, useState } from 'react'
import { getStats } from '../../api/endpoints'
import type { StatsResponse } from '../../api/types'
import Card from '../../components/common/Card'
import SecurityIcon from '@mui/icons-material/Security'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ShieldIcon from '@mui/icons-material/Shield'
import TimelineIcon from '@mui/icons-material/Timeline'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function KpiCards() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = () => {
      getStats().then(data => {
        setStats(data)
        setLoading(false)
      }).catch(err => {
        console.error('Failed to load stats', err)
        setLoading(false)
      })
    }

    fetchStats()
    const id = setInterval(fetchStats, 15000)
    return () => clearInterval(id)
  }, [])

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl skeleton" />)}
      </div>
    )
  }

  const kpis = [
    {
      label: 'Total Scans',
      value: stats.total_threats,
      icon: <TimelineIcon sx={{ color: '#8B5CF6' }} />,
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      trend: 'All-time total'
    },
    {
      label: 'High Risk Blocked',
      value: stats.by_level['High Risk'] || 0,
      icon: <WarningAmberIcon sx={{ color: '#EF4444' }} />,
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      trend: 'Threats intercepted'
    },
    {
      label: 'Phishing Attacks',
      value: stats.by_type['phishing'] || 0,
      icon: <SecurityIcon sx={{ color: '#F59E0B' }} />,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      trend: 'Detected by AI engine'
    },
    {
      label: 'Safe Content',
      value: stats.by_level['Safe'] || 0,
      icon: <ShieldIcon sx={{ color: '#10B981' }} />,
      bg: 'bg-safe/10',
      border: 'border-safe/20',
      trend: 'Verified safe'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi, i) => (
        <Card key={i} className={`!p-4 border ${kpi.border} animate-fade-in`}>
          <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-lg ${kpi.bg}`}>
              {kpi.icon}
            </div>
          </div>
          <h3 className="text-3xl font-bold text-theme-primary mb-1">{kpi.value.toLocaleString()}</h3>
          <p className="text-sm text-theme-secondary font-medium">{kpi.label}</p>
          <div className="mt-3 text-[10px] text-theme-secondary">
            {kpi.trend}
          </div>
        </Card>
      ))}
    </div>
  )
}
