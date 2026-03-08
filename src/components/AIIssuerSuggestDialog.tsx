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
import { useCreateIssuerAlias } from "@/hooks/useIssuerAliases";
import { useCreateIssuerType, IssuerType } from "@/hooks/useIssuerTypes";
import { normalizeCertificateTitle } from "@/lib/certificateNormalization";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { InputtedIssuer } from "@/hooks/useInputtedIssuers";

// ─── Types ──────────────────────────────────────────────────────
interface AISuggestion {
  issuer_normalized: string;
  suggested_issuer_type_id: string | null;
  suggested_new_issuer_name: string | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

type DialogPhase = "confirming" | "processing" | "results";

interface SuggestionRow {
  suggestion: AISuggestion;
  issuer: InputtedIssuer;
  suggestedIssuerName: string;
  isNewIssuer: boolean;
  approved: boolean;
  rejected: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  unmappedIssuers: InputtedIssuer[];
  totalUnmapped: number;
  mergedIssuers: IssuerType[];
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

export function AIIssuerSuggestDialog({
  open,
  onOpenChange,
  businessId,
  unmappedIssuers,
  totalUnmapped,
  mergedIssuers,
}: Props) {
  const queryClient = useQueryClient();
  const createAliasMutation = useCreateIssuerAlias();
  const createIssuerMutation = useCreateIssuerType();

  const [phase, setPhase] = useState<DialogPhase>("confirming");
  const [issuerCount, setIssuerCount] = useState(0);

  // Results
  const [suggestionRows, setSuggestionRows] = useState<SuggestionRow[]>([]);
  const [noMatchRows, setNoMatchRows] = useState<{ issuer: InputtedIssuer; suggestion: AISuggestion }[]>([]);
  const [remainingCount, setRemainingCount] = useState(0);
  const [actualFailedCount, setActualFailedCount] = useState(0);
  const [partialInfo, setPartialInfo] = useState<{ processed: number; total: number } | null>(null);
  const [processedCount, setProcessedCount] = useState(0);

  // Expandable sections
  const [existingIssuersOpen, setExistingIssuersOpen] = useState(true);
  const [newIssuersOpen, setNewIssuersOpen] = useState(true);
  const [noMatchOpen, setNoMatchOpen] = useState(false);

  // New-issuer overrides: map issuer_normalized → existing issuer type id
  const [newIssuerExistingOverrides, setNewIssuerExistingOverrides] = useState<Record<string, string>>({});

  // Processing control
  const [processing, setProcessing] = useState(false);
  const abortRef = useRef(false);

  // ─── Derived: split rows into existing vs new issuer ─────────
  const existingIssuerRows = useMemo(
    () => suggestionRows.filter((r) => !r.isNewIssuer).sort(sortByConfidence),
    [suggestionRows]
  );
  const newIssuerRows = useMemo(
    () => suggestionRows.filter((r) => r.isNewIssuer).sort(sortByConfidence),
    [suggestionRows]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["inputted-issuers"] });
    queryClient.invalidateQueries({ queryKey: ["issuer-types"] });
    queryClient.invalidateQueries({ queryKey: ["issuer-type-usage"] });
    queryClient.invalidateQueries({ queryKey: ["certificates"] });
    queryClient.invalidateQueries({ queryKey: ["needs-review-count"] });
    queryClient.invalidateQueries({ queryKey: ["issuer-type-certificates"] });
    queryClient.invalidateQueries({ queryKey: ["issuer-aliases"] });
  }, [queryClient]);

  const resetState = useCallback(() => {
    setPhase("confirming");
    setIssuerCount(0);
    setSuggestionRows([]);
    setNoMatchRows([]);
    setRemainingCount(0);
    setActualFailedCount(0);
    setPartialInfo(null);
    setProcessedCount(0);
    setExistingIssuersOpen(true);
    setNewIssuersOpen(true);
    setNoMatchOpen(false);
    setNewIssuerExistingOverrides({});
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
      // Use unmapped issuers directly from props
      const issuersToProcess = unmappedIssuers.filter((i) => !i.is_mapped);

      if (issuersToProcess.length === 0) {
        toast.info("No unmapped issuers to analyse");
        setPhase("confirming");
        setProcessing(false);
        return;
      }

      const totalCount = issuersToProcess.length;
      setIssuerCount(totalCount);
      setProcessedCount(0);

      if (abortRef.current) { setPhase("confirming"); setProcessing(false); return; }

      // Build payload: unique issuer values with counts and raw examples
      const issuersPayload = issuersToProcess.map((i) => ({
        normalized: i.issuer_normalized,
        display_name: i.display_name,
        raw_examples: i.raw_examples,
        count: i.count,
      }));

      const activeIssuers = mergedIssuers.filter((t) => t.is_active);
      const canonicalPayload = activeIssuers.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || null,
      }));

      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;

      // ── Client-side batching: 25 per call ──
      const BATCH_SIZE = 25;
      const allSuggestions: AISuggestion[] = [];
      let totalProcessedByServer = 0;
      let wasAborted = false;

      for (let i = 0; i < issuersPayload.length; i += BATCH_SIZE) {
        if (abortRef.current) { wasAborted = true; break; }

        const batch = issuersPayload.slice(i, i + BATCH_SIZE);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-issuer-types`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              issuers: batch,
              canonicalIssuers: canonicalPayload,
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
          totalProcessedByServer += batch.length;
          const newProcessed = Math.min(i + BATCH_SIZE, issuersPayload.length);
          setProcessedCount(newProcessed);
          continue;
        }

        const result = await response.json();
        const batchSuggestions: AISuggestion[] = result.suggestions || [];
        allSuggestions.push(...batchSuggestions);
        totalProcessedByServer += result.processed || batch.length;

        const newProcessed = Math.min(i + BATCH_SIZE, issuersPayload.length);
        setProcessedCount(newProcessed);
      }

      // If aborted early with no results, go back
      if (wasAborted && allSuggestions.length === 0) {
        setPhase("confirming");
        setProcessing(false);
        return;
      }

      const actualProcessed = wasAborted ? totalProcessedByServer : issuersPayload.length;

      if (actualProcessed < totalCount || wasAborted) {
        setPartialInfo({ processed: actualProcessed, total: totalCount });
      }

      // Build result rows
      const matched: SuggestionRow[] = [];
      const noMatch: { issuer: InputtedIssuer; suggestion: AISuggestion }[] = [];

      for (const s of allSuggestions) {
        const issuerData = issuersToProcess.find((i) => i.issuer_normalized === s.issuer_normalized);
        if (!issuerData) continue;

        if (s.suggested_issuer_type_id) {
          const issuerName = mergedIssuers.find((t) => t.id === s.suggested_issuer_type_id)?.name || "Unknown";
          matched.push({
            suggestion: s,
            issuer: issuerData,
            suggestedIssuerName: issuerName,
            isNewIssuer: false,
            approved: false,
            rejected: false,
          });
        } else if (s.suggested_new_issuer_name) {
          matched.push({
            suggestion: s,
            issuer: issuerData,
            suggestedIssuerName: s.suggested_new_issuer_name,
            isNewIssuer: true,
            approved: false,
            rejected: false,
          });
        } else {
          noMatch.push({ issuer: issuerData, suggestion: s });
        }
      }

      const remaining = totalCount - actualProcessed;
      const actualFailed = actualProcessed - allSuggestions.length;

      setSuggestionRows(matched);
      setNoMatchRows(noMatch);
      setRemainingCount(remaining > 0 ? remaining : 0);
      setActualFailedCount(actualFailed > 0 ? actualFailed : 0);
      setPhase("results");
    } catch (error) {
      console.error("AI issuer suggest error:", error);
      toast.error("AI issuer suggestion failed");
      setPhase("confirming");
    } finally {
      setProcessing(false);
    }
  };

  // ─── Helper: bulk-update certificates for an issuer ──────────
  const bulkAssignIssuerType = async (issuer: InputtedIssuer, targetIssuerTypeId: string) => {
    // Find all certificates matching this normalized issuing_authority
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
        return normalized === issuer.issuer_normalized;
      })
      .map((c: any) => c.id);

    if (matchingIds.length > 0) {
      for (let i = 0; i < matchingIds.length; i += 100) {
        const batch = matchingIds.slice(i, i + 100);
        const { error: updateError } = await supabase
          .from("certificates")
          .update({ issuer_type_id: targetIssuerTypeId })
          .in("id", batch);
        if (updateError) throw updateError;
      }
    }

    return matchingIds.length;
  };

  // ─── Helper: create aliases for all raw examples ─────────────
  const createAliasesForIssuer = async (issuer: InputtedIssuer, targetIssuerTypeId: string, confidence: string) => {
    const processedNormalized = new Set<string>();
    for (const rawExample of issuer.raw_examples) {
      const norm = normalizeCertificateTitle(rawExample) || rawExample.toLowerCase();
      if (processedNormalized.has(norm)) continue;
      processedNormalized.add(norm);
      try {
        await createAliasMutation.mutateAsync({
          aliasRaw: rawExample,
          issuerTypeId: targetIssuerTypeId,
        });
      } catch (e: any) {
        if (e.code !== "23505") console.error("Alias error:", e);
      }
    }
  };

  // ─── Accept a single suggestion ──────────────────────────────
  const handleApprove = async (row: SuggestionRow) => {
    if (row.approved || row.rejected) return;

    const globalIdx = suggestionRows.findIndex((r) => r.issuer.issuer_normalized === row.issuer.issuer_normalized);
    if (globalIdx === -1) return;

    try {
      const existingOverride = newIssuerExistingOverrides[row.issuer.issuer_normalized];

      if (row.isNewIssuer && !existingOverride) {
        // Create new issuer type then assign
        const newIssuer = await createIssuerMutation.mutateAsync({
          name: row.suggestion.suggested_new_issuer_name!,
        });

        await createAliasesForIssuer(row.issuer, newIssuer.id, row.suggestion.confidence);
        await bulkAssignIssuerType(row.issuer, newIssuer.id);
      } else {
        // Assign existing issuer type (either original suggestion or admin override)
        const typeId = existingOverride || row.suggestion.suggested_issuer_type_id!;
        await createAliasesForIssuer(row.issuer, typeId, row.suggestion.confidence);
        await bulkAssignIssuerType(row.issuer, typeId);
      }

      const displayName = existingOverride
        ? mergedIssuers.find((t) => t.id === existingOverride)?.name || row.suggestedIssuerName
        : row.suggestedIssuerName;

      setSuggestionRows((prev) =>
        prev.map((r, i) => (i === globalIdx ? { ...r, approved: true } : r))
      );
      toast.success(`Grouped "${row.issuer.display_name}" → "${displayName}" (${row.issuer.count} certs)`);
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Failed to approve suggestion");
    }
  };

  const handleReject = (row: SuggestionRow) => {
    const globalIdx = suggestionRows.findIndex((r) => r.issuer.issuer_normalized === row.issuer.issuer_normalized);
    if (globalIdx === -1) return;
    setSuggestionRows((prev) =>
      prev.map((r, i) => (i === globalIdx ? { ...r, rejected: true } : r))
    );
  };

  // ─── Approve All (existing issuers only) ──────────────────────
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkDoneMessage, setBulkDoneMessage] = useState<string | null>(null);
  const [newIssuerBulkProcessing, setNewIssuerBulkProcessing] = useState(false);
  const [newIssuerBulkProgress, setNewIssuerBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [newIssuerBulkDoneMessage, setNewIssuerBulkDoneMessage] = useState<string | null>(null);
  const [newIssuerBulkConfirmOpen, setNewIssuerBulkConfirmOpen] = useState(false);

  const handleApproveAll = async () => {
    const pending = existingIssuerRows.filter((r) => !r.approved && !r.rejected && r.suggestion.suggested_issuer_type_id);
    if (pending.length === 0) {
      toast.info("No pending suggestions to approve");
      return;
    }

    setBulkProcessing(true);
    let successCount = 0;

    try {
      for (const row of pending) {
        try {
          await handleApprove(row);
          successCount++;
        } catch (e) {
          console.error("Individual approve error:", e);
        }
      }

      toast.success(`Approved ${successCount} issuer grouping${successCount !== 1 ? "s" : ""}`);
    } catch (error) {
      console.error("Bulk approve error:", error);
      toast.error("Some approvals failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleApproveAllNewIssuers = async () => {
    setNewIssuerBulkConfirmOpen(false);
    setNewIssuerBulkProcessing(true);
    let successCount = 0;

    try {
      const pending = newIssuerRows.filter((r) => !r.approved && !r.rejected);
      for (const row of pending) {
        try {
          await handleApprove(row);
          successCount++;
        } catch (e) {
          console.error("Individual new issuer approve error:", e);
        }
      }
      toast.success(`Created & approved ${successCount} new issuer${successCount !== 1 ? "s" : ""}`);
    } catch (error) {
      console.error("Bulk new issuer approve error:", error);
      toast.error("Some approvals failed");
    } finally {
      setNewIssuerBulkProcessing(false);
    }
  };

  // ─── Counts ────────────────────────────────────────────────────
  const pendingExisting = existingIssuerRows.filter((r) => !r.approved && !r.rejected);
  const pendingNew = newIssuerRows.filter((r) => !r.approved && !r.rejected);
  const approvedAll = suggestionRows.filter((r) => r.approved);

  // Total certificates affected
  const totalCertsExisting = existingIssuerRows.reduce((sum, r) => sum + r.issuer.count, 0);
  const totalCertsNew = newIssuerRows.reduce((sum, r) => sum + r.issuer.count, 0);

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Group Issuers
          </DialogTitle>
          <DialogDescription>
            Cluster unmapped issuing authorities and suggest groupings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* ─── Confirming Phase ─────────────────────────────── */}
          {phase === "confirming" && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  This will analyze <strong>{totalUnmapped}</strong> unmapped issuer string{totalUnmapped !== 1 ? "s" : ""} and suggest groupings into canonical issuing authorities.
                </p>
                <p className="text-sm text-muted-foreground">
                  The AI will cluster variations (e.g. "DNV", "DNV GL", "Det Norske Veritas") and match them against your existing issuers.
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
                    Processing {processedCount} of {issuerCount} issuers...
                  </p>
                  <Progress value={issuerCount > 0 ? (processedCount / issuerCount) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {issuerCount - processedCount} issuers remaining...
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
                  <p className="text-2xl font-bold">{existingIssuerRows.length}</p>
                  <p className="text-xs text-muted-foreground">Existing matches</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 text-center border border-amber-200 dark:border-amber-800">
                  <p className="text-2xl font-bold">{newIssuerRows.length}</p>
                  <p className="text-xs text-muted-foreground">New issuers</p>
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

              {/* ─── Matched to Existing Issuers ──────────────── */}
              {existingIssuerRows.length > 0 && (
                <Collapsible open={existingIssuersOpen} onOpenChange={setExistingIssuersOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <ChevronDown className={`h-4 w-4 transition-transform ${existingIssuersOpen ? "" : "-rotate-90"}`} />
                    <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    <span className="font-medium text-sm flex-1 text-left">
                      Matched to existing issuers ({existingIssuerRows.length})
                    </span>
                    <span className="text-xs text-muted-foreground">{totalCertsExisting} certs</span>
                    {approvedAll.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {approvedAll.length} approved
                      </Badge>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                        {existingIssuerRows.map((row) => (
                          <div
                            key={row.issuer.issuer_normalized}
                            className={`p-3 space-y-1 transition-opacity ${
                              row.approved ? "opacity-50 bg-chart-2/5" : row.rejected ? "opacity-40" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{row.issuer.display_name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {row.issuer.count} cert{row.issuer.count !== 1 ? "s" : ""}
                                </Badge>
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
                              <span className="text-muted-foreground truncate">{row.issuer.display_name}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">{row.suggestedIssuerName}</span>
                            </div>
                            {row.issuer.raw_examples.length > 1 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {row.issuer.raw_examples.slice(0, 4).map((ex, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[10px] font-normal">
                                    {ex}
                                  </Badge>
                                ))}
                                {row.issuer.raw_examples.length > 4 && (
                                  <span className="text-[10px] text-muted-foreground self-center">+{row.issuer.raw_examples.length - 4} more</span>
                                )}
                              </div>
                            )}
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

              {/* ─── New Issuers Suggested ─────────────────────── */}
              {newIssuerRows.length > 0 && (
                <Collapsible open={newIssuersOpen} onOpenChange={setNewIssuersOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors">
                    <ChevronDown className={`h-4 w-4 transition-transform ${newIssuersOpen ? "" : "-rotate-90"}`} />
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-sm flex-1 text-left">
                      New issuers suggested ({newIssuerRows.length})
                    </span>
                    <span className="text-xs text-muted-foreground">{totalCertsNew} certs</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                      Creates new issuers — review individually
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {pendingNew.length > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
                        <span className="text-xs text-muted-foreground">
                          {pendingNew.length} pending review
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setNewIssuerBulkConfirmOpen(true)}
                          disabled={newIssuerBulkProcessing}
                        >
                          {newIssuerBulkProcessing ? (
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
                        {newIssuerRows.map((row) => {
                          const existingOverride = newIssuerExistingOverrides[row.issuer.issuer_normalized];
                          const isOverriddenToExisting = !!existingOverride;

                          return (
                            <div
                              key={row.issuer.issuer_normalized}
                              className={`p-3 space-y-2 bg-amber-50/50 dark:bg-amber-950/10 transition-opacity ${
                                row.approved ? "opacity-50 bg-chart-2/5" : row.rejected ? "opacity-40" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">{row.issuer.display_name}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {row.issuer.count} cert{row.issuer.count !== 1 ? "s" : ""}
                                  </Badge>
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
                                <span className="text-muted-foreground truncate">{row.issuer.display_name}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate flex items-center gap-1">
                                  {isOverriddenToExisting ? (
                                    mergedIssuers.find((t) => t.id === existingOverride)?.name || "Unknown"
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3" />
                                      {row.suggestedIssuerName}
                                    </>
                                  )}
                                </span>
                              </div>
                              {row.issuer.raw_examples.length > 1 && (
                                <div className="flex flex-wrap gap-1">
                                  {row.issuer.raw_examples.slice(0, 4).map((ex, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[10px] font-normal">
                                      {ex}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {row.suggestion.reasoning && (
                                <p className="text-[11px] text-muted-foreground italic">"{row.suggestion.reasoning}"</p>
                              )}

                              {/* Override controls */}
                              {!row.approved && !row.rejected && (
                                <>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Assign to existing issuer instead</label>
                                    <Select
                                      value={existingOverride || ""}
                                      onValueChange={(val) => {
                                        if (val === "__clear") {
                                          setNewIssuerExistingOverrides((prev) => {
                                            const next = { ...prev };
                                            delete next[row.issuer.issuer_normalized];
                                            return next;
                                          });
                                        } else {
                                          setNewIssuerExistingOverrides((prev) => ({ ...prev, [row.issuer.issuer_normalized]: val }));
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Create new issuer..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__clear" className="text-xs text-muted-foreground">
                                          Create new issuer (default)
                                        </SelectItem>
                                        {mergedIssuers
                                          .filter((t) => t.is_active)
                                          .map((t) => (
                                            <SelectItem key={t.id} value={t.id} className="text-xs">
                                              {t.name}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
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
                          <div key={row.issuer.issuer_normalized} className="p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{row.issuer.display_name}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {row.issuer.count} cert{row.issuer.count !== 1 ? "s" : ""}
                              </Badge>
                            </div>
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
                    {remainingCount} issuer{remainingCount !== 1 ? "s" : ""} not yet processed — run again to continue.
                  </span>
                </div>
              )}
              {actualFailedCount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">
                    {actualFailedCount} issuer{actualFailedCount !== 1 ? "s" : ""} failed to process
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
      <AlertDialog open={newIssuerBulkConfirmOpen} onOpenChange={setNewIssuerBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create & Approve All New Issuers</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {pendingNew.length} new issuing authorit{pendingNew.length !== 1 ? "ies" : "y"} and assign them to the corresponding certificates. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveAllNewIssuers}>
              Create {pendingNew.length} issuer{pendingNew.length !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
