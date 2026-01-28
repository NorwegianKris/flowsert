import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { NotificationDialog } from './NotificationDialog';

interface Notification {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  read_at: string | null;
  recipient_id: string;
}

interface NotificationBellProps {
  personnelId: string;
}

export function NotificationBell({ personnelId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const { user } = useAuth();

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const fetchNotifications = async () => {
    if (!personnelId) return;

    try {
      const { data, error } = await supabase
        .from('notification_recipients')
        .select(`
          id,
          read_at,
          created_at,
          notifications (
            id,
            subject,
            message,
            created_at
          )
        `)
        .eq('personnel_id', personnelId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped = (data || []).map((nr: any) => ({
        id: nr.notifications.id,
        subject: nr.notifications.subject,
        message: nr.notifications.message,
        created_at: nr.notifications.created_at,
        read_at: nr.read_at,
        recipient_id: nr.id,
      }));

      setNotifications(mapped);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notification_recipients_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_recipients',
          filter: `personnel_id=eq.${personnelId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [personnelId]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read_at) {
      await supabase
        .from('notification_recipients')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.recipient_id);

      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
    }

    setSelectedNotification(notification);
    setOpen(false);
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read_at);
    if (unread.length === 0) return;

    const recipientIds = unread.map(n => n.recipient_id);
    
    await supabase
      .from('notification_recipients')
      .update({ read_at: new Date().toISOString() })
      .in('id', recipientIds);

    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-3 border-b">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </div>
          <ScrollArea className="h-80">
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        !notification.read_at ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-2">
                        {!notification.read_at && (
                          <span className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${!notification.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.subject}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <NotificationDialog
        notification={selectedNotification}
        open={!!selectedNotification}
        onOpenChange={(open) => !open && setSelectedNotification(null)}
      />
    </>
  );
}
