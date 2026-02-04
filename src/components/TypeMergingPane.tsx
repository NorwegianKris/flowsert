import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  ArrowRight,
  Check,
  Plus,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInputtedTypes, InputtedType } from "@/hooks/useInputtedTypes";
import {
  useCertificateTypes,
  useCreateCertificateType,
  CertificateType,
} from "@/hooks/useCertificateTypes";
import { useCreateAlias } from "@/hooks/useCertificateAliases";
import { useBulkUpdateCertificates } from "@/hooks/useCertificatesNeedingReview";
import { MAX_BATCH_SIZE } from "@/components/BulkUpdateConfirmDialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Category {
  id: string;
  name: string;
}

export function TypeMergingPane() {
  const { businessId } = useAuth();
  const queryClient = useQueryClient();

  // Data
  const { data: inputtedTypes = [], isLoading: loadingInputted, refetch: refetchInputted } = useInputtedTypes();
  const { data: mergedTypes = [], isLoading: loadingMerged } = useCertificateTypes();
  const createTypeMutation = useCreateCertificateType();
  const createAliasMutation = useCreateAlias();
  const bulkUpdateMutation = useBulkUpdateCertificates();

  // UI State
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [showMapped, setShowMapped] = useState<"unmapped" | "mapped" | "all">("unmapped");
  const [selectedInputted, setSelectedInputted] = useState<Set<string>>(new Set());
  const [selectedMerged, setSelectedMerged] = useState<string | null>(null);
  
  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [newTypeCategoryId, setNewTypeCategoryId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch categories for create dialog
  useEffect(() => {
    if (businessId) {
      supabase
        .from("certificate_categories")
        .select("id, name")
        .eq("business_id", businessId)
        .order("name")
        .then(({ data, error }) => {
          if (!error && data) {
            setCategories(data);
          }
        });
    }
  }, [businessId]);

  // Filter inputted types
  const filteredInputted = useMemo(() => {
    return inputtedTypes.filter((t) => {
      // Filter by mapping status
      if (showMapped === "unmapped" && t.is_mapped) return false;
      if (showMapped === "mapped" && !t.is_mapped) return false;
      
      // Filter by search
      if (leftSearch) {
        const query = leftSearch.toLowerCase();
        return (
          t.title_normalized.includes(query) ||
          t.display_name.toLowerCase().includes(query) ||
          t.raw_examples.some((ex) => ex.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [inputtedTypes, leftSearch, showMapped]);

  // Filter merged types
  const filteredMerged = useMemo(() => {
    return mergedTypes.filter((t) => {
      if (!t.is_active) return false;
      if (rightSearch) {
        const query = rightSearch.toLowerCase();
        return (
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.category_name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [mergedTypes, rightSearch]);

  // Selected data
  const selectedInputtedData = useMemo(() => {
    return filteredInputted.filter((t) => selectedInputted.has(t.title_normalized));
  }, [filteredInputted, selectedInputted]);

  const totalSelectedCerts = useMemo(() => {
    return selectedInputtedData.reduce((sum, t) => sum + t.count, 0);
  }, [selectedInputtedData]);

  const selectedMergedData = useMemo(() => {
    return mergedTypes.find((t) => t.id === selectedMerged);
  }, [mergedTypes, selectedMerged]);

  // Toggle inputted type selection
  const toggleInputtedSelection = (titleNormalized: string) => {
    setSelectedInputted((prev) => {
      const next = new Set(prev);
      if (next.has(titleNormalized)) {
        next.delete(titleNormalized);
      } else {
        next.add(titleNormalized);
      }
      return next;
    });
  };

  // Toggle all
  const toggleSelectAll = () => {
    if (selectedInputted.size === filteredInputted.length) {
      setSelectedInputted(new Set());
    } else {
      setSelectedInputted(new Set(filteredInputted.map((t) => t.title_normalized)));
    }
  };

  // Can group?
  const canGroup = selectedInputted.size > 0 && selectedMerged !== null;

  // Handle grouping
  const handleGroupIntoSelected = () => {
    if (!canGroup) return;
    setConfirmDialogOpen(true);
  };

  // Handle create and group
  const handleCreateAndGroup = () => {
    if (selectedInputted.size === 0) return;
    setNewTypeName("");
    setNewTypeDescription("");
    setNewTypeCategoryId(null);
    setCreateDialogOpen(true);
  };

  // Execute grouping
  const executeGrouping = async (targetTypeId: string, targetTypeName: string) => {
    if (selectedInputtedData.length === 0) return;

    setIsProcessing(true);
    try {
      for (const inputted of selectedInputtedData) {
        // Create alias for this normalized title
        try {
          await createAliasMutation.mutateAsync({
            aliasRaw: inputted.raw_examples[0] || inputted.title_normalized,
            certificateTypeId: targetTypeId,
          });
        } catch (aliasError: any) {
          // Ignore duplicate alias error
          if (aliasError.code !== "23505") {
            console.error("Error creating alias:", aliasError);
          }
        }

        // Bulk update certificates with this title_normalized
        const totalCount = inputted.count;
        const needsBatching = totalCount > MAX_BATCH_SIZE;

        if (needsBatching) {
          const batchCount = Math.ceil(totalCount / MAX_BATCH_SIZE);
          for (let i = 0; i < batchCount; i++) {
            await bulkUpdateMutation.mutateAsync({
              titleNormalized: inputted.title_normalized,
              certificateTypeId: targetTypeId,
              limit: MAX_BATCH_SIZE,
            });
          }
        } else {
          // Direct update for all certificates
          const { data: certsToUpdate, error: fetchError } = await supabase
            .from("certificates")
            .select(`
              id,
              personnel!inner (business_id)
            `)
            .eq("personnel.business_id", businessId)
            .eq("title_normalized", inputted.title_normalized)
            .is("unmapped_by", null);

          if (fetchError) throw fetchError;

          if (certsToUpdate && certsToUpdate.length > 0) {
            const ids = certsToUpdate.map((c: any) => c.id);
            const { error: updateError } = await supabase
              .from("certificates")
              .update({
                certificate_type_id: targetTypeId,
                needs_review: false,
              })
              .in("id", ids);

            if (updateError) throw updateError;
          }
        }
      }

      toast.success(
        `Grouped ${selectedInputted.size} inputted type${selectedInputted.size !== 1 ? "s" : ""} (${totalSelectedCerts} certificates) into "${targetTypeName}"`
      );

      // Reset selection
      setSelectedInputted(new Set());
      setSelectedMerged(null);
      setConfirmDialogOpen(false);
      setCreateDialogOpen(false);

      // Refresh data
      refetchInputted();
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["certificate-type-usage"] });
    } catch (error) {
      console.error("Grouping error:", error);
      toast.error("Failed to group types");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle create new type and group
  const handleCreateTypeAndGroup = async () => {
    if (!newTypeName.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsProcessing(true);
    try {
      const newType = await createTypeMutation.mutateAsync({
        name: newTypeName.trim(),
        description: newTypeDescription.trim() || undefined,
        category_id: newTypeCategoryId || undefined,
      });

      await executeGrouping(newType.id, newType.name);
    } catch (error) {
      console.error("Error creating type:", error);
      setIsProcessing(false);
    }
  };

  if (loadingInputted || loadingMerged) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const unmappedCount = inputtedTypes.filter((t) => !t.is_mapped).length;

  return (
    <div className="space-y-4">
      {/* Status overview */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {unmappedCount} unmapped type{unmappedCount !== 1 ? "s" : ""}
        </span>
        <span>•</span>
        <span>
          {mergedTypes.filter((t) => t.is_active).length} merged type{mergedTypes.filter((t) => t.is_active).length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Two-pane layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-4 lg:gap-0">
        {/* Left Pane: Inputted Types */}
        <div className="border rounded-lg flex flex-col h-[600px]">
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Inputted Types</h3>
              <Badge variant="secondary">{filteredInputted.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Names entered by personnel during uploads. Select items to group them into official types.
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={leftSearch}
                  onChange={(e) => setLeftSearch(e.target.value)}
                  className="pl-9 h-8"
                />
              </div>
              <Select value={showMapped} onValueChange={(v) => setShowMapped(v as any)}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unmapped">Unmapped</SelectItem>
                  <SelectItem value="mapped">Mapped</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filteredInputted.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedInputted.size === filteredInputted.length && filteredInputted.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-xs text-muted-foreground">
                  {selectedInputted.size > 0
                    ? `${selectedInputted.size} selected (${totalSelectedCerts} certs)`
                    : "Select all"}
                </span>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filteredInputted.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {showMapped === "unmapped" ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-70" />
                      <p className="text-sm">All types are mapped!</p>
                    </>
                  ) : (
                    <p className="text-sm">No inputted types found.</p>
                  )}
                </div>
              ) : (
                filteredInputted.map((inputted) => {
                  const isSelected = selectedInputted.has(inputted.title_normalized);
                  return (
                    <div
                      key={inputted.title_normalized}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleInputtedSelection(inputted.title_normalized)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleInputtedSelection(inputted.title_normalized)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {inputted.display_name}
                            </span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {inputted.count}
                            </Badge>
                            {inputted.is_mapped ? (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 shrink-0">
                                Mapped
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 shrink-0">
                                Unmapped
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {inputted.personnel_count}
                            </span>
                            {inputted.raw_examples.length > 1 && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {inputted.raw_examples.length} variations
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Action Area */}
        <div className="flex flex-col items-center justify-center px-4 py-6 lg:py-0">
          <div className="flex flex-col items-center gap-4 text-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground hidden lg:block" />
            
            <div className="text-xs text-muted-foreground max-w-[200px]">
              Select inputted types on the left, then group them into a merged type on the right.
            </div>

            <div className="flex flex-col gap-2 w-full">
              <Button
                size="sm"
                onClick={handleGroupIntoSelected}
                disabled={!canGroup || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Group into Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateAndGroup}
                disabled={selectedInputted.size === 0 || isProcessing}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create & Group
              </Button>
            </div>

            {selectedInputted.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedInputted(new Set())}
                className="text-xs"
              >
                Clear selection
              </Button>
            )}
          </div>
        </div>

        {/* Right Pane: Merged Types */}
        <div className="border rounded-lg flex flex-col h-[600px]">
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Merged Types</h3>
              <Badge variant="secondary">{filteredMerged.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Official standardized types. Personnel can select these during uploads. Click to select a target for grouping.
            </p>
            <div className="relative pt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search types..."
                value={rightSearch}
                onChange={(e) => setRightSearch(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filteredMerged.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No merged types found.</p>
                  <p className="text-xs mt-1">Create your first type to get started.</p>
                </div>
              ) : (
                filteredMerged.map((merged) => {
                  const isSelected = selectedMerged === merged.id;
                  return (
                    <div
                      key={merged.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10 ring-2 ring-primary ring-inset" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedMerged(isSelected ? null : merged.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{merged.name}</span>
                            {merged.category_name && (
                              <Badge variant="outline" className="text-xs">
                                {merged.category_name}
                              </Badge>
                            )}
                          </div>
                          {merged.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {merged.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Grouping</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are grouping{" "}
                  <strong>{selectedInputted.size} inputted type{selectedInputted.size !== 1 ? "s" : ""}</strong>{" "}
                  (<strong>{totalSelectedCerts} certificate{totalSelectedCerts !== 1 ? "s" : ""}</strong>) into:
                </p>
                <div className="bg-muted rounded-md p-3">
                  <p className="font-medium">{selectedMergedData?.name}</p>
                  {selectedMergedData?.category_name && (
                    <p className="text-sm text-muted-foreground">
                      Category: {selectedMergedData.category_name}
                    </p>
                  )}
                </div>
                <p className="text-sm">
                  This will update all matching certificates and create aliases for future auto-matching.
                </p>
                {totalSelectedCerts > MAX_BATCH_SIZE && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning">Large batch</p>
                      <p className="text-muted-foreground">
                        This will be processed in multiple batches.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeGrouping(selectedMerged!, selectedMergedData!.name)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Grouping...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Type Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Merged Type</DialogTitle>
            <DialogDescription>
              Create a new official type and group the selected inputted types into it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-type-name">Name *</Label>
              <Input
                id="new-type-name"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="e.g., CSWIP 3.2U Inspector"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-type-description">Description</Label>
              <Textarea
                id="new-type-description"
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-type-category">Category</Label>
              <Select
                value={newTypeCategoryId || "none"}
                onValueChange={(v) => setNewTypeCategoryId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted rounded-md p-3 text-sm">
              <p className="text-muted-foreground">
                This will group <strong>{selectedInputted.size} inputted type{selectedInputted.size !== 1 ? "s" : ""}</strong>{" "}
                (<strong>{totalSelectedCerts} certificate{totalSelectedCerts !== 1 ? "s" : ""}</strong>) into the new type.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleCreateTypeAndGroup} disabled={isProcessing || !newTypeName.trim()}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create & Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
