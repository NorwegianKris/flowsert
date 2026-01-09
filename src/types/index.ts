export type CertificateStatus = 'valid' | 'expiring' | 'expired';

export interface Certificate {
  id: string;
  name: string;
  dateOfIssue: string;
  expiryDate: string | null; // null for certificates that don't expire
  placeOfIssue: string;
  documentUrl?: string;
}

export interface Personnel {
  id: string;
  name: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  certificates: Certificate[];
}
