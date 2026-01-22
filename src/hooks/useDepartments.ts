import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export function useDepartments() {
  const { businessId } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase
        .from('departments' as any)
        .select('id, name, created_at')
        .eq('business_id', businessId)
        .order('name') as any);

      if (error) throw error;
      setDepartments((data as Department[]) || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [businessId]);

  return { departments, loading, refetch: fetchDepartments };
}
