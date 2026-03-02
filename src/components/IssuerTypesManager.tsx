import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Archive,
  RotateCcw,
  Loader2,
  Search,
  Building2,
  Merge,
  Settings,
  
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useIssuerTypes,
  useCreateIssuerType,
  useUpdateIssuerType,
  useArchiveIssuerType,
  useRestoreIssuerType,
  useIssuerTypeUsageCount,
  IssuerType,
} from "@/hooks/useIssuerTypes";
import { IssuerMergingPane } from "@/components/IssuerMergingPane";

type FilterStatus = "active" | "archived" | "all";

export function IssuerTypesManager() {
  const [activeView, setActiveView] = useState<"merge" | "manage">("merge");

  return (
    <div className="space-y-4">
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "merge" | "manage")}>
        <TabsList>
          <TabsTrigger value="merge" className="gap-2">
            <Merge className="h-4 w-4" />
            <span className="hidden sm:inline">Group Issuers</span>
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Issuers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="merge" className="mt-4">
          <IssuerMergingPane />
        </TabsContent>

        <TabsContent value="manage" className="mt-4">
          <IssuersManageList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IssuersManageList() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("active");
  const [searchQuery, setSearchQuery] = useState("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedIssuer, setSelectedIssuer] = useState<IssuerType | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Merge state
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [primaryIssuerId, setPrimaryIssuerId] = useState<string>("");
  const [mergeNewName, setMergeNewName] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  const queryClient = useQueryClient();

  const { data: issuers = [], isLoading } = useIssuerTypes({
    includeInactive: filterStatus !== "active",
  });
  const createMutation = useCreateIssuerType();
  const updateMutation = useUpdateIssuerType();
  const archiveMutation = useArchiveIssuerType();
  const restoreMutation = useRestoreIssuerType();
  const { data: usageCount = 0 } = useIssuerTypeUsageCount(selectedIssuer?.id || null);

  const filteredIssuers = issuers.filter((issuer) => {
    if (filterStatus === "active" && !issuer.is_active) return false;
    if (filterStatus === "archived" && issuer.is_active) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        issuer.name.toLowerCase().includes(query) ||
        issuer.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Get the selected issuers for the merge dialog
  const selectedIssuersForMerge = useMemo(() => {
    return issuers.filter((i) => selectedForMerge.has(i.id));
  }, [issuers, selectedForMerge]);

  // Auto-select primary as the one with highest usage_count when dialog opens
  useEffect(() => {
    if (mergeDialogOpen && selectedIssuersForMerge.length >= 2) {
      const sorted = [...selectedIssuersForMerge].sort(
        (a, b) => (b.usage_count || 0) - (a.usage_count || 0)
      );
      setPrimaryIssuerId(sorted[0].id);
    }
  }, [mergeDialogOpen, selectedIssuersForMerge]);

  const toggleMergeSelection = (id: string) => {
    setSelectedForMerge((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMerge = async () => {
    if (!primaryIssuerId || selectedForMerge.size < 2) return;

    const duplicateIds = selectedIssuersForMerge
      .filter((i) => i.id !== primaryIssuerId)
      .map((i) => i.id);

    if (duplicateIds.length === 0) return;

    setIsMerging(true);
    try {
      // 0. Rename primary issuer if custom name provided
      if (mergeNewName.trim()) {
        const { error: renameError } = await supabase
          .from("issuer_types")
          .update({ name: mergeNewName.trim() })
          .eq("id", primaryIssuerId);
        if (renameError) {
          console.error("Error renaming primary issuer:", renameError);
          throw renameError;
        }
      }

      // 1. Reassign certificates
      const { error: certError } = await supabase
        .from("certificates")
        .update({ issuer_type_id: primaryIssuerId })
        .in("issuer_type_id", duplicateIds);

      if (certError) {
        console.error("Error reassigning certificates:", certError);
        throw certError;
      }

      // 2. Reassign issuer aliases (catch unique violations silently)
      for (const dupId of duplicateIds) {
        const { error: aliasError } = await supabase
          .from("issuer_aliases")
          .update({ issuer_type_id: primaryIssuerId })
          .eq("issuer_type_id", dupId);

        if (aliasError && aliasError.code !== "23505") {
          console.error("Error reassigning issuer aliases:", aliasError);
          // For unique conflicts on individual rows, we need to handle differently
          // Delete conflicting aliases from duplicates instead
          const { error: deleteAliasError } = await supabase
            .from("issuer_aliases")
            .delete()
            .eq("issuer_type_id", dupId);

          if (deleteAliasError) {
            console.error("Error cleaning up duplicate aliases:", deleteAliasError);
          }
        }
      }

      // 3. Delete duplicate issuer_types
      const { error: deleteError } = await supabase
        .from("issuer_types")
        .delete()
        .in("id", duplicateIds);

      if (deleteError) {
        console.error("Error deleting duplicate issuers:", deleteError);
        throw deleteError;
      }

      // 4. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["issuer-types"] });
      queryClient.invalidateQueries({ queryKey: ["issuer-aliases"] });
      queryClient.invalidateQueries({ queryKey: ["issuer-alias-lookup"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["issuer-type-usage"] });

      const primaryName = mergeNewName.trim() || selectedIssuersForMerge.find((i) => i.id === primaryIssuerId)?.name;
      toast.success(
        `Merged ${duplicateIds.length} issuer${duplicateIds.length !== 1 ? "s" : ""} into "${primaryName}"`
      );

      setSelectedForMerge(new Set());
      setMergeNewName("");
      setMergeDialogOpen(false);
    } catch (error) {
      toast.error("Failed to merge issuers");
    } finally {
      setIsMerging(false);
    }
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }

    await createMutation.mutateAsync({
      name: formName.trim(),
      description: formDescription.trim() || undefined,
    });

    setCreateDialogOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!selectedIssuer || !formName.trim()) return;

    await updateMutation.mutateAsync({
      id: selectedIssuer.id,
      name: formName.trim(),
      description: formDescription.trim() || undefined,
    });

    setEditDialogOpen(false);
    setSelectedIssuer(null);
    resetForm();
  };

  const handleArchive = async () => {
    if (!selectedIssuer) return;
    await archiveMutation.mutateAsync(selectedIssuer.id);
    setArchiveDialogOpen(false);
    setSelectedIssuer(null);
  };

  const handleRestore = async (issuer: IssuerType) => {
    await restoreMutation.mutateAsync(issuer.id);
  };

  const openEditDialog = (issuer: IssuerType) => {
    setSelectedIssuer(issuer);
    setFormName(issuer.name);
    setFormDescription(issuer.description || "");
    setEditDialogOpen(true);
  };

  const openArchiveDialog = (issuer: IssuerType) => {
    setSelectedIssuer(issuer);
    setArchiveDialogOpen(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span>💡</span>
        <span>Manage your canonical issuing authorities here. Select two or more duplicate issuers and merge them into one to keep your data clean.</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issuers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setMergeDialogOpen(true)}
            disabled={selectedForMerge.size < 2}
          >
            <Merge className="h-4 w-4 mr-2" />
            {selectedForMerge.size >= 2
              ? `Merge Selected (${selectedForMerge.size})`
              : "Merge Issuers"}
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Issuer
          </Button>
        </div>
      </div>

      {filteredIssuers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No issuers found.</p>
          {filterStatus === "active" && (
            <p className="text-sm mt-1">Create your first issuer to get started.</p>
          )}
        </div>
      ) : (
        <div className="max-h-[65vh] overflow-y-auto border rounded-lg divide-y">
            {filteredIssuers.map((issuer) => (
              <div
                key={issuer.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={selectedForMerge.has(issuer.id)}
                    onCheckedChange={() => toggleMergeSelection(issuer.id)}
                    aria-label={`Select ${issuer.name} for merging`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{issuer.name}</span>
                      {!issuer.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Archived
                        </Badge>
                      )}
                      {(issuer.usage_count ?? 0) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {issuer.usage_count} cert{issuer.usage_count !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    {issuer.description && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {issuer.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(issuer)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {issuer.is_active ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openArchiveDialog(issuer)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRestore(issuer)}
                      disabled={restoreMutation.isPending}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filteredIssuers.length} issuer{filteredIssuers.length !== 1 ? "s" : ""}{" "}
        {filterStatus !== "all" && `(${filterStatus})`}
      </p>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Issuer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="issuer-name">Name *</Label>
              <Input
                id="issuer-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., DNV GL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer-description">Description</Label>
              <Textarea
                id="issuer-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formName.trim()}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Issuer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-issuer-name">Name *</Label>
              <Input
                id="edit-issuer-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-issuer-description">Description</Label>
              <Textarea
                id="edit-issuer-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending || !formName.trim()}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Issuer</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to archive "{selectedIssuer?.name}"?
                </p>
                {usageCount > 0 && (
                  <p className="text-warning">
                    This issuer is currently used by {usageCount} certificate
                    {usageCount !== 1 ? "s" : ""}. Archiving will hide it from
                    future selections but won't affect existing certificates.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  You can restore archived issuers at any time.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Archiving...
                </>
              ) : (
                "Archive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Confirmation Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Merge Issuers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the primary issuer to keep. All certificates and aliases from the
              other issuers will be reassigned to it, and the duplicates will be deleted.
            </p>
            <RadioGroup value={primaryIssuerId} onValueChange={setPrimaryIssuerId}>
              <div className="space-y-2">
                {selectedIssuersForMerge.map((issuer) => (
                  <label
                    key={issuer.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value={issuer.id} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{issuer.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {issuer.usage_count || 0} cert{(issuer.usage_count || 0) !== 1 ? "s" : ""}
                    </Badge>
                  </label>
                ))}
              </div>
            </RadioGroup>
            <div className="space-y-2 pt-2">
              <Label htmlFor="merge-new-name">New name (optional)</Label>
              <Input
                id="merge-new-name"
                value={mergeNewName}
                onChange={(e) => setMergeNewName(e.target.value)}
                placeholder={selectedIssuersForMerge.find((i) => i.id === primaryIssuerId)?.name || "Keep current name"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMergeDialogOpen(false)}
              disabled={isMerging}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={isMerging || !primaryIssuerId}
            >
              {isMerging ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Merging...
                </>
              ) : (
                <>
                  <Merge className="h-4 w-4 mr-2" />
                  Merge into Selected
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
