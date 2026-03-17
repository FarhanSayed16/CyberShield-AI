export default function SkeletonCard() {
  return (
    <div className="glass-card p-6 w-full animate-fade-in">
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-4 items-center">
          <div className="w-[120px] h-[120px] rounded-full skeleton" />
          <div className="space-y-3">
            <div className="w-24 h-6 rounded skeleton" />
            <div className="w-16 h-4 rounded skeleton" />
          </div>
        </div>
        <div className="w-32 h-8 rounded-full skeleton" />
      </div>

      <div className="space-y-4">
        <div>
          <div className="w-24 h-4 rounded skeleton mb-3" />
          <div className="flex gap-2">
            <div className="w-32 h-6 rounded-md skeleton" />
            <div className="w-40 h-6 rounded-md skeleton" />
            <div className="w-24 h-6 rounded-md skeleton" />
          </div>
        </div>
        
        <div className="space-y-2 pt-4">
          <div className="w-full h-4 rounded skeleton" />
          <div className="w-[90%] h-4 rounded skeleton" />
          <div className="w-[75%] h-4 rounded skeleton" />
        </div>
      </div>
    </div>
  )
}
