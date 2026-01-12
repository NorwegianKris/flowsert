import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProjectInvitationEmailRequest {
  to: string;
  personnelName: string;
  projectName: string;
  projectDescription?: string;
  projectStartDate?: string;
  projectEndDate?: string;
  projectLocation?: string;
  projectManager?: string;
  businessName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-project-invitation function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      personnelName, 
      projectName, 
      projectDescription,
      projectStartDate,
      projectEndDate,
      projectLocation,
      projectManager,
      businessName 
    }: ProjectInvitationEmailRequest = await req.json();

    console.log(`Sending project invitation email to: ${to}`);
    console.log(`Personnel: ${personnelName}`);
    console.log(`Project: ${projectName}`);

    if (!to || !personnelName || !projectName) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, personnelName, projectName" }),
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

    const companyName = businessName || "FlowSert";
    
    // Format dates for display
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return null;
      try {
        return new Date(dateStr).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch {
        return dateStr;
      }
    };

    const startDateFormatted = formatDate(projectStartDate);
    const endDateFormatted = formatDate(projectEndDate);
    const dateRange = startDateFormatted 
      ? endDateFormatted 
        ? `${startDateFormatted} - ${endDateFormatted}`
        : `Starting ${startDateFormatted}`
      : null;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `FlowSert <noreply@flowsert.com>`,
        to: [to],
        subject: `You've been invited to project: ${projectName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Project Invitation</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">${companyName}</p>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hi <strong>${personnelName}</strong>,</p>
                
                <p style="font-size: 16px;">You've been invited to join the following project:</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin: 0 0 10px 0; color: #2563eb; font-size: 20px;">${projectName}</h2>
                  ${projectDescription ? `<p style="margin: 0 0 15px 0; color: #555;">${projectDescription}</p>` : ''}
                  
                  <table style="width: 100%; font-size: 14px;">
                    ${dateRange ? `
                    <tr>
                      <td style="padding: 5px 0; color: #666;"><strong>Dates:</strong></td>
                      <td style="padding: 5px 0;">${dateRange}</td>
                    </tr>
                    ` : ''}
                    ${projectLocation ? `
                    <tr>
                      <td style="padding: 5px 0; color: #666;"><strong>Location:</strong></td>
                      <td style="padding: 5px 0;">${projectLocation}</td>
                    </tr>
                    ` : ''}
                    ${projectManager ? `
                    <tr>
                      <td style="padding: 5px 0; color: #666;"><strong>Manager:</strong></td>
                      <td style="padding: 5px 0;">${projectManager}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                <p style="font-size: 16px;">Please log in to your FlowSert account to accept or decline this invitation.</p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #888; text-align: center;">
                  This is an automated message from ${companyName}.<br>
                  If you didn't expect this email, please contact your administrator.
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

    console.log("Project invitation email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending project invitation email:", error);
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
