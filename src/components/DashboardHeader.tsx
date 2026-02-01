import { ReportFeedbackDialog } from '@/components/ReportFeedbackDialog';
import { Logo } from '@/components/Logo';

export function DashboardHeader() {
  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Logo />
          
          <div className="flex items-center gap-3">
            <ReportFeedbackDialog />
          </div>
        </div>
      </div>
    </header>
  );
}
