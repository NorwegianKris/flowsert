import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ReviewGroup {
  title_normalized: string;
  count: number;
  raw_examples: string[];
  has_worker_selected_type: boolean;
  worker_selected_type_ids: string[];
  example_personnel_names: string[];
}

export interface UnmappedCertificate {
  id: string;
  name: string;
  title_raw: string | null;
  title_normalized: string | null;
  certificate_type_id: string | null;
  personnel_id: string;
  personnel_name: string;
  created_at: string;
}

/**
 * Hook to fetch certificates needing review, grouped by title_normalized.
 * Uses JOIN for performance and excludes null/empty title_normalized.
 */
export function useCertificatesNeedingReview() {
  const { businessId } = useAuth();

  return useQuery({
    queryKey: ["certificates-needing-review", businessId],
    queryFn: async () => {
      if (!businessId) return { groups: [], unmappedBucket: [] };

      // Fetch all certificates needing review with personnel join
      const { data: certificates, error } = await supabase
        .from("certificates")
        .select(`
          id,
          name,
          title_raw,
          title_normalized,
          certificate_type_id,
          personnel_id,
          created_at,
          personnel!inner (
            business_id,
            name
          )
        `)
        .eq("personnel.business_id", businessId)
        .eq("needs_review", true)
        .is("unmapped_by", null);

      if (error) {
        console.error("Error fetching certificates needing review:", error);
        throw error;
      }

      // Separate into main groups and unmapped bucket
      const validCerts: any[] = [];
      const unmappedBucket: UnmappedCertificate[] = [];

      (certificates || []).forEach((cert: any) => {
        const normalized = cert.title_normalized?.trim();
        if (!normalized) {
          unmappedBucket.push({
            id: cert.id,
            name: cert.name,
            title_raw: cert.title_raw,
            title_normalized: cert.title_normalized,
            certificate_type_id: cert.certificate_type_id,
            personnel_id: cert.personnel_id,
            personnel_name: cert.personnel?.name || "Unknown",
            created_at: cert.created_at,
          });
        } else {
          validCerts.push({
            ...cert,
            personnel_name: cert.personnel?.name || "Unknown",
          });
        }
      });

      // Group valid certs by title_normalized
      const groupMap = new Map<string, {
        count: number;
        raw_examples: Set<string>;
        worker_selected_type_ids: Set<string>;
        personnel_names: Set<string>;
      }>();

      validCerts.forEach((cert) => {
        const key = cert.title_normalized;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            count: 0,
            raw_examples: new Set(),
            worker_selected_type_ids: new Set(),
            personnel_names: new Set(),
          });
        }

        const group = groupMap.get(key)!;
        group.count++;
        if (cert.title_raw) group.raw_examples.add(cert.title_raw);
        if (cert.certificate_type_id) group.worker_selected_type_ids.add(cert.certificate_type_id);
        group.personnel_names.add(cert.personnel_name);
      });

      // Convert to array and sort by count descending
      const groups: ReviewGroup[] = Array.from(groupMap.entries())
        .map(([title_normalized, data]) => ({
          title_normalized,
          count: data.count,
          raw_examples: Array.from(data.raw_examples).slice(0, 5),
          has_worker_selected_type: data.worker_selected_type_ids.size > 0,
          worker_selected_type_ids: Array.from(data.worker_selected_type_ids),
          example_personnel_names: Array.from(data.personnel_names).slice(0, 3),
        }))
        .sort((a, b) => b.count - a.count);

      return { groups, unmappedBucket };
    },
    enabled: !!businessId,
  });
}

/**
 * Hook to bulk update certificates by title_normalized.
 */
export function useBulkUpdateCertificates() {
  const queryClient = useQueryClient();
  const { businessId } = useAuth();

  return useMutation({
    mutationFn: async ({
      titleNormalized,
      certificateTypeId,
      limit,
    }: {
      titleNormalized: string;
      certificateTypeId: string;
      limit?: number;
    }) => {
      if (!businessId) throw new Error("No business ID");

      // First, get the certificate IDs to update
      let query = supabase
        .from("certificates")
        .select(`
          id,
          personnel!inner (business_id)
        `)
        .eq("personnel.business_id", businessId)
        .eq("title_normalized", titleNormalized)
        .eq("needs_review", true)
        .is("unmapped_by", null);

      if (limit) {
        query = query.limit(limit);
      }

      const { data: certsToUpdate, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!certsToUpdate || certsToUpdate.length === 0) {
        return { updated: 0 };
      }

      const ids = certsToUpdate.map((c: any) => c.id);

      // Update the certificates
      const { error: updateError } = await supabase
        .from("certificates")
        .update({
          certificate_type_id: certificateTypeId,
          needs_review: false,
        })
        .in("id", ids);

      if (updateError) throw updateError;

      return { updated: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["certificates-needing-review"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success(`Updated ${data.updated} certificate${data.updated !== 1 ? "s" : ""}`);
    },
    onError: (error) => {
      console.error("Bulk update error:", error);
      toast.error("Failed to update certificates");
    },
  });
}

/**
 * Hook to get the count of certificates for a specific normalized title.
 */
export function useCertificateCountByNormalizedTitle(titleNormalized: string | null) {
  const { businessId } = useAuth();

  return useQuery({
    queryKey: ["certificate-count-by-title", businessId, titleNormalized],
    queryFn: async () => {
      if (!businessId || !titleNormalized) return 0;

      const { count, error } = await supabase
        .from("certificates")
        .select(`
          id,
          personnel!inner (business_id)
        `, { count: "exact", head: true })
        .eq("personnel.business_id", businessId)
        .eq("title_normalized", titleNormalized)
        .eq("needs_review", true)
        .is("unmapped_by", null);

      if (error) {
        console.error("Error counting certificates:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!businessId && !!titleNormalized,
  });
}
