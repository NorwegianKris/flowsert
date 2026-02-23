import { format, parseISO } from 'date-fns';
import { Flag } from 'lucide-react';
import { ProjectCalendarItem } from '@/hooks/useProjects';
import { dateToX } from './utils';
import { LANE_HEIGHT } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MilestoneLaneProps {
  calendarItems: ProjectCalendarItem[];
  projectStart: string;
  projectEnd: string;
  totalWidth: number;
  onItemClick?: (item: ProjectCalendarItem) => void;
}

export function MilestoneLane({
  calendarItems,
  projectStart,
  projectEnd,
  totalWidth,
  onItemClick,
}: MilestoneLaneProps) {
  const milestones = calendarItems.filter((i) => i.isMilestone);

  return (
    <div className="flex items-stretch border-b border-border/30">
      {/* Label */}
      <div className="w-[160px] flex-shrink-0 flex items-center px-3 py-1 bg-amber-500/5 border-r border-border/30">
        <Flag className="h-3.5 w-3.5 text-amber-500 mr-2 flex-shrink-0" />
        <span className="text-xs font-medium text-muted-foreground truncate">Milestones</span>
      </div>

      {/* Lane content */}
      <div className="relative flex-1 bg-amber-500/5" style={{ minHeight: LANE_HEIGHT, width: totalWidth }}>
        {milestones.map((item) => {
          const x = dateToX(item.date, projectStart, projectEnd, totalWidth);
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                  style={{ left: x }}
                  onClick={() => onItemClick?.(item)}
                >
                  <div className="w-3.5 h-3.5 rotate-45 bg-amber-500 border border-amber-600 shadow-sm hover:scale-125 transition-transform" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(item.date), 'MMM d, yyyy')}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {milestones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/60">No milestones</span>
          </div>
        )}
      </div>
    </div>
  );
}
