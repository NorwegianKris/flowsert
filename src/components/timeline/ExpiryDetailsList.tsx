import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ChevronDown, List, Building2, Calendar, MapPin, Tag, FileText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { TimelineEvent, LaneConfig, getLaneConfigsForRange } from './types';
import { CertificateViewerDialog } from './CertificateViewerDialog';
import { getCertificateStatus, formatExpiryText } from '@/lib/certificateUtils';
import { cn } from '@/lib/utils';

interface ExpiryDetailsListProps {
  timelineEvents: TimelineEvent[];
  timelineStartDays: number;
  timelineEndDays: number;
  personnelFilter: 'all' | 'employees' | 'freelancers' | 'custom';
  highlightedLaneId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onHighlightClear?: () => void;
}

export function ExpiryDetailsList({
  timelineEvents,
  timelineStartDays,
  timelineEndDays,
  personnelFilter,
  highlightedLaneId = null,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onHighlightClear,
}: ExpiryDetailsListProps) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const highlightedRef = useRef<HTMLDivElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const isControlled = controlledOpen !== undefined;
  const listOpen = isControlled ? controlledOpen : internalOpen;
  const setListOpen = useCallback((val: boolean) => {
    if (isControlled && controlledOnOpenChange) {
      controlledOnOpenChange(val);
    } else {
      setInternalOpen(val);
    }
  }, [isControlled, controlledOnOpenChange]);

  // Auto-scroll to highlighted lane and clear after 3s
  useEffect(() => {
    if (!highlightedLaneId) return;
    const timer = setTimeout(() => {
      onHighlightClear?.();
    }, 3000);
    const scrollTimer = setTimeout(() => {
      highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    return () => {
      clearTimeout(timer);
      clearTimeout(scrollTimer);
    };
  }, [highlightedLaneId, onHighlightClear]);

  const visibleEvents = useMemo(
    () =>
      timelineEvents.filter(
        (e) => (e.daysUntilExpiry < 0 || e.daysUntilExpiry >= timelineStartDays) && e.daysUntilExpiry <= timelineEndDays
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
    if (event.documentUrl) {
      setSelectedEvent(event);
    } else {
      const params = new URLSearchParams();
      params.set('tab', 'personnel');
      params.set('personnelId', event.personnelId);
      if (personnelFilter !== 'all') {
        params.set('category', personnelFilter);
      }
      navigate(`/admin?${params.toString()}`);
    }
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
    <>
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
              <div
                key={lane.id}
                ref={highlightedLaneId === lane.id ? highlightedRef : undefined}
                className={cn(
                  'rounded-md border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20',
                  lane.borderColor,
                  lane.bgColor,
                  highlightedLaneId === lane.id && 'ring-2 ring-primary shadow-md'
                )}
              >
                <div className="px-3 py-2 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: lane.color }}
                  />
                  <span className="text-sm font-medium text-foreground">{lane.label}</span>
                  <span className="text-xs text-muted-foreground">({events.length})</span>
                </div>

                <div className="divide-y divide-border/40">
                  {events.map((event) => {
                    const expiryStr = format(event.expiryDate, 'yyyy-MM-dd');
                    const certStatus = getCertificateStatus(expiryStr);

                    return (
                      <button
                        key={event.id}
                        onClick={() => handleRowClick(event)}
                        className="w-full flex flex-col gap-1 px-3 py-2.5 text-left hover:bg-background/50 transition-all duration-200 hover:ring-1 hover:ring-[#C4B5FD]/50"
                      >
                        {/* Primary row */}
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-medium text-foreground truncate w-[30%] flex-shrink-0">
                            {event.personnelName}
                          </span>
                          <span className="text-foreground truncate w-[25%] flex-shrink-0">
                            {event.certificateName}
                          </span>
                          <StatusBadge status={certStatus} showLabel size="sm" />
                          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                            {formatExpiryText(event.daysUntilExpiry)}
                          </span>
                          <span
                            className={cn(
                              'text-xs font-medium px-1.5 py-0.5 rounded border whitespace-nowrap',
                              getDaysBadgeStyle(event.daysUntilExpiry)
                            )}
                          >
                            {formatDays(event.daysUntilExpiry)}
                          </span>
                          {event.documentUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                              }}
                              title="View document"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        {/* Secondary row */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pl-0">
                          {event.issuingAuthority && (
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              {event.issuingAuthority}
                            </span>
                          )}
                          {event.categoryName && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3 flex-shrink-0" />
                              {event.categoryName}
                            </span>
                          )}
                          {event.dateOfIssue && (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              Issued {format(parseISO(event.dateOfIssue), 'dd MMM yyyy')}
                            </span>
                          )}
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            Expires {format(event.expiryDate, 'dd MMM yyyy')}
                          </span>
                          {event.placeOfIssue && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {event.placeOfIssue}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
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

      <CertificateViewerDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  );
}
