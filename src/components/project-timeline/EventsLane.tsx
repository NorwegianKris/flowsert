import { format, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { ProjectCalendarItem } from '@/hooks/useProjects';
import { dateToX } from './utils';
import { LANE_HEIGHT } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EventsLaneProps {
  calendarItems: ProjectCalendarItem[];
  projectStart: string;
  projectEnd: string;
  totalWidth: number;
  onItemClick?: (item: ProjectCalendarItem) => void;
}

export function EventsLane({
  calendarItems,
  projectStart,
  projectEnd,
  totalWidth,
  onItemClick,
}: EventsLaneProps) {
  const events = calendarItems.filter((i) => !i.isMilestone);

  return (
    <div className="flex items-stretch border-b border-border/30">
      {/* Label */}
      <div className="w-[160px] flex-shrink-0 flex items-center px-3 py-1 bg-primary/5 border-r border-border/30">
        <CalendarDays className="h-3.5 w-3.5 text-primary mr-2 flex-shrink-0" />
        <span className="text-xs font-medium text-muted-foreground truncate">Events</span>
      </div>

      {/* Lane content */}
      <div className="relative flex-1 bg-primary/5" style={{ minHeight: LANE_HEIGHT, width: totalWidth }}>
        {events.map((item) => {
          const x = dateToX(item.date, projectStart, projectEnd, totalWidth);
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                  style={{ left: x }}
                  onClick={() => onItemClick?.(item)}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/70 border border-primary shadow-sm hover:scale-150 transition-transform" />
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

        {events.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/60">No events</span>
          </div>
        )}
      </div>
    </div>
  );
}
