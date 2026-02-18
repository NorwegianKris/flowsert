import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WorkerBusiness {
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
  personnelId: string;
  personnelName: string;
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
          .select('id, name, business_id')
          .eq('user_id', user.id);

        if (personnelError) throw personnelError;

        // Extract unique business IDs
        const personnelWithBusiness = (personnelData || []).filter(
          (p): p is typeof p & { business_id: string } => p.business_id !== null
        );

        if (personnelWithBusiness.length === 0) {
          setBusinesses([]);
          setLoading(false);
          return;
        }

        const businessIds = [...new Set(personnelWithBusiness.map(p => p.business_id))];

        // Fetch business details - RLS enforces access
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, logo_url')
          .in('id', businessIds);

        if (businessError) throw businessError;

        const businessMap = new Map(
          (businessData || []).map(b => [b.id, b])
        );

        // Map personnel to WorkerBusiness entries
        const result: WorkerBusiness[] = personnelWithBusiness
          .map(p => {
            const biz = businessMap.get(p.business_id);
            if (!biz) return null;
            return {
              businessId: biz.id,
              businessName: biz.name,
              businessLogoUrl: biz.logo_url,
              personnelId: p.id,
              personnelName: p.name,
            };
          })
          .filter((x): x is WorkerBusiness => x !== null);

        setBusinesses(result);
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
