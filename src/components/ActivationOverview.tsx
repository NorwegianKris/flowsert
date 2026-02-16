import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Personnel } from '@/types';
import { ShieldCheck, Users } from 'lucide-react';
import { ActivateProfileDialog } from '@/components/ActivateProfileDialog';

type FilterMode = 'all' | 'active' | 'inactive';

interface ActivationOverviewProps {
  personnel: Personnel[];
  onRefresh: () => void;
}

export function ActivationOverview({ personnel, onRefresh }: ActivationOverviewProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);

  const activeCount = useMemo(
    () => personnel.filter((p) => p.activated).length,
    [personnel]
  );

  const filteredPersonnel = useMemo(() => {
    switch (filter) {
      case 'active':
        return personnel.filter((p) => p.activated);
      case 'inactive':
        return personnel.filter((p) => !p.activated);
      default:
        return personnel;
    }
  }, [personnel, filter]);

  const progressPercent = personnel.length > 0 ? (activeCount / personnel.length) * 100 : 0;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleToggle = (person: Personnel) => {
    setSelectedPerson(person);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Activation Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{activeCount}</span> / {personnel.length} profiles activated
              </span>
              <Badge variant="secondary" className="text-xs">
                {activeCount} billable
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Filter */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                All ({personnel.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs">
                Active ({activeCount})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="text-xs">
                Inactive ({personnel.length - activeCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* List */}
          {filteredPersonnel.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No personnel in this category</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {filteredPersonnel.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={person.avatarUrl} alt={person.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{person.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground truncate">{person.role}</span>
                        {person.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {person.category === 'freelancer' ? 'Freelancer' : 'Employee'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium ${person.activated ? 'text-primary' : 'text-muted-foreground'}`}>
                        {person.activated ? 'Active' : 'Inactive'}
                      </span>
                      <Switch
                        checked={person.activated}
                        onCheckedChange={() => handleToggle(person)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <p className="text-xs text-muted-foreground">
            Active profiles count toward your billing tier. Inactive profiles retain their data but are excluded from projects and exports.
          </p>
        </CardContent>
      </Card>

      {selectedPerson && (
        <ActivateProfileDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          personnelId={selectedPerson.id}
          personnelName={selectedPerson.name}
          isCurrentlyActivated={selectedPerson.activated}
          isFreelancer={selectedPerson.isFreelancer}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
