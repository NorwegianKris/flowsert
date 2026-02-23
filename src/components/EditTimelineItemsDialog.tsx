import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectCalendarItem } from '@/hooks/useProjects';
import { ProjectPhase } from '@/hooks/useProjectPhases';
import { Trash2, Flag, CalendarDays, Layers } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface EditTimelineItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarItems: ProjectCalendarItem[];
  phases: ProjectPhase[];
  onRemoveCalendarItem: (itemId: string) => void;
  onRemovePhase: (phaseId: string) => void;
}

export function EditTimelineItemsDialog({
  open,
  onOpenChange,
  calendarItems,
  phases,
  onRemoveCalendarItem,
  onRemovePhase,
}: EditTimelineItemsDialogProps) {
  const milestones = calendarItems.filter((i) => i.isMilestone);
  const events = calendarItems.filter((i) => !i.isMilestone);

  const hasItems = milestones.length > 0 || events.length > 0 || phases.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Timeline Items</DialogTitle>
          <DialogDescription>Remove milestones, events, or phases from the project timeline.</DialogDescription>
        </DialogHeader>

        {!hasItems ? (
          <p className="text-sm text-muted-foreground text-center py-6">No timeline items to edit.</p>
        ) : (
          <div className="space-y-5 max-h-[60vh] overflow-y-auto">
            {milestones.length > 0 && (
              <Section title="Milestones" icon={<Flag className="h-4 w-4 text-amber-500" />}>
                {milestones.map((item) => (
                  <ItemRow
                    key={item.id}
                    label={item.description}
                    date={item.date}
                    onDelete={() => onRemoveCalendarItem(item.id)}
                  />
                ))}
              </Section>
            )}

            {events.length > 0 && (
              <Section title="Events" icon={<CalendarDays className="h-4 w-4 text-sky-500" />}>
                {events.map((item) => (
                  <ItemRow
                    key={item.id}
                    label={item.description}
                    date={item.date}
                    onDelete={() => onRemoveCalendarItem(item.id)}
                  />
                ))}
              </Section>
            )}

            {phases.length > 0 && (
              <Section title="Phases" icon={<Layers className="h-4 w-4 text-violet-500" />}>
                {phases.map((phase) => (
                  <ItemRow
                    key={phase.id}
                    label={phase.name}
                    date={`${format(parseISO(phase.startDate), 'MMM d')} – ${format(parseISO(phase.endDate), 'MMM d, yyyy')}`}
                    onDelete={() => onRemovePhase(phase.id)}
                    isRange
                  />
                ))}
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ItemRow({ label, date, onDelete, isRange }: { label: string; date: string; onDelete: () => void; isRange?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/50 group">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground truncate">{label}</p>
        <p className="text-xs text-muted-foreground">
          {isRange ? date : format(parseISO(date), 'MMM d, yyyy')}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
