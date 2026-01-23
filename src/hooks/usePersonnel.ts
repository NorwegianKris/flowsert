import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Personnel, Certificate, PersonnelCategory } from '@/types';

interface DbPersonnel {
  id: string;
  name: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  business_id: string | null;
  user_id: string | null;
  category: string | null;
  nationality: string | null;
  department: string | null;
  gender: string | null;
  address: string | null;
  postal_code: string | null;
  postal_address: string | null;
  national_id: string | null;
  salary_account_number: string | null;
  language: string | null;
  next_of_kin_name: string | null;
  next_of_kin_relation: string | null;
  next_of_kin_phone: string | null;
  is_job_seeker: boolean | null;
  bio: string | null;
  activated: boolean | null;
  last_login_at: string | null;
  updated_at: string | null;
}

interface DbCertificate {
  id: string;
  personnel_id: string;
  name: string;
  date_of_issue: string;
  expiry_date: string | null;
  place_of_issue: string;
  issuing_authority: string | null;
  document_url: string | null;
  category_id: string | null;
  certificate_categories: { name: string } | null;
}

export function usePersonnel() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, businessId } = useAuth();
  const { toast } = useToast();

  const fetchPersonnel = async () => {
    if (!user) {
      setPersonnel([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch personnel (RLS will filter based on role)
      const { data: personnelData, error: personnelError } = await supabase
        .from('personnel')
        .select('*');

      if (personnelError) throw personnelError;

      // Fetch certificates for all accessible personnel
      const personnelIds = ((personnelData || []) as any[]).map((p) => p.id);
      
      let certificatesData: DbCertificate[] = [];
      if (personnelIds.length > 0) {
        const { data, error: certError } = await supabase
          .from('certificates')
          .select('*, certificate_categories(name)')
          .in('personnel_id', personnelIds);

        if (certError) throw certError;
        certificatesData = (data || []) as DbCertificate[];
      }

      // Map to Personnel type with certificates
      const mappedPersonnel: Personnel[] = ((personnelData || []) as any[]).map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        location: p.location,
        email: p.email,
        phone: p.phone,
        avatarUrl: p.avatar_url || undefined,
        businessId: p.business_id || undefined,
        userId: p.user_id || undefined,
        category: (p.category as PersonnelCategory) || undefined,
        nationality: p.nationality || undefined,
        department: p.department || undefined,
        gender: p.gender || undefined,
        address: p.address || undefined,
        postalCode: p.postal_code || undefined,
        postalAddress: p.postal_address || undefined,
        nationalId: p.national_id || undefined,
        salaryAccountNumber: p.salary_account_number || undefined,
        language: p.language || undefined,
        nextOfKinName: p.next_of_kin_name || undefined,
        nextOfKinRelation: p.next_of_kin_relation || undefined,
        nextOfKinPhone: p.next_of_kin_phone || undefined,
        isJobSeeker: p.is_job_seeker || false,
        bio: p.bio || undefined,
        activated: p.activated || false,
        lastLoginAt: p.last_login_at || undefined,
        updatedAt: p.updated_at || undefined,
        certificates: certificatesData
          .filter((c: DbCertificate) => c.personnel_id === p.id)
          .map((c: DbCertificate): Certificate => ({
            id: c.id,
            name: c.name,
            dateOfIssue: c.date_of_issue,
            expiryDate: c.expiry_date,
            placeOfIssue: c.place_of_issue,
            issuingAuthority: c.issuing_authority || undefined,
            documentUrl: c.document_url || undefined,
            category: c.certificate_categories?.name || undefined,
          })),
      }));

      setPersonnel(mappedPersonnel);
    } catch (error) {
      console.error('Error fetching personnel:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load personnel data',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonnel();
  }, [user, businessId]);

  return { personnel, loading, refetch: fetchPersonnel };
}

export function useWorkerPersonnel() {
  const [personnel, setPersonnel] = useState<Personnel | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();
  const { toast } = useToast();

  const fetchWorkerPersonnel = async () => {
    // Skip if no user OR if user is not a worker
    if (!user || role !== 'worker') {
      setPersonnel(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch the worker's own personnel record by user_id
      const { data: personnelData, error: personnelError } = await supabase
        .from('personnel')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (personnelError) throw personnelError;

      if (!personnelData) {
        setPersonnel(null);
        setLoading(false);
        return;
      }

      const p = personnelData as any;

      // Fetch certificates with category
      const { data: certificatesData, error: certError } = await supabase
        .from('certificates')
        .select('*, certificate_categories(name)')
        .eq('personnel_id', p.id);

      if (certError) throw certError;

      const mapped: Personnel = {
        id: p.id,
        name: p.name,
        role: p.role,
        location: p.location,
        email: p.email,
        phone: p.phone,
        avatarUrl: p.avatar_url || undefined,
        businessId: p.business_id || undefined,
        userId: p.user_id || undefined,
        category: (p.category as PersonnelCategory) || undefined,
        nationality: p.nationality || undefined,
        department: p.department || undefined,
        gender: p.gender || undefined,
        address: p.address || undefined,
        postalCode: p.postal_code || undefined,
        postalAddress: p.postal_address || undefined,
        nationalId: p.national_id || undefined,
        salaryAccountNumber: p.salary_account_number || undefined,
        language: p.language || undefined,
        nextOfKinName: p.next_of_kin_name || undefined,
        nextOfKinRelation: p.next_of_kin_relation || undefined,
        nextOfKinPhone: p.next_of_kin_phone || undefined,
        isJobSeeker: p.is_job_seeker || false,
        bio: p.bio || undefined,
        activated: p.activated || false,
        lastLoginAt: p.last_login_at || undefined,
        updatedAt: p.updated_at || undefined,
        certificates: ((certificatesData || []) as DbCertificate[]).map((c): Certificate => ({
          id: c.id,
          name: c.name,
          dateOfIssue: c.date_of_issue,
          expiryDate: c.expiry_date,
          placeOfIssue: c.place_of_issue,
          issuingAuthority: c.issuing_authority || undefined,
          documentUrl: c.document_url || undefined,
          category: c.certificate_categories?.name || undefined,
        })),
      };

      setPersonnel(mapped);
    } catch (error) {
      console.error('Error fetching worker personnel:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load your profile',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkerPersonnel();
  }, [user]);

  return { personnel, loading, refetch: fetchWorkerPersonnel };
}
