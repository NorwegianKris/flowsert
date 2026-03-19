

## Plan: Disable setup-platform-admin endpoint and remove frontend route

Since the platform admin account already exists, the safest approach is to fully disable this function and remove all frontend access.

### Changes

**1. Neutralize the edge function (`supabase/functions/setup-platform-admin/index.ts`)**
- Replace the entire function body with a simple handler that returns `410 Gone` for all requests (POST returns `{"error":"This endpoint has been permanently disabled"}`, OPTIONS still returns 204 for CORS).
- This is safer than deleting the file, which could cause deployment issues if references exist.

**2. Remove the frontend route and page**
- `src/App.tsx`: Delete the `SetupPlatformAdmin` import (line 30) and the `/setup-platform-admin` route (line 44).
- `src/pages/SetupPlatformAdmin.tsx`: Delete the file entirely.

**3. Remove from config.toml (`supabase/config.toml`)**
- Delete the `[functions.setup-platform-admin]` block (lines ~26-27) so the function is no longer registered.

### Summary
Three files modified, one file deleted. The endpoint becomes permanently disabled, the frontend route is removed, and no new attack surface remains.

