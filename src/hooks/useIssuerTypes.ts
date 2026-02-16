import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface IssuerType {
  id: string;
  business_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  usage_count?: number;
}

export interface CreateIssuerTypeInput {
  name: string;
  description?: string;
}

export interface UpdateIssuerTypeInput {
  id: string;
  name?: string;
  description?: string;
  is_active?: boolean;
}

export function useIssuerTypes(options?: { includeInactive?: boolean }) {
  const { businessId } = useAuth();
  const includeInactive = options?.includeInactive ?? false;

  return useQuery({
    queryKey: ["issuer-types", businessId, includeInactive],
    queryFn: async () => {
      if (!businessId) return [];

      let query = supabase
        .from("issuer_types")
        .select("*")
        .or(`business_id.eq.${businessId},business_id.is.null`)
        .order("name");

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching issuer types:", error);
        throw error;
      }

      const types = (data || []) as IssuerType[];

      // Fetch usage counts
      if (types.length > 0) {
        const typeIds = types.map(t => t.id);
        const { data: counts, error: countError } = await supabase
          .from("certificates")
          .select("issuer_type_id")
          .in("issuer_type_id", typeIds);

        if (!countError && counts) {
          const countMap = new Map<string, number>();
          counts.forEach((c: any) => {
            if (c.issuer_type_id) {
              countMap.set(c.issuer_type_id, (countMap.get(c.issuer_type_id) || 0) + 1);
            }
          });
          types.forEach(type => {
            type.usage_count = countMap.get(type.id) || 0;
          });
        }
      }

      return types;
    },
    enabled: !!businessId,
  });
}

export function useCreateIssuerType() {
  const queryClient = useQueryClient();
  const { businessId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateIssuerTypeInput) => {
      if (!businessId) throw new Error("No business ID");

      const { data, error } = await supabase
        .from("issuer_types")
        .insert({
          business_id: businessId,
          name: input.name,
          description: input.description || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating issuer type:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issuer-types"] });
      toast.success("Issuer created");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("An issuer with this name already exists");
      } else {
        toast.error("Failed to create issuer");
      }
    },
  });
}

export function useUpdateIssuerType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateIssuerTypeInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("issuer_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating issuer type:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issuer-types"] });
      toast.success("Issuer updated");
    },
    onError: () => {
      toast.error("Failed to update issuer");
    },
  });
}

export function useArchiveIssuerType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("issuer_types")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error archiving issuer type:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issuer-types"] });
      toast.success("Issuer archived");
    },
    onError: () => {
      toast.error("Failed to archive issuer");
    },
  });
}

export function useRestoreIssuerType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("issuer_types")
        .update({ is_active: true })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error restoring issuer type:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issuer-types"] });
      toast.success("Issuer restored");
    },
    onError: () => {
      toast.error("Failed to restore issuer");
    },
  });
}

export function useIssuerTypeUsageCount(typeId: string | null) {
  return useQuery({
    queryKey: ["issuer-type-usage", typeId],
    queryFn: async () => {
      if (!typeId) return 0;

      const { count, error } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("issuer_type_id", typeId);

      if (error) {
        console.error("Error fetching usage count:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!typeId,
  });
}
