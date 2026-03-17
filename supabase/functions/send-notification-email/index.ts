import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface SendError {
  index: number;
  code: string;
  message: string;
}

// FlowSert logo URL from storage
const logoUrl = "https://frgsnallgwkufyzabeje.supabase.co/storage/v1/object/public/avatars/email-logo.jpg";

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

/**
 * Map HTTP status to a conservative error code.
 * If classification is uncertain, returns "unknown".
 */
function mapErrorCode(status: number | null): string {
  if (status === null) return "unknown";
  if (status === 429) return "rate_limited";
  if (status === 422) return "rejected";
  if (status >= 500) return "server_error";
  if (status >= 400) return "client_error";
  return "unknown";
}

/**
 * Send a single email via Resend with one retry for 429/5xx.
 * Returns { ok, code, message }.
 * Never leaks PII in logs or return values.
 */
async function sendOneEmail(
  email: string,
  subject: string,
  htmlBody: string,
  apiKey: string,
  index: number,
  sendId: string,
  deadline: number,
): Promise<{ ok: boolean; code: string; message: string }> {
  const attempt = async (): Promise<Response> => {
    return await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "FlowSert <noreply@flowsert.com>",
        to: [email],
        subject: `New notification: ${subject}`,
        html: htmlBody,
      }),
    });
  };

  try {
    let res = await attempt();

    // Retry once for 429 or 5xx
    if (!res.ok && (res.status === 429 || res.status >= 500)) {
      const retryCode = res.status === 429 ? "429" : `${res.status}`;
      console.log(`[${sendId}] recipient ${index} got ${retryCode}, will retry once`);

      // Determine wait time
      let waitMs = 1000;
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        waitMs = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 5000) || 2000 : 2000;
      }

      // Check deadline before retry
      if (Date.now() + waitMs > deadline) {
        console.log(`[${sendId}] recipient ${index} retry would exceed deadline, skipping`);
        return { ok: false, code: mapErrorCode(res.status), message: `HTTP ${res.status} (no retry, deadline)` };
      }

      await new Promise((r) => setTimeout(r, waitMs));
      res = await attempt();
    }

    if (res.ok) {
      return { ok: true, code: "sent", message: "OK" };
    }

    const code = mapErrorCode(res.status);
    console.log(`[${sendId}] recipient ${index} failed: HTTP ${res.status}`);
    return { ok: false, code, message: `HTTP ${res.status}` };
  } catch (_err) {
    // Sanitize: never log the error object which may contain PII from request payload
    console.log(`[${sendId}] recipient ${index} failed: network_error`);
    return { ok: false, code: "unknown", message: "Network error" };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sendId = crypto.randomUUID();
  console.log(`[${sendId}] send-notification-email invoked`);

  try {
    // --- Auth: validate JWT + admin role ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error(`[${sendId}] auth verification failed`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const userId = user.id;

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.error(`[${sendId}] authorization failed: not admin`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // --- Validate secrets ---
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // --- Parse and validate input ---
    const { emails, subject, message, notificationId }: NotificationEmailRequest = await req.json();

    if (!subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject and message" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (!emails || !Array.isArray(emails)) {
      return new Response(
        JSON.stringify({ error: "Missing required field: emails (array)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // --- De-dupe: normalize, filter, unique ---
    const seen = new Set<string>();
    const uniqueRecipients: string[] = [];

    for (const raw of emails) {
      if (!raw || typeof raw !== "string") continue;
      const normalized = raw.trim().toLowerCase();
      if (!normalized || !normalized.includes("@")) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      uniqueRecipients.push(normalized);
    }

    if (uniqueRecipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid email recipients after filtering" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // --- Hard cap: 40 unique recipients ---
    if (uniqueRecipients.length > 40) {
      return new Response(
        JSON.stringify({
          error: `Too many recipients (max 40 unique emails). Received: ${uniqueRecipients.length}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    console.log(`[${sendId}] sending to ${uniqueRecipients.length} unique recipients`);

    // --- Sequential send with 500ms delay and 100s deadline ---
    const deadline = Date.now() + 100_000;
    const htmlBody = getEmailTemplate(subject, message, notificationId);
    const errors: SendError[] = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < uniqueRecipients.length; i++) {
      // Deadline guard: single summary, then break
      if (Date.now() > deadline) {
        const remaining = uniqueRecipients.length - i;
        skipped = remaining;
        errors.push({
          index: i,
          code: "timeout_guard",
          message: `Stopped after 100s. Remaining: ${remaining}`,
        });
        console.log(`[${sendId}] deadline reached at index ${i}, skipping ${remaining} remaining`);
        break;
      }

      const result = await sendOneEmail(
        uniqueRecipients[i],
        subject,
        htmlBody,
        RESEND_API_KEY,
        i,
        sendId,
        deadline,
      );

      if (result.ok) {
        sent++;
      } else {
        failed++;
        errors.push({ index: i, code: result.code, message: result.message });
      }

      // 500ms delay between sends (skip after last)
      if (i < uniqueRecipients.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.log(`[${sendId}] done: attempted=${uniqueRecipients.length}, sent=${sent}, failed=${failed}, skipped=${skipped}`);

    return new Response(
      JSON.stringify({
        send_id: sendId,
        attempted: uniqueRecipients.length,
        sent,
        failed,
        skipped,
        errors,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    // Sanitize error message to avoid PII leaks
    const safeMessage = error?.message || "Unknown error";
    console.error(`[${sendId}] fatal error: ${safeMessage}`);
    return new Response(
      JSON.stringify({ error: safeMessage, send_id: sendId }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
