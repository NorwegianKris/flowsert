import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UnmappedCertificate {
  id: string;
  title_raw: string;
  title_normalized: string | null;
  personnel_name: string;
  personnel_id: string;
  personnel_role: string | null;
  expiry_date: string | null;
  document_url: string | null;
  category_id: string | null;
  category_name: string | null;
  created_at: string;
}

interface UseUnmappedCertificatesParams {
  search?: string;
  categoryFilter?: string;
  sortBy?: "title_raw" | "expiry_date" | "personnel_name";
  sortAsc?: boolean;
  limit?: number;
}

export function useUnmappedCertificates(params: UseUnmappedCertificatesParams = {}) {
  const { businessId } = useAuth();
  const {
    search = "",
    categoryFilter = "",
    sortBy = "title_raw",
    sortAsc = true,
    limit = 50,
  } = params;

  return useQuery({
    queryKey: ["unmapped-certificates", businessId, search, categoryFilter, sortBy, sortAsc, limit],
    queryFn: async () => {
      if (!businessId) return { data: [] as UnmappedCertificate[], total: 0 };

      // Build query for count
      let countQuery = supabase
        .from("certificates")
        .select("id, personnel!inner(business_id)", { count: "exact", head: true })
        .eq("personnel.business_id", businessId)
        .is("certificate_type_id", null)
        .is("unmapped_by", null)
        .not("title_raw", "is", null);

      if (categoryFilter) {
        countQuery = countQuery.eq("category_id", categoryFilter);
      }

      // For search we need to do it client-side since we need to search personnel name too
      // But we can at least filter title_raw server-side with ilike
      // We'll fetch all and filter client-side for personnel name search

      // Build data query
      let dataQuery = supabase
        .from("certificates")
        .select(`
          id,
          title_raw,
          title_normalized,
          personnel_id,
          expiry_date,
          document_url,
          category_id,
          created_at,
          certificate_categories ( name ),
          personnel!inner ( name, business_id, role )
        `)
        .eq("personnel.business_id", businessId)
        .is("certificate_type_id", null)
        .is("unmapped_by", null)
        .not("title_raw", "is", null);

      if (categoryFilter) {
        dataQuery = dataQuery.eq("category_id", categoryFilter);
      }

      // Sort
      if (sortBy === "title_raw") {
        dataQuery = dataQuery.order("title_raw", { ascending: sortAsc });
      } else if (sortBy === "expiry_date") {
        dataQuery = dataQuery.order("expiry_date", { ascending: sortAsc, nullsFirst: false });
      } else if (sortBy === "personnel_name") {
        // Can't sort by joined column directly, we'll sort client-side
        dataQuery = dataQuery.order("created_at", { ascending: false });
      }

      // Fetch up to 1000 to allow client-side search + pagination
      dataQuery = dataQuery.limit(1000);

      const { data: rawData, error } = await dataQuery;

      if (error) {
        console.error("Error fetching unmapped certificates:", error);
        throw error;
      }

      // Transform
      let results: UnmappedCertificate[] = (rawData || []).map((cert: any) => ({
        id: cert.id,
        title_raw: cert.title_raw || "",
        title_normalized: cert.title_normalized,
        personnel_name: cert.personnel?.name || "Unknown",
        personnel_id: cert.personnel_id,
        personnel_role: cert.personnel?.role || null,
        expiry_date: cert.expiry_date,
        document_url: cert.document_url,
        category_id: cert.category_id,
        category_name: cert.certificate_categories?.name || null,
        created_at: cert.created_at,
      }));

      // Client-side search (covers both title_raw and personnel_name)
      if (search) {
        const q = search.toLowerCase();
        results = results.filter(
          (c) =>
            c.title_raw.toLowerCase().includes(q) ||
            c.personnel_name.toLowerCase().includes(q)
        );
      }

      // Client-side sort for personnel_name
      if (sortBy === "personnel_name") {
        results.sort((a, b) => {
          const cmp = a.personnel_name.localeCompare(b.personnel_name);
          return sortAsc ? cmp : -cmp;
        });
      }

      const total = results.length;

      // Paginate
      const paginated = results.slice(0, limit);

      return { data: paginated, total };
    },
    enabled: !!businessId,
  });
}
