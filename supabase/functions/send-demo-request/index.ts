import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoRequestPayload {
  name: string;
  email: string;
  message?: string;
}

// FlowSert logo URL from storage
const logoUrl = "https://frgsnallgwkufyzabeje.supabase.co/storage/v1/object/public/avatars/email-logo.jpg";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message }: DemoRequestPayload = await req.json();

    if (!name || !email) {
      throw new Error("Name and email are required");
    }

    const emailResponse = await resend.emails.send({
      from: "FlowSert <onboarding@resend.dev>",
      to: ["hello@flowsert.com"],
      reply_to: email,
      subject: `[FlowSert] Demo Request from ${name}`,
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
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align: middle;">
                      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">New Demo Request</h1>
                    </td>
                    <td style="text-align: right; vertical-align: middle;">
                      <img src="${logoUrl}" alt="FlowSert" style="height: 40px; width: auto;" />
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Content -->
              <div style="padding: 30px;">
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${name}</p>
                  <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
                </div>
                
                ${message ? `
                <div style="padding: 20px; border-left: 4px solid #667eea; background: #f8fafc; border-radius: 0 8px 8px 0;">
                  <h3 style="margin-top: 0; color: #1e293b;">Message:</h3>
                  <p style="white-space: pre-wrap; margin-bottom: 0; color: #475569;">${message}</p>
                </div>
                ` : ''}
              </div>
              
              <!-- Footer -->
              <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                  This demo request was sent from the FlowSert landing page.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Demo request email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending demo request email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
