import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, Chip, IconButton, Button } from '@mui/material'
import { CompareArrows, ArrowBack, TrendingUp, TrendingDown, Error as ErrorIcon, CheckCircle, Warning } from '@mui/icons-material'
import AnimatedPage from '../components/common/AnimatedPage'
import LoadingSpinner from '../components/common/LoadingSpinner'
import apiClient from '../api/client'

interface ThreatBase {
  id: string
  source: string
  threat_type: string
  risk_score: number
  threat_level: string
  indicators: string[]
  created_at: string
}

interface DiffData {
  base: ThreatBase
  target: ThreatBase
  diff: {
    score_change: number
    level_changed: boolean
    added_indicators: string[]
    removed_indicators: string[]
    time_elapsed_seconds: number
  }
}

export default function ThreatDiffPage() {
  const { id1, id2 } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<DiffData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id1 || !id2) return

    apiClient.get(`/api/threats/${id1}/compare/${id2}`)
      .then(res => setData(res.data))
      .catch(err => setError(err?.response?.data?.detail || 'Comparison failed'))
      .finally(() => setIsLoading(false))
  }, [id1, id2])

  if (isLoading) return <LoadingSpinner />
  if (error) return <AnimatedPage><Typography color="error">{error}</Typography></AnimatedPage>
  if (!data) return null

  const levelColor = (level: string) => {
    if (level === 'Safe') return '#10B981'
    if (level === 'Suspicious') return '#F59E0B'
    return '#EF4444'
  }

  const ThreatPanel = ({ threat, title, isTarget }: { threat: ThreatBase, title: string, isTarget: boolean }) => (
    <Paper sx={{ p: 3, flex: 1, bgcolor: 'rgba(15, 23, 42, 0.4)', borderRadius: 3, border: `1px solid ${levelColor(threat.threat_level)}44` }}>
      <Typography variant="overline" sx={{ color: '#94A3B8', fontWeight: 700 }}>{title}</Typography>
      <Typography variant="h6" sx={{ color: '#F8FAFC', mb: 2, wordBreak: 'break-all' }}>{threat.source}</Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#64748B' }}>Threat Level</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {threat.threat_level === 'Safe' ? <CheckCircle sx={{ color: '#10B981', fontSize: 18 }} /> :
             threat.threat_level === 'High Risk' ? <ErrorIcon sx={{ color: '#EF4444', fontSize: 18 }} /> :
             <Warning sx={{ color: '#F59E0B', fontSize: 18 }} />}
            <Typography sx={{ color: levelColor(threat.threat_level), fontWeight: 700 }}>{threat.threat_level}</Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ color: '#64748B' }}>Risk Score</Typography>
          <Typography sx={{ color: '#E2E8F0', fontWeight: 800, fontSize: '1.2rem' }}>{threat.risk_score}</Typography>
        </Box>
      </Box>

      <Typography variant="caption" sx={{ color: '#64748B' }}>Indicators</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
        {threat.indicators.map((ind, i) => (
          <Chip key={i} label={ind} size="small" sx={{ 
            bgcolor: isTarget ? (data.diff.added_indicators.includes(ind) ? '#EF444433' : '#334155') 
                              : (data.diff.removed_indicators.includes(ind) ? '#10B98133' : '#334155'),
            color: isTarget ? (data.diff.added_indicators.includes(ind) ? '#FCA5A5' : '#E2E8F0') 
                            : (data.diff.removed_indicators.includes(ind) ? '#6EE7B7' : '#E2E8F0'),
            textDecoration: !isTarget && data.diff.removed_indicators.includes(ind) ? 'line-through' : 'none'
          }} />
        ))}
        {threat.indicators.length === 0 && <Typography variant="body2" sx={{ color: '#64748B' }}>None</Typography>}
      </Box>
      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 3 }}>
        Scanned at: {new Date(threat.created_at).toLocaleString()}
      </Typography>
    </Paper>
  )

  return (
    <AnimatedPage className="space-y-6 pb-6">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate('/threats')} sx={{ color: '#94A3B8' }}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareArrows /> Threat Comparison View
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
            Diffing two scan results to identify emerging threats or changes in security posture.
          </Typography>
        </Box>
      </Box>

      {/* Diff Summary Card */}
      <Paper sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Risk Delta</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, justifyContent: 'center' }}>
            {data.diff.score_change > 0 ? <TrendingUp sx={{ color: '#EF4444' }} /> :
             data.diff.score_change < 0 ? <TrendingDown sx={{ color: '#10B981' }} /> : null}
            <Typography variant="h5" sx={{ fontWeight: 800, color: data.diff.score_change > 0 ? '#EF4444' : data.diff.score_change < 0 ? '#10B981' : '#94A3B8' }}>
              {data.diff.score_change > 0 ? '+' : ''}{data.diff.score_change}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Level Shift</Typography>
          <Typography variant="h6" sx={{ color: data.diff.level_changed ? '#F59E0B' : '#94A3B8', fontWeight: 800, mt: 0.5 }}>
            {data.diff.level_changed ? 'Changed' : 'Stable'}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Time Elapsed</Typography>
          <Typography variant="h6" sx={{ color: '#E2E8F0', fontWeight: 800, mt: 0.5 }}>
            {(data.diff.time_elapsed_seconds / 3600).toFixed(1)} hrs
          </Typography>
        </Box>
      </Paper>

      {/* Split Pane view */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        <ThreatPanel threat={data.base} title="Original Scan" isTarget={false} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CompareArrows sx={{ fontSize: 40, color: '#334155' }} />
        </Box>
        <ThreatPanel threat={data.target} title="Latest Scan" isTarget={true} />
      </Box>

    </AnimatedPage>
  )
}
