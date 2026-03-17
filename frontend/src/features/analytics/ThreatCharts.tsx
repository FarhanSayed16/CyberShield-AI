import { useEffect, useState } from 'react'
import { getStats } from '../../api/endpoints'
import type { StatsResponse } from '../../api/types'
import Card from '../../components/common/Card'
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

const TYPE_COLORS = ['#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444', '#10B981']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-theme-border text-xs">
        <p className="font-semibold text-theme-secondary mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-theme-secondary mt-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: <span className="text-theme-primary font-medium">{entry.value}</span></span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function ThreatCharts() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats().then(data => {
      setStats(data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  if (loading || !stats) {
    return (
      <div className="h-96 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Transform data for charts
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
      
      {/* Timeline Chart */}
      <Card className="lg:col-span-2 h-[350px] flex flex-col">
        <h3 className="text-sm font-semibold text-theme-secondary mb-4">Threat Detection Volume (Last 24h)</h3>
        <div className="flex-1 min-h-0">
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="threats" 
                  name="Detections"
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorThreats)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-theme-secondary text-sm">No activity in the last 24 hours</div>
          )}
        </div>
      </Card>

      {/* Risk Level Distribution */}
      <Card className="h-[300px] flex flex-col">
        <h3 className="text-sm font-semibold text-theme-secondary mb-4">Severity Distribution</h3>
        <div className="flex-1 min-h-0">
          {levelData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {levelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#8B5CF6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-theme-secondary text-sm">No severity data available</div>
          )}
        </div>
      </Card>

      {/* Threat Type Breakdown */}
      <Card className="h-[300px] flex flex-col">
        <h3 className="text-sm font-semibold text-theme-secondary mb-2">Threat Types</h3>
        <div className="flex-1 min-h-0 relative">
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
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
                  wrapperStyle={{ fontSize: '12px', color: '#94A3B8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-theme-secondary text-sm">No threat types data</div>
          )}
        </div>
      </Card>

    </div>
  )
}
