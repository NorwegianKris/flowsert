import { useState, useEffect } from 'react';
import { Bell, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { NotificationDialog } from './NotificationDialog';

interface Notification {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  read_at: string | null;
  recipient_id: string;
  type: 'notification' | 'direct_message';
}

interface NotificationBellProps {
  personnelId: string;
}

export function NotificationBell({ personnelId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadDMCount, setUnreadDMCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const unreadNotificationCount = notifications.filter(n => !n.read_at).length;
  const totalUnreadCount = unreadNotificationCount + unreadDMCount;

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
        type: 'notification' as const,
      }));

      setNotifications(mapped);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadDMCount = async () => {
    if (!personnelId) return;

    try {
      const { data: personnel } = await supabase
        .from('personnel')
        .select('user_id')
        .eq('id', personnelId)
        .single();

      if (!personnel?.user_id) return;

      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('personnel_id', personnelId)
        .eq('sender_role', 'admin')
        .is('read_at', null);

      if (error) throw error;
      setUnreadDMCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread DM count:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadDMCount();

    // Subscribe to notification changes
    const notificationChannel = supabase
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

    // Subscribe to direct message changes
    const dmChannel = supabase
      .channel(`dm_notifications_${personnelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `personnel_id=eq.${personnelId}`,
        },
        () => {
          fetchUnreadDMCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `personnel_id=eq.${personnelId}`,
        },
        () => {
          fetchUnreadDMCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(dmChannel);
    };
  }, [personnelId]);

  const handleNotificationClick = async (notification: Notification) => {
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
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">Notifications</h4>
              {unreadDMCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <MessageCircle className="h-3 w-3" />
                  {unreadDMCount} new message{unreadDMCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unreadNotificationCount > 0 && (
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
        onOpenChange={open => !open && setSelectedNotification(null)}
      />
    </>
  );
}
