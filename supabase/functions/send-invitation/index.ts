import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  to: string;
  workerName: string;
  inviteLink: string;
  businessName?: string;
  isAdmin?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, workerName, inviteLink, businessName, isAdmin }: InvitationEmailRequest = await req.json();

    console.log(`Sending invitation email to: ${to}`);
    console.log(`Name: ${workerName}`);
    console.log(`Invite link: ${inviteLink}`);
    console.log(`Is admin invitation: ${isAdmin || false}`);

    if (!to || !workerName || !inviteLink) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, workerName, inviteLink" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const companyName = businessName || "Your Company";
    const roleLabel = isAdmin ? "Administrator" : "team member";
    const roleDescription = isAdmin 
      ? "As an administrator, you'll have full access to manage team members, projects, and settings."
      : "Click the button below to create your account and get started.";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `FlowSert <noreply@flowsert.com>`,
        to: [to],
        subject: isAdmin 
          ? `You've been invited as an Admin to ${companyName}`
          : `You've been invited to join ${companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to ${companyName}!</h1>
                ${isAdmin ? '<p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Administrator Invitation</p>' : ''}
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hi <strong>${workerName}</strong>,</p>
                
                <p style="font-size: 16px;">You've been invited to join ${companyName} as a <strong>${roleLabel}</strong>. ${roleDescription}</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Accept Invitation
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #666;">
                  <strong>Important:</strong> You must sign up using this email address: <strong>${to}</strong>
                </p>
                
                <p style="font-size: 14px; color: #666;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="font-size: 12px; color: #888; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">
                  ${inviteLink}
                </p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #888; text-align: center;">
                  This invitation link will expire in 7 days.<br>
                  If you didn't expect this email, you can safely ignore it.
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error(`Resend API error - Status: ${emailResponse.status}, Message: ${emailData.message || 'Unknown'}, Code: ${emailData.statusCode || 'N/A'}`);
      return new Response(
        JSON.stringify({ error: emailData.message || "Failed to send email" }),
        {
          status: emailResponse.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
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
