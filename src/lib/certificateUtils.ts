import { Certificate, CertificateStatus, Personnel } from '@/types';
import { differenceInDays, parseISO } from 'date-fns';

const EXPIRY_WARNING_DAYS = 60; // Days before expiry to show warning

export function getCertificateStatus(expiryDate: string | null): CertificateStatus {
  if (!expiryDate) return 'valid'; // Certificates without expiry are always valid
  
  const today = new Date();
  const expiry = parseISO(expiryDate);
  const daysUntilExpiry = differenceInDays(expiry, today);
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) return 'expiring';
  return 'valid';
}

export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = parseISO(expiryDate);
  return differenceInDays(expiry, today);
}

export function getPersonnelOverallStatus(personnel: Personnel): CertificateStatus {
  const statuses = personnel.certificates.map((cert) =>
    getCertificateStatus(cert.expiryDate)
  );
  
  if (statuses.includes('expired')) return 'expired';
  if (statuses.includes('expiring')) return 'expiring';
  return 'valid';
}

export function countCertificatesByStatus(
  certificates: Certificate[]
): Record<CertificateStatus, number> {
  return certificates.reduce(
    (acc, cert) => {
      const status = getCertificateStatus(cert.expiryDate);
      acc[status]++;
      return acc;
    },
    { valid: 0, expiring: 0, expired: 0 }
  );
}

export function formatExpiryText(daysUntilExpiry: number | null): string {
  if (daysUntilExpiry === null) return 'No expiry';
  if (daysUntilExpiry < 0) return `Expired ${Math.abs(daysUntilExpiry)} days ago`;
  if (daysUntilExpiry === 0) return 'Expires today';
  if (daysUntilExpiry === 1) return 'Expires tomorrow';
  return `Expires in ${daysUntilExpiry} days`;
}
