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
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';

interface ActivateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnelId: string;
  personnelName: string;
  isCurrentlyActivated: boolean;
  isJobSeeker: boolean;
  onSuccess: () => void;
}

export function ActivateProfileDialog({
  open,
  onOpenChange,
  personnelId,
  personnelName,
  isCurrentlyActivated,
  isJobSeeker,
  onSuccess,
}: ActivateProfileDialogProps) {
  const [category, setCategory] = useState<'employee' | 'freelancer'>('employee');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {
        activated: true,
      };

      // If activating a job seeker, also convert them
      if (isJobSeeker) {
        updateData.is_job_seeker = false;
        updateData.category = category;
      }

      const { error } = await supabase
        .from('personnel')
        .update(updateData)
        .eq('id', personnelId);

      if (error) throw error;

      toast.success(`${personnelName} has been activated`, {
        description: 'Full document access is now enabled. This profile will count toward billing.',
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error activating profile:', error);
      toast.error('Failed to activate profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('personnel')
        .update({ activated: false })
        .eq('id', personnelId);

      if (error) throw error;

      toast.success(`${personnelName} has been deactivated`, {
        description: 'Document access is now restricted. This profile no longer counts toward billing.',
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error deactivating profile:', error);
      toast.error('Failed to deactivate profile');
    } finally {
      setLoading(false);
    }
  };

  if (isCurrentlyActivated) {
    // Deactivation dialog
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              Deactivate Profile
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to deactivate <strong>{personnelName}</strong>?
              </p>
              <p className="text-sm">
                This will:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Restrict access to certificate documents</li>
                <li>Prevent assignment to projects</li>
                <li>Remove this profile from billing</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                You can reactivate the profile at any time.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Activation dialog
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Activate Profile
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Activate <strong>{personnelName}</strong> to unlock full access?
            </p>
            <p className="text-sm">
              Activating this profile will:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>Enable viewing and downloading certificate documents</li>
              <li>Allow assignment to projects</li>
              <li>Include in exports</li>
              <li className="text-primary font-medium">Count toward your active personnel billing</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {isJobSeeker && (
          <div className="py-4 space-y-3">
            <Label>Select Category</Label>
            <RadioGroup
              value={category}
              onValueChange={(value) => setCategory(value as 'employee' | 'freelancer')}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="employee" id="employee" />
                <Label htmlFor="employee" className="font-normal cursor-pointer">
                  Employee
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
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleActivate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Activate Profile
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
