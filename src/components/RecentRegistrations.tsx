import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Personnel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserPlus, MapPin, Briefcase, FileCheck, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentRegistrationsProps {
  personnel: Personnel[];
  onPersonnelClick: (person: Personnel) => void;
  initialLimit?: number;
  incrementAmount?: number;
}

// Calculate profile completion percentage based on required fields
function calculateCompletion(personnel: Personnel): { percentage: number; color: string } {
  const checks = [
    !!personnel.name && personnel.name.trim().length > 0,
    !!personnel.role && personnel.role.trim().length > 0,
    !!personnel.nationality,
    !!personnel.gender,
    !!personnel.phone && personnel.phone.trim().length > 0,
    !!personnel.email && personnel.email.trim().length > 0,
    !!personnel.location && personnel.location.trim().length > 0 && personnel.location !== 'Not specified',
    personnel.certificates.length > 0,
  ];
  
  const completed = checks.filter(Boolean).length;
  const percentage = Math.round((completed / checks.length) * 100);
  
  let color: string;
  if (percentage >= 80) {
    color = 'bg-[hsl(var(--status-valid))] text-[hsl(var(--status-valid-foreground))]';
  } else if (percentage >= 50) {
    color = 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]';
  } else {
    color = 'bg-destructive text-destructive-foreground';
  }
  
  return { percentage, color };
}

export function RecentRegistrations({
  personnel,
  onPersonnelClick,
  initialLimit = 5,
  incrementAmount = 5,
}: RecentRegistrationsProps) {
  const [displayLimit, setDisplayLimit] = useState(initialLimit);
  const [isOpen, setIsOpen] = useState(false);
  const recentRegistrations = useMemo(() => {
    return personnel
      .filter((p) => p.createdAt)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt!).getTime();
        const dateB = new Date(b.createdAt!).getTime();
        return dateB - dateA;
      });
  }, [personnel]);

  const displayedRegistrations = recentRegistrations.slice(0, displayLimit);
  const hasMore = recentRegistrations.length > displayLimit;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRegistrationSource = (person: Personnel) => {
    if (person.category === 'freelancer') {
      return 'Self-registered';
    }
    return 'Invited by admin';
  };

  const getRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const handleViewMore = () => {
    setDisplayLimit((prev) => prev + incrementAmount);
  };

  if (recentRegistrations.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              Recent Registrations
              <Badge variant="secondary" className="ml-1">
                {recentRegistrations.length}
              </Badge>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {displayedRegistrations.map((person) => {
                const { percentage, color } = calculateCompletion(person);
                const isFreelancer = person.category === 'freelancer';
                const initials = getInitials(person.name);
                
                return (
                  <Card
                    key={person.id}
                    onClick={() => onPersonnelClick(person)}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 relative",
                      isFreelancer 
                        ? 'border-[#C4B5FD] bg-[#C4B5FD]/10 dark:bg-[#C4B5FD]/10 dark:border-[#C4B5FD]/50' 
                        : 'border-border/50'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 border-2 border-border shrink-0">
                          {person.avatarUrl && (
                            <AvatarImage src={person.avatarUrl} alt={person.name} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">
                              {person.name}
                            </h3>
                            <Badge 
                              variant={isFreelancer ? 'secondary' : 'default'}
                              className="font-normal"
                            >
                              {isFreelancer ? 'Freelancer' : 'Employee'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                              <span className="truncate">{person.role}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
                              <span className="truncate">{person.location}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                            <span>{getRegistrationSource(person)}</span>
                            <span>·</span>
                            <span>{getRelativeTime(person.createdAt!)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileCheck className="h-4 w-4 text-blue-500" />
                          <span>{person.certificates.length} Certificates</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Profile completion</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-semibold",
                                color
                              )}>
                                {percentage}%
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              Profile {percentage}% complete
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {hasMore && (
              <div className="pt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewMore}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  View more
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
