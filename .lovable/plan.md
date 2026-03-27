

## Plan: Create shared CORS utility with proper unknown-origin blocking

### Problem
1. The shared `_shared/cors.ts` utility from the previous plan was never created — all 22 edge functions still use `Access-Control-Allow-Origin: *`
2. The user correctly identifies that falling back to `ALLOWED_ORIGINS[0]` for unrecognised origins defeats the purpose

### Approach
Create the shared utility with the correct behavior: if the request `Origin` is not in the whitelist, return an empty string for `Access-Control-Allow-Origin`, causing browsers to block the response. Then update all 22 edge functions to use it.

### Changes

**1. Create `supabase/functions/_shared/cors.ts`**
```typescript
// Allowed origins for CORS. Requests from other origins will be blocked by browsers.
const ALLOWED_ORIGINS = [
  "https://flowsert.com",
  "https://flowsert.lovable.app",
];

export function getCorsHeaders(
  req: Request,
  options?: {
    extraAllowHeaders?: string;
    allowMethods?: string;
  }
): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  // If the origin is not recognised, set an empty value so browsers reject the response.
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": [
      "authorization, x-client-info, apikey, content-type",
      "x-supabase-client-platform, x-supabase-client-platform-version",
      "x-supabase-client-runtime, x-supabase-client-runtime-version",
      options?.extraAllowHeaders,
    ].filter(Boolean).join(", "),
  };

  if (options?.allowMethods) {
    headers["Access-Control-Allow-Methods"] = options.allowMethods;
  }

  return headers;
}
```

**2. Update all 22 edge functions**

Each function will:
- Import `getCorsHeaders` from `../_shared/cors.ts`
- Replace the static `const corsHeaders = { ... }` with a dynamic call inside the handler
- Move `const corsHeaders = getCorsHeaders(req, ...)` to the first line inside `Deno.serve`

Special cases:
- **auth-email-hook**: Both `corsHeaders` and `previewCorsHeaders` use `getCorsHeaders(req, ...)` with `x-lovable-signature, x-lovable-timestamp` as extra headers for the main one
- **auto-close-projects**: Extra header `x-internal-secret`
- **setup-platform-admin**, **create-portal-session**, **create-checkout-session**: Pass `allowMethods: "POST, OPTIONS"`
- **stripe-webhook**: Server-to-server (no browser CORS needed) — update anyway for consistency since it still has the `*` header
- **process-email-queue**: Background job — same treatment

### Risk
Edge functions + access control changes → **Anchor required** before publish (Q2 + Q3).

