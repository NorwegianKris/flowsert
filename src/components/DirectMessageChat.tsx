import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
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

interface DirectMessageChatProps {
  personnelId: string;
  personnelName: string;
}

export function DirectMessageChat({ personnelId, personnelName }: DirectMessageChatProps) {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const senderRole = isAdmin ? 'admin' : 'worker';

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
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
        setHasMore((data?.length || 0) >= 100);
      }
      setIsLoading(false);
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`direct_messages_${personnelId}`)
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
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [personnelId]);

  // Scroll to bottom when messages change and sheet is open
  useEffect(() => {
    if (isSheetOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSheetOpen]);

  // Mark messages as read when sheet opens
  useEffect(() => {
    const markAsRead = async () => {
      if (!user || !isSheetOpen) return;
      
      const unreadMessages = messages.filter(
        m => !m.read_at && m.sender_id !== user.id
      );
      
      if (unreadMessages.length > 0) {
        const { error } = await supabase
          .from('direct_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadMessages.map(m => m.id));
        
        if (error) {
          console.error('Error marking messages as read:', error);
        }
      }
    };

    markAsRead();
  }, [messages, user, isSheetOpen]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    const { error } = await supabase
      .from('direct_messages')
      .insert({
        personnel_id: personnelId,
        sender_id: user.id,
        sender_role: senderRole,
        content: newMessage.trim()
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
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

  const MessageBubble = ({ message }: { message: Message }) => {
    const isOwnMessage = message.sender_id === user?.id;
    const isFromAdmin = message.sender_role === 'admin';

    return (
      <div className={cn(
        "flex flex-col gap-1 max-w-[85%]",
        isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"
      )}>
        <div className={cn(
          "px-3 py-2 rounded-lg text-sm",
          isOwnMessage 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-foreground"
        )}>
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
  };

  const unreadCount = messages.filter(
    m => !m.read_at && m.sender_id !== user?.id
  ).length;

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <Card className="border-border/50">
        <SheetTrigger asChild>
          <button className="w-full text-left">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-foreground">Messages</span>
                  {unreadCount > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-xs min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-medium">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <span className="text-sm">Send a message</span>
                  <Send className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </button>
        </SheetTrigger>
      </Card>

      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            Chat with {personnelName}
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 flex flex-col min-h-0 mt-4">
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-3 py-2">
              {isLoading ? (
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
                <>
                  {hasMore && (
                    <p className="text-xs text-center text-muted-foreground py-2">
                      Showing last 100 messages
                    </p>
                  )}
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="pt-3 border-t border-border mt-2">
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
      </SheetContent>
    </Sheet>
  );
}
