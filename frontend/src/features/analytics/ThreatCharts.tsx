import { useCallback, useEffect, useState } from 'react'
import { getStats } from '../../api/endpoints'
import type { StatsResponse } from '../../api/types'
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const COLORS = {
  'Safe': '#10B981',
  'Suspicious': '#F59E0B',
  'High Risk': '#EF4444',
}

const TYPE_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-theme-surface/90 backdrop-blur-md p-4 rounded-xl border border-theme-border shadow-lg text-xs">
        <p className="font-bold text-theme-text mb-3 uppercase tracking-wider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 text-theme-text-secondary mt-2 font-medium">
            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: <span className="text-theme-text font-bold ml-1 text-sm">{entry.value}</span></span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

function StatusPanel({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="h-96 flex flex-col justify-center items-center gap-3 text-center px-6">
      <p className="text-sm font-bold text-theme-text">{title}</p>
      <p className="text-sm text-theme-text-secondary max-w-md">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-theme-border bg-theme-surface hover:bg-theme-border text-theme-text transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export default function ThreatCharts() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getStats()
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setStats(null)
        setError('Could not load analytics charts.')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="h-96 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return <StatusPanel title="Charts unavailable" message={error} onRetry={load} />
  }

  if (!stats || stats.total_threats === 0) {
    return (
      <StatusPanel
        title="No data yet"
        message="Run a few scans from the dashboard to populate threat charts."
      />
    )
  }

  const timelineData = (stats.last_24h?.timestamps || []).map((time, i) => ({
    time,
    threats: stats.last_24h.counts[i] || 0
  }))

  const typeData = Object.entries(stats.by_type || {}).map(([name, value]) => ({
    name: name.replace('_', ' '), value
  }))

  const levelData = Object.entries(stats.by_level || {}).map(([name, value]) => ({
    name, value
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
      
      <div className="glass-card lg:col-span-2 h-[400px] flex flex-col p-6 border-t-[3px] border-t-primary relative overflow-hidden group hover:shadow-sm transition-all duration-500">
        <h3 className="text-[11px] font-bold text-theme-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Threat Detection Volume (Last 24h)
        </h3>
        <div className="flex-1 min-h-0 relative z-10">
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" vertical={false} />
                <XAxis dataKey="time" stroke="var(--color-text-secondary)" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="threats" 
                  name="Detections"
                  stroke="#3B82F6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorThreats)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-theme-text-secondary text-sm font-medium">No activity in the last 24 hours</div>
          )}
        </div>
      </div>

      <div className="glass-card h-[350px] flex flex-col p-6 border-t-[3px] border-t-suspicious relative overflow-hidden group hover:shadow-sm transition-all duration-500">
        <h3 className="text-[11px] font-bold text-theme-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
          <span className="w-2 h-2 rounded-full bg-suspicious animate-pulse" />
          Severity Distribution
        </h3>
        <div className="flex-1 min-h-0 relative z-10">
          {levelData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(var(--color-surface), 0.5)' }} content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {levelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-theme-text-secondary text-sm font-medium">No severity data available</div>
          )}
        </div>
      </div>

      <div className="glass-card h-[350px] flex flex-col p-6 border-t-[3px] border-t-high-risk relative overflow-hidden group hover:shadow-sm transition-all duration-500">
        <h3 className="text-[11px] font-bold text-theme-text-secondary uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10">
          <span className="w-2 h-2 rounded-full bg-high-risk animate-pulse" />
          Threat Types
        </h3>
        <div className="flex-1 min-h-0 relative z-10">
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {typeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="middle" 
                  align="right" 
                  layout="vertical"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-theme-text-secondary text-sm font-medium">No threat types data</div>
          )}
        </div>
      </div>

    </div>
  )
}
