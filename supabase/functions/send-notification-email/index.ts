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
  notificationId?: string;
}

// FlowSert logo as base64 encoded SVG for email compatibility
const logoUrl = "https://flowsert.lovable.app/favicon.png";

const getEmailTemplate = (subject: string, message: string, notificationId?: string) => {
  const viewNotificationUrl = notificationId 
    ? `https://flowsert.lovable.app/worker?notification=${notificationId}`
    : `https://flowsert.lovable.app/worker`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 24px 30px; position: relative;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align: middle;">
                  <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">New Notification</h1>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <img src="${logoUrl}" alt="FlowSert" style="height: 40px; width: auto;" />
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 18px;">${subject}</h3>
              <p style="margin: 0; color: #475569; white-space: pre-wrap; font-size: 15px;">${message}</p>
            </div>
            
            <!-- View Notification Button -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="${viewNotificationUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Notification
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin: 0; text-align: center;">
              Click the button above to view this notification in your FlowSert profile.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
              This email was sent from FlowSert. If you didn't expect this notification, please contact your administrator.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};

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

    const { emails, subject, message, notificationId }: NotificationEmailRequest = await req.json();

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
            from: "FlowSert <noreply@flowsert.com>",
            to: [email],
            subject: `New notification: ${subject}`,
            html: getEmailTemplate(subject, message, notificationId),
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
