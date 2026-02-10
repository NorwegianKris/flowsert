import { format, parseISO } from 'date-fns';
import { Layers } from 'lucide-react';
import { ProjectPhase } from '@/hooks/useProjectPhases';
import { dateToX } from './utils';
import { LANE_HEIGHT } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PhaseLaneProps {
  phases: ProjectPhase[];
  projectStart: string;
  projectEnd: string;
  totalWidth: number;
}

export function PhaseLane({
  phases,
  projectStart,
  projectEnd,
  totalWidth,
}: PhaseLaneProps) {
  return (
    <div className="flex items-stretch border-b border-border/30">
      {/* Label */}
      <div className="w-[160px] flex-shrink-0 flex items-center px-3 py-1 bg-primary/5 border-r border-border/30">
        <Layers className="h-3.5 w-3.5 text-primary mr-2 flex-shrink-0" />
        <span className="text-xs font-medium text-muted-foreground truncate">Phases</span>
      </div>

      {/* Lane content */}
      <div className="relative flex-1 bg-primary/[0.03]" style={{ minHeight: LANE_HEIGHT + 4, width: totalWidth }}>
        {phases.map((phase) => {
          const x1 = dateToX(phase.startDate, projectStart, projectEnd, totalWidth);
          const x2 = dateToX(phase.endDate, projectStart, projectEnd, totalWidth);
          const width = Math.max(x2 - x1, 6);

          return (
            <Tooltip key={phase.id}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1 bottom-1 rounded bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-colors cursor-default flex items-center overflow-hidden px-1.5"
                  style={{ left: x1, width }}
                >
                  <span className="text-[9px] font-medium text-primary truncate select-none">
                    {phase.name}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{phase.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(phase.startDate), 'MMM d')} – {format(parseISO(phase.endDate), 'MMM d, yyyy')}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {phases.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/60">No phases defined</span>
          </div>
        )}
      </div>
    </div>
  );
}
