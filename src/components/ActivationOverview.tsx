import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ShieldCheck, Users, Pencil, Trash2, Loader2, Search, ChevronDown, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
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
}

const TC_PDF_URL = '/documents/FlowSert_Terms_and_Conditions.pdf';

const TIERS = [
  { name: 'Starter', range: '1–25 profiles', monthly: '1,990', annual: '19,900', min: 1, max: 25 },
  { name: 'Growth', range: '26–75 profiles', monthly: '4,490', annual: '44,900', min: 26, max: 75 },
  { name: 'Professional', range: '76–200 profiles', monthly: '8,990', annual: '89,900', min: 76, max: 200 },
  { name: 'Enterprise', range: '201+ profiles', monthly: 'Custom', annual: 'Custom', min: 201, max: Infinity },
];

function getCurrentTierIndex(activeCount: number) {
  if (activeCount >= 201) return 3;
  if (activeCount >= 76) return 2;
  if (activeCount >= 26) return 1;
  return 0;
}

export function ActivationOverview({ personnel, onRefresh, onEditPersonnel, onPersonnelRemoved }: ActivationOverviewProps) {
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
    if (businessId) {
      getBusinessEntitlement(businessId).then(setEntitlement);
    }
  }, [businessId]);

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

  const capValue = entitlement?.is_unlimited ? activeCount : (entitlement?.profile_cap ?? 25);
  const progressPercent = capValue > 0 ? Math.min((activeCount / capValue) * 100, 100) : 0;
  const currentTierIndex = entitlement ? TIERS.findIndex(t => t.name.toLowerCase() === entitlement.tier) : getCurrentTierIndex(activeCount);
  const isOverCap = entitlement && !entitlement.is_unlimited && activeCount > entitlement.profile_cap;

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

  return (
    <>
      <Card className="border-border/50">
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Active: <span className="font-semibold text-foreground">{activeCount}</span>
                {' | '}
                Plan cap: <span className="font-semibold text-foreground">
                  {entitlement?.is_unlimited ? 'Unlimited' : (entitlement?.profile_cap ?? 25)}
                </span>
              </span>
              <Badge variant="secondary" className="text-xs">
                {activeCount} billable
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {isOverCap && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You have more active profiles ({activeCount}) than your plan allows ({entitlement?.profile_cap}). 
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

          {/* Pricing Tiers */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Subscription Tiers</p>
            <p className="text-xs text-muted-foreground">Annual plan = 2 months free (16.7% discount)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TIERS.map((tier, i) => {
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
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs font-medium text-foreground">{tier.monthly} NOK/mo</p>
                      <p className="text-[10px] text-muted-foreground">{tier.annual} NOK/yr</p>
                    </div>
                    {isCurrent && (
                      <p className="text-[10px] font-medium text-primary mt-1.5">Your Current Tier</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Billing is based on the highest number of active profiles reached during the billing month (High-Water Mark Billing). Deactivating profiles before month-end does not reduce the invoice for that month.
          </p>

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
