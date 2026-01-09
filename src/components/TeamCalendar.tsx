import { useState, useEffect, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { CalendarDays, Award, Check, X, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Personnel } from '@/types';
import { getCertificateStatus } from '@/lib/certificateUtils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'certificate_expiry' | 'availability';
  title: string;
  personnelName: string;
  status?: string;
  notes?: string;
}

interface TeamCalendarProps {
  personnel: Personnel[];
}

type AvailabilityStatus = 'available' | 'unavailable' | 'partial';

interface AvailabilityEntry {
  id: string;
  date: string;
  status: AvailabilityStatus;
  notes: string | null;
  personnel_id: string;
}

const availabilityConfig: Record<AvailabilityStatus, { label: string; icon: typeof Check; className: string }> = {
  available: {
    label: 'Available',
    icon: Check,
    className: 'bg-[hsl(var(--status-valid))] text-[hsl(var(--status-valid-foreground))]',
  },
  partial: {
    label: 'Partial',
    icon: Clock,
    className: 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]',
  },
  unavailable: {
    label: 'Unavailable',
    icon: X,
    className: 'bg-[hsl(var(--status-expired))] text-[hsl(var(--status-expired-foreground))]',
  },
};

export function TeamCalendar({ personnel }: TeamCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const personnelMap = useMemo(() => {
    return new Map(personnel.map(p => [p.id, p.name]));
  }, [personnel]);

  useEffect(() => {
    fetchAvailability();
  }, [personnel]);

  const fetchAvailability = async () => {
    if (personnel.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const personnelIds = personnel.map(p => p.id);
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .in('personnel_id', personnelIds);

      if (error) throw error;
      setAvailability(
        (data || []).map((item) => ({
          id: item.id,
          date: item.date,
          status: item.status as AvailabilityStatus,
          notes: item.notes,
          personnel_id: item.personnel_id,
        }))
      );
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const events = useMemo((): CalendarEvent[] => {
    const allEvents: CalendarEvent[] = [];

    // Add certificate expiries
    personnel.forEach(p => {
      p.certificates.forEach(cert => {
        if (cert.expiryDate) {
          const expiryDate = new Date(cert.expiryDate);
          const status = getCertificateStatus(cert.expiryDate);
          allEvents.push({
            id: `cert-${cert.id}`,
            date: expiryDate,
            type: 'certificate_expiry',
            title: cert.name,
            personnelName: p.name,
            status,
          });
        }
      });
    });

    // Add availability entries
    availability.forEach(avail => {
      const personnelName = personnelMap.get(avail.personnel_id) || 'Unknown';
      allEvents.push({
        id: `avail-${avail.id}`,
        date: new Date(avail.date),
        type: 'availability',
        title: availabilityConfig[avail.status]?.label || avail.status,
        personnelName,
        status: avail.status,
        notes: avail.notes || undefined,
      });
    });

    return allEvents;
  }, [personnel, availability, personnelMap]);

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(e => isSameDay(e.date, date));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateEvents = getEventsForDate(date);
    if (dateEvents.length > 0) {
      setSelectedDate(date);
      setPopoverOpen(true);
    }
  };

  // Create modifiers for dates with events
  const certificateExpiryDates = events
    .filter(e => e.type === 'certificate_expiry')
    .map(e => e.date);

  const availabilityDates = events
    .filter(e => e.type === 'availability')
    .map(e => e.date);

  const hasEventDates = [...new Set([...certificateExpiryDates, ...availabilityDates].map(d => d.toDateString()))]
    .map(ds => new Date(ds));

  const modifiers = {
    hasEvent: hasEventDates,
  };

  const modifiersStyles = {
    hasEvent: {
      backgroundColor: 'hsl(var(--primary) / 0.15)',
      borderRadius: '50%',
      fontWeight: 600,
    },
  };

  // Get upcoming events (next 30 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = addMonths(now, 1);
    return events
      .filter(e => e.date >= now && e.date <= thirtyDaysFromNow)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8);
  }, [events]);

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Team Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-sm">
                <Award className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Certificate Expiry</span>
              </div>
              {Object.entries(availabilityConfig).map(([status, config]) => (
                <div key={status} className="flex items-center gap-1.5 text-sm">
                  <span className={cn('h-3 w-3 rounded-full', config.className)} />
                  <span className="text-muted-foreground">{config.label}</span>
                </div>
              ))}
            </div>

            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    modifiers={modifiers}
                    modifiersStyles={modifiersStyles}
                    className="rounded-md border border-border pointer-events-auto"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-3">
                  <h4 className="font-medium">
                    {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedDateEvents.map(event => (
                      <div key={event.id} className="p-2 rounded-md bg-muted/50 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{event.personnelName}</span>
                          {event.type === 'certificate_expiry' ? (
                            <Badge variant={event.status === 'expired' ? 'destructive' : event.status === 'expiring' ? 'secondary' : 'default'}>
                              <Award className="h-3 w-3 mr-1" />
                              Expiry
                            </Badge>
                          ) : (
                            <Badge className={cn('text-xs', availabilityConfig[event.status as AvailabilityStatus]?.className)}>
                              {event.title}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">
                          {event.type === 'certificate_expiry' ? event.title : event.notes || 'No notes'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="pt-4 border-t border-border/50">
              <h4 className="text-sm font-medium mb-2">Upcoming Events</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">
                        {format(event.date, 'EEE, MMM d')}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        {event.personnelName}
                      </span>
                    </div>
                    {event.type === 'certificate_expiry' ? (
                      <Badge variant={event.status === 'expired' ? 'destructive' : event.status === 'expiring' ? 'secondary' : 'default'} className="text-xs">
                        <Award className="h-3 w-3 mr-1" />
                        {event.title}
                      </Badge>
                    ) : (
                      <Badge className={cn('text-xs', availabilityConfig[event.status as AvailabilityStatus]?.className)}>
                        {event.title}
                      </Badge>
                    )}
                  </div>
                ))}
                {upcomingEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No upcoming events in the next 30 days
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
