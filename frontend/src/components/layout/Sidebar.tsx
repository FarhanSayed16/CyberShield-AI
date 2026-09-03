import { NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HistoryIcon from '@mui/icons-material/History'
import BarChartIcon from '@mui/icons-material/BarChart'
import EmailIcon from '@mui/icons-material/Email'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import RuleIcon from '@mui/icons-material/Rule'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { IconButton } from '@mui/material'
import { useUIStore } from '../../stores/useUIStore'
import CyberSentinelLogo from '../brand/CyberSentinelLogo'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { to: '/dashboard', icon: <DashboardIcon />, label: 'Dashboard', sublabel: 'Live Scan' },
  { to: '/threats', icon: <HistoryIcon />, label: 'Threat History', sublabel: 'Logs' },
  { to: '/analytics', icon: <BarChartIcon />, label: 'Analytics', sublabel: 'Charts' },
  { to: '/email', icon: <EmailIcon />, label: 'Email Scanner', sublabel: 'EML' },
  { to: '/audit', icon: <TravelExploreIcon />, label: 'History Audit', sublabel: 'Scan' },
  { to: '/rules', icon: <RuleIcon />, label: 'Custom Rules', sublabel: 'Engine' },
]

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { themeMode, toggleTheme, systemStatus, systemStatusDetail, pollHealth } = useUIStore()

  useEffect(() => {
    pollHealth()
    const id = window.setInterval(pollHealth, 20000)
    return () => clearInterval(id)
  }, [pollHealth])

  const statusUi =
    systemStatus === 'active'
      ? { wrap: 'bg-safe/10 border-safe/20', text: 'text-safe', label: 'System Active', ping: 'bg-safe' }
      : systemStatus === 'degraded'
        ? { wrap: 'bg-suspicious/10 border-suspicious/20', text: 'text-suspicious', label: 'Degraded', ping: 'bg-suspicious' }
        : systemStatus === 'down'
          ? { wrap: 'bg-high-risk/10 border-high-risk/20', text: 'text-high-risk', label: 'Offline', ping: 'bg-high-risk' }
          : { wrap: 'bg-theme-surface border-theme-border', text: 'text-theme-text-secondary', label: 'Checking…', ping: 'bg-theme-text-secondary' }

  return (
    <aside
      className={`${
        collapsed ? 'w-[72px]' : 'w-72'
      } transition-all duration-300 ease-in-out h-screen border-r border-theme-border bg-theme-surface relative z-50 flex flex-col`}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-theme-border shrink-0 ${collapsed ? 'justify-center px-2 h-20' : 'px-5 h-20'}`}>
        {collapsed ? (
          <CyberSentinelLogo size="md" variant="primary" />
        ) : (
          <CyberSentinelLogo withWordmark size="md" variant="primary" tagline="Defense Platform" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            aria-label={item.label}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-theme-text-secondary hover:bg-theme-border hover:text-theme-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-primary rounded-r-full" />
                )}
                
                <span className={`flex-shrink-0 ${isActive ? 'text-primary' : 'group-hover:text-theme-text transition-colors'}`}>
                  {item.icon}
                </span>
                
                {!collapsed && (
                  <span className={`text-sm font-medium whitespace-nowrap`}>
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Status & Theme Toggle */}
      <div className="p-4 border-t border-theme-border shrink-0 flex flex-col gap-4">
        
        {/* Theme Toggle */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && <span className="text-xs text-theme-text-secondary font-medium pl-1">Theme</span>}
          <IconButton
            onClick={toggleTheme}
            size="small"
            aria-label={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            sx={{ color: 'var(--color-text-secondary)' }}
          >
            {themeMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </div>

        {/* Status */}
        {!collapsed && (
          <div className={`rounded-lg p-3 border flex items-center gap-3 ${statusUi.wrap}`} title={systemStatusDetail}>
            <div className="relative flex h-2 w-2 items-center justify-center shrink-0">
              {systemStatus === 'active' && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusUi.ping} opacity-75`}></span>
              )}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusUi.ping}`}></span>
            </div>
            <div className="flex flex-col whitespace-nowrap min-w-0">
              <span className={`text-[10px] font-bold tracking-widest uppercase ${statusUi.text}`}>{statusUi.label}</span>
              <span className="text-[11px] text-theme-text-secondary truncate">{systemStatusDetail}</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center hover:bg-theme-border transition-colors z-50 cursor-pointer shadow-sm text-theme-text-secondary hover:text-theme-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {collapsed ? (
          <ChevronRightIcon sx={{ fontSize: 14 }} />
        ) : (
          <ChevronLeftIcon sx={{ fontSize: 14 }} />
        )}
      </button>
    </aside>
  )
}
