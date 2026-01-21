import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WorkerCategory {
  id: string;
  name: string;
  created_at: string;
}

export function useWorkerCategories() {
  const { businessId } = useAuth();
  const [categories, setCategories] = useState<WorkerCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      // Use type assertion since worker_categories table was just added
      const { data, error } = await (supabase
        .from('worker_categories' as any)
        .select('id, name, created_at')
        .eq('business_id', businessId)
        .order('name') as any);

      if (error) throw error;
      setCategories((data as WorkerCategory[]) || []);
    } catch (error) {
      console.error('Error fetching worker categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [businessId]);

  return { categories, loading, refetch: fetchCategories };
}
