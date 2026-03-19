import { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, Send, Users, X, Search, GripVertical, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Personnel } from '@/types';

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel[];
}

type RecipientGroup = 'employee' | 'freelancer';

/** Normalize and de-dupe emails, filtering out invalid ones */
function dedupeEmails(emails: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of emails) {
    if (!raw || typeof raw !== 'string') continue;
    const normalized = raw.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function SendNotificationDialog({ open, onOpenChange, personnel }: SendNotificationDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<RecipientGroup[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [showIndividualSelect, setShowIndividualSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listHeight, setListHeight] = useState(160);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendComplete, setSendComplete] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  
  const sendStartTime = useRef<number>(0);
  const expectedDuration = useRef<number>(1000);
  
  const { businessId, user } = useAuth();
  const { toast } = useToast();

  const groupLabels: Record<RecipientGroup, string> = {
    employee: 'Employees',
    freelancer: 'Freelancers',
  };

  const toggleGroup = (group: RecipientGroup) => {
    setSelectedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group) 
        : [...prev, group]
    );
  };

  const toggleIndividual = (personnelId: string) => {
    setSelectedIndividuals(prev =>
      prev.includes(personnelId)
        ? prev.filter(id => id !== personnelId)
        : [...prev, personnelId]
    );
  };

  const getRecipients = (): Personnel[] => {
    const groupRecipients = personnel.filter(p => {
      if (selectedGroups.includes('employee') && p.category === 'employee') return true;
      if (selectedGroups.includes('freelancer') && p.category === 'freelancer') return true;
      return false;
    });
    
    const individualRecipients = personnel.filter(p => selectedIndividuals.includes(p.id));
    
    const allRecipients = [...groupRecipients, ...individualRecipients];
    const unique = allRecipients.filter((p, index, self) => 
      index === self.findIndex(t => t.id === p.id)
    );
    
    return unique;
  };

  const recipientCount = getRecipients().length;

  const filteredPersonnel = useMemo(() => {
    if (!searchQuery.trim()) return personnel;
    const query = searchQuery.toLowerCase();
    return personnel.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.role?.toLowerCase().includes(query)
    );
  }, [personnel, searchQuery]);

  // Progress simulation
  useEffect(() => {
    if (!sending || sendComplete) return;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - sendStartTime.current;
      const ratio = Math.min(elapsed / expectedDuration.current, 1);
      // Ease-out curve, cap at 95% until complete
      const simulated = Math.min(ratio * 100, 95);
      setSendProgress(simulated);
    }, 50);

    return () => clearInterval(interval);
  }, [sending, sendComplete]);

  const simulatedCounter = Math.floor((sendProgress / 100) * recipientCount);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = listHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(100, Math.min(400, startHeight + delta));
      setListHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please enter both a subject and message.',
      });
      return;
    }

    const recipients = getRecipients();
    if (recipients.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No recipients',
        description: 'Please select at least one recipient group or individual.',
      });
      return;
    }

    setSending(true);
    setSendProgress(0);
    setSendComplete(false);
    sendStartTime.current = Date.now();
    expectedDuration.current = sendEmail ? recipients.length * 200 : 1000;

    try {
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          business_id: businessId,
          subject: subject.trim(),
          message: message.trim(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (notifError) throw notifError;

      const recipientRecords = recipients.map(r => ({
        notification_id: notification.id,
        personnel_id: r.id,
      }));

      const { error: recipError } = await supabase
        .from('notification_recipients')
        .insert(recipientRecords);

      if (recipError) throw recipError;

      if (sendEmail) {
        const dedupedEmails = dedupeEmails(recipients.map(r => r.email));

        if (dedupedEmails.length > 0) {
          const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
            body: {
              emails: dedupedEmails,
              subject: subject.trim(),
              message: message.trim(),
              notificationId: notification.id,
            },
          });

          if (emailError) {
            // In-app succeeded but email failed — still show complete
            console.error('Email send error:', emailError);
          }
        }
      }

      // Success — show completion state
      setSendProgress(100);
      setSendComplete(true);
      setCompletedCount(recipients.length);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send notification. Please try again.',
      });
      setSendProgress(0);
    } finally {
      setSending(false);
    }
  };

  const handleCloseAfterSuccess = () => {
    setSubject('');
    setMessage('');
    setSelectedGroups([]);
    setSelectedIndividuals([]);
    setSendEmail(false);
    setShowIndividualSelect(false);
    setSendProgress(0);
    setSendComplete(false);
    setCompletedCount(0);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (sending) return;
    if (sendComplete) {
      handleCloseAfterSuccess();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Send Notification
          </DialogTitle>
          <DialogDescription>
            Send a notification to your personnel. They'll see it in their profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto py-2">
          {/* Recipient Groups */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select recipient groups</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(groupLabels) as RecipientGroup[]).map((group) => (
                <Button
                  key={group}
                  variant={selectedGroups.includes(group) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleGroup(group)}
                  className="gap-2"
                  disabled={sending || sendComplete}
                >
                  {selectedGroups.includes(group) && <span>✓</span>}
                  {groupLabels[group]}
                </Button>
              ))}
            </div>
          </div>

          {/* Individual Selection Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowIndividualSelect(!showIndividualSelect)}
              className="text-muted-foreground"
              disabled={sending || sendComplete}
            >
              <Users className="h-4 w-4 mr-2" />
              {showIndividualSelect ? 'Hide individual selection' : 'Or select individuals...'}
            </Button>
          </div>

          {/* Individual Personnel Selection */}
          {showIndividualSelect && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select individual personnel</Label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  disabled={sending || sendComplete}
                />
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <ScrollArea style={{ height: listHeight }} className="p-2">
                  <div className="space-y-1">
                    {filteredPersonnel.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No personnel found matching "{searchQuery}"
                      </p>
                    ) : (
                      filteredPersonnel.map((p) => (
                        <div
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer hover:bg-muted transition-colors w-full ${
                            selectedIndividuals.includes(p.id) ? 'bg-primary/10 ring-1 ring-primary/20' : ''
                          }`}
                          onClick={() => !sending && !sendComplete && toggleIndividual(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (!sending && !sendComplete) toggleIndividual(p.id);
                            }
                          }}
                        >
                          <Checkbox
                            checked={selectedIndividuals.includes(p.id)}
                            className="pointer-events-none"
                          />
                          <span className="text-sm flex-1 truncate">{p.name}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.role}</span>
                          <Badge variant={p.category === 'freelancer' ? 'secondary' : 'default'} className="font-normal shrink-0">
                            {p.category === 'freelancer' ? 'Freelancer' : 'Employee'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                
                <div
                  className="h-3 bg-muted/50 hover:bg-muted cursor-ns-resize flex items-center justify-center border-t"
                  onMouseDown={handleResizeStart}
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground rotate-90" />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {filteredPersonnel.length} of {personnel.length} personnel shown • Drag bottom edge to resize
              </p>
            </div>
          )}

          {/* Selected Recipients Summary */}
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
                  disabled={sending || sendComplete}
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedGroups.map(g => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {groupLabels[g]}
                    {!sending && !sendComplete && (
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleGroup(g)} />
                    )}
                  </Badge>
                ))}
                {selectedIndividuals.slice(0, 5).map(id => {
                  const p = personnel.find(per => per.id === id);
                  return p ? (
                    <Badge key={id} variant="outline" className="text-xs">
                      {p.name}
                      {!sending && !sendComplete && (
                        <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleIndividual(id)} />
                      )}
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

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter notification subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
              disabled={sending || sendComplete}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={1000}
              disabled={sending || sendComplete}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/1000 characters
            </p>
          </div>

          {/* Email Option */}
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
            <Checkbox
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked === true)}
              disabled={sending || sendComplete}
            />
            <Label htmlFor="sendEmail" className="text-sm cursor-pointer">
              Also send email notification to recipients
            </Label>
          </div>
        </div>

        {/* Progress / Success area */}
        {(sending || sendComplete) && (
          <div className="px-1 pb-2">
            {sendComplete ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">
                  Successfully sent to {completedCount} recipient{completedCount !== 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Progress value={sendProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Sending... {simulatedCounter} of {recipientCount}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {sendComplete ? (
            <Button onClick={handleCloseAfterSuccess}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending || recipientCount === 0}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
