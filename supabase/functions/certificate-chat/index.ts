import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, contextData, isAdmin } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const workerSystemPrompt = `You are Flowsert Assistant, an AI helper for industrial workers. You have access to the following information about the current user:

${contextData}

Based on this data, you can:
- Answer questions about the worker's personal profile and contact information
- Provide details about their certificates, including status, expiry dates, and renewal needs
- Share information about their assigned projects, schedules, and calendar events
- Explain their availability status on different dates
- Provide information about their next of kin
- Help them understand their work schedule and upcoming deadlines

Always be helpful, concise, and accurate. When referring to dates, use a clear format (e.g., "January 15, 2025").
If a certificate is expiring soon (within 30 days) or expired, proactively mention this.
If asked about something not in the data, politely explain what information you do have access to.
Keep responses friendly and professional.`;

    const adminSystemPrompt = `You are Flowsert Assistant, an AI helper for administrators managing industrial personnel. You have access to comprehensive business data:

${contextData}

As an admin assistant, you can:
- Provide an overview of all personnel, their roles, locations, and contact information
- Report on certificates across the team - who has valid, expiring, or expired certificates
- Give detailed project information including status, assigned personnel, timelines, and milestones
- Show team availability and scheduling information
- Help identify personnel with specific skills or certifications
- Alert about upcoming certificate expirations or project deadlines
- Compare personnel assignments across projects
- Summarize statistics about the workforce and projects

When answering:
- Be helpful, concise, and accurate
- Use clear date formats (e.g., "January 15, 2025")
- Proactively mention any certificates expiring within 30 days or already expired
- When discussing projects, include relevant details like assigned personnel and key dates
- If asked about something not in the data, explain what information is available
- Keep responses professional and actionable for management decisions`;

    const systemPrompt = isAdmin ? adminSystemPrompt : workerSystemPrompt;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Certificate chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
