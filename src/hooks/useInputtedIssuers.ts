import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { normalizeCertificateTitle } from "@/lib/certificateNormalization";

export interface IssuerCertificateDetail {
  id: string;
  issuing_authority: string | null;
  personnel_name: string;
  personnel_id: string;
  upload_date: string;
  expiry_date: string | null;
  file_name: string | null;
  document_url: string | null;
}

export interface InputtedIssuer {
  issuer_normalized: string;
  display_name: string;
  count: number;
  issuer_type_id: string | null;
  is_mapped: boolean;
  mapped_type_name: string | null;
  raw_examples: string[];
  personnel_count: number;
  personnel_names: string[];
  latest_upload_date: string | null;
  sample_expiry_date: string | null;
  sample_file_name: string | null;
  certificates: IssuerCertificateDetail[];
}

export function useInputtedIssuers(options?: { includeMapped?: boolean }) {
  const { businessId } = useAuth();
  const includeMapped = options?.includeMapped ?? false;

  return useQuery({
    queryKey: ["inputted-issuers", businessId, includeMapped],
    queryFn: async () => {
      if (!businessId) return [];

      let query = supabase
        .from("certificates")
        .select(`
          id,
          issuing_authority,
          issuer_type_id,
          personnel_id,
          created_at,
          expiry_date,
          document_url,
          issuer_types ( name ),
          personnel!inner (
            business_id,
            name
          )
        `)
        .eq("personnel.business_id", businessId)
        .is("unmapped_by", null)
        .not("issuing_authority", "is", null)
        .order("created_at", { ascending: false });

      if (!includeMapped) {
        query = query.is("issuer_type_id", null);
      }

      const { data: certificates, error } = await query;

      if (error) {
        console.error("Error fetching inputted issuers:", error);
        throw error;
      }

      // Group by normalized issuing_authority
      const groupMap = new Map<string, {
        count: number;
        raw_examples: Set<string>;
        issuer_type_id: string | null;
        mapped_type_name: string | null;
        personnel_ids: Set<string>;
        personnel_names: Set<string>;
        latest_upload_date: string | null;
        sample_expiry_date: string | null;
        sample_file_name: string | null;
        certificates: IssuerCertificateDetail[];
      }>();

      (certificates || []).forEach((cert: any) => {
        const rawIssuer = cert.issuing_authority?.trim();
        if (!rawIssuer) return;

        const normalized = normalizeCertificateTitle(rawIssuer) || rawIssuer.toLowerCase();
        const personnelName = cert.personnel?.name || "Unknown";
        const fileName = cert.document_url
          ? decodeURIComponent(cert.document_url.split('/').pop() || '').replace(/^\d+-/, '')
          : null;
        const mappedTypeName = cert.issuer_types?.name || null;

        if (!groupMap.has(normalized)) {
          groupMap.set(normalized, {
            count: 0,
            raw_examples: new Set(),
            issuer_type_id: cert.issuer_type_id,
            mapped_type_name: mappedTypeName,
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
        if (rawIssuer) group.raw_examples.add(rawIssuer);
        if (cert.personnel_id) group.personnel_ids.add(cert.personnel_id);
        group.personnel_names.add(personnelName);

        if (mappedTypeName && !group.mapped_type_name) {
          group.mapped_type_name = mappedTypeName;
        }

        if (cert.created_at && (!group.latest_upload_date || cert.created_at > group.latest_upload_date)) {
          group.latest_upload_date = cert.created_at;
        }

        if (cert.expiry_date && !group.sample_expiry_date) {
          group.sample_expiry_date = cert.expiry_date;
        }

        if (fileName && !group.sample_file_name) {
          group.sample_file_name = fileName;
        }

        if (group.certificates.length < 10) {
          group.certificates.push({
            id: cert.id,
            issuing_authority: cert.issuing_authority,
            personnel_name: personnelName,
            personnel_id: cert.personnel_id,
            upload_date: cert.created_at,
            expiry_date: cert.expiry_date,
            file_name: fileName,
            document_url: cert.document_url,
          });
        }
      });

      const inputtedIssuers: InputtedIssuer[] = Array.from(groupMap.entries())
        .map(([issuer_normalized, data]) => ({
          issuer_normalized,
          display_name: data.raw_examples.size > 0
            ? Array.from(data.raw_examples)[0]
            : issuer_normalized,
          count: data.count,
          issuer_type_id: data.issuer_type_id,
          is_mapped: data.issuer_type_id !== null,
          mapped_type_name: data.mapped_type_name,
          raw_examples: Array.from(data.raw_examples).slice(0, 5),
          personnel_count: data.personnel_ids.size,
          personnel_names: Array.from(data.personnel_names).slice(0, 10),
          latest_upload_date: data.latest_upload_date,
          sample_expiry_date: data.sample_expiry_date,
          sample_file_name: data.sample_file_name,
          certificates: data.certificates,
        }))
        .sort((a, b) => b.count - a.count);

      return inputtedIssuers;
    },
    enabled: !!businessId,
  });
}

export function useDismissInputtedIssuer() {
  const { businessId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      issuerNormalized,
      reason = "Dismissed by admin",
    }: {
      issuerNormalized: string;
      reason?: string;
    }) => {
      if (!businessId) throw new Error("No business ID");

      // We need to find all certificates matching this normalized issuing_authority
      const { data: allCerts, error: fetchError } = await supabase
        .from("certificates")
        .select(`
          id,
          issuing_authority,
          personnel!inner (business_id)
        `)
        .eq("personnel.business_id", businessId)
        .is("issuer_type_id", null)
        .is("unmapped_by", null)
        .not("issuing_authority", "is", null);

      if (fetchError) throw fetchError;

      // Filter to matching normalized issuers
      const matchingIds = (allCerts || [])
        .filter((c: any) => {
          const raw = c.issuing_authority?.trim();
          if (!raw) return false;
          const normalized = normalizeCertificateTitle(raw) || raw.toLowerCase();
          return normalized === issuerNormalized;
        })
        .map((c: any) => c.id);

      if (matchingIds.length === 0) {
        return { count: 0 };
      }

      const { error: updateError } = await supabase
        .from("certificates")
        .update({
          unmapped_by: (await supabase.auth.getUser()).data.user?.id || null,
          unmapped_at: new Date().toISOString(),
          unmapped_reason: reason,
        })
        .in("id", matchingIds);

      if (updateError) throw updateError;

      return { count: matchingIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inputted-issuers"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success(`Dismissed ${data.count} certificate${data.count !== 1 ? "s" : ""}`);
    },
    onError: (error) => {
      console.error("Error dismissing inputted issuer:", error);
      toast.error("Failed to dismiss inputted issuer");
    },
  });
}
