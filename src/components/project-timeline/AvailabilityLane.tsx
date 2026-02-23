import { format } from 'date-fns';
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
      return 'bg-emerald-500/80';
    case 'partial':
      return 'bg-amber-500/80';
    case 'unavailable':
      return 'bg-red-500/80';
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
    case 'unavailable':
      return 'Unavailable';
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
          const x1Raw = dateToX(span.startDate, projectStart, projectEnd, totalWidth);
          const x1 = Math.max(0, x1Raw);
          // Add 1 day to end date to make it inclusive
          const endDatePlusOne = new Date(span.endDate + 'T00:00:00');
          endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
          const x2 = dateToX(endDatePlusOne, projectStart, projectEnd, totalWidth);
          const width = Math.max(x2 - x1, 4);

          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className={`absolute rounded-sm ${statusColor(span.status)} hover:opacity-80 transition-opacity`}
                  style={{ left: x1, width, top: 2, height: 16 }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{statusLabel(span.status)}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(span.startDate + 'T00:00:00'), 'MMM d')} – {format(new Date(span.endDate + 'T00:00:00'), 'MMM d, yyyy')}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {spans.length === 0 && (
          <div
            className="absolute rounded-sm bg-emerald-500/80"
            style={{ left: 0, width: totalWidth, top: 2, height: 16 }}
          />
        )}
      </div>
    </div>
  );
}
