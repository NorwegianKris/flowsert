import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadMessageCount {
  personnelId: string;
  count: number;
}

export function useUnreadDirectMessages() {
  const { user, isAdmin } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadMessageCount[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) {
      setUnreadCounts([]);
      setTotalUnread(0);
      setIsLoading(false);
      return;
    }

    const fetchUnreadCounts = async () => {
      setIsLoading(true);
      
      // Fetch all unread messages where the sender is a worker (not admin)
      const { data, error } = await supabase
        .from('direct_messages')
        .select('personnel_id')
        .eq('sender_role', 'worker')
        .is('read_at', null);

      if (error) {
        console.error('Error fetching unread messages:', error);
        setIsLoading(false);
        return;
      }

      // Group by personnel_id and count
      const countMap = new Map<string, number>();
      data?.forEach(msg => {
        const current = countMap.get(msg.personnel_id) || 0;
        countMap.set(msg.personnel_id, current + 1);
      });

      const counts = Array.from(countMap.entries()).map(([personnelId, count]) => ({
        personnelId,
        count
      }));

      setUnreadCounts(counts);
      setTotalUnread(counts.reduce((sum, c) => sum + c.count, 0));
      setIsLoading(false);
    };

    fetchUnreadCounts();

    // Subscribe to realtime updates for new messages
    const channel = supabase
      .channel('admin_unread_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages'
        },
        (payload) => {
          const newMsg = payload.new as { personnel_id: string; sender_role: string; read_at: string | null };
          // Only count messages from workers that are unread
          if (newMsg.sender_role === 'worker' && !newMsg.read_at) {
            setUnreadCounts(prev => {
              const existing = prev.find(c => c.personnelId === newMsg.personnel_id);
              if (existing) {
                return prev.map(c => 
                  c.personnelId === newMsg.personnel_id 
                    ? { ...c, count: c.count + 1 }
                    : c
                );
              }
              return [...prev, { personnelId: newMsg.personnel_id, count: 1 }];
            });
            setTotalUnread(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages'
        },
        (payload) => {
          const updated = payload.new as { personnel_id: string; sender_role: string; read_at: string | null };
          const old = payload.old as { read_at: string | null };
          
          // If message was marked as read
          if (updated.sender_role === 'worker' && !old.read_at && updated.read_at) {
            setUnreadCounts(prev => {
              return prev.map(c => 
                c.personnelId === updated.personnel_id 
                  ? { ...c, count: Math.max(0, c.count - 1) }
                  : c
              ).filter(c => c.count > 0);
            });
            setTotalUnread(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const getUnreadCountForPersonnel = (personnelId: string) => {
    return unreadCounts.find(c => c.personnelId === personnelId)?.count || 0;
  };

  const refetchCounts = async () => {
    if (!user || !isAdmin) return;
    
    const { data, error } = await supabase
      .from('direct_messages')
      .select('personnel_id')
      .eq('sender_role', 'worker')
      .is('read_at', null);

    if (error) {
      console.error('Error fetching unread messages:', error);
      return;
    }

    const countMap = new Map<string, number>();
    data?.forEach(msg => {
      const current = countMap.get(msg.personnel_id) || 0;
      countMap.set(msg.personnel_id, current + 1);
    });

    const counts = Array.from(countMap.entries()).map(([personnelId, count]) => ({
      personnelId,
      count
    }));

    setUnreadCounts(counts);
    setTotalUnread(counts.reduce((sum, c) => sum + c.count, 0));
  };

  return {
    unreadCounts,
    totalUnread,
    isLoading,
    getUnreadCountForPersonnel,
    refetchCounts
  };
}
