import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  Loader2,
  Play,
  Pause,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Database,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeCertificateTitle } from "@/lib/certificateNormalization";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BackfillCursor {
  lastCreatedAt: string | null;
  lastId: string | null;
}

interface BackfillState {
  cursor: BackfillCursor;
  totalProcessed: number;
  totalMatched: number;
  totalNeedsReview: number;
  estimatedTotal: number;
  isRunning: boolean;
  isComplete: boolean;
  isPaused: boolean;
}

const BATCH_SIZE = 200;

export function CertificateBackfillTool() {
  const { businessId } = useAuth();
  const queryClient = useQueryClient();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [state, setState] = useState<BackfillState>({
    cursor: { lastCreatedAt: null, lastId: null },
    totalProcessed: 0,
    totalMatched: 0,
    totalNeedsReview: 0,
    estimatedTotal: 0,
    isRunning: false,
    isComplete: false,
    isPaused: false,
  });

  const abortRef = useRef(false);

  const fetchAliasMap = useCallback(async () => {
    if (!businessId) return new Map();

    const { data, error } = await supabase
      .from("certificate_aliases")
      .select("alias_normalized, certificate_type_id")
      .eq("business_id", businessId);

    if (error) {
      console.error("Error fetching aliases:", error);
      return new Map();
    }

    const map = new Map<string, string>();
    data?.forEach((alias) => {
      map.set(alias.alias_normalized, alias.certificate_type_id);
    });
    return map;
  }, [businessId]);

  const estimateTotal = useCallback(async () => {
    if (!businessId) return 0;

    const { count, error } = await supabase
      .from("certificates")
      .select(`
        id,
        personnel!inner (business_id)
      `, { count: "exact", head: true })
      .eq("personnel.business_id", businessId)
      .or("title_raw.is.null,title_normalized.is.null");

    if (error) {
      console.error("Error estimating total:", error);
      return 0;
    }

    return count || 0;
  }, [businessId]);

  const processBatch = useCallback(async (
    cursor: BackfillCursor,
    aliasMap: Map<string, string>
  ): Promise<{
    processed: number;
    matched: number;
    needsReview: number;
    newCursor: BackfillCursor;
    hasMore: boolean;
  }> => {
    if (!businessId) throw new Error("No business ID");

    // Build query with cursor-based pagination
    let query = supabase
      .from("certificates")
      .select(`
        id,
        name,
        title_raw,
        title_normalized,
        certificate_type_id,
        created_at,
        personnel!inner (business_id)
      `)
      .eq("personnel.business_id", businessId)
      .or("title_raw.is.null,title_normalized.is.null")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    // Apply cursor if we have one
    if (cursor.lastCreatedAt && cursor.lastId) {
      query = query.or(
        `created_at.gt.${cursor.lastCreatedAt},and(created_at.eq.${cursor.lastCreatedAt},id.gt.${cursor.lastId})`
      );
    }

    const { data: certificates, error } = await query;

    if (error) throw error;

    if (!certificates || certificates.length === 0) {
      return {
        processed: 0,
        matched: 0,
        needsReview: 0,
        newCursor: cursor,
        hasMore: false,
      };
    }

    let matched = 0;
    let needsReview = 0;

    // Process each certificate
    for (const cert of certificates) {
      const titleRaw = cert.title_raw || cert.name;
      const titleNormalized = normalizeCertificateTitle(titleRaw);

      // Check for alias match
      const matchedTypeId = aliasMap.get(titleNormalized);

      const updates: any = {
        title_raw: titleRaw,
        title_normalized: titleNormalized,
      };

      if (matchedTypeId && !cert.certificate_type_id) {
        // Auto-map if we have an alias match and no existing type
        updates.certificate_type_id = matchedTypeId;
        updates.needs_review = false;
        matched++;
      } else if (!cert.certificate_type_id) {
        // Mark for review if no match and no existing type
        updates.needs_review = true;
        needsReview++;
      }
      // If certificate_type_id is already set, we don't change it

      const { error: updateError } = await supabase
        .from("certificates")
        .update(updates)
        .eq("id", cert.id);

      if (updateError) {
        console.error(`Error updating certificate ${cert.id}:`, updateError);
      }
    }

    // Update alias last_seen_at for matched aliases
    // (Fire and forget, don't block on this)
    const matchedNormalizedTitles = certificates
      .filter((c) => {
        const normalized = normalizeCertificateTitle(c.title_raw || c.name);
        return aliasMap.has(normalized);
      })
      .map((c) => normalizeCertificateTitle(c.title_raw || c.name));

    if (matchedNormalizedTitles.length > 0) {
      supabase
        .from("certificate_aliases")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("business_id", businessId)
        .in("alias_normalized", matchedNormalizedTitles)
        .then(() => {});
    }

    const lastCert = certificates[certificates.length - 1];
    const newCursor: BackfillCursor = {
      lastCreatedAt: lastCert.created_at,
      lastId: lastCert.id,
    };

    return {
      processed: certificates.length,
      matched,
      needsReview,
      newCursor,
      hasMore: certificates.length === BATCH_SIZE,
    };
  }, [businessId]);

  const runBackfill = useCallback(async () => {
    abortRef.current = false;

    setState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
    }));

    try {
      // Get estimated total and alias map
      const [estimated, aliasMap] = await Promise.all([
        estimateTotal(),
        fetchAliasMap(),
      ]);

      setState((prev) => ({ ...prev, estimatedTotal: estimated }));

      let currentCursor = state.cursor;
      let hasMore = true;

      while (hasMore && !abortRef.current) {
        const result = await processBatch(currentCursor, aliasMap);

        setState((prev) => ({
          ...prev,
          cursor: result.newCursor,
          totalProcessed: prev.totalProcessed + result.processed,
          totalMatched: prev.totalMatched + result.matched,
          totalNeedsReview: prev.totalNeedsReview + result.needsReview,
        }));

        currentCursor = result.newCursor;
        hasMore = result.hasMore;

        // Small delay to prevent overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!abortRef.current) {
        setState((prev) => ({ ...prev, isComplete: true, isRunning: false }));
        toast.success("Backfill complete!");
        queryClient.invalidateQueries({ queryKey: ["certificates-needing-review"] });
        queryClient.invalidateQueries({ queryKey: ["certificates"] });
      } else {
        setState((prev) => ({ ...prev, isRunning: false, isPaused: true }));
      }
    } catch (error) {
      console.error("Backfill error:", error);
      toast.error("Backfill failed. You can resume from where it stopped.");
      setState((prev) => ({ ...prev, isRunning: false, isPaused: true }));
    }
  }, [state.cursor, estimateTotal, fetchAliasMap, processBatch, queryClient]);

  const handleStart = () => {
    if (state.totalProcessed === 0) {
      setConfirmDialogOpen(true);
    } else {
      runBackfill();
    }
  };

  const handlePause = () => {
    abortRef.current = true;
  };

  const handleReset = () => {
    setState({
      cursor: { lastCreatedAt: null, lastId: null },
      totalProcessed: 0,
      totalMatched: 0,
      totalNeedsReview: 0,
      estimatedTotal: 0,
      isRunning: false,
      isComplete: false,
      isPaused: false,
    });
  };

  const progressPercent = state.estimatedTotal > 0
    ? Math.min(100, (state.totalProcessed / state.estimatedTotal) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Standardize Existing Certificates
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Process existing certificates to populate normalized titles and auto-match to aliases.
            This is safe to run multiple times.
          </p>
        </div>
      </div>

      {/* Progress section */}
      {(state.isRunning || state.isPaused || state.isComplete) && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {state.isComplete ? "Complete" : state.isPaused ? "Paused" : "Processing..."}
            </span>
            <span className="text-sm text-muted-foreground">
              {state.totalProcessed.toLocaleString()}
              {state.estimatedTotal > 0 && ` / ~${state.estimatedTotal.toLocaleString()}`}
            </span>
          </div>

          <Progress value={progressPercent} className="h-2" />

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Matched: {state.totalMatched.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Needs Review: {state.totalNeedsReview.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!state.isRunning && !state.isComplete && (
          <Button onClick={handleStart}>
            {state.isPaused ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Backfill
              </>
            )}
          </Button>
        )}

        {state.isRunning && (
          <Button variant="outline" onClick={handlePause}>
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        )}

        {state.isComplete && (
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        )}

        {state.isRunning && (
          <Badge variant="secondary" className="ml-2">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            Processing...
          </Badge>
        )}
      </div>

      {/* Info text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Uses cursor-based pagination for stable processing</p>
        <p>• Safe to pause and resume - progress is preserved</p>
        <p>• Does not overwrite existing certificate type mappings</p>
        <p>• Auto-matches certificates to existing aliases</p>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Certificate Backfill</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This will process all certificates that are missing normalized
                  titles and attempt to auto-match them to your existing aliases.
                </p>
                <p className="text-sm text-muted-foreground">
                  The process is safe and can be paused at any time. Existing
                  certificate type mappings will not be changed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDialogOpen(false);
                runBackfill();
              }}
            >
              Start Backfill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
