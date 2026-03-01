import { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw, Loader2, CheckCircle2, AlertTriangle, XCircle, ChevronDown, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fileToBase64Image } from '@/lib/pdfUtils';
import { normalizeCertificateTitle } from '@/lib/certificateNormalization';
import { findSimilarMatches } from '@/lib/stringUtils';
import { useCertificateTypes } from '@/hooks/useCertificateTypes';

interface RescanResult {
  matched: number;
  cleanedOnly: number;
  failed: number;
}

export function RescanCertificatesTool() {
  const { businessId } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unmappedCount, setUnmappedCount] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [result, setResult] = useState<RescanResult | null>(null);
  const abortRef = useRef(false);

  const { data: certificateTypes } = useCertificateTypes();

  // Count unmapped certificates on mount
  useEffect(() => {
    if (!businessId) return;
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .is('certificate_type_id', null)
        .not('document_url', 'is', null);
      if (!error && count !== null) setUnmappedCount(count);
    };
    fetchCount();
  }, [businessId, result]);

  const extractStoragePath = (documentUrl: string): string => {
    if (documentUrl.includes('certificate-documents/')) {
      const match = documentUrl.match(/certificate-documents\/(.+)/);
      if (match) return match[1];
    }
    return documentUrl;
  };

  const handleRescan = useCallback(async () => {
    if (!businessId) return;
    setConfirmOpen(false);
    setProcessing(true);
    setCurrent(0);
    setResult(null);
    abortRef.current = false;

    const stats: RescanResult = { matched: 0, cleanedOnly: 0, failed: 0 };

    try {
      // Fetch all unmapped certificates with documents
      const { data: certs, error } = await supabase
        .from('certificates')
        .select('id, name, title_raw, title_normalized, category_id, issuing_authority, date_of_issue, expiry_date, place_of_issue, document_url, personnel_id')
        .is('certificate_type_id', null)
        .not('document_url', 'is', null);

      if (error) throw error;
      if (!certs || certs.length === 0) {
        toast.info('No unmapped certificates with documents found');
        setProcessing(false);
        return;
      }

      setTotal(certs.length);

      // Fetch aliases for this business
      const { data: aliases } = await supabase
        .from('certificate_aliases')
        .select('alias_normalized, certificate_type_id')
        .eq('business_id', businessId);

      const aliasMap = new Map<string, string>();
      (aliases || []).forEach(a => aliasMap.set(a.alias_normalized, a.certificate_type_id));

      const typeNames = (certificateTypes || []).filter(t => t.is_active).map(t => t.name);
      const typeMap = new Map<string, { id: string; category_id: string | null }>();
      (certificateTypes || []).filter(t => t.is_active).forEach(t => {
        typeMap.set(t.name.toLowerCase(), { id: t.id, category_id: t.category_id });
      });

      // Fetch existing categories for OCR context
      const { data: categories } = await supabase
        .from('certificate_categories')
        .select('name')
        .eq('business_id', businessId);
      const categoryNames = (categories || []).map(c => c.name);

      for (let i = 0; i < certs.length; i++) {
        if (abortRef.current) break;

        const cert = certs[i];
        setCurrent(i + 1);

        try {
          // Download document from storage
          const storagePath = extractStoragePath(cert.document_url!);
          const { data: blob, error: dlError } = await supabase.storage
            .from('certificate-documents')
            .download(storagePath);

          if (dlError || !blob) {
            stats.failed++;
            continue;
          }

          // Convert to base64
          const fileName = storagePath.split('/').pop() || 'document';
          const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });
          const { base64, mimeType } = await fileToBase64Image(file);

          // Call existing OCR edge function
          const { data: ocrData, error: ocrError } = await supabase.functions.invoke('extract-certificate-data', {
            body: {
              imageBase64: base64,
              mimeType,
              businessId,
              existingCategories: categoryNames,
              existingIssuers: [],
            },
          });

          if (ocrError || !ocrData?.extractedData) {
            stats.failed++;
            continue;
          }

          const extracted = ocrData.extractedData;
          const suggestedTypeName = extracted.suggestedTypeName || extracted.certificateName || '';

          // Save old values as rollback safety net
          const previousData = {
            title_raw: cert.title_raw,
            title_normalized: cert.title_normalized,
            category_id: cert.category_id,
            issuing_authority: cert.issuing_authority,
            date_of_issue: cert.date_of_issue,
            expiry_date: cert.expiry_date,
            place_of_issue: cert.place_of_issue,
            rescanned_at: new Date().toISOString(),
          };

          // Prepare clean OCR data
          const newTitleRaw = suggestedTypeName || cert.title_raw;
          const newTitleNormalized = newTitleRaw ? normalizeCertificateTitle(newTitleRaw) : cert.title_normalized;

          const updatePayload: Record<string, unknown> = {
            title_raw: newTitleRaw,
            title_normalized: newTitleNormalized,
            issuing_authority: extracted.issuingAuthority || cert.issuing_authority,
            date_of_issue: extracted.dateOfIssue || cert.date_of_issue,
            expiry_date: extracted.expiryDate || cert.expiry_date,
            place_of_issue: extracted.placeOfIssue || cert.place_of_issue,
            rescan_previous_data: previousData,
          };

          // Try alias lookup first
          let matched = false;
          if (newTitleNormalized) {
            const aliasTypeId = aliasMap.get(newTitleNormalized);
            if (aliasTypeId) {
              const matchedType = (certificateTypes || []).find(t => t.id === aliasTypeId);
              if (matchedType) {
                updatePayload.certificate_type_id = matchedType.id;
                updatePayload.category_id = matchedType.category_id || cert.category_id;
                updatePayload.needs_review = false;
                matched = true;
              }
            }
          }

          // Fuzzy match if alias didn't hit
          if (!matched && suggestedTypeName) {
            const fuzzyMatches = findSimilarMatches(suggestedTypeName, typeNames, 0.85);
            if (fuzzyMatches.length > 0 && fuzzyMatches[0].similarity >= 0.85) {
              const typeInfo = typeMap.get(fuzzyMatches[0].value.toLowerCase());
              if (typeInfo) {
                updatePayload.certificate_type_id = typeInfo.id;
                updatePayload.category_id = typeInfo.category_id || cert.category_id;
                updatePayload.needs_review = false;
                matched = true;
              }
            }
          }

          // Update certificate
          const { error: updateError } = await supabase
            .from('certificates')
            .update(updatePayload)
            .eq('id', cert.id);

          if (updateError) {
            stats.failed++;
          } else if (matched) {
            stats.matched++;
          } else {
            stats.cleanedOnly++;
          }
        } catch (err) {
          console.error(`[Rescan] Error processing cert ${cert.id}:`, err);
          stats.failed++;
        }

        // 500ms delay between API calls
        if (i < certs.length - 1 && !abortRef.current) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } catch (err) {
      console.error('[Rescan] Fatal error:', err);
      toast.error('Re-scan failed unexpectedly');
    }

    setResult(stats);
    setProcessing(false);

    if (abortRef.current) {
      toast.info(`Re-scan stopped. Processed ${current} of ${total} certificates.`);
    } else {
      toast.success(`Re-scan complete. ${stats.matched} matched, ${stats.cleanedOnly} cleaned, ${stats.failed} failed.`);
    }
  }, [businessId, certificateTypes]);

  const handleStop = () => {
    abortRef.current = true;
  };

  const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Collapsible className="mb-6">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary cursor-pointer w-full py-2">
        <RefreshCw className="h-4 w-4 text-primary" />
        <span>Re-scan Existing Certificates</span>
        {unmappedCount !== null && unmappedCount > 0 && (
          <span className="text-xs text-muted-foreground ml-1">({unmappedCount} unmapped)</span>
        )}
        <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            Re-scan unmapped certificates through AI to extract clean titles and auto-match them to existing certificate types. Original data is preserved for rollback.
          </p>

          {/* Processing state */}
          {processing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Processing {current} of {total} certificates...</span>
                <Button variant="destructive" size="sm" onClick={handleStop}>
                  <Square className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                This may take several minutes. You can stop at any time — processed certificates will keep their updates.
              </p>
            </div>
          )}

          {/* Result summary */}
          {result && !processing && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-3 text-sm">
                {result.matched > 0 && (
                  <span className="flex items-center gap-1 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    {result.matched} auto-matched to types
                  </span>
                )}
                {result.cleanedOnly > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    {result.cleanedOnly} cleaned (need manual review)
                  </span>
                )}
                {result.failed > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" />
                    {result.failed} failed
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action button */}
          {!processing && (
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={unmappedCount === 0 || unmappedCount === null}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-scan unmapped certificates
            </Button>
          )}
        </div>

        {/* Confirmation dialog */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Re-scan Unmapped Certificates</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    This will re-scan <strong>{unmappedCount}</strong> certificate{unmappedCount !== 1 ? 's' : ''} through AI.
                    This may take several minutes.
                  </p>
                  <p className="text-sm">
                    Original data will be saved for rollback. Only unmapped certificates with documents will be processed.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRescan}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CollapsibleContent>
    </Collapsible>
  );
}
