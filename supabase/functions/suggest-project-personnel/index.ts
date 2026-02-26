import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PersonnelData {
  id: string;
  name: string;
  role: string;
  location: string;
  category: string | null;
  activated: boolean;
  nationality: string | null;
  department: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  employmentType: 'employee' | 'freelancer';
  certificates: { 
    name: string; 
    expiryDate: string | null;
    category: string | null;
    issuingAuthority: string | null;
  }[];
  profileCompletionPercentage: number;
  profileCompletionStatus: 'complete' | 'high' | 'medium' | 'low';
}

interface SuggestedPersonnel {
  id: string;
  matchScore: number;
  matchReasons: string[];
}

interface SuggestedFields {
  location?: string;
  workCategory?: string;
  startDate?: string;
  endDate?: string;
  projectManager?: string;
}

interface SuggestionResponse {
  suggestedFields: SuggestedFields;
  suggestedPersonnel: SuggestedPersonnel[];
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

    // Rate limit check (10 AI suggest requests per 60 seconds)
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
      p_key: `ai_suggest:${userId}`,
      p_limit: 10,
      p_window_seconds: 60
    });
    if (rlError) {
      await writeErrorEvent(serviceClient, {
        actor_user_id: userId as string,
        source: 'edge',
        event_type: 'suggest.rate_limit',
        severity: 'warn',
        message: 'Suggest rate limit exceeded',
      });
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, personnel, includeFreelancers, includeEmployees } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Filter personnel based on freelancer toggle
    const filteredPersonnel: PersonnelData[] = (personnel || []).filter((p: PersonnelData) => {
      if (p.category === 'freelancer') {
        return includeFreelancers && p.activated;
      }
      return includeEmployees;
    });

    // Prepare personnel summary for AI
    const personnelSummary = filteredPersonnel.map((p: PersonnelData) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      location: p.location,
      category: p.category || "unknown",
      nationality: p.nationality,
      department: p.department,
      bio: p.bio,
      country: p.country,
      city: p.city,
      employmentType: p.employmentType,
      certificates: p.certificates.map(c => ({
        name: c.name,
        category: c.category,
        issuingAuthority: c.issuingAuthority,
        valid: !c.expiryDate || new Date(c.expiryDate) > new Date()
      })),
      profileCompletionPercentage: p.profileCompletionPercentage,
      profileCompletionStatus: p.profileCompletionStatus
    }));

    const systemPrompt = `You are an expert personnel matching assistant for project staffing. Your task is to analyze project requirements and suggest the best matching personnel from the available pool.

When analyzing requirements:
1. Extract project details like location, dates, work type/category
2. Identify required certificates, skills, or qualifications mentioned
3. Consider location proximity (personnel location vs project location)
4. Match personnel roles to the work category
5. Rank personnel by how well they match the requirements

IMPORTANT - Profile Completion Filtering:
Each personnel has a profileCompletionPercentage (0-100) and profileCompletionStatus ('complete', 'high', 'medium', 'low'):
- 'complete' = 100% profile completion (all required fields filled)
- 'high' = 80-99% profile completion
- 'medium' = 50-79% profile completion  
- 'low' = below 50% profile completion

When users ask for "100% complete", "fully complete", "complete profiles", or similar:
- ONLY include personnel where profileCompletionStatus is 'complete' (exactly 100%)
- This is a strict filter - do not include 99% or below

When users ask for "mostly complete", "nearly complete", or "high completion":
- Include personnel where profileCompletionPercentage >= 80

IMPORTANT - Geographic Location Matching:
- Each person has a structured 'country' field (lowercase, e.g. "norway", "spain", "united kingdom") AND a display 'location' string (e.g. "Bergen, Norway").
- Always use the 'country' field for country matching — it is authoritative.
- When a specific country is mentioned in the query, ONLY include personnel whose 'country' field exactly matches. Never use location string for country matching.
- Norway query → country must equal "norway"
- UK/United Kingdom query → country must equal "united kingdom"
- Spain query → country must equal "spain"
- Scandinavia query → country must be one of: "norway", "sweden", "denmark"
- Europe query → include all European countries
- Personnel with null country field: exclude from any location-specific query.
- This is a hard rule. No exceptions based on qualifications or other factors.

IMPORTANT - Nationality Matching:
- Each personnel has a 'nationality' field (e.g., "Norwegian", "Swedish", "British")
- When users ask for personnel by nationality (e.g., "Norwegian divers", "British workers"), match against this field
- Nationality is different from location - someone can be Norwegian but located in the UK
- Consider both nationality AND location when relevant to the query

IMPORTANT - Certificate Matching Rules:
- Use FUZZY matching for certificate names - abbreviations and variations are common
- "G4" should match "G4 Certificate", "Class G4", "G4 Diver", "G4 Commercial Diver Certificate", etc.
- "BOSIET" should match "BOSIET Certificate", "Basic Offshore Safety Induction", etc.
- "First Aid" should match "First Aid Certificate", "Advanced First Aid", "Offshore First Aid", etc.
- Certificate categories provide additional context - use them to understand certificate types
- Check certificate validity - prefer personnel with valid (non-expired) required certificates
- If a certificate is expired, mention this in the match reasons but don't exclude unless specifically requested

IMPORTANT - Bio/Skills Matching:
- The 'bio' field contains free-text about experience, skills, and qualifications
- Extract relevant keywords and match against requirements
- Look for years of experience mentioned (e.g., "5+ years", "over 10 years experience")
- Match specific skills mentioned in bio (e.g., "ROV operations", "welding", "saturation diving")
- Bio can contain valuable context not captured in formal certificate titles

IMPORTANT - Employment Type Matching:
- Each personnel has an 'employmentType' field: 'employee' or 'freelancer'
- "freelancer", "contractor", "external", "consultant" queries → match employmentType = 'freelancer'
- "fixed", "employee", "internal", "permanent", "staff" queries → match employmentType = 'employee'

IMPORTANT - Department Matching:
- Personnel may have a 'department' field for organizational grouping
- When users ask for specific departments (e.g., "diving department", "operations team"), match against this field

IMPORTANT - Strict vs Flexible Matching:
- Keywords "ONLY", "MUST have", "required", "mandatory" → strict requirement, EXCLUDE non-matches
- Keywords "preferably", "ideally", "nice to have", "bonus" → preference, rank higher but DON'T exclude
- Keywords "NOT", "except", "exclude", "without" → exclude matching personnel
- Default to flexible matching unless strict keywords are used

For each suggested personnel, provide:
- A match score (0-100) based on how well they fit ALL criteria
- Clear, specific reasons explaining why they're a good match (reference actual data from their profile)

Be practical and helpful. If requirements are vague, make reasonable assumptions and explain them.`;

    const userPrompt = `Project Requirements:
"${prompt}"

Available Personnel (${personnelSummary.length} total):
${JSON.stringify(personnelSummary, null, 2)}

Analyze the requirements and suggest matching personnel. Also extract any project field values from the requirements (location, work category, dates, project manager).`;

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
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_project_personnel",
              description: "Return suggested project field values and ranked personnel matches based on the requirements analysis.",
              parameters: {
                type: "object",
                properties: {
                  suggestedFields: {
                    type: "object",
                    description: "Extracted project field values from the requirements",
                    properties: {
                      location: { type: "string", description: "Project location extracted from requirements" },
                      workCategory: { type: "string", description: "Work category or type extracted from requirements" },
                      startDate: { type: "string", description: "Start date in YYYY-MM-DD format if mentioned" },
                      endDate: { type: "string", description: "End date in YYYY-MM-DD format if mentioned" },
                      projectManager: { type: "string", description: "Project manager name if mentioned" }
                    }
                  },
                  suggestedPersonnel: {
                    type: "array",
                    description: "Ranked list of personnel suggestions",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Personnel ID from the input data" },
                        matchScore: { type: "number", description: "Match score 0-100" },
                        matchReasons: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "List of reasons why this person is a good match" 
                        }
                      },
                      required: ["id", "matchScore", "matchReasons"]
                    }
                  }
                },
                required: ["suggestedFields", "suggestedPersonnel"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_project_personnel" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        await writeErrorEvent(serviceClient, {
          actor_user_id: userId as string,
          source: 'edge',
          event_type: 'suggest.ai_gateway_error',
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
          event_type: 'suggest.ai_gateway_error',
          severity: 'error',
          message: 'AI gateway credits exhausted (402)',
          metadata: { status: 402 },
        });
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      await writeErrorEvent(serviceClient, {
        actor_user_id: userId as string,
        source: 'edge',
        event_type: 'suggest.ai_gateway_error',
        severity: 'error',
        message: `AI gateway error (${response.status})`,
        metadata: { status: response.status },
      });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "suggest_project_personnel") {
      throw new Error("Unexpected AI response format");
    }

    const result: SuggestionResponse = JSON.parse(toolCall.function.arguments);
    
    // Validate and filter personnel IDs to only include valid ones
    const validPersonnelIds = new Set(filteredPersonnel.map((p: PersonnelData) => p.id));
    result.suggestedPersonnel = result.suggestedPersonnel
      .filter(sp => validPersonnelIds.has(sp.id))
      .sort((a, b) => b.matchScore - a.matchScore);

    if (businessId) {
      void logUsage({
        serviceClient, businessId,
        eventType: "personnel_match",
        model: "google/gemini-2.5-flash",
      });
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in suggest-project-personnel:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
