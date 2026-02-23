import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectCalendarItem } from '@/hooks/useProjects';
import { ProjectPhase } from '@/hooks/useProjectPhases';
import { Trash2, Flag, CalendarDays, Layers, Pencil, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface EditTimelineItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarItems: ProjectCalendarItem[];
  phases: ProjectPhase[];
  onRemoveCalendarItem: (itemId: string) => void;
  onRemovePhase: (phaseId: string) => void;
  onUpdateCalendarItem: (itemId: string, updates: { description?: string; date?: string }) => void;
  onUpdatePhase: (phaseId: string, updates: { name?: string; startDate?: string; endDate?: string }) => void;
}

export function EditTimelineItemsDialog({
  open,
  onOpenChange,
  calendarItems,
  phases,
  onRemoveCalendarItem,
  onRemovePhase,
  onUpdateCalendarItem,
  onUpdatePhase,
}: EditTimelineItemsDialogProps) {
  const milestones = calendarItems.filter((i) => i.isMilestone);
  const events = calendarItems.filter((i) => !i.isMilestone);

  const hasItems = milestones.length > 0 || events.length > 0 || phases.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Timeline Items</DialogTitle>
          <DialogDescription>Edit or remove milestones, events, or phases from the project timeline.</DialogDescription>
        </DialogHeader>

        {!hasItems ? (
          <p className="text-sm text-muted-foreground text-center py-6">No timeline items to edit.</p>
        ) : (
          <div className="space-y-5 max-h-[60vh] overflow-y-auto">
            {milestones.length > 0 && (
              <Section title="Milestones" icon={<Flag className="h-4 w-4 text-amber-500" />}>
                {milestones.map((item) => (
                  <CalendarItemRow
                    key={item.id}
                    item={item}
                    onDelete={() => onRemoveCalendarItem(item.id)}
                    onUpdate={(updates) => onUpdateCalendarItem(item.id, updates)}
                  />
                ))}
              </Section>
            )}

            {events.length > 0 && (
              <Section title="Events" icon={<CalendarDays className="h-4 w-4 text-sky-500" />}>
                {events.map((item) => (
                  <CalendarItemRow
                    key={item.id}
                    item={item}
                    onDelete={() => onRemoveCalendarItem(item.id)}
                    onUpdate={(updates) => onUpdateCalendarItem(item.id, updates)}
                  />
                ))}
              </Section>
            )}

            {phases.length > 0 && (
              <Section title="Phases" icon={<Layers className="h-4 w-4 text-violet-500" />}>
                {phases.map((phase) => (
                  <PhaseRow
                    key={phase.id}
                    phase={phase}
                    onDelete={() => onRemovePhase(phase.id)}
                    onUpdate={(updates) => onUpdatePhase(phase.id, updates)}
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

function CalendarItemRow({
  item,
  onDelete,
  onUpdate,
}: {
  item: ProjectCalendarItem;
  onDelete: () => void;
  onUpdate: (updates: { description?: string; date?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(item.description);
  const [date, setDate] = useState(item.date);

  const handleSave = () => {
    onUpdate({ description, date });
    setEditing(false);
  };

  const handleCancel = () => {
    setDescription(item.description);
    setDate(item.date);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="px-3 py-2 rounded-md bg-muted/50 space-y-2">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="h-8 text-sm" />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-sm" />
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={handleSave}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/50 group">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground truncate">{item.description}</p>
        <p className="text-xs text-muted-foreground">{format(parseISO(item.date), 'MMM d, yyyy')}</p>
      </div>
      <div className="flex gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function PhaseRow({
  phase,
  onDelete,
  onUpdate,
}: {
  phase: ProjectPhase;
  onDelete: () => void;
  onUpdate: (updates: { name?: string; startDate?: string; endDate?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(phase.name);
  const [startDate, setStartDate] = useState(phase.startDate);
  const [endDate, setEndDate] = useState(phase.endDate);

  const handleSave = () => {
    onUpdate({ name, startDate, endDate });
    setEditing(false);
  };

  const handleCancel = () => {
    setName(phase.name);
    setStartDate(phase.startDate);
    setEndDate(phase.endDate);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="px-3 py-2 rounded-md bg-muted/50 space-y-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Phase name" className="h-8 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-sm" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={handleSave}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/50 group">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground truncate">{phase.name}</p>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(phase.startDate), 'MMM d')} – {format(parseISO(phase.endDate), 'MMM d, yyyy')}
        </p>
      </div>
      <div className="flex gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
