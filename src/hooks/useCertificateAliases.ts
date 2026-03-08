import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { normalizeCertificateTitle } from "@/lib/certificateNormalization";

export interface CertificateAlias {
  id: string;
  business_id: string;
  alias_normalized: string;
  alias_raw_example: string | null;
  certificate_type_id: string;
  confidence: number;
  created_by: "system" | "admin";
  last_seen_at: string;
  created_at: string;
  // Joined data
  certificate_type_name?: string;
}

export interface CreateAliasInput {
  aliasRaw: string;
  certificateTypeId: string;
  createdBy?: "system" | "admin";
  confidence?: number;
}

/**
 * Hook to look up an alias by normalized title.
 * Returns the matched alias or null if not found.
 */
export function useLookupAlias(rawTitle: string | null) {
  const { businessId } = useAuth();
  const normalizedTitle = rawTitle ? normalizeCertificateTitle(rawTitle) : null;

  return useQuery({
    queryKey: ["certificate-alias-lookup", businessId, normalizedTitle],
    queryFn: async () => {
      if (!businessId || !normalizedTitle) return null;

      const { data, error } = await supabase
        .from("certificate_aliases")
        .select(`
          *,
          certificate_types!certificate_aliases_certificate_type_id_fkey (
            id,
            name,
            is_active,
            category_id
          )
        `)
        .eq("business_id", businessId)
        .eq("alias_normalized", normalizedTitle)
        .maybeSingle();

      if (error) {
        console.error("Error looking up alias:", error);
        return null;
      }

      if (!data) return null;

      // Don't return if the linked type is inactive
      if (data.certificate_types && !data.certificate_types.is_active) {
        return null;
      }

      return {
        ...data,
        certificate_type_name: data.certificate_types?.name || null,
        certificate_type_category_id: data.certificate_types?.category_id || null,
      } as CertificateAlias & { certificate_type_name: string | null; certificate_type_category_id: string | null };
    },
    enabled: !!businessId && !!normalizedTitle,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch all aliases for the business.
 */
export function useCertificateAliases() {
  const { businessId } = useAuth();

  return useQuery({
    queryKey: ["certificate-aliases", businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from("certificate_aliases")
        .select(`
          *,
          certificate_types!certificate_aliases_certificate_type_id_fkey (
            name
          )
        `)
        .eq("business_id", businessId)
        .order("alias_normalized");

      if (error) {
        console.error("Error fetching aliases:", error);
        throw error;
      }

      return (data || []).map((alias: any) => ({
        ...alias,
        certificate_type_name: alias.certificate_types?.name || null,
      })) as CertificateAlias[];
    },
    enabled: !!businessId,
  });
}

/**
 * Hook to create a new alias.
 */
export function useCreateAlias() {
  const queryClient = useQueryClient();
  const { businessId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateAliasInput) => {
      if (!businessId) throw new Error("No business ID");

      const normalizedTitle = normalizeCertificateTitle(input.aliasRaw);

      if (!normalizedTitle) {
        throw new Error("Invalid alias title");
      }

      const { data, error } = await supabase
        .from("certificate_aliases")
        .insert({
          business_id: businessId,
          alias_normalized: normalizedTitle,
          alias_raw_example: input.aliasRaw,
          certificate_type_id: input.certificateTypeId,
          created_by: input.createdBy ?? "admin",
          confidence: input.confidence ?? 100,
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating alias:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-aliases"] });
      queryClient.invalidateQueries({ queryKey: ["certificate-alias-lookup"] });
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        // Silently skip — alias already exists, no action needed
        return;
      }
      toast.error("Failed to create alias");
    },
  });
}

/**
 * Hook to update alias last_seen_at timestamp.
 */
export function useUpdateAliasLastSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aliasId: string) => {
      const { error } = await supabase
        .from("certificate_aliases")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", aliasId);

      if (error) {
        console.error("Error updating alias last_seen_at:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-aliases"] });
    },
  });
}

/**
 * Hook to reassign an alias to a different certificate type.
 */
export function useReassignAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ aliasId, newTypeId }: { aliasId: string; newTypeId: string }) => {
      const { data, error } = await supabase
        .from("certificate_aliases")
        .update({ certificate_type_id: newTypeId })
        .eq("id", aliasId)
        .select()
        .single();

      if (error) {
        console.error("Error reassigning alias:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-aliases"] });
      queryClient.invalidateQueries({ queryKey: ["certificate-alias-lookup"] });
      toast.success("Alias reassigned");
    },
    onError: () => {
      toast.error("Failed to reassign alias");
    },
  });
}

/**
 * Hook to delete an alias.
 */
export function useDeleteAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aliasId: string) => {
      const { error } = await supabase
        .from("certificate_aliases")
        .delete()
        .eq("id", aliasId);

      if (error) {
        console.error("Error deleting alias:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-aliases"] });
      queryClient.invalidateQueries({ queryKey: ["certificate-alias-lookup"] });
      toast.success("Alias deleted");
    },
    onError: () => {
      toast.error("Failed to delete alias");
    },
  });
}

/**
 * Hook to get aliases grouped by certificate type.
 */
export function useAliasesGroupedByType() {
  const { data: aliases, ...rest } = useCertificateAliases();

  const grouped = (aliases || []).reduce((acc, alias) => {
    const typeId = alias.certificate_type_id;
    if (!acc[typeId]) {
      acc[typeId] = {
        typeName: alias.certificate_type_name || "Unknown",
        aliases: [],
      };
    }
    acc[typeId].aliases.push(alias);
    return acc;
  }, {} as Record<string, { typeName: string; aliases: CertificateAlias[] }>);

  return { data: grouped, ...rest };
}
