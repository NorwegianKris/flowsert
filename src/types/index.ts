export type CertificateStatus = 'valid' | 'expiring' | 'expired';

export interface Certificate {
  id: string;
  name: string;
  dateOfIssue: string;
  expiryDate: string | null; // null for certificates that don't expire
  placeOfIssue: string;
  issuingAuthority?: string;
  documentUrl?: string;
  category?: string; // Category name from certificate_categories
}

export type PersonnelCategory = 'fixed_employee' | 'freelancer' | 'job_seeker';

export interface Personnel {
  id: string;
  name: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  businessId?: string;
  userId?: string; // The linked auth user ID, null if not yet linked
  category?: PersonnelCategory;
  nationality?: string;
  department?: string;
  gender?: string;
  address?: string;
  postalCode?: string;
  postalAddress?: string;
  nationalId?: string;
  salaryAccountNumber?: string;
  language?: string;
  nextOfKinName?: string;
  nextOfKinRelation?: string;
  nextOfKinPhone?: string;
  isJobSeeker?: boolean;
  bio?: string;
  activated?: boolean; // When true, full document access is enabled and profile counts toward billing
  certificates: Certificate[];
}
