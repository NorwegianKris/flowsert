import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Copy, Check, Mail, UserPlus } from 'lucide-react';

interface InviteAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: () => void;
}

export function InviteAdminDialog({
  open,
  onOpenChange,
  onInviteSent,
}: InviteAdminDialogProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  const handleClose = (open: boolean) => {
    if (!open) {
      setEmail('');
      setInviteLink(null);
      setError(null);
      setCopied(false);
    }
    onOpenChange(open);
  };

  const copyToClipboard = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Invite link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter an email address');
      return;
    }

    if (!profile?.business_id) {
      setError('Unable to determine your business');
      return;
    }

    // Check if user is superadmin (kmu@live.no)
    if (profile.email !== 'kmu@live.no') {
      setError('Only the superadmin (kmu@live.no) can invite new admins');
      return;
    }

    setLoading(true);

    try {
      // Fetch business name for the email
      const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', profile.business_id)
        .single();

      // Create invitation with admin role
      const { data: invitation, error: insertError } = await supabase
        .from('invitations')
        .insert({
          email,
          business_id: profile.business_id,
          invited_by: profile.id,
          role: 'admin',
          personnel_id: null,
        })
        .select('token')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('An invitation has already been sent to this email');
        }
        throw insertError;
      }

      // Generate the signup URL
      const signupUrl = `${window.location.origin}/auth?token=${invitation.token}`;
      setInviteLink(signupUrl);

      // Send email invitation
      const { error: emailError } = await supabase.functions.invoke(
        'send-invitation',
        {
          body: {
            to: email,
            workerName: email.split('@')[0],
            inviteLink: signupUrl,
            businessName: business?.name || 'Your Company',
            isAdmin: true,
          },
        }
      );

      if (emailError) {
        console.error('Email send error:', emailError);
        toast({
          title: 'Invitation Created',
          description:
            'The invitation was created but the email could not be sent. You can share the link manually.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Invitation Sent',
          description: `Admin invitation has been sent to ${email}`,
        });
      }

      onInviteSent?.();
    } catch (err: any) {
      console.error('Error creating admin invitation:', err);
      setError(err.message || 'Failed to create invitation');
      toast({
        title: 'Error',
        description: err.message || 'Failed to create invitation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Admin
          </DialogTitle>
          <DialogDescription>
            Send an invitation to add a new administrator to your business.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">
                Invitation sent to: <span className="text-primary">{email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                They will be added as an admin when they sign up.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="text-xs font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => handleClose(false)} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
