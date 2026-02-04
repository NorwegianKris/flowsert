import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface InputtedType {
  title_normalized: string;
  display_name: string;
  count: number;
  certificate_type_id: string | null;
  is_mapped: boolean;
  raw_examples: string[];
  personnel_count: number;
}

/**
 * Hook to fetch all unique inputted types (title_normalized values) from certificates.
 * Groups certificates by title_normalized and provides mapping status.
 * 
 * Inputted types = unique free-text titles from uploaded certificates
 */
export function useInputtedTypes() {
  const { businessId } = useAuth();

  return useQuery({
    queryKey: ["inputted-types", businessId],
    queryFn: async () => {
      if (!businessId) return [];

      // Fetch all certificates with their title_normalized
      const { data: certificates, error } = await supabase
        .from("certificates")
        .select(`
          id,
          title_raw,
          title_normalized,
          certificate_type_id,
          personnel_id,
          personnel!inner (
            business_id
          )
        `)
        .eq("personnel.business_id", businessId)
        .is("unmapped_by", null);

      if (error) {
        console.error("Error fetching inputted types:", error);
        throw error;
      }

      // Group by title_normalized
      const groupMap = new Map<string, {
        count: number;
        raw_examples: Set<string>;
        certificate_type_id: string | null;
        has_multiple_types: boolean;
        personnel_ids: Set<string>;
      }>();

      (certificates || []).forEach((cert: any) => {
        const normalized = cert.title_normalized?.trim();
        if (!normalized) return; // Skip empty/null normalized titles

        if (!groupMap.has(normalized)) {
          groupMap.set(normalized, {
            count: 0,
            raw_examples: new Set(),
            certificate_type_id: cert.certificate_type_id,
            has_multiple_types: false,
            personnel_ids: new Set(),
          });
        }

        const group = groupMap.get(normalized)!;
        group.count++;
        if (cert.title_raw) group.raw_examples.add(cert.title_raw);
        if (cert.personnel_id) group.personnel_ids.add(cert.personnel_id);
        
        // Track if there are mixed mappings
        if (cert.certificate_type_id !== group.certificate_type_id) {
          group.has_multiple_types = true;
        }
      });

      // Convert to array
      const inputtedTypes: InputtedType[] = Array.from(groupMap.entries())
        .map(([title_normalized, data]) => ({
          title_normalized,
          display_name: data.raw_examples.size > 0 
            ? Array.from(data.raw_examples)[0] 
            : title_normalized,
          count: data.count,
          certificate_type_id: data.has_multiple_types ? null : data.certificate_type_id,
          is_mapped: !data.has_multiple_types && data.certificate_type_id !== null,
          raw_examples: Array.from(data.raw_examples).slice(0, 5),
          personnel_count: data.personnel_ids.size,
        }))
        .sort((a, b) => b.count - a.count);

      return inputtedTypes;
    },
    enabled: !!businessId,
  });
}
