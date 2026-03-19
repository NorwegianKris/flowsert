const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ error: "This endpoint has been permanently disabled" }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
