import { useState, useEffect, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, eachDayOfInterval, isWithinInterval, parseISO, addDays, differenceInDays } from 'date-fns';
import { CalendarDays, Check, X, Clock, Loader2, Award, Briefcase, Circle, AlertTriangle, MapPin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Certificate } from '@/types';
import { useAssignedProjects, AssignedProjectWithRotation } from '@/components/AssignedProjects';
import type { DateRange } from 'react-day-picker';
import { useNavigate } from 'react-router-dom';

type AvailabilityStatus = 'available' | 'unavailable' | 'partial' | 'other';

interface AvailabilityEntry {
  id: string;
  date: string;
  status: AvailabilityStatus;
  notes: string | null;
}

interface ProjectOnPeriod {
  date: Date;
  project: AssignedProjectWithRotation;
  periodStart: Date;
  periodEnd: Date;
}

interface ProjectEvent {
  date: Date;
  projectName: string;
  description: string;
  type: 'event' | 'duration';
}

interface AvailabilityCalendarProps {
  personnelId: string;
  personnelName: string;
  certificates?: Certificate[];
}

const statusConfig: Record<AvailabilityStatus, { label: string; icon: typeof Check; className: string }> = {
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
  other: {
    label: 'Other',
    icon: Circle,
    className: 'bg-[hsl(var(--status-other))] text-[hsl(var(--status-other-foreground))]',
  },
};

/**
 * Compute on-period dates for a project, accounting for rotation schedules.
 * For non-rotation projects: all dates between startDate and endDate.
 * For rotation projects: compute on-period windows using rotationOnDays/OffDays.
 */
function getProjectOnPeriodDates(project: AssignedProjectWithRotation): ProjectOnPeriod[] {
  const startDate = parseISO(project.startDate);
  const endDate = project.endDate ? parseISO(project.endDate) : null;
  const results: ProjectOnPeriod[] = [];

  // Only show blocks for active/pending projects
  if (project.status === 'completed') return results;

  const onDays = project.rotationOnDays;
  const offDays = project.rotationOffDays;

  if (onDays && offDays && onDays > 0 && offDays > 0) {
    // Rotation-based project: compute on-period windows
    const cycleLength = onDays + offDays;
    const maxRotations = project.rotationCount || 52; // default cap
    let currentStart = startDate;

    for (let i = 0; i < maxRotations; i++) {
      const periodStart = currentStart;
      const periodEnd = addDays(periodStart, onDays - 1);

      // Clamp to project end date
      const clampedEnd = endDate && periodEnd > endDate ? endDate : periodEnd;

      if (endDate && periodStart > endDate) break;

      const days = eachDayOfInterval({ start: periodStart, end: clampedEnd });
      for (const day of days) {
        results.push({ date: day, project, periodStart, periodEnd: clampedEnd });
      }

      currentStart = addDays(periodStart, cycleLength);
    }
  } else {
    // Non-rotation project: all dates in range
    const finalEnd = endDate || addDays(startDate, 30); // show 30 days if no end date
    const days = eachDayOfInterval({ start: startDate, end: finalEnd });
    for (const day of days) {
      results.push({ date: day, project, periodStart: startDate, periodEnd: finalEnd });
    }
  }

  return results;
}

export function AvailabilityCalendar({ personnelId, personnelName, certificates = [] }: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>('available');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Fetch assigned projects for this personnel
  const { projects: assignedProjects } = useAssignedProjects(personnelId);

  // Compute all project on-period dates
  const allProjectOnPeriods = useMemo(() => {
    return assignedProjects.flatMap(getProjectOnPeriodDates);
  }, [assignedProjects]);

  const projectBlockDates = useMemo(() => {
    return allProjectOnPeriods.map((p) => p.date);
  }, [allProjectOnPeriods]);

  // Get certificate expiry dates
  const certificateExpiryDates = certificates
    .filter((cert) => cert.expiryDate)
    .map((cert) => ({
      date: new Date(cert.expiryDate!),
      name: cert.name,
    }));

  const getCertificatesExpiringOnDate = (date: Date): string[] => {
    return certificateExpiryDates
      .filter((cert) => isSameDay(cert.date, date))
      .map((cert) => cert.name);
  };

  // Get certificates expiring within 30 days of a project on-period start
  const getCertExpiryWarningsForDate = (date: Date): { certName: string; daysUntil: number; projectName: string }[] => {
    const warnings: { certName: string; daysUntil: number; projectName: string }[] = [];
    
    // Find unique project period starts on this date
    const periodStarts = allProjectOnPeriods.filter(
      (p) => isSameDay(p.periodStart, date)
    );
    
    // De-duplicate by project id
    const seenProjects = new Set<string>();
    for (const ps of periodStarts) {
      if (seenProjects.has(ps.project.id)) continue;
      seenProjects.add(ps.project.id);
      
      for (const cert of certificateExpiryDates) {
        const daysUntil = differenceInDays(cert.date, date);
        if (daysUntil >= 0 && daysUntil <= 30) {
          warnings.push({
            certName: cert.name,
            daysUntil,
            projectName: ps.project.name,
          });
        }
      }
    }
    
    return warnings;
  };

  // Compute cert expiry warning dates (project start dates where certs expire within 30 days)
  const certExpiryWarningDates = useMemo(() => {
    const warningDates: Date[] = [];
    const checked = new Set<string>();
    
    for (const p of allProjectOnPeriods) {
      const key = `${p.project.id}-${p.periodStart.toISOString()}`;
      if (checked.has(key)) continue;
      checked.add(key);
      
      for (const cert of certificateExpiryDates) {
        const daysUntil = differenceInDays(cert.date, p.periodStart);
        if (daysUntil >= 0 && daysUntil <= 30) {
          warningDates.push(p.periodStart);
          break;
        }
      }
    }
    
    return warningDates;
  }, [allProjectOnPeriods, certificateExpiryDates]);

  // Get projects active on a specific date
  const getProjectsOnDate = (date: Date): { project: AssignedProjectWithRotation; periodStart: Date; periodEnd: Date }[] => {
    const seen = new Set<string>();
    const results: { project: AssignedProjectWithRotation; periodStart: Date; periodEnd: Date }[] = [];
    
    for (const p of allProjectOnPeriods) {
      if (isSameDay(p.date, date) && !seen.has(p.project.id)) {
        seen.add(p.project.id);
        results.push({ project: p.project, periodStart: p.periodStart, periodEnd: p.periodEnd });
      }
    }
    
    return results;
  };

  // Get project events for a specific date (calendar items/milestones)
  const getProjectEventsOnDate = (date: Date): ProjectEvent[] => {
    const events: ProjectEvent[] = [];
    
    for (const project of assignedProjects) {
      for (const item of project.calendarItems || []) {
        if (isSameDay(parseISO(item.date), date)) {
          events.push({
            date,
            projectName: project.name,
            description: item.description,
            type: 'event',
          });
        }
      }
    }
    
    return events;
  };

  // Get all project event dates for calendar modifiers (calendar items only)
  const getProjectEventDates = () => {
    const projectDates: Date[] = [];
    
    for (const project of assignedProjects) {
      for (const item of project.calendarItems || []) {
        projectDates.push(parseISO(item.date));
      }
    }
    
    return projectDates;
  };

  useEffect(() => {
    fetchAvailability();
  }, [personnelId]);

  const fetchAvailability = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('personnel_id', personnelId);

      if (error) throw error;
      setAvailability(
        (data || []).map((item) => ({
          id: item.id,
          date: item.date,
          status: item.status as AvailabilityStatus,
          notes: item.notes,
        }))
      );
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load availability data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    
    if (range?.from) {
      if (!range.to || isSameDay(range.from, range.to)) {
        const existing = availability.find((a) =>
          isSameDay(new Date(a.date), range.from!)
        );
        if (existing) {
          setSelectedStatus(existing.status as AvailabilityStatus);
          setNotes(existing.notes || '');
        } else {
          setSelectedStatus('available');
          setNotes('');
        }
      } else {
        setSelectedStatus('available');
        setNotes('');
      }
    }
  };

  const getDatesInRange = (): Date[] => {
    if (!selectedRange?.from) return [];
    if (!selectedRange.to) return [selectedRange.from];
    return eachDayOfInterval({ start: selectedRange.from, end: selectedRange.to });
  };

  const handleSave = async () => {
    if (!selectedRange?.from) return;
    
    const datesToSave = getDatesInRange();
    if (datesToSave.length === 0) return;
    
    setIsSaving(true);
    try {
      for (const date of datesToSave) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const existing = availability.find((a) =>
          isSameDay(new Date(a.date), date)
        );

        if (existing) {
          const { error } = await supabase
            .from('availability')
            .update({ status: selectedStatus, notes: notes || null })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('availability')
            .insert({
              personnel_id: personnelId,
              date: dateStr,
              status: selectedStatus,
              notes: notes || null,
            });

          if (error) throw error;
        }
      }

      const description = datesToSave.length === 1
        ? `Availability for ${format(datesToSave[0], 'PPP')} updated`
        : `Availability for ${format(datesToSave[0], 'MMM d')} - ${format(datesToSave[datesToSave.length - 1], 'MMM d, yyyy')} updated`;

      toast({
        title: 'Saved',
        description,
      });
      
      fetchAvailability();
      setSelectedRange(undefined);
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save availability',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedRange?.from) return;
    
    const datesToRemove = getDatesInRange();
    const existingEntries = datesToRemove
      .map((date) => availability.find((a) => isSameDay(new Date(a.date), date)))
      .filter(Boolean);
    
    if (existingEntries.length === 0) return;

    setIsSaving(true);
    try {
      for (const entry of existingEntries) {
        if (entry) {
          const { error } = await supabase
            .from('availability')
            .delete()
            .eq('id', entry.id);

          if (error) throw error;
        }
      }

      const description = datesToRemove.length === 1
        ? `Availability for ${format(datesToRemove[0], 'PPP')} removed`
        : `Availability for ${datesToRemove.length} days removed`;

      toast({
        title: 'Removed',
        description,
      });
      
      fetchAvailability();
      setSelectedRange(undefined);
    } catch (error) {
      console.error('Error removing availability:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove availability',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasExistingEntriesInRange = (): boolean => {
    const dates = getDatesInRange();
    return dates.some((date) => availability.find((a) => isSameDay(new Date(a.date), date)));
  };

  const modifiers = {
    available: availability
      .filter((a) => a.status === 'available')
      .map((a) => new Date(a.date)),
    unavailable: availability
      .filter((a) => a.status === 'unavailable')
      .map((a) => new Date(a.date)),
    partial: availability
      .filter((a) => a.status === 'partial')
      .map((a) => new Date(a.date)),
    other: availability
      .filter((a) => a.status === 'other')
      .map((a) => new Date(a.date)),
    certificateExpiry: certificateExpiryDates.map((c) => c.date),
    projectEvent: getProjectEventDates(),
    projectBlock: projectBlockDates,
    certExpiryWarning: certExpiryWarningDates,
  };

  const modifiersStyles = {
    available: {
      backgroundColor: 'hsl(142 76% 36%)',
      color: 'white',
      borderRadius: '50%',
    },
    unavailable: {
      backgroundColor: 'hsl(0 72% 50%)',
      color: 'white',
      borderRadius: '50%',
    },
    partial: {
      backgroundColor: 'hsl(38 92% 50%)',
      color: 'white',
      borderRadius: '50%',
    },
    other: {
      backgroundColor: 'hsl(210 100% 50%)',
      color: 'white',
      borderRadius: '50%',
    },
    certificateExpiry: {
      border: '2px solid hsl(280 70% 50%)',
      borderRadius: '50%',
    },
    projectEvent: {
      border: '2px solid hsl(210 100% 50%)',
      borderRadius: '50%',
    },
    projectBlock: {
      borderBottom: '3px solid hsl(240 60% 60%)',
      borderRadius: '4px',
    },
    certExpiryWarning: {
      boxShadow: 'inset 0 -2px 0 0 hsl(38 92% 50%)',
    },
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Personal Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Compact Legend */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
              {Object.entries(statusConfig).map(([status, config]) => (
                <div key={status} className="flex items-center gap-1.5 text-sm">
                  <span className={cn('h-3 w-3 rounded-full', config.className)} />
                  <span className="text-muted-foreground">{config.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-sm">
                <span className="h-3 w-3 rounded-full border-2 border-[hsl(280_70%_50%)]" />
                <span className="text-muted-foreground">Certificate Expiry</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="h-3 w-3 rounded-sm" style={{ borderBottom: '3px solid hsl(240 60% 60%)', width: 12, height: 12 }} />
                <span className="text-muted-foreground">Assigned Project</span>
              </div>
            </div>

            {/* Tip banner */}
            <div className="flex items-center gap-2 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
              <span className="text-sm">💡</span>
              <span className="text-xs text-muted-foreground">Tip: Click the start date, then click the end date to select a period.</span>
            </div>

            {/* Calendar + Drawer layout */}
            <div className="flex flex-col md:flex-row gap-0 overflow-hidden">
              {/* Calendar — left side */}
              <div className="flex-1 min-w-0">
                <Calendar
                  mode="range"
                  selected={selectedRange}
                  onSelect={handleRangeSelect}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  className="rounded-md border border-border p-3 pointer-events-auto w-full"
                  classNames={{
                    months: "flex flex-col w-full",
                    month: "space-y-4 w-full",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex w-full",
                    head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
                    row: "flex w-full mt-2",
                    cell: "flex-1 h-9 text-sm p-0 relative focus-within:relative focus-within:z-20 flex items-center justify-center",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-full inline-flex items-center justify-center",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_hidden: "invisible",
                  }}
                  numberOfMonths={1}
                />
              </div>

              {/* Right-side Drawer */}
              <div
                className={cn(
                  "transition-all duration-150 ease-in-out shrink-0 overflow-hidden",
                  selectedRange?.from ? "w-full md:w-[320px] opacity-100" : "w-0 opacity-0"
                )}
              >
                {selectedRange?.from && (
                  <div className="w-full md:w-[320px] border-t md:border-t-0 md:border-l border-border p-4 space-y-5 h-full">
                    {/* Close button */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">
                        {selectedRange.to && !isSameDay(selectedRange.from, selectedRange.to) ? (
                          `${format(selectedRange.from, 'MMM d')} – ${format(selectedRange.to, 'MMM d, yyyy')}`
                        ) : (
                          format(selectedRange.from, 'EEEE, MMMM d')
                        )}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setSelectedRange(undefined)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Section 1: Assigned Projects */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned Projects</h4>
                      {(!selectedRange.to || isSameDay(selectedRange.from, selectedRange.to!)) && getProjectsOnDate(selectedRange.from).length > 0 ? (
                        <div className="space-y-2">
                          {getProjectsOnDate(selectedRange.from).map((item, idx) => (
                            <div key={idx} className="p-2.5 rounded-md border border-border bg-muted/30 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5 text-[hsl(240_60%_60%)]" />
                                <button
                                  onClick={() => navigate(`/admin/projects/${item.project.id}`)}
                                  className="text-sm font-medium text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline text-left"
                                >
                                  {item.project.name}
                                </button>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5 pl-5">
                                {item.project.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {item.project.location}
                                  </div>
                                )}
                                <div>
                                  On-period: {format(item.periodStart, 'MMM d')} – {format(item.periodEnd, 'MMM d, yyyy')}
                                </div>
                                {item.project.shiftNumber && (
                                  <div>Shift {item.project.shiftNumber}</div>
                                )}
                              </div>
                              {/* Inline cert expiry warning for this project */}
                              {getCertExpiryWarningsForDate(selectedRange.from!).filter(w => w.projectName === item.project.name).map((warning, wIdx) => (
                                <div key={wIdx} className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 pl-5">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{warning.certName} expires in {warning.daysUntil}d</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No projects assigned</p>
                      )}

                      {/* Project events */}
                      {(!selectedRange.to || isSameDay(selectedRange.from, selectedRange.to!)) && getProjectEventsOnDate(selectedRange.from).length > 0 && (
                        <div className="space-y-1 pt-1">
                          {getProjectEventsOnDate(selectedRange.from).map((event, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(210_100%_50%)] mt-1 shrink-0" />
                              <span><span className="font-medium">{event.projectName}:</span> {event.description}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Certificate expiries on this date */}
                      {(!selectedRange.to || isSameDay(selectedRange.from, selectedRange.to!)) && getCertificatesExpiringOnDate(selectedRange.from).length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[hsl(280_70%_50%)]">
                            <Award className="h-3 w-3" />
                            Certificates Expiring
                          </div>
                          {getCertificatesExpiringOnDate(selectedRange.from).map((certName, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground pl-4">
                              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(280_70%_50%)]" />
                              {certName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Set Availability */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Set Availability</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {(['available', 'partial', 'unavailable', 'other'] as AvailabilityStatus[]).map((status) => {
                          const config = statusConfig[status];
                          const Icon = config.icon;
                          return (
                            <Button
                              key={status}
                              variant={selectedStatus === status ? 'default' : 'outline'}
                              onClick={() => setSelectedStatus(status)}
                              className={cn(
                                'h-10',
                                selectedStatus === status && config.className
                              )}
                            >
                              <Icon className="h-4 w-4 mr-1.5" />
                              {config.label}
                            </Button>
                          );
                        })}
                      </div>
                      <Textarea
                        placeholder="Add notes (optional)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />
                      <Button onClick={handleSave} disabled={isSaving} className="w-full">
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          `Save${getDatesInRange().length > 1 ? ` (${getDatesInRange().length} days)` : ''}`
                        )}
                      </Button>
                      {hasExistingEntriesInRange() && (
                        <Button
                          variant="outline"
                          onClick={handleRemove}
                          disabled={isSaving}
                          className="w-full"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
