import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface RawTitleGroup {
  title_raw: string;
  count: number;
  personnel_count: number;
}

export interface InputtedType {
  title_normalized: string;
  display_name: string;
  count: number;
  certificate_type_id: string | null;
  is_mapped: boolean;
  mapped_type_name: string | null;
  raw_examples: string[];
  personnel_count: number;
  // Enhanced details
  personnel_names: string[];
  latest_upload_date: string | null;
  sample_expiry_date: string | null;
  sample_file_name: string | null;
  raw_title_groups: RawTitleGroup[];
}

/**
 * Hook to fetch all unique inputted types (title_normalized values) from certificates.
 * Groups certificates by title_normalized and provides mapping status.
 * 
 * Inputted types = unique free-text titles from uploaded certificates
 */
export function useInputtedTypes(options?: { includeMapped?: boolean }) {
  const { businessId } = useAuth();
  const includeMapped = options?.includeMapped ?? false;

  return useQuery({
    queryKey: ["inputted-types", businessId, includeMapped],
    queryFn: async () => {
      if (!businessId) return [];

      // Build query - optionally include mapped certificates
      let query = supabase
        .from("certificates")
        .select(`
          id,
          title_raw,
          title_normalized,
          certificate_type_id,
          personnel_id,
          created_at,
          expiry_date,
          document_url,
          certificate_types ( name ),
          personnel!inner (
            business_id,
            name
          )
        `)
        .eq("personnel.business_id", businessId)
        .is("unmapped_by", null) // Not dismissed by admin
        .not("title_raw", "is", null) // Must have a title_raw (was entered via custom type field)
        .order("created_at", { ascending: false });

      // Only filter for unmapped when not including mapped
      if (!includeMapped) {
        query = query.is("certificate_type_id", null);
      }

      const { data: certificates, error } = await query;

      if (error) {
        console.error("Error fetching inputted types:", error);
        throw error;
      }

      // Group by title_normalized
      const groupMap = new Map<string, {
        count: number;
        raw_examples: Set<string>;
        certificate_type_id: string | null;
        mapped_type_name: string | null;
        has_multiple_types: boolean;
        personnel_ids: Set<string>;
        personnel_names: Set<string>;
        latest_upload_date: string | null;
        sample_expiry_date: string | null;
        sample_file_name: string | null;
        raw_title_counts: Map<string, { count: number; personnel_ids: Set<string> }>;
      }>();

      (certificates || []).forEach((cert: any) => {
        const normalized = cert.title_normalized?.trim();
        if (!normalized) return; // Skip empty/null normalized titles

        const personnelName = cert.personnel?.name || "Unknown";
        const fileName = cert.document_url 
          ? decodeURIComponent(cert.document_url.split('/').pop() || '').replace(/^\d+-/, '')
          : null;
        const mappedTypeName = cert.certificate_types?.name || null;

        if (!groupMap.has(normalized)) {
          groupMap.set(normalized, {
            count: 0,
            raw_examples: new Set(),
            certificate_type_id: cert.certificate_type_id,
            mapped_type_name: mappedTypeName,
            has_multiple_types: false,
            personnel_ids: new Set(),
            personnel_names: new Set(),
            latest_upload_date: cert.created_at,
            sample_expiry_date: cert.expiry_date,
            sample_file_name: fileName,
            raw_title_counts: new Map(),
          });
        }

        const group = groupMap.get(normalized)!;
        group.count++;
        if (cert.title_raw) group.raw_examples.add(cert.title_raw);
        if (cert.personnel_id) group.personnel_ids.add(cert.personnel_id);
        group.personnel_names.add(personnelName);
        
        // Track if there are mixed mappings
        if (cert.certificate_type_id !== group.certificate_type_id) {
          group.has_multiple_types = true;
        }
        
        // Update mapped type name if we have one
        if (mappedTypeName && !group.mapped_type_name) {
          group.mapped_type_name = mappedTypeName;
        }

        // Update latest upload date
        if (cert.created_at && (!group.latest_upload_date || cert.created_at > group.latest_upload_date)) {
          group.latest_upload_date = cert.created_at;
        }

        // Store first expiry date if we don't have one
        if (cert.expiry_date && !group.sample_expiry_date) {
          group.sample_expiry_date = cert.expiry_date;
        }

        // Store first file name if we don't have one
        if (fileName && !group.sample_file_name) {
          group.sample_file_name = fileName;
        }

        // Track raw title counts
        const rawTitle = cert.title_raw || normalized;
        if (!group.raw_title_counts.has(rawTitle)) {
          group.raw_title_counts.set(rawTitle, { count: 0, personnel_ids: new Set() });
        }
        const rawGroup = group.raw_title_counts.get(rawTitle)!;
        rawGroup.count++;
        if (cert.personnel_id) rawGroup.personnel_ids.add(cert.personnel_id);
      });

      // Convert to array
      const inputtedTypes: InputtedType[] = Array.from(groupMap.entries())
        .map(([title_normalized, data]) => ({
          title_normalized,
          display_name: data.raw_examples.size > 0 
            ? Array.from(data.raw_examples)[0] 
            : title_normalized,
          count: data.count,
          certificate_type_id: data.certificate_type_id,
          is_mapped: data.certificate_type_id !== null,
          mapped_type_name: data.mapped_type_name,
          raw_examples: Array.from(data.raw_examples).slice(0, 5),
          personnel_count: data.personnel_ids.size,
          personnel_names: Array.from(data.personnel_names).slice(0, 10),
          latest_upload_date: data.latest_upload_date,
          sample_expiry_date: data.sample_expiry_date,
          sample_file_name: data.sample_file_name,
          raw_title_groups: Array.from(data.raw_title_counts.entries())
            .map(([title_raw, info]) => ({
              title_raw,
              count: info.count,
              personnel_count: info.personnel_ids.size,
            }))
            .sort((a, b) => b.count - a.count),
        }))
        .sort((a, b) => b.count - a.count);

      return inputtedTypes;
    },
    enabled: !!businessId,
  });
}

/**
 * Hook to dismiss/delete an inputted type by marking all its certificates as "unmapped".
 * This removes them from the Inputted Types list without deleting the certificates.
 */
export function useDismissInputtedType() {
  const { businessId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      titleNormalized, 
      reason = "Dismissed by admin" 
    }: { 
      titleNormalized: string; 
      reason?: string;
    }) => {
      if (!businessId) throw new Error("No business ID");

      // Get all certificate IDs with this title_normalized
      const { data: certsToUpdate, error: fetchError } = await supabase
        .from("certificates")
        .select(`
          id,
          personnel!inner (business_id)
        `)
        .eq("personnel.business_id", businessId)
        .eq("title_normalized", titleNormalized)
        .is("certificate_type_id", null)
        .is("unmapped_by", null);

      if (fetchError) throw fetchError;

      if (!certsToUpdate || certsToUpdate.length === 0) {
        return { count: 0 };
      }

      // Mark all as unmapped
      const ids = certsToUpdate.map((c: any) => c.id);
      const { error: updateError } = await supabase
        .from("certificates")
        .update({
          unmapped_by: (await supabase.auth.getUser()).data.user?.id || null,
          unmapped_at: new Date().toISOString(),
          unmapped_reason: reason,
        })
        .in("id", ids);

      if (updateError) throw updateError;

      return { count: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inputted-types"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success(`Dismissed ${data.count} certificate${data.count !== 1 ? "s" : ""}`);
    },
    onError: (error) => {
      console.error("Error dismissing inputted type:", error);
      toast.error("Failed to dismiss inputted type");
    },
  });
}
