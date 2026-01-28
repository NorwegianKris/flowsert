import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface NotificationWithRecipients {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  recipient_count: number;
  read_count: number;
}

interface NotificationsLogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsLog({ open, onOpenChange }: NotificationsLogProps) {
  const [notifications, setNotifications] = useState<NotificationWithRecipients[]>([]);
  const [loading, setLoading] = useState(true);
  const { businessId } = useAuth();

  useEffect(() => {
    if (open && businessId) {
      fetchNotifications();
    }
  }, [open, businessId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // First fetch all notifications for the business
      const { data: notificationsData, error: notifError } = await supabase
        .from('notifications')
        .select('id, subject, message, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;

      // For each notification, get recipient counts
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Notifications Log
          </DialogTitle>
          <DialogDescription>
            View all notifications sent to your personnel.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mb-4 opacity-50" />
            <p>No notifications have been sent yet.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 pb-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
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
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
