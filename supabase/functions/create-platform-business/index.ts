import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateCompanyCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) {
    code += chars[b % chars.length];
  }
  return code;
}

function getTierProfileCap(tier: string): number {
  switch (tier) {
    case "growth":
      return 75;
    case "professional":
      return 200;
    case "enterprise":
      return 2147483647;
    default:
      return 25;
  }
}

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

    const token = authHeader.replace("Bearer ", "");

    // Verify caller identity using getClaims (JWT-based, no session dependency)
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } =
      await authClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (claimsData.claims.email !== "hello@flowsert.com") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { name, tier, is_test, admin_name, admin_email } = body;

    if (!name || !tier || !admin_name || !admin_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Insert business
    const { data: business, error: bizError } = await adminClient
      .from("businesses")
      .insert({
        name,
        is_test: is_test || false,
        company_code: generateCompanyCode(),
      })
      .select("id")
      .single();

    if (bizError) throw bizError;

    const businessId = business.id;

    // 2. Insert entitlements
    const { error: entError } = await adminClient
      .from("entitlements")
      .insert({
        business_id: businessId,
        tier,
        profile_cap: getTierProfileCap(tier),
        is_active: true,
      });

    if (entError) throw entError;

    // 3. Insert personnel (admin, not activated)
    const { data: personnel, error: persError } = await adminClient
      .from("personnel")
      .insert({
        name: admin_name,
        email: admin_email,
        phone: "",
        role: "Admin",
        location: "Not specified",
        business_id: businessId,
        activated: false,
      })
      .select("id")
      .single();

    if (persError) throw persError;

    // 4. Insert invitation
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: invError } = await adminClient.from("invitations").insert({
      business_id: businessId,
      email: admin_email,
      role: "admin",
      status: "pending",
      token: inviteToken,
      expires_at: expiresAt,
    });

    if (invError) throw invError;

    const invitationUrl = `https://flowsert.lovable.app/invite?token=${inviteToken}`;

    return new Response(
      JSON.stringify({ business_id: businessId, invitation_url: invitationUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("create-platform-business error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
