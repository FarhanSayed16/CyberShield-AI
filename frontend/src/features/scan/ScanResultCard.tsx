import { useScanStore } from '../../stores/useScanStore'
import Card from '../../components/common/Card'
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
    <Card className="h-full flex flex-col justify-center animate-fade-in border-t-4 border-t-red-500/50">
      <ErrorBanner message={error} onRetry={submitScan} />
    </Card>
  )
  
  if (!result) return (
    <Card className="h-full flex flex-col items-center justify-center text-center text-theme-secondary border-dashed border-2 bg-theme-bg/20">
      <div className="w-16 h-16 rounded-full bg-theme-border/50 flex items-center justify-center mb-4 text-theme-secondary">
        <SecurityIcon fontSize="large" />
      </div>
      <h3 className="text-lg font-medium text-theme-secondary">Ready to Scan</h3>
      <p className="text-sm mt-2 max-w-xs">Enter a URL, email, or prompt on the left to analyze it for cyber threats.</p>
    </Card>
  )

  const isSafe = result.threat_level === 'Safe'
  const severityColors = {
    Informational: 'text-safe bg-safe/10 border-safe/20',
    Warning: 'text-suspicious bg-suspicious/10 border-suspicious/20',
    Critical: 'text-high-risk bg-high-risk/10 border-high-risk/20',
  }

  return (
    <Card className={`tour-scan-results h-full animate-fade-in border-t-4 transition-all duration-500 ${
      isSafe 
        ? 'border-t-safe animate-pulse-glow-safe' 

        : result.risk_score >= 80 
          ? 'border-t-high-risk animate-pulse-glow-danger' 
          : 'border-t-suspicious animate-pulse-glow-warning'
    }`}>
      {/* Header Banner */}
      <div className={`-mt-6 -mx-6 mb-6 px-6 py-2 border-b text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${severityColors[result.severity_label]}`}>
        {isSafe ? <CheckCircleOutlineIcon fontSize="small" /> : <WarningAmberIcon fontSize="small" />}
        Severity: {result.severity_label}
      </div>

      {/* Top Section: Score & Badges */}
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-8">
        <RiskGauge score={result.risk_score} size={110} strokeWidth={8} />
        
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold capitalize">
              {result.threat_type.replace('_', ' ')}
            </h2>
            <RiskBadge level={result.threat_level} />
          </div>
          
          <div className="text-sm text-theme-secondary">
            Source: <span className="capitalize text-theme-secondary">{result.source}</span>
            <span className="mx-2">•</span>
            Type: <span className="capitalize text-theme-secondary">{result.type}</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-theme-secondary">AI Confidence:</span>
            <div className="w-32 h-1.5 bg-theme-bg rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${result.confidence * 100}%` }} 
              />
            </div>
            <span className="text-theme-secondary">{(result.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Indicators */}
      {result.indicators.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-theme-secondary mb-3 flex items-center gap-2">
            <FlagIcon fontSize="small" sx={{ color: '#94A3B8' }} />
            Threat Indicators Detected
          </h4>
          <div className="flex flex-wrap">
            {result.indicators.map((indicator, idx) => (
              <IndicatorChip key={idx} label={indicator} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Col: Explanation */}
        <div className="space-y-4">
          <div className="bg-theme-bg/40 rounded-xl p-4 border border-theme-border">
            <h4 className="text-sm font-semibold text-theme-secondary mb-2">AI Explanation</h4>
            <p className="text-sm text-theme-secondary leading-relaxed">{result.explanation}</p>
          </div>
          
          {result.key_points && result.key_points.length > 0 && (
            <div className="bg-theme-bg/40 rounded-xl p-4 border border-theme-border">
              <h4 className="text-sm font-semibold text-theme-secondary mb-2">Key Points</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-theme-secondary">
                {result.key_points.map((kp, idx) => (
                  <li key={idx} className="leading-relaxed">{kp}</li>
                ))}
              </ul>
            </div>
          )}
          
          {result.external_flags && Object.keys(result.external_flags).length > 0 && (
            <div className="bg-theme-bg/40 rounded-xl p-4 border border-theme-border">
              <h4 className="text-sm font-semibold text-theme-secondary mb-3">External Intelligence</h4>
              <div className="space-y-2">
                {result.external_flags.safe_browsing && (
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Google Safe Browsing:</span>
                    <span className={result.external_flags.safe_browsing === 'SAFE' ? 'text-safe' : 'text-high-risk'}>
                      {result.external_flags.safe_browsing}
                    </span>
                  </div>
                )}
                {result.external_flags.virustotal_positives !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">VirusTotal Score:</span>
                    <span className={result.external_flags.virustotal_positives > 0 ? 'text-high-risk font-bold' : 'text-safe'}>
                      {result.external_flags.virustotal_positives} / {result.external_flags.virustotal_total_engines} engines
                    </span>
                  </div>
                )}
                {result.external_flags.domain_age && (
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Domain Age:</span>
                    <span className="text-suspicious">{result.external_flags.domain_age}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Actions */}
        <div>
          <div className={`rounded-xl p-4 border ${isSafe ? 'bg-safe/5 border-safe/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <h4 className={`text-sm font-semibold mb-3 ${isSafe ? 'text-safe' : 'text-red-400'}`}>
              Recommended Actions
            </h4>
            <ul className="space-y-3">
              {result.recommended_actions.map((action, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-theme-secondary items-start">
                  <div className={`mt-0.5 rounded-full p-0.5 ${isSafe ? 'bg-safe/20 text-safe' : 'bg-red-500/20 text-red-500'}`}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
                  </div>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  )
}
