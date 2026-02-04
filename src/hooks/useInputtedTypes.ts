import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CertificateDetail {
  id: string;
  title_raw: string | null;
  personnel_name: string;
  personnel_id: string;
  upload_date: string;
  expiry_date: string | null;
  file_name: string | null;
  document_url: string | null;
}

export interface InputtedType {
  title_normalized: string;
  display_name: string;
  count: number;
  certificate_type_id: string | null;
  is_mapped: boolean;
  raw_examples: string[];
  personnel_count: number;
  // Enhanced details
  personnel_names: string[];
  latest_upload_date: string | null;
  sample_expiry_date: string | null;
  sample_file_name: string | null;
  certificates: CertificateDetail[];
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

      // Fetch only certificates that were entered via free text (certificate_type_id is null)
      // and have not been marked as "unmapped" by an admin
      const { data: certificates, error } = await supabase
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
          personnel!inner (
            business_id,
            name
          )
        `)
        .eq("personnel.business_id", businessId)
        .is("certificate_type_id", null) // Only show custom-entered types (not mapped to official type)
        .is("unmapped_by", null) // Not dismissed by admin
        .not("title_raw", "is", null) // Must have a title_raw (was entered via custom type field)
        .order("created_at", { ascending: false });

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
        personnel_names: Set<string>;
        latest_upload_date: string | null;
        sample_expiry_date: string | null;
        sample_file_name: string | null;
        certificates: CertificateDetail[];
      }>();

      (certificates || []).forEach((cert: any) => {
        const normalized = cert.title_normalized?.trim();
        if (!normalized) return; // Skip empty/null normalized titles

        const personnelName = cert.personnel?.name || "Unknown";
        const fileName = cert.document_url 
          ? decodeURIComponent(cert.document_url.split('/').pop() || '').replace(/^\d+-/, '')
          : null;

        if (!groupMap.has(normalized)) {
          groupMap.set(normalized, {
            count: 0,
            raw_examples: new Set(),
            certificate_type_id: cert.certificate_type_id,
            has_multiple_types: false,
            personnel_ids: new Set(),
            personnel_names: new Set(),
            latest_upload_date: cert.created_at,
            sample_expiry_date: cert.expiry_date,
            sample_file_name: fileName,
            certificates: [],
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

        // Add certificate details (limit to first 10 for performance)
        if (group.certificates.length < 10) {
          group.certificates.push({
            id: cert.id,
            title_raw: cert.title_raw,
            personnel_name: personnelName,
            personnel_id: cert.personnel_id,
            upload_date: cert.created_at,
            expiry_date: cert.expiry_date,
            file_name: fileName,
            document_url: cert.document_url,
          });
        }
      });

      // Convert to array - all items are unmapped since we filtered for certificate_type_id IS NULL
      const inputtedTypes: InputtedType[] = Array.from(groupMap.entries())
        .map(([title_normalized, data]) => ({
          title_normalized,
          display_name: data.raw_examples.size > 0 
            ? Array.from(data.raw_examples)[0] 
            : title_normalized,
          count: data.count,
          certificate_type_id: null, // Always null since we only fetch unmapped
          is_mapped: false, // Always false since we only fetch unmapped
          raw_examples: Array.from(data.raw_examples).slice(0, 5),
          personnel_count: data.personnel_ids.size,
          personnel_names: Array.from(data.personnel_names).slice(0, 10),
          latest_upload_date: data.latest_upload_date,
          sample_expiry_date: data.sample_expiry_date,
          sample_file_name: data.sample_file_name,
          certificates: data.certificates,
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
