import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Copy, Check, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Personnel } from '@/types';

interface SendProfileInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel;
  onInvitationSent?: () => void;
}

export function SendProfileInvitationDialog({
  open,
  onOpenChange,
  personnel,
  onInvitationSent,
}: SendProfileInvitationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { businessId, user } = useAuth();
  const { toast } = useToast();

  const copyToClipboard = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Invitation link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setInviteLink(null);
      setCopied(false);
    }
    onOpenChange(openState);
  };

  const handleSendInvitation = async () => {
    if (!businessId || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unable to send invitation. Please try again.',
      });
      return;
    }

    setLoading(true);

    try {
      // Check if there's already a pending invitation for this personnel
      const { data: existingInvitation, error: checkError } = await supabase
        .from('invitations')
        .select('id, status')
        .eq('personnel_id', personnel.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingInvitation) {
        toast({
          variant: 'destructive',
          title: 'Invitation Already Sent',
          description: 'There is already a pending invitation for this person.',
        });
        setLoading(false);
        return;
      }

      // Create the invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          email: personnel.email,
          business_id: businessId,
          role: 'worker',
          invited_by: user.id,
        })
        .select('token')
        .single();

      if (inviteError) throw inviteError;

      // Generate the signup URL
      const signupUrl = `${window.location.origin}/invite?token=${invitation.token}`;
      setInviteLink(signupUrl);

      // Send the invitation email
      const { error: emailError } = await supabase.functions.invoke('send-invitation', {
        body: {
          to: personnel.email,
          workerName: personnel.name,
          inviteLink: signupUrl,
        },
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        toast({
          variant: 'destructive',
          title: 'Email Failed',
          description: 'Invitation created but email could not be sent. You can share the link manually.',
        });
      } else {
        toast({
          title: 'Invitation Sent!',
          description: `An invitation email has been sent to ${personnel.email}`,
        });
      }

      onInvitationSent?.();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Show the invite link result screen
  if (inviteLink) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-[hsl(var(--status-valid))]" />
              Invitation Sent
            </DialogTitle>
            <DialogDescription>
              An invitation email has been sent to {personnel.name} at {personnel.email}. 
              They can use the link below to create their account and link their profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="flex-1" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[hsl(var(--status-valid))]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires in 7 days. The worker must sign up using {personnel.email}.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => handleClose(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Send Profile Invitation
          </DialogTitle>
          <DialogDescription>
            Send an invitation to {personnel.name} so they can create an account and 
            manage their own profile, certificates, and availability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={personnel.name} readOnly disabled />
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Input value={personnel.email} readOnly disabled className="flex-1" />
            </div>
            <p className="text-xs text-muted-foreground">
              The invitation will be sent to this email address.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSendInvitation} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
