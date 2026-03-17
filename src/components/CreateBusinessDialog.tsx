import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Check, Copy, Loader2 } from 'lucide-react';

interface CreateBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateBusinessDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBusinessDialogProps) {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [tier, setTier] = useState('starter');
  const [isTest, setIsTest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setName('');
    setAdminName('');
    setAdminEmail('');
    setTier('starter');
    setIsTest(false);
    setInvitationUrl(null);
    setCopied(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        'create-platform-business',
        {
          body: { name, tier, is_test: isTest, admin_name: adminName, admin_email: adminEmail },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInvitationUrl(data.invitation_url);
      toast.success('Business created successfully');
      onCreated();
    } catch (err: any) {
      console.error('Failed to create business:', err);
      toast.error(err.message || 'Failed to create business');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!invitationUrl) return;
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{invitationUrl ? 'Business Created' : 'Add Business'}</DialogTitle>
          <DialogDescription>
            {invitationUrl
              ? 'Share this invitation link with the admin to complete setup.'
              : 'Create a new business and generate an admin invitation.'}
          </DialogDescription>
        </DialogHeader>

        {invitationUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Invitation Link</Label>
              <div className="flex gap-2">
                <Input readOnly value={invitationUrl} className="text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleClose(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="biz-name">Business Name</Label>
              <Input
                id="biz-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-name">Admin Full Name</Label>
              <Input
                id="admin-name"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="jane@acme.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Plan Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is-test">Mark as test</Label>
              <Switch
                id="is-test"
                checked={isTest}
                onCheckedChange={setIsTest}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Business
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
