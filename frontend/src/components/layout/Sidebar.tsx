import { NavLink } from 'react-router-dom'
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
  const { themeMode, toggleTheme } = useUIStore()

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
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative ${
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
          <IconButton onClick={toggleTheme} size="small" sx={{ color: 'var(--color-text-secondary)' }}>
            {themeMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </div>

        {/* Status */}
        {!collapsed && (
          <div className="rounded-lg p-3 bg-safe/10 border border-safe/20 flex items-center gap-3">
            <div className="relative flex h-2 w-2 items-center justify-center shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-safe"></span>
            </div>
            <div className="flex flex-col whitespace-nowrap">
              <span className="text-[10px] text-safe font-bold tracking-widest uppercase">System Active</span>
              <span className="text-[11px] text-theme-text-secondary">All services up</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center hover:bg-theme-border transition-colors z-50 cursor-pointer shadow-sm text-theme-text-secondary hover:text-theme-text"
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
