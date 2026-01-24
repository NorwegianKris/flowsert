import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractionRequest {
  imageBase64: string;
  mimeType: string;
  existingCategories: string[];
}

interface ExtractedData {
  certificateName: string | null;
  dateOfIssue: string | null;
  expiryDate: string | null;
  placeOfIssue: string | null;
  issuingAuthority: string | null;
  matchedCategory: string | null;
}

interface ExtractionResponse {
  status: "green" | "amber" | "red";
  confidence: number;
  extractedData: ExtractedData;
  fieldsExtracted: number;
  issues: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, mimeType, existingCategories }: ExtractionRequest = await req.json();

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

${existingCategories.length > 0 ? `
Known certificate categories in this system: ${existingCategories.join(", ")}
If the certificate matches one of these categories exactly or closely, include that category name in matchedCategory.
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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    // Parse the tool call response
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_certificate_data") {
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

    return new Response(
      JSON.stringify(result),
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
        },
        fieldsExtracted: 0,
        issues: ["An error occurred during extraction"],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
