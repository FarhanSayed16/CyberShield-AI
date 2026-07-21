import { useScanStore } from '../../stores/useScanStore'
import RiskGauge from '../../components/common/RiskGauge'
import RiskBadge from '../../components/common/RiskBadge'
import IndicatorChip from '../../components/common/IndicatorChip'
import SkeletonCard from '../../components/common/SkeletonCard'
import ErrorBanner from '../../components/common/ErrorBanner'

// Icons
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import FlagIcon from '@mui/icons-material/Flag'
import SecurityIcon from '@mui/icons-material/Security'

export default function ScanResultCard() {
  const { result, isLoading, error, submitScan } = useScanStore()

  if (isLoading) return <SkeletonCard />
  
  if (error) return (
    <div className="glass-card h-full flex flex-col justify-center animate-fade-in border-t-[3px] border-t-red-500 relative overflow-hidden">
      <div className="absolute inset-0 bg-red-500/5 backdrop-blur-3xl pointer-events-none" />
      <div className="relative z-10 p-6">
        <ErrorBanner message={error} onRetry={submitScan} />
      </div>
    </div>
  )
  
  if (!result) return (
    <div className="glass-card h-full flex flex-col items-center justify-center text-center relative overflow-hidden border border-theme-border min-h-[400px]">
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-center mb-6 text-theme-text-secondary shadow-sm">
          <SecurityIcon sx={{ fontSize: 40 }} />
        </div>
        <h3 className="text-2xl font-display font-bold text-theme-text tracking-tight">Ready to Scan</h3>
        <p className="text-sm mt-3 max-w-xs text-theme-text-secondary leading-relaxed">Enter a URL, email, or prompt on the left to analyze it for cyber threats.</p>
      </div>
    </div>
  )

  const isSafe = result.threat_level === 'Safe'
  const severityColors = {
    Informational: 'text-safe bg-safe/10 border-safe/20',
    Warning: 'text-suspicious bg-suspicious/10 border-suspicious/20',
    Critical: 'text-high-risk bg-high-risk/10 border-high-risk/20',
  }

  return (
    <div className={`glass-card tour-scan-results h-full animate-fade-in border-t-[3px] transition-all duration-500 relative overflow-hidden ${
      isSafe 
        ? 'border-t-safe shadow-sm' 
        : result.risk_score >= 80 
          ? 'border-t-high-risk shadow-sm' 
          : 'border-t-suspicious shadow-sm'
    }`}>
      
      {/* Header Banner */}
      <div className={`px-6 py-2.5 border-b border-theme-border text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 ${severityColors[result.severity_label]}`}>
        {isSafe ? <CheckCircleOutlineIcon fontSize="small" /> : <WarningAmberIcon fontSize="small" />}
        Severity: {result.severity_label}
      </div>

      <div className="p-6 relative z-10">
        {/* Top Section: Score & Badges */}
        <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center mb-10">
          <div className="relative">
            <RiskGauge score={result.risk_score} size={130} strokeWidth={8} />
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-3xl font-display font-bold capitalize text-theme-text drop-shadow-sm">
                {result.threat_type.replace('_', ' ')}
              </h2>
              <RiskBadge level={result.threat_level} />
            </div>
            
            <div className="text-sm font-medium text-theme-text-secondary bg-theme-surface inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-theme-border">
              Source: <span className="capitalize text-theme-text">{result.source}</span>
              <span className="text-theme-border">•</span>
              Type: <span className="capitalize text-theme-text">{result.type}</span>
            </div>

            <div className="flex items-center gap-3 text-xs bg-theme-surface p-3 rounded-xl border border-theme-border max-w-sm shadow-sm">
              <span className="text-theme-text-secondary font-semibold tracking-wide uppercase">AI Confidence:</span>
              <div className="flex-1 h-2 bg-theme-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary relative transition-all duration-1000 ease-out" 
                  style={{ width: `${result.confidence * 100}%` }} 
                >
                </div>
              </div>
              <span className="text-theme-text font-bold">{(result.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Indicators */}
        {result.indicators.length > 0 && (
          <div className="mb-8 p-5 bg-theme-surface/50 rounded-2xl border border-theme-border">
            <h4 className="text-xs font-bold text-theme-text-secondary mb-4 flex items-center gap-2 uppercase tracking-widest">
              <FlagIcon fontSize="small" />
              Threat Indicators Detected
            </h4>
            <div className="flex flex-wrap gap-2">
              {result.indicators.map((indicator, idx) => (
                <IndicatorChip key={idx} label={indicator} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Col: Explanation */}
          <div className="space-y-4">
            <div className="glass-panel p-5">
              <h4 className="text-xs font-bold text-theme-text-secondary mb-3 uppercase tracking-widest">AI Explanation</h4>
              <p className="text-sm text-theme-text leading-relaxed font-medium">{result.explanation}</p>
            </div>
            
            {result.key_points && result.key_points.length > 0 && (
              <div className="glass-panel p-5">
                <h4 className="text-xs font-bold text-theme-text-secondary mb-3 uppercase tracking-widest">Key Points</h4>
                <ul className="list-none space-y-2 text-sm text-theme-text font-medium">
                  {result.key_points.map((kp, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-primary mt-1">•</span>
                      <span className="leading-relaxed">{kp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {result.external_flags && Object.keys(result.external_flags).length > 0 && (
              <div className="glass-panel p-5">
                <h4 className="text-xs font-bold text-theme-text-secondary mb-4 uppercase tracking-widest">External Intelligence</h4>
                <div className="space-y-3">
                  {result.external_flags.safe_browsing && (
                    <div className="flex justify-between items-center text-sm p-2 bg-theme-surface rounded-lg border border-theme-border/50">
                      <span className="text-theme-text-secondary font-medium">Google Safe Browsing</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${result.external_flags.safe_browsing === 'SAFE' ? 'bg-safe/20 text-safe' : 'bg-high-risk/20 text-high-risk'}`}>
                        {result.external_flags.safe_browsing}
                      </span>
                    </div>
                  )}
                  {result.external_flags.virustotal_positives !== undefined && (
                    <div className="flex justify-between items-center text-sm p-2 bg-theme-surface rounded-lg border border-theme-border/50">
                      <span className="text-theme-text-secondary font-medium">VirusTotal Score</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${result.external_flags.virustotal_positives > 0 ? 'bg-high-risk/20 text-high-risk' : 'bg-safe/20 text-safe'}`}>
                        {result.external_flags.virustotal_positives} / {result.external_flags.virustotal_total_engines}
                      </span>
                    </div>
                  )}
                  {result.external_flags.domain_age && (
                    <div className="flex justify-between items-center text-sm p-2 bg-theme-surface rounded-lg border border-theme-border/50">
                      <span className="text-theme-text-secondary font-medium">Domain Age</span>
                      <span className="text-suspicious font-bold bg-suspicious/10 px-2 py-0.5 rounded text-xs">{result.external_flags.domain_age}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Actions */}
          <div>
            <div className={`rounded-xl p-5 border ${isSafe ? 'bg-safe/5 border-safe/20' : 'bg-high-risk/5 border-high-risk/20'}`}>
              <h4 className={`text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2 ${isSafe ? 'text-safe' : 'text-high-risk'}`}>
                <SecurityIcon fontSize="small" />
                Recommended Actions
              </h4>
              <ul className="space-y-3">
                {result.recommended_actions.map((action, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-theme-text font-medium items-start bg-theme-surface/80 p-3 rounded-lg border border-theme-border">
                    <div className={`shrink-0 rounded-full p-0.5 ${isSafe ? 'bg-safe/20 text-safe' : 'bg-high-risk/20 text-high-risk'}`}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                    </div>
                    <span className="leading-relaxed mt-[1px]">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
