import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Personnel } from '@/types';
import { Users, Briefcase } from 'lucide-react';

interface PersonnelOverviewProps {
  personnel: Personnel[];
}

export function PersonnelOverview({ personnel }: PersonnelOverviewProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Personnel
          <Badge variant="secondary" className="ml-2">
            {personnel.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {personnel.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No personnel found
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {personnel.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={person.avatarUrl} alt={person.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{person.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Briefcase className="h-3 w-3" />
                      <span className="truncate">{person.role}</span>
                    </div>
                  </div>

                  <Badge variant="outline" className="shrink-0">
                    {person.role}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
