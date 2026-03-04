import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Loader2,
  Search,
  ArrowRight,
  Check,
  Plus,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Calendar,
  ExternalLink,
  Trash2,
  Sparkles,
} from "lucide-react";
import { AIIssuerSuggestDialog } from "./AIIssuerSuggestDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInputtedIssuers, InputtedIssuer, useDismissInputtedIssuer } from "@/hooks/useInputtedIssuers";
import {
  useIssuerTypes,
  useCreateIssuerType,
  IssuerType,
} from "@/hooks/useIssuerTypes";
import { useCreateIssuerAlias } from "@/hooks/useIssuerAliases";
import { normalizeCertificateTitle } from "@/lib/certificateNormalization";
import { PdfViewer } from "./PdfViewer";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), "d MMM yyyy");
  } catch {
    return null;
  }
}

/** Hook to fetch certificates linked to a specific issuer type */
function useIssuerTypeCertificates(issuerTypeId: string | null, businessId: string | null) {
  return useQuery({
    queryKey: ["issuer-type-certificates", issuerTypeId, businessId],
    queryFn: async () => {
      if (!issuerTypeId || !businessId) return [];

      const { data, error } = await supabase
        .from("certificates")
        .select(`
          id,
          name,
          date_of_issue,
          expiry_date,
          issuing_authority,
          personnel!inner (
            id,
            name,
            business_id
          )
        `)
        .eq("issuer_type_id", issuerTypeId)
        .eq("personnel.business_id", businessId)
        .order("name")
        .limit(20);

      if (error) {
        console.error("Error fetching issuer type certificates:", error);
        return [];
      }

      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        date_of_issue: c.date_of_issue,
        expiry_date: c.expiry_date,
        issuing_authority: c.issuing_authority,
        personnel_name: c.personnel?.name || "Unknown",
      }));
    },
    enabled: !!issuerTypeId && !!businessId,
    staleTime: 1000 * 60 * 2,
  });
}

export function IssuerMergingPane() {
  const { businessId } = useAuth();
  const queryClient = useQueryClient();

  const [showMapped, setShowMapped] = useState(false);

  const { data: inputtedIssuers = [], isLoading: loadingInputted, refetch: refetchInputted } = useInputtedIssuers({
    includeMapped: showMapped,
  });
  const { data: mergedIssuers = [], isLoading: loadingMerged } = useIssuerTypes();
  const createIssuerMutation = useCreateIssuerType();
  const createAliasMutation = useCreateIssuerAlias();
  const dismissInputtedMutation = useDismissInputtedIssuer();

  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [selectedInputted, setSelectedInputted] = useState<Set<string>>(new Set());
  const [selectedMerged, setSelectedMerged] = useState<string | null>(null);

  // Track which right-pane issuer rows are expanded
  const [expandedIssuers, setExpandedIssuers] = useState<Set<string>>(new Set());

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [issuerToDelete, setIssuerToDelete] = useState<InputtedIssuer | null>(null);
  const [newIssuerName, setNewIssuerName] = useState("");
  const [newIssuerDescription, setNewIssuerDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [aiDialogOpen, setAiDialogOpen] = useState(false);
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

  const filteredInputted = useMemo(() => {
    return inputtedIssuers.filter((t) => {
      if (leftSearch) {
        const query = leftSearch.toLowerCase();
        return (
          t.issuer_normalized.includes(query) ||
          t.display_name.toLowerCase().includes(query) ||
          t.raw_examples.some((ex) => ex.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [inputtedIssuers, leftSearch]);

  const filteredMerged = useMemo(() => {
    return mergedIssuers.filter((t) => {
      if (!t.is_active) return false;
      if (rightSearch) {
        const query = rightSearch.toLowerCase();
        return (
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [mergedIssuers, rightSearch]);

  const selectedInputtedData = useMemo(() => {
    return filteredInputted.filter((t) => selectedInputted.has(t.issuer_normalized));
  }, [filteredInputted, selectedInputted]);

  const totalSelectedCerts = useMemo(() => {
    return selectedInputtedData.reduce((sum, t) => sum + t.count, 0);
  }, [selectedInputtedData]);

  const selectedMergedData = useMemo(() => {
    return mergedIssuers.find((t) => t.id === selectedMerged);
  }, [mergedIssuers, selectedMerged]);

  const toggleInputtedSelection = (issuerNormalized: string) => {
    setSelectedInputted((prev) => {
      const next = new Set(prev);
      if (next.has(issuerNormalized)) {
        next.delete(issuerNormalized);
      } else {
        next.add(issuerNormalized);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedInputted.size === filteredInputted.length) {
      setSelectedInputted(new Set());
    } else {
      setSelectedInputted(new Set(filteredInputted.map((t) => t.issuer_normalized)));
    }
  };

  const toggleExpanded = (issuerId: string) => {
    setExpandedIssuers((prev) => {
      const next = new Set(prev);
      if (next.has(issuerId)) next.delete(issuerId);
      else next.add(issuerId);
      return next;
    });
  };

  const canGroup = selectedInputted.size > 0 && selectedMerged !== null;

  const handleGroupIntoSelected = () => {
    if (!canGroup) return;
    setConfirmDialogOpen(true);
  };

  const handleCreateAndGroup = () => {
    if (selectedInputted.size === 0) return;
    setNewIssuerName("");
    setNewIssuerDescription("");
    setCreateDialogOpen(true);
  };

  const executeGrouping = async (targetIssuerTypeId: string, targetIssuerName: string) => {
    if (selectedInputtedData.length === 0) return;

    setIsProcessing(true);
    try {
      for (const inputted of selectedInputtedData) {
        // Create alias
        try {
          await createAliasMutation.mutateAsync({
            aliasRaw: inputted.raw_examples[0] || inputted.issuer_normalized,
            issuerTypeId: targetIssuerTypeId,
          });
        } catch (aliasError: any) {
          if (aliasError.code !== "23505") {
            console.error("Error creating alias:", aliasError);
          }
        }

        // Bulk update certificates: find by normalized issuing_authority
        const { data: allCerts, error: fetchError } = await supabase
          .from("certificates")
          .select(`
            id,
            issuing_authority,
            personnel!inner (business_id)
          `)
          .eq("personnel.business_id", businessId)
          .is("unmapped_by", null)
          .not("issuing_authority", "is", null);

        if (fetchError) throw fetchError;

        const matchingIds = (allCerts || [])
          .filter((c: any) => {
            const raw = c.issuing_authority?.trim();
            if (!raw) return false;
            const normalized = normalizeCertificateTitle(raw) || raw.toLowerCase();
            return normalized === inputted.issuer_normalized;
          })
          .map((c: any) => c.id);

        if (matchingIds.length > 0) {
          const { error: updateError } = await supabase
            .from("certificates")
            .update({
              issuer_type_id: targetIssuerTypeId,
            })
            .in("id", matchingIds);

          if (updateError) throw updateError;
        }
      }

      toast.success(
        `Grouped ${selectedInputted.size} inputted issuer${selectedInputted.size !== 1 ? "s" : ""} (${totalSelectedCerts} certificates) into "${targetIssuerName}"`
      );

      setSelectedInputted(new Set());
      setSelectedMerged(null);
      setConfirmDialogOpen(false);
      setCreateDialogOpen(false);

      refetchInputted();
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["issuer-type-usage"] });
      queryClient.invalidateQueries({ queryKey: ["issuer-types"] });
      queryClient.invalidateQueries({ queryKey: ["issuer-type-certificates"] });
      queryClient.invalidateQueries({ queryKey: ["needs-review-count"] });
    } catch (error) {
      console.error("Grouping error:", error);
      toast.error("Failed to group issuers");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateIssuerAndGroup = async () => {
    if (!newIssuerName.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsProcessing(true);
    try {
      const newIssuer = await createIssuerMutation.mutateAsync({
        name: newIssuerName.trim(),
        description: newIssuerDescription.trim() || undefined,
      });

      await executeGrouping(newIssuer.id, newIssuer.name);
    } catch (error) {
      console.error("Error creating issuer:", error);
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

  const unmappedCount = inputtedIssuers.filter((t) => !t.is_mapped).length;
  const mappedCount = inputtedIssuers.filter((t) => t.is_mapped).length;

  return (
    <div className="space-y-4">
      {/* Status overview */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {unmappedCount} unmapped issuer{unmappedCount !== 1 ? "s" : ""}
        </span>
        {showMapped && mappedCount > 0 && (
          <>
            <span>•</span>
            <span>
              {mappedCount} mapped issuer{mappedCount !== 1 ? "s" : ""}
            </span>
          </>
        )}
        <span>•</span>
        <span>
          {mergedIssuers.filter((t) => t.is_active).length} canonical issuer{mergedIssuers.filter((t) => t.is_active).length !== 1 ? "s" : ""}
        </span>
      </div>

      <AIIssuerSuggestDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        businessId={businessId || ""}
        unmappedIssuers={inputtedIssuers.filter((t) => !t.is_mapped)}
        totalUnmapped={unmappedCount}
        mergedIssuers={mergedIssuers}
      />

      {/* Three-pane layout matching TypeMergingPane */}
      <div className="flex flex-col lg:flex-row lg:gap-0 gap-4 overflow-hidden">
        {/* Left Pane: Inputted Issuers */}
        <div className="border rounded-lg flex flex-col h-[600px] min-w-0" style={{ flex: "0 0 35%" }}>
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Inputted Issuers</h3>
              <Badge variant="secondary">{filteredInputted.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {showMapped
                ? "All issuing authorities from uploads. Mapped items show their current issuer."
                : "Issuing authorities entered during uploads. Select items to group them into official issuers."}
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={leftSearch}
                  onChange={(e) => setLeftSearch(e.target.value)}
                className="pl-9 h-8 bg-white dark:bg-card"
              />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-mapped-issuers"
                  checked={showMapped}
                  onCheckedChange={setShowMapped}
                />
                <Label
                  htmlFor="show-mapped-issuers"
                  className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
                >
                  Show mapped
                </Label>
              </div>
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
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-primary opacity-70" />
                  <p className="text-sm">
                    {leftSearch ? "No matching issuers found." : "All issuers are mapped!"}
                  </p>
                </div>
              ) : (
                filteredInputted.map((inputted) => {
                  const isSelected = selectedInputted.has(inputted.issuer_normalized);

                  const certLabel = inputted.count === 1 ? "certificate" : "certificates";
                  const uploadedByText = inputted.personnel_count === 1
                    ? `Uploaded by ${inputted.personnel_names[0] || "Unknown"}`
                    : `${inputted.personnel_count} people`;
                  const secondaryText = `${inputted.count} ${certLabel} • ${uploadedByText}`;

                  let tertiaryHint: string | null = null;
                  if (inputted.sample_expiry_date) {
                    tertiaryHint = `Expires: ${formatDate(inputted.sample_expiry_date)}`;
                  } else if (inputted.sample_file_name) {
                    tertiaryHint = `File: ${inputted.sample_file_name}`;
                  } else if (inputted.raw_examples.length > 0 && inputted.raw_examples[0] !== inputted.display_name) {
                    tertiaryHint = `Example: "${inputted.raw_examples[0]}"`;
                  }

                  return (
                    <Collapsible key={inputted.issuer_normalized}>
                      <div
                        className={`transition-colors ${
                          isSelected ? "bg-primary/10" : "bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20"
                        }`}
                      >
                        <div
                          className="p-3 cursor-pointer"
                          onClick={() => toggleInputtedSelection(inputted.issuer_normalized)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleInputtedSelection(inputted.issuer_normalized)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                  {inputted.display_name}
                                </span>
                              </div>

                              <p className="text-xs text-muted-foreground mt-1">
                                {secondaryText}
                              </p>

                              {inputted.is_mapped && inputted.mapped_type_name ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <CheckCircle2 className="h-3 w-3 text-status-valid" />
                                  <span className="text-xs text-status-valid">
                                    Mapped to: {inputted.mapped_type_name}
                                  </span>
                                </div>
                              ) : tertiaryHint ? (
                                <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                                  {tertiaryHint}
                                </p>
                              ) : null}
                            </div>

                            {!inputted.is_mapped && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIssuerToDelete(inputted);
                                  setDismissDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}

                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="px-3 pb-3 pt-0 pl-10 space-y-3 border-t border-border/50 bg-muted/20">
                            {inputted.raw_examples.length > 1 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                                  Name Variations
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {inputted.raw_examples.map((example, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[10px] font-normal">
                                      {example}
                                    </Badge>
                                  ))}
                                  {inputted.raw_examples.length >= 5 && (
                                    <span className="text-[10px] text-muted-foreground self-center">
                                      +more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                                Included Certificates
                              </p>
                              <div className="space-y-1.5">
                                {inputted.certificates.slice(0, 5).map((cert) => (
                                  <div
                                    key={cert.id}
                                    className="flex items-center gap-2 text-xs text-muted-foreground"
                                  >
                                    <span className="font-medium text-foreground truncate max-w-[120px]">
                                      {cert.personnel_name}
                                    </span>
                                    <span className="text-muted-foreground/50">—</span>
                                    {cert.file_name ? (
                                      cert.document_url ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewDocument(cert.document_url!, cert.file_name || 'Document');
                                          }}
                                          className="truncate max-w-[140px] text-primary hover:underline flex items-center gap-1 text-left"
                                        >
                                          {cert.file_name}
                                          <ExternalLink className="h-3 w-3 shrink-0" />
                                        </button>
                                      ) : (
                                        <span className="truncate max-w-[140px]">{cert.file_name}</span>
                                      )
                                    ) : (
                                      <span className="italic">No file</span>
                                    )}
                                    {cert.expiry_date && (
                                      <>
                                        <span className="text-muted-foreground/50">—</span>
                                        <span className="shrink-0 flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {formatDate(cert.expiry_date)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                ))}
                                {inputted.certificates.length > 5 && (
                                  <p className="text-[10px] text-muted-foreground">
                                    +{inputted.certificates.length - 5} more certificates
                                  </p>
                                )}
                                {inputted.count > inputted.certificates.length && (
                                  <p className="text-[10px] text-muted-foreground italic">
                                    Showing {inputted.certificates.length} of {inputted.count} total
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Action Area */}
        <div className="flex flex-col items-center justify-center px-4 py-6 lg:py-0" style={{ flex: "0 0 28%" }}>
          <div className="flex flex-col items-center gap-4 text-center">
            {unmappedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setAiDialogOpen(true)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                AI Group Issuers
              </Button>
            )}
            <Button size="icon" className="rounded-full hidden lg:flex" disabled>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="text-xs text-muted-foreground max-w-[200px]">
              Select inputted issuers on the left, then group them into a canonical issuer on the right.
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

        {/* Right Pane: Canonical Issuers — with collapsible certificate rows */}
        <div className="border rounded-lg flex flex-col h-[600px] min-w-0 overflow-hidden" style={{ flex: "0 0 37%" }}>
          <div className="p-3 border-b bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Canonical Issuers</h3>
              <Badge variant="secondary">{filteredMerged.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Official standardized issuers. Select a target for grouping.
            </p>
            <div className="relative pt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issuers..."
                value={rightSearch}
                onChange={(e) => setRightSearch(e.target.value)}
                className="pl-9 h-8 bg-white dark:bg-card"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div>
              {filteredMerged.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No canonical issuers found.</p>
                  <p className="text-xs mt-1">Create your first issuer to get started.</p>
                </div>
              ) : (
                filteredMerged.map((merged) => {
                  const isSelected = selectedMerged === merged.id;
                  const isExpanded = expandedIssuers.has(merged.id);
                  const usageCount = (merged as any).usage_count || 0;

                  return (
                    <Collapsible
                      key={merged.id}
                      open={isExpanded}
                      onOpenChange={() => toggleExpanded(merged.id)}
                    >
                      <div
                        className={`border-b transition-colors ${
                          isSelected ? "bg-primary/10 ring-2 ring-primary ring-inset" : "bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20"
                        }`}
                      >
                        <div
                          className="p-3 cursor-pointer"
                          onClick={() => setSelectedMerged(isSelected ? null : merged.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
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
                                <Badge
                                  variant={usageCount > 0 ? "secondary" : "outline"}
                                  className="text-xs"
                                >
                                  {usageCount} cert{usageCount !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                              {merged.description && (
                                <p className="text-xs text-muted-foreground mt-1 whitespace-normal">
                                  {merged.description}
                                </p>
                              )}
                            </div>

                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <IssuerTypeCertificatesList
                            issuerTypeId={merged.id}
                            businessId={businessId}
                          />
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
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
                  <strong>{selectedInputted.size} inputted issuer{selectedInputted.size !== 1 ? "s" : ""}</strong>{" "}
                  (<strong>{totalSelectedCerts} certificate{totalSelectedCerts !== 1 ? "s" : ""}</strong>) into:
                </p>
                <div className="bg-muted rounded-md p-3">
                  <p className="font-medium">{selectedMergedData?.name}</p>
                </div>
                <p className="text-sm">
                  This will update all matching certificates and create aliases for future auto-matching.
                </p>
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

      {/* Create Issuer Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Canonical Issuer</DialogTitle>
            <DialogDescription>
              Create a new official issuer and group the selected inputted issuers into it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-issuer-name">Name *</Label>
              <Input
                id="new-issuer-name"
                value={newIssuerName}
                onChange={(e) => setNewIssuerName(e.target.value)}
                placeholder="e.g., DNV GL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-issuer-description">Description</Label>
              <Textarea
                id="new-issuer-description"
                value={newIssuerDescription}
                onChange={(e) => setNewIssuerDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="bg-muted rounded-md p-3 text-sm">
              <p className="text-muted-foreground">
                This will group <strong>{selectedInputted.size} inputted issuer{selectedInputted.size !== 1 ? "s" : ""}</strong>{" "}
                (<strong>{totalSelectedCerts} certificate{totalSelectedCerts !== 1 ? "s" : ""}</strong>) into the new issuer.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleCreateIssuerAndGroup} disabled={isProcessing || !newIssuerName.trim()}>
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

      {/* Dismiss Inputted Issuer Confirmation Dialog */}
      <AlertDialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inputted Issuer</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to delete "{issuerToDelete?.display_name}"?
                </p>
                <p className="text-sm">
                  This will remove {issuerToDelete?.count} certificate{issuerToDelete?.count !== 1 ? "s" : ""} from this list.
                  The certificates themselves will not be deleted, but they will no longer appear as unmapped issuers.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dismissInputtedMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (issuerToDelete) {
                  dismissInputtedMutation.mutate({
                    issuerNormalized: issuerToDelete.issuer_normalized,
                  });
                  setDismissDialogOpen(false);
                  setIssuerToDelete(null);
                }
              }}
              disabled={dismissInputtedMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {dismissInputtedMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
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
              {viewingDocument?.fileName || 'Document'}
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
              <iframe
                src={documentBlobUrl}
                className="w-full h-[70vh] rounded"
                title={viewingDocument?.fileName || 'Document'}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load document.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Sub-component for displaying certificates linked to an issuer type in the right pane */
function IssuerTypeCertificatesList({
  issuerTypeId,
  businessId,
}: {
  issuerTypeId: string;
  businessId: string | null;
}) {
  const { data: certs = [], isLoading } = useIssuerTypeCertificates(issuerTypeId, businessId);

  if (isLoading) {
    return (
      <div className="px-3 pb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading certificates...
      </div>
    );
  }

  if (certs.length === 0) {
    return (
      <div className="px-3 pb-3 text-xs text-muted-foreground italic">
        No certificates linked to this issuer.
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 border-t border-border/50 bg-muted/20">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5 pt-2">
        Linked Certificates
      </p>
      <div className="space-y-1.5">
        {certs.map((cert) => (
          <div
            key={cert.id}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span className="font-medium text-foreground truncate max-w-[100px]">
              {cert.personnel_name}
            </span>
            <span className="text-muted-foreground/50">—</span>
            <span className="truncate flex-1">{cert.name}</span>
            {cert.expiry_date && (
              <>
                <span className="text-muted-foreground/50">—</span>
                <span className="shrink-0 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(cert.expiry_date)}
                </span>
              </>
            )}
          </div>
        ))}
        {certs.length >= 20 && (
          <p className="text-[10px] text-muted-foreground italic">
            Showing first 20 certificates
          </p>
        )}
      </div>
    </div>
  );
}
