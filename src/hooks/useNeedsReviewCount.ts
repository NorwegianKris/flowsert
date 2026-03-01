import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useNeedsReviewCount() {
  const { user, businessId } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['needs-review-count', businessId],
    queryFn: async () => {
      if (!user || !businessId) return 0;

      const { count: reviewCount, error } = await supabase
        .from('certificates')
        .select('id, personnel!inner(business_id)', { count: 'exact', head: true })
        .is('certificate_type_id', null)
        .is('unmapped_by', null)
        .not('title_raw', 'is', null)
        .eq('personnel.business_id', businessId);

      if (error) {
        console.error('Error fetching needs review count:', error);
        return 0;
      }
      return reviewCount ?? 0;
    },
    enabled: !!user && !!businessId,
  });

  return { count: data ?? 0, loading: isLoading, refetch };
}
