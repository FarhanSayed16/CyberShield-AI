type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

interface CyberSentinelLogoProps {
  /** Show wordmark next to the mark */
  withWordmark?: boolean
  /** Optional short tagline under the wordmark */
  tagline?: string
  size?: LogoSize
  className?: string
  /** Kept for API compatibility; official mark is logo.png */
  variant?: 'signal' | 'primary' | 'ink'
}

const SIZE_MAP: Record<LogoSize, { box: string; title: string }> = {
  sm: { box: 'w-8 h-8', title: 'text-base' },
  md: { box: 'w-9 h-9', title: 'text-lg' },
  lg: { box: 'w-11 h-11', title: 'text-xl' },
  xl: { box: 'w-14 h-14', title: 'text-3xl md:text-4xl' },
}

/**
 * Official CyberSentinel brand mark (frontend/public/logo.png).
 */
export default function CyberSentinelLogo({
  withWordmark = false,
  tagline,
  size = 'md',
  className = '',
}: CyberSentinelLogoProps) {
  const s = SIZE_MAP[size]

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span
        className={`${s.box} flex items-center justify-center shrink-0`}
        aria-hidden={!withWordmark}
      >
        <img
          src="/logo.png"
          alt={withWordmark ? '' : 'CyberSentinel'}
          className="w-full h-full object-contain drop-shadow-md"
          draggable={false}
        />
      </span>

      {withWordmark && (
        <span className="flex flex-col justify-center min-w-0">
          <span className={`font-display font-bold text-theme-text tracking-tight leading-tight ${s.title}`}>
            CyberSentinel
          </span>
          {tagline && (
            <span className="text-[10px] sm:text-[11px] text-theme-text-secondary font-medium tracking-wide mt-0.5">
              {tagline}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
