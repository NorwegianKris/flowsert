import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Building2, Loader2, Mail, Users, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PlatformBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  is_test: boolean;
  tier: string;
  active_personnel_count: number;
  admin_email: string | null;
}

interface BusinessDetailSheetProps {
  business: PlatformBusiness | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function BusinessDetailSheet({
  business,
  open,
  onClose,
  onUpdated,
  onDeleted,
}: BusinessDetailSheetProps) {
  const { session } = useAuth();
  const [updatingTier, setUpdatingTier] = useState(false);
  const [updatingTest, setUpdatingTest] = useState(false);
  const [localIsTest, setLocalIsTest] = useState(business?.is_test ?? false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (business) setLocalIsTest(business.is_test);
  }, [business]);

  if (!business) return null;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const handleTierChange = async (newTier: string) => {
    setUpdatingTier(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'update-platform-business',
        {
          body: { business_id: business.id, tier: newTier },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Plan updated');
      onUpdated();
    } catch (err: any) {
      console.error('Failed to update tier:', err);
      toast.error(err.message || 'Failed to update plan');
    } finally {
      setUpdatingTier(false);
    }
  };

  const handleTestToggle = async (checked: boolean) => {
    setLocalIsTest(checked);
    setUpdatingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'update-platform-business',
        {
          body: { business_id: business.id, is_test: checked },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(checked ? 'Marked as test' : 'Marked as active');
      onUpdated();
    } catch (err: any) {
      setLocalIsTest(!checked);
      console.error('Failed to update test status:', err);
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingTest(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'delete-platform-business',
        {
          body: { business_id: business.id },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Business deleted');
      setDeleteDialogOpen(false);
      setConfirmName('');
      onClose();
      onDeleted();
    } catch (err: any) {
      console.error('Failed to delete business:', err);
      toast.error(err.message || 'Failed to delete business');
    } finally {
      setDeleting(false);
    }
  };

  const nameMatches = confirmName === business.name;

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {business.logo_url ? (
                  <AvatarImage src={business.logo_url} alt={business.name} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-left">{business.name}</SheetTitle>
                <SheetDescription className="text-left">
                  {localIsTest ? (
                    <Badge variant="outline" className="text-muted-foreground mt-1">
                      Test
                    </Badge>
                  ) : (
                    <Badge variant="active" className="mt-1">
                      Active
                    </Badge>
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 pt-2">
            {/* Plan Tier */}
            <div className="space-y-2">
              <Label>Plan Tier</Label>
              <Select
                value={business.tier}
                onValueChange={handleTierChange}
                disabled={updatingTier}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Toggle */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {localIsTest ? 'Test business' : 'Active business'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Test</span>
                  <Switch
                    checked={localIsTest}
                    onCheckedChange={handleTestToggle}
                    disabled={updatingTest}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Admin Email */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                Admin Email
              </Label>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {business.admin_email || 'No invitation found'}
              </div>
            </div>

            {/* Personnel Count */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                Active Personnel
              </Label>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                {business.active_personnel_count}
              </div>
            </div>

            {/* Created */}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                Created
              </Label>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(business.created_at)}
              </div>
            </div>

            {/* Delete (test only) */}
            {localIsTest && (
              <>
                <Separator />
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Business
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(v) => {
        if (!v) {
          setConfirmName('');
          setDeleteDialogOpen(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{business.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this test business and all associated data
              including personnel, certificates, projects, and invitations. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-name">
              Type <span className="font-semibold text-foreground">{business.name}</span> to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={business.name}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!nameMatches || deleting}
              onClick={handleDelete}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Business
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
