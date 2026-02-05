import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CertificateCategory {
  id: string;
  name: string;
  created_at: string;
}

export function useCertificateCategories() {
  const { businessId } = useAuth();
  const [categories, setCategories] = useState<CertificateCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('certificate_categories')
        .select('id, name, created_at')
        .eq('business_id', businessId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching certificate categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [businessId]);

  return { categories, loading, refetch: fetchCategories };
}
