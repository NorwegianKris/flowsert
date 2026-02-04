import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Search,
  MoreHorizontal,
  CheckCircle2,
  Plus,
  XCircle,
  Users,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCertificatesNeedingReview, useBulkUpdateCertificates, ReviewGroup } from "@/hooks/useCertificatesNeedingReview";
import { useCertificateTypes, useCreateCertificateType } from "@/hooks/useCertificateTypes";
import { useCreateAlias } from "@/hooks/useCertificateAliases";
import { CertificateTypeSelector } from "@/components/CertificateTypeSelector";
import { BulkUpdateConfirmDialog, MAX_BATCH_SIZE } from "@/components/BulkUpdateConfirmDialog";
import { MarkUnmappedDialog } from "@/components/MarkUnmappedDialog";
import { toDisplayTitle } from "@/lib/certificateNormalization";
import { toast } from "sonner";

export function CertificateReviewQueue() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<ReviewGroup | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedTypeName, setSelectedTypeName] = useState<string>("");
  const [createAlias, setCreateAlias] = useState(true);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [unmappedDialogOpen, setUnmappedDialogOpen] = useState(false);

  const { businessId } = useAuth();
  const { data, isLoading, refetch } = useCertificatesNeedingReview();
  const { data: types = [] } = useCertificateTypes();
  const bulkUpdateMutation = useBulkUpdateCertificates();
  const createTypeMutation = useCreateCertificateType();
  const createAliasMutation = useCreateAlias();

  const groups = data?.groups || [];
  const unmappedBucket = data?.unmappedBucket || [];

  // Filter groups by search
  const filteredGroups = groups.filter((group) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      group.title_normalized.includes(query) ||
      group.raw_examples.some((ex) => ex.toLowerCase().includes(query))
    );
  });

  const handleMapToType = (group: ReviewGroup) => {
    setSelectedGroup(group);
    setSelectedTypeId(null);
    setSelectedTypeName("");
    setCreateAlias(true);
  };

  const handleTypeSelected = (typeId: string | null, typeName?: string) => {
    setSelectedTypeId(typeId);
    setSelectedTypeName(typeName || "");
    if (typeId && selectedGroup) {
      setBulkDialogOpen(true);
    }
  };

  const handleConfirmBulkUpdate = async () => {
    if (!selectedGroup || !selectedTypeId) return;

    const totalCount = selectedGroup.count;
    const needsBatching = totalCount > MAX_BATCH_SIZE;

    try {
      if (needsBatching) {
        // Process in batches
        let processed = 0;
        const batchCount = Math.ceil(totalCount / MAX_BATCH_SIZE);

        for (let i = 0; i < batchCount; i++) {
          await bulkUpdateMutation.mutateAsync({
            titleNormalized: selectedGroup.title_normalized,
            certificateTypeId: selectedTypeId,
            limit: MAX_BATCH_SIZE,
          });
          processed += MAX_BATCH_SIZE;

          if (i < batchCount - 1) {
            toast.info(`Batch ${i + 1}/${batchCount} complete. Processing next batch...`);
          }
        }
      } else {
        await bulkUpdateMutation.mutateAsync({
          titleNormalized: selectedGroup.title_normalized,
          certificateTypeId: selectedTypeId,
        });
      }

      // Create alias if requested
      if (createAlias) {
        try {
          await createAliasMutation.mutateAsync({
            aliasRaw: selectedGroup.raw_examples[0] || selectedGroup.title_normalized,
            certificateTypeId: selectedTypeId,
          });
          toast.success("Alias created for future auto-matching");
        } catch (aliasError: any) {
          if (aliasError.code !== "23505") {
            console.error("Error creating alias:", aliasError);
          }
        }
      }

      setBulkDialogOpen(false);
      setSelectedGroup(null);
      setSelectedTypeId(null);
      refetch();
    } catch (error) {
      console.error("Bulk update error:", error);
    }
  };

  const handleCreateNewType = async (name: string) => {
    if (!selectedGroup) return;

    try {
      const newType = await createTypeMutation.mutateAsync({ name });
      setSelectedTypeId(newType.id);
      setSelectedTypeName(newType.name);
      setBulkDialogOpen(true);
    } catch (error) {
      console.error("Error creating type:", error);
    }
  };

  const handleMarkUnmapped = (group: ReviewGroup) => {
    setSelectedGroup(group);
    setUnmappedDialogOpen(true);
  };

  const handleUnmappedSuccess = () => {
    setUnmappedDialogOpen(false);
    setSelectedGroup(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalNeedingReview = groups.reduce((sum, g) => sum + g.count, 0) + unmappedBucket.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[250px]"
            />
          </div>
          {totalNeedingReview > 0 && (
            <Badge variant="secondary">
              {totalNeedingReview} certificate{totalNeedingReview !== 1 ? "s" : ""} need review
            </Badge>
          )}
        </div>
      </div>

      {/* Main queue */}
      {filteredGroups.length === 0 && unmappedBucket.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-70" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm mt-1">No certificates need review at the moment.</p>
        </div>
      ) : (
        <>
          {filteredGroups.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Normalized Title</TableHead>
                    <TableHead className="w-[100px]">Count</TableHead>
                    <TableHead className="w-[120px]">Source</TableHead>
                    <TableHead>Examples</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => (
                    <TableRow key={group.title_normalized}>
                      <TableCell>
                        <div className="font-medium">
                          {toDisplayTitle(group.title_normalized)}
                        </div>
                        {group.example_personnel_names.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {group.example_personnel_names.slice(0, 2).join(", ")}
                            {group.example_personnel_names.length > 2 && " ..."}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{group.count}</Badge>
                      </TableCell>
                      <TableCell>
                        {group.has_worker_selected_type ? (
                          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                            Worker-selected
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Unmatched</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {group.raw_examples.slice(0, 2).map((ex, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              "{ex}"
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuItem onClick={() => handleMapToType(group)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Map to Type
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedGroup(group);
                                handleCreateNewType(toDisplayTitle(group.title_normalized));
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create New Type
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleMarkUnmapped(group)}
                              className="text-muted-foreground"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Mark Unmapped
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Unmapped bucket (null/empty title_normalized) */}
          {unmappedBucket.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="font-medium text-sm">Missing Normalized Title</h3>
                <Badge variant="outline">{unmappedBucket.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                These certificates have no normalized title and need individual attention.
                Consider running the Backfill Tool.
              </p>
            </div>
          )}
        </>
      )}

      {/* Type selector popover when mapping */}
      {selectedGroup && !bulkDialogOpen && !unmappedDialogOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background border rounded-lg p-6 shadow-lg max-w-md w-full mx-4 space-y-4">
            <div>
              <h3 className="font-medium">Map to Certificate Type</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select a type for "{toDisplayTitle(selectedGroup.title_normalized)}"
              </p>
            </div>
            <CertificateTypeSelector
              value={selectedTypeId}
              onChange={handleTypeSelected}
              allowCreate
              onCreateNew={handleCreateNewType}
              placeholder="Select or create type..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedGroup(null);
                  setSelectedTypeId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk update confirmation */}
      <BulkUpdateConfirmDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        titleNormalized={toDisplayTitle(selectedGroup?.title_normalized || "")}
        targetTypeName={selectedTypeName}
        certificateCount={selectedGroup?.count || 0}
        createAlias={createAlias}
        onCreateAliasChange={setCreateAlias}
        onConfirm={handleConfirmBulkUpdate}
        isLoading={bulkUpdateMutation.isPending || createAliasMutation.isPending}
      />

      {/* Mark unmapped dialog */}
      {selectedGroup && (
        <MarkUnmappedDialog
          open={unmappedDialogOpen}
          onOpenChange={setUnmappedDialogOpen}
          normalizedTitle={toDisplayTitle(selectedGroup.title_normalized)}
          certificateCount={selectedGroup.count}
          onConfirm={async (reason) => {
            // Bulk mark as unmapped
            if (!selectedGroup) return;
            
            try {
              const { data: certsToUpdate, error: fetchError } = await supabase
                .from("certificates")
                .select(`
                  id,
                  personnel!inner (business_id)
                `)
                .eq("personnel.business_id", businessId)
                .eq("title_normalized", selectedGroup.title_normalized)
                .eq("needs_review", true)
                .is("unmapped_by", null);

              if (fetchError) throw fetchError;

              if (certsToUpdate && certsToUpdate.length > 0) {
                const ids = certsToUpdate.map((c: any) => c.id);
                const { error: updateError } = await supabase
                  .from("certificates")
                  .update({
                    unmapped_by: (await supabase.auth.getUser()).data.user?.id,
                    unmapped_at: new Date().toISOString(),
                    unmapped_reason: reason,
                    needs_review: false,
                  })
                  .in("id", ids);

                if (updateError) throw updateError;
                toast.success(`Marked ${ids.length} certificate${ids.length !== 1 ? "s" : ""} as unmapped`);
              }

              handleUnmappedSuccess();
            } catch (error) {
              console.error("Error marking unmapped:", error);
              toast.error("Failed to mark as unmapped");
            }
          }}
        />
      )}
    </div>
  );
}
