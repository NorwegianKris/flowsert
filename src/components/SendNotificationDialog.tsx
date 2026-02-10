import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Users, X, Search, GripVertical } from 'lucide-react';
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

export function SendNotificationDialog({ open, onOpenChange, personnel }: SendNotificationDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<RecipientGroup[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [showIndividualSelect, setShowIndividualSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listHeight, setListHeight] = useState(160); // Default height in pixels
  
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
    
    // Combine and deduplicate
    const allRecipients = [...groupRecipients, ...individualRecipients];
    const unique = allRecipients.filter((p, index, self) => 
      index === self.findIndex(t => t.id === p.id)
    );
    
    return unique;
  };

  const recipientCount = getRecipients().length;

  // Filter personnel based on search query
  const filteredPersonnel = useMemo(() => {
    if (!searchQuery.trim()) return personnel;
    const query = searchQuery.toLowerCase();
    return personnel.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.role?.toLowerCase().includes(query)
    );
  }, [personnel, searchQuery]);

  // Handle resize drag
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
    try {
      // Create the notification
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

      // Create recipient records
      const recipientRecords = recipients.map(r => ({
        notification_id: notification.id,
        personnel_id: r.id,
      }));

      const { error: recipError } = await supabase
        .from('notification_recipients')
        .insert(recipientRecords);

      if (recipError) throw recipError;

      // Send email notifications if enabled
      if (sendEmail) {
        const emailRecipients = recipients.filter(r => r.email).map(r => r.email);
        if (emailRecipients.length > 0) {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              emails: emailRecipients,
              subject: subject.trim(),
              message: message.trim(),
              notificationId: notification.id,
            },
          });
        }
      }

      toast({
        title: 'Notification sent',
        description: `Successfully sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}.`,
      });

      // Reset form
      setSubject('');
      setMessage('');
      setSelectedGroups([]);
      setSelectedIndividuals([]);
      setSendEmail(false);
      setShowIndividualSelect(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send notification. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
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
            >
              <Users className="h-4 w-4 mr-2" />
              {showIndividualSelect ? 'Hide individual selection' : 'Or select individuals...'}
            </Button>
          </div>

          {/* Individual Personnel Selection */}
          {showIndividualSelect && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select individual personnel</Label>
              
              {/* Search field */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Resizable personnel list */}
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
                          onClick={() => toggleIndividual(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleIndividual(p.id);
                            }
                          }}
                        >
                          <Checkbox
                            checked={selectedIndividuals.includes(p.id)}
                            className="pointer-events-none"
                          />
                          <span className="text-sm flex-1 truncate">{p.name}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.role}</span>
                          {p.category === 'freelancer' && (
                            <Badge variant="secondary" className="text-xs bg-lavender-100 text-lavender-700 shrink-0">
                              Freelancer
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                
                {/* Resize handle */}
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
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedGroups.map(g => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {groupLabels[g]}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleGroup(g)} />
                  </Badge>
                ))}
                {selectedIndividuals.slice(0, 5).map(id => {
                  const p = personnel.find(per => per.id === id);
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

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter notification subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
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
            />
            <Label htmlFor="sendEmail" className="text-sm cursor-pointer">
              Also send email notification to recipients
            </Label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
