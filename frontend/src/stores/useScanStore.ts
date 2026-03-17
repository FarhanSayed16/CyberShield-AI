import { create } from 'zustand'
import { analyzeThreat } from '../api/endpoints'
import type { AnalyzeRequest, AnalyzeResponse } from '../api/types'
import toast from 'react-hot-toast'
import { useThreatsStore } from './useThreatsStore'

interface ScanState {
  scanType: AnalyzeRequest['type']
  selectedTier: NonNullable<AnalyzeRequest['tier']>
  content: string
  fileName: string | null
  result: AnalyzeResponse | null
  isLoading: boolean
  error: string | null
  
  setType: (type: AnalyzeRequest['type']) => void
  setTier: (tier: NonNullable<AnalyzeRequest['tier']>) => void
  setContent: (content: string) => void
  setFileName: (name: string | null) => void
  clearResult: () => void
  submitScan: () => Promise<void>
}

export const useScanStore = create<ScanState>((set, get) => ({
  scanType: 'url',
  selectedTier: 'auto',
  content: '',
  fileName: null,
  result: null,
  isLoading: false,
  error: null,

  setType: (type) => set({ scanType: type, content: '', fileName: null, result: null, error: null }),
  setTier: (tier) => set({ selectedTier: tier }),
  
  setContent: (content) => set({ content, error: null }),
  setFileName: (name) => set({ fileName: name }),
  
  clearResult: () => set({ result: null, error: null }),

  submitScan: async () => {
    let { scanType, content, selectedTier } = get()
    if (!content.trim()) {
      set({ error: 'Please enter content to scan' })
      toast.error('Please enter content to scan')
      return
    }
    
    // Smart Input Detection: Auto-switch to 'text' if the user pasted a paragraph/sentence into the 'url' field
    if (scanType === 'url') {
      const isLikelyUrl = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(content.trim()) && !content.includes(' ');
      if (!isLikelyUrl && content.length > 50 || content.includes(' ')) {
        scanType = 'text';
        set({ scanType: 'text' });
        toast('Auto-detected text input. Switched analysis type.', { icon: '🤖' });
      }
    }

    set({ isLoading: true, error: null, result: null })
    
    try {
      const response = await analyzeThreat({
        source: 'dashboard',
        type: scanType,
        tier: selectedTier,
        content,
      })
      
      set({ result: response, isLoading: false })
      
      const score = response.risk_score
      const isSafe = response.threat_level === 'Safe'
      
      const config = isSafe 
        ? { icon: '✅', style: { background: '#052e16', color: '#34d399', border: '1px solid #065f46' } }
        : score >= 80 
          ? { icon: '🚨', style: { background: '#450a0a', color: '#f87171', border: '1px solid #991b1b' } }
          : { icon: '⚠️', style: { background: '#451a03', color: '#fbbf24', border: '1px solid #92400e' } }

      toast(`${response.threat_level}: ${response.threat_type.replace('_', ' ')} (Score: ${score})`, config)

      // Auto-refresh the history panel
      useThreatsStore.getState().fetchThreats(true)
      
    } catch (err: any) {
      console.error('Scan Payload that failed:', { source: 'dashboard', type: scanType, content });
      console.error('Scan failed:', err)
      
      let errorMsg = 'Failed to scan content'
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join('\n')
        } else {
          errorMsg = err.response.data.detail
        }
      } else if (err.message) {
        errorMsg = err.message
      }

      set({ error: errorMsg, isLoading: false })
      toast.error(errorMsg)
    }
  },
}))
