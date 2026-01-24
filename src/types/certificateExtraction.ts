// Types for OCR certificate extraction with traffic light system

export type ExtractionStatus = 'green' | 'amber' | 'red';

export interface ExtractedCertificateData {
  certificateName: string | null;
  dateOfIssue: string | null;      // YYYY-MM-DD format
  expiryDate: string | null;       // YYYY-MM-DD format
  placeOfIssue: string | null;
  issuingAuthority: string | null;
  matchedCategory: string | null;  // Matched category name if found
  matchedCategoryId: string | null; // Matched category ID if found
}

export interface ExtractionResult {
  status: ExtractionStatus;
  confidence: number;              // 0-100
  extractedData: ExtractedCertificateData;
  fieldsExtracted: number;         // Count of successfully extracted fields
  issues: string[];                // e.g., ["Could not read expiry date", "Image quality low"]
}

export interface FieldExtractionStatus {
  value: string;
  confidence: 'high' | 'medium' | 'low';
  wasExtracted: boolean;
}

// Supported file types for OCR
export const OCR_SUPPORTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const OCR_PARTIALLY_SUPPORTED_TYPES = [
  'image/heic',
  'image/heif',
] as const;

export function isOcrSupported(mimeType: string): boolean {
  return OCR_SUPPORTED_TYPES.includes(mimeType as any);
}

export function isPartiallySupported(mimeType: string): boolean {
  return OCR_PARTIALLY_SUPPORTED_TYPES.includes(mimeType as any);
}

export function getFileTypeStatus(mimeType: string): 'supported' | 'partial' | 'unsupported' {
  if (isOcrSupported(mimeType)) return 'supported';
  if (isPartiallySupported(mimeType)) return 'partial';
  return 'unsupported';
}
