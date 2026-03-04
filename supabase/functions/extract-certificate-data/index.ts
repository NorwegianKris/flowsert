import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractionRequest {
  imageBase64: string;
  mimeType: string;
  existingCategories: string[];
  existingIssuers?: string[];
}

interface ExtractedData {
  certificateName: string | null;
  dateOfIssue: string | null;
  expiryDate: string | null;
  placeOfIssue: string | null;
  issuingAuthority: string | null;
  matchedCategory: string | null;
  matchedIssuer: string | null;
  suggestedTypeName: string | null;
  classificationConfidence: number;
}

interface ExtractionResponse {
  status: "green" | "amber" | "red";
  confidence: number;
  extractedData: ExtractedData;
  fieldsExtracted: number;
  issues: string[];
}

// Fire-and-forget error event logger (never throws)
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
  } catch (_) { /* fire-and-forget */ }
}

async function logUsage(params: {
  serviceClient: ReturnType<typeof createClient>;
  businessId: string;
  eventType: "ocr_extraction" | "assistant_query" | "personnel_match" | "email_sent";
  quantity?: number;
  model?: string | null;
}) {
  try {
    const billingMonth = new Date();
    billingMonth.setDate(1);
    billingMonth.setHours(0, 0, 0, 0);
    await params.serviceClient.from("usage_ledger").insert({
      business_id: params.businessId,
      event_type: params.eventType,
      quantity: params.quantity ?? 1,
      model: params.model ?? null,
      billing_month: billingMonth.toISOString().slice(0, 10),
    });
  } catch (err) {
    console.error("[usage_ledger] non-fatal logging error:", err);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Rate limit check (10 AI extract requests per 60 seconds)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    let businessId: string | null = null;
    try {
      const { data } = await serviceClient
        .from("profiles").select("business_id")
        .eq("id", userId).maybeSingle();
      businessId = data?.business_id ?? null;
    } catch (_) { businessId = null; }

    const { error: rlError } = await serviceClient.rpc('enforce_rate_limit', {
      p_key: `ai_extract:${userId}`,
      p_limit: 10,
      p_window_seconds: 60
    });
    if (rlError) {
      await writeErrorEvent(serviceClient, {
        actor_user_id: userId as string,
        source: 'edge',
        event_type: 'extract.rate_limit',
        severity: 'warn',
        message: 'Extract rate limit exceeded',
      });
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Monthly AI allowance check (fail-open)
    let usageUsed = 0;
    let usageCap = 0;
    if (businessId) {
      try {
        const { data: allowance } = await serviceClient.rpc('check_ai_allowance', {
          p_business_id: businessId,
          p_event_type: 'ocr'
        });
        if (allowance && !allowance.allowed) {
          await writeErrorEvent(serviceClient, {
            actor_user_id: userId as string,
            source: 'edge',
            event_type: 'extract.monthly_cap',
            severity: 'warn',
            message: 'Monthly OCR cap reached',
            metadata: { used: allowance.used, cap: allowance.cap },
          });
          return new Response(
            JSON.stringify({ error: 'monthly_cap_reached', detail: { used: allowance.used, cap: allowance.cap } }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (allowance) {
          usageUsed = allowance.used ?? 0;
          usageCap = allowance.cap ?? 0;
        }
      } catch (err) {
        console.error("[check_ai_allowance] non-fatal error:", err);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, mimeType, existingCategories, existingIssuers }: ExtractionRequest = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt for certificate extraction
    const systemPrompt = `You are an expert document analyst specializing in professional certificates and qualifications. 
Your task is to extract structured information from certificate images with high accuracy.

IMPORTANT RULES:
1. Only extract information that is clearly visible and readable
2. For dates, convert to YYYY-MM-DD format (e.g., "15 January 2024" -> "2024-01-15")
3. If a field is not visible or unclear, return null for that field
4. Certificate names should be the official title (e.g., "BOSIET", "First Aid Certificate", "Crane Operator License")
5. Place of issue is typically a country or city
6. Issuing authority is the organization that issued the certificate (e.g., "DNV", "Falck Safety Services", "Red Cross")
7. IMPORTANT: Also classify the certificate into its canonical industry-standard type name. Use ALL available signals: document title, issuing authority, logos, expiry period, qualification level, and any other context clues. Examples of canonical type names: "BOSIET with CA-EBS", "CSWIP 3.2U Diver Inspector", "Offshore Diving Medical (DMAC 11)", "Basic Offshore Safety Induction & Emergency Training", "HUET with CA-EBS", "First Aid at Work". Return null for suggestedTypeName if you are genuinely uncertain about the certificate type.

${existingCategories.length > 0 ? `
Known certificate categories in this system: ${existingCategories.join(", ")}
If the certificate matches one of these categories exactly or closely, include that category name in matchedCategory.

CATEGORY PRIORITY RULE: When a certificate could plausibly belong to multiple categories, choose the category that best describes the certificate's PRIMARY FUNCTION — the skill or competence being certified, NOT the work environment or industry sector.
Examples of correct primary-category assignments:
- "CSWIP 3.2U Diver Inspector" → "NDT / Inspection" (primary function is inspection, diving is the work environment)
- "Offshore Crane Operator" → "Crane & Heavy Equipment" (primary function is crane operation, offshore is the environment)
- "Subsea Welding Certificate" → "Welding" (primary function is welding, subsea/diving is the environment)
- "Maritime First Aid" → "First Aid & Medical" (primary function is first aid, maritime is the context)
- "NEBOSH Oil & Gas Safety" → "Health & Safety" (primary function is safety management)
Always apply this rule consistently — never alternate between environment-based and function-based categorization.
` : ""}
${existingIssuers && existingIssuers.length > 0 ? `
Known issuing authorities in this system: ${existingIssuers.join(", ")}
If the issuing authority matches one of these exactly or closely, include that name in matchedIssuer.
` : ""}`;

    const userPrompt = `Analyze this certificate image and extract all visible information.

Return the extracted data using the extract_certificate_data function.`;

    // Call Lovable AI Gateway with vision capabilities
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_certificate_data",
              description: "Extract structured data from a certificate document",
              parameters: {
                type: "object",
                properties: {
                  certificateName: {
                    type: "string",
                    description: "The official name/title of the certificate",
                    nullable: true,
                  },
                  dateOfIssue: {
                    type: "string",
                    description: "Date the certificate was issued in YYYY-MM-DD format",
                    nullable: true,
                  },
                  expiryDate: {
                    type: "string",
                    description: "Expiry date in YYYY-MM-DD format. Null if no expiry or not visible",
                    nullable: true,
                  },
                  placeOfIssue: {
                    type: "string",
                    description: "Country or location where certificate was issued",
                    nullable: true,
                  },
                  issuingAuthority: {
                    type: "string",
                    description: "Organization that issued the certificate",
                    nullable: true,
                  },
                  matchedCategory: {
                    type: "string",
                    description: "If certificate matches a known category, include the category name",
                    nullable: true,
                  },
                  matchedIssuer: {
                    type: "string",
                    description: "If issuing authority matches a known issuer, include the issuer name",
                    nullable: true,
                  },
                  suggestedTypeName: {
                    type: "string",
                    description: "The canonical industry-standard certificate type name (e.g. 'BOSIET with CA-EBS', 'CSWIP 3.2U Diver Inspector'). Null if genuinely uncertain.",
                    nullable: true,
                  },
                  classificationConfidence: {
                    type: "number",
                    description: "0-100 confidence in suggestedTypeName. 90+ = certain, 70-89 = likely, 50-69 = possible, below 50 = uncertain.",
                  },
                  imageQuality: {
                    type: "string",
                    enum: ["good", "fair", "poor"],
                    description: "Overall quality of the image for reading",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score 0-100 for the extraction accuracy",
                  },
                },
                required: ["certificateName", "imageQuality", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_certificate_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        await writeErrorEvent(serviceClient, {
          actor_user_id: userId as string,
          source: 'edge',
          event_type: 'extract.ai_gateway_error',
          severity: 'error',
          message: 'AI gateway rate limit (429)',
          metadata: { status: 429 },
        });
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        await writeErrorEvent(serviceClient, {
          actor_user_id: userId as string,
          source: 'edge',
          event_type: 'extract.ai_gateway_error',
          severity: 'error',
          message: 'AI gateway credits exhausted (402)',
          metadata: { status: 402 },
        });
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      await writeErrorEvent(serviceClient, {
        actor_user_id: userId as string,
        source: 'edge',
        event_type: 'extract.ai_gateway_error',
        severity: 'error',
        message: `AI gateway error (${response.status})`,
        metadata: { status: response.status },
      });
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    // Parse the tool call response
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_certificate_data") {
      await writeErrorEvent(serviceClient, {
        actor_user_id: userId as string,
        source: 'edge',
        event_type: 'extract.parse_error',
        severity: 'error',
        message: 'Invalid AI response format - missing or wrong tool call',
      });
      throw new Error("Invalid AI response format");
    }

    const extractedRaw = JSON.parse(toolCall.function.arguments);
    
    // Build the response with traffic light status
    const extractedData: ExtractedData = {
      certificateName: extractedRaw.certificateName || null,
      dateOfIssue: extractedRaw.dateOfIssue || null,
      expiryDate: extractedRaw.expiryDate || null,
      placeOfIssue: extractedRaw.placeOfIssue || null,
      issuingAuthority: extractedRaw.issuingAuthority || null,
      matchedCategory: extractedRaw.matchedCategory || null,
      matchedIssuer: extractedRaw.matchedIssuer || null,
      suggestedTypeName: extractedRaw.suggestedTypeName || null,
      classificationConfidence: extractedRaw.classificationConfidence || 0,
    };

    // Count extracted fields (excluding matchedCategory as it's optional)
    const coreFields = [
      extractedData.certificateName,
      extractedData.dateOfIssue,
      extractedData.placeOfIssue,
      extractedData.issuingAuthority,
    ];
    const fieldsExtracted = coreFields.filter(f => f !== null).length;

    // Calculate confidence and issues
    const issues: string[] = [];
    let confidence = extractedRaw.confidence || 0;
    
    // Adjust based on image quality
    if (extractedRaw.imageQuality === "poor") {
      confidence = Math.max(0, confidence - 20);
      issues.push("Image quality is low - please verify extracted data");
    } else if (extractedRaw.imageQuality === "fair") {
      confidence = Math.max(0, confidence - 10);
    }

    // Note missing required fields
    if (!extractedData.certificateName) {
      issues.push("Could not read certificate name");
    }
    if (!extractedData.dateOfIssue) {
      issues.push("Could not read date of issue");
    }
    if (!extractedData.placeOfIssue) {
      issues.push("Could not read place of issue");
    }
    if (!extractedData.issuingAuthority) {
      issues.push("Could not read issuing authority");
    }

    // Determine traffic light status
    let status: "green" | "amber" | "red";
    if (confidence >= 85 && fieldsExtracted >= 3) {
      status = "green";
    } else if (confidence >= 50 || fieldsExtracted >= 2) {
      status = "amber";
    } else {
      status = "red";
      if (issues.length === 0) {
        issues.push("Could not reliably extract certificate information");
      }
    }

    const result: ExtractionResponse = {
      status,
      confidence: Math.round(confidence),
      extractedData,
      fieldsExtracted,
      issues,
    };

    if (businessId) {
      void logUsage({
        serviceClient, businessId,
        eventType: "ocr_extraction",
        model: "google/gemini-2.5-flash",
      });
    }

    console.log('EXTRACTION_RESULT:', JSON.stringify({
      certificateName: extractedData.certificateName,
      suggestedTypeName: extractedData.suggestedTypeName,
      classificationConfidence: extractedData.classificationConfidence,
      confidence: result.confidence
    }));

    return new Response(
      JSON.stringify({ ...result, usage_remaining: { used: usageUsed + 1, cap: usageCap } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Certificate extraction error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to extract certificate data",
        status: "red",
        confidence: 0,
        extractedData: {
          certificateName: null,
          dateOfIssue: null,
          expiryDate: null,
          placeOfIssue: null,
          issuingAuthority: null,
          matchedCategory: null,
          matchedIssuer: null,
          suggestedTypeName: null,
          classificationConfidence: 0,
        },
        fieldsExtracted: 0,
        issues: ["An error occurred during extraction"],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
