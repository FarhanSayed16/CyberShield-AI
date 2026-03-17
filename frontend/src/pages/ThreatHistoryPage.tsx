import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useThreatsStore } from '../stores/useThreatsStore'
import ThreatTable from '../features/threats/ThreatTable'
import ThreatFilters from '../features/threats/ThreatFilters'
import ThreatDetailDrawer from '../features/threats/ThreatDetailDrawer'
import Card from '../components/common/Card'
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
    threats,
    total,
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
    <AnimatedPage className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary mb-1 flex items-center gap-3">
            Threat History
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-safe/10 border border-safe/20 text-safe text-xs font-semibold tracking-wider uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-safe"></span>
              </span>
              Live
            </span>
          </h1>
          <div className="text-sm text-theme-secondary flex items-center gap-3 flex-wrap">
            <span>View and filter previous security scans and detections.</span>
            {lastRefreshedAt && (
              <span className="text-xs text-theme-secondary/70">
                (Last checked: {lastRefreshedAt.toLocaleTimeString()})
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleRetry}
          disabled={isLoading}
          sx={{
            borderColor: '#334155',
            color: '#94A3B8',
            '&:hover': { borderColor: '#8B5CF6', color: '#8B5CF6' },
          }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner
            title="Could not load threat history"
            message={error}
            onRetry={handleRetry}
          />
        </div>
      )}

      <Card className="flex-1 flex flex-col">
        <ThreatFilters />
        <ThreatTable />
      </Card>

      <ThreatDetailDrawer />
    </AnimatedPage>
  )
}
