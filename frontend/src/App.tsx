import { useMemo, type ReactNode } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider, CssBaseline } from '@mui/material'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import ThreatHistoryPage from './pages/ThreatHistoryPage'
import AnalyticsPage from './pages/AnalyticsPage'
import EmailScanPage from './pages/EmailScanPage'
import BrowsingAuditPage from './pages/BrowsingAuditPage'
import ThreatDiffPage from './pages/ThreatDiffPage'
import RulesPage from './pages/RulesPage'
import AiOverviewPage from './pages/AiOverviewPage'
import AiEventsPage from './pages/AiEventsPage'
import AiAlertsPage from './pages/AiAlertsPage'
import TeamUsersPage from './pages/TeamUsersPage'
import OrgSettingsPage from './pages/OrgSettingsPage'
import AdminVerifyPage from './pages/AdminVerifyPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import AssistantWidget from './features/assistant/AssistantWidget'
import OnboardingTour from './components/common/OnboardingTour'
import { useUIStore } from './stores/useUIStore'
import { useWebSocket } from './hooks/useWebSocket'
import { AuthProvider, useAuth } from './context/AuthContext'
import getTheme from './theme'
import LandingPage from './pages/LandingPage'
import BillingPage from './pages/BillingPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import InstallGuidePage from './pages/InstallGuidePage'

function RequireAuth({
  children,
  adminOnly = false,
  managerOrAdmin = false,
}: {
  children: ReactNode
  adminOnly?: boolean
  managerOrAdmin?: boolean
}) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-theme-text-secondary">
        Loading…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/ai" replace />
  if (managerOrAdmin && !['admin', 'manager'].includes(user.role)) {
    return <Navigate to="/ai" replace />
  }
  return <>{children}</>
}

function InternalApp() {
  const location = useLocation()
  useWebSocket()

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* AI Workplace Guard */}
          <Route path="/ai" element={<AiOverviewPage />} />
          <Route path="/ai/events" element={<AiEventsPage />} />
          <Route
            path="/ai/alerts"
            element={
              <RequireAuth managerOrAdmin>
                <AiAlertsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/ai/users"
            element={
              <RequireAuth adminOnly>
                <TeamUsersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/ai/settings"
            element={
              <RequireAuth adminOnly>
                <OrgSettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/ai/billing"
            element={
              <RequireAuth adminOnly>
                <BillingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/verify"
            element={
              <RequireAuth adminOnly>
                <AdminVerifyPage />
              </RequireAuth>
            }
          />

          {/* Threat Explainer */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/threats" element={<ThreatHistoryPage />} />
          <Route path="/threats/:id1/compare/:id2" element={<ThreatDiffPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/email" element={<EmailScanPage />} />
          <Route path="/audit" element={<BrowsingAuditPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="*" element={<Navigate to="/ai" replace />} />
        </Routes>
      </AnimatePresence>
      <AssistantWidget />
    </AppLayout>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/install" element={<InstallGuidePage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <InternalApp />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

function App() {
  const themeMode = useUIStore((state) => state.themeMode)
  const dynamicTheme = useMemo(() => getTheme(themeMode), [themeMode])

  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      <AuthProvider>
        <OnboardingTour />
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
