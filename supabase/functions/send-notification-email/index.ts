import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationEmailRequest {
  emails: string[];
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { emails, subject, message }: NotificationEmailRequest = await req.json();

    // Validate required fields
    if (!emails || emails.length === 0 || !subject || !message) {
      throw new Error("Missing required fields");
    }

    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < emails.length; i += batchSize) {
      batches.push(emails.slice(i, i + batchSize));
    }

    let successful = 0;
    let failed = 0;

    for (const batch of batches) {
      const promises = batch.map(async (email) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Flowsert <noreply@flowsert.com>",
            to: [email],
            subject: `New notification: ${subject}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">You have a new notification</h2>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #333;">${subject}</h3>
                  <p style="margin: 0; color: #666; white-space: pre-wrap;">${message}</p>
                </div>
                <p style="color: #888; font-size: 14px;">
                  Log in to your Flowsert profile to view this notification.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #aaa; font-size: 12px;">
                  This email was sent from Flowsert. If you didn't expect this notification, please contact your administrator.
                </p>
              </div>
            `,
          }),
        });
        if (!res.ok) {
          throw new Error(`Failed to send to ${email}`);
        }
        return res;
      });

      const batchResults = await Promise.allSettled(promises);
      successful += batchResults.filter(r => r.status === 'fulfilled').length;
      failed += batchResults.filter(r => r.status === 'rejected').length;
    }

    console.log(`Email notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed: failed 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
