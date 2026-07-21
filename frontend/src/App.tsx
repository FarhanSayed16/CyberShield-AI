import { useMemo } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
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
import AssistantWidget from './features/assistant/AssistantWidget'
import OnboardingTour from './components/common/OnboardingTour'
import { useUIStore } from './stores/useUIStore'
import { useWebSocket } from './hooks/useWebSocket'
import getTheme from './theme'

import LandingPage from './pages/LandingPage'

function InternalApp() {
  const location = useLocation()
  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/threats" element={<ThreatHistoryPage />} />
          <Route path="/threats/:id1/compare/:id2" element={<ThreatDiffPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/email" element={<EmailScanPage />} />
          <Route path="/audit" element={<BrowsingAuditPage />} />
          <Route path="/rules" element={<RulesPage />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  )
}

function App() {
  const themeMode = useUIStore(state => state.themeMode)
  const dynamicTheme = useMemo(() => getTheme(themeMode), [themeMode])
  
  // Connect to live WebSocket feed
  useWebSocket()
  
  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      <OnboardingTour />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={<InternalApp />} />
      </Routes>
      <AssistantWidget />
    </ThemeProvider>
  )
}

export default App
