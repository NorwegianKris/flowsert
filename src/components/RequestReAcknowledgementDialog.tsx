import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShieldAlert, Users, X, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Personnel } from '@/types';

interface RequestReAcknowledgementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel[];
  currentVersion: string;
  onSuccess?: () => void;
}

type RecipientGroup = 'employee' | 'freelancer';

function incrementVersion(version: string): string {
  const num = parseFloat(version);
  if (isNaN(num)) return '1.1';
  return (Math.round((num + 0.1) * 10) / 10).toFixed(1);
}

export function RequestReAcknowledgementDialog({
  open,
  onOpenChange,
  personnel,
  currentVersion,
  onSuccess,
}: RequestReAcknowledgementDialogProps) {
  const suggestedVersion = incrementVersion(currentVersion);
  const [newVersion, setNewVersion] = useState(suggestedVersion);
  const [reason, setReason] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<RecipientGroup[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [showIndividualSelect, setShowIndividualSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { businessId, user } = useAuth();
  const { toast } = useToast();

  const groupLabels: Record<RecipientGroup, string> = {
    employee: 'Employees',
    freelancer: 'Freelancers',
  };

  const toggleGroup = (group: RecipientGroup) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const toggleIndividual = (personnelId: string) => {
    setSelectedIndividuals((prev) =>
      prev.includes(personnelId) ? prev.filter((id) => id !== personnelId) : [...prev, personnelId]
    );
  };

  const getRecipients = (): Personnel[] => {
    const groupRecipients = personnel.filter((p) => {
      if (selectedGroups.includes('employee') && p.category === 'employee') return true;
      if (selectedGroups.includes('freelancer') && p.category === 'freelancer') return true;
      return false;
    });
    const individualRecipients = personnel.filter((p) => selectedIndividuals.includes(p.id));
    const allRecipients = [...groupRecipients, ...individualRecipients];
    return allRecipients.filter((p, i, self) => i === self.findIndex((t) => t.id === p.id));
  };

  const recipientCount = getRecipients().length;

  const filteredPersonnel = useMemo(() => {
    if (!searchQuery.trim()) return personnel;
    const q = searchQuery.toLowerCase();
    return personnel.filter((p) => p.name.toLowerCase().includes(q) || p.role?.toLowerCase().includes(q));
  }, [personnel, searchQuery]);

  // Select all personnel when no specific selection is made
  const allSelected = selectedGroups.length === 0 && selectedIndividuals.length === 0;
  const effectiveRecipientCount = allSelected ? personnel.length : recipientCount;
  const effectiveRecipients = allSelected ? personnel : getRecipients();

  const handleSubmit = async () => {
    if (!newVersion.trim()) {
      toast({ variant: 'destructive', title: 'Version required', description: 'Please enter a version number.' });
      return;
    }

    if (!businessId) return;

    setSending(true);
    try {
      // 1. Update the business required_ack_version
      const { error: bizError } = await supabase
        .from('businesses')
        .update({ required_ack_version: newVersion.trim() } as any)
        .eq('id', businessId);

      if (bizError) throw bizError;

      // 2. Send a notification to recipients
      const recipients = effectiveRecipients;
      const subject = 'Data handling terms updated';
      const message = reason.trim()
        ? `The data handling terms have been updated. Reason: ${reason.trim()}. Please review and acknowledge the updated terms on your next login.`
        : 'The data handling terms have been updated. Please review and acknowledge the updated terms on your next login.';

      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          business_id: businessId,
          subject,
          message,
          created_by: user?.id,
        })
        .select()
        .single();

      if (notifError) throw notifError;

      const recipientRecords = recipients.map((r) => ({
        notification_id: notification.id,
        personnel_id: r.id,
      }));

      const { error: recipError } = await supabase
        .from('notification_recipients')
        .insert(recipientRecords);

      if (recipError) throw recipError;

      // 3. Send email if enabled
      if (sendEmail) {
        const emailRecipients = recipients.filter((r) => r.email).map((r) => r.email);
        if (emailRecipients.length > 0) {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              emails: emailRecipients,
              subject,
              message,
              notificationId: notification.id,
            },
          });
        }
      }

      toast({
        title: 'Re-acknowledgement requested',
        description: `Version bumped to ${newVersion}. ${recipients.length} personnel will be prompted to re-acknowledge.`,
      });

      // Reset and close
      setNewVersion(incrementVersion(newVersion));
      setReason('');
      setSelectedGroups([]);
      setSelectedIndividuals([]);
      setSendEmail(false);
      setShowIndividualSelect(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error requesting re-acknowledgement:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to request re-acknowledgement.' });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Request Re-acknowledgement
          </DialogTitle>
          <DialogDescription>
            Bump the acknowledgement version so personnel must re-acknowledge data handling terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto py-2">
          {/* Version */}
          <div className="space-y-2">
            <Label htmlFor="ack-version">New version</Label>
            <Input
              id="ack-version"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              placeholder="e.g. 1.1"
            />
            <p className="text-xs text-muted-foreground">Current version: {currentVersion}</p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="ack-reason">Reason (optional)</Label>
            <Textarea
              id="ack-reason"
              placeholder="e.g. Updated privacy policy"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recipients</Label>
            <p className="text-xs text-muted-foreground">
              Leave empty to send to all personnel, or select specific groups/individuals.
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(groupLabels) as RecipientGroup[]).map((group) => (
                <Button
                  key={group}
                  variant={selectedGroups.includes(group) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleGroup(group)}
                  className="gap-2"
                >
                  {selectedGroups.includes(group) && <span>✓</span>}
                  {groupLabels[group]}
                </Button>
              ))}
            </div>
          </div>

          {/* Individual selection toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowIndividualSelect(!showIndividualSelect)}
            className="text-muted-foreground"
          >
            <Users className="h-4 w-4 mr-2" />
            {showIndividualSelect ? 'Hide individual selection' : 'Or select individuals...'}
          </Button>

          {showIndividualSelect && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[160px] border rounded-md p-2">
                <div className="space-y-1">
                  {filteredPersonnel.map((p) => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                        selectedIndividuals.includes(p.id) ? 'bg-primary/10 ring-1 ring-primary/20' : ''
                      }`}
                      onClick={() => toggleIndividual(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleIndividual(p.id);
                        }
                      }}
                    >
                      <Checkbox checked={selectedIndividuals.includes(p.id)} className="pointer-events-none" />
                      <span className="text-sm flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">{p.role}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Summary */}
          {(selectedGroups.length > 0 || selectedIndividuals.length > 0) && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Recipients: {recipientCount}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedGroups([]);
                    setSelectedIndividuals([]);
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedGroups.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {groupLabels[g]}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleGroup(g)} />
                  </Badge>
                ))}
                {selectedIndividuals.slice(0, 5).map((id) => {
                  const p = personnel.find((per) => per.id === id);
                  return p ? (
                    <Badge key={id} variant="outline" className="text-xs">
                      {p.name}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleIndividual(id)} />
                    </Badge>
                  ) : null;
                })}
                {selectedIndividuals.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedIndividuals.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Email option */}
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
            <Checkbox
              id="reack-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked === true)}
            />
            <Label htmlFor="reack-email" className="text-sm cursor-pointer">
              Also send email notification
            </Label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 mr-2" />
                Request from {effectiveRecipientCount} personnel
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
