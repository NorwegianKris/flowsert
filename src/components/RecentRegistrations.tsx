import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Personnel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserPlus, ChevronRight } from 'lucide-react';

interface RecentRegistrationsProps {
  personnel: Personnel[];
  onPersonnelClick: (person: Personnel) => void;
  onViewAll?: () => void;
  limit?: number;
}

export function RecentRegistrations({
  personnel,
  onPersonnelClick,
  onViewAll,
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
      <CardContent className="space-y-2">
        {recentRegistrations.map((person) => (
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
              <p className="text-xs text-muted-foreground">{getRegistrationSource(person)}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                {getPersonType(person)}
              </Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {getRelativeTime(person.createdAt!)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}

        {onViewAll && (
          <div className="pt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={onViewAll}
            >
              View all personnel
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
