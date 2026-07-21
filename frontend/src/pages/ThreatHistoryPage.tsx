import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useThreatsStore } from '../stores/useThreatsStore'
import ThreatTable from '../features/threats/ThreatTable'
import ThreatFilters from '../features/threats/ThreatFilters'
import ThreatDetailDrawer from '../features/threats/ThreatDetailDrawer'
import AnimatedPage from '../components/common/AnimatedPage'
import ErrorBanner from '../components/common/ErrorBanner'

export default function ThreatHistoryPage() {
  const [searchParams] = useSearchParams()
  const {
    fetchThreats,
    startPolling,
    stopPolling,
    selectThreat,
    lastRefreshedAt,
    error,
    isLoading,
  } = useThreatsStore()

  useEffect(() => {
    fetchThreats()
    startPolling()
    return () => stopPolling()
  }, []) // eslint-disable-line

  useEffect(() => {
    const id = searchParams.get('id') || searchParams.get('threatId')
    if (id) {
      selectThreat(id)
    }
  }, [searchParams, selectThreat])

  const handleRetry = () => {
    useThreatsStore.setState({ error: null })
    fetchThreats()
  }

  return (
    <AnimatedPage className="h-[calc(100vh-8rem)] flex flex-col relative z-10">
      <div className="mb-6 flex justify-between items-end flex-wrap gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-theme-text mb-2 flex items-center gap-4 drop-shadow-sm tracking-tight">
            Threat History
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-safe/10 border border-safe/20 text-safe text-xs font-bold tracking-widest uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-safe"></span>
              </span>
              Live Feed
            </span>
          </h1>
          <div className="text-sm text-theme-text-secondary flex items-center gap-3 flex-wrap font-medium">
            <span>View and filter previous security scans and detections.</span>
            {lastRefreshedAt && (
              <span className="text-xs text-theme-text-secondary border-l border-theme-border pl-3">
                Last synced: {lastRefreshedAt.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleRetry}
          disabled={isLoading}
          className="glass-panel px-4 py-2 text-sm font-semibold text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface/50 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
        >
          <RefreshIcon fontSize="small" className={isLoading ? "animate-spin" : ""} />
          {isLoading ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>

      {error && (
        <div className="mb-6 animate-fade-in relative z-10">
          <ErrorBanner
            title="Could not load threat history"
            message={error}
            onRetry={handleRetry}
          />
        </div>
      )}

      <div className="glass-card flex-1 flex flex-col p-6 border-t-[3px] border-t-primary relative z-10 overflow-hidden">
        <ThreatFilters />
        <ThreatTable />
      </div>

      <ThreatDetailDrawer />
    </AnimatedPage>
  )
}
