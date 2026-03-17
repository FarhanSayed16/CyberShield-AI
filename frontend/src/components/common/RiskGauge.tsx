import { useEffect, useState } from 'react'

interface RiskGaugeProps {
  score: number // 0-100
  size?: number
  strokeWidth?: number
}

export default function RiskGauge({ score, size = 120, strokeWidth = 10 }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    // Slight delay for animation effect
    const timer = setTimeout(() => setAnimatedScore(score), 100)
    return () => clearTimeout(timer)
  }, [score])

  const center = size / 2
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  // Color mapping
  let color = '#10B981' // safe
  if (score >= 80) color = '#EF4444' // high risk
  else if (score >= 50) color = '#F59E0B' // suspicious
  else if (score >= 30) color = '#3B82F6' // low risk

  return (
    <div className="relative flex items-center justify-center font-bold" style={{ width: size, height: size }}>
      {/* Background Circle */}
      <svg className="absolute top-0 left-0 -rotate-90 transform" width={size} height={size}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#334155"
          strokeWidth={strokeWidth}
        />
        {/* Animated FG Circle */}
        <circle
          className="gauge-fill"
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {/* Text inside */}
      <div className="flex flex-col items-center justify-center z-10" style={{ color }}>
        <span className="text-3xl leading-none">{animatedScore}</span>
        <span className="text-[10px] uppercase tracking-wider text-theme-secondary mt-1">Score</span>
      </div>
    </div>
  )
}
