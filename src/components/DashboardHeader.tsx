import { ReportFeedbackDialog } from '@/components/ReportFeedbackDialog';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

interface DashboardHeaderProps {
  onMyProfileClick?: () => void;
  hasLinkedProfile?: boolean;
}

export function DashboardHeader({ onMyProfileClick, hasLinkedProfile }: DashboardHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Logo />
          <div className="flex items-center gap-2">
            {onMyProfileClick && (
              <Button variant="outline" size="sm" onClick={onMyProfileClick}>
                <User className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">My Profile</span>
                {hasLinkedProfile && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-completed shrink-0" />
                )}
              </Button>
            )}
            <ReportFeedbackDialog />
          </div>
        </div>
      </div>
    </header>
  );
}
