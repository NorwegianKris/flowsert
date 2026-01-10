import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, eachDayOfInterval, isAfter, isBefore } from 'date-fns';
import { CalendarDays, Check, X, Clock, Loader2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Certificate } from '@/types';
import type { DateRange } from 'react-day-picker';

type AvailabilityStatus = 'available' | 'unavailable' | 'partial';

interface AvailabilityEntry {
  id: string;
  date: string;
  status: AvailabilityStatus;
  notes: string | null;
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
};

export function AvailabilityCalendar({ personnelId, personnelName, certificates = [] }: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>('available');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

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
    
    // Open popover when we have at least a start date
    if (range?.from) {
      // If selecting a single date, check for existing entry
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
        // For range selection, reset to defaults
        setSelectedStatus('available');
        setNotes('');
      }
      setPopoverOpen(true);
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
      // For each date in the range, upsert availability
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
      setPopoverOpen(false);
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
      setPopoverOpen(false);
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

  const getDateStatus = (date: Date): AvailabilityStatus | null => {
    const entry = availability.find((a) => isSameDay(new Date(a.date), date));
    return entry ? (entry.status as AvailabilityStatus) : null;
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
    certificateExpiry: certificateExpiryDates.map((c) => c.date),
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
    certificateExpiry: {
      border: '2px solid hsl(280 70% 50%)',
      borderRadius: '50%',
    },
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Availability Calendar
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
            </div>

            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <div>
                  <Calendar
                    mode="range"
                    selected={selectedRange}
                    onSelect={handleRangeSelect}
                    modifiers={modifiers}
                    modifiersStyles={modifiersStyles}
                    className="rounded-md border border-border pointer-events-auto"
                    numberOfMonths={1}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">
                      {selectedRange?.from ? (
                        selectedRange.to && !isSameDay(selectedRange.from, selectedRange.to) ? (
                          `${format(selectedRange.from, 'MMM d')} - ${format(selectedRange.to, 'MMM d, yyyy')}`
                        ) : (
                          format(selectedRange.from, 'EEEE, MMMM d, yyyy')
                        )
                      ) : (
                        'Select dates'
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedRange?.to && !isSameDay(selectedRange.from!, selectedRange.to) 
                        ? `Set availability for ${getDatesInRange().length} days`
                        : `Set availability for ${personnelName}`
                      }
                    </p>
                  </div>

                  {selectedRange?.from && !selectedRange.to && getCertificatesExpiringOnDate(selectedRange.from).length > 0 && (
                    <div className="p-3 rounded-lg bg-[hsl(280_70%_50%)]/10 border border-[hsl(280_70%_50%)]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-[hsl(280_70%_50%)]" />
                        <span className="text-sm font-medium text-foreground">Certificate Expiries</span>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {getCertificatesExpiringOnDate(selectedRange.from).map((certName, idx) => (
                          <li key={idx} className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(280_70%_50%)]" />
                            {certName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {Object.entries(statusConfig).map(([status, config]) => {
                      const Icon = config.icon;
                      return (
                        <Button
                          key={status}
                          variant={selectedStatus === status ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedStatus(status as AvailabilityStatus)}
                          className={cn(
                            'flex-1',
                            selectedStatus === status && config.className
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 mr-1" />
                          {config.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div>
                    <Textarea
                      placeholder="Add notes (optional)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isSaving || !selectedRange?.from} className="flex-1">
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
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="pt-4 border-t border-border/50">
              <h4 className="text-sm font-medium mb-2">Upcoming Availability</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availability
                  .filter((a) => new Date(a.date) >= new Date())
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map((entry) => {
                    const config = statusConfig[entry.status as AvailabilityStatus];
                    return (
                      <div key={entry.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {format(new Date(entry.date), 'EEE, MMM d')}
                        </span>
                        <Badge className={cn('text-xs', config.className)}>
                          {config.label}
                        </Badge>
                      </div>
                    );
                  })}
                {availability.filter((a) => new Date(a.date) >= new Date()).length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No upcoming availability set
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
