import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  isJobSeeker: boolean;
  activated: boolean;
  certificates: { name: string; expiryDate: string | null }[];
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, personnel, includeJobSeekers } = await req.json();

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

    // Filter personnel based on job seeker toggle
    const filteredPersonnel: PersonnelData[] = (personnel || []).filter((p: PersonnelData) => {
      if (p.isJobSeeker) {
        return includeJobSeekers && p.activated;
      }
      return true;
    });

    // Prepare personnel summary for AI
    const personnelSummary = filteredPersonnel.map((p: PersonnelData) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      location: p.location,
      category: p.category || "unknown",
      isJobSeeker: p.isJobSeeker,
      certificates: p.certificates.map(c => ({
        name: c.name,
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
- When a region, country, or continent is mentioned (e.g., "Europe", "Scandinavia", "Norway"), include ALL personnel from locations within that region
- Norwegian cities (Haugesund, Husøy, Stavanger, Bergen, Oslo, Trondheim, etc.) are in Norway, which is in Scandinavia, which is in Europe
- Swedish cities (Överlida, Stockholm, Gothenburg, Malmö, Uppsala, etc.) are in Sweden, which is in Scandinavia, which is in Europe
- Danish, Finnish cities are also in Scandinavia/Europe
- UK cities (Liverpool, London, Manchester, Birmingham, Edinburgh, Glasgow, etc.) are in the United Kingdom, which is in Europe
- German, French, Spanish, Italian, Polish, Dutch, Belgian, Austrian, Swiss, Portuguese, Greek, Irish cities are all in Europe
- Be inclusive with geographic matching - if someone asks for "Europe", include ALL European locations including UK, Scandinavia, and all EU/non-EU European countries

For each suggested personnel, provide:
- A match score (0-100) based on how well they fit
- Clear reasons explaining why they're a good match

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
        model: "google/gemini-3-flash-preview",
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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
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
