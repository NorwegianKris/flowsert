import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// FlowSert logo URL from storage
const logoUrl = "https://frgsnallgwkufyzabeje.supabase.co/storage/v1/object/public/avatars/email-logo.jpg";

interface ExpiringCertificate {
  certificate_name: string;
  expiry_date: string;
  days_until_expiry: number;
}

interface PersonnelWithExpiringCerts {
  personnel_id: string;
  personnel_name: string;
  email: string;
  certificates: ExpiringCertificate[];
}

const getEmailTemplate = (personnelName: string, certificates: ExpiringCertificate[]) => {
  const certificateRows = certificates
    .map(
      (cert) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${cert.certificate_name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${new Date(cert.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; ${
            cert.days_until_expiry <= 30
              ? 'background: #fef2f2; color: #dc2626;'
              : 'background: #fef9c3; color: #ca8a04;'
          }">
            ${cert.days_until_expiry} days
          </span>
        </td>
      </tr>
    `
    )
    .join('');

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
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 24px 30px; position: relative;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align: middle;">
                  <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">⚠️ Certificate Expiry Alert</h1>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <img src="${logoUrl}" alt="FlowSert" style="height: 40px; width: auto;" />
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Hello <strong>${personnelName}</strong>,</p>
            
            <p style="margin: 0 0 20px 0; color: #475569;">
              The following certificates in your profile are expiring soon and may require renewal:
            </p>
            
            <!-- Certificate Table -->
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #e2e8f0;">
                  <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #475569;">Certificate</th>
                  <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #475569;">Expiry Date</th>
                  <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #475569;">Time Left</th>
                </tr>
              </thead>
              <tbody>
                ${certificateRows}
              </tbody>
            </table>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="https://flowsert.lovable.app/worker" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View My Profile
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin: 0; text-align: center;">
              Please ensure your certificates are renewed before they expire to maintain your qualifications.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
              You received this email because you enabled certificate expiry notifications in your FlowSert profile.
              <br />
              To stop receiving these notifications, visit your profile and disable them in the Certificates section.
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all personnel with notification preference enabled who have expiring certificates
    // "Expiring soon" = within 90 days of expiry
    const today = new Date().toISOString().split('T')[0];
    const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get personnel with notifications enabled
    const { data: personnelData, error: personnelError } = await supabase
      .from('personnel')
      .select('id, name, email')
      .eq('certificate_expiry_notifications', true);

    if (personnelError) throw personnelError;

    if (!personnelData || personnelData.length === 0) {
      console.log('No personnel with notifications enabled');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No personnel with notifications enabled' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const personnelIds = personnelData.map(p => p.id);

    // Get expiring certificates for these personnel
    const { data: certificatesData, error: certError } = await supabase
      .from('certificates')
      .select('personnel_id, name, expiry_date')
      .in('personnel_id', personnelIds)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', today)
      .lte('expiry_date', ninetyDaysFromNow);

    if (certError) throw certError;

    if (!certificatesData || certificatesData.length === 0) {
      console.log('No expiring certificates found');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No expiring certificates found' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Group certificates by personnel
    const personnelCertMap = new Map<string, PersonnelWithExpiringCerts>();

    for (const cert of certificatesData) {
      const personnel = personnelData.find(p => p.id === cert.personnel_id);
      if (!personnel) continue;

      if (!personnelCertMap.has(cert.personnel_id)) {
        personnelCertMap.set(cert.personnel_id, {
          personnel_id: cert.personnel_id,
          personnel_name: personnel.name,
          email: personnel.email,
          certificates: [],
        });
      }

      const expiryDate = new Date(cert.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      personnelCertMap.get(cert.personnel_id)!.certificates.push({
        certificate_name: cert.name,
        expiry_date: cert.expiry_date,
        days_until_expiry: daysUntilExpiry,
      });
    }

    // Send emails to each personnel
    let successful = 0;
    let failed = 0;

    for (const [, personnelCerts] of personnelCertMap) {
      // Sort certificates by days until expiry
      personnelCerts.certificates.sort((a, b) => a.days_until_expiry - b.days_until_expiry);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "FlowSert <noreply@flowsert.com>",
            to: [personnelCerts.email],
            subject: `⚠️ ${personnelCerts.certificates.length} certificate(s) expiring soon`,
            html: getEmailTemplate(personnelCerts.personnel_name, personnelCerts.certificates),
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Failed to send email to ${personnelCerts.email}:`, errorText);
          failed++;
        } else {
          console.log(`Sent expiry notification to ${personnelCerts.email}`);
          successful++;
        }
      } catch (error) {
        console.error(`Error sending to ${personnelCerts.email}:`, error);
        failed++;
      }
    }

    console.log(`Certificate expiry notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed: failed,
        total_personnel: personnelCertMap.size,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-certificate-expiry-notifications function:", error);
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
