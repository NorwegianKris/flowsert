import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { normalizeCertificateTitle } from "@/lib/certificateNormalization";

export interface IssuerAlias {
  id: string;
  business_id: string;
  alias_normalized: string;
  alias_raw_example: string | null;
  issuer_type_id: string;
  confidence: number;
  created_by: "system" | "admin";
  last_seen_at: string;
  created_at: string;
  issuer_type_name?: string;
}

export interface CreateIssuerAliasInput {
  aliasRaw: string;
  issuerTypeId: string;
}

/**
 * Hook to look up an issuer alias by normalized title.
 */
export function useLookupIssuerAlias(rawIssuer: string | null) {
  const { businessId } = useAuth();
  const normalizedTitle = rawIssuer ? normalizeCertificateTitle(rawIssuer) : null;

  return useQuery({
    queryKey: ["issuer-alias-lookup", businessId, normalizedTitle],
    queryFn: async () => {
      if (!businessId || !normalizedTitle) return null;

      const { data, error } = await supabase
        .from("issuer_aliases")
        .select(`
          *,
          issuer_types!issuer_aliases_issuer_type_id_fkey (
            id,
            name,
            is_active
          )
        `)
        .eq("business_id", businessId)
        .eq("alias_normalized", normalizedTitle)
        .maybeSingle();

      if (error) {
        console.error("Error looking up issuer alias:", error);
        return null;
      }

      if (!data) return null;

      // Don't return if the linked type is inactive
      if (data.issuer_types && !data.issuer_types.is_active) {
        return null;
      }

      return {
        ...data,
        issuer_type_name: data.issuer_types?.name || null,
      } as IssuerAlias & { issuer_type_name: string | null };
    },
    enabled: !!businessId && !!normalizedTitle,
    staleTime: 1000 * 60 * 5,
  });
}

export function useIssuerAliases() {
  const { businessId } = useAuth();

  return useQuery({
    queryKey: ["issuer-aliases", businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from("issuer_aliases")
        .select(`
          *,
          issuer_types!issuer_aliases_issuer_type_id_fkey (
            name
          )
        `)
        .eq("business_id", businessId)
        .order("alias_normalized");

      if (error) {
        console.error("Error fetching issuer aliases:", error);
        throw error;
      }

      return (data || []).map((alias: any) => ({
        ...alias,
        issuer_type_name: alias.issuer_types?.name || null,
      })) as IssuerAlias[];
    },
    enabled: !!businessId,
  });
}

export function useCreateIssuerAlias() {
  const queryClient = useQueryClient();
  const { businessId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateIssuerAliasInput) => {
      if (!businessId) throw new Error("No business ID");

      const normalizedTitle = normalizeCertificateTitle(input.aliasRaw);

      if (!normalizedTitle) {
        throw new Error("Invalid alias title");
      }

      const { data, error } = await supabase
        .from("issuer_aliases")
        .insert({
          business_id: businessId,
          alias_normalized: normalizedTitle,
          alias_raw_example: input.aliasRaw,
          issuer_type_id: input.issuerTypeId,
          created_by: "admin",
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating issuer alias:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issuer-aliases"] });
      queryClient.invalidateQueries({ queryKey: ["issuer-alias-lookup"] });
    },
    onError: (error: any) => {
      // Silently suppress duplicate alias errors (23505) to allow automated workflows to continue
      if (error.code === "23505") {
        return;
      }
      toast.error("Failed to create alias");
    },
  });
}

/**
 * Hook to update issuer alias last_seen_at timestamp.
 */
export function useUpdateIssuerAliasLastSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aliasId: string) => {
      const { error } = await supabase
        .from("issuer_aliases")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", aliasId);

      if (error) {
        console.error("Error updating issuer alias last_seen_at:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issuer-aliases"] });
    },
  });
}
