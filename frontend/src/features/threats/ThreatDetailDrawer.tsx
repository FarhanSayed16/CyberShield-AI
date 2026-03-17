import { useState, useEffect } from 'react'
import { useThreatsStore } from '../../stores/useThreatsStore'
import { Drawer, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import RiskGauge from '../../components/common/RiskGauge'
import RiskBadge from '../../components/common/RiskBadge'
import IndicatorChip from '../../components/common/IndicatorChip'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import apiClient from '../../api/client'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function ThreatDetailDrawer() {
  const { selectedThreatId, selectedThreatDetail, selectThreat, isDetailLoading } = useThreatsStore()
  
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [isFixDialogOpen, setIsFixDialogOpen] = useState(false)

  useEffect(() => {
    if (!selectedThreatId) {
      setNarrative(null)
    }
  }, [selectedThreatId])

  const handleGenerateNarrative = async () => {
    if (!selectedThreatId) return
    setIsGeneratingNarrative(true)
    try {
      const res = await apiClient.post(`/api/threats/${selectedThreatId}/narrative`)
      setNarrative(res.data.narrative)
      toast.success('Exec Report Generated')
    } catch (err: any) {
      toast.error('Failed to generate narrative')
    } finally {
      setIsGeneratingNarrative(false)
    }
  }

  return (
    <Drawer
      anchor="right"
      open={!!selectedThreatId}
      onClose={() => selectThreat(null)}
      PaperProps={{
        sx: { 
          width: { xs: '100%', sm: 480 },
          bgcolor: '#0F172A', // Using theme-bg for drawer
          borderLeft: '1px solid #334155'
        }
      }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-theme-border bg-theme-card sticky top-0 z-10">
          <h2 className="text-lg font-bold text-theme-primary">Threat Details</h2>
          <IconButton onClick={() => selectThreat(null)} size="small" sx={{ color: '#94A3B8' }}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isDetailLoading || !selectedThreatDetail ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* ID & Date */}
              <div className="flex justify-between items-center text-xs text-theme-secondary">
                <span className="font-mono bg-theme-bg px-2 py-1 rounded">ID: {selectedThreatDetail.id}</span>
                <span>{new Date(selectedThreatDetail.created_at).toLocaleString()}</span>
              </div>

              {/* Main Score Area */}
              <div className="glass-card p-5 flex items-center gap-6">
                <RiskGauge score={selectedThreatDetail.risk_score} size={90} strokeWidth={6} />
                <div className="flex-1">
                  <RiskBadge level={selectedThreatDetail.threat_level} className="mb-2" />
                  <h3 className="text-xl font-bold capitalize text-theme-primary">
                    {selectedThreatDetail.threat_type.replace('_', ' ')}
                  </h3>
                  <p className="text-xs text-theme-secondary mt-1 capitalize">
                    Source: {selectedThreatDetail.source} • Type: {selectedThreatDetail.type}
                  </p>
                </div>
              </div>

              {/* Snippet */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-theme-secondary">Target Analyzed</h4>
                <div className="bg-theme-bg/60 border border-theme-border rounded-lg p-3 overflow-x-auto">
                  <p className="text-sm font-mono text-theme-secondary whitespace-pre-wrap break-all">
                    {selectedThreatDetail.raw_input_snippet}
                  </p>
                </div>
              </div>

              {/* Indicators */}
              {selectedThreatDetail.indicators.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-theme-secondary">Indicators</h4>
                  <div className="flex flex-wrap">
                    {selectedThreatDetail.indicators.map((ind, i) => (
                      <IndicatorChip key={i} label={ind} />
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-theme-secondary">AI Explanation</h4>
                <div className="glass-card p-4 text-sm text-theme-secondary leading-relaxed border-l-4 border-l-primary/50">
                  {selectedThreatDetail.explanation}
                </div>
              </div>

              {/* Key Points List */}
              {selectedThreatDetail.key_points.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-theme-secondary">Key Points</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-theme-secondary">
                    {selectedThreatDetail.key_points.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions Box */}
              <div className="glass-card p-4 border border-safe/20 bg-safe/5 space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-semibold text-safe">Action Required</h4>
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    startIcon={<AutoFixHighIcon />}
                    onClick={() => setIsFixDialogOpen(true)}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Fix It
                  </Button>
                </div>
                <ul className="space-y-2">
                  {selectedThreatDetail.recommended_actions?.map((act, i) => (
                    <li key={i} className="text-sm flex gap-2 text-theme-secondary">
                      <span className="text-safe shrink-0">•</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Narrative Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-theme-secondary">Executive Summary</h4>
                  <Button 
                    variant="outlined" size="small" 
                    onClick={handleGenerateNarrative}
                    disabled={isGeneratingNarrative}
                    sx={{ borderColor: '#8B5CF6', color: '#8B5CF6' }}
                  >
                    {isGeneratingNarrative ? 'Generating...' : 'Generate Report'}
                  </Button>
                </div>
                {narrative && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 text-sm text-theme-secondary whitespace-pre-wrap leading-relaxed border border-purple-500/30">
                    {narrative}
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-theme-border bg-theme-card flex justify-end gap-3 sticky bottom-0">
          <Button variant="outlined" size="small" onClick={() => selectThreat(null)} sx={{ borderColor: '#334155', color: '#E2E8F0' }}>
            Close
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            size="small" 
            endIcon={<OpenInNewIcon />}
            onClick={() => {
              if (!selectedThreatDetail) return
              const json = JSON.stringify(selectedThreatDetail, null, 2)
              const blob = new Blob([json], { type: 'application/json' })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)
              link.download = `threat_report_${selectedThreatDetail.id}.json`
              link.click()
            }}
          >
            Export JSON Report
          </Button>
        </div>
      </div>

      {/* Fix It Wizard Dialog */}
      <Dialog
        open={isFixDialogOpen}
        onClose={() => setIsFixDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: '#0F172A', color: '#F8FAFC', border: '1px solid #334155', minWidth: 400 }
        }}
      >
        <DialogTitle className="flex items-center gap-2 border-b border-theme-border pb-3">
          <AutoFixHighIcon color="success" />
          <span className="font-bold text-lg">Guided Remediation</span>
        </DialogTitle>
        <DialogContent className="pt-6 space-y-4">
          <p className="text-sm text-theme-secondary mb-4">Follow these automated steps to secure your environment:</p>
          <div className="space-y-3">
            {selectedThreatDetail?.recommended_actions?.map((act, i) => (
              <div key={i} className="p-3 bg-theme-bg border border-theme-border rounded-lg flex gap-3 items-start">
                 <div className="w-6 h-6 rounded-full bg-safe/20 text-safe flex items-center justify-center shrink-0 text-xs font-bold">
                   {i + 1}
                 </div>
                 <p className="text-sm text-theme-secondary pt-0.5">{act.replace(/^\d+\.\s*/, '').replace(/^- \w+:\s*/, '')}</p>
              </div>
            ))}
          </div>
        </DialogContent>
        <DialogActions className="border-t border-theme-border p-4">
          <Button onClick={() => setIsFixDialogOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button variant="contained" color="success" onClick={() => {
            toast.success("Automated playbooks initiated.");
            setIsFixDialogOpen(false);
          }}>
            Acknowledge & Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  )
}

