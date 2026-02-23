import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, addDays, subDays } from 'date-fns';
import { TimelineEvent, getLaneConfigsForRange, TimelineEventStatus, LaneConfig } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CertificateViewerDialog } from './CertificateViewerDialog';

interface TimelineChartProps {
  events: TimelineEvent[];
  personnelFilter: 'all' | 'employees' | 'freelancers' | 'custom';
  timelineEndDays?: number;
  timelineStartDays?: number;
  onLaneClick?: (laneId: string) => void;
}

interface PositionedEvent extends TimelineEvent {
  xPercent: number;
  yOffset: number;
}

export function TimelineChart({ 
  events, 
  personnelFilter,
  timelineEndDays = 90,
  timelineStartDays = -30,
  onLaneClick,
}: TimelineChartProps) {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  
  // Calculate total days dynamically based on both zoom levels
  const totalDays = timelineEndDays - timelineStartDays;
  
  // Get lane configs based on zoom level
  const laneConfigs = useMemo(() => getLaneConfigsForRange(timelineEndDays), [timelineEndDays]);
  
  // Filter events to only those within the current range (both past and future)
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (event.daysUntilExpiry < 0) {
        return event.daysUntilExpiry >= timelineStartDays;
      }
      return event.daysUntilExpiry <= timelineEndDays;
    });
  }, [events, timelineEndDays, timelineStartDays]);
  
  // Group events by lane and calculate positions
  const laneData = useMemo(() => {
    const lanes = new Map<TimelineEventStatus, PositionedEvent[]>();
    
    // Initialize lanes
    laneConfigs.forEach(config => {
      lanes.set(config.id, []);
    });
    
    // Group events by lane
    filteredEvents.forEach(event => {
      const laneEvents = lanes.get(event.status);
      if (laneEvents) {
        // Calculate X position as percentage based on dynamic start
        const startDate = subDays(today, Math.abs(timelineStartDays));
        const daysFromStart = differenceInDays(event.expiryDate, startDate);
        const xPercent = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
        
        laneEvents.push({
          ...event,
          xPercent,
          yOffset: 0,
        });
      }
    });
    
    // Apply vertical jitter within each lane for overlapping dates
    lanes.forEach((laneEvents) => {
      // Group by date
      const dateGroups = new Map<string, PositionedEvent[]>();
      laneEvents.forEach(event => {
        const dateKey = format(event.expiryDate, 'yyyy-MM-dd');
        const group = dateGroups.get(dateKey) || [];
        group.push(event);
        dateGroups.set(dateKey, group);
      });
      
      // Apply jitter
      dateGroups.forEach(group => {
        if (group.length > 1) {
          group.forEach((event, idx) => {
            // Spread events vertically within the lane
            event.yOffset = ((idx / (group.length - 1)) - 0.5) * 16; // ±8px
          });
        }
      });
    });
    
    return lanes;
  }, [filteredEvents, today, totalDays, laneConfigs, timelineStartDays]);
  
  // Generate time axis labels based on zoom level
  const timeLabels = useMemo(() => {
    const labels: { label: string; percent: number; isToday: boolean }[] = [];
    const startDate = subDays(today, Math.abs(timelineStartDays));
    
    // Add "Today" marker with date
    const todayPercent = (Math.abs(timelineStartDays) / totalDays) * 100;
    const todayDate = format(today, 'dd.MM.yy');
    labels.push({ label: `Today\n${todayDate}`, percent: todayPercent, isToday: true });
    
    // Determine interval based on total range
    let interval: number;
    if (totalDays <= 180) {
      interval = 30;
    } else if (totalDays <= 365) {
      interval = 60;
    } else if (totalDays <= 730) {
      interval = 90;
    } else {
      interval = 180;
    }
    
    // Format label helper
    const formatLabel = (days: number): string => {
      if (days === 0) return 'Today';
      const absDays = Math.abs(days);
      const sign = days < 0 ? '-' : '+';
      if (absDays < 90) return `${sign}${absDays}d`;
      if (absDays < 365) return `${sign}${Math.round(absDays / 30)}mo`;
      return `${sign}${(absDays / 365).toFixed(1)}y`;
    };
    
    // Add past markers (negative days)
    for (let days = -interval; days >= timelineStartDays; days -= interval) {
      const date = addDays(today, days);
      const daysFromStart = differenceInDays(date, startDate);
      const percent = (daysFromStart / totalDays) * 100;
      
      if (percent >= 0 && percent <= 100) {
        labels.push({ 
          label: formatLabel(days), 
          percent, 
          isToday: false 
        });
      }
    }
    
    // Add future markers (positive days)
    for (let days = interval; days <= timelineEndDays; days += interval) {
      const date = addDays(today, days);
      const daysFromStart = differenceInDays(date, startDate);
      const percent = (daysFromStart / totalDays) * 100;
      
      if (percent >= 0 && percent <= 100) {
        labels.push({ 
          label: formatLabel(days), 
          percent, 
          isToday: false 
        });
      }
    }
    
    return labels;
  }, [today, totalDays, timelineEndDays, timelineStartDays]);
  
  const handleEventClick = (event: TimelineEvent) => {
    if (event.documentUrl) {
      setSelectedEvent(event);
    } else {
      navigate(`/admin?tab=personnel&personnelId=${event.personnelId}`);
    }
  };
  
  const handleLaneClick = (laneConfig: LaneConfig) => {
    if (onLaneClick) {
      onLaneClick(laneConfig.id);
      return;
    }
    const params = new URLSearchParams();
    
    if (laneConfig.filterParams.overdue) {
      params.set('status', 'overdue');
    } else if (laneConfig.filterParams.minDays !== undefined && laneConfig.filterParams.maxDays !== undefined) {
      params.set('expiryMin', laneConfig.filterParams.minDays.toString());
      params.set('expiryMax', laneConfig.filterParams.maxDays.toString());
    }
    
    if (personnelFilter !== 'all') {
      params.set('category', personnelFilter);
    }
    
    navigate(`/admin?tab=personnel&${params.toString()}`);
  };
  
  // Filter out empty lanes
  const activeLanes = laneConfigs.filter(config => {
    const laneEvents = laneData.get(config.id);
    return laneEvents && laneEvents.length > 0;
  });
  
  if (activeLanes.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        No certificate expiry events in the selected range
      </div>
    );
  }
  
  return (
    <>
    <TooltipProvider delayDuration={100}>
      <div className="space-y-2">
        {/* Lanes */}
        <div className="space-y-1">
          {activeLanes.map((config) => {
            const laneEvents = laneData.get(config.id) || [];
            
            return (
              <div key={config.id} className="flex items-center gap-3">
                {/* Lane Label */}
                <button
                  onClick={() => handleLaneClick(config)}
                  className={`
                    w-28 shrink-0 text-left text-xs font-medium px-2 py-1.5 rounded
                    ${config.bgColor} ${config.borderColor} border
                    hover:opacity-80 transition-opacity cursor-pointer
                  `}
                  style={{ color: config.color }}
                >
                  {config.label}
                </button>
                
                {/* Lane Track */}
                <div 
                  className="flex-1 relative h-8 bg-muted/30 rounded border border-border/50"
                  style={{ minWidth: '200px' }}
                >
                  {/* Today marker line */}
                  <div 
                    className="absolute top-0 bottom-0 w-px bg-primary/50"
                    style={{ left: `${(Math.abs(timelineStartDays) / totalDays) * 100}%` }}
                  />
                  
                  {/* Event dots */}
                  {laneEvents.map((event) => (
                    <Tooltip key={event.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleEventClick(event)}
                          className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 
                                     hover:scale-150 transition-transform cursor-pointer
                                     ring-2 ring-background shadow-sm"
                          style={{
                            left: `${event.xPercent}%`,
                            top: `50%`,
                            marginTop: event.yOffset,
                            backgroundColor: event.color,
                          }}
                          aria-label={`${event.certificateName} - ${event.personnelName}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground truncate">
                            {event.personnelName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {event.certificateName}
                          </p>
                          <p className="text-xs text-foreground">
                            {format(event.expiryDate, 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs" style={{ color: event.color }}>
                            {event.daysUntilExpiry < 0 
                              ? `${Math.abs(event.daysUntilExpiry)} days overdue`
                              : event.daysUntilExpiry === 0
                              ? 'Expires today'
                              : `${event.daysUntilExpiry} days remaining`
                            }
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Time Axis */}
        <div className="flex items-center gap-3">
          <div className="w-28 shrink-0" /> {/* Spacer for lane labels */}
          <div className="flex-1 relative h-5" style={{ minWidth: '200px' }}>
            {timeLabels.map((label, idx) => (
              <div
                key={idx}
                className="absolute transform -translate-x-1/2 text-xs"
                style={{ left: `${label.percent}%` }}
              >
                <span className={label.isToday ? 'text-primary font-medium' : 'text-muted-foreground'}>
                  {label.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>

    <CertificateViewerDialog
      event={selectedEvent}
      onClose={() => setSelectedEvent(null)}
    />
    </>
  );
}
