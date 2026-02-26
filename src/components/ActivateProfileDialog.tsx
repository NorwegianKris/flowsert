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
import { Loader2, ShieldCheck, ShieldOff, AlertTriangle } from 'lucide-react';

interface ActivateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnelId: string;
  personnelName: string;
  isCurrentlyActivated: boolean;
  isFreelancer: boolean;
  onSuccess: () => void;
}

function parseRpcError(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const msg = (error as any)?.message || (error as any)?.details || '';
  if (typeof msg === 'string') {
    if (msg.includes('PROFILE_CAP_REACHED')) return 'PROFILE_CAP_REACHED';
    if (msg.includes('PERSONNEL_NOT_FOUND')) return 'PERSONNEL_NOT_FOUND';
  }
  return null;
}

export function ActivateProfileDialog({
  open,
  onOpenChange,
  personnelId,
  personnelName,
  isCurrentlyActivated,
  isFreelancer,
  onSuccess,
}: ActivateProfileDialogProps) {
  const [category, setCategory] = useState<'employee' | 'freelancer'>('employee');
  const [loading, setLoading] = useState(false);
  const [capReached, setCapReached] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    setCapReached(false);
    try {
      const params: Record<string, unknown> = { p_personnel_id: personnelId };
      if (isFreelancer) {
        params.p_category = category;
      }

      const { error } = await supabase.rpc('activate_personnel', params as any);

      if (error) {
        const code = parseRpcError(error);
        if (code === 'PROFILE_CAP_REACHED') {
          setCapReached(true);
          return;
        }
        if (code === 'PERSONNEL_NOT_FOUND') {
          toast.error('Personnel record not found. It may have been removed.');
          onOpenChange(false);
          return;
        }
        throw error;
      }

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
      const { error } = await supabase.rpc('deactivate_personnel', {
        p_personnel_id: personnelId,
      } as any);

      if (error) {
        const code = parseRpcError(error);
        if (code === 'PERSONNEL_NOT_FOUND') {
          toast.error('Personnel record not found. It may have been removed.');
          onOpenChange(false);
          return;
        }
        throw error;
      }

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
              <p className="text-sm">This will:</p>
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

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setCapReached(false); onOpenChange(v); }}>
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
            <p className="text-sm">Activating this profile will:</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>Enable viewing and downloading certificate documents</li>
              <li>Allow assignment to projects</li>
              <li>Include in exports</li>
              <li className="text-primary font-medium">Count toward your active personnel billing</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {capReached && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
              <AlertTriangle className="h-4 w-4" />
              Plan Limit Reached
            </div>
            <p className="text-sm text-muted-foreground">
              You've reached the maximum number of active profiles for your current plan. 
              Upgrade to a higher tier for more capacity, or deactivate other profiles to make room.
            </p>
            <a
              href="/admin?tab=settings&section=billing"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View Plans →
            </a>
          </div>
        )}

        {isFreelancer && !capReached && (
          <div className="py-4 space-y-3">
            <Label>Select Category</Label>
            <RadioGroup
              value={category}
              onValueChange={(value) => setCategory(value as 'employee' | 'freelancer')}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="employee" id="employee" />
                <Label htmlFor="employee" className="font-normal cursor-pointer">Employee</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="freelancer" id="freelancer" />
                <Label htmlFor="freelancer" className="font-normal cursor-pointer">Freelancer</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          {!capReached && (
            <AlertDialogAction onClick={handleActivate} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Activate Profile
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
