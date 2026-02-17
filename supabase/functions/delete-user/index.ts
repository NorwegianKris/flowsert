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
    // --- Normalize superadmin email once ---
    const SUPER = (Deno.env.get("SUPERADMIN_EMAIL") ?? "").toLowerCase().trim();
    if (!SUPER) {
      console.error("SUPERADMIN_EMAIL env var is not set");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 1: Extract Bearer token ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");

    // --- Step 2: Verify JWT via getClaims (anon-key client) ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const callerId = claimsData.claims.sub as string;

    // --- Parse request body ---
    const { user_id: targetId } = await req.json();
    if (!targetId) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 4: Self-deletion block ---
    if (callerId === targetId) {
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Service-role client for all privileged operations ---
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // --- Step 5: Caller role check (first authz gate) ---
    const { data: callerRole, error: roleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (roleError || !callerRole || callerRole.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 6: Caller email check (second authz gate) ---
    const { data: callerProfile, error: callerProfileError } = await serviceClient
      .from("profiles")
      .select("email")
      .eq("id", callerId)
      .maybeSingle();

    if (callerProfileError || !callerProfile || callerProfile.email.toLowerCase().trim() !== SUPER) {
      return new Response(
        JSON.stringify({ error: "Forbidden: superadmin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 7: Target exists in auth ---
    const { data: authUser, error: authUserError } = await serviceClient.auth.admin.getUserById(targetId);
    if (authUserError || !authUser?.user) {
      return new Response(
        JSON.stringify({ error: "Target user not found in auth" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 8: Auth-level superadmin protection ---
    if (authUser.user.email && authUser.user.email.toLowerCase().trim() === SUPER) {
      return new Response(
        JSON.stringify({ error: "Cannot delete a superadmin account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 9: Profile-level superadmin protection (secondary) ---
    const { data: targetProfile } = await serviceClient
      .from("profiles")
      .select("email")
      .eq("id", targetId)
      .maybeSingle();

    if (targetProfile && targetProfile.email.toLowerCase().trim() === SUPER) {
      return new Response(
        JSON.stringify({ error: "Cannot delete a superadmin account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Deletion sequence ---

    // Step 10: Unlink personnel
    const { error: personnelError } = await serviceClient
      .from("personnel")
      .update({ user_id: null })
      .eq("user_id", targetId);

    if (personnelError) {
      console.error("Failed to unlink personnel:", personnelError);
      return new Response(
        JSON.stringify({ error: "Failed to unlink personnel records" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 11: Delete user_roles
    const { error: rolesDeleteError } = await serviceClient
      .from("user_roles")
      .delete()
      .eq("user_id", targetId);

    if (rolesDeleteError) {
      console.error("Failed to delete user_roles:", rolesDeleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete user roles. Personnel already unlinked." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 12: Delete profiles (tolerates not found)
    const { error: profileDeleteError } = await serviceClient
      .from("profiles")
      .delete()
      .eq("id", targetId);

    if (profileDeleteError) {
      console.error("Failed to delete profile:", profileDeleteError);
      // Continue - not critical if profile was already missing
    }

    // Step 13: Delete auth user
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(targetId);
    if (authDeleteError) {
      console.error("Failed to delete auth user:", authDeleteError);
      return new Response(
        JSON.stringify({
          error: "Auth user deletion failed. Personnel unlinked, roles and profile deleted. Manual cleanup may be needed.",
          details: authDeleteError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in delete-user:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
