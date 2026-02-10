import { format, parseISO } from 'date-fns';
import { AvailabilitySpan } from './types';
import { dateToX } from './utils';
import { LANE_HEIGHT } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AvailabilityLaneProps {
  spans: AvailabilitySpan[];
  projectStart: string;
  projectEnd: string;
  totalWidth: number;
  onClick?: () => void;
}

function statusColor(status: AvailabilitySpan['status']): string {
  switch (status) {
    case 'available':
      return 'bg-sky-500/80';
    case 'partial':
      return 'bg-sky-500/40 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,hsl(var(--background)/0.3)_3px,hsl(var(--background)/0.3)_6px)]';
    case 'other':
      return 'bg-blue-500/70';
    default:
      return 'bg-muted/30';
  }
}

function statusLabel(status: AvailabilitySpan['status']): string {
  switch (status) {
    case 'available':
      return 'Available';
    case 'partial':
      return 'Partially available';
    case 'other':
      return 'Other';
    default:
      return status;
  }
}

export function AvailabilityLane({
  spans,
  projectStart,
  projectEnd,
  totalWidth,
  onClick,
}: AvailabilityLaneProps) {
  return (
    <div className="flex items-stretch">
      {/* Label */}
      <div className="w-[160px] flex-shrink-0 flex items-center pl-8 pr-3 py-0.5 border-r border-border/30">
        <span className="text-[10px] text-muted-foreground truncate">Availability</span>
      </div>

      {/* Lane */}
      <div
        className="relative flex-1 bg-sky-500/[0.03] cursor-pointer"
        style={{ minHeight: LANE_HEIGHT, width: totalWidth }}
        onClick={onClick}
      >
        {spans.map((span, i) => {
          const x1 = dateToX(span.startDate, projectStart, projectEnd, totalWidth);
          const x2 = dateToX(span.endDate, projectStart, projectEnd, totalWidth);
          const width = Math.max(x2 - x1, 4);

          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className={`absolute top-1 bottom-1 rounded-sm ${statusColor(span.status)} hover:opacity-80 transition-opacity`}
                  style={{ left: x1, width }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{statusLabel(span.status)}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(span.startDate), 'MMM d')} – {format(parseISO(span.endDate), 'MMM d, yyyy')}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {spans.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/60">No availability data</span>
          </div>
        )}
      </div>
    </div>
  );
}
