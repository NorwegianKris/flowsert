import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Personnel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, ChevronRight } from 'lucide-react';

interface RecentRegistrationsProps {
  personnel: Personnel[];
  onPersonnelClick: (person: Personnel) => void;
  limit?: number;
}

export function RecentRegistrations({
  personnel,
  onPersonnelClick,
  limit = 8,
}: RecentRegistrationsProps) {
  const recentRegistrations = useMemo(() => {
    return personnel
      .filter((p) => p.createdAt)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt!).getTime();
        const dateB = new Date(b.createdAt!).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  }, [personnel, limit]);

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

  const getPersonType = (person: Personnel) => {
    if (person.category === 'freelancer') {
      return 'Freelancer';
    }
    return 'Employee';
  };

  const getRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  // Profile completeness check based on the 9-item checklist
  const getProfileStatus = (person: Personnel) => {
    const hasCertificates = person.certificates.length > 0;
    
    // Check basic profile fields
    const hasName = !!person.name;
    const hasRole = !!person.role;
    const hasNationality = !!person.nationality;
    const hasGender = !!person.gender;
    const hasPhone = !!person.phone;
    const hasEmail = !!person.email;
    const hasLocation = !!person.location && person.location !== 'Not specified';
    
    const basicFieldsComplete = hasName && hasRole && hasNationality && hasGender && hasPhone && hasEmail && hasLocation;
    
    if (basicFieldsComplete && hasCertificates) {
      return { label: 'Profile complete', variant: 'complete' as const };
    } else if (hasCertificates) {
      return { label: 'Profile incomplete', variant: 'incomplete' as const };
    } else if (basicFieldsComplete) {
      return { label: 'Missing certificates', variant: 'warning' as const };
    } else {
      return { label: 'Profile incomplete', variant: 'incomplete' as const };
    }
  };

  if (recentRegistrations.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-muted-foreground" />
          Recent Registrations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {recentRegistrations.map((person) => {
            const profileStatus = getProfileStatus(person);
            const certCount = person.certificates.length;
            
            return (
              <button
                key={person.id}
                onClick={() => onPersonnelClick(person)}
                className="w-full flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt={person.name} />}
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {getInitials(person.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{person.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getPersonType(person)} · {getRegistrationSource(person)} · {getRelativeTime(person.createdAt!)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span 
                      className={`text-xs ${
                        profileStatus.variant === 'complete' 
                          ? 'text-green-600 dark:text-green-400' 
                          : profileStatus.variant === 'warning'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {profileStatus.label}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      Certificates: {certCount}
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
