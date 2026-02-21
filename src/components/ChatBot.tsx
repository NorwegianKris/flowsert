import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, X, Send, User, Loader2, ArrowLeft, Search, Sparkles, Building2, FolderOpen, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import flowsertLogo from '@/assets/flowsert-logo.png';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useWorkerBusinesses, WorkerBusiness } from '@/hooks/useWorkerBusinesses';
import { useUnreadDirectMessages } from '@/hooks/useUnreadDirectMessages';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';

type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatView =
  | 'picker'
  | 'admin-personnel-select'
  | 'admin-personnel-chat'
  | 'worker-admin-select'
  | 'worker-admin-chat'
  | 'ai'
  | 'project-select'
  | 'project-chat';

interface ChatBotProps {
  isAdmin?: boolean;
}

export function ChatBot({ isAdmin = false }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('chatbot-open');
    return stored === null ? true : stored === 'true';
  });
  const [view, setView] = useState<ChatView>('picker');

  // AI chat state (preserved across view changes)
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  // Direct message state
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);
  const [selectedChatName, setSelectedChatName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Project chat state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [projectFilter, setProjectFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [projectMessages, setProjectMessages] = useState<Array<{
    id: string; project_id: string; sender_id: string; sender_name: string; sender_role: string; content: string; created_at: string;
  }>>([]);
  const [projectMsgInput, setProjectMsgInput] = useState('');
  const [projectMsgLoading, setProjectMsgLoading] = useState(false);
  const [projectMsgSending, setProjectMsgSending] = useState(false);
  const [projectList, setProjectList] = useState<Array<{ id: string; name: string; status: string; assigned_personnel: string[] | null }>>([]);
  const [projectListLoading, setProjectListLoading] = useState(false);
  const projectScrollRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  // Derived isViewOpen for useDirectMessages
  const isDmViewOpen = view === 'admin-personnel-chat' || view === 'worker-admin-chat';

  const dm = useDirectMessages(
    selectedPersonnelId,
    isAdmin ? 'admin' : 'worker',
    isDmViewOpen
  );

  // Admin: personnel list + unread counts
  const { personnel } = usePersonnel();
  const { unreadCounts, totalUnread } = useUnreadDirectMessages();

  // Worker: businesses
  const { businesses: workerBusinesses, loading: workerBizLoading } = useWorkerBusinesses();

  // Worker unread count
  const [workerUnreadCount, setWorkerUnreadCount] = useState(0);
  useEffect(() => {
    if (isAdmin || workerBusinesses.length === 0) {
      setWorkerUnreadCount(0);
      return;
    }
    const personnelIds = workerBusinesses.map(b => b.personnelId);
    const fetchWorkerUnread = async () => {
      const { count, error } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .in('personnel_id', personnelIds)
        .eq('sender_role', 'admin')
        .is('read_at', null);

      if (!error) {
        setWorkerUnreadCount(count || 0);
      }
    };
    fetchWorkerUnread();

    // Subscribe for live updates
    const channel = supabase
      .channel('worker_unread_badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        () => { fetchWorkerUnread(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, workerBusinesses]);

  // Persist open/closed state
  useEffect(() => {
    localStorage.setItem('chatbot-open', String(isOpen));
  }, [isOpen]);

  // Scroll AI messages
  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // DM scroll ref
  const dmScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (dmScrollRef.current && isDmViewOpen) {
      dmScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dm.messages, isDmViewOpen]);

  // Fetch projects for selection
  useEffect(() => {
    if (view !== 'project-select') return;
    const fetchProjects = async () => {
      setProjectListLoading(true);
      try {
        if (isAdmin) {
          const { data, error } = await supabase
            .from('projects')
            .select('id, name, status, assigned_personnel')
            .order('created_at', { ascending: false });
          if (!error && data) setProjectList(data);
        } else {
          // Worker: find projects they're assigned to
          const activatedPersonnelIds = workerBusinesses.filter(b => b.activated).map(b => b.personnelId);
          if (activatedPersonnelIds.length === 0) { setProjectList([]); setProjectListLoading(false); return; }
          const { data, error } = await supabase
            .from('projects')
            .select('id, name, status, assigned_personnel')
            .order('created_at', { ascending: false });
          if (!error && data) {
            const workerProjects = data.filter(p =>
              p.assigned_personnel?.some(pid => activatedPersonnelIds.includes(pid))
            );
            setProjectList(workerProjects);
          }
        }
      } catch (e) { console.error('Error fetching projects:', e); }
      setProjectListLoading(false);
    };
    fetchProjects();
  }, [view, isAdmin, workerBusinesses]);

  // Fetch project messages + realtime
  useEffect(() => {
    if (view !== 'project-chat' || !selectedProjectId) return;
    const fetchMessages = async () => {
      setProjectMsgLoading(true);
      const { data, error } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (!error && data) setProjectMessages(data as any);
      setProjectMsgLoading(false);
    };
    fetchMessages();
    const channel = supabase
      .channel(`hub_project_messages_${selectedProjectId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'project_messages',
        filter: `project_id=eq.${selectedProjectId}`
      }, (payload) => {
        setProjectMessages(prev => [...prev, payload.new as any]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [view, selectedProjectId]);

  // Scroll project messages
  useEffect(() => {
    if (projectScrollRef.current && view === 'project-chat') {
      projectScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [projectMessages, view]);

  // Check if current user is assigned to selected project
  const isAssignedToProject = (() => {
    if (isAdmin) return true;
    if (!selectedProjectId) return false;
    const proj = projectList.find(p => p.id === selectedProjectId);
    if (!proj) return false;
    const activatedPersonnelIds = workerBusinesses.filter(b => b.activated).map(b => b.personnelId);
    return proj.assigned_personnel?.some(pid => activatedPersonnelIds.includes(pid)) ?? false;
  })();

  // Navigate back to picker, resetting DM state
  const goToPicker = () => {
    setView('picker');
    setSelectedPersonnelId(null);
    setSelectedChatName('');
    setSearchQuery('');
    setSelectedProjectId(null);
    setSelectedProjectName('');
    setProjectMessages([]);
    setProjectMsgInput('');
  };

  const sendProjectMessage = async () => {
    if (!projectMsgInput.trim() || !user || !selectedProjectId) return;
    setProjectMsgSending(true);
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    const senderName = profileData?.full_name || profileData?.email || user.email || 'Unknown';
    const { error } = await supabase
      .from('project_messages')
      .insert({
        project_id: selectedProjectId,
        sender_id: user.id,
        sender_name: senderName,
        sender_role: isAdmin ? 'admin' : 'worker',
        content: projectMsgInput.trim()
      });
    if (error) {
      console.error('Error sending project message:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message' });
    } else {
      setProjectMsgInput('');
    }
    setProjectMsgSending(false);
  };

  // Total badge count for floating button
  const badgeCount = isAdmin ? totalUnread : workerUnreadCount;

  // --- AI Chat send ---
  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMessage: AiMessage = { role: 'user', content: aiInput.trim() };
    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setAiLoading(true);

    let assistantContent = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('You must be logged in to use the chat assistant');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/certificate-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ messages: [...aiMessages, userMessage] }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setAiMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({ variant: 'destructive', title: 'Chat Error', description: error instanceof Error ? error.message : 'Failed to send message' });
    } finally {
      setAiLoading(false);
    }
  };

  // --- Helpers ---
  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // --- Admin: select personnel for chat ---
  const chatEligiblePersonnel = personnel.filter(p => p.userId);
  const sortedPersonnel = [...chatEligiblePersonnel].sort((a, b) => {
    const aUnread = unreadCounts.find(c => c.personnelId === a.id)?.count || 0;
    const bUnread = unreadCounts.find(c => c.personnelId === b.id)?.count || 0;
    if (aUnread > 0 && bUnread === 0) return -1;
    if (bUnread > 0 && aUnread === 0) return 1;
    return a.name.localeCompare(b.name);
  });
  const filteredPersonnel = sortedPersonnel.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Worker: handle business click ---
  const handleWorkerChatClick = () => {
    if (workerBusinesses.length === 0) return;
    if (workerBusinesses.length === 1) {
      setSelectedPersonnelId(workerBusinesses[0].personnelId);
      setSelectedChatName(workerBusinesses[0].businessName);
      setView('worker-admin-chat');
    } else {
      setView('worker-admin-select');
    }
  };

  // --- Floating button (closed state) ---
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-16 px-6 rounded-full shadow-xl gap-3 text-lg font-bold animate-pulse hover:animate-none"
        >
          <MessageCircle className="h-9 w-9" />
          <span>Chat</span>
        </Button>
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-xs min-w-[20px] h-[20px] flex items-center justify-center px-1 rounded-full font-medium">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
    );
  }

  // --- Render header ---
  const renderHeader = () => {
    if (view === 'picker') {
      return (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="h-6 w-6 overflow-hidden flex-shrink-0 relative">
              <img src={flowsertLogo} alt="" className="absolute h-6 w-auto max-w-none" style={{ left: 0, transform: 'scale(1.1)', transformOrigin: 'left center' }} />
            </div>
            Flowsert Chat
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
      );
    }

    let title = '';
    if (view === 'admin-personnel-select') title = 'Personnel Chat';
    else if (view === 'admin-personnel-chat') title = selectedChatName;
    else if (view === 'worker-admin-select') title = 'Select Company';
    else if (view === 'worker-admin-chat') title = selectedChatName;
    else if (view === 'ai') title = 'AI Assistant';
    else if (view === 'project-select') title = 'Project Chat';
    else if (view === 'project-chat') title = selectedProjectName;

    return (
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={goToPicker}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base font-semibold truncate">{title}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
    );
  };

  // --- Render picker view ---
  const renderPicker = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <button
        onClick={() => {
          if (isAdmin) setView('admin-personnel-select');
          else handleWorkerChatClick();
        }}
        disabled={!isAdmin && workerBusinesses.length === 0}
        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed relative"
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{isAdmin ? 'Personnel Chat' : 'Admin Chat'}</p>
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? 'Message your team members'
              : workerBusinesses.length === 0
                ? 'No company linked'
                : 'Chat with your employer'}
          </p>
        </div>
        {badgeCount > 0 && (
          <span className="ml-auto bg-destructive text-destructive-foreground text-xs min-w-[20px] h-[20px] flex items-center justify-center px-1 rounded-full font-medium">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      <button
        onClick={() => setView('project-select')}
        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors text-left"
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <FolderOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">Project Chat</p>
          <p className="text-xs text-muted-foreground">Chat with your project team</p>
        </div>
      </button>

      <button
        onClick={() => setView('ai')}
        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors text-left"
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">AI Assistant</p>
          <p className="text-xs text-muted-foreground">
            {isAdmin ? 'Ask about personnel, certificates & projects' : 'Ask about your profile & certificates'}
          </p>
        </div>
      </button>
    </div>
  );

  // --- Admin personnel select ---
  const renderAdminPersonnelSelect = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search personnel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredPersonnel.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No personnel found</p>
            </div>
          ) : (
            filteredPersonnel.map(person => {
              const unread = unreadCounts.find(c => c.personnelId === person.id)?.count || 0;
              return (
                <button
                  key={person.id}
                  onClick={() => {
                    setSelectedPersonnelId(person.id);
                    setSelectedChatName(person.name);
                    setView('admin-personnel-chat');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={person.avatarUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs min-w-[16px] h-[16px] flex items-center justify-center px-0.5 rounded-full font-medium">
                        {unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{person.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // --- Worker company select (multi-business) ---
  const renderWorkerCompanySelect = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1">
        <div className="p-2">
          {workerBusinesses.map(biz => (
            <button
              key={biz.personnelId}
              onClick={() => {
                setSelectedPersonnelId(biz.personnelId);
                setSelectedChatName(biz.businessName);
                setView('worker-admin-chat');
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <Avatar className="h-9 w-9 border border-border">
                {biz.businessLogoUrl ? (
                  <AvatarImage src={biz.businessLogoUrl} alt={biz.businessName} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(biz.businessName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm font-medium truncate">{biz.businessName}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  // --- DM chat view (shared for admin + worker) ---
  const renderDmChat = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
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
            dm.messages.map(message => {
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
                  <div className={cn(
                    'px-3 py-2 rounded-lg text-sm',
                    isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
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
          <div ref={dmScrollRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            value={dm.newMessage}
            onChange={(e) => dm.setNewMessage(e.target.value)}
            onKeyDown={dm.handleKeyDown}
            className="resize-none text-sm min-h-[60px]"
            disabled={dm.isSending}
          />
          <Button
            size="icon"
            onClick={dm.handleSend}
            disabled={!dm.newMessage.trim() || dm.isSending}
            className="shrink-0 self-end"
          >
            {dm.isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );

  // --- AI chat view ---
  const renderAiChat = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 p-4" ref={aiScrollRef}>
        {aiMessages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <div className="text-4xl mb-3">🤖</div>
            <p className="font-medium mb-1">Hi! I'm your {isAdmin ? 'Admin' : 'Personal'} Assistant</p>
            <p className="text-xs">
              {isAdmin
                ? 'Ask me about personnel, certificates, projects, calendars, and team availability.'
                : 'Ask me anything about your profile, certificates, projects, or availability.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {aiMessages.map((message, i) => (
              <div key={i} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="h-7 w-7 overflow-hidden flex-shrink-0 relative">
                    <img src={flowsertLogo} alt="" className="absolute h-7 w-auto max-w-none" style={{ left: 0, transform: 'scale(1.1)', transformOrigin: 'left center' }} />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {aiLoading && aiMessages[aiMessages.length - 1]?.role === 'user' && (
              <div className="flex gap-2 justify-start">
                <div className="h-7 w-7 overflow-hidden flex-shrink-0 relative">
                  <img src={flowsertLogo} alt="" className="absolute h-7 w-auto max-w-none" style={{ left: 0, transform: 'scale(1.1)', transformOrigin: 'left center' }} />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
            disabled={aiLoading}
            className="flex-1"
          />
          <Button onClick={sendAiMessage} disabled={aiLoading || !aiInput.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // --- Project select view ---
  const renderProjectSelect = () => {
    const filtered = projectFilter === 'all'
      ? projectList
      : projectList.filter(p => p.status === projectFilter);

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {isAdmin && (
          <div className="p-3 border-b border-border">
            <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v as any)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Projects</SelectItem>
                <SelectItem value="completed">Completed Projects</SelectItem>
                <SelectItem value="all">All Projects</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {projectListLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No projects found</p>
              </div>
            ) : (
              filtered.map(project => (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setSelectedProjectName(project.name);
                    setView('project-chat');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FolderOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{project.name}</p>
                    <Badge variant={project.status === 'active' ? 'active' : project.status === 'completed' ? 'completed' : 'outline'} className="text-[10px] mt-0.5">
                      {project.status}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // --- Project chat view ---
  const renderProjectChat = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {projectMsgLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : projectMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          ) : (
            projectMessages.map(message => {
              const isOwnMessage = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex flex-col gap-1 max-w-[85%]',
                    isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'
                  )}
                >
                  {!isOwnMessage && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {message.sender_name}
                    </span>
                  )}
                  <div className={cn(
                    'px-3 py-2 rounded-lg text-sm',
                    isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
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
            })
          )}
          <div ref={projectScrollRef} />
        </div>
      </ScrollArea>

      {isAssignedToProject ? (
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type a message to the team..."
              value={projectMsgInput}
              onChange={(e) => setProjectMsgInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendProjectMessage(); } }}
              className="resize-none text-sm min-h-[60px]"
              disabled={projectMsgSending}
            />
            <Button
              size="icon"
              onClick={sendProjectMessage}
              disabled={!projectMsgInput.trim() || projectMsgSending}
              className="shrink-0 self-end"
            >
              {projectMsgSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-border">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              You can view messages but cannot send until you accept the project invitation.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );

  // --- Render content based on view ---
  const renderContent = () => {
    switch (view) {
      case 'picker': return renderPicker();
      case 'admin-personnel-select': return renderAdminPersonnelSelect();
      case 'admin-personnel-chat':
      case 'worker-admin-chat': return renderDmChat();
      case 'worker-admin-select': return renderWorkerCompanySelect();
      case 'ai': return renderAiChat();
      case 'project-select': return renderProjectSelect();
      case 'project-chat': return renderProjectChat();
    }
  };

  return (
    <Card className="fixed bottom-24 right-6 w-96 h-[500px] shadow-xl z-50 flex flex-col border-border">
      {renderHeader()}
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
