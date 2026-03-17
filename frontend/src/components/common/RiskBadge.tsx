import type { ThreatLevel } from '../../api/types'

interface RiskBadgeProps {
  level: ThreatLevel
  className?: string
}

export default function RiskBadge({ level, className = '' }: RiskBadgeProps) {
  const styles: Record<string, string> = {
    'Safe': 'bg-safe/20 text-safe border-safe/30',
    'Suspicious': 'bg-suspicious/20 text-suspicious border-suspicious/30',
    'High Risk': 'bg-high-risk/20 text-high-risk border-high-risk/30',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[level]} ${className}`}>
      {level}
    </span>
  )
}
