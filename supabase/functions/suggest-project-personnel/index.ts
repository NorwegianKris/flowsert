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
  skills: string[];
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

function extractConstraints(prompt: string): { 
  country: string | null; 
  roles: string[] | null;
} {
  const lower = prompt.toLowerCase();
  // Country extraction
  const countryMap: Record<string, string> = {
    'norway': 'norway', 'norge': 'norway',
    'united kingdom': 'united kingdom', 'uk': 'united kingdom',
    'england': 'united kingdom', 'scotland': 'united kingdom', 'wales': 'united kingdom',
    'spain': 'spain', 'españa': 'spain',
    'germany': 'germany', 'deutschland': 'germany',
    'france': 'france', 'italy': 'italy', 'italia': 'italy',
    'sweden': 'sweden', 'sverige': 'sweden',
    'denmark': 'denmark', 'danmark': 'denmark',
    'netherlands': 'netherlands', 'holland': 'netherlands',
    'portugal': 'portugal', 'ireland': 'ireland',
    'croatia': 'croatia', 'poland': 'poland',
    'belgium': 'belgium', 'switzerland': 'switzerland',
    'bulgaria': 'bulgaria', 'latvia': 'latvia',
    'lithuania': 'lithuania', 'south africa': 'south africa',
    'cyprus': 'cyprus',
  };
  let country: string | null = null;
  for (const [keyword, normalized] of Object.entries(countryMap)) {
    if (lower.includes(keyword)) {
      country = normalized;
      break;
    }
  }
  // Role extraction
  const roleKeywords: Record<string, string[]> = {
    'diver': ['Diver'],
    'dive supervisor': ['Dive Supervisor'],
    'supervisor': ['Dive Supervisor'],
    'rigger': ['Rigger'],
    'mechanic': ['Mechanic'],
    'project manager': ['Project Manager'],
    'project coordinator': ['Project Coordinator'],
    'coordinator': ['Project Coordinator'],
    'manager': ['Project Manager'],
  };
  let roles: string[] | null = null;
  // Sort by descending key length so "dive supervisor" is checked before "diver"
  const sortedRoleEntries = Object.entries(roleKeywords).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, matchRoles] of sortedRoleEntries) {
    if (lower.includes(keyword)) {
      roles = matchRoles;
      break;
    }
  }
  return { country, roles };
}

async function extractConstraintsWithAIFallback(
  prompt: string,
  apiKey: string
): Promise<{ country: string | null; roles: string[] | null; usedAI: boolean }> {
  const keywordResult = extractConstraints(prompt);
  if (keywordResult.roles && keywordResult.roles.length > 0) {
    return { ...keywordResult, usedAI: false };
  }

  // AI fallback — lightweight extraction call
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Extract structured search constraints from the user's personnel search query. Return ONLY valid JSON with these fields: role (string or null — the job title/role being searched for), location (string or null — country, city, or region), certificates (string[] or null — specific certifications mentioned). Be precise about role — 'run dive ops' means 'Dive Supervisor', 'NDT guy' means 'NDT Inspector', 'someone who can weld' means 'Welder'. Return null for fields not mentioned.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.warn(`[AI constraint extraction] gateway ${response.status}, falling back`);
      return { ...keywordResult, usedAI: false };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);

    const aiRoles = parsed.role ? [parsed.role] : null;
    const aiCountry = parsed.location || keywordResult.country;

    // Log the keyword miss for future keyword map expansion
    if (aiRoles) {
      console.log(`[keyword-miss] query="${prompt}" ai_role="${parsed.role}"`);
    }

    return {
      country: aiCountry,
      roles: aiRoles || keywordResult.roles,
      usedAI: true,
    };
  } catch (err) {
    console.warn("[AI constraint extraction] failed, using keyword result:", err);
    return { ...keywordResult, usedAI: false };
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

    // Monthly AI allowance check (fail-open)
    let usageUsed = 0;
    let usageCap = 0;
    if (businessId) {
      try {
        const { data: allowance } = await serviceClient.rpc('check_ai_allowance', {
          p_business_id: businessId,
          p_event_type: 'search'
        });
        if (allowance && !allowance.allowed) {
          await writeErrorEvent(serviceClient, {
            actor_user_id: userId as string,
            source: 'edge',
            event_type: 'suggest.monthly_cap',
            severity: 'warn',
            message: 'Monthly Search cap reached',
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

    // ── Location intent parser ─────────────────────────────────────────────────
    // Parses free-text query for explicit location mentions.
    // Returns null if no location intent detected — meaning no location filter applied.
    const parseLocationIntent = (query: string): { type: 'city' | 'country' | 'region'; value: string } | null => {
      const q = query.toLowerCase();

      const cities: Record<string, string> = {
        'bergen': 'Bergen', 'oslo': 'Oslo', 'stavanger': 'Stavanger',
        'haugesund': 'Haugesund', 'trondheim': 'Trondheim', 'kristiansand': 'Kristiansand',
        'tromsø': 'Tromsø', 'bodø': 'Bodø', 'kopervik': 'Kopervik',
        'aberdeen': 'Aberdeen', 'london': 'London', 'liverpool': 'Liverpool',
        'glasgow': 'Glasgow', 'edinburgh': 'Edinburgh', 'manchester': 'Manchester',
        'amsterdam': 'Amsterdam', 'rotterdam': 'Rotterdam',
        'barcelona': 'Barcelona', 'madrid': 'Madrid',
        'stockholm': 'Stockholm', 'gothenburg': 'Gothenburg',
        'zagreb': 'Zagreb', 'split': 'Split',
        'warsaw': 'Warsaw', 'gdansk': 'Gdansk',
        'copenhagen': 'Copenhagen', 'esbjerg': 'Esbjerg',
      };

      const countries: Record<string, string> = {
        'norway': 'Norway', 'norge': 'Norway',
        'united kingdom': 'United Kingdom', 'uk': 'United Kingdom', 'england': 'United Kingdom', 'scotland': 'United Kingdom',
        'netherlands': 'Netherlands', 'holland': 'Netherlands',
        'spain': 'Spain', 'españa': 'Spain',
        'sweden': 'Sweden', 'sverige': 'Sweden',
        'poland': 'Poland', 'polska': 'Poland',
        'italy': 'Italy', 'italia': 'Italy',
        'croatia': 'Croatia', 'hrvatska': 'Croatia',
        'germany': 'Germany', 'deutschland': 'Germany',
        'denmark': 'Denmark', 'danmark': 'Denmark',
        'france': 'France', 'portugal': 'Portugal',
        'greece': 'Greece', 'thailand': 'Thailand',
        'philippines': 'Philippines', 'australia': 'Australia',
        'south africa': 'South Africa',
      };

      const regions: Record<string, string[]> = {
        'scandinavia': ['Norway', 'Sweden', 'Denmark', 'Finland'],
        'nordic': ['Norway', 'Sweden', 'Denmark', 'Finland', 'Iceland'],
        'europe': ['Norway', 'United Kingdom', 'Netherlands', 'Spain', 'Sweden', 'Poland',
                   'Italy', 'Croatia', 'Germany', 'Denmark', 'France', 'Portugal', 'Greece',
                   'Belgium', 'Austria', 'Switzerland'],
        'north sea': ['Norway', 'United Kingdom', 'Netherlands', 'Denmark'],
      };

      // Check cities first (most specific)
      for (const [key, canonical] of Object.entries(cities)) {
        if (q.includes(key)) return { type: 'city', value: canonical };
      }

      // Check countries
      for (const [key, canonical] of Object.entries(countries)) {
        if (q.includes(key)) return { type: 'country', value: canonical };
      }

      // Check regions
      for (const [key, canonical] of Object.entries(regions)) {
        if (q.includes(key)) return { type: 'region', value: canonical as unknown as string };
      }

      return null;
    };

    // ── Location match checker ─────────────────────────────────────────────────
    const locationMatches = (personLocation: string, intent: { type: string; value: string | string[] } | null): boolean => {
      if (!intent) return true; // No location filter — include everyone
      const loc = personLocation.toLowerCase();

      if (intent.type === 'city') {
        return loc.includes((intent.value as string).toLowerCase());
      }

      if (intent.type === 'country') {
        const country = (intent.value as string).toLowerCase();
        const countryAliases: Record<string, string[]> = {
          'norway': ['norway', 'norge', 'haugesund', 'bergen', 'oslo', 'stavanger', 'kopervik', 'avaldsnes', 'kristiansand', 'trondheim', 'tromsø', 'bodø', 'husøy', 'leirvik', 'stord'],
          'united kingdom': ['united kingdom', 'uk', 'england', 'scotland', 'wales', 'london', 'aberdeen', 'manchester', 'liverpool', 'glasgow', 'edinburgh', 'newcastle', 'bristol'],
          'netherlands': ['netherlands', 'holland', 'amsterdam', 'rotterdam', 'the hague', 'utrecht'],
          'spain': ['spain', 'españa', 'barcelona', 'madrid', 'valencia', 'seville', 'bilbao'],
          'sweden': ['sweden', 'sverige', 'stockholm', 'gothenburg', 'malmö', 'överlida', 'uppsala'],
          'poland': ['poland', 'polska', 'warsaw', 'krakow', 'gdansk', 'wroclaw'],
          'italy': ['italy', 'italia', 'rome', 'milan', 'naples', 'turin'],
          'croatia': ['croatia', 'hrvatska', 'zagreb', 'split', 'rijeka', 'dubrovnik'],
          'germany': ['germany', 'deutschland', 'berlin', 'hamburg', 'munich', 'frankfurt'],
          'denmark': ['denmark', 'danmark', 'copenhagen', 'aarhus', 'odense', 'esbjerg'],
          'france': ['france', 'paris', 'marseille', 'lyon'],
          'south africa': ['south africa', 'cape town', 'johannesburg', 'durban'],
        };
        const aliases = countryAliases[country] || [country];
        return aliases.some(alias => loc.includes(alias));
      }

      if (intent.type === 'region') {
        const regionCountries = intent.value as unknown as string[];
        const allAliases = regionCountries.flatMap(c => {
          const countryAliases: Record<string, string[]> = {
            'Norway': ['norway', 'norge', 'haugesund', 'bergen', 'oslo', 'stavanger', 'trondheim'],
            'United Kingdom': ['united kingdom', 'uk', 'england', 'scotland', 'london', 'aberdeen'],
            'Sweden': ['sweden', 'sverige', 'stockholm', 'gothenburg'],
            'Denmark': ['denmark', 'danmark', 'copenhagen'],
            'Netherlands': ['netherlands', 'holland', 'amsterdam', 'rotterdam'],
          };
          return countryAliases[c] || [c.toLowerCase()];
        });
        return allAliases.some(alias => loc.includes(alias));
      }

      return true;
    };

    // ── Pre-filter: freelancer toggle + location ───────────────────────────────
    const locationIntent = parseLocationIntent(prompt);

    const filteredPersonnel: PersonnelData[] = (personnel || []).filter((p: PersonnelData) => {
      // Freelancer toggle
      if (p.category === 'freelancer') {
        if (!includeFreelancers || !p.activated) return false;
      }
      if (p.category !== 'freelancer' && !includeEmployees) return false;
      // Location hard filter — only applied when query contains explicit location
      if (locationIntent && !locationMatches(p.location, locationIntent)) return false;
      return true;
    });

    // Extract role/location constraints from the query (keyword-first, AI fallback)
    const constraints = await extractConstraintsWithAIFallback(prompt, LOVABLE_API_KEY);

    const MAX_CANDIDATES = 50;
    let cappedPersonnel: PersonnelData[];

    if (filteredPersonnel.length <= MAX_CANDIDATES) {
      cappedPersonnel = filteredPersonnel;
    } else if (constraints.roles && constraints.roles.length > 0) {
      // Split into role-matched (Group A) and others (Group B)
      const extractedRoles = constraints.roles.map((r: string) => r.toLowerCase());
      const groupA = filteredPersonnel.filter((p: PersonnelData) => {
        const title = (p.role || '').toLowerCase();
        return extractedRoles.some((r: string) => title.includes(r));
      });
      const groupB = filteredPersonnel.filter((p: PersonnelData) => {
        const title = (p.role || '').toLowerCase();
        return !extractedRoles.some((r: string) => title.includes(r));
      });

      if (groupA.length >= MAX_CANDIDATES) {
        cappedPersonnel = groupA
          .sort((a: PersonnelData, b: PersonnelData) => (b.profileCompletionPercentage ?? 0) - (a.profileCompletionPercentage ?? 0))
          .slice(0, MAX_CANDIDATES);
      } else {
        const remaining = MAX_CANDIDATES - groupA.length;
        const fillerB = groupB
          .sort((a: PersonnelData, b: PersonnelData) => (b.profileCompletionPercentage ?? 0) - (a.profileCompletionPercentage ?? 0))
          .slice(0, remaining);
        cappedPersonnel = [...groupA, ...fillerB];
      }
    } else {
      cappedPersonnel = [...filteredPersonnel]
        .sort((a: PersonnelData, b: PersonnelData) => (b.profileCompletionPercentage ?? 0) - (a.profileCompletionPercentage ?? 0))
        .slice(0, MAX_CANDIDATES);
    }

    // Prepare personnel summary for AI
    const extractCountry = (location: string): string => {
      const loc = location.toLowerCase();
      if (loc.includes('norway') || loc.includes('norge') ||
          ['haugesund','bergen','oslo','stavanger','kopervik','avaldsnes','kristiansand','trondheim','tromsø','bodø','husøy','leirvik','stord'].some(c => loc.includes(c))) return 'Norway';
      if (loc.includes('united kingdom') || loc.includes('uk') || loc.includes('england') || loc.includes('scotland') || loc.includes('wales') ||
          ['london','aberdeen','manchester','liverpool','glasgow','edinburgh','newcastle','bristol','leeds'].some(c => loc.includes(c))) return 'United Kingdom';
      if (loc.includes('spain') || loc.includes('españa') ||
          ['barcelona','madrid','valencia','seville','bilbao'].some(c => loc.includes(c))) return 'Spain';
      if (loc.includes('poland') || loc.includes('polska') ||
          ['warsaw','krakow','gdansk','wroclaw','poznan'].some(c => loc.includes(c))) return 'Poland';
      if (loc.includes('italy') || loc.includes('italia') ||
          ['rome','milan','naples','turin','genoa'].some(c => loc.includes(c))) return 'Italy';
      if (loc.includes('croatia') || loc.includes('hrvatska') ||
          ['zagreb','split','rijeka','dubrovnik'].some(c => loc.includes(c))) return 'Croatia';
      if (loc.includes('sweden') || loc.includes('sverige') ||
          ['stockholm','gothenburg','malmö','överlida','uppsala','linköping'].some(c => loc.includes(c))) return 'Sweden';
      if (loc.includes('germany') || loc.includes('deutschland') ||
          ['berlin','hamburg','munich','frankfurt','cologne'].some(c => loc.includes(c))) return 'Germany';
      if (loc.includes('netherlands') || loc.includes('holland') ||
          ['amsterdam','rotterdam','the hague','utrecht'].some(c => loc.includes(c))) return 'Netherlands';
      if (loc.includes('denmark') || loc.includes('danmark') ||
          ['copenhagen','aarhus','odense','esbjerg'].some(c => loc.includes(c))) return 'Denmark';
      if (loc.includes('france') || ['paris','marseille','lyon','toulouse'].some(c => loc.includes(c))) return 'France';
      if (loc.includes('greece') || loc.includes('hellas') ||
          ['athens','thessaloniki','piraeus'].some(c => loc.includes(c))) return 'Greece';
      if (loc.includes('portugal') || ['lisbon','porto'].some(c => loc.includes(c))) return 'Portugal';
      if (loc.includes('thailand') || ['bangkok','phuket','pattaya'].some(c => loc.includes(c))) return 'Thailand';
      if (loc.includes('philippines') || ['manila','cebu'].some(c => loc.includes(c))) return 'Philippines';
      if (loc.includes('not specified') || loc === '') return 'Unknown';
      return location;
    };

    const personnelSummary = cappedPersonnel.map((p: PersonnelData) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      location: p.location,
      confirmedCountry: extractCountry(p.location),
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
    }));

    const systemPrompt = `You are an expert personnel matching assistant for offshore and subsea project staffing. Your task is to analyse search queries and rank the best matching personnel from the available pool.

Each person in the data has a "confirmedCountry" field — this is the authoritative resolved country. Use it directly. Do not re-interpret the raw location string for country matching.

GEOGRAPHIC MATCHING:
- "Scandinavia" includes Norway, Sweden, Denmark, Finland
- "Europe" includes all European countries including UK, Norway, and all EU countries
- "Nordic" includes Norway, Sweden, Denmark, Finland, Iceland
- Nationality and location are different fields. "Norwegian diver" could mean nationality=Norwegian OR location=Norway — match both unless the query makes it explicit which is meant

CERTIFICATE MATCHING:
- Use fuzzy matching. "G4" matches "G4 Certificate", "Class G4 Diver", "G4 Commercial Diver Certificate"
- "BOSIET" matches "BOSIET Certificate", "Basic Offshore Safety Induction and Emergency Training"
- "HUET" matches "Helicopter Underwater Escape Training" and variants
- "First Aid" matches "First Aid Certificate", "Advanced First Aid", "Offshore First Aid"
- Valid means not expired. If a certificate has no expiry date, treat it as valid
- If a certificate is expired, include the person but flag it clearly in match reasons

EMPLOYMENT TYPE:
- "freelancer", "contractor", "consultant", "external" → employmentType = freelancer
- "employee", "staff", "permanent", "internal" → employmentType = employee

STRICT vs FLEXIBLE:
- "must have", "required", "only", "mandatory" → hard filter, exclude non-matches
- "preferably", "ideally", "nice to have" → preference, rank higher but include all
- Default to flexible unless strict language is used

PROFILE COMPLETION FILTERING:
- If user asks for "complete profiles" or "fully complete" → only include people with 3 or more valid certificates AND a non-empty bio
- If user asks for "mostly complete" or "high completion" → only include people with at least 1 valid certificate OR a non-empty bio

SCORING SYSTEM:

Step 1 — Identify every dimension the query mentions:
  LOCATION — country, city, or region mentioned
  ROLE — job title or function mentioned
  CERTIFICATES — specific qualifications mentioned
  EXPERIENCE/SKILLS — specific skills, specialisations, or years of experience mentioned
  AVAILABILITY — dates or timing mentioned
  EMPLOYMENT TYPE — freelancer or employee mentioned

Step 2 — Allocate points only to dimensions present in the query. Unmentioned dimensions get 0 weight.
  Two dimensions (e.g. role + location): 50 points each
  Three dimensions (e.g. role + location + certificate): ~33 points each
  One dimension (e.g. location only): 100 points to that dimension
  Adjust weights based on query emphasis — if certificates are the focus, weight them higher

Step 3 — Score each person per active dimension:

  LOCATION:
    confirmedCountry exact match → 100% of location points
    City confirmed within correct country → 100% of location points
    Ambiguous → 60% of location points

  ROLE:
    Exact title match → 100% of role points
    Same role family, different seniority (e.g. "Junior Diver" for "Diver") → 60% of role points
    Different role in same domain (e.g. "Diver" for "Dive Supervisor" query) → 20% of role points
    Unrelated role → 0

    CRITICAL: A Diver and a Dive Supervisor are DIFFERENT roles — one works underwater, the other manages dive operations. Scoring a Diver against a Dive Supervisor query should be 20% at most. Similarly, an Electrician and an Electrical Supervisor are different roles. Do not give high scores for partial word overlap — score based on whether the person can actually perform the queried role.

  CERTIFICATES:
    Valid cert present → 100% of cert points
    Expired cert present → 40% of cert points
    Cert absent → 0

  EXPERIENCE/SKILLS:
    Explicitly in bio or role title → 100% of skill points
    Implied by certificates or category → 60% of skill points
    No evidence → 0

  AVAILABILITY:
    Profile shows available in requested period → 100%
    No availability data → 50% (neutral, not penalised)

  EMPLOYMENT TYPE:
    Exact match → 100%
    No match → 0

Step 4 — Add credential depth bonus (always applied, regardless of query):
  This reflects the real-world reality that a more credentialled candidate is a safer staffing choice even when credentials were not the search focus.
  3+ valid certificates: +5 points (capped at 100 total)
  Non-empty bio: +3 points (capped at 100 total)
  These bonuses are small — they differentiate equal-scoring candidates, they do not override query dimension scores

Step 5 — Sum all dimension scores plus credential bonus for the final score.

SCORE INTERPRETATION:
  90-100: Excellent match — satisfies all queried dimensions with strong credentials
  75-89: Good match — satisfies most queried dimensions
  50-74: Partial match — satisfies some but not all queried dimensions
  Below 50: Weak match — significant gaps against queried dimensions

CRITICAL:
- profileCompletionPercentage has been excluded from the data. Do not reference it or invent a proxy for it.
- The credential depth bonus (+5 for certs, +3 for bio) is the only way profile richness affects the score, and only by a small margin.
- Never penalise a candidate for missing data on dimensions the query did not ask about.
- confirmedCountry is authoritative — if it says Norway, the person is in Norway, full stop.
- Never return a person with a matchScore of 0. If a person does not meet enough of the queried criteria to score above 0, exclude them from the response entirely. A returned result implies a meaningful match.

For each person, return:
- matchScore (0-100) calculated using the system above
- matchReasons: 2-4 specific reasons referencing actual data from their profile explaining the score. Be specific — name the certificate, the location, the bio keyword that drove the score.

Be practical. If a query is ambiguous, make a reasonable assumption and apply it consistently to all candidates.`;

    const userPrompt = `Project Requirements:
"${prompt}"

Available Personnel (${personnelSummary.length} shown, ${filteredPersonnel.length} total matched):
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
    const validPersonnelIds = new Set(cappedPersonnel.map((p: PersonnelData) => p.id));
    result.suggestedPersonnel = result.suggestedPersonnel
      .filter(sp => validPersonnelIds.has(sp.id))
      .map(sp => ({ ...sp, matchScore: Math.min(sp.matchScore, 100) }))
      .sort((a, b) => b.matchScore - a.matchScore);

    if (businessId) {
      void logUsage({
        serviceClient, businessId,
        eventType: "personnel_match",
        model: "google/gemini-2.5-flash",
      });
    }

    return new Response(
      JSON.stringify({ ...result, usage_remaining: { used: usageUsed + 1, cap: usageCap } }),
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
