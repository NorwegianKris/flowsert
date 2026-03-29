import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { DayContentProps } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, eachDayOfInterval, parseISO, addDays, differenceInDays, addMonths, startOfMonth, endOfMonth, isWithinInterval, startOfDay } from 'date-fns';

/** Parse a date-only string (yyyy-MM-dd) into a local-midnight Date, avoiding UTC shift from `new Date(str)`. */
function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
import { CalendarDays, Check, X, Clock, Loader2, Award, Briefcase, Circle, AlertTriangle, MapPin, ExternalLink, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

function getProjectOnPeriodDates(project: AssignedProjectWithRotation): ProjectOnPeriod[] {
  const startDate = toLocalDate(project.startDate);
  const endDate = project.endDate ? toLocalDate(project.endDate) : null;
  const results: ProjectOnPeriod[] = [];

  if (project.status === 'completed') return results;

  const onDays = project.rotationOnDays;
  const offDays = project.rotationOffDays;

  if (onDays && offDays && onDays > 0 && offDays > 0) {
    const cycleLength = onDays + offDays;
    const maxRotations = project.rotationCount && project.rotationCount > 0
      ? project.rotationCount
      : (endDate ? 999 : 1);
    let currentStart = startDate;

    for (let i = 0; i < maxRotations; i++) {
      const periodStart = currentStart;
      const periodEnd = addDays(periodStart, onDays - 1);
      const clampedEnd = endDate && periodEnd > endDate ? endDate : periodEnd;
      if (endDate && periodStart > endDate) break;

      const days = eachDayOfInterval({ start: periodStart, end: clampedEnd });
      for (const day of days) {
        results.push({ date: day, project, periodStart, periodEnd: clampedEnd });
      }

      currentStart = addDays(periodStart, cycleLength);
    }
  } else {
    if (!endDate) return results;
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    for (const day of days) {
      results.push({ date: day, project, periodStart: startDate, periodEnd: endDate });
    }
  }

  return results;
}

export function AvailabilityCalendar({ personnelId, personnelName, certificates = [] }: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [expandedSelectedRange, setExpandedSelectedRange] = useState<DateRange | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>('available');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { projects: assignedProjects } = useAssignedProjects(personnelId);

  const allProjectOnPeriods = useMemo(() => {
    return assignedProjects.flatMap(getProjectOnPeriodDates);
  }, [assignedProjects]);

  const projectBlockDates = useMemo(() => {
    return allProjectOnPeriods.map((p) => p.date);
  }, [allProjectOnPeriods]);

  const certificateExpiryDates = certificates
    .filter((cert) => cert.expiryDate)
    .map((cert) => ({
      date: toLocalDate(cert.expiryDate!),
      name: cert.name,
    }));

  const getCertificatesExpiringOnDate = (date: Date): string[] => {
    return certificateExpiryDates
      .filter((cert) => isSameDay(cert.date, date))
      .map((cert) => cert.name);
  };

  const getCertExpiryWarningsForDate = (date: Date): { certName: string; daysUntil: number; projectName: string }[] => {
    const warnings: { certName: string; daysUntil: number; projectName: string }[] = [];
    const periodStarts = allProjectOnPeriods.filter((p) => isSameDay(p.periodStart, date));
    const seenProjects = new Set<string>();
    for (const ps of periodStarts) {
      if (seenProjects.has(ps.project.id)) continue;
      seenProjects.add(ps.project.id);
      for (const cert of certificateExpiryDates) {
        const daysUntil = differenceInDays(cert.date, date);
        if (daysUntil >= 0 && daysUntil <= 30) {
          warnings.push({ certName: cert.name, daysUntil, projectName: ps.project.name });
        }
      }
    }
    return warnings;
  };

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

  const getProjectsInRange = (startDate: Date, endDate: Date): { project: AssignedProjectWithRotation; periodStart: Date; periodEnd: Date }[] => {
    const seen = new Set<string>();
    const results: { project: AssignedProjectWithRotation; periodStart: Date; periodEnd: Date }[] = [];
    for (const p of allProjectOnPeriods) {
      if (!seen.has(p.project.id) && p.periodStart <= endDate && p.periodEnd >= startDate) {
        seen.add(p.project.id);
        results.push({ project: p.project, periodStart: p.periodStart, periodEnd: p.periodEnd });
      }
    }
    return results;
  };

  const getProjectEventsOnDate = (date: Date): ProjectEvent[] => {
    const events: ProjectEvent[] = [];
    for (const project of assignedProjects) {
      for (const item of project.calendarItems || []) {
        if (isSameDay(toLocalDate(item.date), date)) {
          events.push({ date, projectName: project.name, description: item.description, type: 'event' });
        }
      }
    }
    return events;
  };

  const getProjectEventDates = () => {
    const projectDates: Date[] = [];
    for (const project of assignedProjects) {
      for (const item of project.calendarItems || []) {
        projectDates.push(toLocalDate(item.date));
      }
    }
    return projectDates;
  };

  // Upcoming events for the expanded modal — next 3 months
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const threeMonthsLater = addMonths(now, 3);
    const events: { date: Date; endDate?: Date; name: string; type: string; color: string }[] = [];

    // Add project on-periods as events (grouped by unique period)
    const seenPeriods = new Set<string>();
    for (const p of allProjectOnPeriods) {
      const key = `${p.project.id}-${p.periodStart.toISOString()}`;
      if (seenPeriods.has(key)) continue;
      seenPeriods.add(key);
      if (p.periodStart >= now && p.periodStart <= threeMonthsLater) {
        events.push({
          date: p.periodStart,
          endDate: p.periodEnd,
          name: p.project.name,
          type: 'Assigned Project',
          color: 'hsl(240 60% 60%)',
        });
      }
    }

    // Add availability entries
    for (const a of availability) {
      const d = toLocalDate(a.date);
      if (d >= now && d <= threeMonthsLater) {
        const cfg = statusConfig[a.status];
        events.push({
          date: d,
          name: cfg.label,
          type: cfg.label,
          color:
            a.status === 'available' ? '#86C952' :
            a.status === 'unavailable' ? '#F47878' :
            a.status === 'partial' ? '#F5B942' :
            '#5B9FE0',
        });
      }
    }

    // Add certificate expiry dates
    for (const cert of certificateExpiryDates) {
      if (cert.date >= now && cert.date <= threeMonthsLater) {
        events.push({
          date: cert.date,
          name: cert.name,
          type: 'Certificate Expiry',
          color: '#9B8FE8',
        });
      }
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    return events;
  }, [allProjectOnPeriods, availability, certificateExpiryDates]);

  const eventsByMonth = useMemo(() => {
    const grouped = new Map<string, typeof upcomingEvents>();
    for (const event of upcomingEvents) {
      const monthKey = format(event.date, 'MMMM yyyy');
      const existing = grouped.get(monthKey) || [];
      existing.push(event);
      grouped.set(monthKey, existing);
    }
    return grouped;
  }, [upcomingEvents]);

  // Debug logging when the expanded modal opens (moved after modifiers declaration via separate effect below)

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

  const activeRange = isExpanded ? expandedSelectedRange : selectedRange;

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (isExpanded) {
      setExpandedSelectedRange(range);
    } else {
      setSelectedRange(range);
    }
    if (range?.from) {
      if (!range.to || isSameDay(range.from, range.to)) {
        const existing = availability.find((a) => isSameDay(toLocalDate(a.date), range.from!));
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
    if (!activeRange?.from) return [];
    if (!activeRange.to) return [activeRange.from];
    return eachDayOfInterval({ start: activeRange.from, end: activeRange.to });
  };

  const handleSave = async () => {
    if (!activeRange?.from) return;
    const datesToSave = getDatesInRange();
    if (datesToSave.length === 0) return;
    setIsSaving(true);
    try {
      for (const date of datesToSave) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const existing = availability.find((a) => isSameDay(toLocalDate(a.date), date));
        if (existing) {
          const { error } = await supabase
            .from('availability')
            .update({ status: selectedStatus, notes: notes || null })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('availability')
            .insert({ personnel_id: personnelId, date: dateStr, status: selectedStatus, notes: notes || null });
          if (error) throw error;
        }
      }
      const description = datesToSave.length === 1
        ? `Availability for ${format(datesToSave[0], 'PPP')} updated`
        : `Availability for ${format(datesToSave[0], 'MMM d')} - ${format(datesToSave[datesToSave.length - 1], 'MMM d, yyyy')} updated`;
      toast({ title: 'Saved', description });
      fetchAvailability();
      if (isExpanded) {
        setExpandedSelectedRange(undefined);
      } else {
        setSelectedRange(undefined);
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save availability' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!activeRange?.from) return;
    const datesToRemove = getDatesInRange();
    const existingEntries = datesToRemove
      .map((date) => availability.find((a) => isSameDay(toLocalDate(a.date), date)))
      .filter(Boolean);
    if (existingEntries.length === 0) return;
    setIsSaving(true);
    try {
      for (const entry of existingEntries) {
        if (entry) {
          const { error } = await supabase.from('availability').delete().eq('id', entry.id);
          if (error) throw error;
        }
      }
      const description = datesToRemove.length === 1
        ? `Availability for ${format(datesToRemove[0], 'PPP')} removed`
        : `Availability for ${datesToRemove.length} days removed`;
      toast({ title: 'Removed', description });
      fetchAvailability();
      if (isExpanded) {
        setExpandedSelectedRange(undefined);
      } else {
        setSelectedRange(undefined);
      }
    } catch (error) {
      console.error('Error removing availability:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove availability' });
    } finally {
      setIsSaving(false);
    }
  };

  const hasExistingEntriesInRange = (): boolean => {
    const dates = getDatesInRange();
    return dates.some((date) => availability.find((a) => isSameDay(toLocalDate(a.date), date)));
  };

  const modifiers = {
    available: availability.filter((a) => a.status === 'available').map((a) => toLocalDate(a.date)),
    unavailable: availability.filter((a) => a.status === 'unavailable').map((a) => toLocalDate(a.date)),
    partial: availability.filter((a) => a.status === 'partial').map((a) => toLocalDate(a.date)),
    other: availability.filter((a) => a.status === 'other').map((a) => toLocalDate(a.date)),
    certificateExpiry: certificateExpiryDates.map((c) => c.date),
    projectEvent: getProjectEventDates(),
    certExpiryWarning: certExpiryWarningDates,
  };

  const modifiersStyles: Record<string, React.CSSProperties> = {
    available: { backgroundColor: '#86C952', color: '#fff', borderRadius: '6px' },
    unavailable: { backgroundColor: '#F47878', color: '#fff', borderRadius: '6px' },
    partial: { backgroundColor: '#F5B942', color: '#fff', borderRadius: '6px' },
    other: { backgroundColor: '#5B9FE0', color: '#fff', borderRadius: '6px' },
    certificateExpiry: { backgroundColor: '#9B8FE8', color: '#1a1a2e', borderRadius: '6px' },
    projectEvent: {},
    certExpiryWarning: {},
  };

  const modifiersClassNames: Record<string, string> = {};

  // Custom DayContent that renders a green dot for project-block days
  const DayContentWithDot = useCallback((props: DayContentProps) => {
    const isProjectDay = projectBlockDates.some(d => isSameDay(d, props.date));
    const hasColoredFill = availability.some(a => isSameDay(toLocalDate(a.date), props.date));
    return (
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        {props.date.getDate()}
        {isProjectDay && (
          <span
            style={{
              position: 'absolute',
              bottom: '3px',
              left: '6px',
              right: '6px',
              height: '3px',
              borderRadius: '2px',
              backgroundColor: hasColoredFill ? 'rgba(255,255,255,0.85)' : '#3B3AC2',
            }}
          />
        )}
      </span>
    );
  }, [projectBlockDates, availability]);

  // Always-on debug logging for projectBlockDates
  console.log('[AvailabilityCalendar] projectBlockDates total:', projectBlockDates.length);
  assignedProjects.forEach(p => {
    const dates = getProjectOnPeriodDates(p);
    console.log(`[Project] "${p.name}" | start: ${p.startDate} | end: ${p.endDate ?? 'NONE'} | status: ${p.status} | rotationOn: ${p.rotationOnDays} | rotationOff: ${p.rotationOffDays} | rotationCount: ${p.rotationCount} | generated dates: ${dates.length}`);
  });

  // Debug logging when the expanded modal opens
  useEffect(() => {
    if (isExpanded) {
      console.log('[AvailabilityCalendar] Modal opened — projectBlockDates count:', projectBlockDates.length, 'dates:', projectBlockDates.map(d => format(d, 'yyyy-MM-dd')));
      console.log('[AvailabilityCalendar] Assigned projects raw:', assignedProjects.map(p => ({ id: p.id, name: p.name, start: p.startDate, end: p.endDate, rotationOn: p.rotationOnDays, rotationOff: p.rotationOffDays, rotationCount: p.rotationCount })));
      console.log('[AvailabilityCalendar] availability.length:', availability.length);
      const week2Plus = availability.filter(a => { const d = parseInt(a.date.split('-')[2], 10); return d >= 8; });
      console.log('[AvailabilityCalendar] availability entries day>=8:', week2Plus.length, 'sample:', week2Plus.slice(0, 5).map(a => ({ date: a.date, status: a.status })));
      console.log('[AvailabilityCalendar] modifier lengths — available:', modifiers.available.length, 'unavailable:', modifiers.unavailable.length, 'partial:', modifiers.partial.length, 'other:', modifiers.other.length);
      console.log('[AvailabilityCalendar] projectBlock modifiersStyles:', modifiersStyles);
    }
  }, [isExpanded, projectBlockDates, assignedProjects, availability]);

  const calendarClassNames = {
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
    day_range_start: "bg-primary text-primary-foreground rounded-full",
    day_range_end: "bg-primary text-primary-foreground rounded-full",
    day_range_middle: "bg-accent text-accent-foreground",
  };

  const expandedCalendarClassNames = {
    ...calendarClassNames,
    caption_label: "text-base font-bold",
    cell: "flex-1 h-11 text-sm p-0 relative focus-within:relative focus-within:z-20 flex items-center justify-center",
    day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-[6px] inline-flex items-center justify-center text-sm border-0 outline-none shadow-none ring-0",
  };

  const legendRow = (
    <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5">
      <div className="flex items-center gap-1.5 text-sm">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#86C952' }} />
        <span className="text-muted-foreground">Available</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#F47878' }} />
        <span className="text-muted-foreground">Unavailable</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#F5B942' }} />
        <span className="text-muted-foreground">Partial</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#5B9FE0' }} />
        <span className="text-muted-foreground">Other</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#9B8FE8' }} />
        <span className="text-muted-foreground">Cert Expiry</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span style={{ width: '16px', height: '3px', borderRadius: '2px', backgroundColor: '#3B3AC2', display: 'inline-block' }} />
        <span className="text-muted-foreground">Assigned Project</span>
      </div>
    </div>
  );

  // Detail panel: selected date info (assigned projects, cert expiry) — rendered in right column when a date is selected
  const renderSelectedDateDetails = () => {
    const range = expandedSelectedRange;
    if (!range?.from) return null;

    const isSingle = !range.to || isSameDay(range.from, range.to);

    return (
      <div className="space-y-4 pb-4 border-b border-border">
        {/* Date heading */}
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {isSingle
              ? format(range.from, 'EEEE, MMMM d, yyyy')
              : `${format(range.from, 'MMMM d')} – ${format(range.to!, 'MMMM d, yyyy')}`
            }
          </h3>
          <p className="text-sm text-muted-foreground">{personnelName}</p>
        </div>

        {/* Assigned Projects */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned Projects</h4>
          {(() => {
            const projectsList = isSingle
              ? getProjectsOnDate(range.from)
              : getProjectsInRange(range.from, range.to!);
            return projectsList.length > 0 ? (
              <div className="space-y-2">
                {projectsList.map((item, idx) => (
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
                    {getCertExpiryWarningsForDate(range.from!).filter(w => w.projectName === item.project.name).map((warning, wIdx) => (
                      <div key={wIdx} className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 pl-5">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{warning.certName} expires in {warning.daysUntil}d</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {isSingle ? 'No projects assigned' : 'No projects in this period'}
              </p>
            );
          })()}

          {isSingle && getProjectEventsOnDate(range.from).length > 0 && (
            <div className="space-y-1 pt-1">
              {getProjectEventsOnDate(range.from).map((event, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(210_100%_50%)] mt-1 shrink-0" />
                  <span><span className="font-medium">{event.projectName}:</span> {event.description}</span>
                </div>
              ))}
            </div>
          )}

          {isSingle && getCertificatesExpiringOnDate(range.from).length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[hsl(280_70%_50%)]">
                <Award className="h-3 w-3" />
                Certificates Expiring
              </div>
              {getCertificatesExpiringOnDate(range.from).map((certName, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground pl-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(280_70%_50%)]" />
                  {certName}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Event type to border color mapping
  const getEventBorderColor = (type: string): string => {
    switch (type) {
      case 'Assigned Project': return '#639922';
      case 'Unavailable': return '#dc2626';
      case 'Partial': return '#d97706';
      case 'Certificate Expiry': return '#7c3aed';
      case 'Available': return '#16a34a';
      case 'Other': return '#2563eb';
      default: return 'hsl(var(--border))';
    }
  };

  // Availability status dot colors for buttons
  const statusDotColors: Record<AvailabilityStatus, string> = {
    available: '#86C952',
    unavailable: '#F47878',
    partial: '#F5B942',
    other: '#5B9FE0',
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Personal Calendar
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setExpandedSelectedRange(undefined);
              setIsExpanded(true);
            }}
          >
            <Maximize2 className="h-4 w-4 mr-1.5" />
            Expand
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {legendRow}


              {/* Compact calendar — visual only, no dialog on click */}
              <Calendar
                mode="range"
                selected={selectedRange}
                onSelect={(range) => setSelectedRange(range)}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                modifiersClassNames={modifiersClassNames}
                className="rounded-md border border-border p-3 pointer-events-auto w-full"
                classNames={calendarClassNames}
                numberOfMonths={1}
                components={{ DayContent: DayContentWithDot }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expanded Modal */}
      <Dialog open={isExpanded} onOpenChange={(open) => { if (!open) { setIsExpanded(false); setExpandedSelectedRange(undefined); } }}>
        <DialogContent className="max-w-[860px] max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Personal Calendar — {personnelName}</DialogTitle>
            <DialogDescription>Expanded calendar view with availability management</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
            {/* Left Column — Calendar Grid + Legend */}
            <div className="expanded-availability-calendar flex-1 min-w-0 border-r border-border overflow-y-auto p-5 space-y-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Personal Calendar</h2>
              </div>

              <Calendar
                mode="range"
                selected={expandedSelectedRange}
                onSelect={handleRangeSelect}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                modifiersClassNames={modifiersClassNames}
                className="rounded-md border border-border p-3 pointer-events-auto w-full"
                classNames={expandedCalendarClassNames}
                numberOfMonths={1}
                components={{ DayContent: DayContentWithDot }}
              />

              {/* Legend — compact horizontal row */}
              {legendRow}
            </div>

            {/* Right Column — Selected Date Details + Events Timeline + Availability Buttons */}
            <div className="w-full md:w-[340px] shrink-0 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Selected date details (conditionally rendered) */}
              {renderSelectedDateDetails()}

              {/* Upcoming Events Timeline */}
              <div className="space-y-3 flex-1 min-h-0">
                <h3 className="text-sm font-semibold text-foreground">Upcoming Events</h3>
                <ScrollArea className="h-[240px]">
                  {eventsByMonth.size === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No upcoming events</p>
                  ) : (
                    <div className="space-y-5 pr-3">
                      {Array.from(eventsByMonth.entries()).map(([month, events]) => (
                        <div key={month}>
                          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{month}</h4>
                          <div className="space-y-2">
                            {events.map((event, idx) => (
                              <div
                                key={idx}
                                className="rounded-md bg-white dark:bg-card p-2.5 flex items-start gap-2.5"
                                style={{ borderLeft: `3px solid ${getEventBorderColor(event.type)}` }}
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-foreground block truncate">{event.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(event.date, 'MMM d')}
                                    {event.endDate && !isSameDay(event.date, event.endDate) && ` – ${format(event.endDate, 'MMM d')}`}
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 mt-0.5">
                                  {event.type}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Set Availability — always visible */}
              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Set Availability</h4>
                <p className="text-xs text-muted-foreground">Click a day to select it, or click start → end to select a period.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">From</label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={expandedSelectedRange?.from ? format(expandedSelectedRange.from, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const d = e.target.value ? toLocalDate(e.target.value) : undefined;
                        setExpandedSelectedRange(prev => ({ from: d, to: prev?.to }));
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">To</label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={expandedSelectedRange?.to ? format(expandedSelectedRange.to, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const d = e.target.value ? toLocalDate(e.target.value) : undefined;
                        setExpandedSelectedRange(prev => ({ from: prev?.from, to: d }));
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['available', 'partial', 'unavailable', 'other'] as AvailabilityStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const Icon = config.icon;
                    return (
                       <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStatus(status)}
                        className={cn(
                          'h-9 text-xs gap-1.5',
                          selectedStatus === status && 'ring-2 ring-primary ring-offset-1'
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: statusDotColors[status] }}
                        />
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
                <Button onClick={handleSave} disabled={isSaving || !expandedSelectedRange?.from} className="w-full" size="sm">
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
                    size="sm"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
