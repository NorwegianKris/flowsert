import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Message {
  id: string;
  personnel_id: string;
  sender_id: string;
  sender_role: 'admin' | 'worker';
  content: string;
  read_at: string | null;
  created_at: string;
}

export function useDirectMessages(
  personnelId: string | null,
  senderRole: 'admin' | 'worker',
  isViewOpen: boolean
) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const fetchedRef = useRef(false);

  // Opposite role for mark-as-read
  const oppositeRole = senderRole === 'admin' ? 'worker' : 'admin';

  // Unread count from opposite role
  const unreadCount = messages.filter(
    m => !m.read_at && m.sender_role === oppositeRole
  ).length;

  // Fetch messages + subscribe to realtime
  useEffect(() => {
    if (!personnelId) {
      setMessages([]);
      setIsLoading(false);
      fetchedRef.current = false;
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    fetchedRef.current = false;

    const init = async () => {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('personnel_id', personnelId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } else {
        setMessages((data as Message[]) || []);
      }
      setIsLoading(false);
      fetchedRef.current = true;

      // Subscribe only after initial fetch
      channel = supabase
        .channel(`dm_${personnelId}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `personnel_id=eq.${personnelId}`
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => {
              // Deduplicate by id (safety net)
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [personnelId]);

  // Mark as read when view is open and there are unread messages from opposite role
  useEffect(() => {
    if (!isViewOpen || !user || !personnelId) return;

    const unreadFromOpposite = messages.filter(
      m => !m.read_at && m.sender_role === oppositeRole
    );

    if (unreadFromOpposite.length === 0) return;

    const markAsRead = async () => {
      const { error } = await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadFromOpposite.map(m => m.id));

      if (error) {
        console.error('Error marking messages as read:', error);
      } else {
        // Update local state
        setMessages(prev =>
          prev.map(m =>
            unreadFromOpposite.some(u => u.id === m.id)
              ? { ...m, read_at: new Date().toISOString() }
              : m
          )
        );
      }
    };

    markAsRead();
  }, [isViewOpen, messages, user, personnelId, oppositeRole]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !user || !personnelId) return;

    setIsSending(true);
    const messageContent = newMessage.trim();

    const { error } = await supabase
      .from('direct_messages')
      .insert({
        personnel_id: personnelId,
        sender_id: user.id,
        sender_role: senderRole,
        content: messageContent
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } else {
      setNewMessage('');

      // Send email notification if admin is messaging a worker
      if (senderRole === 'admin') {
        try {
          await supabase.functions.invoke('send-dm-notification', {
            body: {
              personnelId,
              messageContent,
              senderName: 'Your employer'
            }
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }
    }
    setIsSending(false);
  }, [newMessage, user, personnelId, senderRole]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return {
    messages,
    isLoading,
    isSending,
    newMessage,
    setNewMessage,
    handleSend,
    handleKeyDown,
    unreadCount
  };
}
