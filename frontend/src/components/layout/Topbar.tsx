import SearchIcon from '@mui/icons-material/Search'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import { IconButton, Avatar, Tooltip } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface TopbarProps {
  onMobileMenuToggle?: () => void
}

const titles: Record<string, string> = {
  '/dashboard': 'Live Scan',
  '/threats': 'Threat History',
  '/analytics': 'Analytics',
  '/email': 'Email Scanner',
  '/audit': 'History Audit',
  '/rules': 'Custom Rules',
  '/ai': 'AI Workplace Overview',
  '/ai/events': 'AI Activity',
  '/ai/alerts': 'Risk Alerts',
  '/ai/users': 'Team Users',
  '/ai/settings': 'Organization Settings',
  '/ai/billing': 'Billing & plans',
  '/admin/verify': 'Admin Verify',
}

export default function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const title = titles[location.pathname] || 'CyberSentinel'

  return (
    <header className="h-20 border-b border-theme-border bg-theme-surface/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <IconButton
            onClick={onMobileMenuToggle}
            className="!text-theme-text-secondary md:!hidden"
            size="small"
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>
        )}
        <h1 className="text-xl font-bold text-theme-text tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative group hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="text-theme-text-secondary group-focus-within:text-primary transition-colors" sx={{ fontSize: 18 }} />
          </div>
          <input
            type="text"
            placeholder="Search…"
            aria-label="Search"
            className="bg-theme-surface border border-theme-border text-theme-text text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all w-40 md:w-64 placeholder:text-theme-text-secondary/80"
          />
        </div>

        <IconButton
          className="!text-theme-text-secondary hover:!text-theme-text hover:!bg-theme-border"
          size="small"
          aria-label="Risk alerts"
          onClick={() => {
            if (user?.role === 'admin' || user?.role === 'manager') {
              navigate('/ai/alerts')
            } else {
              navigate('/ai/events')
            }
          }}
        >
          <NotificationsNoneIcon />
        </IconButton>

        <div className="h-8 w-[1px] bg-theme-border mx-1 hidden sm:block" />

        <div className="flex items-center gap-3 pl-1">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-theme-text leading-none">
              {user?.name || 'User'}
            </p>
            <p className="text-[10px] text-theme-text-secondary mt-1 uppercase tracking-wider font-bold">
              {user?.role || 'member'} · {user?.org_name || 'Org'}
            </p>
          </div>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'var(--color-primary)',
              fontSize: '0.875rem',
              fontWeight: 'bold',
            }}
          >
            {(user?.name || 'U').slice(0, 1).toUpperCase()}
          </Avatar>
          <Tooltip title="Sign out">
            <IconButton
              size="small"
              aria-label="Sign out"
              className="!text-theme-text-secondary hover:!text-theme-text"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
