import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller identity
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = claimsData.claims.email as string;
    if (email !== "hello@flowsert.com") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all businesses
    const { data: businesses, error: bizError } = await adminClient
      .from("businesses")
      .select("id, name, logo_url, created_at, is_test")
      .order("created_at", { ascending: false });

    if (bizError) throw bizError;

    if (!businesses || businesses.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const businessIds = businesses.map((b: any) => b.id);

    // Fetch entitlements for all businesses
    const { data: entitlements } = await adminClient
      .from("entitlements")
      .select("business_id, tier")
      .in("business_id", businessIds);

    // Fetch active personnel counts
    const { data: personnelCounts } = await adminClient
      .from("personnel")
      .select("business_id")
      .in("business_id", businessIds)
      .eq("activated", true);

    // Fetch most recent admin invitation per business
    const { data: adminInvitations } = await adminClient
      .from("invitations")
      .select("business_id, email, role")
      .in("business_id", businessIds)
      .eq("role", "admin")
      .order("created_at", { ascending: false });

    // Build lookup maps
    const tierMap: Record<string, string> = {};
    for (const e of entitlements || []) {
      tierMap[e.business_id] = e.tier;
    }

    const countMap: Record<string, number> = {};
    for (const p of personnelCounts || []) {
      if (p.business_id) {
        countMap[p.business_id] = (countMap[p.business_id] || 0) + 1;
      }
    }

    const adminEmailMap: Record<string, string> = {};
    for (const inv of adminInvitations || []) {
      if (inv.business_id && !adminEmailMap[inv.business_id]) {
        adminEmailMap[inv.business_id] = inv.email;
      }
    }

    const result = businesses.map((b: any) => ({
      id: b.id,
      name: b.name,
      logo_url: b.logo_url,
      created_at: b.created_at,
      is_test: b.is_test,
      tier: tierMap[b.id] || "starter",
      active_personnel_count: countMap[b.id] || 0,
      admin_email: adminEmailMap[b.id] || null,
    }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("list-platform-businesses error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
