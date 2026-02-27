

## Plan: Improve personnel search scoring in suggest-project-personnel

Single file: `supabase/functions/suggest-project-personnel/index.ts`

### Change 1 — Add `extractCountry` helper + update `personnelSummary` (lines 256-277)

- Insert `extractCountry` function immediately before the `personnelSummary` map (before line 257)
- Add `confirmedCountry: extractCountry(p.location)` after the `location` field in the map
- Remove `profileCompletionPercentage` and `profileCompletionStatus` from the map (lines 275-276)

### Change 2 — `temperature: 0` already present (line 364)

This was added in a previous edit. No change needed.

### Change 3 — Replace scoring instructions in system prompt (lines 288-346)

Remove the "Profile Completion Filtering" section (lines 288-300) and the final scoring paragraph (lines 342-346). Replace with the new geographic location matching instructions and the full multi-dimensional scoring system as specified.

### Risk
- 🔴 Edge function logic + prompt change → anchor required per checklist Q2

