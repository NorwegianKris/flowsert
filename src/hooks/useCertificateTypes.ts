import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CertificateType {
  id: string;
  business_id: string | null;
  category_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  category_name?: string;
  usage_count?: number;
}

export interface CreateCertificateTypeInput {
  name: string;
  description?: string;
  category_id?: string;
}

export interface UpdateCertificateTypeInput {
  id: string;
  name?: string;
  description?: string;
  category_id?: string;
  is_active?: boolean;
}

export function useCertificateTypes(options?: { includeInactive?: boolean }) {
  const { businessId } = useAuth();
  const includeInactive = options?.includeInactive ?? false;

  return useQuery({
    queryKey: ["certificate-types", businessId, includeInactive],
    queryFn: async () => {
      if (!businessId) return [];

      let query = supabase
        .from("certificate_types")
        .select(`
          *,
          certificate_categories!certificate_types_category_id_fkey (
            name
          )
        `)
        .or(`business_id.eq.${businessId},business_id.is.null`)
        .order("name");

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching certificate types:", error);
        throw error;
      }

      const types = (data || []).map((type: any) => ({
        ...type,
        category_name: type.certificate_categories?.name || null,
      })) as CertificateType[];

      // Fetch usage counts for all types in one query
      if (types.length > 0) {
        const typeIds = types.map(t => t.id);
        const { data: counts, error: countError } = await supabase
          .from("certificates")
          .select("certificate_type_id")
          .in("certificate_type_id", typeIds);

        if (!countError && counts) {
          // Count occurrences per type
          const countMap = new Map<string, number>();
          counts.forEach((c: any) => {
            if (c.certificate_type_id) {
              countMap.set(c.certificate_type_id, (countMap.get(c.certificate_type_id) || 0) + 1);
            }
          });

          // Attach counts to types
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

export function useCreateCertificateType() {
  const queryClient = useQueryClient();
  const { businessId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCertificateTypeInput) => {
      if (!businessId) throw new Error("No business ID");

      const { data, error } = await supabase
        .from("certificate_types")
        .insert({
          business_id: businessId,
          name: input.name,
          description: input.description || null,
          category_id: input.category_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating certificate type:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-types"] });
      toast.success("Certificate type created");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("A certificate type with this name already exists");
      } else {
        toast.error("Failed to create certificate type");
      }
    },
  });
}

export function useUpdateCertificateType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCertificateTypeInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("certificate_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating certificate type:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-types"] });
      toast.success("Certificate type updated");
    },
    onError: () => {
      toast.error("Failed to update certificate type");
    },
  });
}

export function useArchiveCertificateType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("certificate_types")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error archiving certificate type:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-types"] });
      toast.success("Certificate type archived");
    },
    onError: () => {
      toast.error("Failed to archive certificate type");
    },
  });
}

export function useRestoreCertificateType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("certificate_types")
        .update({ is_active: true })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error restoring certificate type:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-types"] });
      toast.success("Certificate type restored");
    },
    onError: () => {
      toast.error("Failed to restore certificate type");
    },
  });
}

export function useCertificateTypeUsageCount(typeId: string | null) {
  return useQuery({
    queryKey: ["certificate-type-usage", typeId],
    queryFn: async () => {
      if (!typeId) return 0;

      const { count, error } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("certificate_type_id", typeId);

      if (error) {
        console.error("Error fetching usage count:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!typeId,
  });
}
