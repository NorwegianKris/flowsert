import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { useFreelancerInvitations } from '@/hooks/useFreelancerInvitations';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';
import { Plus, Copy, Trash2, QrCode, Loader2, Link2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function FreelancerInvitationsManager() {
  const { invitations, loading, createInvitation, toggleInvitation, deleteInvitation } =
    useFreelancerInvitations();
  const { business } = useBusinessInfo();
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showQrFor, setShowQrFor] = useState<string | null>(null);
  const { toast } = useToast();

  const getSignupUrl = () => {
    const baseUrl = window.location.origin;
    const companyCode = business?.company_code || '';
    return `${baseUrl}/register/freelancer/${companyCode}`;
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    await createInvitation(newName.trim());
    setNewName('');
    setIsCreating(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getSignupUrl());
      toast({
        title: 'Link Copied',
        description: 'Freelancer signup link copied to clipboard.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy link.',
      });
    }
  };

  const getQrCodeUrl = () => {
    const url = encodeURIComponent(getSignupUrl());
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${url}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Freelancer Invitation Links
          </CardTitle>
          <CardDescription>
            Create signup links for freelancers to register on your business profile. These can be
            shared on your website or as QR codes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create new invitation */}
          <div className="flex gap-2">
            <Input
              placeholder="Link name (e.g., Website Banner, Job Fair)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={!newName.trim() || isCreating}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* List of invitations */}
          {invitations.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No invitation links yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{inv.name}</span>
                      <Badge variant={inv.isActive ? 'default' : 'secondary'}>
                        {inv.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        id={`active-${inv.id}`}
                        checked={inv.isActive}
                        onCheckedChange={(checked) => toggleInvitation(inv.id, checked)}
                      />
                      <Label htmlFor={`active-${inv.id}`} className="sr-only">
                        Active
                      </Label>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard()}
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowQrFor(inv.id)}
                      title="Show QR code"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(getSignupUrl(), '_blank')}
                      title="Open link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(inv.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <AlertDialog open={!!showQrFor} onOpenChange={() => setShowQrFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>QR Code</AlertDialogTitle>
            <AlertDialogDescription>
              Scan this QR code to access the freelancer signup page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-4">
          {showQrFor && (
              <img
                src={getQrCodeUrl()}
                alt="QR Code"
                className="w-48 h-48 border rounded-lg"
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showQrFor) {
                  const link = document.createElement('a');
                  link.href = getQrCodeUrl();
                  link.download = 'freelancer-qr.png';
                  link.click();
                }
              }}
            >
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invitation Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invitation link? Anyone who has not yet signed up
              using this link will no longer be able to do so.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) {
                  deleteInvitation(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
