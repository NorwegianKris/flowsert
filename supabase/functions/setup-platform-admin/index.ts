import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req, { allowMethods: "POST, OPTIONS" });
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ error: "This endpoint has been permanently disabled" }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
