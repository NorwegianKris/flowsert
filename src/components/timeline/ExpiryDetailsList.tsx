import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronDown, List } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { TimelineEvent, LaneConfig, getLaneConfigsForRange } from './types';
import { cn } from '@/lib/utils';

interface ExpiryDetailsListProps {
  timelineEvents: TimelineEvent[];
  timelineStartDays: number;
  timelineEndDays: number;
  personnelFilter: 'all' | 'employees' | 'freelancers' | 'custom';
}

export function ExpiryDetailsList({
  timelineEvents,
  timelineStartDays,
  timelineEndDays,
  personnelFilter,
}: ExpiryDetailsListProps) {
  const navigate = useNavigate();
  const [listOpen, setListOpen] = useState(false);

  const visibleEvents = useMemo(
    () =>
      timelineEvents.filter(
        (e) => e.daysUntilExpiry >= timelineStartDays && e.daysUntilExpiry <= timelineEndDays
      ),
    [timelineEvents, timelineStartDays, timelineEndDays]
  );

  const lanes = useMemo(() => getLaneConfigsForRange(timelineEndDays), [timelineEndDays]);

  const groupedEvents = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const event of visibleEvents) {
      const list = map.get(event.status) ?? [];
      list.push(event);
      map.set(event.status, list);
    }
    return map;
  }, [visibleEvents]);

  const handleRowClick = (event: TimelineEvent) => {
    const params = new URLSearchParams();
    params.set('tab', 'personnel');
    params.set('personnelId', event.personnelId);
    if (personnelFilter !== 'all') {
      params.set('category', personnelFilter);
    }
    navigate(`/admin?${params.toString()}`);
  };

  const getDaysBadgeStyle = (days: number): string => {
    if (days < 0) return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
    if (days <= 30) return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30';
    if (days <= 60) return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-500 border-yellow-500/30';
    if (days <= 90) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    if (days <= 180) return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    if (days <= 365) return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const formatDays = (days: number): string => {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today';
    return `${days}d`;
  };

  return (
    <Collapsible open={listOpen} onOpenChange={setListOpen} className="mt-4">
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-md border border-border/50 hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
        <List className="h-4 w-4" />
        <span className="font-medium">Expiry Details</span>
        <Badge variant="secondary" className="ml-1 text-xs">
          {visibleEvents.length}
        </Badge>
        <ChevronDown
          className={cn('h-4 w-4 ml-auto transition-transform', listOpen && 'rotate-180')}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-3">
        {lanes.map((lane: LaneConfig) => {
          const events = groupedEvents.get(lane.id);
          if (!events || events.length === 0) return null;

          return (
            <div key={lane.id} className={cn('rounded-md border', lane.borderColor, lane.bgColor)}>
              <div className="px-3 py-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: lane.color }}
                />
                <span className="text-sm font-medium text-foreground">{lane.label}</span>
                <span className="text-xs text-muted-foreground">({events.length})</span>
              </div>

              <div className="divide-y divide-border/40">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleRowClick(event)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-background/50 transition-colors text-sm"
                  >
                    <span className="font-medium text-foreground truncate min-w-0 flex-1">
                      {event.personnelName}
                    </span>
                    <span className="text-muted-foreground truncate min-w-0 flex-1">
                      {event.certificateName}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(event.expiryDate, 'dd.MM.yyyy')}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium px-1.5 py-0.5 rounded border whitespace-nowrap',
                        getDaysBadgeStyle(event.daysUntilExpiry)
                      )}
                    >
                      {formatDays(event.daysUntilExpiry)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {visibleEvents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No expiring certificates in the current range.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
