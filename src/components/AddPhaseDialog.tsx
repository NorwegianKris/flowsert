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
import { Layers } from 'lucide-react';

interface AddPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (phase: { name: string; startDate: string; endDate: string; color: string }) => void;
  projectStartDate: string;
  projectEndDate?: string;
}

export function AddPhaseDialog({
  open,
  onOpenChange,
  onAdd,
  projectStartDate,
  projectEndDate,
}: AddPhaseDialogProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const resetAndClose = () => {
    setName('');
    setStartDate('');
    setEndDate('');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && startDate && endDate) {
      onAdd({ name, startDate, endDate, color: 'primary' });
      resetAndClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Define Phase
          </DialogTitle>
          <DialogDescription>
            Create a named phase or activity spanning a date range. It will appear as a bar on the timeline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phase-name">Phase Name</Label>
            <Input
              id="phase-name"
              placeholder="e.g. Mobilization, Inspection, Testing..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phase-start">Start Date</Label>
              <Input
                id="phase-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={projectStartDate}
                max={projectEndDate}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase-end">End Date</Label>
              <Input
                id="phase-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || projectStartDate}
                max={projectEndDate}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit">Add Phase</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
