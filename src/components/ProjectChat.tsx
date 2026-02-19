import { useState, useEffect, useRef } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';

interface ProjectMessage {
  id: string;
  project_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
}

interface ProjectChatProps {
  projectId: string;
  projectName: string;
  /** When false, the input area is hidden and a notice is shown instead. Defaults to true. */
  isAssigned?: boolean;
}

export function ProjectChat({ projectId, projectName, isAssigned = true }: ProjectChatProps) {
  const { user, profile, isAdmin } = useAuth();
  const canSend = isAdmin || isAssigned;
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('project_messages' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching project messages:', error);
        toast.error('Failed to load messages');
      } else {
        setMessages((data as unknown as ProjectMessage[]) || []);
      }
      setIsLoading(false);
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`project_messages_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          const newMsg = payload.new as ProjectMessage;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !profile) return;

    setIsSending(true);
    const { error } = await supabase
      .from('project_messages' as any)
      .insert({
        project_id: projectId,
        sender_id: user.id,
        sender_name: profile.full_name || profile.email,
        sender_role: isAdmin ? 'admin' : 'worker',
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

  const MessageBubble = ({ message }: { message: ProjectMessage }) => {
    const isOwnMessage = message.sender_id === user?.id;

    return (
      <div className={cn(
        "flex flex-col gap-1 max-w-[85%]",
        isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"
      )}>
        {!isOwnMessage && (
          <span className="text-xs font-medium text-muted-foreground">
            {message.sender_name}
          </span>
        )}
        <div className={cn(
          "px-3 py-2 rounded-lg text-sm",
          isOwnMessage
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}>
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>{message.sender_role === 'admin' ? 'Admin' : 'Worker'}</span>
          <span>·</span>
          <span>{formatMessageDate(message.created_at)}</span>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/50 flex flex-col h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between py-3 shrink-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          Project Chat
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {messages.length} messages
        </span>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
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
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {canSend ? (
          <div className="pt-3 border-t border-border mt-2 shrink-0">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type a message to the team..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="resize-none text-sm min-h-[60px]"
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
        ) : (
          <Alert className="mt-2 shrink-0">
            <Info className="h-4 w-4" />
            <AlertDescription>
              You can view messages but cannot send until you accept the project invitation.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
