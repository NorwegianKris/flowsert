import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CertificateExpiryNotificationDialogProps {
  personnelId: string;
  personnelEmail: string;
  initialEnabled?: boolean;
  onUpdate?: () => void;
}

export function CertificateExpiryNotificationDialog({
  personnelId,
  personnelEmail,
  initialEnabled = false,
  onUpdate,
}: CertificateExpiryNotificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Sync with prop when dialog opens
  useEffect(() => {
    if (open) {
      setEnabled(initialEnabled);
    }
  }, [open, initialEnabled]);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('personnel')
        .update({ certificate_expiry_notifications: checked })
        .eq('id', personnelId);

      if (error) throw error;

      setEnabled(checked);
      toast({
        title: checked ? 'Notifications enabled' : 'Notifications disabled',
        description: checked
          ? 'You will receive email notifications when certificates are expiring soon.'
          : 'You will no longer receive certificate expiry notifications.',
      });
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating notification preference:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update notification preferences.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {enabled ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          Notifications
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Certificate Expiry Notifications
          </DialogTitle>
          <DialogDescription>
            Get notified by email when your certificates are about to expire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="expiry-notifications" className="text-base font-medium">
                Email notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive email alerts when certificates reach the "expiring soon" status (within 90 days of expiry).
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                id="expiry-notifications"
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={loading}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">Notifications will be sent to:</p>
            <p className="text-sm text-muted-foreground font-mono bg-background px-2 py-1 rounded inline-block">
              {personnelEmail}
            </p>
          </div>

          {enabled && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-primary">Notifications are active</p>
                  <p className="text-xs text-muted-foreground">
                    You'll receive an email when any of your certificates enters the expiring soon period.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
