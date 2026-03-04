import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Merge,
  Calendar,
  FileText,
  ImageOff,
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
import { getCertificateDocumentUrl } from "@/lib/storageUtils";
import { toast } from "sonner";
import { format } from "date-fns";

// Thumbnail sub-component that handles signed URL fetching
function CertificateThumbnail({
  documentUrl,
  size = 40,
}: {
  documentUrl: string | null;
  size?: number;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPdf = documentUrl?.toLowerCase().endsWith(".pdf");
  const isImage = !isPdf && documentUrl != null;

  useEffect(() => {
    if (!documentUrl || isPdf) return;
    let cancelled = false;
    setLoading(true);
    getCertificateDocumentUrl(documentUrl).then((url) => {
      if (!cancelled) {
        setSignedUrl(url);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [documentUrl, isPdf]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!documentUrl) return;
    const url = await getCertificateDocumentUrl(documentUrl);
    if (url) window.open(url, "_blank");
  };

  if (!documentUrl) {
    return (
      <div
        className="flex items-center justify-center rounded bg-muted"
        style={{ width: size, height: size }}
      >
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  if (isPdf) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center justify-center rounded bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
        style={{ width: size, height: size }}
        title="Open PDF"
      >
        <FileText className="h-5 w-5 text-muted-foreground" />
      </button>
    );
  }

  if (loading || !signedUrl) {
    return (
      <div
        className="flex items-center justify-center rounded bg-muted animate-pulse"
        style={{ width: size, height: size }}
      />
    );
  }

  if (imgError) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center justify-center rounded bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
        style={{ width: size, height: size }}
        title="Open document"
      >
        <FileText className="h-5 w-5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <button onClick={handleClick} className="cursor-pointer" title="Open document">
      <img
        src={signedUrl}
        alt="Certificate"
        className="rounded object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    </button>
  );
}

// Extended group with additional details from certificates
interface ExtendedReviewGroup extends ReviewGroup {
  latest_upload_date?: string;
  sample_documents?: { name: string; id: string }[];
  all_personnel_names?: string[];
}

export function CertificateReviewQueue() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedTypeName, setSelectedTypeName] = useState<string>("");
  const [createAlias, setCreateAlias] = useState(true);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [unmappedDialogOpen, setUnmappedDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  const { businessId } = useAuth();
  const { data, isLoading, refetch } = useCertificatesNeedingReview();
  const { data: types = [] } = useCertificateTypes();
  const bulkUpdateMutation = useBulkUpdateCertificates();
  const createTypeMutation = useCreateCertificateType();
  const createAliasMutation = useCreateAlias();

  const groups = data?.groups || [];
  const unmappedBucket = data?.unmappedBucket || [];

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        group.title_normalized.includes(query) ||
        group.raw_examples.some((ex) => ex.toLowerCase().includes(query))
      );
    });
  }, [groups, searchQuery]);

  // Get selected groups data
  const selectedGroupsData = useMemo(() => {
    return filteredGroups.filter((g) => selectedGroups.has(g.title_normalized));
  }, [filteredGroups, selectedGroups]);

  const totalSelectedCount = useMemo(() => {
    return selectedGroupsData.reduce((sum, g) => sum + g.count, 0);
  }, [selectedGroupsData]);

  // Toggle row selection
  const toggleRowSelection = (titleNormalized: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(titleNormalized)) {
        next.delete(titleNormalized);
      } else {
        next.add(titleNormalized);
      }
      return next;
    });
  };

  // Toggle all selection
  const toggleSelectAll = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map((g) => g.title_normalized)));
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (titleNormalized: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(titleNormalized)) {
        next.delete(titleNormalized);
      } else {
        next.add(titleNormalized);
      }
      return next;
    });
  };

  // Handle merge selected
  const handleMergeSelected = () => {
    if (selectedGroups.size < 1) return;
    setMergeDialogOpen(true);
  };

  // Handle skip selected
  const handleSkipSelected = () => {
    if (selectedGroups.size < 1) return;
    setUnmappedDialogOpen(true);
  };

  const handleTypeSelected = (typeId: string | null, typeName?: string) => {
    setSelectedTypeId(typeId);
    setSelectedTypeName(typeName || "");
    if (typeId) {
      setMergeDialogOpen(false);
      setBulkDialogOpen(true);
    }
  };

  const handleConfirmBulkUpdate = async () => {
    if (!selectedTypeId || selectedGroupsData.length === 0) return;

    // Look up the selected type's category_id
    const selectedType = types.find((t: any) => t.id === selectedTypeId);
    const categoryId = selectedType?.category_id || null;

    try {
      for (const group of selectedGroupsData) {
        const totalCount = group.count;
        const needsBatching = totalCount > MAX_BATCH_SIZE;

        if (needsBatching) {
          const batchCount = Math.ceil(totalCount / MAX_BATCH_SIZE);
          for (let i = 0; i < batchCount; i++) {
            await bulkUpdateMutation.mutateAsync({
              titleNormalized: group.title_normalized,
              certificateTypeId: selectedTypeId,
              categoryId,
              limit: MAX_BATCH_SIZE,
            });
          }
        } else {
          await bulkUpdateMutation.mutateAsync({
            titleNormalized: group.title_normalized,
            certificateTypeId: selectedTypeId,
            categoryId,
          });
        }

        // Create alias for each group if requested
        if (createAlias) {
          try {
            await createAliasMutation.mutateAsync({
              aliasRaw: group.raw_examples[0] || group.title_normalized,
              certificateTypeId: selectedTypeId,
            });
          } catch (aliasError: any) {
            if (aliasError.code !== "23505") {
              console.error("Error creating alias:", aliasError);
            }
          }
        }
      }

      toast.success(`Merged ${totalSelectedCount} certificates into "${selectedTypeName}"`);
      setBulkDialogOpen(false);
      setSelectedGroups(new Set());
      setSelectedTypeId(null);
      refetch();
    } catch (error) {
      console.error("Bulk update error:", error);
    }
  };

  const handleCreateNewType = async (name: string) => {
    try {
      const newType = await createTypeMutation.mutateAsync({ name });
      setSelectedTypeId(newType.id);
      setSelectedTypeName(newType.name);
      setMergeDialogOpen(false);
      setBulkDialogOpen(true);
    } catch (error) {
      console.error("Error creating type:", error);
    }
  };

  const handleUnmappedConfirm = async (reason: string) => {
    if (selectedGroupsData.length === 0) return;

    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      for (const group of selectedGroupsData) {
        const { data: certsToUpdate, error: fetchError } = await supabase
          .from("certificates")
          .select(`
            id,
            personnel!inner (business_id)
          `)
          .eq("personnel.business_id", businessId)
          .eq("title_normalized", group.title_normalized)
          .eq("needs_review", true)
          .is("unmapped_by", null);

        if (fetchError) throw fetchError;

        if (certsToUpdate && certsToUpdate.length > 0) {
          const ids = certsToUpdate.map((c: any) => c.id);
          const { error: updateError } = await supabase
            .from("certificates")
            .update({
              unmapped_by: userId,
              unmapped_at: new Date().toISOString(),
              unmapped_reason: reason,
              needs_review: false,
            })
            .in("id", ids);

          if (updateError) throw updateError;
        }
      }

      toast.success(`Marked ${totalSelectedCount} certificates as skipped`);
      setUnmappedDialogOpen(false);
      setSelectedGroups(new Set());
      refetch();
    } catch (error) {
      console.error("Error marking unmapped:", error);
      toast.error("Failed to skip selected groups");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalNeedingReview = groups.reduce((sum, g) => sum + g.count, 0) + unmappedBucket.length;
  const hasSelection = selectedGroups.size > 0;

  return (
    <div className="space-y-4">
      {/* Header with search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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

      {/* Sticky Action Bar */}
      {hasSelection && (
        <div className="sticky top-0 z-10 bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="px-3">
              {selectedGroups.size} group{selectedGroups.size !== 1 ? "s" : ""} selected
            </Badge>
            <span className="text-sm text-muted-foreground">
              ({totalSelectedCount} certificate{totalSelectedCount !== 1 ? "s" : ""})
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="default"
              size="sm"
              onClick={handleMergeSelected}
              disabled={selectedGroups.size < 1}
            >
              <Merge className="h-4 w-4 mr-2" />
              Merge Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipSelected}
              disabled={selectedGroups.size < 1}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Skip Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedGroups(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

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
                  <TableRow className="bg-white dark:bg-card">
                    <TableHead className="w-[50px] p-2">
                      <Checkbox
                        checked={selectedGroups.size === filteredGroups.length && filteredGroups.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[50px] p-1"></TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Normalized Title</TableHead>
                    <TableHead className="w-[80px] text-center">Count</TableHead>
                    <TableHead className="w-[120px]">People</TableHead>
                    <TableHead className="w-[120px]">Latest Upload</TableHead>
                    <TableHead>Raw Examples</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => {
                    const isExpanded = expandedRows.has(group.title_normalized);
                    const isSelected = selectedGroups.has(group.title_normalized);
                    const rawExamplesToShow = group.raw_examples.slice(0, 3);
                    const remainingExamples = group.raw_examples.length - 3;

                    return (
                      <Collapsible key={group.title_normalized} open={isExpanded} asChild>
                        <>
                          <TableRow
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-primary/5" : "bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20"
                            }`}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()} className="p-1">
                              <CertificateThumbnail documentUrl={group.sample_document_url} size={40} />
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleRowSelection(group.title_normalized)}
                                aria-label={`Select ${group.title_normalized}`}
                              />
                            </TableCell>
                            <TableCell onClick={() => toggleRowExpansion(group.title_normalized)}>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell onClick={() => toggleRowExpansion(group.title_normalized)}>
                              <div className="font-medium">
                                {toDisplayTitle(group.title_normalized)}
                              </div>
                              {group.has_worker_selected_type && (
                                <Badge variant="outline" className="mt-1 text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                                  Worker-selected
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center" onClick={() => toggleRowExpansion(group.title_normalized)}>
                              <Badge variant="secondary">{group.count}</Badge>
                            </TableCell>
                            <TableCell onClick={() => toggleRowExpansion(group.title_normalized)}>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>
                                  {group.example_personnel_names.length}
                                  {group.example_personnel_names.length >= 3 && "+"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell onClick={() => toggleRowExpansion(group.title_normalized)}>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>—</span>
                              </div>
                            </TableCell>
                            <TableCell onClick={() => toggleRowExpansion(group.title_normalized)}>
                              <div className="text-sm text-muted-foreground space-y-0.5">
                                {rawExamplesToShow.map((ex, i) => (
                                  <div key={i} className="truncate max-w-[250px]" title={ex}>
                                    "{ex}"
                                  </div>
                                ))}
                                {remainingExamples > 0 && (
                                  <div className="text-xs text-primary">
                                    +{remainingExamples} more
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow className="bg-white dark:bg-card hover:bg-white dark:hover:bg-card">
                              <TableCell colSpan={8} className="p-0">
                                <div className="px-6 py-4 space-y-4">
                                  {/* Document Preview */}
                                  {group.sample_document_url && (
                                    <div>
                                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Document Preview
                                      </h4>
                                      <CertificateThumbnail documentUrl={group.sample_document_url} size={120} />
                                    </div>
                                  )}
                                  {/* Personnel Names */}
                                  <div>
                                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      Personnel
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                    {group.example_personnel_names.map((name, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                          {name}
                                        </Badge>
                                      ))}
                                      {group.example_personnel_names.length === 0 && (
                                        <span className="text-sm text-muted-foreground">No personnel data</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Raw Title Variations */}
                                  <div>
                                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Title Variations Seen ({group.raw_examples.length})
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {group.raw_examples.map((ex, i) => (
                                        <div
                                          key={i}
                                          className="text-sm bg-background border rounded px-2 py-1 truncate"
                                          title={ex}
                                        >
                                          "{ex}"
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Quick Actions */}
                                  <div className="flex items-center gap-2 pt-2 border-t">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedGroups(new Set([group.title_normalized]));
                                        handleMergeSelected();
                                      }}
                                    >
                                      <Merge className="h-3.5 w-3.5 mr-1.5" />
                                      Merge This Group
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedGroups(new Set([group.title_normalized]));
                                        handleSkipSelected();
                                      }}
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                      Skip
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Unmapped bucket (null/empty title_normalized) */}
          {unmappedBucket.length > 0 && (
            <div className="space-y-2 p-4 border rounded-lg bg-warning/5 border-warning/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
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

      {/* Merge Dialog - Type selector */}
      {mergeDialogOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background border rounded-lg p-6 shadow-lg max-w-md w-full mx-4 space-y-4">
            <div>
              <h3 className="font-medium text-lg flex items-center gap-2">
                <Merge className="h-5 w-5" />
                Merge {selectedGroups.size} Group{selectedGroups.size !== 1 ? "s" : ""}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select or create a certificate type to merge {totalSelectedCount} certificate
                {totalSelectedCount !== 1 ? "s" : ""} into.
              </p>
            </div>

            {selectedGroups.size > 0 && (
              <div className="max-h-[120px] overflow-y-auto space-y-1 p-2 bg-white dark:bg-card rounded-md">
                {Array.from(selectedGroups).map((title) => (
                  <div key={title} className="text-sm text-foreground truncate">
                    • {toDisplayTitle(title)}
                  </div>
                ))}
              </div>
            )}

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
                  setMergeDialogOpen(false);
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
        titleNormalized={
          selectedGroupsData.length === 1
            ? toDisplayTitle(selectedGroupsData[0]?.title_normalized || "")
            : `${selectedGroups.size} groups`
        }
        targetTypeName={selectedTypeName}
        certificateCount={totalSelectedCount}
        createAlias={createAlias}
        onCreateAliasChange={setCreateAlias}
        onConfirm={handleConfirmBulkUpdate}
        isLoading={bulkUpdateMutation.isPending || createAliasMutation.isPending}
      />

      {/* Mark unmapped dialog for skip */}
      <MarkUnmappedDialog
        open={unmappedDialogOpen}
        onOpenChange={setUnmappedDialogOpen}
        normalizedTitle={
          selectedGroupsData.length === 1
            ? toDisplayTitle(selectedGroupsData[0]?.title_normalized || "")
            : `${selectedGroups.size} groups`
        }
        certificateCount={totalSelectedCount}
        onConfirm={handleUnmappedConfirm}
      />
    </div>
  );
}
