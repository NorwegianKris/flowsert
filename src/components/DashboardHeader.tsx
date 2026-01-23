import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ReportFeedbackDialog } from '@/components/ReportFeedbackDialog';
import flowsertLogo from '@/assets/flowsert-logo.png';

interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DashboardHeader({ searchQuery, onSearchChange }: DashboardHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col items-start">
            <img src={flowsertLogo} alt="FlowSert" className="h-8 w-auto" />
            <p className="text-sm text-muted-foreground">
              Personnel Certificate Management
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <ReportFeedbackDialog />
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search personnel..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
