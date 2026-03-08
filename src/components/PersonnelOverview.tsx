import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Users, Mail, Pencil, Trash2, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PersonnelOverviewProps {
  personnel: Personnel[];
  onEditPersonnel?: (person: Personnel) => void;
  onPersonnelRemoved?: () => void;
}

export function PersonnelOverview({ personnel, onEditPersonnel, onPersonnelRemoved }: PersonnelOverviewProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personnelToDelete, setPersonnelToDelete] = useState<Personnel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { profile } = useAuth();

  // Fetch admin user IDs on mount
  useEffect(() => {
    const fetchAdminUserIds = async () => {
      if (!profile?.business_id) return;

      try {
        // Fetch all admin user roles
        const { data: adminRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (rolesError) throw rolesError;

        if (adminRoles && adminRoles.length > 0) {
          const adminIds = adminRoles.map((r) => r.user_id);
          
          // Fetch profiles for these admin users in the same business
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')
            .in('id', adminIds)
            .eq('business_id', profile.business_id);

          if (profilesError) throw profilesError;

          setAdminUserIds(new Set(profiles?.map((p) => p.id) || []));
        }
      } catch (error) {
        console.error('Error fetching admin user IDs:', error);
      }
    };

    fetchAdminUserIds();
  }, [profile?.business_id]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDeleteClick = (person: Personnel) => {
    setPersonnelToDelete(person);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!personnelToDelete) return;

    setIsDeleting(true);
    try {
      // Delete the personnel record
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

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setPersonnelToDelete(null);
  };

  return (
    <>
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
            <div className="text-center py-4">
              <div className="text-3xl mb-2">👤</div>
              <p className="text-muted-foreground">No personnel found</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {personnel.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={person.avatarUrl} alt={person.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{person.name}</p>
                        {person.userId && adminUserIds.has(person.userId) && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 shrink-0">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{person.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onEditPersonnel && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

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
            <AlertDialogCancel onClick={handleCancelDelete} disabled={isDeleting}>
              No
            </AlertDialogCancel>
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
