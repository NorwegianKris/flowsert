import { useMemo } from 'react';
import { format, parseISO, isWithinInterval, differenceInMonths, differenceInDays, addDays } from 'date-fns';
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
  const totalDays = differenceInDays(end, start) + 1;

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

  // Generate day number ticks — skip some if too dense
  const dayMarkers = useMemo(() => {
    const pixelsPerDay = totalWidth / totalDays;
    // Determine step: show every day if enough space, otherwise every 2, 5, 7, 14, etc.
    let step = 1;
    if (pixelsPerDay < 12) step = 2;
    if (pixelsPerDay < 7) step = 5;
    if (pixelsPerDay < 4) step = 7;
    if (pixelsPerDay < 2) step = 14;
    if (pixelsPerDay < 1) step = 30;

    const markers: { label: string; x: number }[] = [];
    for (let i = 0; i < totalDays; i += step) {
      const d = addDays(start, i);
      const x = dateToX(d, start, end, totalWidth);
      markers.push({ label: String(d.getDate()), x });
    }
    return markers;
  }, [projectStart, projectEnd, totalWidth, totalDays]);

  const todayX = showToday ? dateToX(today, start, end, totalWidth) : null;

  return (
    <div className="relative border-b border-border/50" style={{ width: totalWidth }}>
      {/* Month row */}
      <div className="relative h-6">
        {monthMarkers.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 h-full flex items-end pb-0.5"
            style={{ left: m.x }}
          >
            <div className="h-3 border-l border-border/50" />
            <span className="text-[10px] text-muted-foreground ml-1 whitespace-nowrap select-none">
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* Day numbers row */}
      <div className="relative h-5 border-t border-border/20">
        {dayMarkers.map((d, i) => (
          <div
            key={i}
            className="absolute top-0 h-full flex flex-col items-center"
            style={{ left: d.x, transform: 'translateX(-50%)' }}
          >
            <div className="h-1.5 border-l border-border/30" />
            <span className="text-[9px] text-muted-foreground/70 select-none leading-none">
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {/* Today line indicator in header */}
      {todayX !== null && (
        <div
          className="absolute top-0 h-full w-px bg-destructive z-10"
          style={{ left: todayX }}
        >
          <span className="absolute top-0 left-1 text-[9px] text-destructive font-medium whitespace-nowrap">
            Today
          </span>
        </div>
      )}
    </div>
  );
}
