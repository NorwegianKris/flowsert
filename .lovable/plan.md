

## Plan: Update Deno standard library imports to v0.224.0

### Problem
12 edge functions use outdated `deno.land/std` versions (6 on `@0.168.0`, 6 on `@0.190.0`). All should use the stable `@0.224.0`.

### Change
Single-line replacement on line 1 of each file — update the `serve` import URL.

**Files using `@0.168.0` (6 files):**
- `certificate-chat/index.ts`
- `extract-certificate-data/index.ts`
- `send-dm-notification/index.ts`
- `suggest-certificate-types/index.ts`
- `suggest-issuer-types/index.ts`
- `suggest-project-personnel/index.ts`

**Files using `@0.190.0` (6 files):**
- `send-certificate-expiry-notifications/index.ts`
- `send-contact-email/index.ts`
- `send-demo-request/index.ts`
- `send-invitation/index.ts`
- `send-notification-email/index.ts`
- `send-project-invitation/index.ts`

Each file: replace line 1 import from old version to:
```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
```

No other changes. The `serve` API is stable across these versions.

### Risk
Edge function changes → anchor required (Q2). Low functional risk — `serve` API unchanged between versions.

