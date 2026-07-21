import { useState, useEffect, Suspense, lazy } from 'react'
import { Box, Typography, Chip, Button } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import AnimatedPage from '../components/common/AnimatedPage'
import LoadingSpinner from '../components/common/LoadingSpinner'
import apiClient from '../api/client'
import DownloadIcon from '@mui/icons-material/Download'

// Lazy load existing components
const KpiCards = lazy(() => import('../features/analytics/KpiCards'))
const ThreatCharts = lazy(() => import('../features/analytics/ThreatCharts'))

interface GeoRegion {
  name: string
  lat: number
  lng: number
  count: number
  avg_risk: number
}

interface TimelineData {
  timestamps: string[]
  counts: number[]
  by_level: { Safe: number; Suspicious: number; 'High Risk': number }[]
}

export default function AnalyticsPage() {
  const [geoData, setGeoData] = useState<GeoRegion[]>([])
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true)
      try {
        const [geoRes, timeRes] = await Promise.all([
          apiClient.get('/api/analytics/geo'),
          apiClient.get('/api/analytics/timeline?hours=48'),
        ])
        setGeoData(geoRes.data.regions || [])
        setTimelineData(timeRes.data)
      } catch (e) {
        console.error('Analytics fetch error:', e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const riskColor = (risk: number) => {
    if (risk >= 60) return '#EF4444' // high-risk
    if (risk >= 30) return '#F59E0B' // suspicious
    return '#10B981' // safe
  }

  // Build stacked bar chart data from timeline
  const chartData = timelineData?.timestamps.map((ts, i) => ({
    time: ts.substring(11, 16), // HH:MM
    Safe: timelineData.by_level[i]?.Safe || 0,
    Suspicious: timelineData.by_level[i]?.Suspicious || 0,
    'High Risk': timelineData.by_level[i]?.['High Risk'] || 0,
  })) || []

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <AnimatedPage className="flex flex-col pb-6 relative z-10">
      <div className="mb-8 flex justify-between items-end relative z-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-theme-text mb-2 flex items-center gap-4 drop-shadow-sm tracking-tight">
            Security Intelligence
          </h1>
          <p className="text-sm text-theme-text-secondary font-medium">Global threat distribution, historical trends, and security metrics.</p>
        </div>
        <button 
          onClick={handleExportPDF} 
          className="glass-panel flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface border border-theme-border uppercase tracking-wider shadow-sm transition-all duration-300"
        >
          <DownloadIcon fontSize="small" />
          Export Report
        </button>
      </div>

      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      }>
        <KpiCards />

        {/* Attack Timeline — Stacked Bar Chart */}
        {chartData.length > 0 && (
          <div className="glass-card p-6 mt-6 border-t-[3px] border-t-primary relative overflow-hidden group hover:shadow-sm transition-all duration-500">
            <h3 className="text-[11px] font-bold text-theme-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Attack Timeline (48 Hours)
            </h3>
            <div className="h-[300px] relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ 
                      background: 'rgba(var(--color-surface), 0.9)', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgb(var(--color-border))', 
                      borderRadius: 12, 
                      color: 'var(--color-text-primary)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}
                    itemStyle={{ fontSize: 12, fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: '10px' }} iconType="circle" />
                  <Bar dataKey="Safe" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Suspicious" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="High Risk" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Geographic Threat Distribution */}
        {geoData.length > 0 && (
          <div className="glass-card p-6 mt-6 border-t-[3px] border-t-safe relative overflow-hidden group hover:shadow-sm transition-all duration-500">
            <h3 className="text-[11px] font-bold text-theme-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
              Geographic Threat Distribution
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
              {geoData.filter(r => r.count > 0).sort((a, b) => b.count - a.count).map((region) => (
                <div
                  key={region.name}
                  className="bg-theme-surface/50 border border-theme-border rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:bg-theme-surface transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-theme-text">{region.name}</span>
                    <span 
                      className="px-2 py-0.5 rounded text-xs font-bold border"
                      style={{ 
                        backgroundColor: `${riskColor(region.avg_risk)}22`, 
                        color: riskColor(region.avg_risk),
                        borderColor: `${riskColor(region.avg_risk)}44`
                      }}
                    >
                      {region.count}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-theme-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full relative" style={{ width: `${Math.min(100, region.avg_risk)}%`, backgroundColor: riskColor(region.avg_risk) }}>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-theme-text-secondary min-w-[30px] text-right">
                      {region.avg_risk}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {geoData.every(r => r.count === 0) && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-center mb-4 shadow-sm">
                  <span className="text-2xl">🌍</span>
                </div>
                <Typography sx={{ color: 'var(--color-text-secondary)', textAlign: 'center', fontWeight: 600 }}>
                  No geographic threat data available yet.
                </Typography>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 mt-6">
          <ThreatCharts />
        </div>
      </Suspense>
    </AnimatedPage>
  )
}
