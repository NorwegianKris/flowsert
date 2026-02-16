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
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("An alias with this name already exists");
      } else {
        toast.error("Failed to create alias");
      }
    },
  });
}
