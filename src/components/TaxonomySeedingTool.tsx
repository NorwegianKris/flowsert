import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, XCircle, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fileToBase64Image } from '@/lib/pdfUtils';
import { normalizeCertificateTitle } from '@/lib/certificateNormalization';
import { findSimilarMatches } from '@/lib/stringUtils';
import { useCertificateTypes, useCreateCertificateType } from '@/hooks/useCertificateTypes';
import { useCreateAlias } from '@/hooks/useCertificateAliases';
import { useCertificateCategories } from '@/hooks/useCertificateCategories';

const MAX_FILES = 20;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface SampleFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'matched' | 'new' | 'error';
  extractedName?: string;
  matchedTypeName?: string;
  suggestedCategory?: string;
  errorMessage?: string;
}

interface Suggestion {
  id: string;
  extractedName: string;
  suggestedCategory: string;
  categoryId: string;
  status: 'pending' | 'approved' | 'dismissed';
}

export function TaxonomySeedingTool() {
  const { businessId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<SampleFile[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: certificateTypes } = useCertificateTypes();
  const { categories } = useCertificateCategories();
  const createType = useCreateCertificateType();
  const createAlias = useCreateAlias();

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles = Array.from(newFiles).filter(f => ACCEPTED_TYPES.includes(f.type));
    const remaining = MAX_FILES - files.length;
    const toAdd = validFiles.slice(0, remaining).map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending' as const,
    }));

    if (validFiles.length > remaining) {
      toast.warning(`Only ${remaining} more files can be added (max ${MAX_FILES})`);
    }
    if (toAdd.length > 0) {
      setFiles(prev => [...prev, ...toAdd]);
      setProcessed(false);
    }
  }, [files.length]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const processFiles = async () => {
    if (!businessId || files.length === 0) return;
    setProcessing(true);

    const existingTypeNames = (certificateTypes || []).map(t => t.name);
    const newSuggestions: Suggestion[] = [];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status !== 'pending') continue;

      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'processing' } : f));

      try {
        // Convert to base64
        const { base64, mimeType } = await fileToBase64Image(item.file);

        // Call existing OCR edge function
        const { data, error } = await supabase.functions.invoke('extract-certificate-data', {
          body: {
            imageBase64: base64,
            mimeType,
            businessId,
            existingCategories: (categories || []).map(c => c.name),
            existingIssuers: [],
          },
        });

        if (error) throw error;

        const extracted = data?.extractedData;
        const suggestedTypeName = extracted?.suggestedTypeName || extracted?.certificateName || '';
        if (!suggestedTypeName) {
          setFiles(prev => prev.map(f => f.id === item.id ? {
            ...f, status: 'error', errorMessage: 'Could not extract certificate name',
          } : f));
          continue;
        }

        // Alias lookup: check normalized title against certificate_aliases
        const normalized = normalizeCertificateTitle(suggestedTypeName);
        const { data: aliasMatch } = await supabase
          .from('certificate_aliases')
          .select('certificate_type_id, certificate_types!certificate_aliases_certificate_type_id_fkey(name)')
          .eq('business_id', businessId)
          .eq('alias_normalized', normalized)
          .maybeSingle();

        if (aliasMatch) {
          setFiles(prev => prev.map(f => f.id === item.id ? {
            ...f,
            status: 'matched',
            extractedName: suggestedTypeName,
            matchedTypeName: (aliasMatch as any).certificate_types?.name || 'Known type',
          } : f));
        } else {
          // Fuzzy match with 0.85 threshold
          const fuzzyMatches = findSimilarMatches(suggestedTypeName, existingTypeNames, 0.85);

          if (fuzzyMatches.length > 0 && fuzzyMatches[0].similarity >= 0.85) {
            setFiles(prev => prev.map(f => f.id === item.id ? {
              ...f,
              status: 'matched',
              extractedName: suggestedTypeName,
              matchedTypeName: fuzzyMatches[0].value,
            } : f));
          } else {
            // New type suggested
            const suggestedCat = extracted?.matchedCategory || '';
            const matchedCat = (categories || []).find(
              c => c.name.toLowerCase() === suggestedCat.toLowerCase()
            );

            // Deduplicate: don't suggest if already in suggestions list
            const alreadySuggested = newSuggestions.some(
              s => normalizeCertificateTitle(s.extractedName) === normalized
            );

            if (!alreadySuggested) {
              newSuggestions.push({
                id: crypto.randomUUID(),
                extractedName: suggestedTypeName,
                suggestedCategory: suggestedCat,
                categoryId: matchedCat?.id || '',
                status: 'pending',
              });
            }

            setFiles(prev => prev.map(f => f.id === item.id ? {
              ...f,
              status: 'new',
              extractedName: suggestedTypeName,
              suggestedCategory: suggestedCat,
            } : f));
          }
        }
      } catch (err: any) {
        console.error(`[TaxonomySeeding] Error processing "${item.file.name}":`, err);
        const msg = err?.message || err?.msg || (typeof err === 'string' ? err : 'Processing failed');
        setFiles(prev => prev.map(f => f.id === item.id ? {
          ...f, status: 'error', errorMessage: msg,
        } : f));
      }

      // Throttle: 500ms between calls
      if (i < files.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setSuggestions(prev => [...prev, ...newSuggestions]);
    setProcessing(false);
    setProcessed(true);
  };

  const showApprovalSummaryAndReset = (approvedItems: Array<{name: string; categoryId: string}>) => {
    const lines = approvedItems.map(item => {
      const cat = (categories || []).find(c => c.id === item.categoryId);
      return `• ${item.name}${cat ? ` — ${cat.name}` : ''}`;
    }).join('\n');

    toast.success(`${approvedItems.length} certificate type${approvedItems.length !== 1 ? 's' : ''} added to your system:\n${lines}`, {
      duration: 6000,
    });
    reset();
  };

  const checkAllResolved = (updatedSuggestions: Suggestion[]) => {
    const pending = updatedSuggestions.filter(s => s.status === 'pending');
    if (pending.length === 0) {
      const approved = updatedSuggestions.filter(s => s.status === 'approved');
      if (approved.length > 0) {
        showApprovalSummaryAndReset(approved.map(s => ({ name: s.extractedName, categoryId: s.categoryId })));
      }
    }
  };

  const approveSuggestion = async (suggestion: Suggestion) => {
    try {
      const result = await createType.mutateAsync({
        name: suggestion.extractedName,
        category_id: suggestion.categoryId || undefined,
      });

      await createAlias.mutateAsync({
        aliasRaw: suggestion.extractedName,
        certificateTypeId: result.id,
        createdBy: 'admin',
        confidence: 100,
      });

      setSuggestions(prev => {
        const updated = prev.map(s =>
          s.id === suggestion.id ? { ...s, status: 'approved' as const } : s
        );
        // Defer the check so state is committed
        setTimeout(() => checkAllResolved(updated), 0);
        return updated;
      });
    } catch (err: any) {
      if (err.code === '23505') {
        toast.error('This type already exists');
        setSuggestions(prev => {
          const updated = prev.map(s =>
            s.id === suggestion.id ? { ...s, status: 'approved' as const } : s
          );
          setTimeout(() => checkAllResolved(updated), 0);
          return updated;
        });
      } else {
        toast.error('Failed to approve suggestion');
      }
    }
  };

  const dismissSuggestion = (id: string) => {
    setSuggestions(prev => {
      const updated = prev.map(s =>
        s.id === id ? { ...s, status: 'dismissed' as const } : s
      );
      setTimeout(() => checkAllResolved(updated), 0);
      return updated;
    });
  };

  const approveAll = async () => {
    const pending = suggestions.filter(s => s.status === 'pending');
    const approved: Array<{name: string; categoryId: string}> = [];
    for (const s of pending) {
      await approveSuggestion(s);
      approved.push({ name: s.extractedName, categoryId: s.categoryId });
    }
    if (approved.length > 0) {
      showApprovalSummaryAndReset(approved);
    }
  };

  const reset = () => {
    setFiles([]);
    setSuggestions([]);
    setProcessed(false);
  };

  // Stats
  const matchedCount = files.filter(f => f.status === 'matched').length;
  const newCount = files.filter(f => f.status === 'new').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-6">
      <CollapsibleTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex items-center gap-2 text-sm font-bold cursor-pointer py-2 px-4 rounded-full bg-primary text-primary-foreground shadow-lg transition-colors",
          !open && "animate-pulse hover:animate-none [animation-duration:2s]"
        )}
      >
        <Sparkles className="h-4 w-4" />
        <span>Teach the System</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20 relative">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm text-muted-foreground">
              Upload sample certificates from your business. The AI will analyze them and suggest new certificate types and categories for your system.
            </p>
          </div>

          {/* Upload zone */}
          {!processing && !processed && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />
              <div
                className={cn(
                  "relative p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 bg-muted/30",
                  processing && "opacity-50 cursor-not-allowed"
                )}
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={handleDrop}
                onClick={() => !processing && fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <Sparkles className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drop sample certificates here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Up to {MAX_FILES} files • PDF, JPEG, PNG, WebP
                  </p>
                </div>
              </div>
            </>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
                {!processing && !processed && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>
                    <Button size="sm" onClick={processFiles} disabled={files.filter(f => f.status === 'pending').length === 0}>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Analyze
                    </Button>
                  </div>
                )}
              </div>

              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {files.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-2 text-sm gap-2">
                    <div className="truncate flex-1 min-w-0">
                      <span className="truncate">{f.file.name}</span>
                      {f.status === 'error' && f.errorMessage && (
                        <p className="text-xs text-destructive mt-0.5 truncate">Failed: {f.errorMessage}</p>
                      )}
                    </div>
                    {f.status === 'pending' && (
                      <Badge variant="secondary" className="shrink-0">Pending</Badge>
                    )}
                    {f.status === 'processing' && (
                      <Badge variant="secondary" className="shrink-0">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Analyzing
                      </Badge>
                    )}
                    {f.status === 'matched' && (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Already known{f.matchedTypeName ? ` — ${f.matchedTypeName}` : ''}
                      </Badge>
                    )}
                    {f.status === 'new' && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        New type suggested
                      </Badge>
                    )}
                    {f.status === 'error' && (
                      <Badge variant="destructive" className="shrink-0">
                        <XCircle className="h-3 w-3 mr-1" />
                        Error
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary + Approval */}
          {processed && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {files.length} files analyzed. {newCount} new type{newCount !== 1 ? 's' : ''} suggested. {matchedCount} already matched.
                {errorCount > 0 && ` ${errorCount} failed.`}
              </div>

              {pendingSuggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Suggested New Types</span>
                    <Button size="sm" variant="outline" onClick={approveAll} disabled={createType.isPending}>
                      <Check className="h-4 w-4 mr-1" />
                      Approve All ({pendingSuggestions.length})
                    </Button>
                  </div>

                  <div className="border rounded-lg divide-y">
                    {suggestions.map(s => (
                      <div key={s.id} className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          {s.status === 'pending' ? (
                            <div className="flex-1 min-w-0">
                              <Input
                                ref={(el) => { inputRefs.current[s.id] = el; }}
                                value={s.extractedName}
                                onChange={(e) => setSuggestions(prev => prev.map(x =>
                                  x.id === s.id ? { ...x, extractedName: e.target.value } : x
                                ))}
                                className="h-8 text-sm font-medium"
                              />
                              <Badge
                                className="mt-1 flex items-center gap-1 w-fit cursor-pointer bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                onClick={() => inputRefs.current[s.id]?.focus()}
                              >
                                <Sparkles className="h-3 w-3" />
                                AI-suggested type
                              </Badge>
                            </div>
                          ) : (
                            <span className="font-medium text-sm">{s.extractedName}</span>
                          )}
                          {s.status === 'approved' && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <Check className="h-3 w-3 mr-1" />Approved
                            </Badge>
                          )}
                          {s.status === 'dismissed' && (
                            <Badge variant="secondary">Dismissed</Badge>
                          )}
                        </div>
                        {s.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Select
                              value={s.categoryId}
                              onValueChange={(val) => {
                                setSuggestions(prev => prev.map(x =>
                                  x.id === s.id ? { ...x, categoryId: val } : x
                                ));
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs w-48">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {(categories || []).map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveSuggestion(s)}
                              disabled={createType.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissSuggestion(s.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setProcessed(false)}>Upload More Samples</Button>
                <Button variant="ghost" size="sm" onClick={reset} className="text-destructive">Clear All</Button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
