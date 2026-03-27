

## Plan: Add client-side pre-filtering to personnel search payload

### Problem
The full personnel list (all fields) is sent to the edge function with every AI search request. This won't scale beyond a few hundred profiles due to payload size and unnecessary data transfer.

### Changes

**1. `src/hooks/useSuggestPersonnel.ts` — Pre-filter and slim the payload before sending**

- Filter to only `activated` personnel before building the payload
- Compute a profile completion percentage for sorting (based on fields filled + certificate count)
- Sort by completion percentage descending, cap at 200
- Strip fields not needed for matching: remove `created_at`, `updated_at`, and all internal IDs except `personnel.id`
- Add a comment explaining the 200-profile payload limit

The `PersonnelForAI` interface and mapping logic (lines ~42-90) will be updated:
- Remove any timestamp or internal ID fields from the interface
- Add the `profileCompletionPercentage` field
- Filter `personnel` to only `p.activated === true` before mapping
- Sort mapped array by completion % descending
- Slice to 200 max
- Add explanatory comment

**2. `supabase/functions/suggest-project-personnel/index.ts` — Add server-side safety guard**

- At line ~436 (the `filteredPersonnel` filter), add an additional check to reject non-activated personnel as a defence-in-depth measure
- Add a comment noting the 200-profile client-side cap and the 50-profile AI cap

### Profile completion calculation (client-side)
```text
Fields checked: name, role, location, email, bio, nationality, department, country, city, skills.length > 0
Certificates: hasAnyCerts
Score = (filled fields / total fields) * 100
```

### Risk
Green — no schema changes. Pure client-side + edge function logic. No RLS or auth impact.

