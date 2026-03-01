import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  const [failedCount, setFailedCount] = useState(0);
  const [partialInfo, setPartialInfo] = useState<{ processed: number; total: number } | null>(null);

  // Expandable sections
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [noMatchOpen, setNoMatchOpen] = useState(false);

  // Processing control
  const [processing, setProcessing] = useState(false);
  const abortRef = useRef(false);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["unmapped-certificates"] });
    queryClient.invalidateQueries({ queryKey: ["certificates"] });
    queryClient.invalidateQueries({ queryKey: ["certificate-type-usage"] });
    queryClient.invalidateQueries({ queryKey: ["certificate-types"] });
  }, [queryClient]);

  const resetState = useCallback(() => {
    setPhase("confirming");
    setCertCount(0);
    setProgressText("");
    setSuggestionRows([]);
    setNoMatchRows([]);
    setFailedCount(0);
    setPartialInfo(null);
    setSuggestionsOpen(true);
    setNoMatchOpen(false);
    setProcessing(false);
    abortRef.current = false;
  }, []);

  const handleClose = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      abortRef.current = true;
      // If we had results, invalidate queries
      if (phase === "results") {
        invalidateAll();
      }
      // Delay reset so dialog close animation finishes
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
      // Fetch all unmapped certs matching current filters
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

      setCertCount(filtered.length);
      setProgressText(`Analyzing ${filtered.length} certificates...`);

      if (abortRef.current) { setPhase("confirming"); setProcessing(false); return; }

      // Build payloads
      const certsPayload = filtered.map((c: any) => ({
        id: c.id,
        title_raw: c.title_raw,
        category_name: c.certificate_categories?.name || null,
        expiry_date: c.expiry_date || null,
        place_of_issue: c.place_of_issue || null,
        personnel_role: c.personnel?.role || null,
      }));

      // Build a lookup map for personnel names
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

      if (abortRef.current) { setPhase("confirming"); setProcessing(false); return; }

      if (response.status === 429) {
        const body = await response.json().catch(() => ({}));
        if (body.error === "monthly_cap_reached") {
          toast.error("Monthly AI allowance reached");
        } else {
          toast.error("Rate limit exceeded — please try again shortly");
        }
        setPhase("confirming");
        setProcessing(false);
        return;
      }

      if (response.status === 402) {
        toast.error("AI usage limit reached. Please contact support.");
        setPhase("confirming");
        setProcessing(false);
        return;
      }

      if (!response.ok) throw new Error(`Classification failed (${response.status})`);

      const result = await response.json();
      const suggestions: AISuggestion[] = result.suggestions || [];

      if (result.partial) {
        setPartialInfo({ processed: result.processed, total: result.total });
      }

      // Build result rows
      const matched: SuggestionRow[] = [];
      const noMatch: { cert: UnmappedCertificate; suggestion: AISuggestion }[] = [];

      for (const s of suggestions) {
        // Find the cert from unmappedCerts (already loaded) or build a minimal one
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

      // Failed = total sent minus suggestions returned
      const failCount = filtered.length - suggestions.length;

      setSuggestionRows(matched);
      setNoMatchRows(noMatch);
      setFailedCount(failCount > 0 ? failCount : 0);
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
  const handleApprove = async (index: number) => {
    const row = suggestionRows[index];
    if (!row || row.approved || row.rejected) return;

    try {
      if (row.isNewType) {
        // Create new type then assign
        let categoryId: string | undefined;
        if (row.suggestion.suggested_new_type_category) {
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
          .update({ certificate_type_id: newType.id, needs_review: false })
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
        // Assign existing type
        const { error } = await supabase
          .from("certificates")
          .update({ certificate_type_id: row.suggestion.suggested_type_id!, needs_review: false })
          .eq("id", row.cert.id);
        if (error) throw error;

        if (row.cert.title_raw) {
          try {
            await createAliasMutation.mutateAsync({
              aliasRaw: row.cert.title_raw,
              certificateTypeId: row.suggestion.suggested_type_id!,
              createdBy: "system",
              confidence: row.suggestion.confidence === "high" ? 85 : 70,
            });
          } catch (e: any) {
            if (e.code !== "23505") console.error("Alias error:", e);
          }
        }
      }

      setSuggestionRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, approved: true } : r))
      );
      toast.success(`Assigned "${row.cert.title_raw}" → "${row.suggestedTypeName}"`);
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Failed to approve suggestion");
    }
  };

  const handleReject = (index: number) => {
    setSuggestionRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, rejected: true } : r))
    );
  };

  // ─── Approve All ──────────────────────────────────────────────
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const handleApproveAll = async () => {
    const pending = suggestionRows.filter((r) => !r.approved && !r.rejected && !r.isNewType && r.suggestion.suggested_type_id);
    if (pending.length === 0) {
      toast.info("No pending suggestions to approve");
      return;
    }

    setBulkProcessing(true);
    let successCount = 0;

    try {
      // Group by type
      const byType = new Map<string, SuggestionRow[]>();
      for (const row of pending) {
        const list = byType.get(row.suggestion.suggested_type_id!) || [];
        list.push(row);
        byType.set(row.suggestion.suggested_type_id!, list);
      }

      for (const [typeId, rows] of byType) {
        const ids = rows.map((r) => r.cert.id);
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

        // Create aliases
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
      }

      // Mark all as approved
      const approvedIds = new Set(pending.map((r) => r.cert.id));
      setSuggestionRows((prev) =>
        prev.map((r) => (approvedIds.has(r.cert.id) ? { ...r, approved: true } : r))
      );

      toast.success(`Approved ${successCount} certificate${successCount !== 1 ? "s" : ""}`);
    } catch (error) {
      console.error("Bulk approve error:", error);
      toast.error("Some approvals failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  // ─── Counts ────────────────────────────────────────────────────
  const pendingSuggestions = suggestionRows.filter((r) => !r.approved && !r.rejected);
  const approvedSuggestions = suggestionRows.filter((r) => r.approved);
  const rejectedSuggestions = suggestionRows.filter((r) => r.rejected);

  return (
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
                  <p className="text-sm font-medium">{progressText}</p>
                  <Progress value={undefined} className="h-2" />
                  <p className="text-xs text-muted-foreground">This may take 10–60 seconds</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Results Phase ────────────────────────────────── */}
          {phase === "results" && (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{suggestionRows.length}</p>
                  <p className="text-xs text-muted-foreground">Suggestions</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{noMatchRows.length}</p>
                  <p className="text-xs text-muted-foreground">No match</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{failedCount}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {partialInfo && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border rounded text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Processed {partialInfo.processed} of {partialInfo.total} — run again for remaining.
                </div>
              )}

              {/* ─── Suggestions Ready ─────────────────────────── */}
              {suggestionRows.length > 0 && (
                <Collapsible open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <ChevronDown className={`h-4 w-4 transition-transform ${suggestionsOpen ? "" : "-rotate-90"}`} />
                    <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    <span className="font-medium text-sm flex-1 text-left">
                      {suggestionRows.length} suggestion{suggestionRows.length !== 1 ? "s" : ""} ready
                    </span>
                    {approvedSuggestions.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {approvedSuggestions.length} approved
                      </Badge>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {/* Approve All bar */}
                    {pendingSuggestions.length > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
                        <span className="text-xs text-muted-foreground">
                          {pendingSuggestions.length} pending review
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
                          Approve All ({pendingSuggestions.filter((r) => !r.isNewType).length})
                        </Button>
                      </div>
                    )}
                    <ScrollArea className="max-h-[300px]">
                      <div className="divide-y">
                        {suggestionRows.map((row, idx) => (
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
                              <span className="font-medium truncate">
                                {row.isNewType ? `New: ${row.suggestedTypeName}` : row.suggestedTypeName}
                              </span>
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
                                  onClick={() => handleApprove(idx)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  {row.isNewType ? "Create & Approve" : "Approve"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => handleReject(idx)}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
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
                    <ScrollArea className="max-h-[200px]">
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
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* ─── Failed ────────────────────────────────────── */}
              {failedCount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">
                    {failedCount} certificate{failedCount !== 1 ? "s" : ""} failed to process
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
  );
}
