import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      console.error("getClaims failed:", claimsError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = data.claims.email as string;
    if (userEmail !== "hello@flowsert.com") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { business_id } = await req.json();
    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify is_test = true
    const { data: business, error: bizError } = await adminClient
      .from("businesses")
      .select("id, is_test")
      .eq("id", business_id)
      .single();

    if (bizError || !business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Get personnel IDs for this business
    const { data: personnelRows } = await adminClient
      .from("personnel")
      .select("id")
      .eq("business_id", business_id);
    const personnelIds = (personnelRows || []).map((p: any) => p.id);

    // Get project IDs for this business
    const { data: projectRows } = await adminClient
      .from("projects")
      .select("id")
      .eq("business_id", business_id);
    const projectIds = (projectRows || []).map((p: any) => p.id);

    // Get notification IDs for this business
    const { data: notifRows } = await adminClient
      .from("notifications")
      .select("id")
      .eq("business_id", business_id);
    const notifIds = (notifRows || []).map((n: any) => n.id);

    // Get profile user IDs before nullifying
    const { data: profileRows } = await adminClient
      .from("profiles")
      .select("id")
      .eq("business_id", business_id);
    const profileUserIds = (profileRows || []).map((p: any) => p.id);

    // 1. Delete personnel-dependent data
    if (personnelIds.length > 0) {
      await adminClient.from("certificates").delete().in("personnel_id", personnelIds);
      await adminClient.from("personnel_documents").delete().in("personnel_id", personnelIds);
      await adminClient.from("personnel_worker_groups").delete().in("personnel_id", personnelIds);
      await adminClient.from("availability").delete().in("personnel_id", personnelIds);
      await adminClient.from("direct_messages").delete().in("personnel_id", personnelIds);
      await adminClient.from("personnel_document_categories").delete().in("personnel_id", personnelIds);
      await adminClient.from("notification_recipients").delete().in("personnel_id", personnelIds);
    }

    // 2. Delete data_processing_acknowledgements by business_id
    await adminClient.from("data_processing_acknowledgements").delete().eq("business_id", business_id);

    // 3. Delete personnel
    await adminClient.from("personnel").delete().eq("business_id", business_id);

    // 4. Delete project-dependent data
    if (projectIds.length > 0) {
      await adminClient.from("project_messages").delete().in("project_id", projectIds);
      await adminClient.from("project_calendar_items").delete().in("project_id", projectIds);
      await adminClient.from("project_phases").delete().in("project_id", projectIds);
      await adminClient.from("project_events").delete().in("project_id", projectIds);
      await adminClient.from("project_invitations").delete().in("project_id", projectIds);
      await adminClient.from("project_documents").delete().in("project_id", projectIds);
      await adminClient.from("project_document_categories").delete().in("project_id", projectIds);
    }

    // 5. Delete project_applications and projects
    await adminClient.from("project_applications").delete().eq("business_id", business_id);
    await adminClient.from("projects").delete().eq("business_id", business_id);

    // 6. Delete remaining notification_recipients by notification IDs
    if (notifIds.length > 0) {
      await adminClient.from("notification_recipients").delete().in("notification_id", notifIds);
    }
    await adminClient.from("notifications").delete().eq("business_id", business_id);

    // 7. Delete invitations
    await adminClient.from("invitations").delete().eq("business_id", business_id);

    // 8. Delete certificate taxonomy
    await adminClient.from("certificate_aliases").delete().eq("business_id", business_id);
    await adminClient.from("certificate_types").delete().eq("business_id", business_id);
    await adminClient.from("certificate_categories").delete().eq("business_id", business_id);

    // 9. Delete issuer taxonomy
    await adminClient.from("issuer_aliases").delete().eq("business_id", business_id);
    await adminClient.from("issuer_types").delete().eq("business_id", business_id);

    // 10. Delete groups, categories, departments
    await adminClient.from("worker_categories").delete().eq("business_id", business_id);
    await adminClient.from("worker_groups").delete().eq("business_id", business_id);
    await adminClient.from("departments").delete().eq("business_id", business_id);
    await adminClient.from("freelancer_invitations").delete().eq("business_id", business_id);
    await adminClient.from("document_categories").delete().eq("business_id", business_id);

    // 11. Delete feedback, usage, audit
    await adminClient.from("feedback").delete().eq("business_id", business_id);
    await adminClient.from("usage_ledger").delete().eq("business_id", business_id);
    await adminClient.from("audit_logs").delete().eq("business_id", business_id);
    await adminClient.from("error_events").delete().eq("business_id", business_id);

    // 12. Delete billing
    await adminClient.from("billing_subscriptions").delete().eq("business_id", business_id);
    await adminClient.from("billing_customers").delete().eq("business_id", business_id);
    await adminClient.from("billing_events").delete().eq("business_id", business_id);

    // 13. Delete business documents
    await adminClient.from("business_documents").delete().eq("business_id", business_id);

    // 14. Detach profiles and delete user_roles
    if (profileUserIds.length > 0) {
      await adminClient.from("user_roles").delete().in("user_id", profileUserIds);
      await adminClient.from("profiles").update({ business_id: null }).in("id", profileUserIds);
    }

    // 15. Delete entitlements and business
    await adminClient.from("entitlements").delete().eq("business_id", business_id);
    await adminClient.from("businesses").delete().eq("id", business_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-platform-business error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
