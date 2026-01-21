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
import { Loader2, Mail, UserPlus, Copy, Check, Link } from 'lucide-react';
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
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const { businessId, user } = useAuth();
  const { toast } = useToast();

  // Filter personnel that don't have a linked user_id yet
  const availablePersonnel = personnel;

  const handleClose = (open: boolean) => {
    if (!open) {
      setInviteLink('');
      setEmail('');
      setSelectedPersonnelId('');
      setError('');
      setCopied(false);
    }
    onOpenChange(open);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Invite link copied to clipboard.',
    });
  };

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
      // Get the selected personnel name
      const selectedPerson = personnel.find(p => p.id === selectedPersonnelId);
      const workerName = selectedPerson?.name || 'Team Member';

      const { data, error: insertError } = await supabase
        .from('invitations')
        .insert({
          business_id: businessId,
          personnel_id: selectedPersonnelId,
          email: email.toLowerCase().trim(),
          invited_by: user?.id,
        })
        .select('token')
        .single();

      if (insertError) throw insertError;

      const signupUrl = `${window.location.origin}/auth?token=${data.token}`;
      setInviteLink(signupUrl);

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-invitation', {
        body: {
          to: email.toLowerCase().trim(),
          workerName,
          inviteLink: signupUrl,
        },
      });

      if (emailError) {
        console.error('Failed to send email:', emailError);
        toast({
          title: 'Invitation created',
          description: 'Email could not be sent. Please share the link manually.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Invitation sent!',
          description: `An email with the signup link has been sent to ${email}.`,
        });
      }

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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Worker
          </DialogTitle>
          <DialogDescription>
            {inviteLink 
              ? 'Share this signup link with the worker. They must sign up using the email address below.'
              : 'Create an invitation for a worker. You\'ll get a signup link to share with them.'}
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Worker Email</Label>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Signup Link
              </Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-sm" />
                <Button type="button" variant="outline" size="icon" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The worker must sign up with the exact email address: <strong>{email}</strong>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
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
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="active" disabled={isLoading || availablePersonnel.length === 0}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
