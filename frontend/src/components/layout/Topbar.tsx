import { useLocation } from 'react-router-dom'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import ShieldIcon from '@mui/icons-material/Shield'

interface TopbarProps {
  onMenuToggle: () => void
}

const pageInfo: Record<string, { title: string; desc: string }> = {
  '/': { title: '🛡️ Live Scan Dashboard', desc: 'Analyze threats in real-time' },
  '/threats': { title: '📋 Threat History', desc: 'Browse past threat detections' },
  '/analytics': { title: '📊 Security Analytics', desc: 'Visualize threat intelligence data' },
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const location = useLocation()
  const info = pageInfo[location.pathname] || pageInfo['/']

  return (
    <header className="h-16 bg-theme-card/40 backdrop-blur-xl border-b border-theme-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-theme-secondary/10 transition-colors"
        >
          <MenuIcon sx={{ color: '#94A3B8' }} />
        </button>
        <div>
          <h2 className="text-base font-semibold text-theme-primary">{info.title}</h2>
          <p className="text-xs text-theme-secondary">{info.desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-safe/10 border border-safe/20">
          <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
          <span className="text-xs font-medium text-safe">Monitoring</span>
        </div>
        <button className="p-2 rounded-lg hover:bg-theme-secondary/10 transition-colors relative">
          <NotificationsNoneIcon sx={{ fontSize: 20, color: '#94A3B8' }} />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center">
          <ShieldIcon sx={{ fontSize: 16, color: 'white' }} />
        </div>
      </div>
    </header>
  )
}
