import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useNeedsReviewCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, businessId } = useAuth();

  const fetchCount = async () => {
    if (!user || !businessId) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      // Count certificates needing review, scoped to the business via personnel join
      const { count: reviewCount, error } = await supabase
        .from('certificates')
        .select('id, personnel!inner(business_id)', { count: 'exact', head: true })
        .is('certificate_type_id', null)
        .is('unmapped_by', null)
        .not('title_raw', 'is', null)
        .eq('personnel.business_id', businessId);

      if (error) throw error;
      setCount(reviewCount ?? 0);
    } catch (error) {
      console.error('Error fetching needs review count:', error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
  }, [user, businessId]);

  return { count, loading, refetch: fetchCount };
}
