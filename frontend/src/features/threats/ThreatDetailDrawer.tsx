import { useState, useEffect } from 'react'
import { useThreatsStore } from '../../stores/useThreatsStore'
import { Drawer, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
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
          width: { xs: '100%', sm: 540 },
          bgcolor: 'var(--color-bg)',
          borderLeft: '1px solid rgb(var(--color-border))',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.1)'
        }
      }}
    >
      <div className="flex flex-col h-full relative overflow-hidden bg-theme-bg">
        {/* Header */}
        <div className="h-[72px] flex items-center justify-between px-6 border-b border-theme-border bg-theme-surface/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
          <h2 className="text-xl font-display font-bold text-theme-text">Threat Details</h2>
          <IconButton onClick={() => selectThreat(null)} size="small" sx={{ color: 'var(--color-text-secondary)', '&:hover': { bgcolor: 'rgba(var(--color-text-secondary), 0.1)' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 relative z-10 custom-scrollbar">
          {isDetailLoading || !selectedThreatDetail ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* ID & Date */}
              <div className="flex justify-between items-center text-[11px] font-bold text-theme-text-secondary uppercase tracking-widest">
                <span className="font-mono bg-theme-surface px-2.5 py-1 rounded-md border border-theme-border shadow-sm">ID: {selectedThreatDetail.id.slice(0,8)}...</span>
                <span className="bg-theme-surface px-2.5 py-1 rounded-md border border-theme-border">{new Date(selectedThreatDetail.created_at).toLocaleString()}</span>
              </div>

              {/* Main Score Area */}
              <div className="glass-card p-6 flex items-center gap-6 relative overflow-hidden">
                <RiskGauge score={selectedThreatDetail.risk_score} size={100} strokeWidth={8} />
                <div className="flex-1 relative z-10">
                  <RiskBadge level={selectedThreatDetail.threat_level} className="mb-3" />
                  <h3 className="text-2xl font-display font-bold capitalize text-theme-text tracking-tight">
                    {selectedThreatDetail.threat_type.replace('_', ' ')}
                  </h3>
                  <div className="text-[11px] font-bold text-theme-text-secondary mt-2 uppercase tracking-widest bg-theme-surface inline-flex px-3 py-1 rounded-full border border-theme-border">
                    Source: <span className="text-theme-text mx-1">{selectedThreatDetail.source}</span> • Type: <span className="text-theme-text ml-1">{selectedThreatDetail.type}</span>
                  </div>
                </div>
              </div>

              {/* Snippet */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-[0.2em] px-1">Target Analyzed</h4>
                <div className="bg-theme-surface border border-theme-border rounded-xl p-4 overflow-x-auto shadow-sm backdrop-blur-sm">
                  <p className="text-sm font-mono text-theme-text whitespace-pre-wrap break-all leading-relaxed">
                    {selectedThreatDetail.raw_input_snippet}
                  </p>
                </div>
              </div>

              {/* Indicators */}
              {selectedThreatDetail.indicators.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-[0.2em] px-1">Threat Indicators</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedThreatDetail.indicators.map((ind, i) => (
                      <IndicatorChip key={i} label={ind} />
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-[0.2em] px-1">AI Explanation</h4>
                <div className="glass-panel p-5 text-sm text-theme-text leading-relaxed font-medium">
                  {selectedThreatDetail.explanation}
                </div>
              </div>

              {/* Key Points List */}
              {selectedThreatDetail.key_points.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-[0.2em] px-1">Key Findings</h4>
                  <ul className="list-none space-y-2 text-sm text-theme-text font-medium">
                    {selectedThreatDetail.key_points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-3 glass-panel p-3">
                        <span className="text-primary mt-0.5 rounded-full">•</span>
                        <span className="leading-relaxed">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions Box */}
              <div className="rounded-2xl p-5 border bg-safe/5 border-safe/20 backdrop-blur-md relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10 mb-4">
                  <h4 className="text-[11px] font-bold text-safe uppercase tracking-widest flex items-center gap-2">
                    <AutoFixHighIcon fontSize="small" />
                    Action Required
                  </h4>
                  <button
                    onClick={() => setIsFixDialogOpen(true)}
                    className="bg-safe hover:bg-emerald-600 text-white font-bold text-[11px] uppercase tracking-widest px-4 py-2 rounded-lg transition-colors shadow-sm"
                  >
                    Execute Playbook
                  </button>
                </div>
                <ul className="space-y-3 relative z-10">
                  {selectedThreatDetail.recommended_actions?.map((act, i) => (
                    <li key={i} className="text-sm flex gap-3 text-theme-text font-medium items-start bg-theme-surface/80 p-2.5 rounded-lg border border-theme-border">
                      <span className="text-safe shrink-0 mt-0.5">•</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Narrative Section */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-[0.2em]">Executive Summary</h4>
                  <button 
                    onClick={handleGenerateNarrative}
                    disabled={isGeneratingNarrative}
                    className="text-[11px] font-bold text-primary hover:text-primary-hover uppercase tracking-widest transition-colors disabled:opacity-50"
                  >
                    {isGeneratingNarrative ? 'Generating...' : 'Generate AI Report'}
                  </button>
                </div>
                {narrative && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 text-sm text-theme-text whitespace-pre-wrap leading-relaxed border-primary/30 font-medium">
                    {narrative}
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-theme-border bg-theme-surface/80 backdrop-blur-xl flex justify-end gap-3 sticky bottom-0 z-20 shadow-lg">
          <button onClick={() => selectThreat(null)} className="glass-panel px-6 py-2 rounded-xl text-sm font-bold text-theme-text-secondary hover:text-theme-text uppercase tracking-wider transition-colors border border-theme-border shadow-sm hover:bg-theme-surface">
            Close
          </button>
          <button 
            onClick={() => {
              if (!selectedThreatDetail) return
              const json = JSON.stringify(selectedThreatDetail, null, 2)
              const blob = new Blob([json], { type: 'application/json' })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)
              link.download = `threat_report_${selectedThreatDetail.id}.json`
              link.click()
            }}
            className="btn-primary px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 uppercase tracking-wider shadow-sm"
          >
            Export JSON
            <OpenInNewIcon fontSize="small" />
          </button>
        </div>
      </div>

      {/* Fix It Wizard Dialog */}
      <Dialog
        open={isFixDialogOpen}
        onClose={() => setIsFixDialogOpen(false)}
        PaperProps={{
          sx: { 
            bgcolor: 'var(--color-bg)', 
            color: 'var(--color-text-primary)', 
            border: '1px solid rgb(var(--color-border))', 
            minWidth: 450,
            borderRadius: 3,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }
        }}
      >
        <DialogTitle className="flex items-center gap-3 border-b border-theme-border pb-4 bg-theme-surface/50">
          <div className="w-10 h-10 rounded-full bg-safe/10 text-safe flex items-center justify-center border border-safe/20">
            <AutoFixHighIcon fontSize="small" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-theme-text">Guided Remediation</span>
        </DialogTitle>
        <DialogContent className="pt-6 space-y-5 bg-transparent">
          <p className="text-sm font-medium text-theme-text-secondary">Follow these automated steps to secure your environment:</p>
          <div className="space-y-3">
            {selectedThreatDetail?.recommended_actions?.map((act, i) => (
              <div key={i} className="p-3 bg-theme-surface border border-theme-border rounded-xl flex gap-3 items-start shadow-sm">
                 <div className="w-6 h-6 rounded-full bg-safe/10 text-safe flex items-center justify-center shrink-0 text-[10px] font-bold border border-safe/20">
                   {i + 1}
                 </div>
                 <p className="text-sm font-medium text-theme-text pt-0.5 leading-relaxed">{act.replace(/^\d+\.\s*/, '').replace(/^- \w+:\s*/, '')}</p>
              </div>
            ))}
          </div>
        </DialogContent>
        <DialogActions className="border-t border-theme-border p-4 bg-theme-surface/50">
          <button onClick={() => setIsFixDialogOpen(false)} className="px-5 py-2 text-sm font-bold text-theme-text-secondary hover:text-theme-text transition-colors uppercase tracking-wider">Cancel</button>
          <button onClick={() => {
            toast.success("Automated playbooks initiated.");
            setIsFixDialogOpen(false);
          }} className="btn-primary px-6 py-2 rounded-xl text-sm uppercase tracking-wider">
            Acknowledge & Apply
          </button>
        </DialogActions>
      </Dialog>
    </Drawer>
  )
}

