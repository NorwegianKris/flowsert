import { format, parseISO } from 'date-fns';
import { Flag, CalendarDays, Layers } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectCalendarItem } from '@/hooks/useProjects';
import { ProjectPhase } from '@/hooks/useProjectPhases';

export type TimelineItemType = 'milestone' | 'event' | 'phase';

export interface TimelineItemDetail {
  type: TimelineItemType;
  milestone?: ProjectCalendarItem;
  event?: ProjectCalendarItem;
  phase?: ProjectPhase;
}

interface TimelineItemDetailDialogProps {
  item: TimelineItemDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimelineItemDetailDialog({ item, open, onOpenChange }: TimelineItemDetailDialogProps) {
  if (!item) return null;

  const icon =
    item.type === 'milestone' ? <Flag className="h-5 w-5 text-amber-500" /> :
    item.type === 'event' ? <CalendarDays className="h-5 w-5 text-primary" /> :
    <Layers className="h-5 w-5 text-primary" />;

  const title =
    item.type === 'phase' ? item.phase?.name :
    item.type === 'milestone' ? item.milestone?.description :
    item.event?.description;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            <span className="capitalize">{item.type} Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Name</span>
            <p className="font-medium text-foreground">{title || '—'}</p>
          </div>

          {item.type === 'phase' && item.phase && (
            <>
              <div className="flex gap-6">
                <div>
                  <span className="text-muted-foreground">Start Date</span>
                  <p className="font-medium text-foreground">
                    {format(parseISO(item.phase.startDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date</span>
                  <p className="font-medium text-foreground">
                    {format(parseISO(item.phase.endDate), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </>
          )}

          {(item.type === 'milestone' || item.type === 'event') && (
            <div>
              <span className="text-muted-foreground">Date</span>
              <p className="font-medium text-foreground">
                {format(
                  parseISO((item.type === 'milestone' ? item.milestone! : item.event!).date),
                  'MMM d, yyyy'
                )}
              </p>
            </div>
          )}

          <div>
            <span className="text-muted-foreground">Type</span>
            <p className="font-medium text-foreground capitalize">{item.type}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
