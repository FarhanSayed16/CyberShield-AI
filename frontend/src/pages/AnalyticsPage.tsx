import { useState, useEffect, Suspense, lazy } from 'react'
import { Box, Typography, Paper, Chip, Button } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import AnimatedPage from '../components/common/AnimatedPage'
import LoadingSpinner from '../components/common/LoadingSpinner'
import apiClient from '../api/client'

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
    if (risk >= 60) return '#EF4444'
    if (risk >= 30) return '#F59E0B'
    return '#10B981'
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
    <AnimatedPage className="flex flex-col pb-6">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary mb-1">Security Analytics</h1>
          <p className="text-sm text-theme-secondary">Threat intelligence, geographic distribution, and historical trends.</p>
        </div>
        <Button variant="outlined" onClick={handleExportPDF} sx={{ borderColor: '#8B5CF6', color: '#8B5CF6', '&:hover': { bgcolor: '#8B5CF622' } }}>
          📄 Export PDF
        </Button>
      </div>

      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      }>
        <KpiCards />

        {/* Attack Timeline — Stacked Bar Chart */}
        {chartData.length > 0 && (
          <Paper sx={{ p: 3, mt: 3, bgcolor: 'rgba(15, 23, 42, 0.4)', borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              📊 Attack Timeline (Last 48 Hours)
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#E2E8F0' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Safe" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Suspicious" stackId="a" fill="#F59E0B" />
                <Bar dataKey="High Risk" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        )}

        {/* Geographic Threat Distribution */}
        {geoData.length > 0 && (
          <Paper sx={{ p: 3, mt: 3, bgcolor: 'rgba(15, 23, 42, 0.4)', borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              🌍 Geographic Threat Distribution
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
              {geoData.filter(r => r.count > 0).sort((a, b) => b.count - a.count).map((region) => (
                <Paper
                  key={region.name}
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid',
                    borderColor: `${riskColor(region.avg_risk)}44`,
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#E2E8F0' }}>
                      {region.name}
                    </Typography>
                    <Chip
                      label={`${region.count}`}
                      size="small"
                      sx={{
                        bgcolor: `${riskColor(region.avg_risk)}22`,
                        color: riskColor(region.avg_risk),
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      flex: 1,
                      height: 6,
                      bgcolor: '#1E293B',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <Box sx={{
                        width: `${Math.min(100, region.avg_risk)}%`,
                        height: '100%',
                        bgcolor: riskColor(region.avg_risk),
                        borderRadius: 3,
                        transition: 'width 1s ease',
                      }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748B', minWidth: 30 }}>
                      {region.avg_risk}%
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
            {geoData.every(r => r.count === 0) && (
              <Typography sx={{ color: '#64748B', textAlign: 'center', py: 4 }}>
                No threat data available yet. Run some scans to populate geographic distribution.
              </Typography>
            )}
          </Paper>
        )}

        <div className="flex-1 mt-4">
          <ThreatCharts />
        </div>
      </Suspense>
    </AnimatedPage>
  )
}
