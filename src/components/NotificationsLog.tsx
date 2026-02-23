import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Users, ArrowLeft, Check, Clock, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Recipient {
  id: string;
  personnel_id: string;
  read_at: string | null;
  personnel_name: string;
  personnel_email: string;
}

interface NotificationWithRecipients {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  recipient_count: number;
  read_count: number;
  recipients?: Recipient[];
}

interface NotificationsLogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsLog({ open, onOpenChange }: NotificationsLogProps) {
  const [notifications, setNotifications] = useState<NotificationWithRecipients[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<NotificationWithRecipients | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [messageHeight, setMessageHeight] = useState(200);
  const { businessId } = useAuth();

  useEffect(() => {
    if (open && businessId) {
      fetchNotifications();
    }
    if (!open) {
      setSelectedNotification(null);
      setMessageHeight(200);
    }
  }, [open, businessId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data: notificationsData, error: notifError } = await supabase
        .from('notifications')
        .select('id, subject, message, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;

      const notificationsWithCounts = await Promise.all(
        (notificationsData || []).map(async (notification) => {
          const { data: recipients, error: recipError } = await supabase
            .from('notification_recipients')
            .select('id, read_at')
            .eq('notification_id', notification.id);

          if (recipError) {
            console.error('Error fetching recipients:', recipError);
            return {
              ...notification,
              recipient_count: 0,
              read_count: 0,
            };
          }

          return {
            ...notification,
            recipient_count: recipients?.length || 0,
            read_count: recipients?.filter(r => r.read_at !== null).length || 0,
          };
        })
      );

      setNotifications(notificationsWithCounts);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNotification = async (notification: NotificationWithRecipients) => {
    setSelectedNotification(notification);
    setLoadingRecipients(true);

    try {
      const { data: recipientsData, error: recipError } = await supabase
        .from('notification_recipients')
        .select('id, personnel_id, read_at')
        .eq('notification_id', notification.id);

      if (recipError) throw recipError;

      const recipientsWithNames = await Promise.all(
        (recipientsData || []).map(async (recipient) => {
          const { data: personnel, error: persError } = await supabase
            .from('personnel')
            .select('name, email')
            .eq('id', recipient.personnel_id)
            .maybeSingle();

          return {
            ...recipient,
            personnel_name: personnel?.name || 'Unknown',
            personnel_email: personnel?.email || '',
          };
        })
      );

      setSelectedNotification({
        ...notification,
        recipients: recipientsWithNames,
      });
    } catch (error) {
      console.error('Error fetching recipient details:', error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleBack = () => {
    setSelectedNotification(null);
    setMessageHeight(200);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = messageHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(100, Math.min(400, startHeight + delta));
      setMessageHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedNotification ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 mr-1"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                Notification Details
              </>
            ) : (
              <>
                <Mail className="h-5 w-5 text-primary" />
                Notifications Log
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedNotification
              ? 'View the full notification and recipient list.'
              : 'View all notifications sent to your personnel.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedNotification ? (
            // Detail view
            <div className="flex flex-col space-y-4">
              {/* Notification content - resizable */}
              <div className="border rounded-lg overflow-hidden shrink-0">
                <div 
                  style={{ height: messageHeight }} 
                  className="p-4 bg-muted/30 overflow-y-auto"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-semibold text-lg text-foreground">
                      {selectedNotification.subject}
                    </h3>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(selectedNotification.created_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedNotification.message}
                  </p>
                </div>
                {/* Resize handle */}
                <div
                  className="h-3 bg-muted/50 hover:bg-muted cursor-ns-resize flex items-center justify-center border-t"
                  onMouseDown={handleResizeStart}
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground rotate-90" />
                </div>
              </div>

              {/* Recipients list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Recipients ({selectedNotification.recipient_count})
                  </h4>
                  <Badge variant={selectedNotification.read_count === selectedNotification.recipient_count ? 'default' : 'secondary'}>
                    {selectedNotification.read_count}/{selectedNotification.recipient_count} read
                  </Badge>
                </div>

                {loadingRecipients ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedNotification.recipients?.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-background"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {recipient.personnel_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {recipient.personnel_email}
                          </p>
                        </div>
                        <div className="shrink-0 ml-3">
                          {recipient.read_at ? (
                            <Badge variant="default" className="text-xs flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Read
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Unread
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mb-4 opacity-50" />
              <p>No notifications have been sent yet.</p>
            </div>
          ) : (
            // List view - plain div, parent handles scroll
            <div className="space-y-3 pb-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  role="button"
                  tabIndex={0}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleSelectNotification(notification)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectNotification(notification);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {notification.subject}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {notification.recipient_count}
                        </Badge>
                        <Badge 
                          variant={notification.read_count === notification.recipient_count ? 'default' : 'outline'} 
                          className="text-xs"
                        >
                          {notification.read_count}/{notification.recipient_count} read
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
