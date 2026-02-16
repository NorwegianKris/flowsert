import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Link, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Personnel } from '@/types';

interface LinkProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName: string;
  personnel: Personnel[];
  onLinked: () => void;
  onCreateNew: () => void;
}

export function LinkProfileDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  personnel,
  onLinked,
  onCreateNew,
}: LinkProfileDialogProps) {
  const [linking, setLinking] = useState(false);
  const { toast } = useToast();

  // Find personnel matching admin's email that aren't linked yet
  const matchingPersonnel = personnel.filter(
    (p) => p.email.toLowerCase() === userEmail.toLowerCase() && !p.userId
  );

  const handleLink = async (personnelId: string) => {
    setLinking(true);
    try {
      const { error } = await supabase
        .from('personnel')
        .update({ user_id: userId })
        .eq('id', personnelId);

      if (error) throw error;

      toast({
        title: 'Profile linked',
        description: 'Your admin account is now linked to your personnel profile.',
      });
      onLinked();
      onOpenChange(false);
    } catch (error) {
      console.error('Error linking profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to link profile. Please try again.',
      });
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Link Your Profile
          </DialogTitle>
          <DialogDescription>
            Link your admin account to a personnel profile to manage your own certificates, set expiry alerts, and track your documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {matchingPersonnel.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                We found a matching personnel record for <strong>{userEmail}</strong>:
              </p>
              {matchingPersonnel.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.role} · {p.location}</p>
                  </div>
                  <Button size="sm" onClick={() => handleLink(p.id)} disabled={linking}>
                    <Link className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No unlinked personnel record found matching <strong>{userEmail}</strong>.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => {
            onOpenChange(false);
            onCreateNew();
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Create New Profile
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
