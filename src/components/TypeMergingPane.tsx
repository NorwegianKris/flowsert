import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  Sparkles,
  X,
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
import { normalizeCertificateTitle } from "@/lib/certificateNormalization";

// ─── AI Suggestion Types ────────────────────────────────────────
interface AISuggestion {
  certificate_id: string;
  suggested_type_id: string | null;
  suggested_new_type_name: string | null;
  suggested_new_type_category: string | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

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

  // ─── AI Suggestion State ────────────────────────────────────
  const [aiSuggestions, setAiSuggestions] = useState<Map<string, AISuggestion>>(new Map());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCertCount, setAiCertCount] = useState(0);
  const aiButtonDisabledUntil = useRef<number>(0);
  const [skippedCerts, setSkippedCerts] = useState<Set<string>>(new Set());
  const [fadingCerts, setFadingCerts] = useState<Set<string>>(new Set());

  const hasSuggestions = aiSuggestions.size > 0;
  const suggestionsCount = Array.from(aiSuggestions.values()).filter(
    (s) => !skippedCerts.has(s.certificate_id)
  ).length;

  const highConfSuggestions = Array.from(aiSuggestions.values()).filter(
    (s) => s.confidence === "high" && s.suggested_type_id && !skippedCerts.has(s.certificate_id)
  );
  const mediumConfSuggestions = Array.from(aiSuggestions.values()).filter(
    (s) => s.confidence === "medium" && s.suggested_type_id && !skippedCerts.has(s.certificate_id)
  );

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

  // ─── AI Suggestion Logic ────────────────────────────────────
  const handleAISuggest = async () => {
    if (aiLoading) return;
    if (Date.now() < aiButtonDisabledUntil.current) return;
    aiButtonDisabledUntil.current = Date.now() + 2000; // debounce

    setAiLoading(true);
    setSkippedCerts(new Set());
    setAiCertCount(totalUnmapped);

    try {
      // Fetch ALL unmapped certs (up to 1000) for AI analysis
      const { data: allUnmapped, error: fetchError } = await supabase
        .from("certificates")
        .select(`
          id, title_raw, expiry_date, place_of_issue, category_id,
          certificate_categories ( name ),
          personnel!inner ( name, business_id, role )
        `)
        .eq("personnel.business_id", businessId!)
        .is("certificate_type_id", null)
        .is("unmapped_by", null)
        .not("title_raw", "is", null)
        .limit(1000);

      if (fetchError) throw fetchError;

      if (!allUnmapped || allUnmapped.length === 0) {
        toast.info("No unmapped certificates to analyse");
        setAiLoading(false);
        return;
      }

      setAiCertCount(allUnmapped.length);

      // Build payload — no personnel names
      const certsPayload = allUnmapped.map((c: any) => ({
        id: c.id,
        title_raw: c.title_raw,
        category_name: c.certificate_categories?.name || null,
        expiry_date: c.expiry_date || null,
        place_of_issue: c.place_of_issue || null,
        personnel_role: c.personnel?.role || null,
      }));

      // Build canonical types payload
      const activeTypes = mergedTypes.filter((t) => t.is_active);
      const canonicalPayload = activeTypes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || null,
        category_name: t.category_name || null,
      }));

      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-certificate-types`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            certificates: certsPayload,
            canonicalTypes: canonicalPayload,
          }),
        }
      );

      if (response.status === 429) {
        const body = await response.json().catch(() => ({}));
        if (body.error === "monthly_cap_reached") {
          toast.error("Monthly AI allowance reached");
        } else {
          toast.error("Rate limit exceeded — please try again shortly");
        }
        setAiLoading(false);
        return;
      }

      if (response.status === 402) {
        toast.error("AI usage limit reached. Please contact support.");
        setAiLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Classification failed (${response.status})`);
      }

      const result = await response.json();
      const suggestions: AISuggestion[] = result.suggestions || [];

      const map = new Map<string, AISuggestion>();
      for (const s of suggestions) {
        map.set(s.certificate_id, s);
      }
      setAiSuggestions(map);

      const highCount = suggestions.filter((s) => s.confidence === "high" && s.suggested_type_id).length;
      const medCount = suggestions.filter((s) => s.confidence === "medium" && s.suggested_type_id).length;
      toast.success(
        `AI analysis complete: ${highCount} high, ${medCount} medium confidence suggestions`
      );
    } catch (error) {
      console.error("AI suggest error:", error);
      toast.error("AI suggestion failed — you can still map manually");
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearSuggestions = () => {
    setAiSuggestions(new Map());
    setSkippedCerts(new Set());
  };

  const handleSkipSuggestion = (certId: string) => {
    setFadingCerts((prev) => new Set(prev).add(certId));
    setTimeout(() => {
      setSkippedCerts((prev) => new Set(prev).add(certId));
      setFadingCerts((prev) => {
        const next = new Set(prev);
        next.delete(certId);
        return next;
      });
    }, 300);
  };

  // Accept a single AI suggestion
  const handleAcceptSuggestion = async (suggestion: AISuggestion) => {
    const cert = unmappedCerts.find((c) => c.id === suggestion.certificate_id);
    if (!suggestion.suggested_type_id || !cert) return;

    try {
      // Update certificate
      const { error: updateError } = await supabase
        .from("certificates")
        .update({
          certificate_type_id: suggestion.suggested_type_id,
          needs_review: false,
        })
        .eq("id", suggestion.certificate_id);

      if (updateError) throw updateError;

      // Create alias (system-created with confidence score)
      const confidenceScore = suggestion.confidence === "high" ? 85 : 70;
      const rawTitle = cert.title_raw;
      if (rawTitle) {
        try {
          await createAliasMutation.mutateAsync({
            aliasRaw: rawTitle,
            certificateTypeId: suggestion.suggested_type_id,
            createdBy: "system",
            confidence: confidenceScore,
          });
        } catch (aliasErr: any) {
          if (aliasErr.code !== "23505") console.error("Alias error:", aliasErr);
        }
      }

      // Fade out
      setFadingCerts((prev) => new Set(prev).add(suggestion.certificate_id));
      setTimeout(() => {
        setAiSuggestions((prev) => {
          const next = new Map(prev);
          next.delete(suggestion.certificate_id);
          return next;
        });
        setFadingCerts((prev) => {
          const next = new Set(prev);
          next.delete(suggestion.certificate_id);
          return next;
        });
        queryClient.invalidateQueries({ queryKey: ["unmapped-certificates"] });
        queryClient.invalidateQueries({ queryKey: ["certificates"] });
        queryClient.invalidateQueries({ queryKey: ["certificate-type-usage"] });
      }, 300);

      const typeName = mergedTypes.find((t) => t.id === suggestion.suggested_type_id)?.name || "type";
      toast.success(`Assigned to "${typeName}"`);
    } catch (error) {
      console.error("Accept suggestion error:", error);
      toast.error("Failed to accept suggestion");
    }
  };

  // Accept a single AI "create new type" suggestion
  const handleCreateAndAssignSuggestion = async (suggestion: AISuggestion) => {
    if (!suggestion.suggested_new_type_name) return;
    const cert = unmappedCerts.find((c) => c.id === suggestion.certificate_id);
    if (!cert) return;

    try {
      // Look up category
      let categoryId: string | undefined;
      if (suggestion.suggested_new_type_category) {
        const matchedCat = categories.find(
          (c) => c.name.toLowerCase() === suggestion.suggested_new_type_category!.toLowerCase()
        );
        categoryId = matchedCat?.id;
      }

      const newType = await createTypeMutation.mutateAsync({
        name: suggestion.suggested_new_type_name,
        category_id: categoryId,
      });

      // Update certificate
      const { error: updateError } = await supabase
        .from("certificates")
        .update({
          certificate_type_id: newType.id,
          needs_review: false,
        })
        .eq("id", suggestion.certificate_id);

      if (updateError) throw updateError;

      // Create alias
      const rawTitle = cert.title_raw;
      if (rawTitle) {
        try {
          await createAliasMutation.mutateAsync({
            aliasRaw: rawTitle,
            certificateTypeId: newType.id,
            createdBy: "system",
            confidence: suggestion.confidence === "high" ? 85 : 70,
          });
        } catch (aliasErr: any) {
          if (aliasErr.code !== "23505") console.error("Alias error:", aliasErr);
        }
      }

      setFadingCerts((prev) => new Set(prev).add(suggestion.certificate_id));
      setTimeout(() => {
        setAiSuggestions((prev) => {
          const next = new Map(prev);
          next.delete(suggestion.certificate_id);
          return next;
        });
        setFadingCerts((prev) => {
          const next = new Set(prev);
          next.delete(suggestion.certificate_id);
          return next;
        });
        queryClient.invalidateQueries({ queryKey: ["unmapped-certificates"] });
        queryClient.invalidateQueries({ queryKey: ["certificates"] });
        queryClient.invalidateQueries({ queryKey: ["certificate-type-usage"] });
        queryClient.invalidateQueries({ queryKey: ["certificate-types"] });
      }, 300);

      toast.success(`New type "${suggestion.suggested_new_type_name}" created and assigned`);
    } catch (error) {
      console.error("Create & assign error:", error);
      toast.error("Failed to create type and assign");
    }
  };

  // Bulk accept
  const handleBulkAccept = async (includeConfidences: ("high" | "medium")[]) => {
    const toAccept = Array.from(aiSuggestions.values()).filter(
      (s) =>
        includeConfidences.includes(s.confidence as "high" | "medium") &&
        s.suggested_type_id &&
        !skippedCerts.has(s.certificate_id)
    );

    if (toAccept.length === 0) {
      toast.info("No suggestions to accept");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    try {
      // Batch update certificates
      const certIds = toAccept.map((s) => s.certificate_id);

      // Group by target type for batch updates
      const byType = new Map<string, AISuggestion[]>();
      for (const s of toAccept) {
        const list = byType.get(s.suggested_type_id!) || [];
        list.push(s);
        byType.set(s.suggested_type_id!, list);
      }

      for (const [typeId, suggestions] of byType) {
        const ids = suggestions.map((s) => s.certificate_id);

        // Batch update in groups of 100
        for (let i = 0; i < ids.length; i += 100) {
          const batch = ids.slice(i, i + 100);
          const { error } = await supabase
            .from("certificates")
            .update({ certificate_type_id: typeId, needs_review: false })
            .in("id", batch);

          if (error) {
            console.error("Batch update error:", error);
            continue;
          }
          successCount += batch.length;
        }

        // Create aliases for each unique title
        const processedTitles = new Set<string>();
        for (const s of suggestions) {
          const cert = unmappedCerts.find((c) => c.id === s.certificate_id);
          if (!cert?.title_raw) continue;
          const norm = normalizeCertificateTitle(cert.title_raw);
          if (processedTitles.has(norm)) continue;
          processedTitles.add(norm);

          const confidenceScore = s.confidence === "high" ? 85 : 70;
          try {
            await createAliasMutation.mutateAsync({
              aliasRaw: cert.title_raw,
              certificateTypeId: typeId,
              createdBy: "system",
              confidence: confidenceScore,
            });
          } catch (aliasErr: any) {
            if (aliasErr.code !== "23505") console.error("Alias error:", aliasErr);
          }
        }
      }

      // Remove accepted from suggestions
      setAiSuggestions((prev) => {
        const next = new Map(prev);
        for (const id of certIds) next.delete(id);
        return next;
      });

      queryClient.invalidateQueries({ queryKey: ["unmapped-certificates"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["certificate-type-usage"] });

      toast.success(`Assigned ${successCount} certificate${successCount !== 1 ? "s" : ""}`);
    } catch (error) {
      console.error("Bulk accept error:", error);
      toast.error("Some assignments failed");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingUnmapped || loadingMerged) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Helper to get suggestion for a cert
  const getSuggestion = (certId: string): AISuggestion | undefined => {
    if (skippedCerts.has(certId)) return undefined;
    return aiSuggestions.get(certId);
  };

  // Suggestion strip styles
  const getConfidenceStyles = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "border-l-4 border-l-chart-2 bg-chart-2/10";
      case "medium":
        return "border-l-4 border-l-chart-4 bg-chart-4/10";
      case "low":
        return "border-l-4 border-l-muted-foreground/30 bg-muted/30";
      default:
        return "border-l-4 border-l-primary bg-primary/5";
    }
  };

  const getConfidenceTextColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "text-chart-2";
      case "medium":
        return "text-chart-4";
      case "low":
        return "text-muted-foreground";
      default:
        return "text-primary";
    }
  };

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

      {/* AI Bulk Action Bar */}
      {hasSuggestions && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-chart-2/10 border border-chart-2/30 text-sm">
          <Sparkles className="h-4 w-4 text-chart-2 shrink-0" />
          <span className="font-medium text-chart-2">
            {suggestionsCount} suggestion{suggestionsCount !== 1 ? "s" : ""} ready
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {highConfSuggestions.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-chart-2/30"
                onClick={() => handleBulkAccept(["high"])}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Accept high ({highConfSuggestions.length})
              </Button>
            )}
            {(highConfSuggestions.length > 0 || mediumConfSuggestions.length > 0) && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-chart-2/30"
                onClick={() => handleBulkAccept(["high", "medium"])}
                disabled={isProcessing}
              >
                Accept high & medium ({highConfSuggestions.length + mediumConfSuggestions.length})
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={handleClearSuggestions}
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

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
                  const suggestion = getSuggestion(cert.id);
                  const isFading = fadingCerts.has(cert.id);

                  return (
                    <div
                      key={cert.id}
                      className={`transition-all duration-300 ${isFading ? "opacity-0 max-h-0 overflow-hidden" : "opacity-100"}`}
                    >
                      <div
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

                      {/* AI Suggestion Strip */}
                      {suggestion && (
                          <div
                          className={`px-3 py-2 ${getConfidenceStyles(
                            suggestion.suggested_type_id 
                              ? suggestion.confidence 
                              : suggestion.suggested_new_type_name ? "new" : suggestion.confidence
                          )} transition-all duration-300`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Sparkles className={`h-3 w-3 shrink-0 ${getConfidenceTextColor(
                              suggestion.suggested_type_id ? suggestion.confidence : "new"
                            )}`} />
                            <span className={`text-xs font-medium ${getConfidenceTextColor(
                              suggestion.suggested_type_id ? suggestion.confidence : "new"
                            )}`}>
                              {suggestion.suggested_type_id
                                ? mergedTypes.find((t) => t.id === suggestion.suggested_type_id)?.name || "Unknown"
                                : suggestion.suggested_new_type_name
                                  ? `Create: ${suggestion.suggested_new_type_name}`
                                  : "Uncertain"}
                            </span>
                            <span className="text-[10px] italic text-muted-foreground">
                              {suggestion.reasoning}
                            </span>

                            <div className="flex items-center gap-1 ml-auto">
                              {suggestion.suggested_type_id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[11px] px-2"
                                  onClick={() => handleAcceptSuggestion(suggestion)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Accept
                                </Button>
                              )}
                              {!suggestion.suggested_type_id && suggestion.suggested_new_type_name && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[11px] px-2"
                                  onClick={() => handleCreateAndAssignSuggestion(suggestion)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Create & Assign
                                </Button>
                              )}
                              {(suggestion.confidence === "medium" || suggestion.confidence === "low" || !suggestion.suggested_type_id) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[11px] px-2 text-muted-foreground"
                                  onClick={() => handleSkipSuggestion(cert.id)}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Skip
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
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
          {aiLoading ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div className="text-xs text-muted-foreground max-w-[200px]">
                Analysing {aiCertCount} certificate{aiCertCount !== 1 ? "s" : ""}...
              </div>
              <p className="text-[10px] text-muted-foreground">This may take 10–30 seconds</p>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              {/* AI Suggest button */}
              {totalUnmapped > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAISuggest}
                  disabled={aiLoading}
                  className="w-full"
                  title="Uses AI to analyse each certificate and suggest the best canonical type"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Suggest
                </Button>
              )}

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
          )}
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
                      <div className="font-semibold text-xs uppercase text-muted-foreground bg-muted/50 px-3 py-2 border-b">
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
