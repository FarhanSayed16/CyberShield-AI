import { useState, useCallback, useEffect } from 'react'
import { Box, Typography, Paper, Button, Chip, CircularProgress, LinearProgress } from '@mui/material'
import { TravelExplore, Security, Warning, CheckCircle, Error as ErrorIcon } from '@mui/icons-material'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import AnimatedPage from '../components/common/AnimatedPage'

interface AuditResult {
  url: string
  threat_type: string
  risk_score: number
  threat_level: string
  indicators: string[]
}

const EXTENSION_ID = 'CyberSentinel_History_Audit'

export default function BrowsingAuditPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [results, setResults] = useState<AuditResult[]>([])
  const [error, setError] = useState<string | null>(null)

  // Listen for extension response
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.type !== 'CYBER_SENTINEL_HISTORY_RESULT') {
        return
      }

      const data = event.data.data
      if (data.error) {
        setError(data.error)
      } else {
        setResults(data.results || [])
      }
      setIsScanning(false)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const startAudit = useCallback(() => {
    setError(null)
    setResults([])
    setIsScanning(true)
    
    // Post message to the content script bridging to the extension
    window.postMessage({ type: 'CYBER_SENTINEL_HISTORY_SCAN', limit: 100 }, window.location.origin)
    
    // Timeout in case extension is not installed
    setTimeout(() => {
      setIsScanning(prev => {
        if (prev) {
          setError('Extension did not respond. Please ensure the CyberSentinel extension is installed and active.')
          return false
        }
        return prev
      })
    }, 15000)
  }, [])

  const riskStats = results.reduce(
    (acc, curr) => {
      acc[curr.threat_level] = (acc[curr.threat_level] || 0) + 1
      return acc
    },
    { Safe: 0, Suspicious: 0, 'High Risk': 0, Unknown: 0 } as Record<string, number>
  )

  const chartData = [
    { name: 'Safe', value: riskStats.Safe, color: '#10B981' },
    { name: 'Suspicious', value: riskStats.Suspicious, color: '#F59E0B' },
    { name: 'High Risk', value: riskStats['High Risk'], color: '#EF4444' }
  ].filter(d => d.value > 0)

  const levelColor = (level: string) => {
    if (level === 'Safe') return '#10B981'
    if (level === 'Suspicious') return '#F59E0B'
    return '#EF4444'
  }

  return (
    <AnimatedPage className="space-y-6 pb-6">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TravelExplore /> Browsing History Audit
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Scan your recent browser history for hidden threats, phishing links, and malicious domains.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={startAudit}
          disabled={isScanning}
          color="primary"
          sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}
        >
          {isScanning ? 'Auditing...' : 'Run History Audit'}
        </Button>
      </Box>

      {error && (
        <Paper sx={{ p: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 3 }}>
          <Typography sx={{ color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorIcon /> {error}
          </Typography>
        </Paper>
      )}

      {isScanning && (
        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 3, border: 1, borderColor: 'divider' }}>
          <CircularProgress size={48} color="primary" sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>Analyzing Browsing History...</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, maxWidth: 400, mx: 'auto' }}>
            The extension is securely gathering your recent unique URLs and running them through the AI analysis pipeline.
          </Typography>
          <LinearProgress sx={{ mt: 3, height: 6, borderRadius: 3 }} color="primary" />
        </Paper>
      )}

      {!isScanning && results.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 3 }}>
          {/* Summary Column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 3, textAlign: 'center' }}>
              <Security sx={{ fontSize: 40, color: riskStats['High Risk'] > 0 ? '#EF4444' : '#10B981', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
                {results.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>URLs Scanned</Typography>
            </Paper>

            <Paper sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 3, minHeight: 250 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
                Risk Breakdown
              </Typography>
              <Box sx={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none" paddingAngle={5} dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>

          {/* Details Column */}
          <Paper sx={{ p: 0, bgcolor: 'rgba(15, 23, 42, 0.4)', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Flagged History Items</Typography>
              <Chip label={`${riskStats['High Risk'] + riskStats.Suspicious} concerns found`} size="small" sx={{ bgcolor: '#EF444433', color: '#EF4444' }} />
            </Box>
            
            <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
              {results.sort((a, b) => b.risk_score - a.risk_score).map((res, i) => (
                <Box key={i} sx={{ p: 2, borderBottom: '1px solid #1E293B', display: 'flex', gap: 2, alignItems: 'flex-start', '&:hover': { bgcolor: '#1E293B55' } }}>
                  <Box sx={{ mt: 0.5 }}>
                    {res.threat_level === 'Safe' ? <CheckCircle sx={{ color: '#10B981', fontSize: 20 }} /> :
                     res.threat_level === 'High Risk' ? <ErrorIcon sx={{ color: '#EF4444', fontSize: 20 }} /> :
                     <Warning sx={{ color: '#F59E0B', fontSize: 20 }} />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Typography noWrap sx={{ color: '#E2E8F0', fontWeight: 600, fontSize: '0.9rem', maxWidth: '75%' }}>
                        {res.url}
                      </Typography>
                      <Chip label={`Risk: ${res.risk_score}`} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: `${levelColor(res.threat_level)}22`, color: levelColor(res.threat_level) }} />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.8rem', mb: 1 }}>
                      Type: <span style={{ color: '#CBD5E1', textTransform: 'capitalize' }}>{res.threat_type}</span>
                    </Typography>
                    
                    {res.indicators.length > 0 && res.threat_level !== 'Safe' && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {res.indicators.map((ind, j) => (
                          <Chip key={j} label={ind} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#334155', color: '#94A3B8' }} />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      )}

      {!isScanning && results.length === 0 && !error && (
        <Paper sx={{ p: 8, textAlign: 'center', bgcolor: 'transparent', border: '1px dashed #334155', borderRadius: 3 }}>
          <TravelExplore sx={{ fontSize: 48, color: '#64748B', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#94A3B8' }}>No Audit Run Yet</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>Click the button above to safely analyze your browsing history.</Typography>
        </Paper>
      )}
    </AnimatedPage>
  )
}
