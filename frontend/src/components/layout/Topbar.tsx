import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import ShieldIcon from '@mui/icons-material/Shield'
import { useUIStore } from '../../stores/useUIStore'

interface TopbarProps {
  onMenuToggle: () => void
}

const pageInfo: Record<string, { title: string; desc: string }> = {
  '/dashboard': { title: 'Live Scan Dashboard', desc: 'Analyze threats in real-time' },
  '/threats': { title: 'Threat History', desc: 'Browse past threat detections' },
  '/analytics': { title: 'Security Analytics', desc: 'Visualize threat intelligence data' },
  '/email': { title: 'Email Scanner', desc: 'Analyze .eml messages for phishing' },
  '/audit': { title: 'History Audit', desc: 'Scan recent browsing history via extension' },
  '/rules': { title: 'Custom Rules', desc: 'Override AI scoring with deterministic logic' },
}

function matchPageInfo(pathname: string) {
  if (pageInfo[pathname]) return pageInfo[pathname]
  if (pathname.startsWith('/threats')) {
    return { title: 'Threat Comparison', desc: 'Diff two threat events side by side' }
  }
  return pageInfo['/dashboard']
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const info = matchPageInfo(location.pathname)
  const {
    systemStatus,
    systemStatusDetail,
    unreadHighRiskCount,
    markAllRead,
    pollHealth,
  } = useUIStore()

  useEffect(() => {
    pollHealth()
    const id = window.setInterval(() => {
      pollHealth()
    }, 20000)
    return () => clearInterval(id)
  }, [pollHealth])

  const statusStyles =
    systemStatus === 'active'
      ? { wrap: 'bg-safe/10 border-safe/20', dot: 'bg-safe', text: 'text-safe', label: 'System Active' }
      : systemStatus === 'degraded'
        ? { wrap: 'bg-suspicious/10 border-suspicious/20', dot: 'bg-suspicious', text: 'text-suspicious', label: 'Degraded' }
        : systemStatus === 'down'
          ? { wrap: 'bg-high-risk/10 border-high-risk/20', dot: 'bg-high-risk', text: 'text-high-risk', label: 'Offline' }
          : { wrap: 'bg-theme-surface border-theme-border', dot: 'bg-theme-text-secondary', text: 'text-theme-text-secondary', label: 'Checking…' }

  return (
    <header className="h-16 bg-theme-card/40 backdrop-blur-xl border-b border-theme-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-theme-secondary/10 transition-colors"
        >
          <MenuIcon sx={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <div>
          <h2 className="text-base font-semibold text-theme-primary">{info.title}</h2>
          <p className="text-xs text-theme-secondary">{info.desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusStyles.wrap}`}
          title={systemStatusDetail}
        >
          <div className={`w-2 h-2 rounded-full ${statusStyles.dot} ${systemStatus === 'active' ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-medium ${statusStyles.text}`}>{statusStyles.label}</span>
        </div>
        <button
          type="button"
          aria-label={unreadHighRiskCount > 0 ? `${unreadHighRiskCount} unread high-risk alerts` : 'Notifications'}
          onClick={() => {
            markAllRead()
            navigate('/threats')
          }}
          className="p-2 rounded-lg hover:bg-theme-secondary/10 transition-colors relative"
        >
          <NotificationsNoneIcon sx={{ fontSize: 20, color: 'var(--color-text-secondary)' }} />
          {unreadHighRiskCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-high-risk text-[10px] font-bold text-white flex items-center justify-center">
              {unreadHighRiskCount > 9 ? '9+' : unreadHighRiskCount}
            </span>
          )}
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-teal-700 flex items-center justify-center">
          <ShieldIcon sx={{ fontSize: 16, color: 'white' }} />
        </div>
      </div>
    </header>
  )
}
