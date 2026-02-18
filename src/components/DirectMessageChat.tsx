import { useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useState } from 'react';

interface DirectMessageChatProps {
  personnelId: string;
  personnelName: string;
}

export function DirectMessageChat({ personnelId, personnelName }: DirectMessageChatProps) {
  const { user, isAdmin } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const senderRole = isAdmin ? 'admin' : 'worker';
  const dm = useDirectMessages(personnelId, senderRole, isSheetOpen);

  // Scroll to bottom when messages change and sheet is open
  useEffect(() => {
    if (isSheetOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dm.messages, isSheetOpen]);

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-500" />
            Messages
            {dm.unreadCount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-medium">
                {dm.unreadCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SheetTrigger asChild>
            <button className="w-full text-left">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Click to open chat</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Send className="h-3.5 w-3.5" />
                    Send a message
                  </p>
                </div>
              </div>
            </button>
          </SheetTrigger>
        </CardContent>
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
              {dm.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : dm.messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Start the conversation!</p>
                </div>
              ) : (
                dm.messages.map((message) => {
                  const isOwnMessage = message.sender_id === user?.id;
                  const isFromAdmin = message.sender_role === 'admin';
                  return (
                    <div key={message.id} className={cn(
                      "flex flex-col gap-1 max-w-[85%]",
                      isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"
                    )}>
                      <div className={cn(
                        "px-3 py-2 rounded-lg text-sm",
                        isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
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
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="pt-3 border-t border-border mt-2">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={dm.newMessage}
                onChange={(e) => dm.setNewMessage(e.target.value)}
                onKeyDown={dm.handleKeyDown}
                className="resize-none text-sm min-h-[80px]"
                disabled={dm.isSending}
              />
              <Button 
                size="icon" 
                onClick={dm.handleSend} 
                disabled={!dm.newMessage.trim() || dm.isSending}
                className="shrink-0 self-end"
              >
                {dm.isSending ? (
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
