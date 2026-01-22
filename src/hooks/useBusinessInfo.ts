import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BusinessInfo {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  org_number: string | null;
  description: string | null;
  postal_address: string | null;
  postal_code: string | null;
  company_code: string;
  custom_domain: string | null;
}

export function useBusinessInfo() {
  const { businessId } = useAuth();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusiness = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      setBusiness(data as unknown as BusinessInfo);
    } catch (error) {
      console.error('Error fetching business info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, [businessId]);

  return { business, loading, refetch: fetchBusiness };
}
