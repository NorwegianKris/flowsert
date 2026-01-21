import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ProjectCalendarItem } from '@/hooks/useProjects';
import { Flag } from 'lucide-react';

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
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && description) {
      onAdd({
        id: crypto.randomUUID(),
        date,
        description,
        isMilestone,
      });
      setDate('');
      setDescription('');
      setIsMilestone(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Calendar Item</DialogTitle>
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
              placeholder="Enter a short description for this calendar item..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-border/50">
            <Checkbox
              id="item-milestone"
              checked={isMilestone}
              onCheckedChange={(checked) => setIsMilestone(checked === true)}
            />
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-500" />
              <Label htmlFor="item-milestone" className="cursor-pointer font-medium">
                Milestone
              </Label>
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              Mark as a key project milestone
            </span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="active">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
