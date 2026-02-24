import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, Copy, Check, Link } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkerCategories } from '@/hooks/useWorkerCategories';

interface AddPersonnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonnelAdded: () => void;
}

export function AddPersonnelDialog({ open, onOpenChange, onPersonnelAdded }: AddPersonnelDialogProps) {
  const { businessId, user } = useAuth();
  const { categories: workerCategories, loading: categoriesLoading } = useWorkerCategories();
  const [loading, setLoading] = useState(false);
  
  // Invitation state
  const [sendInvitation, setSendInvitation] = useState(true);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
  });

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite link copied to clipboard');
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', role: '' });
    setSendInvitation(true);
    setInviteLink('');
    setCopied(false);
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      resetForm();
    }
    onOpenChange(openState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessId) {
      toast.error('No business found');
      return;
    }

    if (!formData.name.trim() || !formData.email.trim() || !formData.role.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: newPersonnel, error } = await supabase.from('personnel').insert({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: '',
        role: formData.role.trim(),
        business_id: businessId,
        activated: false,
      }).select('id').single();

      if (error) throw error;

      // Attempt to activate via RPC
      let activationFailed = false;
      if (newPersonnel) {
        const { error: rpcError } = await supabase.rpc('activate_personnel', {
          p_personnel_id: newPersonnel.id,
        } as any);

        if (rpcError) {
          const msg = rpcError.message || '';
          if (msg.includes('PROFILE_CAP_REACHED')) {
            activationFailed = true;
          } else {
            console.error('Activation RPC error:', rpcError);
          }
        }
      }

      if (activationFailed) {
        toast.info('Personnel added but could not be activated — plan limit reached.', {
          description: 'Upgrade your plan or deactivate other profiles to activate this person.',
        });
      }

      // Send invitation if checkbox is checked
      if (sendInvitation && newPersonnel) {
        const { data: inviteData, error: insertError } = await supabase
          .from('invitations')
          .insert({
            business_id: businessId,
            personnel_id: newPersonnel.id,
            email: formData.email.toLowerCase().trim(),
            invited_by: user?.id,
          })
          .select('token')
          .single();

        if (insertError) {
          console.error('Error creating invitation:', insertError);
          toast.error('Personnel created but invitation failed');
        } else {
          const signupUrl = `${window.location.origin}/auth?token=${inviteData.token}`;
          setInviteLink(signupUrl);

          // Send invitation email
          const { error: emailError } = await supabase.functions.invoke('send-invitation', {
            body: {
              to: formData.email.toLowerCase().trim(),
              workerName: formData.name.trim(),
              inviteLink: signupUrl,
            },
          });

          if (emailError) {
            console.error('Failed to send email:', emailError);
            toast.success('Personnel created. Email could not be sent - please share the link manually.');
          } else {
            toast.success(`Personnel created and invitation sent to ${formData.email}`);
          }
        }
      } else {
        toast.success('Personnel record created successfully');
        resetForm();
        onOpenChange(false);
      }

      onPersonnelAdded();
    } catch (error: any) {
      console.error('Error creating personnel:', error);
      toast.error(error.message || 'Failed to create personnel record');
    } finally {
      setLoading(false);
    }
  };

  // Show invite link success screen
  if (inviteLink) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitation Sent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>{formData.name}</strong> has been added and an invitation email has been sent.
            </p>
            <p className="text-sm text-muted-foreground">
              They will complete their profile (location, nationality, documents, certificates, etc.) after signing up.
            </p>
            <div className="space-y-2">
              <Label>Worker Email</Label>
              <p className="text-sm text-muted-foreground">{formData.email}</p>
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
                The worker must sign up with the exact email address: <strong>{formData.email}</strong>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Personnel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Job Role *</Label>
              {workerCategories.length > 0 ? (
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job role" />
                  </SelectTrigger>
                  <SelectContent>
                    {workerCategories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  No job roles defined. Please add worker categories in Settings → Categories → Workers first.
                </p>
              )}
            </div>
          </div>

          {/* Invite Worker Section */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="sendInvitation" 
                checked={sendInvitation}
                onCheckedChange={(checked) => setSendInvitation(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="sendInvitation" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-4 w-4" />
                  Send invitation to create account
                </Label>
                <p className="text-xs text-muted-foreground">
                  The worker will complete their profile after signing up
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {sendInvitation ? 'Add & Send Invitation' : 'Add Personnel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
