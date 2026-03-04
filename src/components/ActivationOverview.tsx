import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
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
import { Users, Pencil, Trash2, Loader2, Search, ChevronDown, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { ActivateProfileDialog } from '@/components/ActivateProfileDialog';
import { PersonnelPreviewSheet } from '@/components/PersonnelPreviewSheet';
import { PdfViewer } from '@/components/PdfViewer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessEntitlement, type BusinessEntitlement } from '@/lib/entitlements';

type FilterMode = 'all' | 'active' | 'inactive';

interface ActivationOverviewProps {
  personnel: Personnel[];
  onRefresh: () => void;
  onEditPersonnel?: (person: Personnel) => void;
  onPersonnelRemoved?: () => void;
  onChoosePlan?: () => void;
  subscriptionStatus?: string | null;
  liftedEntitlement?: BusinessEntitlement | null;
  liftedActiveCount?: number | null;
}

const TC_PDF_URL = '/documents/FlowSert_Terms_and_Conditions.pdf';

const PAST_DUE_STATUSES = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'];

function getStatusBadgeProps(status: string | null | undefined): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (status === undefined) return { label: 'Unknown', variant: 'outline' };
  if (status === null) return { label: 'No subscription', variant: 'outline' };
  if (status === 'active') return { label: 'Active', variant: 'default' };
  if (status === 'trialing') return { label: 'Trialing', variant: 'secondary' };
  if (PAST_DUE_STATUSES.includes(status)) return { label: 'Past due', variant: 'destructive' };
  if (status === 'canceled') return { label: 'Canceled', variant: 'outline' };
  return { label: status, variant: 'outline' };
}

export function ActivationOverview({ personnel, onRefresh, onEditPersonnel, onPersonnelRemoved, onChoosePlan, subscriptionStatus, liftedEntitlement: liftedEntitlementProp, liftedActiveCount: liftedActiveCountProp }: ActivationOverviewProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personnelToDelete, setPersonnelToDelete] = useState<Personnel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tcOpen, setTcOpen] = useState(false);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPerson, setPreviewPerson] = useState<Personnel | null>(null);
  const { toast } = useToast();
  const { businessId } = useAuth();
  const [entitlement, setEntitlement] = useState<BusinessEntitlement | null>(null);

  useEffect(() => {
    if (liftedEntitlementProp !== undefined) return;
    if (businessId) {
      getBusinessEntitlement(businessId).then(setEntitlement);
    }
  }, [businessId, liftedEntitlementProp]);

  const activeCount = useMemo(
    () => personnel.filter((p) => p.activated).length,
    [personnel]
  );

  const effectiveEntitlement = liftedEntitlementProp !== undefined ? liftedEntitlementProp : entitlement;
  const effectiveActiveCount = liftedActiveCountProp !== undefined ? liftedActiveCountProp : activeCount;

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

  const capValue = effectiveEntitlement?.is_unlimited
    ? (typeof effectiveActiveCount === 'number' ? effectiveActiveCount : 0)
    : (effectiveEntitlement?.profile_cap ?? 25);
  const progressPercent = typeof effectiveActiveCount === 'number' && capValue > 0
    ? Math.min((effectiveActiveCount / capValue) * 100, 100)
    : 0;
  const isOverCap = effectiveEntitlement && !effectiveEntitlement.is_unlimited && typeof effectiveActiveCount === 'number' && effectiveActiveCount > effectiveEntitlement.profile_cap;

  const capDisplay = effectiveEntitlement?.is_unlimited ? '∞' : String(effectiveEntitlement?.profile_cap ?? 25);

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

  // Load T&C PDF when dropdown is opened for the first time
  useEffect(() => {
    if (tcOpen && !pdfData && !pdfLoading) {
      setPdfLoading(true);
      fetch(TC_PDF_URL)
        .then((res) => res.arrayBuffer())
        .then((data) => setPdfData(data))
        .catch((err) => console.error('Failed to load T&C PDF:', err))
        .finally(() => setPdfLoading(false));
    }
  }, [tcOpen, pdfData, pdfLoading]);

  const planLabel = effectiveEntitlement
    ? effectiveEntitlement.is_unlimited
      ? 'Enterprise'
      : effectiveEntitlement.tier.charAt(0).toUpperCase() + effectiveEntitlement.tier.slice(1)
    : '—';

  const statusBadge = effectiveEntitlement?.is_unlimited && subscriptionStatus === null
    ? { label: 'Manual', variant: 'secondary' as const }
    : getStatusBadgeProps(subscriptionStatus);
  const hasKnownSubscription = typeof subscriptionStatus === 'string';

  const ctaLabel = effectiveEntitlement?.is_unlimited
    ? 'Manage billing'
    : hasKnownSubscription
      ? 'Manage plan'
      : 'Choose plan';
  const ctaVariant = effectiveEntitlement?.is_unlimited || hasKnownSubscription ? 'outline' : 'default';
  const isManual = effectiveEntitlement?.is_unlimited && subscriptionStatus === null;

  return (
    <>
      <Card className="border-border/50">
        <CardContent className="space-y-4">
          {/* Current Plan Summary */}
          <div className="rounded-lg border border-border/50 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Current Plan</p>
            <div className={`grid ${isManual ? 'grid-cols-2 gap-4' : 'grid-cols-3 gap-3'}`}>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plan</p>
                <Badge variant="secondary" className="mt-1 text-xs">{planLabel}</Badge>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Usage</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {effectiveActiveCount ?? '—'} / {capDisplay}
                </p>
              </div>
              {!isManual && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
                  <Badge variant={statusBadge.variant} className="mt-1 text-xs">{statusBadge.label}</Badge>
                </div>
              )}
            </div>
            {!effectiveEntitlement?.is_unlimited && (
              <Progress value={progressPercent} className="h-2" />
            )}
            <Button
              variant={ctaVariant as 'outline' | 'default'}
              size="sm"
              className="w-full text-xs"
              onClick={() => onChoosePlan?.()}
            >
              {ctaLabel}
            </Button>
            <p className="text-xs text-muted-foreground">
              Only active profiles count toward your limit.
            </p>
          </div>

          {isOverCap && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You have more active profiles ({effectiveActiveCount}) than your plan allows ({effectiveEntitlement?.profile_cap}). 
                New activations are blocked. Upgrade your plan or deactivate profiles.
              </p>
            </div>
          )}

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
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => { setPreviewPerson(person); setPreviewOpen(true); }}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={person.avatarUrl} alt={person.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        className="block w-full font-medium text-sm truncate text-left cursor-pointer hover:underline text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPerson(person);
                          setPreviewOpen(true);
                        }}
                      >
                        {person.name}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground truncate">{person.role}</span>
                        {person.category && (
                          <Badge variant={person.category === 'freelancer' ? 'secondary' : 'default'} className="font-normal">
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
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className={`text-xs font-medium w-12 text-right ${person.activated ? 'text-primary' : 'text-muted-foreground'}`}>
                          {person.activated ? 'Active' : 'Inactive'}
                        </span>
                        <Switch
                          checked={person.activated}
                          onCheckedChange={() => handleToggle(person)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Terms & Conditions */}
          <Collapsible open={tcOpen} onOpenChange={setTcOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Terms & Conditions (View)</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => window.open(TC_PDF_URL, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in new tab
                </Button>
              </div>
              {pdfLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading document...</span>
                </div>
              )}
              {pdfData && <PdfViewer pdfData={pdfData} />}
            </CollapsibleContent>
          </Collapsible>
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

      {previewPerson && (
        <PersonnelPreviewSheet
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          personnel={previewPerson}
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
