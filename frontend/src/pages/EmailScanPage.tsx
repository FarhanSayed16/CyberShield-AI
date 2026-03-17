import { useState, useCallback } from 'react'
import { Box, Typography, Paper, Button, Chip, LinearProgress, Alert } from '@mui/material'
import { Email, Shield, Warning, CheckCircle, Error as ErrorIcon, UploadFile } from '@mui/icons-material'
import AnimatedPage from '../components/common/AnimatedPage'
import apiClient from '../api/client'

interface EmailAnalysisResult {
  id: string
  threat_type: string
  risk_score: number
  threat_level: string
  confidence: number
  indicators: string[]
  explanation: string
  key_points: string[]
  recommended_actions: string[]
  email_analysis: {
    sender: string
    reply_to: string
    subject: string
    date: string
    auth: { spf: string; dkim: string; dmarc: string }
    urls: string[]
    total_urls: number
    attachments: { filename: string; content_type: string; size: number }[]
    flags: string[]
    body_preview: string
  }
}

export default function EmailScanPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<EmailAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setResult(null)
    setFileName(file.name)
    setIsAnalyzing(true)

    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const { data } = await apiClient.post('/api/analyze/email', {
        type: 'email',
        source: 'dashboard',
        content: base64,
        tier: 'tier3',
      })
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.eml') || file.name.endsWith('.msg'))) {
      handleFile(file)
    } else {
      setError('Please drop a valid .eml file')
    }
  }, [handleFile])

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const levelColor = (level: string) => {
    if (level === 'Safe') return '#10B981'
    if (level === 'Suspicious') return '#F59E0B'
    return '#EF4444'
  }

  const authBadge = (status: string) => {
    if (status === 'pass') return <Chip label={status.toUpperCase()} size="small" sx={{ bgcolor: '#10B98133', color: '#10B981', fontWeight: 700 }} />
    if (status === 'fail') return <Chip label={status.toUpperCase()} size="small" sx={{ bgcolor: '#EF444433', color: '#EF4444', fontWeight: 700 }} />
    return <Chip label={status.toUpperCase()} size="small" sx={{ bgcolor: '#64748B33', color: '#94A3B8', fontWeight: 700 }} />
  }

  return (
    <AnimatedPage className="space-y-6 p-2">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Email /> Email Threat Scanner
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
          Upload a raw .eml file to analyze headers, authentication, embedded URLs, and attachments for phishing indicators.
        </Typography>
      </Box>

      {/* Drop Zone */}
      <Paper
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        sx={{
          p: 5,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: isDragging ? '#8B5CF6' : '#334155',
          bgcolor: isDragging ? 'rgba(139, 92, 246, 0.05)' : 'rgba(15, 23, 42, 0.4)',
          borderRadius: 3,
          cursor: 'pointer',
          transition: 'all 0.3s',
          '&:hover': { borderColor: '#8B5CF6', bgcolor: 'rgba(139, 92, 246, 0.05)' },
        }}
        onClick={() => document.getElementById('eml-file-input')?.click()}
      >
        <UploadFile sx={{ fontSize: 48, color: isDragging ? '#8B5CF6' : '#64748B', mb: 1 }} />
        <Typography variant="h6" sx={{ color: '#E2E8F0', fontWeight: 600 }}>
          {fileName ? `📧 ${fileName}` : 'Drop .eml file here or click to browse'}
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748B' }}>
          Supports .eml format (exported email files)
        </Typography>
        <input
          id="eml-file-input"
          type="file"
          accept=".eml,.msg"
          style={{ display: 'none' }}
          onChange={onFileSelect}
        />
      </Paper>

      {isAnalyzing && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ mb: 1, color: '#94A3B8' }}>🔍 Analyzing email headers, body, and embedded URLs...</Typography>
          <LinearProgress sx={{ borderRadius: 2, bgcolor: '#1E293B', '& .MuiLinearProgress-bar': { bgcolor: '#8B5CF6' } }} />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {/* Results */}
      {result && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          {/* Verdict Card */}
          <Paper sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.6)', border: `1px solid ${levelColor(result.threat_level)}44`, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {result.threat_level === 'Safe' ? <CheckCircle sx={{ color: '#10B981', fontSize: 32 }} /> :
               result.threat_level === 'High Risk' ? <ErrorIcon sx={{ color: '#EF4444', fontSize: 32 }} /> :
               <Warning sx={{ color: '#F59E0B', fontSize: 32 }} />}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: levelColor(result.threat_level) }}>
                  {result.threat_level}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                  Risk Score: {result.risk_score}/100 • Confidence: {result.confidence}%
                </Typography>
              </Box>
              <Chip label={result.threat_type} sx={{ ml: 'auto', bgcolor: '#334155', color: '#E2E8F0', fontWeight: 600, textTransform: 'capitalize' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#CBD5E1', lineHeight: 1.6 }}>
              {result.explanation}
            </Typography>
          </Paper>

          {/* Email Headers Card */}
          <Paper sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Email fontSize="small" /> Email Headers
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1, fontSize: '0.85rem' }}>
              <Typography sx={{ color: '#64748B', fontWeight: 600 }}>From:</Typography>
              <Typography sx={{ color: '#E2E8F0', wordBreak: 'break-all' }}>{result.email_analysis.sender}</Typography>
              <Typography sx={{ color: '#64748B', fontWeight: 600 }}>Reply-To:</Typography>
              <Typography sx={{ color: result.email_analysis.reply_to && result.email_analysis.reply_to !== result.email_analysis.sender ? '#EF4444' : '#E2E8F0', wordBreak: 'break-all' }}>
                {result.email_analysis.reply_to || '(same as From)'}
              </Typography>
              <Typography sx={{ color: '#64748B', fontWeight: 600 }}>Subject:</Typography>
              <Typography sx={{ color: '#E2E8F0' }}>{result.email_analysis.subject}</Typography>
              <Typography sx={{ color: '#64748B', fontWeight: 600 }}>Date:</Typography>
              <Typography sx={{ color: '#94A3B8' }}>{result.email_analysis.date}</Typography>
            </Box>
          </Paper>

          {/* Authentication Card */}
          <Paper sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Shield fontSize="small" /> Authentication Results
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>SPF</Typography>
                <Box sx={{ mt: 0.5 }}>{authBadge(result.email_analysis.auth.spf)}</Box>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>DKIM</Typography>
                <Box sx={{ mt: 0.5 }}>{authBadge(result.email_analysis.auth.dkim)}</Box>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>DMARC</Typography>
                <Box sx={{ mt: 0.5 }}>{authBadge(result.email_analysis.auth.dmarc)}</Box>
              </Box>
            </Box>
          </Paper>

          {/* Flags */}
          {result.email_analysis.flags.length > 0 && (
            <Paper sx={{ p: 3, bgcolor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#EF4444' }}>
                ⚠ Suspicious Indicators ({result.email_analysis.flags.length})
              </Typography>
              {result.email_analysis.flags.map((flag, i) => (
                <Typography key={i} variant="body2" sx={{ color: '#FCA5A5', mb: 0.5, pl: 2, borderLeft: '2px solid #EF4444' }}>
                  {flag}
                </Typography>
              ))}
            </Paper>
          )}

          {/* URLs */}
          {result.email_analysis.urls.length > 0 && (
            <Paper sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                🔗 Embedded URLs ({result.email_analysis.total_urls})
              </Typography>
              {result.email_analysis.urls.map((url, i) => (
                <Typography key={i} variant="body2" sx={{ color: '#8B5CF6', mb: 0.5, fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {url}
                </Typography>
              ))}
            </Paper>
          )}

          {/* Attachments */}
          {result.email_analysis.attachments.length > 0 && (
            <Paper sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                📎 Attachments ({result.email_analysis.attachments.length})
              </Typography>
              {result.email_analysis.attachments.map((att, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                  <Chip label={att.filename} size="small" sx={{ bgcolor: '#334155', color: '#E2E8F0' }} />
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    {att.content_type} • {(att.size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Box>
      )}
    </AnimatedPage>
  )
}
