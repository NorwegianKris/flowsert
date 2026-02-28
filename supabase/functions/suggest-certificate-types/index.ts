import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are a senior compliance officer and certificate classification expert specialising in offshore oil & gas, subsea diving, and marine operations — with deep knowledge of Norwegian shelf regulations (Havtil, PSA, DMAC, OPITO, IMCA, NDC, STCW).

Your task is to classify unmapped personnel certificates against a library of canonical certificate types used for workforce compliance tracking.

For each certificate analyse ALL available signals:
- title_raw: the name typed or OCR-extracted from the document
- category: broad category selected on upload
- expiry_date: validity period indicates certificate class (1yr = medical/annual safety, 2yr = diving medical, 4yr = BOSIET/FOET, no expiry = qualification or license)
- place_of_issue: country or institution reveals governing standard
- personnel_role: Diver vs Supervisor vs Rigger narrows the type set significantly

Classification rules:
1. Strong canonical match → return suggested_type_id, null for suggested_new_type_name, confidence "high"
2. Likely canonical match → return suggested_type_id, null for suggested_new_type_name, confidence "medium"
3. No match but valid industry cert → return null for suggested_type_id, provide suggested_new_type_name and suggested_new_type_category, confidence based on certainty
4. Genuinely unclassifiable (e.g. title is only "Diving" with no other signals) → return both nulls, confidence "low", reasoning states what additional info is needed
5. Never invent certificate types that do not exist in the offshore/marine industry
6. Norwegian context: Kompetansebevis = Norwegian competency certificate, Havtil = Norwegian petroleum authority, NDC = Norwegian Diving Contractors
7. Expiry pattern is a strong signal — use it

Return ONLY a valid JSON array. No markdown. No explanation. No preamble. No postamble.

Output schema — one object per certificate:
[
  {
    "certificate_id": "uuid",
    "suggested_type_id": "uuid or null",
    "suggested_new_type_name": "string or null",
    "suggested_new_type_category": "string or null",
    "confidence": "high | medium | low",
    "reasoning": "max 12 words explaining the key signal used"
  }
]`;

// Fire-and-forget error event logger
async function writeErrorEvent(
  serviceClient: ReturnType<typeof createClient>,
  entry: {
    business_id?: string;
    actor_user_id?: string;
    source: string;
    event_type: string;
    severity: string;
    message: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await serviceClient.from("error_events").insert({
      business_id: entry.business_id ?? null,
      actor_user_id: entry.actor_user_id ?? null,
      source: entry.source,
      event_type: entry.event_type,
      severity: entry.severity,
      message: entry.message,
      metadata: entry.metadata ?? {},
    });
  } catch (_) {
    /* fire-and-forget */
  }
}

async function logUsage(params: {
  serviceClient: ReturnType<typeof createClient>;
  businessId: string;
  quantity: number;
  model: string;
}) {
  try {
    const billingMonth = new Date();
    billingMonth.setDate(1);
    billingMonth.setHours(0, 0, 0, 0);
    await params.serviceClient.from("usage_ledger").insert({
      business_id: params.businessId,
      event_type: "personnel_match",
      quantity: params.quantity,
      model: params.model,
      billing_month: billingMonth.toISOString().slice(0, 10),
    });
  } catch (err) {
    console.error("[usage_ledger] non-fatal logging error:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Service role client for rate limiting + allowance
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Get business ID
    let businessId: string | null = null;
    try {
      const { data } = await serviceClient
        .from("profiles")
        .select("business_id")
        .eq("id", userId)
        .maybeSingle();
      businessId = data?.business_id ?? null;
    } catch (_) {
      businessId = null;
    }

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "No business found for user" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Rate limit: 5 requests per 60 seconds
    const { error: rlError } = await serviceClient.rpc("enforce_rate_limit", {
      p_key: `ai_suggest_types:${userId}`,
      p_limit: 5,
      p_window_seconds: 60,
    });
    if (rlError) {
      await writeErrorEvent(serviceClient, {
        actor_user_id: userId as string,
        business_id: businessId,
        source: "edge",
        event_type: "suggest_types.rate_limit",
        severity: "warn",
        message: "Suggest types rate limit exceeded",
      });
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please wait a moment.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Monthly AI allowance check
    try {
      const { data: allowance } = await serviceClient.rpc(
        "check_ai_allowance",
        {
          p_business_id: businessId,
          p_event_type: "search",
        }
      );
      if (allowance && !allowance.allowed) {
        await writeErrorEvent(serviceClient, {
          actor_user_id: userId as string,
          business_id: businessId,
          source: "edge",
          event_type: "suggest_types.monthly_cap",
          severity: "warn",
          message: "Monthly AI search cap reached",
          metadata: { used: allowance.used, cap: allowance.cap },
        });
        return new Response(
          JSON.stringify({
            error: "monthly_cap_reached",
            detail: { used: allowance.used, cap: allowance.cap },
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } catch (err) {
      console.error("[check_ai_allowance] non-fatal error:", err);
      // fail-open
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { certificates, canonicalTypes } = await req.json();

    if (
      !certificates ||
      !Array.isArray(certificates) ||
      certificates.length === 0
    ) {
      return new Response(
        JSON.stringify({ error: "No certificates provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Batch processing — 50 certificates per call
    const BATCH_SIZE = 50;
    const batches: any[][] = [];
    for (let i = 0; i < certificates.length; i += BATCH_SIZE) {
      batches.push(certificates.slice(i, i + BATCH_SIZE));
    }

    const allResults: any[] = [];

    for (const batch of batches) {
      try {
        const response = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: `Canonical certificate types library:\n${JSON.stringify(canonicalTypes, null, 2)}\n\nCertificates to classify:\n${JSON.stringify(batch, null, 2)}`,
              },
            ],
            temperature: 0,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            await writeErrorEvent(serviceClient, {
              actor_user_id: userId as string,
              business_id: businessId,
              source: "edge",
              event_type: "suggest_types.ai_gateway_429",
              severity: "error",
              message: "AI gateway rate limit during batch",
            });
            return new Response(
              JSON.stringify({
                error:
                  "Rate limit exceeded. Please try again in a moment.",
                suggestions: allResults,
              }),
              {
                status: 429,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              }
            );
          }
          if (response.status === 402) {
            return new Response(
              JSON.stringify({
                error: "AI usage limit reached. Please contact support.",
                suggestions: allResults,
              }),
              {
                status: 402,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              }
            );
          }
          console.error("Gateway error:", response.status);
          continue; // fail-open, skip batch
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";

        // Strip markdown fences if present
        const clean = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const parsed = JSON.parse(clean);
        allResults.push(...parsed);
      } catch (batchError) {
        console.error("Batch classification error:", batchError);
        // fail-open: continue to next batch
      }
    }

    // Log usage
    void logUsage({
      serviceClient,
      businessId,
      quantity: certificates.length,
      model: "google/gemini-2.5-flash",
    });

    return new Response(JSON.stringify({ suggestions: allResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("suggest-certificate-types error:", error);
    return new Response(
      JSON.stringify({ error: "Classification failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
