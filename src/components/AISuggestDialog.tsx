import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Sparkles,
  Check,
  X,
  ChevronDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Square,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateAlias } from "@/hooks/useCertificateAliases";
import { useCreateCertificateType } from "@/hooks/useCertificateTypes";
import { normalizeCertificateTitle } from "@/lib/certificateNormalization";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { UnmappedCertificate } from "@/hooks/useUnmappedCertificates";

// ─── Types ──────────────────────────────────────────────────────
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

interface MergedType {
  id: string;
  name: string;
  description?: string | null;
  category_name?: string | null;
  category_id?: string | null;
  is_active: boolean;
}

type DialogPhase = "confirming" | "processing" | "results";

interface SuggestionRow {
  suggestion: AISuggestion;
  cert: UnmappedCertificate;
  suggestedTypeName: string;
  isNewType: boolean;
  approved: boolean;
  rejected: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  unmappedCerts: UnmappedCertificate[];
  totalUnmapped: number;
  mergedTypes: MergedType[];
  categories: Category[];
  leftSearch: string;
  leftCategoryFilter: string;
}

function getConfidencePillClass(confidence: string) {
  switch (confidence) {
    case "high":
      return "bg-teal-600 text-white border-teal-600";
    case "medium":
      return "bg-amber-500 text-white border-amber-500";
    case "low":
      return "bg-gray-400 text-white border-gray-400";
    default:
      return "bg-primary text-primary-foreground border-primary";
  }
}

const CONFIDENCE_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortByConfidence(a: SuggestionRow, b: SuggestionRow) {
  return (CONFIDENCE_ORDER[a.suggestion.confidence] ?? 3) - (CONFIDENCE_ORDER[b.suggestion.confidence] ?? 3);
}

export function AISuggestDialog({
  open,
  onOpenChange,
  businessId,
  unmappedCerts,
  totalUnmapped,
  mergedTypes,
  categories,
  leftSearch,
  leftCategoryFilter,
}: Props) {
  const queryClient = useQueryClient();
  const createAliasMutation = useCreateAlias();
  const createTypeMutation = useCreateCertificateType();

  const [phase, setPhase] = useState<DialogPhase>("confirming");
  const [certCount, setCertCount] = useState(0);
  const [progressText, setProgressText] = useState("");

  // Results
  const [suggestionRows, setSuggestionRows] = useState<SuggestionRow[]>([]);
  const [noMatchRows, setNoMatchRows] = useState<{ cert: UnmappedCertificate; suggestion: AISuggestion }[]>([]);
  const [remainingCount, setRemainingCount] = useState(0);
  const [actualFailedCount, setActualFailedCount] = useState(0);
  const [partialInfo, setPartialInfo] = useState<{ processed: number; total: number } | null>(null);
  const [processedCount, setProcessedCount] = useState(0);

  // Expandable sections
  const [existingTypesOpen, setExistingTypesOpen] = useState(true);
  const [newTypesOpen, setNewTypesOpen] = useState(true);
  const [noMatchOpen, setNoMatchOpen] = useState(false);

  // New-type overrides
  const [newTypeCategoryOverrides, setNewTypeCategoryOverrides] = useState<Record<string, string>>({});
  const [newTypeExistingOverrides, setNewTypeExistingOverrides] = useState<Record<string, string>>({});

  // Processing control
  const [processing, setProcessing] = useState(false);
  const abortRef = useRef(false);

  // ─── Derived: split rows into existing vs new type ─────────────
  const existingTypeRows = useMemo(
    () => suggestionRows.filter((r) => !r.isNewType).sort(sortByConfidence),
    [suggestionRows]
  );
  const newTypeRows = useMemo(
    () => suggestionRows.filter((r) => r.isNewType).sort(sortByConfidence),
    [suggestionRows]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["unmapped-certificates"] });
    queryClient.invalidateQueries({ queryKey: ["certificates"] });
    queryClient.invalidateQueries({ queryKey: ["certificate-type-usage"] });
    queryClient.invalidateQueries({ queryKey: ["certificate-types"] });
    queryClient.invalidateQueries({ queryKey: ["certificates-needing-review"] });
    queryClient.invalidateQueries({ queryKey: ["needs-review-count"] });
  }, [queryClient]);

  const resetState = useCallback(() => {
    setPhase("confirming");
    setCertCount(0);
    setProgressText("");
    setSuggestionRows([]);
    setNoMatchRows([]);
    setRemainingCount(0);
    setActualFailedCount(0);
    setPartialInfo(null);
    setProcessedCount(0);
    setExistingTypesOpen(true);
    setNewTypesOpen(true);
    setNoMatchOpen(false);
    setNewTypeCategoryOverrides({});
    setNewTypeExistingOverrides({});
    setProcessing(false);
    abortRef.current = false;
  }, []);

  const handleClose = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      abortRef.current = true;
      if (phase === "results") {
        invalidateAll();
      }
      setTimeout(resetState, 300);
    }
    onOpenChange(newOpen);
  }, [onOpenChange, phase, invalidateAll, resetState]);

  // ─── Start Processing ─────────────────────────────────────────
  const handleStart = async () => {
    setPhase("processing");
    setProcessing(true);
    abortRef.current = false;

    try {
      let query = supabase
        .from("certificates")
        .select(`
          id, title_raw, expiry_date, place_of_issue, category_id,
          certificate_categories ( name ),
          personnel!inner ( name, business_id, role )
        `)
        .eq("personnel.business_id", businessId)
        .is("certificate_type_id", null)
        .is("unmapped_by", null)
        .not("title_raw", "is", null);

      if (leftCategoryFilter) {
        query = query.eq("category_id", leftCategoryFilter);
      }
      query = query.limit(1000);

      const { data: allUnmapped, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      let filtered = allUnmapped || [];
      if (leftSearch) {
        const q = leftSearch.toLowerCase();
        filtered = filtered.filter(
          (c: any) =>
            (c.title_raw || "").toLowerCase().includes(q) ||
            (c.personnel?.name || "").toLowerCase().includes(q)
        );
      }

      if (filtered.length === 0) {
        toast.info("No unmapped certificates to analyse");
        setPhase("confirming");
        setProcessing(false);
        return;
      }

      const totalCount = filtered.length;
      setCertCount(totalCount);
      setProcessedCount(0);
      setProgressText(`Processing 0 of ${totalCount} certificates...`);

      if (abortRef.current) { setPhase("confirming"); setProcessing(false); return; }

      const certsPayload = filtered.map((c: any) => ({
        id: c.id,
        title_raw: c.title_raw,
        category_name: c.certificate_categories?.name || null,
        expiry_date: c.expiry_date || null,
        place_of_issue: c.place_of_issue || null,
        personnel_role: c.personnel?.role || null,
      }));

      const personnelMap = new Map<string, string>();
      for (const c of filtered as any[]) {
        personnelMap.set(c.id, c.personnel?.name || "Unknown");
      }

      const activeTypes = mergedTypes.filter((t) => t.is_active);
      const canonicalPayload = activeTypes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || null,
        category_name: t.category_name || null,
      }));

      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;

      // ── Client-side batching: 25 per call ──
      const BATCH_SIZE = 25;
      const allSuggestions: AISuggestion[] = [];
      let totalProcessedByServer = 0;
      let wasAborted = false;

      for (let i = 0; i < certsPayload.length; i += BATCH_SIZE) {
        if (abortRef.current) { wasAborted = true; break; }

        const batch = certsPayload.slice(i, i + BATCH_SIZE);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-certificate-types`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              certificates: batch,
              canonicalTypes: canonicalPayload,
            }),
          }
        );

        if (abortRef.current) { wasAborted = true; break; }

        if (response.status === 429) {
          const body = await response.json().catch(() => ({}));
          if (body.error === "monthly_cap_reached") {
            toast.error("Monthly AI allowance reached");
          } else {
            toast.error("Rate limit exceeded — please try again shortly");
          }
          // Keep partial results collected so far
          wasAborted = true;
          break;
        }

        if (response.status === 402) {
          toast.error("AI usage limit reached. Please contact support.");
          wasAborted = true;
          break;
        }

        if (!response.ok) {
          console.error(`Batch ${i / BATCH_SIZE + 1} failed (${response.status}), skipping`);
          // Count as processed but failed
          totalProcessedByServer += batch.length;
          const newProcessed = Math.min(i + BATCH_SIZE, certsPayload.length);
          setProcessedCount(newProcessed);
          setProgressText(`Processing ${newProcessed} of ${totalCount} certificates...`);
          continue;
        }

        const result = await response.json();
        const batchSuggestions: AISuggestion[] = result.suggestions || [];
        allSuggestions.push(...batchSuggestions);
        totalProcessedByServer += result.processed || batch.length;

        const newProcessed = Math.min(i + BATCH_SIZE, certsPayload.length);
        setProcessedCount(newProcessed);
        setProgressText(`Processing ${newProcessed} of ${totalCount} certificates...`);
      }

      // If aborted early with no results, go back
      if (wasAborted && allSuggestions.length === 0) {
        setPhase("confirming");
        setProcessing(false);
        return;
      }

      const suggestions = allSuggestions;
      const actualProcessed = wasAborted
        ? totalProcessedByServer
        : certsPayload.length;

      if (actualProcessed < totalCount || wasAborted) {
        setPartialInfo({ processed: actualProcessed, total: totalCount });
      }

      // Build result rows
      const matched: SuggestionRow[] = [];
      const noMatch: { cert: UnmappedCertificate; suggestion: AISuggestion }[] = [];

      for (const s of suggestions) {
        const existingCert = unmappedCerts.find((c) => c.id === s.certificate_id);
        const certData: UnmappedCertificate = existingCert || {
          id: s.certificate_id,
          title_raw: certsPayload.find((cp) => cp.id === s.certificate_id)?.title_raw || "Unknown",
          title_normalized: null,
          personnel_name: personnelMap.get(s.certificate_id) || "Unknown",
          personnel_id: "",
          personnel_role: null,
          expiry_date: null,
          document_url: null,
          category_id: null,
          category_name: null,
          created_at: "",
        };

        if (s.suggested_type_id) {
          const typeName = mergedTypes.find((t) => t.id === s.suggested_type_id)?.name || "Unknown";
          matched.push({
            suggestion: s,
            cert: certData,
            suggestedTypeName: typeName,
            isNewType: false,
            approved: false,
            rejected: false,
          });
        } else if (s.suggested_new_type_name) {
          matched.push({
            suggestion: s,
            cert: certData,
            suggestedTypeName: s.suggested_new_type_name,
            isNewType: true,
            approved: false,
            rejected: false,
          });
        } else {
          noMatch.push({ cert: certData, suggestion: s });
        }
      }

      let remaining = totalCount - actualProcessed;
      let actualFailed = actualProcessed - suggestions.length;

      setSuggestionRows(matched);
      setNoMatchRows(noMatch);
      setRemainingCount(remaining > 0 ? remaining : 0);
      setActualFailedCount(actualFailed > 0 ? actualFailed : 0);
      setPhase("results");
    } catch (error) {
      console.error("AI suggest error:", error);
      toast.error("AI suggestion failed");
      setPhase("confirming");
    } finally {
      setProcessing(false);
    }
  };

  // ─── Accept a single suggestion ──────────────────────────────
  const handleApprove = async (row: SuggestionRow) => {
    if (row.approved || row.rejected) return;

    const globalIdx = suggestionRows.findIndex((r) => r.cert.id === row.cert.id);
    if (globalIdx === -1) return;

    try {
      const existingOverride = newTypeExistingOverrides[row.cert.id];

      if (row.isNewType && !existingOverride) {
        // Create new type then assign
        const categoryOverride = newTypeCategoryOverrides[row.cert.id];
        let categoryId: string | undefined = categoryOverride;

        if (!categoryId && row.suggestion.suggested_new_type_category) {
          const matchedCat = categories.find(
            (c) => c.name.toLowerCase() === row.suggestion.suggested_new_type_category!.toLowerCase()
          );
          categoryId = matchedCat?.id;
        }

        const newType = await createTypeMutation.mutateAsync({
          name: row.suggestion.suggested_new_type_name!,
          category_id: categoryId,
        });

        const { error } = await supabase
          .from("certificates")
          .update({ certificate_type_id: newType.id, category_id: categoryId || null, needs_review: false })
          .eq("id", row.cert.id);
        if (error) throw error;

        if (row.cert.title_raw) {
          try {
            await createAliasMutation.mutateAsync({
              aliasRaw: row.cert.title_raw,
              certificateTypeId: newType.id,
              createdBy: "system",
              confidence: row.suggestion.confidence === "high" ? 85 : 70,
            });
          } catch (e: any) {
            if (e.code !== "23505") console.error("Alias error:", e);
          }
        }
      } else {
        // Assign existing type (either original suggestion or admin override)
        const typeId = existingOverride || row.suggestion.suggested_type_id!;
        const matchedType = mergedTypes.find((t) => t.id === typeId);
        const { error } = await supabase
          .from("certificates")
          .update({ certificate_type_id: typeId, category_id: matchedType?.category_id || null, needs_review: false })
          .eq("id", row.cert.id);
        if (error) throw error;

        if (row.cert.title_raw) {
          try {
            await createAliasMutation.mutateAsync({
              aliasRaw: row.cert.title_raw,
              certificateTypeId: typeId,
              createdBy: "system",
              confidence: row.suggestion.confidence === "high" ? 85 : 70,
            });
          } catch (e: any) {
            if (e.code !== "23505") console.error("Alias error:", e);
          }
        }
      }

      const displayName = existingOverride
        ? mergedTypes.find((t) => t.id === existingOverride)?.name || row.suggestedTypeName
        : row.suggestedTypeName;

      setSuggestionRows((prev) =>
        prev.map((r, i) => (i === globalIdx ? { ...r, approved: true } : r))
      );
      toast.success(`Assigned "${row.cert.title_raw}" → "${displayName}"`);
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Failed to approve suggestion");
    }
  };

  const handleReject = (row: SuggestionRow) => {
    const globalIdx = suggestionRows.findIndex((r) => r.cert.id === row.cert.id);
    if (globalIdx === -1) return;
    setSuggestionRows((prev) =>
      prev.map((r, i) => (i === globalIdx ? { ...r, rejected: true } : r))
    );
  };

  // ─── Approve All (existing types only) ────────────────────────
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkDoneMessage, setBulkDoneMessage] = useState<string | null>(null);
  // ─── Create & Approve All (new types) ─────────────────────────
  const [newTypeBulkProcessing, setNewTypeBulkProcessing] = useState(false);
  const [newTypeBulkProgress, setNewTypeBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [newTypeBulkDoneMessage, setNewTypeBulkDoneMessage] = useState<string | null>(null);
  const [newTypeBulkConfirmOpen, setNewTypeBulkConfirmOpen] = useState(false);

  const handleApproveAll = async () => {
    const pending = existingTypeRows.filter((r) => !r.approved && !r.rejected && r.suggestion.suggested_type_id);
    if (pending.length === 0) {
      toast.info("No pending suggestions to approve");
      return;
    }

    setBulkProcessing(true);
    setBulkProgress({ current: 0, total: pending.length });
    setBulkDoneMessage(null);
    let successCount = 0;

    try {
      const byType = new Map<string, SuggestionRow[]>();
      for (const row of pending) {
        const list = byType.get(row.suggestion.suggested_type_id!) || [];
        list.push(row);
        byType.set(row.suggestion.suggested_type_id!, list);
      }

      let processed = 0;
      for (const [typeId, rows] of byType) {
        const ids = rows.map((r) => r.cert.id);
        for (let i = 0; i < ids.length; i += 100) {
          const batch = ids.slice(i, i + 100);
          const matchedType = mergedTypes.find((t) => t.id === typeId);
          const { error } = await supabase
            .from("certificates")
            .update({ certificate_type_id: typeId, category_id: matchedType?.category_id || null, needs_review: false })
            .in("id", batch);
          if (error) {
            console.error("Batch update error:", error);
            continue;
          }
          successCount += batch.length;
        }

        const processedTitles = new Set<string>();
        for (const row of rows) {
          if (!row.cert.title_raw) continue;
          const norm = normalizeCertificateTitle(row.cert.title_raw);
          if (processedTitles.has(norm)) continue;
          processedTitles.add(norm);
          try {
            await createAliasMutation.mutateAsync({
              aliasRaw: row.cert.title_raw,
              certificateTypeId: typeId,
              createdBy: "system",
              confidence: row.suggestion.confidence === "high" ? 85 : 70,
            });
          } catch (e: any) {
            if (e.code !== "23505") console.error("Alias error:", e);
          }
        }

        processed += rows.length;
        setBulkProgress({ current: processed, total: pending.length });
      }

      const approvedIds = new Set(pending.map((r) => r.cert.id));
      setSuggestionRows((prev) =>
        prev.map((r) => (approvedIds.has(r.cert.id) ? { ...r, approved: true } : r))
      );

      setBulkDoneMessage(`Done — ${successCount} item${successCount !== 1 ? "s" : ""} approved.`);
      setTimeout(() => setBulkDoneMessage(null), 3000);
    } catch (error) {
      console.error("Bulk approve error:", error);
      toast.error("Some approvals failed");
    } finally {
      setBulkProcessing(false);
      setBulkProgress(null);
    }
  };

  // ─── Counts ────────────────────────────────────────────────────
  const pendingExisting = existingTypeRows.filter((r) => !r.approved && !r.rejected);
  const pendingNew = newTypeRows.filter((r) => !r.approved && !r.rejected);
  const approvedAll = suggestionRows.filter((r) => r.approved);

  // Check if all pending new types have a category selected
  const allNewTypesHaveCategory = pendingNew.length > 0 && pendingNew.every((row) => {
    const existingOverride = newTypeExistingOverrides[row.cert.id];
    if (existingOverride) return true; // overridden to existing type — no category needed
    const categoryOverride = newTypeCategoryOverrides[row.cert.id];
    if (categoryOverride) return true;
    const matchedCat = categories.find(
      (c) => c.name.toLowerCase() === (row.suggestion.suggested_new_type_category || "").toLowerCase()
    );
    return !!matchedCat;
  });

  // ─── Handle Create & Approve All (new types) ─────────────────
  const handleApproveAllNewTypes = async () => {
    setNewTypeBulkConfirmOpen(false);
    setNewTypeBulkProcessing(true);
    let successCount = 0;

    try {
      for (const row of pendingNew) {
        await handleApprove(row);
        successCount++;
      }
      toast.success(`Created & approved ${successCount} new type${successCount !== 1 ? "s" : ""}`);
    } catch (error) {
      console.error("Bulk new type approve error:", error);
      toast.error("Some approvals failed");
    } finally {
      setNewTypeBulkProcessing(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Suggest Types
          </DialogTitle>
          <DialogDescription>
            Analyse unmapped certificates and suggest type assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* ─── Confirming Phase ─────────────────────────────── */}
          {phase === "confirming" && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  This will analyze <strong>{totalUnmapped}</strong> unmapped certificate{totalUnmapped !== 1 ? "s" : ""}{" "}
                  {(leftSearch || leftCategoryFilter) && "(matching current filters) "}
                  and suggest type assignments.
                </p>
                <p className="text-sm text-muted-foreground">
                  This may take several minutes depending on the number of certificates.
                </p>
              </div>
            </div>
          )}

          {/* ─── Processing Phase ─────────────────────────────── */}
          {phase === "processing" && (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                <div className="w-full max-w-sm space-y-2">
                  <p className="text-sm font-medium">
                    Processing {processedCount} of {certCount} certificates...
                  </p>
                  <Progress value={certCount > 0 ? (processedCount / certCount) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {certCount - processedCount} certificates remaining...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Results Phase ────────────────────────────────── */}
          {phase === "results" && (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="flex flex-wrap gap-2">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{existingTypeRows.length}</p>
                  <p className="text-xs text-muted-foreground">Existing matches</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 text-center border border-amber-200 dark:border-amber-800">
                  <p className="text-2xl font-bold">{newTypeRows.length}</p>
                  <p className="text-xs text-muted-foreground">New types</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{noMatchRows.length}</p>
                  <p className="text-xs text-muted-foreground">No match</p>
                </div>
                {remainingCount > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{remainingCount}</p>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                  </div>
                )}
                {actualFailedCount > 0 && (
                  <div className="bg-destructive/10 rounded-lg p-3 text-center border border-destructive/20">
                    <p className="text-2xl font-bold text-destructive">{actualFailedCount}</p>
                    <p className="text-xs text-destructive/80">Failed</p>
                  </div>
                )}
              </div>

              {partialInfo && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 border rounded text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Processed {partialInfo.processed} of {partialInfo.total}.{" "}
                  {remainingCount > 0 ? `${remainingCount} remaining — run again to continue.` : ""}
                </div>
              )}

              {/* ─── Matched to Existing Types ─────────────────── */}
              {existingTypeRows.length > 0 && (
                <Collapsible open={existingTypesOpen} onOpenChange={setExistingTypesOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <ChevronDown className={`h-4 w-4 transition-transform ${existingTypesOpen ? "" : "-rotate-90"}`} />
                    <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    <span className="font-medium text-sm flex-1 text-left">
                      Matched to existing types ({existingTypeRows.length})
                    </span>
                    {approvedAll.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {approvedAll.length} approved
                      </Badge>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {/* Approve All bar — existing types only */}
                    {pendingExisting.length > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
                        <span className="text-xs text-muted-foreground">
                          {pendingExisting.length} pending review
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={handleApproveAll}
                          disabled={bulkProcessing}
                        >
                          {bulkProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Approve All ({pendingExisting.length})
                        </Button>
                      </div>
                    )}
                    <div className="max-h-[400px] overflow-y-auto">
                      <div className="divide-y">
                        {existingTypeRows.map((row) => (
                          <div
                            key={row.cert.id}
                            className={`p-3 space-y-1 transition-opacity ${
                              row.approved ? "opacity-50 bg-chart-2/5" : row.rejected ? "opacity-40" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{row.cert.personnel_name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 uppercase font-semibold ${getConfidencePillClass(row.suggestion.confidence)}`}
                                >
                                  {row.suggestion.confidence}
                                </Badge>
                                {row.approved && (
                                  <Badge variant="secondary" className="text-[10px] py-0 bg-chart-2/20 text-chart-2">
                                    Approved
                                  </Badge>
                                )}
                                {row.rejected && (
                                  <Badge variant="secondary" className="text-[10px] py-0">
                                    Rejected
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground truncate">{row.cert.title_raw}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">{row.suggestedTypeName}</span>
                            </div>
                            {row.suggestion.reasoning && (
                              <p className="text-[11px] text-muted-foreground italic">"{row.suggestion.reasoning}"</p>
                            )}
                            {!row.approved && !row.rejected && (
                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => handleApprove(row)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => handleReject(row)}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* ─── New Types Suggested ────────────────────────── */}
              {newTypeRows.length > 0 && (
                <Collapsible open={newTypesOpen} onOpenChange={setNewTypesOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors">
                    <ChevronDown className={`h-4 w-4 transition-transform ${newTypesOpen ? "" : "-rotate-90"}`} />
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-sm flex-1 text-left">
                      New types suggested ({newTypeRows.length})
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                      Creates new types — review individually
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {/* Create & Approve All bar — new types */}
                    {pendingNew.length > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
                        <span className="text-xs text-muted-foreground">
                          {pendingNew.length} pending review
                          {!allNewTypesHaveCategory && " — select categories to enable bulk action"}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setNewTypeBulkConfirmOpen(true)}
                          disabled={!allNewTypesHaveCategory || newTypeBulkProcessing}
                        >
                          {newTypeBulkProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Create & Approve All ({pendingNew.length})
                        </Button>
                      </div>
                    )}
                    <div className="max-h-[400px] overflow-y-auto">
                      <div className="divide-y divide-amber-200 dark:divide-amber-800">
                        {newTypeRows.map((row) => {
                          const existingOverride = newTypeExistingOverrides[row.cert.id];
                          const isOverriddenToExisting = !!existingOverride;

                          return (
                            <div
                              key={row.cert.id}
                              className={`p-3 space-y-2 bg-amber-50/50 dark:bg-amber-950/10 transition-opacity ${
                                row.approved ? "opacity-50 bg-chart-2/5" : row.rejected ? "opacity-40" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">{row.cert.personnel_name}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 uppercase font-semibold ${getConfidencePillClass(row.suggestion.confidence)}`}
                                  >
                                    {row.suggestion.confidence}
                                  </Badge>
                                  {row.approved && (
                                    <Badge variant="secondary" className="text-[10px] py-0 bg-chart-2/20 text-chart-2">
                                      Approved
                                    </Badge>
                                  )}
                                  {row.rejected && (
                                    <Badge variant="secondary" className="text-[10px] py-0">
                                      Rejected
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground truncate">{row.cert.title_raw}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate flex items-center gap-1">
                                  {isOverriddenToExisting ? (
                                    mergedTypes.find((t) => t.id === existingOverride)?.name || "Unknown"
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3" />
                                      {row.suggestedTypeName}
                                    </>
                                  )}
                                </span>
                              </div>
                              {row.suggestion.reasoning && (
                                <p className="text-[11px] text-muted-foreground italic">"{row.suggestion.reasoning}"</p>
                              )}

                              {/* Override controls — only show when not yet approved/rejected */}
                              {!row.approved && !row.rejected && (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    {/* Category dropdown */}
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Category</label>
                                      <Select
                                        value={newTypeCategoryOverrides[row.cert.id] || categories.find((c) => c.name.toLowerCase() === (row.suggestion.suggested_new_type_category || "").toLowerCase())?.id || ""}
                                        onValueChange={(val) =>
                                          setNewTypeCategoryOverrides((prev) => ({ ...prev, [row.cert.id]: val }))
                                        }
                                        disabled={isOverriddenToExisting}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder="Select category..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                              {cat.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Assign to existing type dropdown */}
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Assign to existing type</label>
                                      <Select
                                        value={existingOverride || ""}
                                        onValueChange={(val) => {
                                          if (val === "__clear") {
                                            setNewTypeExistingOverrides((prev) => {
                                              const next = { ...prev };
                                              delete next[row.cert.id];
                                              return next;
                                            });
                                          } else {
                                            setNewTypeExistingOverrides((prev) => ({ ...prev, [row.cert.id]: val }));
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder="Use new type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__clear" className="text-xs text-muted-foreground">
                                            Use new type (default)
                                          </SelectItem>
                                          {mergedTypes
                                            .filter((t) => t.is_active)
                                            .map((t) => (
                                              <SelectItem key={t.id} value={t.id} className="text-xs">
                                                {t.name}
                                                {t.category_name && ` (${t.category_name})`}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => handleApprove(row)}
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      {isOverriddenToExisting ? "Approve" : "Create & Approve"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={() => handleReject(row)}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* ─── No Match ──────────────────────────────────── */}
              {noMatchRows.length > 0 && (
                <Collapsible open={noMatchOpen} onOpenChange={setNoMatchOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <ChevronDown className={`h-4 w-4 transition-transform ${noMatchOpen ? "" : "-rotate-90"}`} />
                    <Square className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm flex-1 text-left">
                      {noMatchRows.length} no match found
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="max-h-[400px] overflow-y-auto">
                      <div className="divide-y">
                        {noMatchRows.map((row) => (
                          <div key={row.cert.id} className="p-3 space-y-1">
                            <span className="text-sm font-medium">{row.cert.personnel_name}</span>
                            <p className="text-xs text-muted-foreground">{row.cert.title_raw}</p>
                            {row.suggestion.reasoning && (
                              <p className="text-[11px] text-muted-foreground italic">"{row.suggestion.reasoning}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* ─── Remaining / Failed ─────────────────────── */}
              {remainingCount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {remainingCount} certificate{remainingCount !== 1 ? "s" : ""} not yet processed — run again to continue.
                  </span>
                </div>
              )}
              {actualFailedCount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">
                    {actualFailedCount} certificate{actualFailedCount !== 1 ? "s" : ""} failed to process
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer ──────────────────────────────────────────── */}
        <DialogFooter className="gap-2">
          {phase === "confirming" && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleStart} disabled={totalUnmapped === 0}>
                <Sparkles className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            </>
          )}
          {phase === "processing" && (
            <Button
              variant="destructive"
              onClick={() => {
                abortRef.current = true;
                setPhase("confirming");
                setProcessing(false);
              }}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}
          {phase === "results" && (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Confirmation dialog for Create & Approve All */}
      <AlertDialog open={newTypeBulkConfirmOpen} onOpenChange={setNewTypeBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create & Approve All New Types</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {pendingNew.length} new certificate type{pendingNew.length !== 1 ? "s" : ""} and assign them to the corresponding certificates. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveAllNewTypes}>
              Create {pendingNew.length} type{pendingNew.length !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
