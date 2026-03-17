import { useState, useEffect } from 'react'
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride'
import { useTheme } from '@mui/material'

export default function OnboardingTour() {
  const theme = useTheme()
  const [run, setRun] = useState(false)

  // Only run the tour once per browser session/storage
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('cybersentinel_tour_completed')
    if (!hasSeenTour) {
      // Delay start slightly so animations finish
      setTimeout(() => setRun(true), 1500)
    }
  }, [])

  const steps: Step[] = [
    {
      target: '.tour-scan-input',
      content: 'Welcome to CyberSentinel AI! Start by scanning a suspicious URL, email snippet, or prompt here.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-scan-results',
      content: 'Detailed AI analysis and risk scores will appear here instantly.',
      placement: 'left',
    },
    {
      target: '.tour-sidebar-threats',
      content: 'View your complete history of scanned threats and their deep dive reports.',
      placement: 'right',
    },
    {
      target: '.tour-assistant-widget',
      content: 'Need help? Our context-aware AI Assistant is always here to explain complex cyber terms or guide you.',
      placement: 'top-end',
    }
  ]

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRun(false)
      localStorage.setItem('cybersentinel_tour_completed', 'true')
    }
  }

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: theme.palette.primary.main,
          backgroundColor: '#1E293B',
          textColor: '#F1F5F9',
          arrowColor: '#1E293B',
          overlayColor: 'rgba(15, 23, 42, 0.85)',
        },
        buttonNext: {
          backgroundColor: theme.palette.primary.main,
          borderRadius: 8,
        },
        buttonBack: {
          color: '#94A3B8',
        },
        buttonSkip: {
          color: '#94A3B8',
        },
        tooltip: {
          borderRadius: 16,
          border: '1px solid #334155',
        }
      }}
    />
  )
}
