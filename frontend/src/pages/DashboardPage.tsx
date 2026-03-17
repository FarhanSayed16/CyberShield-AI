import ScanForm from '../features/scan/ScanForm'
import ScanResultCard from '../features/scan/ScanResultCard'
import ScanHistory from '../features/scan/ScanHistory'
import AnimatedPage from '../components/common/AnimatedPage'

export default function DashboardPage() {
  return (
    <AnimatedPage className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 h-[calc(100vh-8rem)]">
      {/* Left Column: Input */}
      <div className="lg:col-span-5 flex flex-col h-full max-h-[800px]">
        <div className="flex-1 mb-4 lg:mb-0">
          <ScanForm />
        </div>
        <div className="hidden lg:block shrink-0">
          <ScanHistory />
        </div>
      </div>

      {/* Right Column: Results */}
      <div className="lg:col-span-7 h-full min-h-[500px] overflow-y-auto pr-2 pb-6">
        <ScanResultCard />
        
        {/* Mobile History */}
        <div className="lg:hidden mt-6">
          <ScanHistory />
        </div>
      </div>
    </AnimatedPage>
  )
}
