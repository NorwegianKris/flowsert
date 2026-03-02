import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are a senior compliance data-quality engineer specialising in offshore oil & gas, subsea diving, and marine operations. You have deep knowledge of certificate-issuing organisations worldwide.

Your task is to CLUSTER a list of raw issuing-authority strings that were OCR-extracted or hand-typed. Many strings refer to the same real-world organisation but are spelled differently (typos, abbreviations, translations, legal-entity suffixes).

For each input string, determine which cluster it belongs to:

Clustering rules:
1. Group strings that refer to the same real-world issuing authority. Examples:
   - "DNV", "DNV GL", "DNV-GL AS", "Det Norske Veritas", "DNVGL" → all cluster to "DNV"
   - "Lloyd's Register", "Lloyds Register", "LR" → all cluster to "Lloyd's Register"
   - "Bureau Veritas", "BV", "Bureau Veritas Marine" → all cluster to "Bureau Veritas"
2. Match clusters against the provided list of canonical issuer types when possible.
3. If a cluster matches a canonical issuer → return suggested_issuer_type_id, null for suggested_new_issuer_name
4. If a cluster is a valid real-world authority not in the canonical list → return null for suggested_issuer_type_id, provide suggested_new_issuer_name with the best canonical name for that authority
5. If a string is genuinely unclassifiable → return both nulls, confidence "low"
6. Use the count field as a signal — high-count strings are more likely to be real authorities
7. Never invent organisations that do not exist
8. Norwegian context: "Sjøfartsdirektoratet" = Norwegian Maritime Authority, "Havtil" = Norwegian Petroleum Safety Authority

Return ONLY a valid JSON array. No markdown. No explanation. No preamble. No postamble.

Output schema — one object per input issuer string:
[
  {
    "issuer_normalized": "the normalized key from input",
    "suggested_issuer_type_id": "uuid or null",
    "suggested_new_issuer_name": "string or null",
    "confidence": "high | medium | low",
    "reasoning": "max 12 words explaining the clustering signal"
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
      p_key: `ai_suggest_issuers:${userId}`,
      p_limit: 5,
      p_window_seconds: 60,
    });
    if (rlError) {
      await writeErrorEvent(serviceClient, {
        actor_user_id: userId as string,
        business_id: businessId,
        source: "edge",
        event_type: "suggest_issuers.rate_limit",
        severity: "warn",
        message: "Suggest issuers rate limit exceeded",
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
          event_type: "suggest_issuers.monthly_cap",
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

    const { issuers, canonicalIssuers } = await req.json();

    if (!issuers || !Array.isArray(issuers) || issuers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No issuers provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Batch processing — 25 issuers per call
    const BATCH_SIZE = 25;
    const batches: any[][] = [];
    for (let i = 0; i < issuers.length; i += BATCH_SIZE) {
      batches.push(issuers.slice(i, i + BATCH_SIZE));
    }

    const allResults: any[] = [];
    const START_TIME = Date.now();
    const MAX_DURATION_MS = 50000; // 50s — safely under Supabase 60s default

    for (const batch of batches) {
      if (Date.now() - START_TIME > MAX_DURATION_MS) {
        console.warn(`Time budget reached — returning ${allResults.length} partial results`);
        break;
      }
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
                content: `Canonical issuer types library:\n${JSON.stringify(canonicalIssuers, null, 2)}\n\nIssuer strings to cluster and classify:\n${JSON.stringify(batch, null, 2)}`,
              },
            ],
            temperature: 0,
            max_tokens: 16000,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            await writeErrorEvent(serviceClient, {
              actor_user_id: userId as string,
              business_id: businessId,
              source: "edge",
              event_type: "suggest_issuers.ai_gateway_429",
              severity: "error",
              message: "AI gateway rate limit during batch",
            });
            return new Response(
              JSON.stringify({
                error: "Rate limit exceeded. Please try again in a moment.",
                suggestions: allResults,
              }),
              {
                status: 429,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
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
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          console.error("Gateway error:", response.status);
          continue; // fail-open, skip batch
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";

        // Defensive JSON parsing with salvage
        let parsed: any[] = [];
        try {
          const clean = text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          parsed = JSON.parse(clean);
        } catch (e) {
          try {
            const lastComplete = text.lastIndexOf('},');
            if (lastComplete > 0) {
              const salvaged = text.substring(0, lastComplete + 1)
                .replace(/```json\n?/g, "")
                .trim();
              const attemptFix = salvaged.startsWith('[')
                ? salvaged + ']'
                : '[' + salvaged + ']';
              parsed = JSON.parse(attemptFix);
              console.warn(`Salvaged ${parsed.length} results from truncated batch`);
            } else {
              console.error('Batch unrecoverable, skipping:', (e as Error).message);
            }
          } catch (salvageError) {
            console.error('Salvage failed, skipping batch:', (salvageError as Error).message);
          }
        }
        if (parsed.length > 0) allResults.push(...parsed);
      } catch (batchError) {
        console.error("Batch classification error:", batchError);
        // fail-open: continue to next batch
      }
    }

    // Log usage
    void logUsage({
      serviceClient,
      businessId,
      quantity: issuers.length,
      model: "google/gemini-2.5-flash",
    });

    return new Response(JSON.stringify({
      suggestions: allResults,
      partial: allResults.length < issuers.length,
      processed: allResults.length,
      total: issuers.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("suggest-issuer-types error:", error);
    return new Response(
      JSON.stringify({ error: "Classification failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
