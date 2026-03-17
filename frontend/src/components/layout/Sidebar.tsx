import { NavLink } from 'react-router-dom'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HistoryIcon from '@mui/icons-material/History'
import BarChartIcon from '@mui/icons-material/BarChart'
import EmailIcon from '@mui/icons-material/Email'
import SecurityIcon from '@mui/icons-material/Security'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import RuleIcon from '@mui/icons-material/Rule'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ShieldIcon from '@mui/icons-material/Shield'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { IconButton } from '@mui/material'
import { useUIStore } from '../../stores/useUIStore'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { to: '/', icon: <DashboardIcon />, label: 'Dashboard', sublabel: 'Live Scan' },
  { to: '/threats', icon: <HistoryIcon />, label: 'Threat History', sublabel: 'Logs' },
  { to: '/analytics', icon: <BarChartIcon />, label: 'Analytics', sublabel: 'Charts' },
  { to: '/email', icon: <EmailIcon />, label: 'Email Scanner', sublabel: 'EML' },
  { to: '/audit', icon: <TravelExploreIcon />, label: 'History Audit', sublabel: 'Scan' },
  { to: '/rules', icon: <RuleIcon />, label: 'Custom Rules', sublabel: 'Engine' },
]

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { themeMode, toggleTheme } = useUIStore()

  return (
    <aside
      className={`${
        collapsed ? 'w-[72px]' : 'w-64'
      } bg-theme-card/60 backdrop-blur-xl border-r border-theme-border flex flex-col transition-all duration-300 ease-in-out h-screen relative`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-theme-border">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center flex-shrink-0">
          <ShieldIcon sx={{ fontSize: 20, color: 'white' }} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white whitespace-nowrap">CyberSentinel</h1>
            <p className="text-[10px] text-theme-secondary whitespace-nowrap">AI Defense Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/10'
              }`
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Status & Theme Toggle */}
      <div className={`px-4 pb-4 flex flex-col gap-3 ${collapsed ? 'items-center' : ''}`}>
        
        {/* Theme Toggle */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between glass-card p-2'}`}>
          {!collapsed && <span className="text-xs text-theme-secondary ml-2 font-medium">Theme</span>}
          <IconButton onClick={toggleTheme} size="small" sx={{ color: 'var(--color-text-secondary)' }}>
            {themeMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </div>

        {/* Status */}
        {!collapsed && (
          <div className="glass-card p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
              <span className="text-xs text-theme-secondary">System Active</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <SecurityIcon sx={{ fontSize: 12, color: '#10B981' }} />
              <span className="text-[10px] text-safe font-semibold">Protected</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-theme-card border border-theme-border flex items-center justify-center hover:bg-primary/20 transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRightIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
        ) : (
          <ChevronLeftIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
        )}
      </button>
    </aside>
  )
}
