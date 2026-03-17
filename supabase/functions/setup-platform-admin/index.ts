import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_EMAIL = "hello@flowsert.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Check if user already exists
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (listError) throw listError;

    const existing = listData?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === PLATFORM_EMAIL
    );

    // Also do a broader check since listUsers paginates
    if (!existing) {
      // Try to find by querying profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", PLATFORM_EMAIL)
        .maybeSingle();

      if (profileData) {
        return new Response(
          JSON.stringify({ already_exists: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ already_exists: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user
    const password = Deno.env.get("PLATFORM_ADMIN_PASSWORD");
    if (!password) {
      throw new Error("PLATFORM_ADMIN_PASSWORD secret not configured");
    }

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: PLATFORM_EMAIL,
      password,
      email_confirm: true,
    });

    if (createError) throw createError;

    console.log("[setup-platform-admin] Created user:", createData.user?.id);

    return new Response(
      JSON.stringify({ created: true, user_id: createData.user?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[setup-platform-admin] ERROR:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
