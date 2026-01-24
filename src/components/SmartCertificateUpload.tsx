import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Sparkles,
  FileText,
  X,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fileToBase64Image } from '@/lib/pdfUtils';
import { 
  ExtractionResult, 
  ExtractionStatus,
  isOcrSupported,
  getFileTypeStatus 
} from '@/types/certificateExtraction';
import { cn } from '@/lib/utils';

interface SmartCertificateUploadProps {
  existingCategories: { id: string; name: string }[];
  onExtractionComplete: (result: ExtractionResult, file: File) => void;
  onFileSelected?: (file: File) => void;
  disabled?: boolean;
}

export function SmartCertificateUpload({
  existingCategories,
  onExtractionComplete,
  onFileSelected,
  disabled = false,
}: SmartCertificateUploadProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setExtractionResult(null);
    onFileSelected?.(file);

    const fileTypeStatus = getFileTypeStatus(file.type);

    if (fileTypeStatus === 'unsupported') {
      // For unsupported files, immediately return red status
      const result: ExtractionResult = {
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
        },
        fieldsExtracted: 0,
        issues: [`File type "${file.type || 'unknown'}" cannot be scanned. Please upload a PDF or image file, or enter details manually.`],
      };
      setExtractionResult(result);
      onExtractionComplete(result, file);
      return;
    }

    // Start OCR extraction
    setIsAnalyzing(true);

    try {
      // Convert file to base64
      const { base64, mimeType } = await fileToBase64Image(file);

      // Call the extraction edge function
      const { data, error } = await supabase.functions.invoke('extract-certificate-data', {
        body: {
          imageBase64: base64,
          mimeType,
          existingCategories: existingCategories.map(c => c.name),
        },
      });

      if (error) throw error;

      // Find matched category ID if there's a match
      let matchedCategoryId: string | null = null;
      if (data.extractedData?.matchedCategory) {
        const matched = existingCategories.find(
          c => c.name.toLowerCase() === data.extractedData.matchedCategory.toLowerCase()
        );
        matchedCategoryId = matched?.id || null;
      }

      const result: ExtractionResult = {
        ...data,
        extractedData: {
          ...data.extractedData,
          matchedCategoryId,
        },
      };

      setExtractionResult(result);
      onExtractionComplete(result, file);

      // Show toast based on status
      if (result.status === 'green') {
        toast.success('Certificate details extracted successfully!');
      } else if (result.status === 'amber') {
        toast.warning('Partial extraction - please verify the details');
      } else {
        toast.error('Could not extract details - manual entry required');
      }

    } catch (error) {
      console.error('Extraction error:', error);
      
      const result: ExtractionResult = {
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
        },
        fieldsExtracted: 0,
        issues: ['Failed to analyze document. Please try again or enter details manually.'],
      };
      setExtractionResult(result);
      onExtractionComplete(result, file);
      toast.error('Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  }, [existingCategories, onExtractionComplete, onFileSelected]);

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
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRetry = () => {
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setExtractionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = (status: ExtractionStatus) => {
    switch (status) {
      case 'green':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'amber':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'red':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBgClass = (status: ExtractionStatus) => {
    switch (status) {
      case 'green':
        return 'bg-green-500/10 border-green-500/30';
      case 'amber':
        return 'bg-amber-500/10 border-amber-500/30';
      case 'red':
        return 'bg-red-500/10 border-red-500/30';
    }
  };

  const getStatusMessage = (status: ExtractionStatus, confidence: number) => {
    switch (status) {
      case 'green':
        return `Successfully extracted (${confidence}% confidence)`;
      case 'amber':
        return `Partially extracted (${confidence}% confidence) - Please verify`;
      case 'red':
        return 'Could not extract - Manual entry required';
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      {!selectedFile && !isAnalyzing && (
        <div
          className={cn(
            "relative p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer",
            dragActive 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 bg-muted/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled}
          />
          <div className="text-center">
            <Sparkles className="h-8 w-8 mx-auto text-primary mb-2" />
            <h3 className="font-medium text-foreground">Smart Upload</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your certificate and we'll extract the details automatically
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports PDF, JPEG, PNG, WebP • Drag & drop or click to browse
            </p>
          </div>
        </div>
      )}

      {/* Analyzing state */}
      {isAnalyzing && (
        <div className="p-6 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div>
              <p className="font-medium">Analyzing certificate...</p>
              <p className="text-sm text-muted-foreground">
                Reading {selectedFile?.name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Result display */}
      {extractionResult && !isAnalyzing && selectedFile && (
        <div className={cn(
          "p-4 border rounded-lg",
          getStatusBgClass(extractionResult.status)
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {getStatusIcon(extractionResult.status)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {getStatusMessage(extractionResult.status, extractionResult.confidence)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {selectedFile.name}
                  </span>
                </div>
                {extractionResult.issues.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {extractionResult.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRetry}
                title="Re-scan document"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClear}
                title="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
