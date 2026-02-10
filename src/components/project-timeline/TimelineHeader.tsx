import { useMemo, useRef, useState } from 'react';
import { format, parseISO, isWithinInterval, differenceInMonths } from 'date-fns';
import { dateToX } from './utils';

interface TimelineHeaderProps {
  projectStart: string;
  projectEnd: string;
  totalWidth: number;
}

export function TimelineHeader({ projectStart, projectEnd, totalWidth }: TimelineHeaderProps) {
  const start = parseISO(projectStart);
  const end = parseISO(projectEnd);
  const today = new Date();
  const showToday = isWithinInterval(today, { start, end });
  const monthCount = differenceInMonths(end, start);

  // Generate month boundaries
  const monthMarkers = useMemo(() => {
    const markers: { label: string; x: number }[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
      const x = dateToX(current, start, end, totalWidth);
      if (x >= 0) {
        markers.push({
          label: format(current, monthCount > 12 ? 'MMM yy' : 'MMM yyyy'),
          x,
        });
      }
      current.setMonth(current.getMonth() + 1);
    }
    return markers;
  }, [projectStart, projectEnd, totalWidth, monthCount]);

  const todayX = showToday ? dateToX(today, start, end, totalWidth) : null;

  return (
    <div className="relative h-8 border-b border-border/50" style={{ width: totalWidth }}>
      {/* Month labels */}
      {monthMarkers.map((m, i) => (
        <div
          key={i}
          className="absolute top-0 h-full flex items-end pb-1"
          style={{ left: m.x }}
        >
          <div className="h-3 border-l border-border/50" />
          <span className="text-[10px] text-muted-foreground ml-1 whitespace-nowrap select-none">
            {m.label}
          </span>
        </div>
      ))}

      {/* Today line indicator in header */}
      {todayX !== null && (
        <div
          className="absolute top-0 h-full w-px bg-destructive z-10"
          style={{ left: todayX }}
        >
          <span className="absolute -top-0 left-1 text-[9px] text-destructive font-medium whitespace-nowrap">
            Today
          </span>
        </div>
      )}
    </div>
  );
}
