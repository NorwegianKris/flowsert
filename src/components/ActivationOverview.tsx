import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Personnel } from '@/types';
import { ShieldCheck, Users, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { ActivateProfileDialog } from '@/components/ActivateProfileDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type FilterMode = 'all' | 'active' | 'inactive';

interface ActivationOverviewProps {
  personnel: Personnel[];
  onRefresh: () => void;
  onEditPersonnel?: (person: Personnel) => void;
  onPersonnelRemoved?: () => void;
}

export function ActivationOverview({ personnel, onRefresh, onEditPersonnel, onPersonnelRemoved }: ActivationOverviewProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personnelToDelete, setPersonnelToDelete] = useState<Personnel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const activeCount = useMemo(
    () => personnel.filter((p) => p.activated).length,
    [personnel]
  );

  const filteredPersonnel = useMemo(() => {
    let list = personnel;
    switch (filter) {
      case 'active':
        list = list.filter((p) => p.activated);
        break;
      case 'inactive':
        list = list.filter((p) => !p.activated);
        break;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
      );
    }
    return list;
  }, [personnel, filter, searchQuery]);

  const progressPercent = personnel.length > 0 ? (activeCount / personnel.length) * 100 : 0;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleToggle = (person: Personnel) => {
    setSelectedPerson(person);
    setDialogOpen(true);
  };

  const handleDeleteClick = (person: Personnel) => {
    setPersonnelToDelete(person);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!personnelToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('personnel')
        .delete()
        .eq('id', personnelToDelete.id);

      if (error) throw error;

      toast({
        title: 'Personnel Removed',
        description: `${personnelToDelete.name} has been removed successfully.`,
      });

      onPersonnelRemoved?.();
      onRefresh();
    } catch (error) {
      console.error('Error deleting personnel:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove personnel. Please try again.',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPersonnelToDelete(null);
    }
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Profile Activation Overview
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

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

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

                    <div className="flex items-center gap-1 shrink-0">
                      {onEditPersonnel && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPersonnel(person);
                          }}
                          title="Edit personnel"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(person);
                        }}
                        title="Remove personnel"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <span className={`text-xs font-medium w-12 text-right ${person.activated ? 'text-primary' : 'text-muted-foreground'}`}>
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

          {/* Billing Tiers */}
          {(() => {
            const tiers = [
              { name: 'Tier 1', range: '1–25 profiles', min: 1, max: 25 },
              { name: 'Tier 2', range: '26–75 profiles', min: 26, max: 75 },
              { name: 'Tier 3', range: '75+ profiles', min: 76, max: Infinity },
            ];
            const currentTierIndex = activeCount >= 76 ? 2 : activeCount >= 26 ? 1 : 0;

            return (
              <div className="grid grid-cols-3 gap-3">
                {tiers.map((tier, i) => {
                  const isCurrent = i === currentTierIndex;
                  return (
                    <div
                      key={tier.name}
                      className={`rounded-lg border-2 p-3 text-center transition-colors ${
                        isCurrent
                          ? 'border-primary bg-primary/5'
                          : 'border-border/50 bg-muted/30'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                        {tier.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tier.range}</p>
                      {isCurrent && (
                        <p className="text-[10px] font-medium text-primary mt-1.5">Your Current Tier</p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Personnel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{personnelToDelete?.name}</strong>? 
              This action cannot be undone and will also remove all their certificates and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Yes'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
