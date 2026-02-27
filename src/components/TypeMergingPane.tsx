import { useState, useMemo, useEffect, useCallback } from "react";
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
  FileText,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Image,
  File,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnmappedCertificates, UnmappedCertificate } from "@/hooks/useUnmappedCertificates";
import {
  useCertificateTypes,
  useCreateCertificateType,
} from "@/hooks/useCertificateTypes";
import { useCreateAlias } from "@/hooks/useCertificateAliases";
import { MAX_BATCH_SIZE } from "@/components/BulkUpdateConfirmDialog";
import { PdfViewer } from "./PdfViewer";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface Category {
  id: string;
  name: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), "d MMM yyyy");
  } catch {
    return null;
  }
}

function getFileIcon(url: string | null) {
  if (!url) return <File className="h-4 w-4 text-muted-foreground" />;
  if (/\.pdf$/i.test(url)) return <FileText className="h-4 w-4 text-destructive/70" />;
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) return <Image className="h-4 w-4 text-primary/70" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export function TypeMergingPane() {
  const { businessId } = useAuth();
  const queryClient = useQueryClient();

  // Left pane state
  const [leftSearch, setLeftSearch] = useState("");
  const [leftCategoryFilter, setLeftCategoryFilter] = useState("");
  const [leftSortBy, setLeftSortBy] = useState<"title_raw" | "expiry_date" | "personnel_name">("title_raw");
  const [visibleCount, setVisibleCount] = useState(50);

  // Data
  const { data: unmappedResult, isLoading: loadingUnmapped } = useUnmappedCertificates({
    search: leftSearch,
    categoryFilter: leftCategoryFilter || undefined,
    sortBy: leftSortBy,
    sortAsc: true,
    limit: visibleCount,
  });
  const unmappedCerts = unmappedResult?.data || [];
  const totalUnmapped = unmappedResult?.total || 0;

  const { data: mergedTypes = [], isLoading: loadingMerged } = useCertificateTypes();
  const createTypeMutation = useCreateCertificateType();
  const createAliasMutation = useCreateAlias();

  // Right pane
  const [rightSearch, setRightSearch] = useState("");
  const [selectedMerged, setSelectedMerged] = useState<string | null>(null);

  // Selection (certificate IDs)
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set());

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [certToDismiss, setCertToDismiss] = useState<UnmappedCertificate | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [newTypeCategoryId, setNewTypeCategoryId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Document viewer state
  const [documentViewOpen, setDocumentViewOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ url: string | null; fileName: string } | null>(null);
  const [documentBlobUrl, setDocumentBlobUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);

  const handleViewDocument = useCallback(async (documentUrl: string, fileName: string) => {
    setViewingDocument({ url: documentUrl, fileName });
    setDocumentViewOpen(true);
    setLoadingDocument(true);
    setDocumentBlobUrl(null);
    setPdfData(null);

    let path = documentUrl;
    if (documentUrl.includes('certificate-documents/')) {
      const match = documentUrl.match(/certificate-documents\/(.+)/);
      if (match) path = match[1];
    }

    const { data, error } = await supabase.storage
      .from('certificate-documents')
      .download(path);

    if (error) {
      console.error('Error downloading document:', error);
      setLoadingDocument(false);
      return;
    }

    if (data) {
      setDocumentBlobUrl(URL.createObjectURL(data));
      if (/\.pdf$/i.test(documentUrl)) {
        const buffer = await data.arrayBuffer();
        setPdfData(buffer);
      }
    }
    setLoadingDocument(false);
  }, []);

  // Fetch categories
  useEffect(() => {
    if (businessId) {
      supabase
        .from("certificate_categories")
        .select("id, name")
        .eq("business_id", businessId)
        .order("name")
        .then(({ data, error }) => {
          if (!error && data) setCategories(data);
        });
    }
  }, [businessId]);

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

  const selectedMergedData = useMemo(() => {
    return mergedTypes.find((t) => t.id === selectedMerged);
  }, [mergedTypes, selectedMerged]);

  // Selection helpers
  const toggleCertSelection = (id: string) => {
    setSelectedCerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = unmappedCerts.map((c) => c.id);
    if (allIds.length > 0 && allIds.every((id) => selectedCerts.has(id))) {
      setSelectedCerts(new Set());
    } else {
      setSelectedCerts(new Set(allIds));
    }
  };

  const canGroup = selectedCerts.size > 0 && selectedMerged !== null;

  const handleGroupIntoSelected = () => {
    if (!canGroup) return;
    setConfirmDialogOpen(true);
  };

  const handleCreateAndGroup = () => {
    if (selectedCerts.size === 0) return;
    setNewTypeName("");
    setNewTypeDescription("");
    setNewTypeCategoryId(null);
    setCreateDialogOpen(true);
  };

  // Execute grouping — direct ID-based updates
  const executeGrouping = async (targetTypeId: string, targetTypeName: string) => {
    if (selectedCerts.size === 0) return;

    setIsProcessing(true);
    try {
      const selectedIds = Array.from(selectedCerts);

      // Collect unique title_normalized values from the selected certs for alias creation
      const selectedCertData = unmappedCerts.filter((c) => selectedCerts.has(c.id));
      const uniqueNormalized = new Map<string, string>();
      for (const cert of selectedCertData) {
        const norm = cert.title_normalized || cert.title_raw;
        if (norm && !uniqueNormalized.has(norm)) {
          uniqueNormalized.set(norm, cert.title_raw);
        }
      }

      // Create aliases for each unique title_normalized
      for (const [, rawExample] of uniqueNormalized) {
        try {
          await createAliasMutation.mutateAsync({
            aliasRaw: rawExample,
            certificateTypeId: targetTypeId,
          });
        } catch (aliasError: any) {
          if (aliasError.code !== "23505") {
            console.error("Error creating alias:", aliasError);
          }
        }
      }

      // Update certificates by ID in batches
      const batchSize = 100;
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        const { error: updateError } = await supabase
          .from("certificates")
          .update({
            certificate_type_id: targetTypeId,
            needs_review: false,
          })
          .in("id", batch);

        if (updateError) throw updateError;
      }

      toast.success(
        `Assigned ${selectedIds.length} certificate${selectedIds.length !== 1 ? "s" : ""} to "${targetTypeName}"`
      );

      setSelectedCerts(new Set());
      setSelectedMerged(null);
      setConfirmDialogOpen(false);
      setCreateDialogOpen(false);

      queryClient.invalidateQueries({ queryKey: ["unmapped-certificates"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["certificate-type-usage"] });
    } catch (error) {
      console.error("Grouping error:", error);
      toast.error("Failed to assign types");
    } finally {
      setIsProcessing(false);
    }
  };

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

  // Dismiss a single certificate
  const handleDismissCert = async (cert: UnmappedCertificate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("certificates")
        .update({
          unmapped_by: user?.id || null,
          unmapped_at: new Date().toISOString(),
          unmapped_reason: "Dismissed by admin",
        })
        .eq("id", cert.id);

      if (error) throw error;

      toast.success("Certificate dismissed");
      queryClient.invalidateQueries({ queryKey: ["unmapped-certificates"] });
    } catch (error) {
      console.error("Error dismissing certificate:", error);
      toast.error("Failed to dismiss certificate");
    }
  };

  if (loadingUnmapped || loadingMerged) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status overview */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {totalUnmapped} unmapped certificate{totalUnmapped !== 1 ? "s" : ""}
        </span>
        <span>•</span>
        <span>
          {mergedTypes.filter((t) => t.is_active).length} canonical type{mergedTypes.filter((t) => t.is_active).length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Two-pane layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-4 lg:gap-0">
        {/* Left Pane: Unmapped Certificates */}
        <div className="border rounded-lg flex flex-col h-[600px]">
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Unmapped Certificates</h3>
              <Badge variant="secondary">{totalUnmapped}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Individual certificates without an assigned type. Select to assign a canonical type.
            </p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title or personnel..."
                value={leftSearch}
                onChange={(e) => { setLeftSearch(e.target.value); setVisibleCount(50); }}
                className="pl-9 h-8"
              />
            </div>

            {/* Filters row */}
            <div className="flex items-center gap-2">
              <Select
                value={leftCategoryFilter || "all"}
                onValueChange={(v) => { setLeftCategoryFilter(v === "all" ? "" : v); setVisibleCount(50); }}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={leftSortBy}
                onValueChange={(v) => setLeftSortBy(v as any)}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title_raw">Title A-Z</SelectItem>
                  <SelectItem value="expiry_date">Expiry Date</SelectItem>
                  <SelectItem value="personnel_name">Personnel Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select all */}
            {unmappedCerts.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={unmappedCerts.length > 0 && unmappedCerts.every((c) => selectedCerts.has(c.id))}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-xs text-muted-foreground">
                  {selectedCerts.size > 0
                    ? `${selectedCerts.size} selected`
                    : "Select all visible"}
                </span>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y">
              {unmappedCerts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-primary opacity-70" />
                  <p className="text-sm">
                    {leftSearch || leftCategoryFilter
                      ? "No matching certificates found."
                      : "All certificates are mapped!"}
                  </p>
                </div>
              ) : (
                unmappedCerts.map((cert) => {
                  const isSelected = selectedCerts.has(cert.id);
                  return (
                    <div
                      key={cert.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleCertSelection(cert.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCertSelection(cert.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5"
                        />

                        {/* File icon — clickable to view */}
                        <button
                          className="shrink-0 mt-0.5 hover:opacity-70"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (cert.document_url) {
                              const fileName = decodeURIComponent(
                                cert.document_url.split("/").pop() || "document"
                              ).replace(/^\d+-/, "");
                              handleViewDocument(cert.document_url, fileName);
                            }
                          }}
                          title={cert.document_url ? "View document" : undefined}
                          disabled={!cert.document_url}
                        >
                          {getFileIcon(cert.document_url)}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Personnel name */}
                          <p className="font-medium text-sm truncate">{cert.personnel_name}</p>
                          {/* title_raw */}
                          <p className="text-xs text-muted-foreground truncate">{cert.title_raw}</p>
                          {/* Category + expiry */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {cert.category_name && (
                              <Badge variant="outline" className="text-[10px] py-0">
                                {cert.category_name}
                              </Badge>
                            )}
                            {cert.expiry_date && (
                              <span className="text-[11px] text-muted-foreground">
                                Exp: {formatDate(cert.expiry_date)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dismiss */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCertToDismiss(cert);
                            setDismissDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Load more */}
              {visibleCount < totalUnmapped && (
                <div className="p-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((v) => v + 50)}
                  >
                    Load more ({totalUnmapped - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Action Area */}
        <div className="flex flex-col items-center justify-center px-4 py-6 lg:py-0">
          <div className="flex flex-col items-center gap-4 text-center">
            <Button size="icon" className="rounded-full hidden lg:flex" disabled>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="text-xs text-muted-foreground max-w-[200px]">
              Select certificates on the left, then assign them to a canonical type on the right.
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
                Assign Type
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateAndGroup}
                disabled={selectedCerts.size === 0 || isProcessing}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create & Group
              </Button>
            </div>

            {selectedCerts.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCerts(new Set())}
                className="text-xs"
              >
                Clear selection
              </Button>
            )}
          </div>
        </div>

        {/* Right Pane: Canonical Types */}
        <div className="border rounded-lg flex flex-col h-[600px]">
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Canonical Types</h3>
              <Badge variant="secondary">{filteredMerged.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Official standardized types. Select a target for assignment.
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
            <div>
              {filteredMerged.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No canonical types found.</p>
                  <p className="text-xs mt-1">Create your first type to get started.</p>
                </div>
              ) : (
                (() => {
                  const groups = new Map<string, typeof filteredMerged>();
                  filteredMerged.forEach((merged) => {
                    const cat = merged.category_name || "Uncategorized";
                    if (!groups.has(cat)) groups.set(cat, []);
                    groups.get(cat)!.push(merged);
                  });
                  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
                    if (a === "Uncategorized") return 1;
                    if (b === "Uncategorized") return -1;
                    return a.localeCompare(b);
                  });
                  sortedKeys.forEach((key) => {
                    groups.get(key)!.sort((a, b) => a.name.localeCompare(b.name));
                  });

                  return sortedKeys.map((categoryName) => (
                    <div key={categoryName}>
                      <div className="font-semibold text-xs uppercase text-muted-foreground bg-muted/50 px-3 py-2 border-b sticky top-0">
                        {categoryName}
                      </div>
                      {groups.get(categoryName)!.map((merged) => {
                        const isSelected = selectedMerged === merged.id;
                        return (
                          <div
                            key={merged.id}
                            className={`p-3 cursor-pointer transition-colors border-b ${
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
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    {(merged as any).usage_count || 0} cert{(merged as any).usage_count !== 1 ? "s" : ""}
                                  </Badge>
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
                      })}
                    </div>
                  ));
                })()
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Assignment</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are assigning{" "}
                  <strong>{selectedCerts.size} certificate{selectedCerts.size !== 1 ? "s" : ""}</strong>{" "}
                  to:
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
                  This will set the type on all selected certificates and create aliases for future auto-matching.
                </p>
                {selectedCerts.size > MAX_BATCH_SIZE && (
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
                  Assigning...
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
            <DialogTitle>Create Canonical Type</DialogTitle>
            <DialogDescription>
              Create a new official type and assign the selected certificates to it.
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
                This will assign <strong>{selectedCerts.size} certificate{selectedCerts.size !== 1 ? "s" : ""}</strong> to the new type.
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

      {/* Dismiss Certificate Confirmation Dialog */}
      <AlertDialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss Certificate</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Dismiss "{certToDismiss?.title_raw}" from {certToDismiss?.personnel_name}?
                </p>
                <p className="text-sm">
                  The certificate will no longer appear in the unmapped list but will not be deleted.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (certToDismiss) {
                  handleDismissCert(certToDismiss);
                  setDismissDialogOpen(false);
                  setCertToDismiss(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Viewer Dialog */}
      <Dialog
        open={documentViewOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (documentBlobUrl) URL.revokeObjectURL(documentBlobUrl);
            setDocumentBlobUrl(null);
            setPdfData(null);
            setViewingDocument(null);
          }
          setDocumentViewOpen(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingDocument?.fileName || "Document"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {loadingDocument ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading document...</span>
              </div>
            ) : pdfData && viewingDocument?.url && /\.pdf$/i.test(viewingDocument.url) ? (
              <PdfViewer pdfData={pdfData} />
            ) : documentBlobUrl && viewingDocument?.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(viewingDocument.url) ? (
              <img
                src={documentBlobUrl}
                alt={viewingDocument.fileName}
                className="max-h-[70vh] w-auto mx-auto object-contain rounded"
              />
            ) : documentBlobUrl ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
                <Button asChild>
                  <a href={documentBlobUrl} download={viewingDocument?.fileName}>
                    Download File
                  </a>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-destructive">
                Failed to load document. Please try again.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
