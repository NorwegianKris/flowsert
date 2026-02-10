import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProjectCalendarItem } from '@/hooks/useProjects';
import { Flag, CalendarDays, ArrowLeft } from 'lucide-react';

interface AddCalendarItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: ProjectCalendarItem) => void;
  projectStartDate: string;
  projectEndDate?: string;
}

export function AddCalendarItemDialog({
  open,
  onOpenChange,
  onAdd,
  projectStartDate,
  projectEndDate,
}: AddCalendarItemDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isMilestone, setIsMilestone] = useState(false);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const resetAndClose = () => {
    setStep(1);
    setIsMilestone(false);
    setDate('');
    setDescription('');
    onOpenChange(false);
  };

  const handleSelectType = (milestone: boolean) => {
    setIsMilestone(milestone);
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && description) {
      onAdd({
        id: crypto.randomUUID(),
        date,
        description,
        isMilestone,
      });
      resetAndClose();
    }
  };

  const typeLabel = isMilestone ? 'Milestone' : 'Event';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Add to Timeline</DialogTitle>
              <DialogDescription>
                Choose what you'd like to add to the project timeline.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <button
                type="button"
                onClick={() => handleSelectType(false)}
                className="flex flex-col items-center gap-3 p-5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted hover:border-primary/30 transition-colors text-center cursor-pointer"
              >
                <div className="p-3 rounded-full bg-primary/10">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Event</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    A general project event such as a meeting, delivery, or deadline. Shown as a dot on the timeline.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectType(true)}
                className="flex flex-col items-center gap-3 p-5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted hover:border-amber-500/30 transition-colors text-center cursor-pointer"
              >
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Flag className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Milestone</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    A key project milestone marking a significant phase or achievement. Shown as a prominent marker on the timeline.
                  </p>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isMilestone ? (
                  <Flag className="h-5 w-5 text-amber-500" />
                ) : (
                  <CalendarDays className="h-5 w-5 text-primary" />
                )}
                Add {typeLabel}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="item-date">Date</Label>
                <Input
                  id="item-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={projectStartDate}
                  max={projectEndDate}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-description">Description</Label>
                <Textarea
                  id="item-description"
                  placeholder={`Enter a short description for this ${typeLabel.toLowerCase()}...`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                />
              </div>
              <DialogFooter className="flex-row gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="gap-1.5 mr-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={resetAndClose}>
                    Cancel
                  </Button>
                  <Button type="submit">Add {typeLabel}</Button>
                </div>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
