import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePersonnel } from '@/hooks/usePersonnel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Loader2, ArrowLeft, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { Personnel } from '@/types';

interface Message {
  id: string;
  personnel_id: string;
  sender_id: string;
  sender_role: 'admin' | 'worker';
  content: string;
  read_at: string | null;
  created_at: string;
}

interface PersonnelChatSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unreadCounts: { personnelId: string; count: number }[];
  onMessagesRead: () => void;
}

export function PersonnelChatSidebar({ 
  open, 
  onOpenChange, 
  unreadCounts,
  onMessagesRead 
}: PersonnelChatSidebarProps) {
  const { user } = useAuth();
  const { personnel } = usePersonnel();
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter personnel with user_id (those who can receive messages)
  const chatEligiblePersonnel = personnel.filter(p => p.userId);

  // Sort personnel: unread first, then by name
  const sortedPersonnel = [...chatEligiblePersonnel].sort((a, b) => {
    const aUnread = unreadCounts.find(c => c.personnelId === a.id)?.count || 0;
    const bUnread = unreadCounts.find(c => c.personnelId === b.id)?.count || 0;
    
    if (aUnread > 0 && bUnread === 0) return -1;
    if (bUnread > 0 && aUnread === 0) return 1;
    return a.name.localeCompare(b.name);
  });

  // Filter by search
  const filteredPersonnel = sortedPersonnel.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch messages when personnel selected
  useEffect(() => {
    if (!selectedPersonnel) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('personnel_id', selectedPersonnel.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } else {
        setMessages((data as Message[]) || []);
      }
      setIsLoadingMessages(false);
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`personnel_chat_${selectedPersonnel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `personnel_id=eq.${selectedPersonnel.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPersonnel]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when viewing chat
  useEffect(() => {
    const markAsRead = async () => {
      if (!user || !selectedPersonnel) return;

      const unreadMessages = messages.filter(
        m => !m.read_at && m.sender_id !== user.id
      );

      if (unreadMessages.length > 0) {
        const { error } = await supabase
          .from('direct_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadMessages.map(m => m.id));

        if (!error) {
          onMessagesRead();
        }
      }
    };

    markAsRead();
  }, [messages, user, selectedPersonnel, onMessagesRead]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedPersonnel) return;

    setIsSending(true);
    const messageContent = newMessage.trim();

    const { error } = await supabase
      .from('direct_messages')
      .insert({
        personnel_id: selectedPersonnel.id,
        sender_id: user.id,
        sender_role: 'admin',
        content: messageContent
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } else {
      setNewMessage('');

      // Send email notification
      try {
        await supabase.functions.invoke('send-dm-notification', {
          body: {
            personnelId: selectedPersonnel.id,
            messageContent,
            senderName: 'Your employer'
          }
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    }
    return format(date, 'MMM d, HH:mm');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUnreadCount = (personnelId: string) => {
    return unreadCounts.find(c => c.personnelId === personnelId)?.count || 0;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-background border-l shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {selectedPersonnel ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPersonnel(null)}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex items-center gap-2 flex-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedPersonnel.avatarUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(selectedPersonnel.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold truncate">{selectedPersonnel.name}</span>
              </div>
            </>
          ) : (
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Personnel Chat
            </h2>
          )}
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Content */}
        {selectedPersonnel ? (
          // Chat View
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-xs mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    const isFromAdmin = message.sender_role === 'admin';

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex flex-col gap-1 max-w-[85%]',
                          isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'
                        )}
                      >
                        <div
                          className={cn(
                            'px-3 py-2 rounded-lg text-sm',
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>{isFromAdmin ? 'Admin' : 'Worker'}</span>
                          <span>·</span>
                          <span>{formatMessageDate(message.created_at)}</span>
                          {isOwnMessage && message.read_at && (
                            <>
                              <span>·</span>
                              <span className="text-primary">Read</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="resize-none text-sm min-h-[80px]"
                  disabled={isSending}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || isSending}
                  className="shrink-0 self-end"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Personnel List View
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search personnel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Personnel List */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {filteredPersonnel.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No personnel found</p>
                    <p className="text-xs mt-1">
                      {chatEligiblePersonnel.length === 0
                        ? 'Personnel need to register before you can chat'
                        : 'Try a different search term'}
                    </p>
                  </div>
                ) : (
                  filteredPersonnel.map((person) => {
                    const unread = getUnreadCount(person.id);

                    return (
                      <button
                        key={person.id}
                        onClick={() => setSelectedPersonnel(person)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={person.avatarUrl} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(person.name)}
                            </AvatarFallback>
                          </Avatar>
                          {unread > 0 && (
                            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-medium">
                              {unread}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{person.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {person.role}
                          </p>
                        </div>
                        {unread > 0 && (
                          <span className="text-xs text-destructive font-medium">
                            {unread} new
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
