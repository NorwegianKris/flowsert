// Allowed origins for CORS. Requests from other origins will be blocked by browsers.
const ALLOWED_ORIGINS = [
  "https://flowsert.com",
  "https://flowsert.lovable.app",
];

/**
 * Build CORS headers dynamically based on the request Origin.
 * If the origin is not in ALLOWED_ORIGINS the Access-Control-Allow-Origin value
 * is set to an empty string so the browser rejects the response.
 */
export function getCorsHeaders(
  req: Request,
  options?: {
    extraAllowHeaders?: string;
    allowMethods?: string;
  }
): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  // Unknown origins get an empty value — browsers will block the response.
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": [
      "authorization, x-client-info, apikey, content-type",
      "x-supabase-client-platform, x-supabase-client-platform-version",
      "x-supabase-client-runtime, x-supabase-client-runtime-version",
      options?.extraAllowHeaders,
    ]
      .filter(Boolean)
      .join(", "),
  };

  if (options?.allowMethods) {
    headers["Access-Control-Allow-Methods"] = options.allowMethods;
  }

  return headers;
}
