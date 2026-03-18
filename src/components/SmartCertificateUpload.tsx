import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fileToBase64Image } from '@/lib/pdfUtils';
import { 
  ExtractionResult, 
  getFileTypeStatus 
} from '@/types/certificateExtraction';
import { QueuedFile, SmartCertificateUploadProps } from './certificate-upload/types';
import { UploadZone } from './certificate-upload/UploadZone';
import { ProcessingQueue } from './certificate-upload/ProcessingQueue';

const DELAY_BETWEEN_CALLS_MS = 500;

export function SmartCertificateUpload({
  existingCategories,
  existingIssuers,
  onExtractionComplete,
  onFileSelected,
  disabled = false,
  maxFiles = 10,
  businessId,
}: SmartCertificateUploadProps) {
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const processingRef = useRef(false);

  // Generate unique ID for queue items
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Process a single file through the extraction API
  const processFile = useCallback(async (file: File): Promise<ExtractionResult> => {
    // Pre-flight OCR allowance check
    if (businessId) {
      try {
        const { data: allowance, error: allowanceError } = await supabase.rpc('check_ai_allowance', {
          p_business_id: businessId,
          p_event_type: 'ocr',
        });
        if (allowanceError) {
          console.error('OCR allowance check failed:', allowanceError);
          return {
            status: 'red',
            confidence: 0,
            extractedData: {
              certificateName: null, dateOfIssue: null, expiryDate: null,
              placeOfIssue: null, issuingAuthority: null, matchedCategory: null,
              matchedCategoryId: null, matchedIssuer: null, matchedIssuerId: null,
              suggestedTypeName: null, classificationConfidence: 0,
            },
            fieldsExtracted: 0,
            issues: ['Unable to verify your OCR allowance. Please try again later.'],
          };
        }
        if (allowance && !(allowance as any).allowed) {
          return {
            status: 'red',
            confidence: 0,
            extractedData: {
              certificateName: null, dateOfIssue: null, expiryDate: null,
              placeOfIssue: null, issuingAuthority: null, matchedCategory: null,
              matchedCategoryId: null, matchedIssuer: null, matchedIssuerId: null,
              suggestedTypeName: null, classificationConfidence: 0,
            },
            fieldsExtracted: 0,
            issues: ['You have reached your OCR limit for this plan. Upgrade to continue using Smart Upload.'],
          };
        }
      } catch (err) {
        console.error('OCR allowance pre-check error:', err);
        return {
          status: 'red',
          confidence: 0,
          extractedData: {
            certificateName: null, dateOfIssue: null, expiryDate: null,
            placeOfIssue: null, issuingAuthority: null, matchedCategory: null,
            matchedCategoryId: null, matchedIssuer: null, matchedIssuerId: null,
            suggestedTypeName: null, classificationConfidence: 0,
          },
          fieldsExtracted: 0,
          issues: ['Unable to verify your OCR allowance. Please try again later.'],
        };
      }
    }

    const fileTypeStatus = getFileTypeStatus(file.type);

    if (fileTypeStatus === 'unsupported') {
      return {
        status: 'red',
        confidence: 0,
        extractedData: {
          certificateName: null,
          dateOfIssue: null,
          expiryDate: null,
          placeOfIssue: null,
          issuingAuthority: null,
          matchedCategory: null,
          matchedCategoryId: null,
          matchedIssuer: null,
          matchedIssuerId: null,
          suggestedTypeName: null,
          classificationConfidence: 0,
        },
        fieldsExtracted: 0,
        issues: [`File type "${file.type || 'unknown'}" cannot be scanned. Please enter details manually.`],
      };
    }

    const { base64, mimeType } = await fileToBase64Image(file);

    const { data, error } = await supabase.functions.invoke('extract-certificate-data', {
      body: {
        imageBase64: base64,
        mimeType,
        existingCategories: existingCategories.map(c => c.name),
        existingIssuers: existingIssuers?.map(i => i.name) || [],
      },
    });

    if (error) {
      // Check for monthly cap reached (edge function returns 429 with error field)
      if (data?.error === 'monthly_cap_reached') {
        toast.error("You've reached your monthly OCR limit. Upgrade your plan to continue.");
        throw new Error('monthly_cap_reached');
      }
      throw error;
    }

    // Check 80% usage warning
    if (data.usage_remaining) {
      const { used, cap } = data.usage_remaining;
      if (cap > 0 && used / cap >= 0.8) {
        const pct = Math.round((used / cap) * 100);
        toast.warning(`You've used ${pct}% of your monthly OCR allowance. Upgrade your plan to avoid interruption.`);
      }
    }

    // Find matched category ID if there's a match
    let matchedCategoryId: string | null = null;
    if (data.extractedData?.matchedCategory) {
      const matched = existingCategories.find(
        c => c.name.toLowerCase() === data.extractedData.matchedCategory.toLowerCase()
      );
      matchedCategoryId = matched?.id || null;
    }

    // Find matched issuer ID if there's a match
    let matchedIssuerId: string | null = null;
    if (data.extractedData?.matchedIssuer && existingIssuers) {
      const matched = existingIssuers.find(
        i => i.name.toLowerCase() === data.extractedData.matchedIssuer.toLowerCase()
      );
      if (matched) {
        matchedIssuerId = matched.id;
      } else if (businessId && data.extractedData.issuingAuthority) {
        // Fuzzy dedup — prevent near-duplicate issuers
        const fuzzyMatch = existingIssuers.find(i => {
          const a = i.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const b = data.extractedData.issuingAuthority.toLowerCase().replace(/[^a-z0-9]/g, '');
          return a === b || a.includes(b) || b.includes(a);
        });
        if (fuzzyMatch) {
          matchedIssuerId = fuzzyMatch.id;
        } else {
          // genuinely new — auto-create (silent failure)
          try {
            const { data: newIssuer, error } = await supabase
              .from('issuer_types')
              .insert({
                name: data.extractedData.issuingAuthority,
                business_id: businessId,
              })
              .select('id')
              .single();
            if (!error) matchedIssuerId = newIssuer?.id || null;
          } catch {
            matchedIssuerId = null;
          }
        }
      }
    }

    return {
      ...data,
      extractedData: {
        ...data.extractedData,
        matchedCategoryId,
        matchedIssuerId,
      },
    };
  }, [existingCategories, existingIssuers, businessId]);

  // Process the queue sequentially
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessingQueue(true);

    const pendingItems = fileQueue.filter(f => f.status === 'pending');
    
    for (const item of pendingItems) {
      // Update status to processing
      setFileQueue(prev => prev.map(f => 
        f.id === item.id ? { ...f, status: 'processing' as const } : f
      ));

      try {
        const result = await processFile(item.file);
        
        setFileQueue(prev => prev.map(f =>
          f.id === item.id 
            ? { ...f, status: 'complete' as const, result } 
            : f
        ));

        // Notify parent of extraction
        onExtractionComplete(result, item.file);

        // Show toast based on status
        if (result.status === 'green') {
          toast.success(`Extracted: ${item.file.name}`);
        } else if (result.status === 'amber') {
          toast.warning(`Partial extraction: ${item.file.name}`);
        }
        // Don't toast on red - the UI shows it clearly

      } catch (error) {
        console.error('Extraction error:', error);
        
        setFileQueue(prev => prev.map(f =>
          f.id === item.id 
            ? { ...f, status: 'error' as const, error: 'Failed to analyze' } 
            : f
        ));
      }

      // Add delay between API calls to avoid rate limits
      if (pendingItems.indexOf(item) < pendingItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
      }
    }

    setIsProcessingQueue(false);
    processingRef.current = false;
  }, [fileQueue, processFile, onExtractionComplete]);

  // Start processing when new pending items are added
  useEffect(() => {
    const hasPending = fileQueue.some(f => f.status === 'pending');
    if (hasPending && !isProcessingQueue) {
      processQueue();
    }
  }, [fileQueue, isProcessingQueue, processQueue]);

  // Handle file selection (from input or drop)
  const handleFilesSelected = useCallback((files: FileList) => {
    const currentCount = fileQueue.length;
    const maxAllowed = maxFiles - currentCount;

    if (files.length > maxAllowed) {
      if (maxAllowed <= 0) {
        toast.warning(`Maximum of ${maxFiles} files reached.`);
        return;
      }
      toast.warning(`You can add up to ${maxAllowed} more file(s). Max is ${maxFiles}.`);
    }

    const filesToAdd = Array.from(files).slice(0, Math.max(0, maxAllowed));
    
    if (filesToAdd.length === 0) return;

    const newQueueItems: QueuedFile[] = filesToAdd.map(file => ({
      id: generateId(),
      file,
      status: 'pending' as const,
    }));

    setFileQueue(prev => [...prev, ...newQueueItems]);

    // Notify parent about file selections
    filesToAdd.forEach(file => onFileSelected?.(file));
  }, [fileQueue.length, maxFiles, onFileSelected]);

  // Drag handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesSelected(files);
    }
  }, [handleFilesSelected]);

  // Queue actions
  const handleRetry = useCallback((id: string) => {
    setFileQueue(prev => prev.map(f =>
      f.id === id ? { ...f, status: 'pending' as const, error: undefined, result: undefined } : f
    ));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setFileQueue(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setFileQueue([]);
  }, []);

  return (
    <div className="space-y-3">
      {/* Upload zone (full or compact based on state) */}
      <UploadZone
        onFilesSelected={handleFilesSelected}
        disabled={disabled}
        dragActive={dragActive}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        hasFiles={fileQueue.length > 0}
        maxFiles={maxFiles}
        currentCount={fileQueue.length}
      />

      {/* Processing queue */}
      <ProcessingQueue
        queue={fileQueue}
        isProcessing={isProcessingQueue}
        onRetry={handleRetry}
        onRemove={handleRemove}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
