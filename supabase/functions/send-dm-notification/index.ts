import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DMNotificationRequest {
  personnelId: string;
  messageContent: string;
  senderName: string;
}

// FlowSert logo URL from storage
const logoUrl = "https://frgsnallgwkufyzabeje.supabase.co/storage/v1/object/public/avatars/email-logo.jpg";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication - only authenticated users can trigger DM notifications
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth verification failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { personnelId, messageContent, senderName }: DMNotificationRequest = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Create Supabase client with service role for data access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get personnel email
    const { data: personnel, error: personnelError } = await supabase
      .from("personnel")
      .select("email, name")
      .eq("id", personnelId)
      .single();

    if (personnelError || !personnel) {
      console.error("Error fetching personnel:", personnelError);
      return new Response(
        JSON.stringify({ error: "Personnel not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get business info for branding
    const { data: personnelWithBusiness } = await supabase
      .from("personnel")
      .select("business_id, businesses(name)")
      .eq("id", personnelId)
      .single();

    const businessName = (personnelWithBusiness?.businesses as any)?.name || "FlowSert";

    // Send email notification via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${businessName} <noreply@flowsert.com>`,
        to: [personnel.email],
        subject: `New message from ${senderName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header with Logo -->
              <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 24px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align: middle;">
                      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">New Message</h1>
                    </td>
                    <td style="text-align: right; vertical-align: middle;">
                      <img src="${logoUrl}" alt="FlowSert" style="height: 40px; width: auto;" />
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Content -->
              <div style="padding: 30px;">
                <p style="margin-top: 0; font-size: 16px;">Hi ${personnel.name},</p>
                
                <p style="font-size: 15px;">You have received a new message from <strong>${senderName}</strong>:</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
                  <p style="margin: 0; color: #475569; white-space: pre-wrap; font-size: 15px;">${messageContent}</p>
                </div>
                
                <!-- View Message Button -->
                <div style="text-align: center; margin: 28px 0;">
                  <a href="https://flowsert.lovable.app/worker" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    View Message
                  </a>
                </div>
                
                <p style="margin-bottom: 0; color: #64748b; font-size: 14px; text-align: center;">
                  Best regards,<br>
                  The ${businessName} Team
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                  This is an automated notification. Please do not reply to this email.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("DM notification email sent:", emailResult);

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-dm-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
