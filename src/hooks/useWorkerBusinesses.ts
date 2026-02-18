import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WorkerBusiness {
  id: string;
  name: string;
  logo_url: string | null;
}

export function useWorkerBusinesses() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<WorkerBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBusinesses([]);
      setLoading(false);
      return;
    }

    const fetchBusinesses = async () => {
      try {
        // Get all personnel records for this user
        const { data: personnelData, error: personnelError } = await supabase
          .from('personnel')
          .select('business_id')
          .eq('user_id', user.id);

        if (personnelError) throw personnelError;

        // Extract unique business IDs
        const businessIds = [...new Set(
          (personnelData || [])
            .map(p => p.business_id)
            .filter((id): id is string => id !== null)
        )];

        if (businessIds.length === 0) {
          setBusinesses([]);
          setLoading(false);
          return;
        }

        // Fetch business details - RLS enforces access
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, logo_url')
          .in('id', businessIds);

        if (businessError) throw businessError;

        setBusinesses(businessData || []);
      } catch (error) {
        console.error('Error fetching worker businesses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, [user]);

  return { businesses, loading };
}
