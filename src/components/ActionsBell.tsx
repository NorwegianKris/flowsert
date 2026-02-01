import { useState, useEffect } from 'react';
import { Bell, FileDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ExternalSharingDialog } from './ExternalSharingDialog';
import { NotificationDialog } from './NotificationDialog';
import { Project } from '@/hooks/useProjects';
import { Personnel } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  read_at: string | null;
  recipient_id: string;
}

interface ActionsBellProps {
  projects: Project[];
  personnel: Personnel[];
  personnelId?: string;
}

export function ActionsBell({ projects, personnel, personnelId }: ActionsBellProps) {
  const [externalSharingOpen, setExternalSharingOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const fetchNotifications = async () => {
    if (!personnelId) {
      setLoading(false);
      return;
    }

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

    if (personnelId) {
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
    }
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
    setNotificationsOpen(false);
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 relative">
            Actions
            <ChevronDown className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </DropdownMenuItem>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end" side="left">
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setExternalSharingOpen(true)}>
            <FileDown className="h-4 w-4 mr-2" />
            External Sharing
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExternalSharingDialog
        open={externalSharingOpen}
        onOpenChange={setExternalSharingOpen}
        projects={projects}
        personnel={personnel}
      />

      <NotificationDialog
        notification={selectedNotification}
        open={!!selectedNotification}
        onOpenChange={open => !open && setSelectedNotification(null)}
      />
    </>
  );
}
