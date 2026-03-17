import { useThreatsStore } from '../../stores/useThreatsStore'
import { useEffect } from 'react'
import RiskBadge from '../../components/common/RiskBadge'
import { Link } from 'react-router-dom'
import HistoryIcon from '@mui/icons-material/History'

export default function ScanHistory() {
  const { threats, fetchThreats, isLoading, startPolling, stopPolling } = useThreatsStore()

  useEffect(() => {
    fetchThreats()
    startPolling()
    return () => stopPolling()
  }, []) // eslint-disable-line

  if (isLoading && threats.length === 0) return null
  if (threats.length === 0) return null

  // Show only 4 most recent threats for quick history
  const recent = threats.slice(0, 4)

  return (
    <div className="mt-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-medium text-theme-secondary flex items-center gap-2">
          <HistoryIcon fontSize="small" />
          Recent Scans
          <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-safe/10 border border-safe/20 text-safe text-[10px] font-semibold tracking-wider uppercase ml-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-safe"></span>
            </span>
            Live
          </span>
        </h3>
        <Link to="/threats" className="text-xs text-primary hover:text-primary-light transition-colors">
          View all logs
        </Link>
      </div>

      <div className="space-y-2">
        {recent.map((threat) => (
          <Link
            key={threat.id}
            to={`/threats?threatId=${threat.id}`}
            className="block glass-card p-3 hover:bg-theme-card transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold capitalize text-theme-secondary">
                    {threat.threat_type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-theme-secondary px-1.5 py-0.5 rounded bg-theme-bg border border-theme-border uppercase tracking-wider">
                    {threat.type}
                  </span>
                </div>
                <p className="text-xs text-theme-secondary truncate group-hover:text-theme-secondary transition-colors">
                  {threat.raw_input_snippet}
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <RiskBadge level={threat.threat_level} />
                <span className="text-[10px] text-theme-secondary">
                  {new Date(threat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
