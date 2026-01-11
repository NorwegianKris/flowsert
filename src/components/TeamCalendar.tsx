import { useState, useEffect, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, addMonths, parseISO, isWithinInterval } from 'date-fns';
import { CalendarDays, Award, Check, X, Clock, Loader2, FolderOpen, Bookmark, Plus, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Personnel } from '@/types';
import { Project } from '@/hooks/useProjects';
import { getCertificateStatus } from '@/lib/certificateUtils';
import { generateICSContent, downloadICSFile } from '@/lib/calendarExport';
import { AddMasterCalendarItemDialog } from '@/components/AddMasterCalendarItemDialog';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'certificate_expiry' | 'availability' | 'project_duration' | 'project_item';
  title: string;
  personnelName?: string;
  projectName?: string;
  status?: string;
  notes?: string;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
}

interface TeamCalendarProps {
  personnel: Personnel[];
  projects?: Project[];
  onAddCalendarItem?: (projectId: string, date: string, description: string) => Promise<void>;
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

export function TeamCalendar({ personnel, projects = [], onAddCalendarItem }: TeamCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);

  // Toggle states
  const [showCertificates, setShowCertificates] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

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
    if (showCertificates) {
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
    }

    // Add project events
    if (showProjects) {
      projects.forEach(project => {
        const startDate = parseISO(project.startDate);
        const endDate = project.endDate ? parseISO(project.endDate) : startDate;

        // Add project duration start marker
        allEvents.push({
          id: `proj-start-${project.id}`,
          date: startDate,
          type: 'project_duration',
          title: project.name,
          projectName: project.name,
          status: project.status,
          isRangeStart: true,
        });

        // Add project duration end marker (if different from start)
        if (project.endDate && !isSameDay(startDate, endDate)) {
          allEvents.push({
            id: `proj-end-${project.id}`,
            date: endDate,
            type: 'project_duration',
            title: project.name,
            projectName: project.name,
            status: project.status,
            isRangeEnd: true,
          });
        }

        // Add calendar items
        project.calendarItems?.forEach(item => {
          allEvents.push({
            id: `proj-item-${item.id}`,
            date: parseISO(item.date),
            type: 'project_item',
            title: item.description,
            projectName: project.name,
          });
        });
      });
    }

    return allEvents;
  }, [personnel, projects, showCertificates, showProjects]);

  // Get project ranges for background highlighting
  const projectRanges = useMemo(() => {
    if (!showProjects) return [];
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      start: parseISO(project.startDate),
      end: project.endDate ? parseISO(project.endDate) : parseISO(project.startDate),
    }));
  }, [projects, showProjects]);

  const isDateInProjectRange = (date: Date): boolean => {
    return projectRanges.some(range => 
      isWithinInterval(date, { start: range.start, end: range.end })
    );
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(e => isSameDay(e.date, date));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateEvents = getEventsForDate(date);
    const inProjectRange = isDateInProjectRange(date);
    if (dateEvents.length > 0 || inProjectRange) {
      setSelectedDate(date);
      setPopoverOpen(true);
    }
  };

  const handleAddCalendarItem = async (projectId: string, date: string, description: string) => {
    if (onAddCalendarItem) {
      await onAddCalendarItem(projectId, date, description);
    }
  };

  const handleExportToOutlook = () => {
    const icsContent = generateICSContent(projects, personnel, showCertificates, showProjects);
    downloadICSFile(icsContent);
    toast.success('Calendar exported! Import the .ics file into Outlook.');
  };

  // Create modifiers for dates with events
  const certificateExpiryDates = events
    .filter(e => e.type === 'certificate_expiry')
    .map(e => e.date);

  const projectDates = events
    .filter(e => e.type === 'project_duration' || e.type === 'project_item')
    .map(e => e.date);

  const hasEventDates = [...new Set([...certificateExpiryDates, ...projectDates].map(d => d.toDateString()))]
    .map(ds => new Date(ds));

  // Get dates that are within any project range
  const projectRangeDates = useMemo(() => {
    const dates: Date[] = [];
    projectRanges.forEach(range => {
      let current = new Date(range.start);
      while (current <= range.end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  }, [projectRanges]);

  // Get all certificate expiries sorted by date (soonest first)
  const upcomingCertificateExpiries = useMemo(() => {
    const allCertExpiries: Array<{
      id: string;
      name: string;
      expiryDate: Date;
      personnelName: string;
      personnelId: string;
      status: string;
    }> = [];

    personnel.forEach(p => {
      p.certificates.forEach(cert => {
        if (cert.expiryDate) {
          allCertExpiries.push({
            id: cert.id,
            name: cert.name,
            expiryDate: new Date(cert.expiryDate),
            personnelName: p.name,
            personnelId: p.id,
            status: getCertificateStatus(cert.expiryDate),
          });
        }
      });
    });

    return allCertExpiries.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  }, [personnel]);

  // Separate certificate expiry dates by status for different styling
  const expiredCertDates = useMemo(() => {
    return upcomingCertificateExpiries
      .filter(c => c.status === 'expired')
      .map(c => c.expiryDate);
  }, [upcomingCertificateExpiries]);

  const expiringCertDates = useMemo(() => {
    return upcomingCertificateExpiries
      .filter(c => c.status === 'expiring')
      .map(c => c.expiryDate);
  }, [upcomingCertificateExpiries]);

  const validCertDates = useMemo(() => {
    return upcomingCertificateExpiries
      .filter(c => c.status === 'valid')
      .map(c => c.expiryDate);
  }, [upcomingCertificateExpiries]);

  const modifiers = {
    hasEvent: hasEventDates,
    inProjectRange: projectRangeDates,
    certExpired: expiredCertDates,
    certExpiring: expiringCertDates,
    certValid: validCertDates,
  };

  const modifiersStyles = {
    hasEvent: {
      fontWeight: 700,
    },
    inProjectRange: {
      backgroundColor: 'hsl(var(--primary) / 0.15)',
    },
    certExpired: {
      border: '2px solid hsl(var(--destructive))',
      borderRadius: '50%',
    },
    certExpiring: {
      border: '2px solid hsl(38 92% 50%)',
      borderRadius: '50%',
    },
    certValid: {
      border: '2px solid hsl(142 76% 36%)',
      borderRadius: '50%',
    },
  };

  // Get upcoming events (next 30 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = addMonths(now, 1);
    return events
      .filter(e => e.date >= now && e.date <= thirtyDaysFromNow)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }, [events]);

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedDateProjects = selectedDate 
    ? projectRanges.filter(range => isWithinInterval(selectedDate, { start: range.start, end: range.end }))
    : [];

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'certificate_expiry':
        return Award;
      case 'project_duration':
        return FolderOpen;
      case 'project_item':
        return Bookmark;
      default:
        return CalendarDays;
    }
  };

  const getEventBadgeVariant = (event: CalendarEvent) => {
    if (event.type === 'certificate_expiry') {
      return event.status === 'expired' ? 'destructive' : event.status === 'expiring' ? 'secondary' : 'default';
    }
    if (event.type === 'project_duration') {
      return event.status === 'active' ? 'default' : event.status === 'completed' ? 'secondary' : 'outline';
    }
    return 'outline';
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Master Calendar
            </CardTitle>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {onAddCalendarItem && projects.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAddItemDialogOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportToOutlook}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                Sync with Outlook
              </Button>
            </div>
          </div>
          
          {/* Toggle Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-certificates"
                checked={showCertificates}
                onCheckedChange={setShowCertificates}
              />
              <Label htmlFor="show-certificates" className="text-sm cursor-pointer flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-primary" />
                Certificate Expiries
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-projects"
                checked={showProjects}
                onCheckedChange={setShowProjects}
              />
              <Label htmlFor="show-projects" className="text-sm cursor-pointer flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-primary" />
                Projects
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-lg bg-muted/30">
              {showCertificates && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Certificate Expiry</span>
                </div>
              )}
              {showProjects && (
                <>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="h-3 w-8 rounded bg-primary/15" />
                    <span className="text-muted-foreground">Project Duration</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Bookmark className="h-3.5 w-3.5 text-primary" />
                    <span className="text-muted-foreground">Calendar Item</span>
                  </div>
                </>
              )}
            </div>

            {/* Main layout: Calendar on left, events on right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calendar */}
              <div>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <div className="w-full">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        modifiers={modifiers}
                        modifiersStyles={modifiersStyles}
                        className="rounded-md border border-border pointer-events-auto w-full"
                        classNames={{
                          months: "flex flex-col w-full",
                          month: "space-y-4 w-full",
                          table: "w-full border-collapse",
                          head_row: "flex w-full",
                          head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-sm",
                          row: "flex w-full mt-2",
                          cell: "flex-1 aspect-square text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                          day: "h-full w-full p-0 font-normal text-sm aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-sm font-semibold",
                          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                        }}
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-3">
                      <h4 className="font-medium">
                        {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                      </h4>
                      
                      {/* Projects in range */}
                      {selectedDateProjects.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Projects</p>
                          {selectedDateProjects.map(project => (
                            <div key={project.id} className="p-2 rounded-md bg-primary/10 text-sm">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium">{project.name}</span>
                              </div>
                              <p className="text-muted-foreground text-xs mt-1">
                                {format(project.start, 'MMM d')} - {format(project.end, 'MMM d, yyyy')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Events on this date */}
                      {selectedDateEvents.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Events</p>
                          {selectedDateEvents.map(event => {
                            const Icon = getEventIcon(event.type);
                            return (
                              <div key={event.id} className="p-2 rounded-md bg-muted/50 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {event.personnelName || event.projectName}
                                  </span>
                                  <Badge variant={getEventBadgeVariant(event) as any} className="text-xs">
                                    <Icon className="h-3 w-3 mr-1" />
                                    {event.type === 'certificate_expiry' ? 'Expiry' : 
                                     event.type === 'project_duration' ? (event.isRangeStart ? 'Start' : 'End') : 
                                     'Item'}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground text-xs mt-1">
                                  {event.title}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {selectedDateEvents.length === 0 && selectedDateProjects.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No events on this date</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Right side: Upcoming Events + Certificate Expiries */}
              <div className="space-y-4">
                {/* Upcoming Events */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Upcoming Events</h4>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-2 px-1 text-xs font-medium text-muted-foreground">Date</th>
                          <th className="text-left py-2 px-1 text-xs font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-2 px-1 text-xs font-medium text-muted-foreground">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingEvents.map(event => {
                          const Icon = getEventIcon(event.type);
                          const getEventTypeLabel = (e: CalendarEvent) => {
                            if (e.type === 'certificate_expiry') return 'Certificate Expiry';
                            if (e.type === 'project_duration') {
                              if (e.isRangeStart) return 'Project Start';
                              if (e.isRangeEnd) return 'Project End';
                              return 'Project';
                            }
                            // Check if it's a milestone by looking at the title/id
                            if (e.id.includes('milestone')) return 'Milestone';
                            return 'Calendar Item';
                          };
                          return (
                            <tr key={event.id} className="border-b border-border/30 hover:bg-muted/50 transition-colors">
                              <td className="py-2 px-1">
                                <span className="text-muted-foreground whitespace-nowrap">
                                  {format(event.date, 'MMM d')}
                                </span>
                              </td>
                              <td className="py-2 px-1">
                                <Badge variant={getEventBadgeVariant(event) as any} className="text-xs whitespace-nowrap">
                                  <Icon className="h-3 w-3 mr-1" />
                                  {getEventTypeLabel(event)}
                                </Badge>
                              </td>
                              <td className="py-2 px-1">
                                <div className="flex flex-col">
                                  <span className="font-medium truncate max-w-[120px]">
                                    {event.title.length > 18 ? event.title.slice(0, 18) + '...' : event.title}
                                  </span>
                                  <span className="text-xs text-muted-foreground/70 truncate max-w-[120px]">
                                    {event.personnelName || event.projectName}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {upcomingEvents.length === 0 && (
                      <p className="text-sm text-muted-foreground italic py-4 text-center">
                        No upcoming events in the next 30 days
                      </p>
                    )}
                  </div>
                </div>

                {/* Next Certificate Expiries */}
                <div className="pt-4 border-t border-border/50">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Next Certificate Expiries
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {upcomingCertificateExpiries.map((cert, index) => (
                      <div 
                        key={cert.id} 
                        className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-muted-foreground w-5">
                            #{index + 1}
                          </span>
                          <div className="flex flex-col">
                            <span className="font-medium">{cert.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {cert.personnelName}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            cert.status === 'expired' ? 'destructive' : 
                            cert.status === 'expiring' ? 'secondary' : 
                            'outline'
                          }
                          className="text-xs"
                        >
                          {format(cert.expiryDate, 'MMM d, yyyy')}
                        </Badge>
                      </div>
                    ))}
                    {upcomingCertificateExpiries.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No certificates with expiry dates
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Add Calendar Item Dialog */}
      <AddMasterCalendarItemDialog
        open={addItemDialogOpen}
        onOpenChange={setAddItemDialogOpen}
        projects={projects}
        onAdd={handleAddCalendarItem}
      />
    </Card>
  );
}
