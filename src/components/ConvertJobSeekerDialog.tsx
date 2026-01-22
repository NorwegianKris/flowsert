import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ConvertJobSeekerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnelId: string;
  personnelName: string;
  onSuccess: () => void;
}

export function ConvertJobSeekerDialog({
  open,
  onOpenChange,
  personnelId,
  personnelName,
  onSuccess,
}: ConvertJobSeekerDialogProps) {
  const [category, setCategory] = useState<'fixed_employee' | 'freelancer'>('fixed_employee');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('personnel')
        .update({
          is_job_seeker: false,
          category: category,
        })
        .eq('id', personnelId);

      if (error) throw error;

      toast.success(`${personnelName} has been added to the main pool`);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error converting job seeker:', error);
      toast.error('Failed to convert job seeker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add to Main Pool</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to add <strong>{personnelName}</strong> to the main pool? 
            This will convert their job seeker profile to a regular employee profile.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-3">
          <Label>Select Category</Label>
          <RadioGroup
            value={category}
            onValueChange={(value) => setCategory(value as 'fixed_employee' | 'freelancer')}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed_employee" id="fixed_employee" />
              <Label htmlFor="fixed_employee" className="font-normal cursor-pointer">
                Fixed Employee
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="freelancer" id="freelancer" />
              <Label htmlFor="freelancer" className="font-normal cursor-pointer">
                Freelancer
              </Label>
            </div>
          </RadioGroup>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
