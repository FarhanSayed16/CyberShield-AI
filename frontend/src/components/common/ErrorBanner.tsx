import WarningAmberIcon from '@mui/icons-material/WarningAmber'

interface ErrorBannerProps {
  message: string
  title?: string
  onRetry?: () => void
}

export default function ErrorBanner({ message, title = 'Request Failed', onRetry }: ErrorBannerProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start sm:items-center gap-3">
      <WarningAmberIcon sx={{ color: '#EF4444' }} />
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-red-400">{title}</h4>
        <p className="text-xs text-red-200 mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
