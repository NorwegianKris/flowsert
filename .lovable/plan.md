

## Plan: Notification Email Fix + Previous Projects Tab + AI Search Dedup Verification

### Prompt 9 — Manual Notification System

**Root cause:** The `send-notification-email` edge function is missing from `supabase/config.toml`. Without `verify_jwt = false`, the gateway rejects the request before it reaches the function code. Additionally, the function uses the unreliable `getClaims` method (same issue fixed in Prompts 6 and 7).

The client-side code in `SendNotificationDialog.tsx` is already correctly implemented — it creates the in-platform notification first, then attempts email sending separately, and handles email failures gracefully without blocking the notification.

**Changes:**

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `[functions.send-notification-email]` with `verify_jwt = false` |
| `supabase/functions/send-notification-email/index.ts` | Replace `getClaims` with `getUser` for stable auth |

After code changes, redeploy the edge function.

### Prompt 10 — Previous Projects Tab

**Analysis:** The filtering logic in `PersonnelProjectsTabs.tsx` (line 27-28) is:
- Active tab: `status === 'active' || status === 'pending'`
- Previous tab: `status === 'completed'`

The same logic exists in `AssignedProjects.tsx` (lines 87-88). This is correct — projects with status `'completed'` go to Previous.

The `useProjects.ts` hook maps `p.status` directly from the database. The project status values in the DB are `'active'`, `'completed'`, and `'pending'`. The `auto-close-projects` edge function transitions projects to `'completed'` status when closing them.

**Conclusion:** The Previous Projects tab filtering logic is correct. No code changes needed. If a project isn't appearing in the Previous tab, it's because its status hasn't been changed to `'completed'` in the database.

### Prompt 10 — AI Personnel Search Dedup

**Analysis:** The client-side dedup in `useSuggestPersonnel.ts` (lines 127-133) correctly deduplicates by personnel ID, keeping the highest matchScore. The server-side edge function (`suggest-project-personnel`) validates against `validPersonnelIds` and sorts by score, but doesn't dedup (it relies on the AI not returning duplicates, plus the client-side dedup).

The client-side dedup logic is sound. The only potential issue is if the AI returns the same person ID multiple times in its tool call response — but the client-side `Map`-based dedup handles that correctly.

**Conclusion:** No code changes needed for dedup. The existing client-side dedup in `useSuggestPersonnel.ts` correctly handles duplicate entries.

### Summary

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `send-notification-email` entry with `verify_jwt = false` |
| `supabase/functions/send-notification-email/index.ts` | Replace `getClaims` → `getUser` for stable auth |

Prompts 10 (Previous Projects + AI Dedup) require no code changes — both features are correctly implemented.

