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
    <div className="mt-4 animate-fade-in relative z-10">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-xs font-bold text-theme-text-secondary flex items-center gap-2 uppercase tracking-widest">
          <HistoryIcon fontSize="small" />
          Recent Scans
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-safe/10 border border-safe/20 text-safe text-[10px] font-bold tracking-wider uppercase ml-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-safe"></span>
            </span>
            Live
          </span>
        </h3>
        <Link to="/threats" className="text-[11px] font-bold text-primary hover:text-primary-hover transition-colors uppercase tracking-widest">
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {recent.map((threat) => (
          <Link
            key={threat.id}
            to={`/threats?threatId=${threat.id}`}
            className="block glass-panel p-3.5 hover:bg-theme-surface hover:border-theme-border transition-all duration-200 group cursor-pointer hover:shadow-sm relative overflow-hidden rounded-xl"
          >
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-xs font-bold capitalize text-theme-text tracking-wide drop-shadow-sm">
                    {threat.threat_type.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] text-theme-text-secondary px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border uppercase tracking-widest font-semibold">
                    {threat.type}
                  </span>
                </div>
                <p className="text-xs text-theme-text-secondary truncate group-hover:text-theme-text transition-colors duration-200 font-medium">
                  {threat.raw_input_snippet}
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <RiskBadge level={threat.threat_level} />
                <span className="text-[10px] font-mono text-theme-text-secondary transition-colors">
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
