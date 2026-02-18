import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: write an audit log row (fire-and-forget, never throws)
async function writeAuditLog(
  serviceClient: ReturnType<typeof createClient>,
  entry: {
    business_id: string;
    actor_user_id: string;
    actor_role: string;
    action_type: string;
    entity_type: string;
    entity_id?: string;
    metadata: Record<string, unknown>;
  }
) {
  try {
    const { error } = await serviceClient.from("audit_logs").insert({
      business_id: entry.business_id,
      actor_user_id: entry.actor_user_id,
      actor_role: entry.actor_role,
      action_type: entry.action_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      metadata: entry.metadata,
    });
    if (error) console.error("Audit log write failed:", error);
  } catch (e) {
    console.error("Audit log write exception:", e);
  }
}

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

    // --- Service-role client for all privileged operations ---
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // --- Get caller's business_id for audit logging ---
    const { data: callerProfileData } = await serviceClient
      .from("profiles")
      .select("email, business_id")
      .eq("id", callerId)
      .maybeSingle();

    const callerBusinessId = callerProfileData?.business_id;

    // --- Step 4: Self-deletion block ---
    if (callerId === targetId) {
      if (callerBusinessId) {
        await writeAuditLog(serviceClient, {
          business_id: callerBusinessId,
          actor_user_id: callerId,
          actor_role: "admin",
          action_type: "user.delete.denied",
          entity_type: "user",
          entity_id: targetId,
          metadata: { reason: "self_delete_attempt" },
        });
      }
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 5: Caller role check (first authz gate) ---
    const { data: callerRole, error: roleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (roleError || !callerRole || callerRole.role !== "admin") {
      if (callerBusinessId) {
        await writeAuditLog(serviceClient, {
          business_id: callerBusinessId,
          actor_user_id: callerId,
          actor_role: callerRole?.role ?? "unknown",
          action_type: "user.delete.denied",
          entity_type: "user",
          entity_id: targetId,
          metadata: { reason: "role_missing" },
        });
      }
      return new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 6: Caller email check (second authz gate) ---
    if (!callerProfileData || callerProfileData.email.toLowerCase().trim() !== SUPER) {
      if (callerBusinessId) {
        await writeAuditLog(serviceClient, {
          business_id: callerBusinessId,
          actor_user_id: callerId,
          actor_role: "admin",
          action_type: "user.delete.denied",
          entity_type: "user",
          entity_id: targetId,
          metadata: { reason: "not_superadmin" },
        });
      }
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
      await writeAuditLog(serviceClient, {
        business_id: callerBusinessId!,
        actor_user_id: callerId,
        actor_role: "superadmin",
        action_type: "user.delete.denied",
        entity_type: "user",
        entity_id: targetId,
        metadata: { reason: "target_is_superadmin" },
      });
      return new Response(
        JSON.stringify({ error: "Cannot delete a superadmin account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 9: Profile-level superadmin protection (secondary) ---
    const { data: targetProfile } = await serviceClient
      .from("profiles")
      .select("email, business_id")
      .eq("id", targetId)
      .maybeSingle();

    if (targetProfile && targetProfile.email.toLowerCase().trim() === SUPER) {
      await writeAuditLog(serviceClient, {
        business_id: callerBusinessId!,
        actor_user_id: callerId,
        actor_role: "superadmin",
        action_type: "user.delete.denied",
        entity_type: "user",
        entity_id: targetId,
        metadata: { reason: "target_is_superadmin" },
      });
      return new Response(
        JSON.stringify({ error: "Cannot delete a superadmin account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use target's business_id for the audit log (more accurate for cross-business deletions)
    const auditBusinessId = targetProfile?.business_id ?? callerBusinessId!;
    const targetEmail = authUser.user.email ?? targetProfile?.email ?? "unknown";

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

    // --- Audit log: successful deletion ---
    await writeAuditLog(serviceClient, {
      business_id: auditBusinessId,
      actor_user_id: callerId,
      actor_role: "superadmin",
      action_type: "user.delete",
      entity_type: "user",
      entity_id: targetId,
      metadata: { target_email: targetEmail, result: "success" },
    });

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
