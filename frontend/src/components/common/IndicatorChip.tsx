interface IndicatorChipProps {
  label: string
}

export default function IndicatorChip({ label }: IndicatorChipProps) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-theme-bg border border-theme-border text-theme-secondary mr-2 mb-2">
      <span className="w-1.5 h-1.5 rounded-full bg-primary/80 mr-1.5" />
      {label}
    </span>
  )
}
