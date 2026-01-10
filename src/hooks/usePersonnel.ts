import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Personnel, Certificate } from '@/types';

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
  nationality: string | null;
  gender: string | null;
  address: string | null;
  postal_code: string | null;
  postal_address: string | null;
  national_id: string | null;
  salary_account_number: string | null;
  language: string | null;
}

interface DbCertificate {
  id: string;
  personnel_id: string;
  name: string;
  date_of_issue: string;
  expiry_date: string | null;
  place_of_issue: string;
  document_url: string | null;
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
      const personnelIds = (personnelData || []).map((p: DbPersonnel) => p.id);
      
      let certificatesData: DbCertificate[] = [];
      if (personnelIds.length > 0) {
        const { data, error: certError } = await supabase
          .from('certificates')
          .select('*')
          .in('personnel_id', personnelIds);

        if (certError) throw certError;
        certificatesData = (data || []) as DbCertificate[];
      }

      // Map to Personnel type with certificates
      const mappedPersonnel: Personnel[] = (personnelData || []).map((p: DbPersonnel) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        location: p.location,
        email: p.email,
        phone: p.phone,
        avatarUrl: p.avatar_url || undefined,
        nationality: p.nationality || undefined,
        gender: p.gender || undefined,
        address: p.address || undefined,
        postalCode: p.postal_code || undefined,
        postalAddress: p.postal_address || undefined,
        nationalId: p.national_id || undefined,
        salaryAccountNumber: p.salary_account_number || undefined,
        language: p.language || undefined,
        certificates: certificatesData
          .filter((c: DbCertificate) => c.personnel_id === p.id)
          .map((c: DbCertificate): Certificate => ({
            id: c.id,
            name: c.name,
            dateOfIssue: c.date_of_issue,
            expiryDate: c.expiry_date,
            placeOfIssue: c.place_of_issue,
            documentUrl: c.document_url || undefined,
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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchWorkerPersonnel = async () => {
      if (!user) {
        setPersonnel(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch the worker's own personnel record (RLS enforces this)
        const { data: personnelData, error: personnelError } = await supabase
          .from('personnel')
          .select('*')
          .maybeSingle();

        if (personnelError) throw personnelError;

        if (!personnelData) {
          setPersonnel(null);
          setLoading(false);
          return;
        }

        const p = personnelData as DbPersonnel;

        // Fetch certificates
        const { data: certificatesData, error: certError } = await supabase
          .from('certificates')
          .select('*')
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
          nationality: p.nationality || undefined,
          gender: p.gender || undefined,
          address: p.address || undefined,
          postalCode: p.postal_code || undefined,
          postalAddress: p.postal_address || undefined,
          nationalId: p.national_id || undefined,
          salaryAccountNumber: p.salary_account_number || undefined,
          language: p.language || undefined,
          certificates: ((certificatesData || []) as DbCertificate[]).map((c): Certificate => ({
            id: c.id,
            name: c.name,
            dateOfIssue: c.date_of_issue,
            expiryDate: c.expiry_date,
            placeOfIssue: c.place_of_issue,
            documentUrl: c.document_url || undefined,
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

    fetchWorkerPersonnel();
  }, [user]);

  return { personnel, loading };
}
