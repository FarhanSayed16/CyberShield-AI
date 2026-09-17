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
import SmartToyIcon from '@mui/icons-material/SmartToy'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import GroupIcon from '@mui/icons-material/Group'
import SettingsIcon from '@mui/icons-material/Settings'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import PaymentsIcon from '@mui/icons-material/Payments'
import ForumIcon from '@mui/icons-material/Forum'
import { IconButton } from '@mui/material'
import { useUIStore } from '../../stores/useUIStore'
import { useAuth } from '../../context/AuthContext'
import CyberSentinelLogo from '../brand/CyberSentinelLogo'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

type NavItem = {
  to: string
  icon: React.ReactNode
  label: string
  adminOnly?: boolean
  managerOrAdmin?: boolean
}

const threatNav: NavItem[] = [
  { to: '/dashboard', icon: <DashboardIcon />, label: 'Live Scan' },
  { to: '/threats', icon: <HistoryIcon />, label: 'Threat History' },
  { to: '/analytics', icon: <BarChartIcon />, label: 'Analytics' },
  { to: '/email', icon: <EmailIcon />, label: 'Email Scanner' },
  { to: '/audit', icon: <TravelExploreIcon />, label: 'History Audit' },
  { to: '/rules', icon: <RuleIcon />, label: 'Custom Rules' },
]

const aiNav: NavItem[] = [
  { to: '/ai', icon: <SmartToyIcon />, label: 'AI Overview' },
  { to: '/ai/events', icon: <ForumIcon />, label: 'AI Activity' },
  { to: '/ai/alerts', icon: <WarningAmberIcon />, label: 'Risk Alerts', managerOrAdmin: true },
  { to: '/ai/users', icon: <GroupIcon />, label: 'Team', adminOnly: true },
  { to: '/ai/settings', icon: <SettingsIcon />, label: 'Org Settings', adminOnly: true },
  { to: '/ai/billing', icon: <PaymentsIcon />, label: 'Billing', adminOnly: true },
  { to: '/admin/verify', icon: <VerifiedUserIcon />, label: 'Admin Verify', adminOnly: true },
]

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { themeMode, toggleTheme, systemStatus, systemStatusDetail, pollHealth } = useUIStore()
  const { user } = useAuth()

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
          : {
              wrap: 'bg-theme-surface border-theme-border',
              text: 'text-theme-text-secondary',
              label: 'Checking…',
              ping: 'bg-theme-text-secondary',
            }

  const canSee = (item: NavItem) => {
    if (!user) return false
    if (item.adminOnly) return user.role === 'admin'
    if (item.managerOrAdmin) return user.role === 'admin' || user.role === 'manager'
    return true
  }

  const renderGroup = (title: string, items: NavItem[]) => (
    <div className="mb-3">
      {!collapsed && (
        <div className="px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-theme-text-secondary">
          {title}
        </div>
      )}
      {items.filter(canSee).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/ai'}
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
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-primary rounded-r-full" />
              )}
              <span
                className={`flex-shrink-0 ${isActive ? 'text-primary' : 'group-hover:text-theme-text transition-colors'}`}
              >
                {item.icon}
              </span>
              {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </div>
  )

  return (
    <aside
      className={`${
        collapsed ? 'w-[72px]' : 'w-72'
      } transition-all duration-300 ease-in-out h-screen border-r border-theme-border bg-theme-surface relative z-50 flex flex-col`}
    >
      <div
        className={`flex items-center border-b border-theme-border shrink-0 ${collapsed ? 'justify-center px-2 h-20' : 'px-5 h-20'}`}
      >
        {collapsed ? (
          <CyberSentinelLogo size="md" variant="primary" />
        ) : (
          <CyberSentinelLogo withWordmark size="md" variant="primary" tagline="Defense Platform" />
        )}
      </div>

      <nav className="flex-1 py-4 flex flex-col overflow-y-auto px-3">
        {renderGroup('AI Workplace', aiNav)}
        {renderGroup('Threat Explainer', threatNav)}
      </nav>

      <div className="p-4 border-t border-theme-border shrink-0 flex flex-col gap-4">
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

        {!collapsed && (
          <div className={`rounded-lg p-3 border flex items-center gap-3 ${statusUi.wrap}`} title={systemStatusDetail}>
            <div className="relative flex h-2 w-2 items-center justify-center shrink-0">
              {systemStatus === 'active' && (
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusUi.ping} opacity-75`}
                />
              )}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusUi.ping}`} />
            </div>
            <div className="flex flex-col whitespace-nowrap min-w-0">
              <span className={`text-[10px] font-bold tracking-widest uppercase ${statusUi.text}`}>
                {statusUi.label}
              </span>
              <span className="text-[11px] text-theme-text-secondary truncate">{systemStatusDetail}</span>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center hover:bg-theme-border transition-colors z-50 cursor-pointer shadow-sm text-theme-text-secondary hover:text-theme-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {collapsed ? <ChevronRightIcon sx={{ fontSize: 14 }} /> : <ChevronLeftIcon sx={{ fontSize: 14 }} />}
      </button>
    </aside>
  )
}
