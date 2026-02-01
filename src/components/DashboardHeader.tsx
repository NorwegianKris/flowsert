import { ReportFeedbackDialog } from '@/components/ReportFeedbackDialog';
import { Logo } from '@/components/Logo';
import { ActionsBell } from '@/components/ActionsBell';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';

interface DashboardHeaderProps {
  projects?: Project[];
  personnel?: Personnel[];
}

export function DashboardHeader({ projects = [], personnel = [] }: DashboardHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Logo />
          
          <div className="flex items-center gap-3">
            <ActionsBell projects={projects} personnel={personnel} />
            <ReportFeedbackDialog />
          </div>
        </div>
      </div>
    </header>
  );
}
