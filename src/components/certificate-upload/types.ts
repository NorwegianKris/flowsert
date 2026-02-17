import { ExtractionResult } from '@/types/certificateExtraction';

export interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'complete' | 'error';
  result?: ExtractionResult;
  error?: string;
}

export interface SmartCertificateUploadProps {
  existingCategories: { id: string; name: string }[];
  existingIssuers?: { id: string; name: string }[];
  onExtractionComplete: (result: ExtractionResult, file: File) => void;
  onFileSelected?: (file: File) => void;
  disabled?: boolean;
  maxFiles?: number;
}
