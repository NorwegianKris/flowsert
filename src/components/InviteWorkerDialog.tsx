import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Personnel } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import { z } from 'zod';

interface InviteWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel[];
  onInviteSent?: () => void;
}

const emailSchema = z.string().email('Please enter a valid email address');

export function InviteWorkerDialog({ 
  open, 
  onOpenChange, 
  personnel,
  onInviteSent 
}: InviteWorkerDialogProps) {
  const [email, setEmail] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { businessId, user } = useAuth();
  const { toast } = useToast();

  // Filter personnel that don't have a linked user_id yet
  const availablePersonnel = personnel;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return;
    }

    if (!selectedPersonnelId) {
      setError('Please select a personnel record to link');
      return;
    }

    if (!businessId) {
      setError('Business not found');
      return;
    }

    setIsLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('invitations')
        .insert({
          business_id: businessId,
          personnel_id: selectedPersonnelId,
          email: email.toLowerCase().trim(),
          invited_by: user?.id,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Invitation sent',
        description: `An invitation has been created for ${email}. Share the signup link with them.`,
      });

      setEmail('');
      setSelectedPersonnelId('');
      onOpenChange(false);
      onInviteSent?.();
    } catch (err) {
      console.error('Error sending invitation:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to send invitation',
        description: 'Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Worker
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a worker. When they sign up with this email, 
            they'll be linked to the selected personnel record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="worker@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personnel">Link to Personnel Record</Label>
            <Select value={selectedPersonnelId} onValueChange={setSelectedPersonnelId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a personnel record" />
              </SelectTrigger>
              <SelectContent>
                {availablePersonnel.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} - {p.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availablePersonnel.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No personnel records available. Create a personnel record first.
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || availablePersonnel.length === 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
