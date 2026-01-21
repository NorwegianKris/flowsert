import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { getCertificateStatus, getDaysUntilExpiry } from '@/lib/certificateUtils';
import { useToast } from '@/hooks/use-toast';
import { useWorkerPersonnel, usePersonnel } from '@/hooks/usePersonnel';
import { useAssignedProjects, } from '@/components/AssignedProjects';
import { useProjects, Project } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { Personnel } from '@/types';
import { format } from 'date-fns';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

interface AvailabilityEntry {
  date: string;
  status: string;
  notes: string | null;
  personnel_id: string;
}

interface ChatBotProps {
  isAdmin?: boolean;
}

function generateWorkerContext(
  personnel: Personnel | null,
  projects: Project[],
  availability: AvailabilityEntry[]
) {
  if (!personnel) {
    return 'No personnel data available.';
  }

  // Personal Information
  const personalInfo = `
=== PERSONAL INFORMATION ===
Name: ${personnel.name}
Role: ${personnel.role}
Location: ${personnel.location}
Email: ${personnel.email}
Phone: ${personnel.phone}
Nationality: ${personnel.nationality || 'Not specified'}
Gender: ${personnel.gender || 'Not specified'}
Language: ${personnel.language || 'Norwegian'}
Address: ${personnel.address || 'Not specified'}
Postal Code: ${personnel.postalCode || 'Not specified'}
Postal Address: ${personnel.postalAddress || 'Not specified'}
Norwegian ID: ${personnel.nationalId || 'Not specified'}
Salary Account: ${personnel.salaryAccountNumber || 'Not specified'}`;

  // Next of Kin
  const nextOfKin = `
=== NEXT OF KIN ===
Name: ${personnel.nextOfKinName || 'Not specified'}
Relation: ${personnel.nextOfKinRelation || 'Not specified'}
Phone: ${personnel.nextOfKinPhone || 'Not specified'}`;

  // Certificates
  const certDetails = personnel.certificates.length > 0
    ? personnel.certificates.map(cert => {
        const status = getCertificateStatus(cert.expiryDate);
        const daysLeft = getDaysUntilExpiry(cert.expiryDate);
        const daysText = daysLeft === null 
          ? 'No expiry date' 
          : daysLeft < 0 
            ? `Expired ${Math.abs(daysLeft)} days ago`
            : `${daysLeft} days until expiry`;
        
        return `  - ${cert.name}
    Category: ${cert.category || 'Uncategorized'}
    Status: ${status.toUpperCase()}
    Issuing Authority: ${cert.issuingAuthority || 'Not specified'}
    Issued: ${cert.dateOfIssue}
    Expires: ${cert.expiryDate || 'Never'}
    Place of Issue: ${cert.placeOfIssue}
    ${daysText}`;
      }).join('\n\n')
    : '  No certificates on file';

  const certificatesSection = `
=== CERTIFICATES ===
Total: ${personnel.certificates.length}
${certDetails}`;

  // Projects
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'pending');
  const completedProjects = projects.filter(p => p.status === 'completed');

  const formatProject = (p: Project) => {
    const calendarItems = p.calendarItems && p.calendarItems.length > 0
      ? p.calendarItems.map(item => `    - ${format(new Date(item.date), 'MMM d, yyyy')}: ${item.description}`).join('\n')
      : '    No scheduled events';
    
    return `  - ${p.name}
    Status: ${p.status.toUpperCase()}
    Description: ${p.description}
    Start Date: ${format(new Date(p.startDate), 'MMM d, yyyy')}
    End Date: ${p.endDate ? format(new Date(p.endDate), 'MMM d, yyyy') : 'Ongoing'}
    Calendar Events:
${calendarItems}`;
  };

  const projectsSection = `
=== ASSIGNED PROJECTS ===
Active/Pending Projects (${activeProjects.length}):
${activeProjects.length > 0 ? activeProjects.map(formatProject).join('\n\n') : '  No active projects'}

Completed Projects (${completedProjects.length}):
${completedProjects.length > 0 ? completedProjects.map(formatProject).join('\n\n') : '  No completed projects'}`;

  // Availability
  const availabilitySection = availability.length > 0
    ? `
=== AVAILABILITY ===
${availability.map(a => `  - ${format(new Date(a.date), 'MMM d, yyyy')}: ${a.status.toUpperCase()}${a.notes ? ` (${a.notes})` : ''}`).join('\n')}`
    : `
=== AVAILABILITY ===
  No availability entries recorded`;

  return `${personalInfo}
${nextOfKin}
${certificatesSection}
${projectsSection}
${availabilitySection}`;
}

function generateAdminContext(
  allPersonnel: Personnel[],
  allProjects: Project[],
  allAvailability: AvailabilityEntry[]
) {
  if (allPersonnel.length === 0 && allProjects.length === 0) {
    return 'No data available.';
  }

  // Personnel Overview
  const personnelSection = `
=== PERSONNEL OVERVIEW (${allPersonnel.length} total) ===
${allPersonnel.map(p => {
    const validCerts = p.certificates.filter(c => getCertificateStatus(c.expiryDate) === 'valid').length;
    const expiringCerts = p.certificates.filter(c => getCertificateStatus(c.expiryDate) === 'expiring').length;
    const expiredCerts = p.certificates.filter(c => getCertificateStatus(c.expiryDate) === 'expired').length;
    
    return `
  ${p.name}
    Role: ${p.role}
    Location: ${p.location}
    Email: ${p.email}
    Phone: ${p.phone}
    Certificates: ${p.certificates.length} total (${validCerts} valid, ${expiringCerts} expiring soon, ${expiredCerts} expired)
    ${p.certificates.map(cert => {
      const status = getCertificateStatus(cert.expiryDate);
      const daysLeft = getDaysUntilExpiry(cert.expiryDate);
      const daysText = daysLeft === null 
        ? 'No expiry' 
        : daysLeft < 0 
          ? `Expired ${Math.abs(daysLeft)} days ago`
          : `${daysLeft} days left`;
      return `      - ${cert.name}: ${status.toUpperCase()} (${daysText})`;
    }).join('\n')}`;
  }).join('\n')}`;

  // Projects Overview
  const activeProjects = allProjects.filter(p => p.status === 'active');
  const pendingProjects = allProjects.filter(p => p.status === 'pending');
  const completedProjects = allProjects.filter(p => p.status === 'completed');

  const formatProjectWithAssigned = (p: Project) => {
    const assignedNames = p.assignedPersonnel && p.assignedPersonnel.length > 0
      ? allPersonnel.filter(pers => p.assignedPersonnel?.includes(pers.id)).map(pers => pers.name).join(', ') || 'None'
      : 'None';
    
    const calendarItems = p.calendarItems && p.calendarItems.length > 0
      ? p.calendarItems.map(item => `      - ${format(new Date(item.date), 'MMM d, yyyy')}: ${item.description}${item.isMilestone ? ' [MILESTONE]' : ''}`).join('\n')
      : '      No scheduled events';
    
    return `
  ${p.name} (${p.projectNumber || 'No number'})
    Status: ${p.status.toUpperCase()}
    Description: ${p.description}
    Customer: ${p.customer || 'Not specified'}
    Location: ${p.location || 'Not specified'}
    Project Manager: ${p.projectManager || 'Not specified'}
    Start Date: ${format(new Date(p.startDate), 'MMM d, yyyy')}
    End Date: ${p.endDate ? format(new Date(p.endDate), 'MMM d, yyyy') : 'Ongoing'}
    Assigned Personnel: ${assignedNames}
    Calendar Events:
${calendarItems}`;
  };

  const projectsSection = `
=== PROJECTS OVERVIEW (${allProjects.length} total) ===

Active Projects (${activeProjects.length}):
${activeProjects.length > 0 ? activeProjects.map(formatProjectWithAssigned).join('\n') : '  No active projects'}

Pending Projects (${pendingProjects.length}):
${pendingProjects.length > 0 ? pendingProjects.map(formatProjectWithAssigned).join('\n') : '  No pending projects'}

Completed Projects (${completedProjects.length}):
${completedProjects.length > 0 ? completedProjects.map(formatProjectWithAssigned).join('\n') : '  No completed projects'}`;

  // Team Availability Overview
  const today = new Date();
  const upcomingAvailability = allAvailability.filter(a => new Date(a.date) >= today);
  
  const availabilityByPerson = upcomingAvailability.reduce((acc, a) => {
    const person = allPersonnel.find(p => p.id === a.personnel_id);
    const personName = person?.name || 'Unknown';
    if (!acc[personName]) acc[personName] = [];
    acc[personName].push(a);
    return acc;
  }, {} as Record<string, AvailabilityEntry[]>);

  const availabilitySection = Object.keys(availabilityByPerson).length > 0
    ? `
=== TEAM AVAILABILITY ===
${Object.entries(availabilityByPerson).map(([name, entries]) => `
  ${name}:
${entries.slice(0, 10).map(a => `    - ${format(new Date(a.date), 'MMM d, yyyy')}: ${a.status.toUpperCase()}${a.notes ? ` (${a.notes})` : ''}`).join('\n')}`).join('\n')}`
    : `
=== TEAM AVAILABILITY ===
  No upcoming availability entries recorded`;

  // Summary Stats
  const summarySection = `
=== SUMMARY STATISTICS ===
Total Personnel: ${allPersonnel.length}
Total Projects: ${allProjects.length} (${activeProjects.length} active, ${pendingProjects.length} pending, ${completedProjects.length} completed)
Certificates Expiring Soon: ${allPersonnel.reduce((acc, p) => acc + p.certificates.filter(c => getCertificateStatus(c.expiryDate) === 'expiring').length, 0)}
Expired Certificates: ${allPersonnel.reduce((acc, p) => acc + p.certificates.filter(c => getCertificateStatus(c.expiryDate) === 'expired').length, 0)}`;

  return `${summarySection}
${personnelSection}
${projectsSection}
${availabilitySection}`;
}

export function ChatBot({ isAdmin = false }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Worker data hooks
  const { personnel: workerPersonnel } = useWorkerPersonnel();
  const { projects: workerProjects } = useAssignedProjects(workerPersonnel?.id || '');
  
  // Admin data hooks
  const { personnel: allPersonnel } = usePersonnel();
  const { projects: allProjects } = useProjects();

  // Fetch availability data
  useEffect(() => {
    async function fetchAvailability() {
      if (isAdmin) {
        // Fetch all availability for admin
        const { data, error } = await supabase
          .from('availability')
          .select('date, status, notes, personnel_id')
          .order('date', { ascending: true });
        
        if (!error && data) {
          setAvailability(data);
        }
      } else if (workerPersonnel?.id) {
        // Fetch only worker's availability
        const { data, error } = await supabase
          .from('availability')
          .select('date, status, notes, personnel_id')
          .eq('personnel_id', workerPersonnel.id)
          .order('date', { ascending: true });
        
        if (!error && data) {
          setAvailability(data);
        }
      }
    }
    
    fetchAvailability();
  }, [isAdmin, workerPersonnel?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getContextData = () => {
    if (isAdmin) {
      return generateAdminContext(allPersonnel, allProjects, availability);
    }
    return generateWorkerContext(workerPersonnel, workerProjects, availability);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/certificate-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            contextData: getContextData(),
            isAdmin,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

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
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
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
      toast({
        variant: 'destructive',
        title: 'Chat Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-16 px-6 rounded-full shadow-xl z-50 gap-3 text-lg font-bold animate-pulse hover:animate-none"
      >
        <MessageCircle className="h-6 w-6" />
        <span>Chat</span>
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-xl z-50 flex flex-col border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-cyan-500" />
          Flowsert Assistant
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
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
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-2 justify-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1"
            />
            <Button variant="active" onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
